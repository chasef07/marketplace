import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/src/lib/supabase'
import { ratelimit, withRateLimit } from '@/src/lib/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  return withRateLimit(request, ratelimit.api, async () => {
    try {
      const supabase = createSupabaseServerClient()
      const { offerId: offerIdStr } = await params
      const offerId = parseInt(offerIdStr)

      if (isNaN(offerId)) {
        return NextResponse.json({ error: 'Invalid offer ID' }, { status: 400 })
      }

      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Get the seller offer and verify it's a counter-offer to buyer
      const { data: offer, error: offerError } = await supabase
        .from('offers')
        .select(`
          *,
          negotiations!inner(
            id,
            status,
            seller_id,
            buyer_id,
            item_id,
            items!inner(
              id,
              name,
              starting_price,
              seller_id,
              item_status
            )
          )
        `)
        .eq('id', offerId)
        .eq('offer_type', 'seller')
        .single()

      if (offerError || !offer) {
        return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
      }

      const negotiation = offer.negotiations
      
      // Verify buyer authorization
      if (negotiation.buyer_id !== user.id) {
        return NextResponse.json({ error: 'Not authorized to accept this offer' }, { status: 403 })
      }

      // Verify negotiation is active
      if (negotiation.status !== 'active') {
        return NextResponse.json({ error: 'Negotiation is no longer active' }, { status: 400 })
      }

      // Verify item is still available
      if (negotiation.items.item_status !== 'active') {
        return NextResponse.json({ error: 'Item is no longer available' }, { status: 400 })
      }

      const finalPrice = parseFloat(offer.price as any)
      const completedAt = new Date().toISOString()

      // Complete the transaction in a single operation
      const { error: transactionError } = await supabase.rpc('complete_transaction', {
        p_negotiation_id: negotiation.id,
        p_item_id: negotiation.items.id,
        p_final_price: finalPrice,
        p_buyer_id: user.id,
        p_completed_at: completedAt
      })

      if (transactionError) {
        console.error('Transaction completion error:', transactionError)
        
        // Fallback to manual transaction completion
        await Promise.all([
          // Update negotiation
          supabase
            .from('negotiations')
            .update({
              status: 'completed',
              final_price: finalPrice,
              completed_at: completedAt
            })
            .eq('id', negotiation.id),
          
          // Update item
          supabase
            .from('items')
            .update({
              item_status: 'sold',
              final_price: finalPrice,
              buyer_id: user.id,
              sold_at: completedAt,
              status_changed_at: completedAt
            })
            .eq('id', negotiation.items.id)
        ])
      }

      return NextResponse.json({
        success: true,
        message: 'Offer accepted successfully',
        transaction: {
          negotiationId: negotiation.id,
          itemId: negotiation.items.id,
          itemName: negotiation.items.name,
          finalPrice,
          sellerUsername: negotiation.items.seller_id, // You might want to join seller profile here
          completedAt
        }
      })

    } catch (error) {
      console.error('Accept offer error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}