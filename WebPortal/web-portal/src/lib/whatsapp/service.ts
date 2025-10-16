// src/lib/whatsapp/service.ts
import { supabaseAdmin } from '@/lib/supabase/client'

// Using Twilio as example - adjust for your provider
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER!

export class WhatsAppService {
  private twilioClient: any

  constructor() {
    // Initialize Twilio client
    if (typeof window === 'undefined') {
      const twilio = require('twilio')
      this.twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    }
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(
    phoneNumber: string,
    message: string,
    messageType: string,
    userId?: string,
    bookingId?: string
  ) {
    try {
      // Format phone number (must include country code)
      const formattedNumber = this.formatPhoneNumber(phoneNumber)

      // Send via Twilio
      const result = await this.twilioClient.messages.create({
        from: TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${formattedNumber}`,
        body: message,
      })

      // Log message
      await supabaseAdmin.from('whatsapp_messages').insert({
        user_id: userId,
        phone_number: formattedNumber,
        message_type: messageType,
        message_content: message,
        status: 'sent',
        external_id: result.sid,
        booking_id: bookingId,
      })

      return { success: true, messageId: result.sid }
    } catch (error: any) {
      console.error('WhatsApp send error:', error)

      // Log failed message
      if (userId) {
        await supabaseAdmin.from('whatsapp_messages').insert({
          user_id: userId,
          phone_number: phoneNumber,
          message_type: messageType,
          message_content: message,
          status: 'failed',
          booking_id: bookingId,
        })
      }

      return { success: false, error: error.message }
    }
  }

  /**
   * Generate and send OTP
   */
  async sendOTP(phoneNumber: string) {
    const otp = this.generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store OTP in database
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone_number', phoneNumber)
      .single()

    if (user) {
      await supabaseAdmin
        .from('users')
        .update({
          last_otp: otp,
          otp_expires_at: expiresAt.toISOString(),
        })
        .eq('id', user.id)
    } else {
      // Create temporary user record
      await supabaseAdmin.from('users').insert({
        phone_number: phoneNumber,
        last_otp: otp,
        otp_expires_at: expiresAt.toISOString(),
        role: 'customer',
      })
    }

    const message = `Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nDavidzo's Rentals`

    return await this.sendMessage(phoneNumber, message, 'otp', user?.id)
  }

  /**
   * Verify OTP
   */
  async verifyOTP(phoneNumber: string, otp: string) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single()

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    if (user.last_otp !== otp) {
      return { success: false, error: 'Invalid OTP' }
    }

    if (new Date(user.otp_expires_at) < new Date()) {
      return { success: false, error: 'OTP expired' }
    }

    // Mark as verified
    await supabaseAdmin
      .from('users')
      .update({
        phone_verified: true,
        whatsapp_verified: true,
        last_otp: null,
        otp_expires_at: null,
      })
      .eq('id', user.id)

    return { success: true, userId: user.id }
  }

  /**
   * Send booking confirmation with dashboard link
   */
  async sendBookingConfirmation(bookingId: string, phoneNumber: string) {
    // Get booking details
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        properties (title, address),
        vehicles (make, model)
      `)
      .eq('id', bookingId)
      .single()

    if (!booking) {
      throw new Error('Booking not found')
    }

    // Generate magic link
    const magicLink = await this.generateMagicLink(booking.user_id)

    // Format dates
    const startDate = new Date(booking.start_date).toLocaleDateString()
    const endDate = new Date(booking.end_date).toLocaleDateString()

    const assetName =
      booking.booking_type === 'property'
        ? booking.properties?.title
        : `${booking.vehicles?.make} ${booking.vehicles?.model}`

    const message = `🎉 *Booking Confirmed!*

${assetName}

📅 Check-in: ${startDate}
📅 Check-out: ${endDate}
💰 Total: $${booking.total_amount.toFixed(2)}

Booking ID: ${bookingId.slice(0, 8)}

View your booking details and access your dashboard:
${magicLink}

Thank you for choosing Davidzo's Rentals! 🚗🏠`

    return await this.sendMessage(
      phoneNumber,
      message,
      'booking_confirmation',
      booking.user_id,
      bookingId
    )
  }

  /**
   * Send dashboard access link
   */
  async sendDashboardLink(userId: string, phoneNumber: string) {
    const magicLink = await this.generateMagicLink(userId)

    const message = `🔗 *Access Your Dashboard*

Click the link below to view your bookings:
${magicLink}

This link will expire in 24 hours.

Davidzo's Rentals`

    return await this.sendMessage(
      phoneNumber,
      message,
      'dashboard_link',
      userId
    )
  }

  /**
   * Generate magic link for passwordless access
   */
  async generateMagicLink(userId: string) {
    const token = this.generateSecureToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await supabaseAdmin.from('magic_links').insert({
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${baseUrl}/auth/magic?token=${token}`
  }

  /**
   * Helper: Format phone number
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove spaces, dashes, parentheses
    let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '')

    // Add country code if missing (assuming US/Canada)
    if (!cleaned.startsWith('+')) {
      if (cleaned.length === 10) {
        cleaned = '+1' + cleaned
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        cleaned = '+' + cleaned
      }
    }

    return cleaned
  }

  /**
   * Helper: Generate 6-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  /**
   * Helper: Generate secure token
   */
  private generateSecureToken(): string {
    const crypto = require('crypto')
    return crypto.randomBytes(32).toString('hex')
  }
}

export const whatsappService = new WhatsAppService()