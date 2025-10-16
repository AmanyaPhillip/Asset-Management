// =====================================================
// PART 3: Booking Success Page
// File: src/app/booking-success/page.tsx
// =====================================================

import { supabaseAdmin } from '@/lib/supabase/client'
import { CheckCircle, Calendar, MapPin, Car, Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format } from 'date-fns'

async function getBookingDetails(sessionId: string) {
  // Get booking by session ID
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      properties (title, address, city, state),
      vehicles (make, model),
      payments (amount, receipt_url)
    `)
    .eq('stripe_checkout_session_id', sessionId)
    .single()

  return booking
}

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string }
}) {
  if (!searchParams.session_id) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Invalid booking session</p>
      </div>
    )
  }

  const booking = await getBookingDetails(searchParams.session_id)

  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Booking not found</p>
      </div>
    )
  }

  const asset = booking.booking_type === 'property' 
    ? booking.properties 
    : booking.vehicles

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Booking Confirmed!
        </h1>
        <p className="text-gray-600">
          Your reservation has been successfully confirmed
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Asset Info */}
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              {booking.booking_type === 'property' ? (
                <Building2 className="w-6 h-6 text-blue-600" />
              ) : (
                <Car className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-lg">
                {booking.booking_type === 'property'
                  ? asset.title
                  : `${asset.make} ${asset.model}`}
              </h2>
              {booking.booking_type === 'property' && (
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{asset.address}, {asset.city}, {asset.state}</span>
                </div>
              )}
            </div>
          </div>

          {/* Booking Details */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Booking ID</span>
              <span className="font-mono text-sm">{booking.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Guest Name</span>
              <span className="font-medium">{booking.guest_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Check-in</span>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                <span className="font-medium">
                  {format(new Date(booking.start_date), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Check-out</span>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                <span className="font-medium">
                  {format(new Date(booking.end_date), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total Paid</span>
              <span className="text-blue-600">
                ${booking.total_amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Confirmation sent message */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900">
              📧 A confirmation email has been sent to{' '}
              <span className="font-medium">{booking.guest_email}</span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Link href="/bookings" className="flex-1">
              <Button className="w-full" variant="outline">
                View My Bookings
              </Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}