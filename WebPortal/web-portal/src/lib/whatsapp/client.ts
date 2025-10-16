// src/lib/whatsapp/client.ts
import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export async function sendBookingConfirmation(
  phone: string,
  bookingDetails: {
    assetName: string
    startDate: string
    endDate: string
    amount: number
  }
) {
  try {
    await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${phone}`,
      body: `✅ Booking Confirmed!\n\n${bookingDetails.assetName}\nCheck-in: ${bookingDetails.startDate}\nCheck-out: ${bookingDetails.endDate}\nTotal: $${bookingDetails.amount}\n\nThank you for choosing us!`
    })
    return { success: true }
  } catch (error) {
    console.error('WhatsApp send error:', error)
    return { success: false, error }
  }
}