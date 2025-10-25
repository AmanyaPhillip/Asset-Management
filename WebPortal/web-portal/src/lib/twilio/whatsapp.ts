// src/lib/twilio/whatsapp.ts
import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER

if (!accountSid || !authToken || !whatsappNumber) {
  throw new Error('Missing Twilio credentials')
}

const client = twilio(accountSid, authToken)

export async function sendWhatsAppMessage(to: string, message: string) {
  try {
    // CRITICAL: Both from and to MUST have whatsapp: prefix
    // Remove any existing whatsapp: prefix first, then add it
    const cleanTo = to.replace('whatsapp:', '')
    const formattedTo = `whatsapp:${cleanTo.startsWith('+') ? cleanTo : '+' + cleanTo}`
    
    console.log('Sending WhatsApp from:', whatsappNumber)
    console.log('Sending WhatsApp to:', formattedTo)
    
    const result = await client.messages.create({
      body: message,
      from: whatsappNumber, // Must be whatsapp:+14155238886
      to: formattedTo,      // Must be whatsapp:+1234567890
    })
    
    console.log('WhatsApp sent successfully:', result.sid)
    return { success: true, messageId: result.sid }
  } catch (error: any) {
    console.error('Twilio WhatsApp error:', error)
    throw new Error(error.message || 'Failed to send WhatsApp message')
  }
}

// Generate random 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}