import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

const supabase = createSupabaseServerClient()

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from request headers
    const authHeader = request.headers.get('Authorization')
    let user
    
    if (!authHeader) {
      // For GET requests, try to get session from cookie-based auth
      const { data: userData, error: authError } = await supabase.auth.getUser()
      if (authError || !userData.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      user = userData.user
    } else {
      // Use token from Authorization header
      const token = authHeader.replace('Bearer ', '')
      const { data: userData, error: authError } = await supabase.auth.getUser(token)
      if (authError || !userData.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      user = userData.user
    }

    // Get profile info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Get all items regardless of seller
    const { data: allItems, error: allItemsError } = await supabase
      .from('items')
      .select('id, name, seller_id, item_status')
      .limit(10)

    // Get items for this specific user
    const { data: myItems, error: myItemsError } = await supabase
      .from('items')
      .select('*')
      .eq('seller_id', user.id)

    return NextResponse.json({
      auth_user: {
        id: user.id,
        email: user.email
      },
      profile: profile,
      profile_error: profileError,
      all_items: allItems,
      my_items: myItems,
      my_items_count: myItems?.length || 0,
      all_items_error: allItemsError,
      my_items_error: myItemsError
    })

  } catch (error: unknown) {
    console.error('Debug API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Debug failed'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}