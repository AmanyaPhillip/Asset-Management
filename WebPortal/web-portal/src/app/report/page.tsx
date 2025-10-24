// =====================================================
// UPDATED: Damage Report Form Page with Suspense
// File: src/app/report/page.tsx
// =====================================================

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Upload, X, Loader2 } from 'lucide-react'
import Image from 'next/image'

function ReportPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  const bookingId = searchParams.get('booking')

  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user && bookingId) {
      fetchBooking()
    }
  }, [user, authLoading, bookingId, router])

  const fetchBooking = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        properties (id, title),
        vehicles (id, make, model)
      `)
      .eq('id', bookingId)
      .eq('user_id', user!.id)
      .single()

    if (error) {
      console.error('Error fetching booking:', error)
      setError('Booking not found')
    } else {
      setBooking(data)
    }
    setLoading(false)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + images.length > 5) {
      setError('Maximum 5 images allowed')
      return
    }

    setImages([...images, ...files])

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = []

    for (const image of images) {
      const fileExt = image.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const filePath = `${user!.id}/${fileName}`

      const { error: uploadError, data } = await supabase.storage
        .from('damage-reports')
        .upload(filePath, image)

      if (uploadError) {
        throw uploadError
      }

      const { data: urlData } = supabase.storage
        .from('damage-reports')
        .getPublicUrl(filePath)

      uploadedUrls.push(urlData.publicUrl)
    }

    return uploadedUrls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      if (!title || !description) {
        throw new Error('Please fill in all required fields')
      }

      // Upload images
      const imageUrls = images.length > 0 ? await uploadImages() : []

      // Create damage report
      const { error: reportError } = await supabase
        .from('damage_reports')
        .insert({
          booking_id: bookingId,
          reported_by: user!.id,
          asset_type: booking.booking_type,
          property_id: booking.property_id,
          vehicle_id: booking.vehicle_id,
          title,
          description,
          severity,
          images: imageUrls,
          status: 'new',
        })

      if (reportError) throw reportError

      // Create notification for managers
      const { data: managers } = await supabase
        .from('users')
        .select('id')
        .in('role', ['manager', 'admin'])

      if (managers) {
        const notifications = managers.map((manager) => ({
          user_id: manager.id,
          title: 'New Damage Report',
          message: `User ${user?.id} reported: ${title}`,
          type: 'damage_report',
        }))

        await supabase.from('notifications').insert(notifications)
      }

      setSuccess(true)
      setTimeout(() => router.push('/bookings'), 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Booking Not Found</h1>
        <p className="text-gray-600 mb-6">
          The booking you're trying to report on doesn't exist or you don't have access to it.
        </p>
        <Button onClick={() => router.push('/bookings')}>
          View My Bookings
        </Button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Report Submitted</h1>
        <p className="text-gray-600">
          Your damage report has been submitted successfully. A manager will review it shortly.
        </p>
      </div>
    )
  }

  const asset = booking.booking_type === 'property' 
    ? booking.properties 
    : booking.vehicles

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Report an Issue</h1>
        <p className="text-gray-600">
          Report damage or issues with your booking
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium">
            {booking.booking_type === 'property'
              ? asset.title
              : `${asset.make} ${asset.model}`}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Booking ID: {booking.id}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title">Issue Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Broken window, scratch on door..."
                required
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide details about the issue..."
                rows={5}
                required
              />
            </div>

            {/* Severity */}
            <div>
              <Label htmlFor="severity">Severity *</Label>
              <Select value={severity} onValueChange={(value: any) => setSeverity(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Minor cosmetic issue</SelectItem>
                  <SelectItem value="medium">Medium - Noticeable damage</SelectItem>
                  <SelectItem value="high">High - Significant damage</SelectItem>
                  <SelectItem value="critical">Critical - Safety concern</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Image Upload */}
            <div>
              <Label>Photos (Optional, max 5)</Label>
              <div className="mt-2">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      Click to upload images
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    disabled={images.length >= 5}
                  />
                </label>
              </div>

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <Image
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        width={200}
                        height={200}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/bookings')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <ReportPageContent />
    </Suspense>
  )
}