// src/app/api/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

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

    // Check supabaseAdmin
    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Verify OTP (implement your verification logic)
    // This is a placeholder - adjust based on your auth method
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
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

    // Create session or return user data
    return NextResponse.json({ 
      success: true,
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