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

    return NextResponse.json(item)
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

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const { data: item, error } = await supabase
      .from('items')
      .update({
        name: body.name,
        description: body.description,
        starting_price: body.starting_price,
        condition: body.condition,
        is_available: body.is_available,
      })
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