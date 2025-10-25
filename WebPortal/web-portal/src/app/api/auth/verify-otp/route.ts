// src/app/api/auth/verify-otp/route.ts
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
    let user: any

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('phone_number', formattedPhone)
      .single()

    if (existingUser) {
      user = existingUser
      
      // Update verification status
      await supabaseAdmin
        .from('users')
        .update({ 
          phone_verified: true,
          whatsapp_verified: true 
        })
        .eq('id', existingUser.id)
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
        .select()
        .single()

      if (userError || !newUser) {
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        )
      }

      user = newUser
    }

    // Generate session token (cryptographically secure)
    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Delete any existing sessions for this user (optional - for single session per user)
    // await supabaseAdmin
    //   .from('user_sessions')
    //   .delete()
    //   .eq('user_id', user.id)

    // Create new session
    const { error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .insert({
        user_id: user.id,
        token: sessionToken,
        expires_at: expiresAt.toISOString(),
      })

    if (sessionError) {
      console.error('Session creation error:', sessionError)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    // Return session token to client
    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        role: user.role,
        full_name: user.full_name,
      },
      session: {
        token: sessionToken,
        expires_at: expiresAt.toISOString(),
      }
    })
  } catch (error: any) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: 500 }
    )
  }
}