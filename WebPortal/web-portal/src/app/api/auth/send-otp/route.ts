// src/app/api/auth/send-otp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { whatsappService } from '@/lib/whatsapp/service'

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber } = await req.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    const result = await whatsappService.sendOTP(phoneNumber)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
    })
  } catch (error: any) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    )
  }
}





