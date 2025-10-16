// src/app/api/bookings/create-checkout-session/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/client'
import { whatsappService } from '@/lib/whatsapp/service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
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
      guestPhone,
      guestEmail,
      totalAmount,
    } = body

    // Validate required fields
    if (!assetId || !assetType || !startDate || !endDate || !guestName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate that at least one contact method is provided
    if (!guestPhone && !guestEmail) {
      return NextResponse.json(
        { error: 'Either phone number or email is required' },
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

    // Get or create user - prioritize by email if provided, then phone
    let userId: string | null = null
    
    if (guestEmail) {
      // Try to find by email first
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id, phone_verified')
        .eq('email', guestEmail)
        .single()

      if (existingUser) {
        userId = existingUser.id
        
        // Update phone if provided and not already set
        if (guestPhone && !existingUser.phone_number) {
          await supabaseAdmin
            .from('users')
            .update({ phone_number: guestPhone })
            .eq('id', userId)
        }
      }
    } else if (guestPhone) {
      // Try to find by phone
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id, phone_verified')
        .eq('phone_number', guestPhone)
        .single()

      if (existingUser) {
        userId = existingUser.id
      }
    }

    // Create new user if not found
    if (!userId) {
      const { data: newUser, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          email: guestEmail || null,
          phone_number: guestPhone || null,
          full_name: guestName,
          role: 'customer',
          phone_verified: false,
        })
        .select()
        .single()

      if (userError) {
        console.error('Error creating user:', userError)
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        )
      }

      userId = newUser.id
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
        guest_email: guestEmail || null,
        guest_phone: guestPhone || null,
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
    const sessionConfig: any = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: assetName,
              description: `${assetType === 'property' ? 'Property' : 'Vehicle'} rental from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
            },
            unit_amount: Math.round(totalAmount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: booking.id,
        asset_type: assetType,
        asset_id: assetId,
        user_id: userId,
        phone_number: guestPhone || '',
        email: guestEmail || '',
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${assetType}/${assetId}`,
    }

    // Add email or phone to Stripe session
    if (guestEmail) {
      sessionConfig.customer_email = guestEmail
    } else if (guestPhone) {
      sessionConfig.customer_phone = guestPhone
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    // Update booking with session ID
    await supabaseAdmin
      .from('bookings')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', booking.id)

    // Send initial notification
    try {
      const pendingMessage = `📋 *Booking Created*

${assetName}

📅 ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}
💰 Total: $${totalAmount.toFixed(2)}

⏳ Please complete your payment to confirm the booking.

Booking ID: ${booking.id.slice(0, 8)}

Davidzo's Rentals`

      // Send WhatsApp if phone provided
      if (guestPhone) {
        await whatsappService.sendMessage(
          guestPhone,
          pendingMessage,
          'booking_pending',
          userId,
          booking.id
        )
      }

      // TODO: Send email if email provided
      // You can implement email sending here
    } catch (notificationError) {
      console.error('Notification error (non-critical):', notificationError)
    }

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