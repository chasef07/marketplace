import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from "@/lib/supabase-server"
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
      let { data: profile, error: profileError } = await supabase
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

      // If not found by username, try by email (for cases where email is used as username)
      if ((profileError || !profile) && username.includes('@')) {
        const { data: profileByEmail, error: emailError } = await supabase
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
          .eq('email', username)
          .eq('is_active', true)
          .single()
        
        profile = profileByEmail
        profileError = emailError
      }

      if (profileError || !profile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
      }

      // Get user's active items with negotiation data
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select(`
          id,
          name,
          description,
          furniture_type,
          starting_price,
          images,
          views_count,
          created_at,
          negotiations(
            id,
            status,
            offers(price, offer_type)
          )
        `)
        .eq('seller_id', profile.id)
        .eq('item_status', 'active')
        .order('created_at', { ascending: false })
        .limit(12)

      if (itemsError) {
        console.error('Error fetching user items:', itemsError)
      }

      // Process items to calculate highest buyer offers
      const processedItems = items?.map((item: any) => {
        const negotiations = item.negotiations || []
        const allOffers = negotiations.flatMap((n: any) => n.offers || [])
        const buyerOffers = allOffers.filter((offer: any) => offer.offer_type === 'buyer')
        
        const highestBuyerOffer = buyerOffers.length > 0 
          ? Math.max(...buyerOffers.map((offer: any) => parseFloat(offer.price)))
          : null

        // Remove negotiations data from response (only needed for calculation)
        const { negotiations: _, ...itemWithoutNegotiations } = item
        
        return {
          ...itemWithoutNegotiations,
          highest_buyer_offer: highestBuyerOffer
        }
      }) || []

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
        active_items: processedItems
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