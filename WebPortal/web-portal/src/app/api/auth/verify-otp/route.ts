// src/app/api/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, otp } = await req.json()

    // Defensive coding - validate inputs
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    if (!otp || typeof otp !== 'string') {
      return NextResponse.json(
        { error: 'OTP is required' },
        { status: 400 }
      )
    }

    // Clean inputs safely
    const cleanedPhone = (phoneNumber || '').replace(/\D/g, '')
    const cleanedOtp = (otp || '').replace(/\D/g, '')

    if (cleanedOtp.length !== 6) {
      return NextResponse.json(
        { error: 'OTP must be 6 digits' },
        { status: 400 }
      )
    }

    // Format phone
    let formattedPhone = phoneNumber.trim()
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+1${cleanedPhone}`
    }

    // Verify OTP using Supabase Auth
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: cleanedOtp,
      type: 'sms',
    })

    if (error) {
      console.error('OTP verification error:', error)
      return NextResponse.json(
        { error: error.message || 'Invalid or expired OTP' },
        { status: 400 }
      )
    }

    if (!data.session) {
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    // Return session tokens
    return NextResponse.json({ 
      success: true,
      session: data.session,
      user: data.user 
    })
  } catch (error: any) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}