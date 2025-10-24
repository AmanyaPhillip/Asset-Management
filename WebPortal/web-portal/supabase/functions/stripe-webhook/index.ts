// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()
  
  console.log('Webhook received')
  
  if (!signature) {
    console.error('No signature header')
    return new Response('No signature', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
      undefined,
      cryptoProvider
    )
    console.log('Event verified:', event.type)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const bookingId = session.metadata?.booking_id
      const userId = session.metadata?.user_id

      if (!bookingId) {
        console.error('No booking_id in session metadata')
        return new Response(JSON.stringify({ error: 'No booking_id' }), { status: 400 })
      }

      console.log('Processing checkout session:', session.id)

      // Fetch booking details
      const { data: booking, error: fetchError } = await supabase
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
        return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404 })
      }

      // Update booking to confirmed
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ 
          status: 'confirmed',
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)

      if (bookingError) {
        console.error('Error updating booking:', bookingError)
        return new Response(JSON.stringify({ error: bookingError.message }), { status: 500 })
      }

      console.log('✅ Booking confirmed:', bookingId)

      // Create payment record
      const { error: paymentError } = await supabase
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
        console.error('Error creating payment:', paymentError)
      }

      // Create notification for managers
      const { data: managers } = await supabase
        .from('users')
        .select('id')
        .in('role', ['manager', 'admin'])

      if (managers && managers.length > 0) {
        const notifications = managers.map((manager) => ({
          user_id: manager.id,
          title: 'New Booking Confirmed',
          message: `A new booking has been confirmed. Booking ID: ${bookingId}`,
          type: 'booking',
          related_id: bookingId,
        }))

        await supabase.from('notifications').insert(notifications)
      }

      // Send WhatsApp confirmation
      if (booking.guest_phone) {
        try {
          const assetName = booking.booking_type === 'property'
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

          // Call WhatsApp function
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              phone: booking.guest_phone,
              message: message,
              messageType: 'booking_confirmation',
              userId: userId,
              bookingId: bookingId
            })
          })
        } catch (whatsappError) {
          console.error('WhatsApp error (non-critical):', whatsappError)
        }
      }

      console.log(`✅ Booking ${bookingId} confirmed successfully`)
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      
      const { error } = await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('stripe_payment_intent_id', paymentIntent.id)

      if (error) {
        console.error('Error updating failed payment:', error)
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error: any) {
    console.error('Error processing webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})