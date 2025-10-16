// src/app/auth/magic/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(
        new URL('/login?error=invalid_token', req.url)
      )
    }

    // Verify magic link
    const { data: magicLink } = await supabaseAdmin
      .from('magic_links')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single()

    if (!magicLink) {
      return NextResponse.redirect(
        new URL('/login?error=invalid_token', req.url)
      )
    }

    if (new Date(magicLink.expires_at) < new Date()) {
      return NextResponse.redirect(
        new URL('/login?error=expired_token', req.url)
      )
    }

    // Mark as used
    await supabaseAdmin
      .from('magic_links')
      .update({ used: true })
      .eq('id', magicLink.id)

    // Create session
    const cookieStore = await cookies()
    cookieStore.set('user_id', magicLink.user_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/bookings', req.url))
  } catch (error: any) {
    console.error('Magic link error:', error)
    return NextResponse.redirect(new URL('/login?error=unknown', req.url))
  }
}