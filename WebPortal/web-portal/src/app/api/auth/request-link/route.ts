// src/app/api/auth/request-link/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { whatsappService } from '@/lib/whatsapp/service'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber } = await req.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Get user by phone
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone_number', phoneNumber)
      .eq('phone_verified', true)
      .single()

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or not verified' },
        { status: 404 }
      )
    }

    // Send dashboard link
    await whatsappService.sendDashboardLink(user.id, phoneNumber)

    return NextResponse.json({
      success: true,
      message: 'Dashboard link sent to WhatsApp',
    })
  } catch (error: any) {
    console.error('Request link error:', error)
    return NextResponse.json(
      { error: 'Failed to send dashboard link' },
      { status: 500 }
    )
  }
}