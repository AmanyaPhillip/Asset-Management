// =====================================================
// Server Component - Bookings Page (UPDATED)
// Fetches data server-side to bypass RLS
// File: src/app/bookings/page.tsx
// =====================================================

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import BookingsClient from '@/components/bookings/BookingsClient'

type BookingWithDetails = {
  id: string
  booking_type: 'property' | 'vehicle'
  start_date: string
  end_date: string
  total_amount: number
  status: string
  created_at: string
  properties?: { title: string; address: string; city: string; state: string }
  vehicles?: { make: string; model: string; year: number }
}

type User = {
  id: string
  phone_number: string
  full_name: string | null
  role: string
  phone_verified: boolean
}

async function getUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value

  if (!userId) {
    return null
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, phone_number, full_name, role, phone_verified')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user:', error)
    return null
  }

  return user
}

async function getBookings(userId: string): Promise<BookingWithDetails[]> {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      properties (title, address, city, state),
      vehicles (make, model, year)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching bookings:', error)
    return []
  }

  return data || []
}

export default async function BookingsPage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const bookings = await getBookings(user.id)

  return <BookingsClient user={user} initialBookings={bookings} />
}