import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ratelimit, withRateLimit } from '@/lib/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ negotiationId: string }> }
) {
  return withRateLimit(request, ratelimit.api, async () => {
    try {
    console.log('🔧 Counter API started - negotiationId from params')
    const supabase = createSupabaseServerClient()
    const { negotiationId: negotiationIdStr } = await params
    const negotiationId = parseInt(negotiationIdStr)
    const body = await request.json()
    
    console.log('🔧 Counter API - Parsed data:', { negotiationId, body })

    if (isNaN(negotiationId)) {
      return NextResponse.json({ error: 'Invalid negotiation ID' }, { status: 400 })
    }

    // Get user from Authorization header
    const authHeader = request.headers.get('authorization')
    console.log('🔧 Counter API - Auth header present:', !!authHeader)
    let user = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      console.log('🔧 Counter API - Token length:', token.length)
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
      
      if (!tokenError && tokenUser) {
        user = tokenUser
        console.log('🔧 Counter API - User from token:', user.id)
      } else {
        console.log('🔧 Counter API - Token auth error:', tokenError)
      }
    }
    
    if (!user) {
      console.log('🔧 Counter API - Falling back to session auth')
      // Fall back to session-based authentication  
      const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !sessionUser) {
        console.log('🔧 Counter API - Session auth failed:', authError)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      user = sessionUser
      console.log('🔧 Counter API - User from session:', user.id)
    }

    // Get negotiation details with item info
    const { data: negotiation, error: negotiationError } = await supabase
      .from('negotiations')
      .select(`
        *,
        items!inner(starting_price)
      `)
      .eq('id', negotiationId)
      .single()

    if (negotiationError || !negotiation) {
      console.log('🔧 Counter API - Negotiation not found:', negotiationError)
      return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 })
    }

    console.log('🔧 Counter API - Found negotiation:', { 
      id: negotiation.id, 
      seller_id: negotiation.seller_id, 
      buyer_id: negotiation.buyer_id,
      status: negotiation.status,
      current_user: user.id
    })

    // Check if user is part of the negotiation
    if (negotiation.seller_id !== user.id && negotiation.buyer_id !== user.id) {
      console.log('🔧 Counter API - User not authorized for negotiation')
      return NextResponse.json({ error: 'Not authorized for this negotiation' }, { status: 403 })
    }

    if (negotiation.status !== 'active') {
      console.log('🔧 Counter API - Negotiation not active:', negotiation.status)
      return NextResponse.json({ error: 'Negotiation is not active' }, { status: 400 })
    }

    // Check if negotiation has expired
    if (negotiation.expires_at && new Date(negotiation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Negotiation has expired' }, { status: 400 })
    }

    // Get current round number and check limits
    const { data: currentRound } = await supabase
      .rpc('get_round_count', { neg_id: negotiationId })
    
    const roundNumber = (currentRound as number) || 0
    
    if (roundNumber >= 10) { // Default max rounds
      return NextResponse.json({ error: 'Maximum rounds reached' }, { status: 400 })
    }

    // Check turn-based logic - get latest offer to see whose turn it is
    const { data: latestOffer } = await supabase
      .from('offers')
      .select('*')
      .eq('negotiation_id', negotiationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const offerType = negotiation.seller_id === user.id ? 'seller' : 'buyer'

    // Validate it's this user's turn to make an offer
    if (latestOffer) {
      if (latestOffer.offer_type === offerType) {
        return NextResponse.json({ 
          error: 'Not your turn - the other party needs to respond to your last offer first' 
        }, { status: 400 })
      }
    }

    // Business rules validation
    const startingPrice = negotiation.items?.starting_price || 0
    
    if (offerType === 'seller') {
      // Seller validation rules
      if (body.price > startingPrice * 1.25) {
        return NextResponse.json({ 
          error: `Counter offer too high - cannot exceed 25% above starting price ($${startingPrice})` 
        }, { status: 400 })
      }
      
      if (body.price < startingPrice * 0.3) {
        return NextResponse.json({ 
          error: `Counter offer too low - seems unreasonable for this item` 
        }, { status: 400 })
      }
    } else {
      // Buyer validation rules
      if (body.price > startingPrice * 1.1) {
        return NextResponse.json({ 
          error: `Counter offer above asking price - consider accepting the listed price instead` 
        }, { status: 400 })
      }
    }

    const newRoundNumber = roundNumber + 1

    // No need to update negotiation table - the helper functions handle current offer calculation


    console.log('🔧 Counter API - Creating offer with data:', {
      negotiation_id: negotiationId,
      offer_type: offerType,
      price: body.price,
      message: body.message || '',
      round_number: newRoundNumber,
      is_counter_offer: true
    })

    // Create counter offer
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .insert({
        negotiation_id: negotiationId,
        offer_type: offerType,
        price: body.price,
        message: body.message || '',
        round_number: newRoundNumber,
        is_counter_offer: true
      })
      .select()
      .single()

    if (offerError) {
      console.error('🔧 Counter API - Error creating counter offer:', offerError)
      return NextResponse.json({ error: 'Failed to create counter offer' }, { status: 500 })
    }
    
    console.log('🔧 Counter API - Counter offer created successfully:', offer.id)

    // Update negotiation expiration (72 hours from now)
    const expirationTime = new Date()
    expirationTime.setHours(expirationTime.getHours() + 72)
    
    await supabase
      .from('negotiations')
      .update({ 
        expires_at: expirationTime.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', negotiationId)

    return NextResponse.json({
      message: 'Counter offer created successfully',
      offer
    })
    } catch (error) {
      console.error('Counter offer error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}