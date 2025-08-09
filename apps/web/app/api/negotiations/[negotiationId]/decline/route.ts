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

    // Check if user is part of the negotiation (seller can decline buyer offers)
    if (negotiation.seller_id !== user.id && negotiation.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized for this negotiation' }, { status: 403 })
    }

    if (negotiation.status !== 'active') {
      return NextResponse.json({ error: 'Negotiation is not active' }, { status: 400 })
    }

    // Update negotiation status to cancelled
    const { error: updateError } = await supabase
      .from('negotiations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', negotiationId)

    if (updateError) {
      console.error('Error updating negotiation:', updateError)
      return NextResponse.json({ error: 'Failed to decline offer' }, { status: 500 })
    }

    // Add decline message to offers table for conversation history
    const offerType = negotiation.seller_id === user.id ? 'seller' : 'buyer'
    const declineMessage = body.reason || 'Offer declined'

    const { error: offerError } = await supabase
      .from('offers')
      .insert({
        negotiation_id: negotiationId,
        offer_type: offerType,
        price: negotiation.current_offer, // Keep current price for decline
        message: declineMessage,
        round_number: negotiation.round_number + 1,
        is_counter_offer: false
      })

    if (offerError) {
      console.warn('Failed to add decline message to offers table:', offerError)
      // Don't fail the entire operation if we can't add the message
    }

    return NextResponse.json({
      message: 'Offer declined successfully',
      negotiation_id: negotiationId
    })
    } catch (error) {
      console.error('Decline offer error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}