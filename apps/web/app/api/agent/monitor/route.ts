// Monitor endpoint for immediate agent processing statistics
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'edge';

/**
 * GET: Monitor immediate agent processing status and statistics
 * No longer processes queued tasks - just provides monitoring data
 */
export async function GET() {
  try {
    const supabase = createSupabaseServerClient();

    // Get recent agent decisions (last 24 hours)
    const { data: recentDecisions } = await supabase
      .from('agent_decisions')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    // Group decisions by type (handle both uppercase and lowercase)
    const stats = {
      total: recentDecisions?.length || 0,
      accepted: recentDecisions?.filter(d => 
        d.decision_type?.toLowerCase() === 'accept' || 
        d.decision_type?.toLowerCase() === 'accepted'
      ).length || 0,
      countered: recentDecisions?.filter(d => 
        d.decision_type?.toLowerCase() === 'counter' || 
        d.decision_type?.toLowerCase() === 'countered'
      ).length || 0,
      rejected: recentDecisions?.filter(d => 
        d.decision_type?.toLowerCase() === 'reject' || 
        d.decision_type?.toLowerCase() === 'rejected'
      ).length || 0,
      errors: recentDecisions?.filter(d => 
        d.decision_type?.toLowerCase() === 'error' || 
        d.decision_type?.toLowerCase() === 'failed'
      ).length || 0,
      immediate: recentDecisions?.filter(d => d.market_conditions?.immediate).length || 0
    };

    // Get average execution time for immediate processing
    const immediateDecisions = recentDecisions?.filter(d => d.market_conditions?.immediate) || [];
    const avgExecutionTime = immediateDecisions.length > 0 
      ? immediateDecisions.reduce((sum, d) => sum + (d.execution_time_ms || 0), 0) / immediateDecisions.length 
      : 0;

    // Get recent agent-enabled items count
    const { count: agentEnabledItems } = await supabase
      .from('items')
      .select('id', { count: 'exact' })
      .eq('agent_enabled', true)
      .eq('item_status', 'active');

    // Get active negotiations count
    const { count: activeNegotiations } = await supabase
      .from('negotiations')
      .select('id', { count: 'exact' })
      .eq('status', 'active')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return Response.json({
      status: 'operational',
      mode: 'immediate_processing',
      timestamp: new Date().toISOString(),
      statistics: {
        last24Hours: stats,
        averageExecutionTimeMs: Math.round(avgExecutionTime),
        agentEnabledItems: agentEnabledItems || 0,
        activeNegotiations: activeNegotiations || 0
      },
      recentDecisions: recentDecisions?.slice(0, 10).map(d => ({
        id: d.id,
        decision_type: d.decision_type,
        execution_time_ms: d.execution_time_ms,
        created_at: d.created_at,
        immediate: d.market_conditions?.immediate || false,
        original_offer_price: d.original_offer_price,
        recommended_price: d.recommended_price
      })) || []
    });

  } catch (error) {
    console.error('Monitor status error:', error);
    return Response.json({
      status: 'error',
      mode: 'immediate_processing',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * POST: Manual trigger for testing (no longer processes queue)
 * Returns current system status instead
 */
export async function POST() {
  try {
    const supabase = createSupabaseServerClient();
    
    // Just return current status - no processing to trigger
    const { count: activeItems } = await supabase
      .from('items')
      .select('id', { count: 'exact' })
      .eq('agent_enabled', true)
      .eq('item_status', 'active');

    return Response.json({
      message: 'Immediate processing mode - no manual triggering needed',
      agentEnabledItems: activeItems || 0,
      mode: 'immediate_processing',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Monitor trigger error:', error);
    return Response.json({
      error: 'Monitor service failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}