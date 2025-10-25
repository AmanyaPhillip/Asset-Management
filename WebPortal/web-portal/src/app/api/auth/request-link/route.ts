// src/app/api/auth/request-link/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

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

    // Find user by phone
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, full_name')
      .eq('phone_number', formattedPhone)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'No bookings found for this number' },
        { status: 404 }
      )
    }

    // Generate magic link
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/bookings`
    
    // Send WhatsApp message with link (implement your WhatsApp service)
    // For now, just return success
    // TODO: Integrate with WhatsApp API

    return NextResponse.json({ 
      success: true,
      message: 'Dashboard link sent to WhatsApp'
    })
  } catch (error: any) {
    console.error('Request link error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}