'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

interface Property {
  name: string
  type: string
  location: string
}

interface Vehicle {
  make: string
  model: string
  year: number
}

interface Booking {
  id: string
  user_id: string
  booking_type: 'property' | 'vehicle'
  asset_id: string
  start_date: string
  end_date: string
  status: string
  total_amount: number
  created_at: string
  properties?: Property
  vehicles?: Vehicle
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      router.push('/login')
      return
    }

    setUser(session.user)
    
    // Ensure user record exists
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', session.user.id)
      .single()

    if (userError || !userData) {
      // Create user record if missing
      await supabase.from('users').insert({
        id: session.user.id,
        email: session.user.email,
        phone: session.user.phone,
        role: 'guest'
      })
    }

    fetchBookings(session.user.id)
  }

  async function fetchBookings(userId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        properties (name, type, location),
        vehicles (make, model, year)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch error:', error)
    } else {
      setBookings(data || [])
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Bookings</h1>
      
      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No bookings found</p>
          <button 
            onClick={() => router.push('/properties')}
            className="bg-blue-500 text-white px-6 py-2 rounded"
          >
            Browse Properties
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">
                    {booking.booking_type === 'property' 
                      ? booking.properties?.name 
                      : `${booking.vehicles?.make} ${booking.vehicles?.model}`}
                  </h3>
                  <p className="text-gray-600">
                    {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Status: <span className={`font-medium ${
                      booking.status === 'confirmed' ? 'text-green-600' : 
                      booking.status === 'pending' ? 'text-yellow-600' : 
                      'text-gray-600'
                    }`}>{booking.status}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">${booking.total_amount}</p>
                  <button 
                    onClick={() => router.push(`/report?booking=${booking.id}`)}
                    className="text-sm text-blue-500 hover:underline mt-2"
                  >
                    Report Issue
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}