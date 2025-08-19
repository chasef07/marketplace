import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export const runtime = 'edge';

/**
 * Get agent performance metrics for dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // Get total and active sellers with agents
    const { data: sellerStats } = await supabase
      .rpc('get_agent_seller_stats');

    // Get decision metrics from the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: decisionStats } = await supabase
      .from('agent_decisions')
      .select('decision_type, confidence_score')
      .gte('created_at', thirtyDaysAgo);

    const totalDecisions = decisionStats?.length || 0;
    const averageConfidence = totalDecisions > 0 
      ? decisionStats!.reduce((sum, d) => sum + (d.confidence_score || 0), 0) / totalDecisions 
      : 0;

    // Calculate success rate (ACCEPT and COUNTER are considered successful)
    const successfulDecisions = decisionStats?.filter(d => 
      d.decision_type === 'ACCEPT' || d.decision_type === 'COUNTER'
    ).length || 0;
    
    const successRate = totalDecisions > 0 ? successfulDecisions / totalDecisions : 0;

    return Response.json({
      totalSellers: sellerStats?.[0]?.total_sellers || 0,
      activeSellers: sellerStats?.[0]?.active_sellers || 0,
      averageConfidence,
      successRate,
      totalDecisions,
    });

  } catch (error) {
    console.error('Failed to get agent metrics:', error);
    return Response.json({ 
      error: 'Failed to get metrics' 
    }, { status: 500 });
  }
}