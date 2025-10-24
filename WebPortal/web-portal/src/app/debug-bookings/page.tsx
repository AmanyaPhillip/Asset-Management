// Debug page to check bookings and auth
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'

export default function DebugBookingsPage() {
  const { user, loading: authLoading } = useAuth()
  const [bookings, setBookings] = useState<any[]>([])
  const [error, setError] = useState<string>('')
  const [rawResponse, setRawResponse] = useState<any>(null)

  useEffect(() => {
    if (user) {
      fetchBookings()
    }
  }, [user])

  const fetchBookings = async () => {
    try {
      console.log('🔍 Fetching bookings for user:', user?.id)
      
      const { data, error, count } = await supabase
        .from('bookings')
        .select(`
          *,
          properties (title, address, city, state),
          vehicles (make, model, year)
        `, { count: 'exact' })
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      console.log('📊 Query response:', { data, error, count })
      
      setRawResponse({ data, error, count })
      
      if (error) {
        console.error('❌ Error fetching bookings:', error)
        setError(error.message)
      } else {
        console.log('✅ Bookings found:', data?.length)
        setBookings(data || [])
      }
    } catch (err: any) {
      console.error('💥 Unexpected error:', err)
      setError(err.message)
    }
  }

  if (authLoading) {
    return <div className="p-8">Loading auth...</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">🔍 Bookings Debug Page</h1>
      
      {/* User Info */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="font-semibold mb-2">👤 Current User:</h2>
        {user ? (
          <pre className="text-xs bg-white p-2 rounded overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        ) : (
          <p className="text-red-600">❌ No user logged in</p>
        )}
      </div>

      {/* Bookings Count */}
      <div className="bg-green-50 p-4 rounded-lg mb-6">
        <h2 className="font-semibold mb-2">📊 Bookings Found:</h2>
        <p className="text-2xl font-bold">{bookings.length}</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 p-4 rounded-lg mb-6">
          <h2 className="font-semibold mb-2 text-red-700">❌ Error:</h2>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Raw Response */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h2 className="font-semibold mb-2">🔧 Raw Supabase Response:</h2>
        <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-96">
          {JSON.stringify(rawResponse, null, 2)}
        </pre>
      </div>

      {/* Bookings List */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-4">📋 Bookings List:</h2>
        {bookings.length === 0 ? (
          <p className="text-gray-500">No bookings found</p>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="border p-3 rounded">
                <p className="font-mono text-xs text-gray-500">ID: {booking.id}</p>
                <p className="font-semibold">Status: {booking.status}</p>
                <p>Type: {booking.booking_type}</p>
                <p>Dates: {booking.start_date} → {booking.end_date}</p>
                <p>Amount: ${booking.total_amount}</p>
                <p>Guest: {booking.guest_name} ({booking.guest_phone})</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Fetch Button */}
      <button
        onClick={fetchBookings}
        className="mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        🔄 Refresh Bookings
      </button>
    </div>
  )
}