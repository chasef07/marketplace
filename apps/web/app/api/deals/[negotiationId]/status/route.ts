import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { ratelimit, withRateLimit } from '@/lib/rate-limit'

const supabase = createSupabaseServerClient()

// Update deal status
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

      const { status, notes, scheduled_meeting_time, meeting_location } = body

      if (!status) {
        return NextResponse.json({ error: 'Status is required' }, { status: 400 })
      }

      // Validate status values
      const validStatuses = ['accepted', 'arranging', 'meeting_scheduled', 'in_progress', 'completed', 'cancelled']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
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

      // Only allow status updates for completed negotiations
      if (negotiation.neg_status !== 'completed') {
        return NextResponse.json({ error: 'Can only update status for completed deals' }, { status: 400 })
      }

      // Create status history entry
      const { data: statusEntry, error: statusError } = await supabase
        .from('deal_status_history')
        .insert({
          negotiation_id: negotiationId,
          status,
          updated_by: user.id,
          notes,
          scheduled_meeting_time,
          meeting_location
        })
        .select()
        .single()

      if (statusError) {
        console.error('Error creating status entry:', statusError)
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
      }

      return NextResponse.json({
        message: 'Status updated successfully',
        data: statusEntry
      })

    } catch (error) {
      console.error('Status update error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}

// Get deal status history
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
        .select('seller_id, buyer_id')
        .eq('id', negotiationId)
        .single()

      if (negError || !negotiation) {
        return NextResponse.json({ error: 'Negotiation not found' }, { status: 404 })
      }

      if (negotiation.seller_id !== user.id && negotiation.buyer_id !== user.id) {
        return NextResponse.json({ error: 'Not authorized for this negotiation' }, { status: 403 })
      }

      // Get status history
      const { data: statusHistory, error: historyError } = await supabase
        .from('deal_status_history')
        .select(`
          id,
          status,
          notes,
          scheduled_meeting_time,
          meeting_location,
          created_at,
          updated_by_profile:updated_by(username, email)
        `)
        .eq('negotiation_id', negotiationId)
        .order('created_at', { ascending: false })

      if (historyError) {
        console.error('Error fetching status history:', historyError)
        return NextResponse.json({ error: 'Failed to fetch status history' }, { status: 500 })
      }

      // Get current status
      const currentStatus = statusHistory?.[0]?.status || 'accepted'

      return NextResponse.json({
        current_status: currentStatus,
        history: statusHistory || []
      })

    } catch (error) {
      console.error('Status fetch error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}