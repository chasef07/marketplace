import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { ratelimit, withRateLimit } from '@/lib/rate-limit'
import { offerService } from '@/lib/services/offer-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  return withRateLimit(request, ratelimit.offers, async () => {
    try {
    const supabase = createSupabaseServerClient()
    const { itemId: itemIdStr } = await params
    const itemId = parseInt(itemIdStr)
    const body = await request.json()

    if (isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
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

    // Get item details
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('seller_id, item_status')
      .eq('id', itemId)
      .single()

    // Debug: Log item details
    console.log('🔍 API Debug - Item details:', {
      itemId,
      item,
      itemError,
      expectedStatus: 'active'
    })

    if (itemError || !item) {
      console.log('❌ Item not found:', { itemError, item })
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Allow offers on active items (keeping them active during negotiations)
    const allowedStatuses = ['active']
    if (!allowedStatuses.includes(item.item_status)) {
      console.log('❌ Item status check failed:', { 
        actualStatus: item.item_status, 
        allowedStatuses,
        isAllowed: allowedStatuses.includes(item.item_status)
      })
      return NextResponse.json({ error: 'Item is no longer available' }, { status: 400 })
    }

    if (item.seller_id === user.id) {
      return NextResponse.json({ error: 'Cannot make offer on your own item' }, { status: 400 })
    }

    // Check for existing active negotiation
    let { data: negotiation } = await supabase
      .from('negotiations')
      .select(`
        *,
        offers (
          id,
          offer_type,
          price,
          created_at
        )
      `)
      .eq('item_id', itemId)
      .eq('buyer_id', user.id)
      .eq('status', 'active')
      .single()

    // Create new negotiation if none exists
    if (!negotiation) {
      const { data: newNegotiation, error: negotiationError } = await supabase
        .from('negotiations')
        .insert({
          item_id: itemId,
          seller_id: item.seller_id,
          buyer_id: user.id
        })
        .select()
        .single()

      if (negotiationError) {
        console.error('Error creating negotiation:', negotiationError)
        return NextResponse.json({ error: 'Failed to create negotiation' }, { status: 500 })
      }

      negotiation = newNegotiation
    }

    // Always create new offers (including counter-offers) to ensure proper agent queuing
    // This ensures each buyer counter-offer triggers the agent processing queue

    // Check if this is a counter-offer (buyer has made previous offers)
    const existingBuyerOffers = negotiation.offers?.filter((offer: { offer_type: string }) => offer.offer_type === 'buyer') || []
    const isCounterOffer = existingBuyerOffers.length > 0

    // Use unified offer service for new offers
    const result = await offerService.createOffer({
      negotiationId: negotiation.id,
      offerType: 'buyer',
      price: body.price,
      message: body.message || '',
      isCounterOffer: isCounterOffer,
      isMessageOnly: false,
      agentGenerated: false,
      userId: user.id
    })

    if (!result.success) {
      console.error('Error creating offer:', result.error)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Note: Agent automatically queues buyer offers via database trigger
    // No manual triggering needed - the queue_offer_for_agent() function handles this

    return NextResponse.json({
      negotiation,
      offer: result.offer
    })
    } catch (error) {
      console.error('🔥 CREATE OFFER ERROR - Full Details:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        itemId: parseInt((await params).itemId),
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      })
      
      // Return more specific error message for debugging
      const errorMessage = error instanceof Error ? error.message : 'Internal server error'
      return NextResponse.json({ 
        error: errorMessage,
        debug: process.env.NODE_ENV === 'development' ? {
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        } : undefined
      }, { status: 500 })
    }
  })
}