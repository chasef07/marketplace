import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ratelimit, withRateLimit } from '@/lib/rate-limit'

const supabase = createSupabaseServerClient()

// Get current status for quick actions with enhanced data
async function getStatus(sellerId: string) {
  const { data: negotiations, error } = await supabase
    .from('negotiations_enhanced')
    .select(`
      id,
      current_offer,
      status,
      item_id,
      created_at
    `)
    .eq('seller_id', sellerId)
    .eq('status', 'active')
    .order('current_offer', { ascending: false })

  if (error) throw new Error(`Failed to fetch status: ${error.message}`)

  // Get additional data for each negotiation with message previews
  const enrichedNegotiations = await Promise.all(
    (negotiations || []).map(async (neg) => {
      const [itemResult, buyerResult, recentOfferResult] = await Promise.all([
        supabase.from('items').select('name, starting_price').eq('id', neg.item_id!).single(),
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
        // Take first 4-6 words or until we hit 45 characters
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

  return { negotiations: enrichedNegotiations }
}

export async function GET(request: NextRequest) {
  return withRateLimit(request, ratelimit.api, async () => {
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
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        if (authError || !session?.user) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }
        user = session.user
      }

      const status = await getStatus(user.id)
      return NextResponse.json(status)

    } catch (error: unknown) {
      console.error('Quick actions status error:', error)
      return NextResponse.json(
        { error: (error as Error).message || 'Failed to get status' },
        { status: 500 }
      )
    }
  })
}

export async function POST(request: NextRequest) {
  return withRateLimit(request, ratelimit.api, async () => {
    try {
      const { action, negotiation_id, ...details } = await request.json()
      
      if (!action || !negotiation_id) {
        return NextResponse.json({ error: 'Action and negotiation_id required' }, { status: 400 })
      }

      // Get authenticated user from request header
      const authHeader = request.headers.get('authorization')
      let user = null
      let authToken = null
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]
        authToken = token
        const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
        if (!tokenError && tokenUser) {
          user = tokenUser
        }
      }
      
      if (!user) {
        // Fallback to session-based auth
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        if (authError || !session?.user) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }
        user = session.user
        authToken = session.access_token
      }

      // Verify negotiation belongs to user
      const { data: negotiation, error: negError } = await supabase
        .from('negotiations')
        .select('id, seller_id')
        .eq('id', negotiation_id)
        .eq('seller_id', user.id)
        .single()

      if (negError || !negotiation) {
        return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 })
      }

      // Execute action by calling existing API endpoints
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'
      
      let body = {}
      if (action === 'counter') {
        if (!details.price) {
          return NextResponse.json({ error: 'Price required for counter offers' }, { status: 400 })
        }
        body = { price: details.price, message: details.message || 'Counter offer' }
      } else if (action === 'decline') {
        body = { reason: details.reason || 'Offer declined' }
      }
      
      const response = await fetch(`${baseUrl}/api/negotiations/${negotiation_id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const error = await response.json()
        return NextResponse.json({ error: error.error || `Failed to ${action}` }, { status: response.status })
      }

      const result = await response.json()
      return NextResponse.json({
        success: true,
        action,
        negotiation_id,
        result
      })

    } catch (error: unknown) {
      console.error('Quick action error:', error)
      return NextResponse.json(
        { error: (error as Error).message || 'Action failed' },
        { status: 500 }
      )
    }
  })
}