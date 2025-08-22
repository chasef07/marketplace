import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ratelimit, withRateLimit } from '@/lib/rate-limit'
import { offerService } from '@/src/lib/services/offer-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  return withRateLimit(request, ratelimit.api, async () => {
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

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (item.item_status !== 'active') {
      return NextResponse.json({ error: 'Item is no longer available' }, { status: 400 })
    }

    if (item.seller_id === user.id) {
      return NextResponse.json({ error: 'Cannot make offer on your own item' }, { status: 400 })
    }

    // Check for existing active negotiation
    let { data: negotiation } = await supabase
      .from('negotiations')
      .select('*')
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

    // Use unified offer service
    const result = await offerService.createOffer({
      negotiationId: negotiation.id,
      offerType: 'buyer',
      price: body.price,
      message: body.message || '',
      isCounterOffer: false,
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
      console.error('Create offer error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}