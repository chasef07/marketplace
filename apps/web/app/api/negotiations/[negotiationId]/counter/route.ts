import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/src/lib/supabase'
import { ratelimit, withRateLimit } from '@/src/lib/rate-limit'
import { offerService } from '@/src/lib/services/offer-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ negotiationId: string }> }
) {
  return withRateLimit(request, ratelimit.api, async () => {
    try {
    console.log('🔧 Counter API started - negotiationId from params')
    const supabase = createSupabaseServerClient()
    const { negotiationId: negotiationIdStr } = await params
    const negotiationId = parseInt(negotiationIdStr)
    const body = await request.json()
    
    console.log('🔧 Counter API - Parsed data:', { negotiationId, body })

    if (isNaN(negotiationId)) {
      return NextResponse.json({ error: 'Invalid negotiation ID' }, { status: 400 })
    }

    // Get user from Authorization header
    const authHeader = request.headers.get('authorization')
    console.log('🔧 Counter API - Auth header present:', !!authHeader)
    let user = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      console.log('🔧 Counter API - Token length:', token.length)
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
      
      if (!tokenError && tokenUser) {
        user = tokenUser
        console.log('🔧 Counter API - User from token:', user.id)
      } else {
        console.log('🔧 Counter API - Token auth error:', tokenError)
      }
    }
    
    if (!user) {
      console.log('🔧 Counter API - Falling back to session auth')
      // Fall back to session-based authentication  
      const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !sessionUser) {
        console.log('🔧 Counter API - Session auth failed:', authError)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      user = sessionUser
      console.log('🔧 Counter API - User from session:', user.id)
    }

    // Determine offer type based on user role
    const offerType = 'seller' // This endpoint is specifically for seller counter offers
    
    console.log('🔧 Counter API - Using unified offer service:', { 
      negotiationId, 
      offerType, 
      price: body.price,
      userId: user.id
    })

    // Use unified offer service
    const result = await offerService.createOffer({
      negotiationId,
      offerType,
      price: body.price,
      message: body.message || '',
      isCounterOffer: true,
      isMessageOnly: false,
      agentGenerated: false,
      userId: user.id
    })

    if (!result.success) {
      console.error('🔧 Counter API - Offer service error:', result.error)
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    console.log('🔧 Counter API - Counter offer created successfully:', result.offerId)

    return NextResponse.json({
      message: 'Counter offer created successfully',
      offer: result.offer
    })
    } catch (error) {
      console.error('Counter offer error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })
}