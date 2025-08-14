import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ratelimit, withRateLimit } from '@/lib/rate-limit'

const supabase = createSupabaseServerClient()

// Get messages for a specific deal/negotiation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ negotiationId: string }> }
) {
  return withRateLimit(request, ratelimit.api, async () => {
    try {
      const { negotiationId: negotiationIdStr } = await params
      const negotiationId = parseInt(negotiationIdStr)

      if (isNaN(negotiationId)) {
        return NextResponse.json({ error: 'Invalid negotiation ID' }, { status: 400 })
      }

      // Get authenticated user
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
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        if (authError || !session?.user) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }
        user = session.user
      }

      // Verify user is part of the negotiation
      const { data: negotiation, error: negError } = await supabase
        .from('negotiations')
        .select('seller_id, buyer_id, status')
        .eq('id', negotiationId)
        .single()

      if (negError || !negotiation) {
        return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 })
      }

      if (negotiation.seller_id !== user.id && negotiation.buyer_id !== user.id) {
        return NextResponse.json({ error: 'Not authorized for this negotiation' }, { status: 403 })
      }

      // Get messages from offers table
      const { data: messages, error: messagesError } = await supabase
        .from('offers')
        .select(`
          id,
          message,
          offer_type,
          price,
          created_at,
          negotiation_id
        `)
        .eq('negotiation_id', negotiationId)
        .not('message', 'is', null)
        .order('created_at', { ascending: true })

      if (messagesError) {
        console.error('Error fetching messages:', messagesError)
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
      }

      // Get negotiation status from the negotiation object
      const currentStatus = negotiation.status

      return NextResponse.json({
        messages: messages || [],
        current_status: currentStatus,
        negotiation
      })

    } catch (error) {
      console.error('Deal messages error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}

// Send a new message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ negotiationId: string }> }
) {
  return withRateLimit(request, ratelimit.api, async () => {
    try {
      const { negotiationId: negotiationIdStr } = await params
      const negotiationId = parseInt(negotiationIdStr)
      const body = await request.json()

      if (isNaN(negotiationId)) {
        return NextResponse.json({ error: 'Invalid negotiation ID' }, { status: 400 })
      }

      const { content } = body

      if (!content) {
        return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
      }

      // Get authenticated user
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
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        if (authError || !session?.user) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }
        user = session.user
      }

      // Get negotiation details
      const { data: negotiation, error: negError } = await supabase
        .from('negotiations')
        .select('seller_id, buyer_id, status')
        .eq('id', negotiationId)
        .single()

      if (negError || !negotiation) {
        return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 })
      }

      if (negotiation.seller_id !== user.id && negotiation.buyer_id !== user.id) {
        return NextResponse.json({ error: 'Not authorized for this negotiation' }, { status: 403 })
      }

      // Determine receiver

      // Create message as an offer with no price (message only)
      const { data: message, error: messageError } = await supabase
        .from('offers')
        .insert({
          negotiation_id: negotiationId,
          offer_type: user.id === negotiation.seller_id ? 'seller' : 'buyer',
          is_message_only: true,
          message: content,
          price: null
        })
        .select()
        .single()

      if (messageError) {
        console.error('Error creating message:', messageError)
        return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
      }

      return NextResponse.json({
        message: 'Message sent successfully',
        data: message
      })

    } catch (error) {
      console.error('Send message error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}