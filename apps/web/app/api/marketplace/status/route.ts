import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

const supabase = createSupabaseServerClient()

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from request header
    const authHeader = request.headers.get('authorization')
    let user = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
      if (!tokenError && tokenUser) {
        user = tokenUser
      }
    }
    
    if (!user) {
      // Fallback to session-based auth
      const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !sessionUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      user = sessionUser
    }

    // Get active negotiations with details using enhanced view
    const { data: negotiations, error } = await supabase
      .from('negotiations_enhanced')
      .select(`
        id,
        current_offer,
        status,
        created_at,
        item_id
      `)
      .eq('seller_id', user.id)
      .eq('status', 'active')
      .order('current_offer', { ascending: false })

    // Enrich with item and buyer data
    const enrichedNegotiations = await Promise.all(
      (negotiations || []).map(async (neg) => {
        const [itemResult, buyerResult] = await Promise.all([
          supabase.from('items').select('id, name, starting_price').eq('id', neg.item_id!).single(),
          supabase.from('negotiations').select('profiles!buyer_id(username, email)').eq('id', neg.id!).single()
        ])
        
        return {
          ...neg,
          items: itemResult.data ? [itemResult.data] : [],
          profiles: buyerResult.data?.profiles ? [buyerResult.data.profiles] : []
        }
      })
    )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get seller's items
    const { data: items } = await supabase
      .from('items')
      .select('id, name, starting_price, created_at')
      .eq('seller_id', user.id)
      .eq('is_available', true)

    return NextResponse.json({
      negotiations: enrichedNegotiations || [],
      items: items || [],
      summary: `${enrichedNegotiations?.length || 0} active offers`
    })

  } catch (error: any) {
    console.error('Status API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get status' },
      { status: 500 }
    )
  }
}