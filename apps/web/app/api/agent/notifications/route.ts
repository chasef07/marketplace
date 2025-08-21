import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export const runtime = 'edge';

/**
 * GET: Get pending agent notifications for a seller
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pending agent recommendations for this seller
    const { data: notifications, error } = await supabase
      .from('agent_decisions')
      .select(`
        id,
        decision_type,
        original_offer_price,
        recommended_price,
        confidence_score,
        reasoning,
        created_at,
        items!inner(
          id,
          name,
          starting_price,
          agent_enabled
        ),
        negotiations!inner(
          id,
          status,
          buyer_id,
          profiles!inner(username)
        )
      `)
      .eq('seller_id', user.id)
      .eq('decision_type', 'ACCEPT')
      .gte('confidence_score', 0.8) // Only high-confidence recommendations
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .is('seller_notified_at', null) // Not yet notified
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching agent notifications:', error);
      return Response.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Format notifications for frontend
    const formattedNotifications = notifications?.map(notification => ({
      id: notification.id,
      type: 'agent_recommendation',
      title: `AI recommends accepting $${notification.original_offer_price} offer`,
      message: `Your AI agent suggests accepting the $${notification.original_offer_price} offer on "${notification.items.name}" with ${Math.round(notification.confidence_score * 100)}% confidence.`,
      offerPrice: notification.original_offer_price,
      itemName: notification.items.name,
      itemId: notification.items.id,
      buyerName: notification.negotiations.profiles.username,
      confidence: notification.confidence_score,
      reasoning: notification.reasoning,
      createdAt: notification.created_at,
      negotiationId: notification.negotiations.id,
      priority: notification.confidence_score > 0.9 ? 'high' : 'medium'
    })) || [];

    return Response.json({
      success: true,
      notifications: formattedNotifications,
      count: formattedNotifications.length
    });

  } catch (error) {
    console.error('Agent notifications error:', error);
    return Response.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST: Mark notification as seen/acknowledged
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const body = await request.json();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId, action } = body;

    if (!notificationId) {
      return Response.json({ error: 'Notification ID required' }, { status: 400 });
    }

    if (action === 'acknowledge') {
      // Mark the agent decision as notified
      const { error } = await supabase
        .from('agent_decisions')
        .update({ 
          seller_notified_at: new Date().toISOString(),
          seller_response: 'acknowledged'
        })
        .eq('id', notificationId)
        .eq('seller_id', user.id);

      if (error) {
        console.error('Error acknowledging notification:', error);
        return Response.json({ error: 'Failed to acknowledge notification' }, { status: 500 });
      }

      return Response.json({ success: true, action: 'acknowledged' });
    }

    if (action === 'accept_recommendation') {
      // Get the decision details
      const { data: decision, error: fetchError } = await supabase
        .from('agent_decisions')
        .select(`
          negotiation_id,
          original_offer_price,
          items!inner(id, starting_price)
        `)
        .eq('id', notificationId)
        .eq('seller_id', user.id)
        .single();

      if (fetchError || !decision) {
        return Response.json({ error: 'Decision not found' }, { status: 404 });
      }

      // Accept the offer by updating negotiation status
      const { error: updateError } = await supabase
        .from('negotiations')
        .update({
          status: 'completed',
          final_price: decision.original_offer_price,
          completed_at: new Date().toISOString(),
        })
        .eq('id', decision.negotiation_id);

      if (updateError) {
        console.error('Error accepting offer:', updateError);
        return Response.json({ error: 'Failed to accept offer' }, { status: 500 });
      }

      // Mark item as sold
      await supabase
        .from('items')
        .update({
          item_status: 'sold',
          final_price: decision.original_offer_price,
          sold_at: new Date().toISOString(),
        })
        .eq('id', decision.items.id);

      // Mark notification as handled
      await supabase
        .from('agent_decisions')
        .update({ 
          seller_notified_at: new Date().toISOString(),
          seller_response: 'accepted'
        })
        .eq('id', notificationId);

      return Response.json({ 
        success: true, 
        action: 'offer_accepted',
        finalPrice: decision.original_offer_price
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Notification action error:', error);
    return Response.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}