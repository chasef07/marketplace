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

    // Get negotiation details
    const { data: negotiation, error: negotiationError } = await supabase
      .from('negotiations')
      .select('*')
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

    if (negotiation.round_number >= negotiation.max_rounds) {
      return NextResponse.json({ error: 'Maximum rounds reached' }, { status: 400 })
    }

    const newRoundNumber = negotiation.round_number + 1
    const offerType = negotiation.seller_id === user.id ? 'seller' : 'buyer'

    // Update negotiation
    const { error: updateError } = await supabase
      .from('negotiations')
      .update({
        current_offer: body.price,
        round_number: newRoundNumber
      })
      .eq('id', negotiationId)

    if (updateError) {
      console.error('Error updating negotiation:', updateError)
      return NextResponse.json({ error: 'Failed to create counter offer' }, { status: 500 })
    }

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