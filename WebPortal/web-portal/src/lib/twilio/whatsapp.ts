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
    // Ensure phone number has whatsapp: prefix
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
    
    const result = await client.messages.create({
      body: message,
      from: whatsappNumber, // Already has whatsapp: prefix from env
      to: formattedTo,
    })
    
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