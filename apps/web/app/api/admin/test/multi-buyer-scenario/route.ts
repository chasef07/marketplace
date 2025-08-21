import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export const runtime = 'edge';

/**
 * POST: Create a multi-buyer test scenario with multiple competing offers
 * This creates sample data for testing the agent's competitive analysis
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const body = await request.json();
    
    const { itemId, numBuyers = 3, baseOfferAmount = 400 } = body;

    if (!itemId) {
      return Response.json({ error: 'Item ID required' }, { status: 400 });
    }

    // Get the item to ensure it exists and has agent enabled
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return Response.json({ error: 'Item not found' }, { status: 404 });
    }

    if (!item.agent_enabled) {
      return Response.json({ error: 'Agent not enabled for this item' }, { status: 400 });
    }

    // Create test buyer profiles (using a fake user pattern)
    const testBuyers = [];
    for (let i = 1; i <= numBuyers; i++) {
      const buyerId = `test-buyer-${Date.now()}-${i}`;
      testBuyers.push({
        id: buyerId,
        username: `TestBuyer${i}`,
        offerAmount: Math.round(baseOfferAmount + (Math.random() * 100) - 50), // Vary offers by ±$50
        timeOffset: Math.floor(Math.random() * 60) // Random time within last hour
      });
    }

    // Create negotiations and offers for each test buyer
    const negotiations = [];
    const offers = [];

    for (const buyer of testBuyers) {
      // Create negotiation
      const negotiationId = `test-neg-${Date.now()}-${buyer.id}`;
      const offerCreatedAt = new Date(Date.now() - (buyer.timeOffset * 60 * 1000)).toISOString();

      negotiations.push({
        id: negotiationId,
        item_id: itemId,
        seller_id: item.seller_id,
        buyer_id: buyer.id,
        status: 'active',
        round_number: 1,
        created_at: offerCreatedAt,
        updated_at: offerCreatedAt
      });

      // Create buyer offer
      offers.push({
        id: `test-offer-${Date.now()}-${buyer.id}`,
        negotiation_id: negotiationId,
        offer_type: 'buyer',
        price: buyer.offerAmount,
        message: `Test offer from ${buyer.username}`,
        round_number: 1,
        is_counter_offer: false,
        created_at: offerCreatedAt,
        agent_generated: false
      });
    }

    // Insert test data (Note: This is for testing only - in production we'd use proper user authentication)
    const { error: negError } = await supabase
      .from('negotiations')
      .insert(negotiations);

    if (negError) {
      console.error('Error creating test negotiations:', negError);
      return Response.json({ error: 'Failed to create test negotiations' }, { status: 500 });
    }

    const { error: offerError } = await supabase
      .from('offers')
      .insert(offers);

    if (offerError) {
      console.error('Error creating test offers:', offerError);
      return Response.json({ error: 'Failed to create test offers' }, { status: 500 });
    }

    // Update item status to under_negotiation
    await supabase
      .from('items')
      .update({ item_status: 'under_negotiation' })
      .eq('id', itemId);

    // Trigger agent processing by creating entries in the processing queue
    const queueEntries = offers.map(offer => ({
      negotiation_id: offer.negotiation_id,
      offer_id: offer.id,
      seller_id: item.seller_id,
      priority: 1
    }));

    await supabase
      .from('agent_processing_queue')
      .insert(queueEntries);

    return Response.json({
      success: true,
      scenario: {
        itemId,
        itemName: item.name,
        listingPrice: item.starting_price,
        testBuyers: testBuyers.map(b => ({
          username: b.username,
          offerAmount: b.offerAmount,
          timeOffset: b.timeOffset
        })),
        negotiationsCreated: negotiations.length,
        offersCreated: offers.length,
        queueEntriesCreated: queueEntries.length
      },
      message: `Created ${numBuyers} competing offers for testing. Agent should process them automatically.`,
      nextSteps: [
        'The agent processing queue now has the offers',
        'Call POST /api/agent/monitor to trigger agent processing',
        'Check agent decisions in the seller dashboard',
        'Monitor notifications for seller recommendations'
      ]
    });

  } catch (error) {
    console.error('Multi-buyer scenario creation error:', error);
    return Response.json({
      error: 'Failed to create test scenario',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE: Clean up test scenario data
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return Response.json({ error: 'Item ID required' }, { status: 400 });
    }

    // Clean up test data (negotiations starting with test-)
    await supabase
      .from('negotiations')
      .delete()
      .like('id', 'test-neg-%')
      .eq('item_id', itemId);

    await supabase
      .from('offers')
      .delete()
      .like('id', 'test-offer-%');

    await supabase
      .from('agent_processing_queue')
      .delete()
      .like('negotiation_id', 'test-neg-%');

    await supabase
      .from('agent_decisions')
      .delete()
      .like('negotiation_id', 'test-neg-%');

    // Reset item status
    await supabase
      .from('items')
      .update({ item_status: 'active' })
      .eq('id', itemId);

    return Response.json({
      success: true,
      message: 'Test scenario cleaned up successfully'
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({
      error: 'Failed to clean up test scenario',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}