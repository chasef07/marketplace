import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ratelimit, withRateLimit } from '@/lib/rate-limit'

interface CurrentOffer {
  price: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ negotiationId: string }> }
) {
  return withRateLimit(request, ratelimit.api, async () => {
    try {
    console.log('🔧 Accept API started')
    const supabase = createSupabaseServerClient()
    const { negotiationId: negotiationIdStr } = await params
    const negotiationId = parseInt(negotiationIdStr)
    
    console.log('🔧 Accept API - negotiationId:', negotiationId)

    if (isNaN(negotiationId)) {
      return NextResponse.json({ error: 'Invalid negotiation ID' }, { status: 400 })
    }

    // Get user from Authorization header
    const authHeader = request.headers.get('authorization')
    console.log('🔧 Accept API - Auth header present:', !!authHeader)
    let user = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      console.log('🔧 Accept API - Token length:', token.length)
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
      
      if (!tokenError && tokenUser) {
        user = tokenUser
        console.log('🔧 Accept API - User from token:', user.id)
      } else {
        console.log('🔧 Accept API - Token auth error:', tokenError)
      }
    }
    
    if (!user) {
      console.log('🔧 Accept API - Falling back to session auth')
      // Fall back to session-based authentication  
      const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !sessionUser) {
        console.log('🔧 Accept API - Session auth failed:', authError)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      user = sessionUser
      console.log('🔧 Accept API - User from session:', user.id)
    }

    // Get negotiation details
    const { data: negotiation, error: negotiationError } = await supabase
      .from('negotiations')
      .select('*, items:item_id(*)')
      .eq('id', negotiationId)
      .single()

    if (negotiationError || !negotiation) {
      console.log('🔧 Accept API - Negotiation not found:', negotiationError)
      return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 })
    }

    console.log('🔧 Accept API - Found negotiation:', {
      id: negotiation.id,
      seller_id: negotiation.seller_id,
      buyer_id: negotiation.buyer_id,
      status: negotiation.status,
      current_user: user.id
    })

    // Only seller can accept offers
    if (negotiation.seller_id !== user.id) {
      console.log('🔧 Accept API - User not seller, cannot accept')
      return NextResponse.json({ error: 'Only seller can accept offers' }, { status: 403 })
    }

    if (negotiation.status !== 'active') {
      console.log('🔧 Accept API - Negotiation not active:', negotiation.status)
      return NextResponse.json({ error: 'Negotiation is not active' }, { status: 400 })
    }

    // Get current offer using helper function
    const { data: currentOffer } = await supabase
      .rpc('get_current_offer', { neg_id: negotiationId })

    // Update negotiation status
    const { error: updateError } = await supabase
      .from('negotiations')
      .update({
        status: 'completed',
        final_price: (currentOffer as unknown as CurrentOffer)?.price || 0,
        completed_at: new Date().toISOString()
      })
      .eq('id', negotiationId)

    if (updateError) {
      console.error('Error updating negotiation:', updateError)
      return NextResponse.json({ error: 'Failed to accept offer' }, { status: 500 })
    }

    // Mark item as sold
    const { error: itemUpdateError } = await supabase
      .from('items')
      .update({
        item_status: 'sold',
        sold_at: new Date().toISOString()
      })
      .eq('id', negotiation.item_id)

    if (itemUpdateError) {
      console.error('Error updating item:', itemUpdateError)
      return NextResponse.json({ error: 'Failed to mark item as sold' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Offer accepted successfully',
      final_price: currentOffer || 0
    })
    } catch (error) {
      console.error('Accept offer error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}