// src/app/api/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, otp } = await req.json()

    console.log('Verify OTP request for:', phoneNumber)

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
    console.log('Formatted phone:', formattedPhone)

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
      console.error('OTP validation failed:', otpError)
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    console.log('OTP validated successfully')

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

    console.log('OTP marked as verified')

    // Get or create user
    let user: any

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('phone_number', formattedPhone)
      .maybeSingle()

    if (existingUserError) {
      console.error('Error checking existing user:', existingUserError)
      return NextResponse.json(
        { error: 'Database error checking user' },
        { status: 500 }
      )
    }

    if (existingUser) {
      console.log('Existing user found:', existingUser.id)
      user = existingUser
      
      // Update verification status
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ 
          phone_verified: true,
          whatsapp_verified: true 
        })
        .eq('id', existingUser.id)

      if (updateError) {
        console.error('Error updating user:', updateError)
      }
    } else {
      console.log('Creating new user for:', formattedPhone)
      
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

      if (userError) {
        console.error('User creation error:', userError)
        return NextResponse.json(
          { error: 'Failed to create user account: ' + userError.message },
          { status: 500 }
        )
      }

      if (!newUser) {
        console.error('No user returned after insert')
        return NextResponse.json(
          { error: 'Failed to create user account - no data returned' },
          { status: 500 }
        )
      }

      console.log('New user created:', newUser.id)
      user = newUser
    }

    // Verify user object is valid
    if (!user || !user.id) {
      console.error('Invalid user object:', user)
      return NextResponse.json(
        { error: 'Invalid user state' },
        { status: 500 }
      )
    }

    console.log('User confirmed:', user.id)

    // Generate session token (cryptographically secure)
    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    console.log('Creating session for user:', user.id)

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
        { error: 'Failed to create session: ' + sessionError.message },
        { status: 500 }
      )
    }

    console.log('Session created successfully')

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