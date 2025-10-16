// =====================================================
// PART 1: Homepage
// File: src/app/page.tsx
// =====================================================

import { supabaseAdmin } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import Image from 'next/image'
import { Building2, Car, Shield, Clock, DollarSign, Star } from 'lucide-react'
import PropertyCard from '@/components/properties/PropertyCard'
import VehicleCard from '@/components/vehicles/VehicleCard'

async function getFeaturedAssets() {
  const [properties, vehicles] = await Promise.all([
    supabaseAdmin
      .from('properties')
      .select('*')
      .eq('is_active', true)
      .limit(3),
    supabaseAdmin
      .from('vehicles')
      .select('*')
      .eq('is_active', true)
      .limit(3),
  ])

  return {
    properties: properties.data || [],
    vehicles: vehicles.data || [],
  }
}

export default async function HomePage() {
  const { properties, vehicles } = await getFeaturedAssets()

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold mb-6">
              Find Your Perfect Rental
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              Pick a product, Find its availability , Secure your booking , its seemless like that.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/properties">
                <Button size="lg" variant="outline" className="text-blue-600 border-white hover:bg-blue-700">
                  <Building2 className="w-5 h-5 mr-2" />
                  Browse Properties
                </Button>
              </Link>
              <Link href="/vehicles">
                <Button size="lg" variant="outline" className="text-blue-600 border-white hover:bg-blue-700">
                  <Car className="w-5 h-5 mr-2" />
                  View Vehicles
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      

      {/* Featured Properties */}
      {properties.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Featured Properties</h2>
              <Link href="/properties">
                <Button variant="outline">View All</Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Vehicles */}
      {vehicles.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Featured Vehicles</h2>
              <Link href="/vehicles">
                <Button variant="outline">View All</Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {vehicles.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          </div>
        </section>
      )}

    
    </div>
  )
}









