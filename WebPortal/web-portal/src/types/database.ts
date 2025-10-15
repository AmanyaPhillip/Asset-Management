export type Property = {
  id: string
  title: string
  description: string | null
  address: string
  city: string
  state: string | null
  zip_code: string | null
  property_type: 'apartment' | 'house' | 'condo' | 'villa' | 'studio'
  bedrooms: number | null
  bathrooms: number | null
  max_guests: number | null
  price_per_night: number
  cleaning_fee: number
  amenities: string[]
  images: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Vehicle = {
  id: string
  make: string
  model: string
  year: number
  vehicle_type: 'car' | 'suv' | 'truck' | 'van' | 'motorcycle' | 'luxury'
  license_plate: string
  color: string | null
  price_per_day: number
  seats: number | null
  transmission: 'automatic' | 'manual' | null
  fuel_type: 'gasoline' | 'diesel' | 'electric' | 'hybrid' | null
  features: string[]
  images: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Booking = {
  id: string
  user_id: string
  property_id: string | null
  vehicle_id: string | null
  booking_type: 'property' | 'vehicle'
  start_date: string
  end_date: string
  total_amount: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  guest_name: string
  guest_email: string
  guest_phone: string | null
  special_requests: string | null
  created_at: string
}

export type DamageReport = {
  id: string
  booking_id: string | null
  reported_by: string
  asset_type: 'property' | 'vehicle'
  property_id: string | null
  vehicle_id: string | null
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'new' | 'in_progress' | 'resolved' | 'closed'
  images: string[]
  created_at: string
}