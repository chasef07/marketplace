import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = 'edge';

/**
 * Get agent decisions with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Filters
    const decision_type = searchParams.get('decision_type');
    const furniture_type = searchParams.get('furniture_type');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const min_confidence = searchParams.get('min_confidence');

    // Build query
    let query = supabase
      .from('agent_decisions')
      .select(`
        *,
        items!inner (
          name,
          furniture_type
        )
      `, { count: 'exact' });

    // Apply filters
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

    // Apply pagination and ordering
    const { data: decisions, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to get decisions:', error);
      return Response.json({ error: 'Failed to get decisions' }, { status: 500 });
    }

    // Transform the data
    const transformedDecisions = decisions.map((decision: any) => ({
      ...decision,
      item_name: decision.items.name,
      furniture_type: decision.items.furniture_type,
    }));

    const totalPages = Math.ceil((count || 0) / limit);

    return Response.json({
      decisions: transformedDecisions,
      total: count || 0,
      page,
      limit,
      totalPages,
    });

  } catch (error) {
    console.error('Failed to get decisions:', error);
    return Response.json({ 
      error: 'Failed to get decisions' 
    }, { status: 500 });
  }
}