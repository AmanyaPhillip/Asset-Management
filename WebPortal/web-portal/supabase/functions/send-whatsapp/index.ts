// supabase/functions/send-whatsapp/index.ts
// Optional: Centralized WhatsApp sender

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WHATSAPP_API_URL = Deno.env.get('WHATSAPP_API_URL')
const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { phone, message, messageType, userId, bookingId } = await req.json()

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: 'Phone and message required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send WhatsApp message via API
    const whatsappResponse = await fetch(`${WHATSAPP_API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message }
      })
    })

    const whatsappData = await whatsappResponse.json()

    // Log to database
    await supabase.from('whatsapp_messages').insert({
      phone_number: phone,
      message_type: messageType,
      message_content: message,
      booking_id: bookingId || null,
      user_id: userId || null,
      status: whatsappResponse.ok ? 'sent' : 'failed',
      whatsapp_message_id: whatsappData.messages?.[0]?.id || null
    })

    return new Response(
      JSON.stringify({ success: true, data: whatsappData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('WhatsApp send error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})