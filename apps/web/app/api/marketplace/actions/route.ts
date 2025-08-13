import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

const supabase = createSupabaseServerClient()

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from request header
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
      // Fallback to session-based auth
      const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !sessionUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      user = sessionUser
    }

    const { action, negotiation_id, price, message } = await request.json()

    if (!action || !negotiation_id) {
      return NextResponse.json({ error: 'Action and negotiation_id required' }, { status: 400 })
    }

    // Verify negotiation belongs to user
    const { data: negotiation, error: negError } = await supabase
      .from('negotiations')
      .select('id, seller_id')
      .eq('id', negotiation_id)
      .eq('seller_id', user.id)
      .single()

    if (negError || !negotiation) {
      return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 })
    }

    // Use existing API endpoints for actions
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return NextResponse.json({ error: 'No auth token' }, { status: 401 })
    }

    let body = {}
    if (action === 'counter') {
      if (!price) {
        return NextResponse.json({ error: 'Price required for counter offers' }, { status: 400 })
      }
      body = { price, message: message || '' }
    } else if (action === 'decline') {
      body = { reason: message || 'Offer declined' }
    }
    
    const response = await fetch(`/api/negotiations/${negotiation_id}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json({ error: error.error || `Failed to ${action}` }, { status: response.status })
    }

    const result = await response.json()
    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Action API error:', error)
    return NextResponse.json(
      { error: error.message || 'Action failed' },
      { status: 500 }
    )
  }
}