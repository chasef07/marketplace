import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ negotiationId: string }> }
) {
  try {
    const { negotiationId: negotiationIdStr } = await params
    const negotiationId = parseInt(negotiationIdStr)
    
    if (isNaN(negotiationId)) {
      return NextResponse.json({ error: 'Invalid negotiation ID' }, { status: 400 })
    }

    // Get user from Authorization header or session
    const authHeader = request.headers.get('Authorization')
    let user = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user: authUser }, error } = await supabase.auth.getUser(token)
      if (error) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
      user = authUser
    } else {
      // Try to get user from session cookie
      const { data: { user: sessionUser }, error } = await supabase.auth.getUser()
      if (error || !sessionUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      user = sessionUser
    }

    // Verify user is part of this negotiation (buyer or seller)
    const { data: negotiation, error: negError } = await supabase
      .from('negotiations')
      .select('buyer_id, seller_id')
      .eq('id', negotiationId)
      .single()

    if (negError || !negotiation) {
      return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 })
    }

    // Check if user is authorized to view this negotiation
    const userProfile = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user!.id)
      .single()

    if (!userProfile.data || 
        (userProfile.data.id !== negotiation.buyer_id && 
         userProfile.data.id !== negotiation.seller_id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get offers for this negotiation
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select(`
        id,
        price,
        message,
        offer_type,
        round_number,
        is_counter_offer,
        created_at,
        buyer_id,
        seller_id
      `)
      .eq('negotiation_id', negotiationId)
      .order('created_at', { ascending: true })

    if (offersError) {
      console.error('Error fetching offers:', offersError)
      return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 })
    }

    return NextResponse.json(offers || [])

  } catch (error) {
    console.error('Error in GET /api/negotiations/[negotiationId]/offers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}