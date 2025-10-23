import { supabaseAdmin } from '@/lib/supabase/admin'
import PropertyCard from '@/components/properties/PropertyCard'
import { Property } from '@/types/database'

export const revalidate = 60 // Revalidate every minute

async function getProperties(): Promise<Property[]> {
  const { data, error } = await supabaseAdmin
    .from('properties')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching properties:', error)
    return []
  }

  return data || []
}

export default async function PropertiesPage() {
  const properties = await getProperties()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Available Properties
        </h1>
        <p className="text-gray-600">
          Find your perfect rental property
        </p>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No properties available at the moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  )
}