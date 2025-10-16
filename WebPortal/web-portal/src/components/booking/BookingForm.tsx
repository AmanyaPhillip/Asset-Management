// =====================================================
// Updated Booking Form Component - WhatsApp Only
// File: src/components/booking/BookingForm.tsx
// =====================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarIcon, Loader2, MessageSquare, Phone } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { cn } from '@/lib/utils'

type BookingFormProps = {
  assetId: string
  assetType: 'property' | 'vehicle'
  pricePerNight: number
  cleaningFee?: number
  title: string
}

export default function BookingForm({
  assetId,
  assetType,
  pricePerNight,
  cleaningFee = 0,
  title,
}: BookingFormProps) {
  const router = useRouter()
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const nights = startDate && endDate ? differenceInDays(endDate, startDate) : 0
  const subtotal = nights * pricePerNight
  const total = subtotal + cleaningFee

  const formatPhoneInput = (value: string) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '')
    
    // Format as user types
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value)
    setGuestPhone(formatted)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!startDate || !endDate) {
      setError('Please select check-in and check-out dates')
      return
    }

    if (nights < 1) {
      setError('Booking must be at least 1 night')
      return
    }

    if (!guestName || !guestPhone) {
      setError('Please fill in all required fields')
      return
    }

    // Validate phone number format
    const cleanedPhone = guestPhone.replace(/\D/g, '')
    if (cleanedPhone.length < 10) {
      setError('Please enter a valid phone number')
      return
    }

    // Convert to E.164 format (add +1 for US/Canada)
    const formattedPhone = `+1${cleanedPhone}`

    setIsLoading(true)

    try {
      const response = await fetch('/api/bookings/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId,
          assetType,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          guestName,
          guestPhone: formattedPhone,
          totalAmount: total,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setIsLoading(false)
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between">
          <span className="text-3xl font-bold text-blue-600">
            ${pricePerNight}
          </span>
          <span className="text-sm text-gray-600">
            per {assetType === 'property' ? 'night' : 'day'}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Check-in</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'MMM dd') : 'Select'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Check-out</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'MMM dd') : 'Select'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => !startDate || date <= startDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Guest Information */}
          <div>
            <Label htmlFor="guestName">Full Name *</Label>
            <Input
              id="guestName"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <Label htmlFor="guestPhone">WhatsApp Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="guestPhone"
                type="tel"
                value={guestPhone}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-green-600" />
              Confirmation will be sent via WhatsApp
            </p>
          </div>

          {/* Price Breakdown */}
          {nights > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span>
                  ${pricePerNight} x {nights} {nights === 1 ? 'night' : 'nights'}
                </span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {cleaningFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Cleaning fee</span>
                  <span>${cleaningFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isLoading || !startDate || !endDate}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <MessageSquare className="mr-2 h-4 w-4" />
                Reserve & Pay
              </>
            )}
          </Button>

          <div className="text-xs text-center text-gray-500 mt-2">
            You'll receive instant confirmation via WhatsApp
          </div>
        </form>
      </CardContent>
    </Card>
  )
}