import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const negotiationId = searchParams.get('negotiationId')

    if (!negotiationId) {
      return NextResponse.json({ error: 'negotiationId parameter required' }, { status: 400 })
    }

    console.log('🧪 Testing round count function for negotiation:', negotiationId)

    // Test 1: Check if function exists
    const { data: functionTest, error: functionError } = await supabase
      .rpc('get_round_count', { neg_id: parseInt(negotiationId) })

    console.log('🧪 Function test result:', { functionTest, functionError })

    // Test 2: Manual count as fallback
    const { data: manualCount, error: manualError } = await supabase
      .from('offers')
      .select('id', { count: 'exact' })
      .eq('negotiation_id', parseInt(negotiationId))

    console.log('🧪 Manual count result:', { manualCount: manualCount?.length, manualError })

    // Test 3: Check negotiation exists
    const { data: negotiation, error: negotiationError } = await supabase
      .from('negotiations')
      .select('*')
      .eq('id', parseInt(negotiationId))
      .single()

    console.log('🧪 Negotiation check:', { negotiation: !!negotiation, negotiationError })

    return NextResponse.json({
      negotiationId: parseInt(negotiationId),
      functionExists: !functionError,
      functionResult: functionTest,
      functionError: functionError?.message,
      manualCount: manualCount?.length || 0,
      manualError: manualError?.message,
      negotiationExists: !!negotiation,
      negotiationError: negotiationError?.message,
      debug: {
        functionTest,
        manualCount,
        negotiation
      }
    })

  } catch (error) {
    console.error('🧪 Debug endpoint error:', error)
    return NextResponse.json({ 
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}