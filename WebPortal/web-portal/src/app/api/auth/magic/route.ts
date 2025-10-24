// src/app/api/auth/magic/route.ts
// Replace the entire file with this fixed version:

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', req.url))
    }

    // Add null check
    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized')
      return NextResponse.redirect(new URL('/login?error=server_error', req.url))
    }

    // Verify magic link
    const { data: magicLink } = await supabaseAdmin
      .from('magic_links')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!magicLink) {
      return NextResponse.redirect(new URL('/login?error=invalid_or_expired', req.url))
    }

    // Mark as used
    await supabaseAdmin
      .from('magic_links')
      .update({ used: true })
      .eq('token', token)

    // Create session or redirect to login with token
    return NextResponse.redirect(new URL(`/login?token=${token}`, req.url))
  } catch (error) {
    console.error('Magic link error:', error)
    return NextResponse.redirect(new URL('/login?error=server_error', req.url))
  }
}