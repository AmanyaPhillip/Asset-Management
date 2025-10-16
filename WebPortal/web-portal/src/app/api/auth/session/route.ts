// =====================================================
// Session Management API Routes
// =====================================================

// File: src/app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ user: null })
    }

    // Get user details
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, phone_number, full_name, role, phone_verified')
      .eq('id', userId)
      .single()

    if (error || !user) {
      // Clear invalid session
      cookieStore.delete('user_id')
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ user: null })
  }
}

// File: src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('user_id')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
}