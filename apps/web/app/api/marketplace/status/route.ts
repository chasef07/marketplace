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
        latest_offer_price,
        status,
        created_at,
        item_id
      `)
      .eq('seller_id', user.id)
      .eq('status', 'active')
      .order('latest_offer_price', { ascending: false })

    // Enrich with item, buyer data, and recent message previews
    const enrichedNegotiations = await Promise.all(
      (negotiations || []).map(async (neg) => {
        const [itemResult, buyerResult, recentOfferResult] = await Promise.all([
          supabase.from('items').select('id, name, starting_price').eq('id', neg.item_id!).single(),
          supabase.from('negotiations').select('profiles!buyer_id(username, email)').eq('id', neg.id!).single(),
          // Get the most recent offer with message from this negotiation
          supabase
            .from('offers')
            .select('message, created_at, offer_type, price')
            .eq('negotiation_id', neg.id!)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
        ])

        // Extract message preview (first few meaningful words)
        let messagePreview = null
        if (recentOfferResult.data?.message) {
          const message = recentOfferResult.data.message.trim()
          const words = message.split(' ')
          // Take first 4-6 words or until we hit 50 characters
          let preview = ''
          for (let i = 0; i < Math.min(words.length, 6); i++) {
            if (preview.length + words[i].length > 45) break
            preview += (i > 0 ? ' ' : '') + words[i]
          }
          messagePreview = preview + (words.length > 6 || message.length > 45 ? '...' : '')
        }

        // Calculate time since offer
        const timeSinceOffer = recentOfferResult.data?.created_at 
          ? Date.now() - new Date(recentOfferResult.data.created_at).getTime()
          : null
        
        const hoursAgo = timeSinceOffer ? Math.floor(timeSinceOffer / (1000 * 60 * 60)) : null
        
        return {
          ...neg,
          items: itemResult.data ? [itemResult.data] : [],
          profiles: buyerResult.data?.profiles ? [buyerResult.data.profiles] : [],
          recent_message: messagePreview,
          recent_offer_time: recentOfferResult.data?.created_at,
          hours_since_offer: hoursAgo,
          is_recent: hoursAgo !== null && hoursAgo <= 24, // Recent = within 24 hours
          buyer_offer_type: recentOfferResult.data?.offer_type
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
      .eq('item_status', 'active')

    // Generate intelligent summary with recent offer insights
    const recentOffers = enrichedNegotiations?.filter(neg => neg.is_recent) || []
    const totalOffers = enrichedNegotiations?.length || 0
    
    let intelligentSummary = ''
    if (recentOffers.length > 0) {
      const timeframe = recentOffers.some(neg => neg.hours_since_offer !== null && neg.hours_since_offer <= 1) 
        ? 'in the last hour' 
        : recentOffers.some(neg => neg.hours_since_offer !== null && neg.hours_since_offer <= 6)
        ? 'in the last 6 hours'
        : 'today'
      
      intelligentSummary = `📦 You've got ${recentOffers.length} new offer${recentOffers.length > 1 ? 's' : ''} ${timeframe}!`
    } else if (totalOffers > 0) {
      intelligentSummary = `💼 ${totalOffers} active offer${totalOffers > 1 ? 's' : ''} pending your response`
    } else {
      intelligentSummary = `📋 No active offers right now`
    }

    return NextResponse.json({
      negotiations: enrichedNegotiations || [],
      items: items || [],
      summary: intelligentSummary,
      recent_count: recentOffers.length,
      total_count: totalOffers,
      has_recent_activity: recentOffers.length > 0
    })

  } catch (error: unknown) {
    console.error('Status API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to get status'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}