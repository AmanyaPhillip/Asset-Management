// =====================================================
// PART 3: User Bookings Dashboard
// File: src/app/bookings/page.tsx
// =====================================================

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, MapPin, Car, Building2, Loader2, FileText } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

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

export default function BookingsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchBookings()
    }
  }, [user, authLoading, router])

  const fetchBookings = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        properties (title, address, city, state),
        vehicles (make, model, year)
      `)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching bookings:', error)
    } else {
      setBookings(data || [])
    }
    setLoading(false)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
    }
    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const upcomingBookings = bookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.start_date) >= new Date()
  )
  const pastBookings = bookings.filter(
    (b) => b.status === 'completed' || new Date(b.end_date) < new Date()
  )

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Bookings</h1>
        <p className="text-gray-600">Manage your reservations and view history</p>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastBookings.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({bookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingBookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500 mb-4">No upcoming bookings</p>
                <Link href="/properties">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Browse Properties
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            upcomingBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastBookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No past bookings</p>
              </CardContent>
            </Card>
          ) : (
            pastBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BookingCard({ booking }: { booking: BookingWithDetails }) {
  const asset = booking.booking_type === 'property' 
    ? booking.properties 
    : booking.vehicles

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              {booking.booking_type === 'property' ? (
                <Building2 className="w-6 h-6 text-blue-600" />
              ) : (
                <Car className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div>
              <CardTitle className="text-xl">
                {booking.booking_type === 'property'
                  ? asset?.title
                  : `${asset?.make} ${asset?.model} ${asset?.year}`}
              </CardTitle>
              {booking.booking_type === 'property' && asset && (
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{asset.address}, {asset.city}</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            {getStatusBadge(booking.status)}
            <p className="text-sm text-gray-500 mt-2">
              Booking ID: {booking.id.slice(0, 8)}...
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Check-in</p>
              <p className="font-medium">
                {format(new Date(booking.start_date), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">Check-out</p>
              <p className="font-medium">
                {format(new Date(booking.end_date), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="w-5 h-5" /> {/* Spacer */}
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="font-bold text-blue-600 text-lg">
                ${booking.total_amount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Link href={`/report?booking=${booking.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              <FileText className="w-4 h-4 mr-2" />
              Report Issue
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}