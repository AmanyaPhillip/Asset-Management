// supabase/functions/create-checkout/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

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
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!guestPhone && !guestEmail) {
      return new Response(
        JSON.stringify({ error: 'Either phone number or email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check availability
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq(assetType === 'property' ? 'property_id' : 'vehicle_id', assetId)
      .eq('status', 'confirmed')
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)

    if (existingBookings && existingBookings.length > 0) {
      return new Response(
        JSON.stringify({ error: 'This asset is not available for the selected dates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get or create user
    let userId: string | null = null
    
    if (guestEmail) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, phone_number')
        .eq('email', guestEmail)
        .maybeSingle()

      if (existingUser) {
        userId = existingUser.id
        if (guestPhone && !existingUser.phone_number) {
          await supabase
            .from('users')
            .update({ phone_number: guestPhone })
            .eq('id', userId)
        }
      }
    }
    
    if (!userId && guestPhone) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('phone_number', guestPhone)
        .maybeSingle()

      if (existingUser) {
        userId = existingUser.id
        if (guestEmail && !existingUser.email) {
          await supabase
            .from('users')
            .update({ email: guestEmail })
            .eq('id', userId)
        }
      }
    }

    // Create new user if not found
    if (!userId) {
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email: guestEmail || null,
          phone_number: guestPhone || null,
          full_name: guestName,
          role: 'customer',
          phone_verified: false,
          whatsapp_verified: false,
        })
        .select('id')
        .single()

      if (userError) {
        console.error('Error creating user:', userError)
        return new Response(
          JSON.stringify({ error: 'Failed to create user account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      userId = newUser.id
    }

    // Create pending booking
    const { data: booking, error: bookingError } = await supabase
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
      return new Response(
        JSON.stringify({ error: 'Failed to create booking' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get asset details
    let assetName = ''
    if (assetType === 'property') {
      const { data: property } = await supabase
        .from('properties')
        .select('title')
        .eq('id', assetId)
        .single()
      assetName = property?.title || 'Property Rental'
    } else {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('make, model')
        .eq('id', assetId)
        .single()
      assetName = vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle Rental'
    }

    // Create Stripe Checkout Session
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000'
    
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
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
        guest_name: guestName,
      },
      success_url: `${appUrl}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/${assetType}/${assetId}`,
    }

    if (guestEmail) {
      sessionConfig.customer_email = guestEmail
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    // Update booking with session ID
    await supabase
      .from('bookings')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', booking.id)

    // Send WhatsApp notification if phone provided
    if (guestPhone) {
      try {
        const message = `📋 *Booking Created*

${assetName}

📅 ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}
💰 Total: $${totalAmount.toFixed(2)}

⏳ Please complete your payment to confirm the booking.

Booking ID: ${booking.id.slice(0, 8)}

Davidzo's Rentals`

        // Call WhatsApp function
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone: guestPhone,
            message: message,
            messageType: 'booking_pending',
            userId: userId,
            bookingId: booking.id
          })
        })
      } catch (whatsappError) {
        console.error('WhatsApp error (non-critical):', whatsappError)
      }
    }

    return new Response(
      JSON.stringify({
        checkoutUrl: session.url,
        bookingId: booking.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})