// =====================================================
// PART 3: Vehicle Card Component
// File: src/components/vehicles/VehicleCard.tsx
// =====================================================

import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Fuel, Settings } from 'lucide-react'
import { Vehicle } from '@/types/database'

export default function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const imageUrl = vehicle.images[0] || '/placeholder-vehicle.jpg'

  return (
    <Link href={`/vehicle/${vehicle.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative h-48">
          <Image
            src={imageUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            fill
            className="object-cover"
          />
          <Badge className="absolute top-2 right-2 bg-blue-600">
            {vehicle.vehicle_type}
          </Badge>
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-1">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {vehicle.color || 'Available'}
          </p>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            {vehicle.seats && (
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                <span>{vehicle.seats} seats</span>
              </div>
            )}
            {vehicle.transmission && (
              <div className="flex items-center">
                <Settings className="w-4 h-4 mr-1" />
                <span>{vehicle.transmission}</span>
              </div>
            )}
            {vehicle.fuel_type && (
              <div className="flex items-center">
                <Fuel className="w-4 h-4 mr-1" />
                <span>{vehicle.fuel_type}</span>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="p-4 pt-0">
          <div className="flex justify-between items-center w-full">
            <span className="text-2xl font-bold text-blue-600">
              ${vehicle.price_per_day}
            </span>
            <span className="text-sm text-gray-500">per day</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}