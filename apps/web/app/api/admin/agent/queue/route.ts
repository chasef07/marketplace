import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = 'edge';

/**
 * Get detailed agent processing queue for monitoring
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // Get processing queue with item details
    const { data: queue, error } = await supabase
      .from('agent_processing_queue')
      .select(`
        id,
        negotiation_id,
        offer_id,
        seller_id,
        status,
        priority,
        created_at,
        processed_at,
        error_message,
        negotiations!inner (
          item_id,
          items!inner (
            id,
            name,
            starting_price,
            furniture_type
          )
        ),
        offers!inner (
          price
        )
      `)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Failed to get queue:', error);
      return Response.json({ error: 'Failed to get queue' }, { status: 500 });
    }

    // Transform the data to match frontend expectations
    const transformedQueue = queue.map((item: any) => ({
      queue_id: item.id,
      negotiation_id: item.negotiation_id,
      offer_id: item.offer_id,
      seller_id: item.seller_id,
      item_id: item.negotiations.item_id,
      item_name: item.negotiations.items.name,
      listing_price: item.negotiations.items.starting_price,
      offer_price: item.offers.price,
      furniture_type: item.negotiations.items.furniture_type,
      status: item.status,
      priority: item.priority,
      created_at: item.created_at,
      processed_at: item.processed_at,
      error_message: item.error_message,
    }));

    return Response.json({
      queue: transformedQueue,
      total: transformedQueue.length,
    });

  } catch (error) {
    console.error('Failed to get queue:', error);
    return Response.json({ 
      error: 'Failed to get queue' 
    }, { status: 500 });
  }
}