import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

const supabase = createSupabaseServerClient()

export async function POST(request: NextRequest) {
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

    const { buyer_name, message, negotiation_id } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    let targetNegotiationId = negotiation_id

    // If no negotiation_id provided, find by buyer name
    if (!targetNegotiationId && buyer_name) {
      const { data: negotiations } = await supabase
        .from('negotiations')
        .select(`
          id,
          profiles!inner (username)
        `)
        .eq('seller_id', user.id)
        .eq('status', 'active')

      const negotiation = negotiations?.find(neg => 
        (neg.profiles as any)?.[0]?.username?.toLowerCase().includes(buyer_name.toLowerCase())
      )

      if (!negotiation) {
        return NextResponse.json({ error: `Buyer ${buyer_name} not found` }, { status: 404 })
      }

      targetNegotiationId = negotiation.id
    }

    if (!targetNegotiationId) {
      return NextResponse.json({ error: 'Negotiation ID or buyer name required' }, { status: 400 })
    }

    // Get negotiation details
    const { data: negotiation, error: negError } = await supabase
      .from('negotiations')
      .select(`
        id, 
        profiles!buyer_id (username)
      `)
      .eq('id', targetNegotiationId)
      .eq('seller_id', user.id)
      .single()

    if (negError || !negotiation) {
      return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 })
    }

    // Get current offer using helper function
    const { data: currentOffer } = await supabase
      .rpc('get_current_offer', { neg_id: targetNegotiationId })
    
    // Get current round number
    const { data: currentRound } = await supabase
      .rpc('get_round_count', { neg_id: targetNegotiationId })

    // Add message to offers table
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .insert({
        negotiation_id: targetNegotiationId,
        offer_type: 'seller',
        price: currentOffer || 0,
        message: message,
        round_number: (currentRound || 0) + 1,
        is_counter_offer: false
      })
      .select()
      .single()

    if (offerError) {
      return NextResponse.json({ error: offerError.message }, { status: 500 })
    }

    const buyerName = (negotiation.profiles as any)?.username || 'buyer'
    
    return NextResponse.json({ 
      success: true, 
      message: `Message sent to ${buyerName}`,
      offer_id: offer.id,
      buyer_name: buyerName
    })

  } catch (error: any) {
    console.error('Message API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}