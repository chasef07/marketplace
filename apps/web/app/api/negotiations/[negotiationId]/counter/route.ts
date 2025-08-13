import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ratelimit, withRateLimit } from '@/lib/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ negotiationId: string }> }
) {
  return withRateLimit(request, ratelimit.api, async () => {
    try {
    const supabase = createSupabaseServerClient()
    const { negotiationId: negotiationIdStr } = await params
    const negotiationId = parseInt(negotiationIdStr)
    const body = await request.json()

    if (isNaN(negotiationId)) {
      return NextResponse.json({ error: 'Invalid negotiation ID' }, { status: 400 })
    }

    // Get user from Authorization header
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
      // Fall back to session-based authentication  
      const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !sessionUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      user = sessionUser
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
      return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 })
    }

    // Check if user is part of the negotiation
    if (negotiation.seller_id !== user.id && negotiation.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized for this negotiation' }, { status: 403 })
    }

    if (negotiation.status !== 'active') {
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
    
    if (roundNumber >= (negotiation.max_rounds || 10)) {
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
      console.error('Error creating counter offer:', offerError)
      return NextResponse.json({ error: 'Failed to create counter offer' }, { status: 500 })
    }

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