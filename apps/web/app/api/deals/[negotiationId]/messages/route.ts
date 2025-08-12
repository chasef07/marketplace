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

      // Get messages
      const { data: messages, error: messagesError } = await supabase
        .from('deal_messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          message_type,
          content,
          metadata,
          is_read,
          created_at,
          sender:sender_id(username, email),
          receiver:receiver_id(username, email)
        `)
        .eq('negotiation_id', negotiationId)
        .order('created_at', { ascending: true })

      if (messagesError) {
        console.error('Error fetching messages:', messagesError)
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
      }

      // Get current deal status
      const { data: currentStatus } = await supabase
        .rpc('get_current_deal_status', { neg_id: negotiationId })

      // Mark messages as read for current user
      await supabase.rpc('mark_messages_read', { 
        neg_id: negotiationId, 
        user_id: user.id 
      })

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

      const { content, message_type = 'text', metadata = {} } = body

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
      const receiverId = negotiation.seller_id === user.id ? negotiation.buyer_id : negotiation.seller_id

      // Create message
      const { data: message, error: messageError } = await supabase
        .from('deal_messages')
        .insert({
          negotiation_id: negotiationId,
          sender_id: user.id,
          receiver_id: receiverId,
          message_type,
          content,
          metadata
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