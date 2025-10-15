// =====================================================
// PART 1: Stripe Checkout Session API
// File: src/app/api/bookings/create-checkout-session/route.ts
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      assetId,
      assetType,
      startDate,
      endDate,
      guestName,
      guestEmail,
      guestPhone,
      totalAmount,
    } = body

    // Validate required fields
    if (!assetId || !assetType || !startDate || !endDate || !guestName || !guestEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check availability
    const { data: existingBookings } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq(assetType === 'property' ? 'property_id' : 'vehicle_id', assetId)
      .eq('status', 'confirmed')
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)

    if (existingBookings && existingBookings.length > 0) {
      return NextResponse.json(
        { error: 'This asset is not available for the selected dates' },
        { status: 400 }
      )
    }

    // Get or create user
    let userId: string | null = null
    
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', guestEmail)
      .single()

    if (existingUser) {
      userId = existingUser.id
    } else {
      // Create a placeholder user (they can claim account later)
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: guestEmail,
        email_confirm: true,
        user_metadata: {
          full_name: guestName,
          phone: guestPhone,
        },
      })

      if (authError) {
        console.error('Error creating auth user:', authError)
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        )
      }

      userId = authUser.user.id

      // Create user profile
      await supabaseAdmin.from('users').insert({
        id: userId,
        email: guestEmail,
        full_name: guestName,
        phone: guestPhone,
        role: 'customer',
      })
    }

    // Create pending booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: userId,
        [assetType === 'property' ? 'property_id' : 'vehicle_id']: assetId,
        booking_type: assetType,
        start_date: startDate,
        end_date: endDate,
        total_amount: totalAmount,
        status: 'pending',
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Error creating booking:', bookingError)
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      )
    }

    // Get asset details for Stripe description
    let assetName = ''
    if (assetType === 'property') {
      const { data: property } = await supabaseAdmin
        .from('properties')
        .select('title')
        .eq('id', assetId)
        .single()
      assetName = property?.title || 'Property Rental'
    } else {
      const { data: vehicle } = await supabaseAdmin
        .from('vehicles')
        .select('make, model')
        .eq('id', assetId)
        .single()
      assetName = vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle Rental'
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: guestEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: assetName,
              description: `${assetType === 'property' ? 'Property' : 'Vehicle'} rental from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
            },
            unit_amount: Math.round(totalAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: booking.id,
        asset_type: assetType,
        asset_id: assetId,
        user_id: userId,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${assetType}/${assetId}`,
    })

    // Update booking with session ID
    await supabaseAdmin
      .from('bookings')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', booking.id)

    return NextResponse.json({
      checkoutUrl: session.url,
      bookingId: booking.id,
    })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// PART 2: Stripe Webhook Handler
// File: src/app/api/webhooks/stripe/route.ts
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
        break

      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.booking_id
  const userId = session.metadata?.user_id

  if (!bookingId) {
    console.error('No booking_id in session metadata')
    return
  }

  // Update booking status to confirmed
  const { error: bookingError } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId)

  if (bookingError) {
    console.error('Error updating booking:', bookingError)
    throw bookingError
  }

  // Create payment record
  const { error: paymentError } = await supabaseAdmin
    .from('payments')
    .insert({
      booking_id: bookingId,
      user_id: userId,
      amount: (session.amount_total || 0) / 100, // Convert from cents
      currency: session.currency || 'usd',
      status: 'succeeded',
      payment_method: 'card',
      stripe_payment_intent_id: session.payment_intent as string,
    })

  if (paymentError) {
    console.error('Error creating payment record:', paymentError)
    throw paymentError
  }

  // Create notification for managers
  const { data: managers } = await supabaseAdmin
    .from('users')
    .select('id')
    .in('role', ['manager', 'admin'])

  if (managers) {
    const notifications = managers.map((manager) => ({
      user_id: manager.id,
      title: 'New Booking Confirmed',
      message: `A new booking has been confirmed. Booking ID: ${bookingId}`,
      type: 'booking',
      related_id: bookingId,
    }))

    await supabaseAdmin.from('notifications').insert(notifications)
  }

  console.log(`Booking ${bookingId} confirmed successfully`)
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  // Update payment record if needed
  const { error } = await supabaseAdmin
    .from('payments')
    .update({
      status: 'succeeded',
      stripe_charge_id: paymentIntent.latest_charge as string,
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  if (error) {
    console.error('Error updating payment:', error)
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  // Update payment record
  const { error } = await supabaseAdmin
    .from('payments')
    .update({ status: 'failed' })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  if (error) {
    console.error('Error updating payment:', error)
  }
}

// =====================================================
// PART 3: Booking Success Page
// File: src/app/booking-success/page.tsx
// =====================================================

import { supabaseAdmin } from '@/lib/supabase/client'
import { CheckCircle, Calendar, MapPin, Car, Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format } from 'date-fns'

async function getBookingDetails(sessionId: string) {
  // Get booking by session ID
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      properties (title, address, city, state),
      vehicles (make, model),
      payments (amount, receipt_url)
    `)
    .eq('stripe_checkout_session_id', sessionId)
    .single()

  return booking
}

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string }
}) {
  if (!searchParams.session_id) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Invalid booking session</p>
      </div>
    )
  }

  const booking = await getBookingDetails(searchParams.session_id)

  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Booking not found</p>
      </div>
    )
  }

  const asset = booking.booking_type === 'property' 
    ? booking.properties 
    : booking.vehicles

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Booking Confirmed!
        </h1>
        <p className="text-gray-600">
          Your reservation has been successfully confirmed
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Asset Info */}
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              {booking.booking_type === 'property' ? (
                <Building2 className="w-6 h-6 text-blue-600" />
              ) : (
                <Car className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-lg">
                {booking.booking_type === 'property'
                  ? asset.title
                  : `${asset.make} ${asset.model}`}
              </h2>
              {booking.booking_type === 'property' && (
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{asset.address}, {asset.city}, {asset.state}</span>
                </div>
              )}
            </div>
          </div>

          {/* Booking Details */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Booking ID</span>
              <span className="font-mono text-sm">{booking.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Guest Name</span>
              <span className="font-medium">{booking.guest_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Check-in</span>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                <span className="font-medium">
                  {format(new Date(booking.start_date), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Check-out</span>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                <span className="font-medium">
                  {format(new Date(booking.end_date), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total Paid</span>
              <span className="text-blue-600">
                ${booking.total_amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Confirmation sent message */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900">
              📧 A confirmation email has been sent to{' '}
              <span className="font-medium">{booking.guest_email}</span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Link href="/bookings" className="flex-1">
              <Button className="w-full" variant="outline">
                View My Bookings
              </Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}