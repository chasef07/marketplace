'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

interface LocationMapProps {
  zipCode: string
  className?: string
}

// Simple fallback component when map is loading or unavailable
function LocationFallback({ zipCode }: { zipCode: string }) {
  return (
    <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center border">
      <div className="text-center">
        <div className="relative flex items-center justify-center mb-2">
          <div 
            className="w-6 h-6 rounded-full border-2 opacity-30"
            style={{ borderColor: '#8B4513' }}
          />
          <div 
            className="absolute w-4 h-4 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            style={{ backgroundColor: '#8B4513' }}
          />
          <div 
            className="absolute w-8 h-8 rounded-full border opacity-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            style={{ borderColor: '#8B4513' }}
          />
          <div 
            className="absolute w-10 h-10 rounded-full border opacity-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            style={{ borderColor: '#8B4513' }}
          />
        </div>
        <p className="text-sm font-medium" style={{ color: '#8B4513' }}>
          {zipCode} area
        </p>
        <p className="text-xs text-gray-500">~5 mile radius</p>
      </div>
    </div>
  )
}

// Actual map component that will be dynamically loaded
function LeafletMapComponent({ zipCode }: { zipCode: string }) {
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Simple geocoding using Nominatim (free service)
  const geocodeZipCode = async (zipCode: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(zipCode)}&countrycodes=us&limit=1`
      )
      const data = await response.json()
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        }
      }
      return null
    } catch (error) {
      console.error('Geocoding error:', error)
      return null
    }
  }

  useEffect(() => {
    const fetchCoordinates = async () => {
      setLoading(true)
      setError(false)
      
      const coords = await geocodeZipCode(zipCode)
      if (coords) {
        setCoordinates(coords)
      } else {
        setError(true)
      }
      setLoading(false)
    }

    if (zipCode) {
      fetchCoordinates()
    }
  }, [zipCode])

  useEffect(() => {
    // Dynamically import Leaflet CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
    link.crossOrigin = ''
    document.head.appendChild(link)

    return () => {
      document.head.removeChild(link)
    }
  }, [])

  // Create the map using vanilla Leaflet to avoid React SSR issues
  useEffect(() => {
    if (!coordinates) return
    const initMap = async () => {
      if (typeof window === 'undefined') return

      // Dynamically import Leaflet
      const L = await import('leaflet')
      
      const mapElement = document.getElementById(`map-${zipCode.replace(/\s+/g, '')}`)
      if (!mapElement || mapElement.hasChildNodes()) return

      const map = L.map(mapElement, {
        center: [coordinates!.lat, coordinates!.lng],
        zoom: 11,
        scrollWheelZoom: false,
        dragging: false,
        zoomControl: false,
        doubleClickZoom: false,
        touchZoom: false,
        keyboard: false
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map)

      // Add radius circle
      L.circle([coordinates!.lat, coordinates!.lng], {
        color: '#8B4513',
        fillColor: '#8B4513',
        fillOpacity: 0.15,
        radius: 8047, // 5 miles in meters
        weight: 2,
        opacity: 0.8
      }).addTo(map)

      // Create custom marker
      const customIcon = L.divIcon({
        html: `
          <div style="
            width: 20px; 
            height: 20px; 
            background-color: #8B4513; 
            border: 3px solid white; 
            border-radius: 50%; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        `,
        className: 'custom-div-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })

      L.marker([coordinates!.lat, coordinates!.lng], { icon: customIcon })
        .addTo(map)
        .bindPopup(`
          <div style="text-align: center; font-family: system-ui;">
            <p style="font-weight: 600; color: #8B4513; margin: 0 0 4px 0;">
              ${zipCode} area
            </p>
            <p style="font-size: 12px; color: #666; margin: 0;">
              Pickup/Delivery Zone<br/>~5 mile radius
            </p>
          </div>
        `)
    }

    if (coordinates) {
      initMap()
    }
  }, [coordinates, zipCode])

  if (loading) {
    return (
      <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center border">
        <div className="text-sm text-gray-500">Loading map...</div>
      </div>
    )
  }

  if (error || !coordinates) {
    return <LocationFallback zipCode={zipCode} />
  }

  return (
    <div 
      id={`map-${zipCode.replace(/\s+/g, '')}`}
      className="w-full h-32 rounded-lg overflow-hidden border"
      style={{ minHeight: '128px' }}
    />
  )
}

// Dynamically import the map component to avoid SSR issues
const DynamicLeafletMap = dynamic(() => Promise.resolve(LeafletMapComponent), {
  ssr: false,
  loading: () => <LocationFallback zipCode="" />
})

export function LocationMap({ zipCode, className = '' }: LocationMapProps) {
  return (
    <div className={className}>
      <DynamicLeafletMap zipCode={zipCode} />
    </div>
  )
}