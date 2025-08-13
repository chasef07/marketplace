import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ratelimit, withRateLimit } from '@/lib/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  return withRateLimit(request, ratelimit.api, async () => {
    try {
      const supabase = createSupabaseServerClient()
      const { username } = await params

      // Get profile by username - using safe column selection
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          email,
          zip_code,
          created_at,
          last_login,
          is_active
        `)
        .eq('username', username)
        .eq('is_active', true)
        .single()

      if (profileError || !profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
      }

      // Get user's active items
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select(`
          id,
          name,
          description,
          furniture_type,
          starting_price,
          condition,
          image_filename,
          images,
          views_count,
          created_at
        `)
        .eq('seller_id', profile.id)
        .eq('item_status', 'active')
        .order('created_at', { ascending: false })
        .limit(12)

      if (itemsError) {
        console.error('Error fetching user items:', itemsError)
      }

      // Build profile response with existing fields
      const profileResponse = {
        id: profile.id,
        username: profile.username,
        display_name: profile.username, // Use username as display name
        bio: null, // No bio available - personality fields removed
        profile_picture_filename: null,
        location: {
          city: null,
          state: null,
          zip_code: profile.zip_code
        },
        is_verified: false,
        stats: {
          total_sales: 0,
          total_purchases: 0,
          rating_average: 0,
          rating_count: 0
        },
        member_since: profile.created_at,
        last_active: profile.last_login,
        active_items: items || []
      }

      const response = NextResponse.json(profileResponse)
      response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600') // 5 min client, 10 min CDN
      return response

    } catch (error) {
      console.error('Profile fetch error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}