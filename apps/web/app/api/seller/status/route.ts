import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

const supabase = createSupabaseServerClient()

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from request headers
    const authHeader = request.headers.get('Authorization')
    let user
    
    if (!authHeader) {
      // For GET requests, try to get session from cookie-based auth
      const { data: userData, error: authError } = await supabase.auth.getUser()
      if (authError || !userData.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      user = userData.user
    } else {
      // Use token from Authorization header
      const token = authHeader.replace('Bearer ', '')
      const { data: userData, error: authError } = await supabase.auth.getUser(token)
      if (authError || !userData.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      user = userData.user
    }

    console.log('Getting seller status for user:', user.id)
    
    // Get seller's items (don't require negotiations to exist)
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select(`
        *,
        negotiations (
          id,
          status,
          buyer_id,
          profiles!negotiations_buyer_id_fkey (username)
        )
      `)
      .eq('seller_id', user.id)
      .eq('is_available', true)

    console.log('Items query result:', { items, error: itemsError })

    if (itemsError) {
      console.error('Failed to fetch items:', itemsError)
      return NextResponse.json({ error: `Failed to fetch items: ${itemsError.message}` }, { status: 500 })
    }

    // Get recent offers
    const { data: recentOffers, error: offersError } = await supabase
      .from('offers')
      .select(`
        *,
        negotiations!inner (
          item_id,
          items!inner (name, starting_price),
          profiles!negotiations_buyer_id_fkey (username)
        )
      `)
      .eq('negotiations.seller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (offersError) {
      console.error('Failed to fetch offers:', offersError)
      return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 })
    }

    return NextResponse.json({
      items: items || [],
      recent_offers: recentOffers || [],
      total_active_items: items?.length || 0,
      total_active_negotiations: items?.reduce((acc, item) => acc + item.negotiations.length, 0) || 0
    })

  } catch (error: any) {
    console.error('Seller status API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch seller status' },
      { status: 500 }
    )
  }
}