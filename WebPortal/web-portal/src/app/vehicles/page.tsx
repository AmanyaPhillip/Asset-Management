// =====================================================
// PART 2: Vehicles Listing Page
// File: src/app/vehicles/page.tsx
// =====================================================

import { supabaseAdmin } from '@/lib/supabase/admin'
import VehicleCard from '@/components/vehicles/VehicleCard'
import { Vehicle } from '@/types/database'

export const revalidate = 60

async function getVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching vehicles:', error)
    return []
  }

  return data || []
}

export default async function VehiclesPage() {
  const vehicles = await getVehicles()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Available Vehicles
        </h1>
        <p className="text-gray-600">
          Find your perfect rental vehicle
        </p>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No vehicles available at the moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}
    </div>
  )
}