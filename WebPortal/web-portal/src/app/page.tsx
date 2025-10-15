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
              Manage Your Rentals & Fleet Effortlessly
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              Book premium properties and vehicles with ease. Professional management, seamless experience.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/properties">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                  <Building2 className="w-5 h-5 mr-2" />
                  Browse Properties
                </Button>
              </Link>
              <Link href="/vehicles">
                <Button size="lg" variant="outline" className="text-white border-white hover:bg-blue-700">
                  <Car className="w-5 h-5 mr-2" />
                  View Vehicles
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Secure & Trusted</h3>
                <p className="text-gray-600">
                  All bookings are protected with secure payment processing and verified listings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">24/7 Support</h3>
                <p className="text-gray-600">
                  Round-the-clock customer support for any issues or questions you may have
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Best Prices</h3>
                <p className="text-gray-600">
                  Competitive rates with no hidden fees. What you see is what you pay
                </p>
              </CardContent>
            </Card>
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

      {/* CTA Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Create an account today and start booking premium properties and vehicles
          </p>
          <Link href="/login">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              Sign Up Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}









