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

    const { data: items, error } = await supabase
      .from('items')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user items:', error)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    const response = NextResponse.json(items)
    response.headers.set('Cache-Control', 'private, max-age=300')
    return response
  } catch (error) {
    console.error('My items fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}