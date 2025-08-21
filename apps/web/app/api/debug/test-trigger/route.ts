import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // 1. Get the latest buyer offer
    const { data: latestOffer, error: offerError } = await supabase
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
          item_id
        )
      `)
      .eq('offer_type', 'buyer')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (offerError || !latestOffer) {
      return NextResponse.json({
        success: false,
        error: 'No buyer offers found',
        details: offerError
      })
    }

    // 2. Check if this offer was queued
    const { data: queueEntry, error: queueError } = await supabase
      .from('agent_processing_queue')
      .select('*')
      .eq('offer_id', latestOffer.id)

    // 3. Check seller agent profile for this seller
    const { data: agentProfile, error: profileError } = await supabase
      .from('seller_agent_profile')
      .select('*')
      .eq('seller_id', latestOffer.negotiations.seller_id)
      .single()

    // 4. Check item agent_enabled status
    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .select('id, name, agent_enabled, seller_id')
      .eq('id', latestOffer.negotiations.item_id)
      .single()

    // 5. Check if decision was made for this negotiation
    const { data: decision, error: decisionError } = await supabase
      .from('agent_decisions')
      .select('*')
      .eq('negotiation_id', latestOffer.negotiation_id)

    // Break down each trigger condition
    const conditions = {
      is_buyer_offer: latestOffer.offer_type === 'buyer',
      seller_agent_enabled: agentProfile?.agent_enabled === true,
      item_agent_enabled: itemData?.agent_enabled === true,
      seller_profile_exists: !!agentProfile,
      item_exists: !!itemData
    }

    return NextResponse.json({
      success: true,
      test_results: {
        latest_offer: {
          data: latestOffer,
          error: offerError
        },
        queue_entry: {
          data: queueEntry,
          error: queueError,
          was_queued: queueEntry && queueEntry.length > 0
        },
        agent_profile: {
          data: agentProfile,
          error: profileError,
          agent_enabled: agentProfile?.agent_enabled || false
        },
        item_data: {
          data: itemData,
          error: itemError,
          agent_enabled: itemData?.agent_enabled || false
        },
        decision: {
          data: decision,
          error: decisionError,
          decision_made: decision && decision.length > 0
        }
      },
      analysis: {
        trigger_should_fire: Object.values(conditions).every(Boolean),
        queue_entry_exists: !!(queueEntry && queueEntry.length > 0),
        decision_exists: !!(decision && decision.length > 0),
        seller_id: latestOffer.negotiations.seller_id,
        item_id: latestOffer.negotiations.item_id,
        offer_id: latestOffer.id,
        conditions: conditions,
        failing_conditions: Object.entries(conditions)
          .filter(([_, value]) => !value)
          .map(([key, _]) => key)
      }
    })

  } catch (error) {
    console.error('Test trigger error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}