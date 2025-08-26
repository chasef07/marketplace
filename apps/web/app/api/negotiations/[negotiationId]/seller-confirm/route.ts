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

      // Only seller can confirm the deal
      if (negotiation.seller_id !== user.id) {
        return NextResponse.json({ error: 'Only the seller can confirm the deal' }, { status: 403 })
      }

      // Negotiation must be in buyer_accepted status
      if (negotiation.status !== 'buyer_accepted') {
        return NextResponse.json({ 
          error: 'Negotiation is not in buyer_accepted status',
          current_status: negotiation.status 
        }, { status: 400 })
      }

      // Update negotiation status to deal_pending
      const { error: updateError } = await supabase
        .from('negotiations')
        .update({
          status: 'deal_pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', negotiationId)

      if (updateError) {
        console.error('Error updating negotiation:', updateError)
        return NextResponse.json({ error: 'Failed to confirm deal' }, { status: 500 })
      }

      // Item status remains sold_pending until final completion
      // No need to update item status here as it should already be sold_pending

      return NextResponse.json({ 
        message: 'Deal confirmed successfully - awaiting pickup/payment completion',
        negotiation_id: negotiationId,
        status: 'deal_pending',
        final_price: negotiation.final_price
      })
    } catch (error) {
      console.error('Seller confirm deal error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}