import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/src/lib/supabase'
import { ratelimit, withRateLimit } from '@/src/lib/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ negotiationId: string }> }
) {
  return withRateLimit(request, ratelimit.api, async () => {
    try {
      const supabase = createSupabaseServerClient()
      const { negotiationId: negotiationIdStr } = await params
      const negotiationId = parseInt(negotiationIdStr)

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
        .select('*, items:item_id(*)')
        .eq('id', negotiationId)
        .single()

      if (negotiationError || !negotiation) {
        return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 })
      }

      // Only buyer can accept seller counter offers
      if (negotiation.buyer_id !== user.id) {
        return NextResponse.json({ error: 'Only the buyer can accept seller counter offers' }, { status: 403 })
      }

      if (negotiation.status !== 'active') {
        return NextResponse.json({ error: 'Negotiation is not active' }, { status: 400 })
      }

      // Get the latest seller counter offer
      const { data: latestOffer, error: offerError } = await supabase
        .from('offers')
        .select('*')
        .eq('negotiation_id', negotiationId)
        .eq('offer_type', 'seller')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (offerError || !latestOffer) {
        return NextResponse.json({ error: 'No seller counter offer found to accept' }, { status: 400 })
      }

      if (!latestOffer.is_counter_offer) {
        return NextResponse.json({ error: 'Latest seller offer is not a counter offer' }, { status: 400 })
      }

      // Update negotiation status to completed
      const { error: updateError } = await supabase
        .from('negotiations')
        .update({
          status: 'completed',
          final_price: latestOffer.price,
          completed_at: new Date().toISOString()
        })
        .eq('id', negotiationId)

      if (updateError) {
        console.error('Error updating negotiation:', updateError)
        return NextResponse.json({ error: 'Failed to accept counter offer' }, { status: 500 })
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
        message: 'Counter offer accepted successfully',
        final_price: latestOffer.price,
        negotiation_id: negotiationId
      })
    } catch (error) {
      console.error('Buyer accept counter offer error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}