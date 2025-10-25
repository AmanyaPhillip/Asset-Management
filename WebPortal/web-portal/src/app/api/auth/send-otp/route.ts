// src/app/api/auth/send-otp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use regular Supabase client for auth (not admin)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber } = await req.json()

    // Defensive coding - validate input
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Clean phone number safely
    const cleanedPhone = (phoneNumber || '').replace(/\D/g, '')

    if (cleanedPhone.length < 10) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Format with country code if not present
    let formattedPhone = phoneNumber.trim()
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+1${cleanedPhone}`
    }

    // Use signInWithOtp for phone authentication
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    })

    if (error) {
      console.error('Supabase OTP error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to send OTP' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'OTP sent successfully'
    })
  } catch (error: any) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}