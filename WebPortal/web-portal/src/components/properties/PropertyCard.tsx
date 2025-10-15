import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bed, Bath, Users } from 'lucide-react'
import { Property } from '@/types/database'

export default function PropertyCard({ property }: { property: Property }) {
  const imageUrl = property.images[0] || '/placeholder-property.jpg'

  return (
    <Link href={`/property/${property.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative h-48">
          <Image
            src={imageUrl}
            alt={property.title}
            fill
            className="object-cover"
          />
          <Badge className="absolute top-2 right-2 bg-blue-600">
            {property.property_type}
          </Badge>
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2 truncate">
            {property.title}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {property.city}, {property.state}
          </p>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            {property.bedrooms && (
              <div className="flex items-center">
                <Bed className="w-4 h-4 mr-1" />
                <span>{property.bedrooms}</span>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center">
                <Bath className="w-4 h-4 mr-1" />
                <span>{property.bathrooms}</span>
              </div>
            )}
            {property.max_guests && (
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                <span>{property.max_guests}</span>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="p-4 pt-0">
          <div className="flex justify-between items-center w-full">
            <span className="text-2xl font-bold text-blue-600">
              ${property.price_per_night}
            </span>
            <span className="text-sm text-gray-500">per night</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}