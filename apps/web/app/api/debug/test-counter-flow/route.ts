import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { getAuthenticatedUser } from '@/src/lib/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { negotiationId, price } = await request.json()

    console.log('🧪 Testing counter offer flow:', { negotiationId, price })

    if (!negotiationId || !price) {
      return NextResponse.json({ error: 'negotiationId and price required' }, { status: 400 })
    }

    // Get authenticated user (same as conversation API)
    const authResult = await getAuthenticatedUser(request)
    console.log('🧪 Auth result:', { 
      hasUser: !!authResult.user, 
      userId: authResult.user?.id, 
      hasToken: !!authResult.token,
      tokenLength: authResult.token?.length || 0
    })

    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || 'Authentication required' }, { status: 401 })
    }

    // Test making the same API call that executeCounterOffers makes
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   (process.env.NODE_ENV === 'development' ? 
                    'http://localhost:3001' : 
                    '')

    const url = `${baseUrl}/api/negotiations/${negotiationId}/counter`
    const payload = {
      price: price,
      message: `Test counter offer: $${price}`
    }

    console.log('🧪 Making counter offer API call:', {
      url,
      payload,
      hasAuthToken: !!authResult.token,
      tokenPreview: authResult.token?.substring(0, 20) + '...'
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authResult.token}`
      },
      body: JSON.stringify(payload)
    })

    console.log('🧪 API response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    if (response.ok) {
      const responseData = await response.json()
      console.log('🧪 Success response:', responseData)

      // Verify in database
      const { data: verifyOffers, error: verifyError } = await supabase
        .from('offers')
        .select('id, price, offer_type, is_counter_offer, created_at')
        .eq('negotiation_id', negotiationId)
        .eq('offer_type', 'seller')
        .eq('is_counter_offer', true)
        .gte('created_at', new Date(Date.now() - 30000).toISOString()) // Last 30 seconds
        .order('created_at', { ascending: false })
        .limit(1)

      console.log('🧪 Database verification:', { verifyOffers, verifyError })

      return NextResponse.json({
        success: true,
        apiResponse: responseData,
        databaseVerification: {
          found: verifyOffers?.length > 0,
          offers: verifyOffers,
          error: verifyError
        }
      })
    } else {
      const errorText = await response.text()
      console.error('🧪 API error:', errorText)

      return NextResponse.json({
        success: false,
        error: errorText,
        status: response.status
      }, { status: response.status })
    }

  } catch (error) {
    console.error('🧪 Test endpoint error:', error)
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}