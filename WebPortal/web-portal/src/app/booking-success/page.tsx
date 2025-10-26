// src/app/booking-success/page.tsx
import { supabaseAdmin } from '@/lib/supabase/admin'
import { CheckCircle, Calendar, MapPin, Car, Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format } from 'date-fns'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

async function getBookingDetails(sessionId: string) {
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      properties (title, address, city, state),
      vehicles (make, model),
      payments (amount)
    `)
    .eq('stripe_checkout_session_id', sessionId)
    .single()

  return booking
}

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const params = await searchParams
  
  if (!params.session_id) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Invalid booking session</p>
      </div>
    )
  }

  const booking = await getBookingDetails(params.session_id)

  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Booking not found</p>
      </div>
    )
  }

  // CRITICAL FIX: Set authentication cookie for the user
  const cookieStore = await cookies()
  const existingUserId = cookieStore.get('user_id')?.value

  if (!existingUserId && booking.user_id) {
    cookieStore.set('user_id', booking.user_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
  }

  const asset =
    booking.booking_type === 'property' ? booking.properties : booking.vehicles

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
                  ? asset?.title
                  : `${asset?.make} ${asset?.model}`}
              </h2>
              {booking.booking_type === 'property' && asset?.address && (
                <p className="text-sm text-gray-600 flex items-center mt-1">
                  <MapPin className="w-4 h-4 mr-1" />
                  {asset.address}, {asset.city}
                </p>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Check-in</p>
                <p className="font-medium flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {format(new Date(booking.start_date), 'MMM dd, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Check-out</p>
                <p className="font-medium flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {format(new Date(booking.end_date), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Booking ID</span>
              <span className="font-mono text-sm">{booking.id.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total Paid</span>
              <span>${booking.total_amount.toFixed(2)}</span>
            </div>
          </div>

          {booking.special_requests && (
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-1">Special Requests</p>
              <p className="text-sm">{booking.special_requests}</p>
            </div>
          )}

          <div className="border-t pt-4 space-y-3">
            <Button asChild className="w-full">
              <Link href="/bookings">View My Bookings</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Return to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}