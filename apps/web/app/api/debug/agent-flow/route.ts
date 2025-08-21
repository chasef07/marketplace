import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // 1. Check agent_processing_queue
    const { data: queueData, error: queueError } = await supabase
      .from('agent_processing_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    // 2. Check recent offers with detailed item info
    const { data: offersData, error: offersError } = await supabase
      .from('offers')
      .select(`
        id,
        negotiation_id,
        offer_type,
        price,
        created_at,
        negotiations!inner(
          id,
          seller_id,
          item_id,
          items!inner(
            id,
            name,
            seller_id,
            agent_enabled
          )
        )
      `)
      .eq('offer_type', 'buyer')
      .order('created_at', { ascending: false })
      .limit(10)

    // 3. Check items table directly for agent_enabled status
    const { data: itemsData, error: itemsError } = await supabase
      .from('items')
      .select('id, name, seller_id, agent_enabled, item_status')
      .order('created_at', { ascending: false })
      .limit(10)

    // 4. Check agent_decisions
    const { data: decisionsData, error: decisionsError } = await supabase
      .from('agent_decisions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    // 5. Check seller_agent_profile settings
    const { data: profilesData, error: profilesError } = await supabase
      .from('seller_agent_profile')
      .select('*')

    // 6. Check if autonomous agent schema is applied
    const { data: schemaCheck, error: schemaError } = await supabase
      .rpc('get_next_agent_task')
      .limit(1)

    // 7. Cross-reference: Find offers without corresponding decisions
    const offersWithoutDecisions = offersData?.filter(offer => {
      return !decisionsData?.some(decision => 
        decision.negotiation_id === offer.negotiation_id
      )
    }) || []

    return NextResponse.json({
      success: true,
      debug_info: {
        queue: {
          data: queueData,
          error: queueError,
          count: queueData?.length || 0
        },
        recent_offers: {
          data: offersData,
          error: offersError,
          count: offersData?.length || 0
        },
        items_direct: {
          data: itemsData,
          error: itemsError,
          count: itemsData?.length || 0
        },
        agent_decisions: {
          data: decisionsData,
          error: decisionsError,
          count: decisionsData?.length || 0
        },
        seller_profiles: {
          data: profilesData,
          error: profilesError,
          count: profilesData?.length || 0
        },
        schema_check: {
          data: schemaCheck,
          error: schemaError,
          function_exists: !schemaError
        },
        offers_without_decisions: offersWithoutDecisions
      },
      analysis: {
        queue_has_pending: queueData?.some(q => q.status === 'pending') || false,
        recent_buyer_offers: offersData?.filter(o => o.offer_type === 'buyer').length || 0,
        agent_enabled_items_via_offers: offersData?.filter(o => 
          o.negotiations?.items?.agent_enabled === true
        ).length || 0,
        agent_enabled_items_direct: itemsData?.filter(i => i.agent_enabled === true).length || 0,
        total_decisions: decisionsData?.length || 0,
        sellers_with_agent: profilesData?.filter(p => p.agent_enabled === true).length || 0,
        offers_missing_decisions: offersWithoutDecisions.length,
        decision_rate: offersData?.length ? 
          Math.round((decisionsData?.length || 0) / offersData.length * 100) : 0
      }
    })

  } catch (error) {
    console.error('Debug agent flow error:', error)
    return NextResponse.json({
      success: false,
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}