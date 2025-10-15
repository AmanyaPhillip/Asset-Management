// =====================================================
// PART 1: Property Detail Page
// File: src/app/property/[id]/page.tsx
// =====================================================

import { supabaseAdmin } from '@/lib/supabase/client'
import { Property } from '@/types/database'
import { notFound } from 'next/navigation'
import PropertyGallery from '@/components/properties/PropertyGallery'
import BookingForm from '@/components/booking/BookingForm'
import { Bed, Bath, Users, MapPin, CheckCircle } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

async function getProperty(id: string): Promise<Property | null> {
  const { data, error } = await supabaseAdmin
    .from('properties')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error) {
    console.error('Error fetching property:', error)
    return null
  }

  return data
}

export default async function PropertyDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const property = await getProperty(params.id)

  if (!property) {
    notFound()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Gallery */}
      <PropertyGallery images={property.images} title={property.title} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Left Column - Property Info */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {property.title}
            </h1>
            <div className="flex items-center text-gray-600">
              <MapPin className="w-5 h-5 mr-2" />
              <span>
                {property.address}, {property.city}, {property.state} {property.zip_code}
              </span>
            </div>
          </div>

          {/* Property Stats */}
          <div className="flex items-center space-x-6 text-gray-700">
            {property.bedrooms && (
              <div className="flex items-center">
                <Bed className="w-5 h-5 mr-2 text-blue-600" />
                <span>{property.bedrooms} Bedrooms</span>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center">
                <Bath className="w-5 h-5 mr-2 text-blue-600" />
                <span>{property.bathrooms} Bathrooms</span>
              </div>
            )}
            {property.max_guests && (
              <div className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                <span>Up to {property.max_guests} Guests</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h2 className="text-xl font-semibold mb-3">About this property</h2>
            <p className="text-gray-700 leading-relaxed">
              {property.description || 'No description available.'}
            </p>
          </div>

          <Separator />

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Amenities</h2>
              <div className="grid grid-cols-2 gap-3">
                {property.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-gray-700">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Booking Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <BookingForm
              assetId={property.id}
              assetType="property"
              pricePerNight={property.price_per_night}
              cleaningFee={property.cleaning_fee}
              title={property.title}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// PART 2: Property Gallery Component
// File: src/components/properties/PropertyGallery.tsx
// =====================================================

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PropertyGallery({
  images,
  title,
}: {
  images: string[]
  title: string
}) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null)

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-200 rounded-xl flex items-center justify-center">
        <span className="text-gray-400">No images available</span>
      </div>
    )
  }

  const handlePrevious = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage - 1 + images.length) % images.length)
    }
  }

  const handleNext = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage + 1) % images.length)
    }
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-2 h-96">
        {/* Main Image */}
        <div
          className="col-span-4 md:col-span-2 relative rounded-xl overflow-hidden cursor-pointer"
          onClick={() => setSelectedImage(0)}
        >
          <Image
            src={images[0]}
            alt={`${title} - Main`}
            fill
            className="object-cover hover:opacity-90 transition-opacity"
          />
        </div>

        {/* Thumbnail Grid */}
        {images.slice(1, 5).map((image, index) => (
          <div
            key={index}
            className="relative rounded-xl overflow-hidden cursor-pointer"
            onClick={() => setSelectedImage(index + 1)}
          >
            <Image
              src={image}
              alt={`${title} - ${index + 2}`}
              fill
              className="object-cover hover:opacity-90 transition-opacity"
            />
          </div>
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={selectedImage !== null} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <div className="relative h-[600px]">
            <Image
              src={images[selectedImage!] || images[0]}
              alt={title}
              fill
              className="object-contain"
            />
            
            {/* Navigation Buttons */}
            {images.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  onClick={handleNext}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// =====================================================
// PART 3: Booking Form Component
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
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react'
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
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const nights = startDate && endDate ? differenceInDays(endDate, startDate) : 0
  const subtotal = nights * pricePerNight
  const total = subtotal + cleaningFee

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

    if (!guestName || !guestEmail) {
      setError('Please fill in all required fields')
      return
    }

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
          guestEmail,
          guestPhone,
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
              required
            />
          </div>

          <div>
            <Label htmlFor="guestEmail">Email *</Label>
            <Input
              id="guestEmail"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="guestPhone">Phone</Label>
            <Input
              id="guestPhone"
              type="tel"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
            />
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
              'Reserve & Pay'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}