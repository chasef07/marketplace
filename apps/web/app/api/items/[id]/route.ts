import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createSupabaseServerClient()
    const resolvedParams = await params
    const id = parseInt(resolvedParams.id)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
    }

    // Increment views count (handle gracefully if function doesn't exist)
    try {
      await supabase.rpc('increment_views', { item_id: id })
    } catch (viewError) {
      console.warn('Views increment failed (function may not exist):', viewError)
      // Continue without failing - views are nice to have but not critical
    }

    const { data: item, error } = await supabase
      .from('items')
      .select(`
        *,
        seller:profiles!seller_id (
          id,
          username,
          email,
          zip_code
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching item:', error)
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const response = NextResponse.json(item)
    response.headers.set('Cache-Control', 'public, max-age=600, s-maxage=3600')
    return response
  } catch (error) {
    console.error('Item fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createSupabaseServerClient()
    const resolvedParams = await params
    const id = parseInt(resolvedParams.id)
    const body = await request.json()

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
    }

    // Get the Authorization header from the client request
    const authHeader = request.headers.get('authorization')
    
    let user = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Use the access token from the header
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

    // Check if user owns the item
    const { data: existingItem } = await supabase
      .from('items')
      .select('seller_id')
      .eq('id', id)
      .single()

    if (!existingItem || existingItem.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only allow editing specific fields - exclude created_at, sold_at, views_count, etc.
    const allowedUpdates: Partial<{
      description: string;
      condition: string;
      starting_price: number;
      item_status: 'draft' | 'pending_review' | 'active' | 'under_negotiation' | 'sold_pending' | 'sold' | 'paused' | 'archived' | 'flagged' | 'removed';
    }> = {}
    if (body.description !== undefined) allowedUpdates.description = body.description
    if (body.condition !== undefined) allowedUpdates.condition = body.condition
    if (body.starting_price !== undefined) allowedUpdates.starting_price = body.starting_price
    if (body.item_status !== undefined) allowedUpdates.item_status = body.item_status

    const { data: item, error } = await supabase
      .from('items')
      .update(allowedUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating item:', error)
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('Item update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createSupabaseServerClient()
    const resolvedParams = await params
    const id = parseInt(resolvedParams.id)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
    }

    // Get the Authorization header from the client request
    const authHeader = request.headers.get('authorization')
    
    let user = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Use the access token from the header
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

    // Check if user owns the item and get item details
    const { data: existingItem } = await supabase
      .from('items')
      .select('seller_id, item_status')
      .eq('id', id)
      .single()

    if (!existingItem || existingItem.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all negotiations for this item to cascade delete
    const { data: negotiations } = await supabase
      .from('negotiations')
      .select('id')
      .eq('item_id', id)

    // Delete all offers for all negotiations of this item
    if (negotiations && negotiations.length > 0) {
      const negotiationIds = negotiations.map(n => n.id)
      
      const { error: offersError } = await supabase
        .from('offers')
        .delete()
        .in('negotiation_id', negotiationIds)

      if (offersError) {
        console.error('Error deleting offers:', offersError)
        return NextResponse.json({ error: 'Failed to delete associated offers' }, { status: 500 })
      }
    }

    // Delete all negotiations for this item
    const { error: negotiationsError } = await supabase
      .from('negotiations')
      .delete()
      .eq('item_id', id)

    if (negotiationsError) {
      console.error('Error deleting negotiations:', negotiationsError)
      return NextResponse.json({ error: 'Failed to delete associated negotiations' }, { status: 500 })
    }

    // Finally delete the item
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting item:', error)
      return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Item delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}