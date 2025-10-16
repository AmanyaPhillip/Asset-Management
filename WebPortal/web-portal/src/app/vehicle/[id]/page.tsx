// =====================================================
// PART 4: Vehicle Detail Page (FIXED)
// File: src/app/vehicle/[id]/page.tsx
// =====================================================

import { supabaseAdmin } from '@/lib/supabase/client'
import { Vehicle } from '@/types/database'
import { notFound } from 'next/navigation'
import PropertyGallery from '@/components/properties/PropertyGallery'
import BookingForm from '@/components/booking/BookingForm'
import { Users, Settings, Fuel, Gauge, CheckCircle } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

async function getVehicle(id: string): Promise<Vehicle | null> {
  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error) {
    console.error('Error fetching vehicle:', error)
    return null
  }

  return data
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // ✅ CORRECT: Await params before accessing properties
  const { id } = await params
  const vehicle = await getVehicle(id)

  if (!vehicle) {
    notFound()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Gallery */}
      <PropertyGallery 
        images={vehicle.images} 
        title={`${vehicle.make} ${vehicle.model}`} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Left Column - Vehicle Info */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              <Badge className="bg-blue-100 text-blue-800">
                {vehicle.vehicle_type}
              </Badge>
            </div>
            <p className="text-gray-600">
              License Plate: {vehicle.license_plate}
            </p>
          </div>

          {/* Vehicle Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {vehicle.seats && (
              <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-600 mb-2" />
                <span className="text-sm text-gray-600">Seats</span>
                <span className="font-semibold">{vehicle.seats}</span>
              </div>
            )}
            {vehicle.transmission && (
              <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                <Settings className="w-6 h-6 text-blue-600 mb-2" />
                <span className="text-sm text-gray-600">Transmission</span>
                <span className="font-semibold capitalize">{vehicle.transmission}</span>
              </div>
            )}
            {vehicle.fuel_type && (
              <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                <Fuel className="w-6 h-6 text-blue-600 mb-2" />
                <span className="text-sm text-gray-600">Fuel</span>
                <span className="font-semibold capitalize">{vehicle.fuel_type}</span>
              </div>
            )}
            {vehicle.mileage && (
              <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                <Gauge className="w-6 h-6 text-blue-600 mb-2" />
                <span className="text-sm text-gray-600">Mileage</span>
                <span className="font-semibold">{vehicle.mileage.toLocaleString()} mi</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Color Info */}
          {vehicle.color && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Color</h2>
              <p className="text-gray-700">{vehicle.color}</p>
            </div>
          )}

          <Separator />

          {/* Features */}
          {vehicle.features && vehicle.features.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Features</h2>
              <div className="grid grid-cols-2 gap-3">
                {vehicle.features.map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Maintenance Info */}
          {vehicle.last_maintenance_date && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Last Maintenance:</strong>{' '}
                {new Date(vehicle.last_maintenance_date).toLocaleDateString()}
              </p>
              {vehicle.next_maintenance_date && (
                <p className="text-sm text-blue-900 mt-1">
                  <strong>Next Maintenance:</strong>{' '}
                  {new Date(vehicle.next_maintenance_date).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Booking Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <BookingForm
              assetId={vehicle.id}
              assetType="vehicle"
              pricePerNight={vehicle.price_per_day}
              title={`${vehicle.make} ${vehicle.model}`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}