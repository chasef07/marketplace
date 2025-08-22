import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export const runtime = 'edge';

/**
 * GET: Get pending notifications for the current user (both buyer and seller notifications)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allNotifications: any[] = [];

    // 1. Get agent recommendations for sellers (existing functionality)
    const { data: agentNotifications, error: agentError } = await supabase
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
      .gte('confidence_score', 0.8)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .is('seller_notified_at', null)
      .order('created_at', { ascending: false });

    if (!agentError && agentNotifications) {
      const formattedAgentNotifications = agentNotifications.map(notification => ({
        id: `agent_${notification.id}`,
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
        priority: notification.confidence_score > 0.9 ? 'high' : 'medium',
        actions: ['accept', 'dismiss']
      }));
      allNotifications.push(...formattedAgentNotifications);
    }

    // 2. Get new buyer offers for sellers (items they own)
    const { data: sellerOffers, error: sellerError } = await supabase
      .from('offers')
      .select(`
        id,
        price,
        offer_type,
        message,
        created_at,
        round_number,
        negotiations!inner(
          id,
          status,
          buyer_id,
          item_id,
          items!inner(
            id,
            name,
            seller_id
          ),
          profiles!negotiations_buyer_id_fkey(username)
        )
      `)
      .eq('negotiations.items.seller_id', user.id)
      .eq('offer_type', 'buyer')
      .eq('negotiations.status', 'active')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (!sellerError && sellerOffers) {
      const formattedSellerNotifications = sellerOffers.map(offer => ({
        id: `offer_${offer.id}`,
        type: 'buyer_offer',
        title: `New offer: $${offer.price}`,
        message: `${offer.negotiations.profiles.username} made an offer of $${offer.price} on "${offer.negotiations.items.name}"${offer.message ? `: "${offer.message}"` : ''}`,
        offerPrice: parseFloat(offer.price),
        itemName: offer.negotiations.items.name,
        itemId: offer.negotiations.items.id,
        buyerName: offer.negotiations.profiles.username,
        createdAt: offer.created_at,
        negotiationId: offer.negotiations.id,
        offerId: offer.id,
        priority: 'medium',
        actions: ['accept', 'counter', 'decline']
      }));
      allNotifications.push(...formattedSellerNotifications);
    }

    // 3. Get seller counter-offers for buyers (negotiations they started)
    const { data: buyerOffers, error: buyerError } = await supabase
      .from('offers')
      .select(`
        id,
        price,
        offer_type,
        message,
        created_at,
        round_number,
        negotiations!inner(
          id,
          status,
          buyer_id,
          item_id,
          items!inner(
            id,
            name,
            seller_id
          ),
          profiles!negotiations_seller_id_fkey(username)
        )
      `)
      .eq('negotiations.buyer_id', user.id)
      .eq('offer_type', 'seller')
      .eq('negotiations.status', 'active')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (!buyerError && buyerOffers) {
      const formattedBuyerNotifications = buyerOffers.map(offer => ({
        id: `counter_${offer.id}`,
        type: 'seller_counter',
        title: `Counter offer: $${offer.price}`,
        message: `${offer.negotiations.profiles.username} countered with $${offer.price} on "${offer.negotiations.items.name}"${offer.message ? `: "${offer.message}"` : ''}`,
        offerPrice: parseFloat(offer.price),
        itemName: offer.negotiations.items.name,
        itemId: offer.negotiations.items.id,
        sellerName: offer.negotiations.profiles.username,
        createdAt: offer.created_at,
        negotiationId: offer.negotiations.id,
        offerId: offer.id,
        priority: 'medium',
        actions: ['accept', 'counter', 'decline']
      }));
      allNotifications.push(...formattedBuyerNotifications);
    }

    // Sort all notifications by creation time
    allNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return Response.json({
      success: true,
      notifications: allNotifications,
      count: allNotifications.length
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
 * POST: Handle notification actions (accept, decline, counter, acknowledge)
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

    const { notificationId, action, counterPrice, message } = body;

    if (!notificationId) {
      return Response.json({ error: 'Notification ID required' }, { status: 400 });
    }

    // Handle agent decision acknowledgments
    if (action === 'acknowledge' || action === 'dismiss') {
      if (notificationId.startsWith('agent_')) {
        const agentDecisionId = notificationId.replace('agent_', '');
        const { error } = await supabase
          .from('agent_decisions')
          .update({ 
            seller_notified_at: new Date().toISOString(),
            seller_response: 'acknowledged'
          })
          .eq('id', agentDecisionId)
          .eq('seller_id', user.id);

        if (error) {
          console.error('Error acknowledging notification:', error);
          return Response.json({ error: 'Failed to acknowledge notification' }, { status: 500 });
        }

        return Response.json({ success: true, action: 'acknowledged' });
      }
    }

    // Handle accept actions
    if (action === 'accept') {
      if (notificationId.startsWith('agent_')) {
        // Accept agent recommendation (existing logic)
        const agentDecisionId = notificationId.replace('agent_', '');
        const { data: decision, error: fetchError } = await supabase
          .from('agent_decisions')
          .select(`
            negotiation_id,
            original_offer_price,
            items!inner(id, starting_price)
          `)
          .eq('id', agentDecisionId)
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
          .eq('id', agentDecisionId);

        return Response.json({ 
          success: true, 
          action: 'offer_accepted',
          finalPrice: decision.original_offer_price
        });
      } 
      
      if (notificationId.startsWith('offer_') || notificationId.startsWith('counter_')) {
        // Accept regular offer or counter-offer
        const offerId = notificationId.replace(/^(offer_|counter_)/, '');
        
        // Get offer details
        const { data: offer, error: offerError } = await supabase
          .from('offers')
          .select(`
            id,
            price,
            negotiation_id,
            negotiations!inner(
              id,
              item_id,
              buyer_id,
              seller_id,
              items!inner(id)
            )
          `)
          .eq('id', offerId)
          .single();

        if (offerError || !offer) {
          return Response.json({ error: 'Offer not found' }, { status: 404 });
        }

        // Verify user is authorized (either buyer or seller)
        if (offer.negotiations.buyer_id !== user.id && offer.negotiations.seller_id !== user.id) {
          return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Accept the offer
        const { error: updateError } = await supabase
          .from('negotiations')
          .update({
            status: 'completed',
            final_price: offer.price,
            completed_at: new Date().toISOString(),
          })
          .eq('id', offer.negotiation_id);

        if (updateError) {
          console.error('Error accepting offer:', updateError);
          return Response.json({ error: 'Failed to accept offer' }, { status: 500 });
        }

        // Mark item as sold
        await supabase
          .from('items')
          .update({
            item_status: 'sold',
            final_price: offer.price,
            sold_at: new Date().toISOString(),
          })
          .eq('id', offer.negotiations.items.id);

        return Response.json({ 
          success: true, 
          action: 'offer_accepted',
          finalPrice: offer.price
        });
      }
    }

    // Handle decline actions
    if (action === 'decline') {
      if (notificationId.startsWith('offer_') || notificationId.startsWith('counter_')) {
        const offerId = notificationId.replace(/^(offer_|counter_)/, '');
        
        // Get offer details
        const { data: offer, error: offerError } = await supabase
          .from('offers')
          .select(`
            id,
            negotiation_id,
            negotiations!inner(
              id,
              buyer_id,
              seller_id
            )
          `)
          .eq('id', offerId)
          .single();

        if (offerError || !offer) {
          return Response.json({ error: 'Offer not found' }, { status: 404 });
        }

        // Verify user is authorized
        if (offer.negotiations.buyer_id !== user.id && offer.negotiations.seller_id !== user.id) {
          return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Cancel the negotiation
        const { error: updateError } = await supabase
          .from('negotiations')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          })
          .eq('id', offer.negotiation_id);

        if (updateError) {
          console.error('Error declining offer:', updateError);
          return Response.json({ error: 'Failed to decline offer' }, { status: 500 });
        }

        return Response.json({ 
          success: true, 
          action: 'offer_declined'
        });
      }
    }

    // Handle counter actions
    if (action === 'counter') {
      if (!counterPrice || counterPrice <= 0) {
        return Response.json({ error: 'Counter price required' }, { status: 400 });
      }

      if (notificationId.startsWith('offer_') || notificationId.startsWith('counter_')) {
        const offerId = notificationId.replace(/^(offer_|counter_)/, '');
        
        // Get offer details
        const { data: offer, error: offerError } = await supabase
          .from('offers')
          .select(`
            id,
            negotiation_id,
            offer_type,
            negotiations!inner(
              id,
              buyer_id,
              seller_id,
              current_round
            )
          `)
          .eq('id', offerId)
          .single();

        if (offerError || !offer) {
          return Response.json({ error: 'Offer not found' }, { status: 404 });
        }

        // Verify user is authorized
        if (offer.negotiations.buyer_id !== user.id && offer.negotiations.seller_id !== user.id) {
          return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Determine counter offer type
        const counterOfferType = offer.offer_type === 'buyer' ? 'seller' : 'buyer';
        
        // Create counter offer using our unified offer service
        const { data: counterOffer, error: counterError } = await supabase
          .rpc('create_offer_transaction', {
            p_negotiation_id: offer.negotiation_id,
            p_offer_type: counterOfferType,
            p_user_id: user.id,
            p_price: counterPrice,
            p_message: message || '',
            p_is_counter_offer: true
          });

        if (counterError) {
          console.error('Error creating counter offer:', counterError);
          return Response.json({ error: 'Failed to create counter offer' }, { status: 500 });
        }

        return Response.json({ 
          success: true, 
          action: 'counter_offer_created',
          counterPrice: counterPrice
        });
      }
    }

    return Response.json({ error: 'Invalid action or notification type' }, { status: 400 });

  } catch (error) {
    console.error('Notification action error:', error);
    return Response.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}