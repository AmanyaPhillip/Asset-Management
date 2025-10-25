import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, otp } = await req.json()

    // Validate inputs
    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      )
    }

    // Clean inputs
    const cleanedPhone = (phoneNumber || '').replace(/\D/g, '')
    const cleanedOtp = (otp || '').replace(/\D/g, '')

    if (cleanedOtp.length !== 6) {
      return NextResponse.json(
        { error: 'OTP must be 6 digits' },
        { status: 400 }
      )
    }

    const formattedPhone = `+1${cleanedPhone}`

    // Find valid OTP
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('phone_number', formattedPhone)
      .eq('otp_code', cleanedOtp)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (otpError || !otpRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    // Check attempts
    if (otpRecord.attempts >= 5) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Request a new code.' },
        { status: 400 }
      )
    }

    // Mark OTP as verified
    await supabaseAdmin
      .from('otp_codes')
      .update({ verified: true })
      .eq('id', otpRecord.id)

    // Get or create user
    let userId: string

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone_number', formattedPhone)
      .single()

    if (existingUser) {
      userId = existingUser.id
      
      // Update verification status
      await supabaseAdmin
        .from('users')
        .update({ 
          phone_verified: true,
          whatsapp_verified: true 
        })
        .eq('id', userId)
    } else {
      // Create new user
      const { data: newUser, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          phone_number: formattedPhone,
          role: 'customer',
          phone_verified: true,
          whatsapp_verified: true,
        })
        .select('id')
        .single()

      if (userError || !newUser) {
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        )
      }

      userId = newUser.id
    }

    return NextResponse.json({ 
      success: true,
      userId: userId,
      message: 'Phone verified successfully'
    })
  } catch (error: any) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: 500 }
    )
  }
}