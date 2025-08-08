'use client'

import React, { useEffect, useState, useRef, memo } from 'react'
import { MapPin } from 'lucide-react'

interface SimpleLocationMapProps {
  zipCode: string
  className?: string
}

// Import Leaflet dynamically to avoid SSR issues
const loadLeaflet = async () => {
  if (typeof window === 'undefined') return null
  
  // Load Leaflet CSS if not already loaded
  if (!document.querySelector('link[href*="leaflet.css"]')) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    link.crossOrigin = ''
    document.head.appendChild(link)
  }
  
  // Import Leaflet
  const L = await import('leaflet')
  
  // Fix default icons issue in Leaflet
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
  
  return L
}

const InteractiveMap = memo(function InteractiveMap({ zipCode }: { zipCode: string }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const isInitializingRef = useRef(false)
  const currentZipCodeRef = useRef<string>('')
  const mapId = `map-${zipCode.replace(/\D/g, '')}`
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Geocode the zip code only when it changes
  useEffect(() => {
    const fetchCoordinates = async () => {
      // Skip if same zip code
      if (currentZipCodeRef.current === zipCode) return
      
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/geocode?zipCode=${encodeURIComponent(zipCode)}`)
        
        if (!response.ok) {
          throw new Error('Failed to geocode zip code')
        }
        
        const data = await response.json()
        setCoordinates({ lat: data.lat, lng: data.lng })
        currentZipCodeRef.current = zipCode
      } catch (err) {
        console.error('Geocoding error:', err)
        setError('Unable to locate zip code')
      } finally {
        setLoading(false)
      }
    }

    if (zipCode && zipCode !== currentZipCodeRef.current) {
      fetchCoordinates()
    }
  }, [zipCode])

  // Initialize map when coordinates are available
  useEffect(() => {
    if (!coordinates || !mapRef.current) return

    // Skip if already initializing, or if map exists for this zip code
    if (isInitializingRef.current) return
    
    // If map exists and is for the same zip code, just return
    if (mapInstanceRef.current && currentZipCodeRef.current === zipCode) return

    const initMap = async () => {
      try {
        isInitializingRef.current = true
        const L = await loadLeaflet()
        if (!L) {
          isInitializingRef.current = false
          return
        }

        // Thorough cleanup of existing map
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.off()
            mapInstanceRef.current.remove()
          } catch (e) {
            console.warn('Error during map cleanup:', e)
          }
          mapInstanceRef.current = null
        }

        // Clear and reset container
        if (mapRef.current) {
          mapRef.current.innerHTML = ''
          // Remove any Leaflet-related classes
          mapRef.current.className = 'w-full h-full'
        }

        // Wait for cleanup and DOM updates
        await new Promise(resolve => setTimeout(resolve, 200))

        // Final safety check
        if (!mapRef.current || !isInitializingRef.current) {
          console.log('Map initialization cancelled')
          return
        }

        console.log('Creating map with coordinates:', coordinates)

        // Create map with error handling
        const map = L.map(mapRef.current, {
          center: [coordinates.lat, coordinates.lng],
          zoom: 11,
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
        })

        mapInstanceRef.current = map

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map)

        // Create custom marker
        const customIcon = L.divIcon({
          html: `
            <div style="
              width: 24px; 
              height: 24px; 
              background-color: #dc2626; 
              border: 3px solid white; 
              border-radius: 50%; 
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
              position: relative;
            ">
              <div style="
                position: absolute;
                top: -8px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-bottom: 8px solid #dc2626;
              "></div>
            </div>
          `,
          className: 'custom-marker',
          iconSize: [24, 32],
          iconAnchor: [12, 32],
          popupAnchor: [0, -32]
        })

        // Add marker
        const marker = L.marker([coordinates.lat, coordinates.lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(`
            <div style="text-align: center; font-family: system-ui; min-width: 120px;">
              <div style="font-size: 16px; font-weight: 600; color: #dc2626; margin-bottom: 4px;">
                📍 ${zipCode}
              </div>
              <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                ${coordinates.lat.toFixed(4)}°, ${coordinates.lng.toFixed(4)}°
              </div>
              <div style="font-size: 11px; color: #059669; font-weight: 500;">
                🏠 Pickup & Delivery Zone
              </div>
            </div>
          `)

        // Add 5-mile radius circle
        const radiusInMeters = 5 * 1609.34 // 5 miles in meters
        const radiusCircle = L.circle([coordinates.lat, coordinates.lng], {
          radius: radiusInMeters,
          fillColor: '#dc2626',
          color: '#dc2626',
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.1,
        }).addTo(map)

        // Add radius info popup to circle
        radiusCircle.bindPopup(`
          <div style="text-align: center; font-family: system-ui;">
            <div style="font-size: 14px; font-weight: 600; color: #dc2626; margin-bottom: 4px;">
              🎯 Service Area
            </div>
            <div style="font-size: 12px; color: #666;">
              5-mile radius from ${zipCode}
            </div>
          </div>
        `)

        // Fit map to show the circle
        map.fitBounds(radiusCircle.getBounds(), { padding: [20, 20] })

        // Force map to resize properly
        setTimeout(() => {
          map.invalidateSize()
        }, 100)

        console.log('Map initialized successfully with radius')

      } catch (error) {
        console.error('Error initializing map:', error)
        setError('Failed to load map')
      } finally {
        isInitializingRef.current = false
      }
    }

    initMap()

    // Cleanup function
    return () => {
      isInitializingRef.current = false
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off()
          mapInstanceRef.current.remove()
        } catch (e) {
          console.warn('Error during cleanup:', e)
        }
        mapInstanceRef.current = null
      }
    }
  }, [coordinates?.lat, coordinates?.lng, zipCode])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isInitializingRef.current = false
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off()
          mapInstanceRef.current.remove()
        } catch (e) {
          console.warn('Error during cleanup:', e)
        }
        mapInstanceRef.current = null
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center border">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">Loading map...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-64 bg-red-50 rounded-lg flex items-center justify-center border border-red-200">
        <div className="text-center">
          <MapPin className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <div className="text-sm font-medium text-red-700">{error}</div>
          <div className="text-xs text-red-600 mt-1">Please try a different zip code</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-300 shadow-sm">
      <div ref={mapRef} id={mapId} className="w-full h-full" />
    </div>
  )
})

export const SimpleLocationMap = memo(function SimpleLocationMap({ zipCode, className = '' }: SimpleLocationMapProps) {
  return (
    <div className={className}>
      <InteractiveMap zipCode={zipCode} />
    </div>
  )
})