import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()

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

    const { data: negotiations, error } = await supabase
      .from('negotiations')
      .select(`
        *,
        items:item_id (
          id,
          name,
          starting_price,
          images
        ),
        seller:seller_id (
          id,
          username,
          email
        ),
        buyer:buyer_id (
          id,
          username,
          email
        ),
        offers (
          id,
          price,
          message,
          offer_type,
          created_at
        )
      `)
      .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching negotiations:', error)
      return NextResponse.json({ error: 'Failed to fetch negotiations' }, { status: 500 })
    }

    const response = NextResponse.json(negotiations)
    response.headers.set('Cache-Control', 'private, max-age=0, no-cache, no-store, must-revalidate')
    return response
  } catch (error) {
    console.error('Negotiations fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}