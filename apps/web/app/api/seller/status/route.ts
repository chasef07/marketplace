import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { requireAuth } from '@/lib/auth-helpers'

const supabase = createSupabaseServerClient()

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { user } = await requireAuth(request)

    
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
      .eq('seller_id', user?.id || 'unknown')
      .eq('item_status', 'active')


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
      .eq('negotiations.seller_id', user?.id || 'unknown')
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

  } catch (error: unknown) {
    console.error('Seller status API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch seller status'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}