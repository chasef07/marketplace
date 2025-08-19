import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export const runtime = 'edge';

/**
 * Get analytics data for decision history page
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    
    // Same filters as decisions endpoint
    const decision_type = searchParams.get('decision_type');
    const furniture_type = searchParams.get('furniture_type');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const min_confidence = searchParams.get('min_confidence');

    // Build base query with filters
    let query = supabase
      .from('agent_decisions')
      .select(`
        decision_type,
        confidence_score,
        execution_time_ms,
        items!inner (
          furniture_type
        )
      `);

    // Apply same filters as decisions endpoint
    if (decision_type) {
      query = query.eq('decision_type', decision_type);
    }
    if (furniture_type) {
      query = query.eq('items.furniture_type', furniture_type);
    }
    if (date_from) {
      query = query.gte('created_at', date_from);
    }
    if (date_to) {
      query = query.lte('created_at', date_to + 'T23:59:59.999Z');
    }
    if (min_confidence) {
      query = query.gte('confidence_score', parseFloat(min_confidence));
    }

    const { data: decisions, error } = await query;

    if (error) {
      console.error('Failed to get analytics data:', error);
      return Response.json({ error: 'Failed to get analytics' }, { status: 500 });
    }

    const totalDecisions = decisions.length;

    // Calculate decision type breakdown
    const decisionTypeBreakdown = decisions.reduce((acc: Record<string, number>, d: any) => {
      acc[d.decision_type] = (acc[d.decision_type] || 0) + 1;
      return acc;
    }, {});

    // Calculate furniture type breakdown
    const furnitureTypeBreakdown = decisions.reduce((acc: Record<string, number>, d: any) => {
      const type = d.items.furniture_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Calculate averages
    const averageConfidence = totalDecisions > 0 
      ? decisions.reduce((sum: number, d: any) => sum + (d.confidence_score || 0), 0) / totalDecisions 
      : 0;

    const averageExecutionTime = totalDecisions > 0
      ? decisions.reduce((sum: number, d: any) => sum + (d.execution_time_ms || 0), 0) / totalDecisions
      : 0;

    // Calculate success rate (ACCEPT and COUNTER are considered successful)
    const successfulDecisions = decisions.filter((d: any) => 
      d.decision_type === 'ACCEPT' || d.decision_type === 'COUNTER'
    ).length;
    
    const successRate = totalDecisions > 0 ? successfulDecisions / totalDecisions : 0;

    return Response.json({
      totalDecisions,
      decisionTypeBreakdown,
      furnitureTypeBreakdown,
      averageConfidence,
      averageExecutionTime,
      successRate,
    });

  } catch (error) {
    console.error('Failed to get analytics:', error);
    return Response.json({ 
      error: 'Failed to get analytics' 
    }, { status: 500 });
  }
}