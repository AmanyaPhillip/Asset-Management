// =====================================================
// PART 1: Property Detail Page (FIXED)
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
  params: Promise<{ id: string }>
}) {
  // ✅ CORRECT: Await params before accessing properties
  const { id } = await params
  const property = await getProperty(id)

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