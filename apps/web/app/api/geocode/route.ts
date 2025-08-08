import { NextRequest, NextResponse } from 'next/server'
import { ratelimit, withRateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  return withRateLimit(request, ratelimit.api, async () => {
    try {
      const { searchParams } = new URL(request.url)
      const zipCode = searchParams.get('zipCode')

      if (!zipCode) {
        return NextResponse.json({ error: 'Zip code is required' }, { status: 400 })
      }

      // Use Nominatim API for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(zipCode)}&countrycodes=us&limit=1`,
        {
          headers: {
            'User-Agent': 'FurnitureMarketplace/1.0'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch geocoding data')
      }

      const data = await response.json()
      
      if (data.length === 0) {
        return NextResponse.json({ error: 'No results found for this zip code' }, { status: 404 })
      }

      const location = data[0]
      const result = {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lon),
        display_name: location.display_name
      }

      const apiResponse = NextResponse.json(result)
      
      // Cache geocoding results for longer since zip codes don't change
      apiResponse.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400') // 1 hour client, 24 hours CDN
      
      return apiResponse

    } catch (error) {
      console.error('Geocoding error:', error)
      return NextResponse.json(
        { error: 'Failed to geocode zip code' },
        { status: 500 }
      )
    }
  })
}