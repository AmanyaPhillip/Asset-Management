// =====================================================
// PART 2: Stripe Webhook Handler
// File: src/app/api/webhooks/stripe/route.ts
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/client'
import { sendBookingConfirmation } from '@/lib/whatsapp/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
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

  // Fetch booking details FIRST
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      properties (title, address, city, state),
      vehicles (make, model)
    `)
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    console.error('Error fetching booking:', fetchError)
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
      amount: (session.amount_total || 0) / 100,
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

  // Send WhatsApp confirmation if phone provided
  if (booking.guest_phone) {
    try {
      const assetName =
        booking.booking_type === 'property'
          ? booking.properties?.title
          : `${booking.vehicles?.make} ${booking.vehicles?.model}`

      const startDate = new Date(booking.start_date).toLocaleDateString()
      const endDate = new Date(booking.end_date).toLocaleDateString()

      const message = `✅ *Payment Confirmed!*

${assetName}

📅 ${startDate} - ${endDate}
💰 Paid: $${booking.total_amount.toFixed(2)}

Your booking is now confirmed!

Booking ID: ${bookingId.slice(0, 8)}

Davidzo's Rentals`

      await whatsappService.sendMessage(
        booking.guest_phone,
        message,
        'booking_confirmation',
        userId,
        bookingId
      )
    } catch (whatsappError) {
      console.error('WhatsApp error (non-critical):', whatsappError)
    }
  }

  console.log(`Booking ${bookingId} confirmed successfully`)
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