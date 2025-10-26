// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { WhatsAppService } from '@/lib/whatsapp/service'
import { cookies } from 'next/headers'

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
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
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
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.booking_id
  const userId = session.metadata?.user_id

  if (!bookingId || !userId) {
    console.error('Missing booking_id or user_id in session metadata')
    return
  }

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

  const { error: bookingError } = await supabaseAdmin
    .from('bookings')
    .update({ 
      status: 'confirmed',
      stripe_checkout_session_id: session.id
    })
    .eq('id', bookingId)

  if (bookingError) {
    console.error('Error updating booking:', bookingError)
    throw bookingError
  }

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

  const { data: managers } = await supabaseAdmin
    .from('users')
    .select('id')
    .in('role', ['manager', 'admin'])

  if (managers) {
    const notifications = managers.map((manager) => ({
      user_id: manager.id,
      title: 'New Booking Confirmed',
      message: `New booking for ${
        booking.booking_type === 'property'
          ? booking.properties?.title
          : `${booking.vehicles?.make} ${booking.vehicles?.model}`
      }`,
      type: 'booking',
      related_id: bookingId,
    }))

    await supabaseAdmin.from('notifications').insert(notifications)
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('phone_number')
    .eq('id', userId)
    .single()

  if (user?.phone_number) {
    const whatsapp = new WhatsAppService()
    await whatsapp.sendBookingConfirmation(bookingId, user.phone_number)
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id)
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id)
}