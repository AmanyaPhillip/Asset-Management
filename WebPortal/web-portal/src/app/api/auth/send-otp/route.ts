import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendWhatsAppMessage, generateOTP } from '@/lib/twilio/whatsapp'

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber } = await req.json()

    // Validate input
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Clean and format phone number
    const cleanedPhone = (phoneNumber || '').replace(/\D/g, '')

    if (cleanedPhone.length !== 10) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit phone number' },
        { status: 400 }
      )
    }

    const formattedPhone = `+1${cleanedPhone}`

    // Generate OTP
    const otpCode = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Rate limiting - check for recent OTP
    const { data: existingOTP } = await supabaseAdmin
      .from('otp_codes')
      .select('id, created_at')
      .eq('phone_number', formattedPhone)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingOTP) {
      const timeSinceLastOTP = Date.now() - new Date(existingOTP.created_at).getTime()
      if (timeSinceLastOTP < 60000) { // 1 minute
        return NextResponse.json(
          { error: 'Please wait before requesting another code' },
          { status: 429 }
        )
      }
    }

    // Store OTP in database
    const { error: dbError } = await supabaseAdmin
      .from('otp_codes')
      .insert({
        phone_number: formattedPhone,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to generate verification code' },
        { status: 500 }
      )
    }

    // Send WhatsApp message
    const message = `🔐 *Your Verification Code*

${otpCode}

This code expires in 10 minutes.

_Davidzo's Rentals_`
    
    await sendWhatsAppMessage(formattedPhone, message)

    return NextResponse.json({ 
      success: true,
      message: 'Verification code sent to WhatsApp'
    })
  } catch (error: any) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send verification code' },
      { status: 500 }
    )
  }
}