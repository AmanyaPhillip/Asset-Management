// src/app/api/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { whatsappService } from '@/lib/whatsapp/service'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, otp } = await req.json()

    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      )
    }

    const result = await whatsappService.verifyOTP(phoneNumber, otp)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Create session
    const cookieStore = await cookies()
    cookieStore.set('user_id', result.userId!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return NextResponse.json({
      success: true,
      userId: result.userId,
    })
  } catch (error: any) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    )
  }
}