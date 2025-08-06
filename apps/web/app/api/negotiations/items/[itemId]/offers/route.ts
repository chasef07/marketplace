import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const supabase = createSupabaseServerClient()
    const { itemId: itemIdStr } = await params
    const itemId = parseInt(itemIdStr)
    const body = await request.json()

    if (isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
    }

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get item details
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('seller_id, is_available')
      .eq('id', itemId)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (!item.is_available) {
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
          buyer_id: user.id,
          current_offer: body.price,
          round_number: 1
        })
        .select()
        .single()

      if (negotiationError) {
        console.error('Error creating negotiation:', negotiationError)
        return NextResponse.json({ error: 'Failed to create negotiation' }, { status: 500 })
      }

      negotiation = newNegotiation
    } else {
      // Update existing negotiation
      const { error: updateError } = await supabase
        .from('negotiations')
        .update({
          current_offer: body.price,
          round_number: negotiation.round_number + 1
        })
        .eq('id', negotiation.id)

      if (updateError) {
        console.error('Error updating negotiation:', updateError)
        return NextResponse.json({ error: 'Failed to update negotiation' }, { status: 500 })
      }
    }

    // Create the offer
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .insert({
        negotiation_id: negotiation.id,
        offer_type: 'buyer',
        price: body.price,
        message: body.message || '',
        round_number: negotiation.round_number
      })
      .select()
      .single()

    if (offerError) {
      console.error('Error creating offer:', offerError)
      return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 })
    }

    return NextResponse.json({
      negotiation,
      offer
    })
  } catch (error) {
    console.error('Create offer error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}