// =====================================================
// PART 1: Stripe Checkout Session API
// File: src/app/api/bookings/create-checkout-session/route.ts
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/client'

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



