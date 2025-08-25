'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { ImageData } from '@/src/lib/api-client-new'
import { BLUR_PLACEHOLDERS } from '@/lib/blur-data'

interface ImageCarouselProps {
  images: (string | ImageData)[]
  alt?: string
  className?: string
  showDots?: boolean
  showArrows?: boolean
}

export function ImageCarousel({ 
  images, 
  alt = "Image", 
  className = "", 
  showDots = true, 
  showArrows = true 
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  
  if (!images || images.length === 0) {
    return (
      <div className={`aspect-ratio-4-3 bg-gray-200 flex items-center justify-center rounded-lg ${className}`}>
        <span className="text-gray-500">No images available</span>
      </div>
    )
  }

  // Convert images to URL strings
  const imageUrls = images.map(img => {
    if (typeof img === 'string') {
      return img
    }
    // If it's an ImageData object, construct the Supabase storage URL
    return `/api/images/${img.filename}`
  })

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % imageUrls.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length)
  }

  return (
    <div className={`image-carousel relative ${className}`}>
      <div className="aspect-ratio-4-3 relative overflow-hidden rounded-lg">
        <Image 
          src={imageUrls[currentIndex]}
          alt={`${alt} ${currentIndex + 1}`}
          fill
          className="object-cover transition-opacity duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={currentIndex === 0}
          placeholder="blur"
          blurDataURL={BLUR_PLACEHOLDERS.furniture}
          quality={85}
        />
        
        {/* Navigation arrows - only show if more than 1 image and showArrows is true */}
        {imageUrls.length > 1 && showArrows && (
          <>
            <button 
              className="nav-arrow nav-arrow-left"
              onClick={prevImage}
              type="button"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              className="nav-arrow nav-arrow-right"
              onClick={nextImage}
              type="button"
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
        
        {/* Image counter overlay */}
        {imageUrls.length > 1 && (
          <div className="image-counter">
            {currentIndex + 1} / {imageUrls.length}
          </div>
        )}
      </div>
      
      {/* Image dots indicator - only show if more than 1 image and showDots is true */}
      {imageUrls.length > 1 && showDots && (
        <div className="image-dots">
          {imageUrls.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
              type="button"
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .image-carousel {
          position: relative;
        }

        .aspect-ratio-4-3 {
          aspect-ratio: 4/3;
        }

        .nav-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.5);
          color: white;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 2;
          transition: all 0.2s ease;
        }

        .nav-arrow:hover {
          background: rgba(0, 0, 0, 0.7);
          transform: translateY(-50%) scale(1.1);
        }

        .nav-arrow-left {
          left: 10px;
        }

        .nav-arrow-right {
          right: 10px;
        }

        .image-counter {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          z-index: 2;
        }

        .image-dots {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: none;
          background: rgba(139, 69, 19, 0.3);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dot:hover {
          background: rgba(139, 69, 19, 0.6);
        }

        .dot.active {
          background: #8B4513;
        }
      `}</style>
    </div>
  )
}