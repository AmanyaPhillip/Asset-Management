// =====================================================
// PART 2: Property Gallery Component
// File: src/components/properties/PropertyGallery.tsx
// =====================================================

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PropertyGallery({
  images,
  title,
}: {
  images: string[]
  title: string
}) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null)

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-200 rounded-xl flex items-center justify-center">
        <span className="text-gray-400">No images available</span>
      </div>
    )
  }

  const handlePrevious = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage - 1 + images.length) % images.length)
    }
  }

  const handleNext = () => {
    if (selectedImage !== null) {
      setSelectedImage((selectedImage + 1) % images.length)
    }
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-2 h-96">
        {/* Main Image */}
        <div
          className="col-span-4 md:col-span-2 relative rounded-xl overflow-hidden cursor-pointer"
          onClick={() => setSelectedImage(0)}
        >
          <Image
            src={images[0]}
            alt={`${title} - Main`}
            fill
            className="object-cover hover:opacity-90 transition-opacity"
          />
        </div>

        {/* Thumbnail Grid */}
        {images.slice(1, 5).map((image, index) => (
          <div
            key={index}
            className="relative rounded-xl overflow-hidden cursor-pointer"
            onClick={() => setSelectedImage(index + 1)}
          >
            <Image
              src={image}
              alt={`${title} - ${index + 2}`}
              fill
              className="object-cover hover:opacity-90 transition-opacity"
            />
          </div>
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={selectedImage !== null} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <div className="relative h-[600px]">
            <Image
              src={images[selectedImage!] || images[0]}
              alt={title}
              fill
              className="object-contain"
            />
            
            {/* Navigation Buttons */}
            {images.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  onClick={handleNext}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}