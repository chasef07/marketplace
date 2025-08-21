import { NextRequest } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase';

// Game theory tools (simplified for background processing)
import { nashEquilibriumTool, marketAnalysisTool } from '@/src/lib/ai-tools/game-theory/nash-equilibrium';

export const runtime = 'edge';

const SYSTEM_PROMPT = `You are an autonomous seller agent. Analyze offers and make decisions to maximize seller profits using game theory.

Decision Rules:
1. ACCEPT if offer ≥ 95% of listing price OR Nash equilibrium suggests acceptance
2. COUNTER using Nash equilibrium price, rounded to nearest $5
3. DECLINE if offer is < 60% of listing price and no upward negotiation potential
4. Always maximize seller profit using market analysis

Keep reasoning brief and focus on the mathematical rationale.`;

interface AgentTask {
  queue_id: number;
  negotiation_id: number;
  offer_id: number;
  seller_id: string;
  item_id: number;
  listing_price: number;
  offer_price: number;
  furniture_type: string;
}

/**
 * Background monitoring service - processes queued offers automatically
 * This should be called periodically (every 30 seconds) to handle autonomous negotiations
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const startTime = Date.now();

    // Get next pending task from queue
    const { data: tasks, error: taskError } = await supabase
      .rpc('get_next_agent_task');

    if (taskError) {
      console.error('Failed to get agent task:', taskError);
      return Response.json({ error: 'Failed to get task' }, { status: 500 });
    }

    if (!tasks || tasks.length === 0) {
      return Response.json({ 
        message: 'No pending tasks',
        processed: 0,
        queueEmpty: true 
      });
    }

    const task: AgentTask = tasks[0];

    try {
      // Mark as processing
      await supabase
        .from('agent_processing_queue')
        .update({ status: 'processing' })
        .eq('id', task.queue_id);

      // Check if agent is enabled for this specific item
      const { data: item } = await supabase
        .from('items')
        .select('agent_enabled')
        .eq('id', task.item_id)
        .single();

      if (!item?.agent_enabled) {
        await supabase.rpc('complete_agent_task', {
          queue_id: task.queue_id,
          error_msg: 'Agent disabled for this item'
        });
        return Response.json({ message: 'Agent disabled for item', processed: 0 });
      }

      // Get seller agent profile for settings
      const { data: agentProfile } = await supabase
        .from('seller_agent_profile')
        .select('*')
        .eq('seller_id', task.seller_id)
        .single();

      // Use default settings if no profile exists
      const settings = agentProfile || {
        aggressiveness_level: 0.5,
        auto_accept_threshold: 0.95,
        min_acceptable_ratio: 0.75,
        response_delay_minutes: 0
      };

      // Get negotiation context
      const { data: negotiation } = await supabase
        .from('negotiations')
        .select(`
          *,
          offers!inner(*)
        `)
        .eq('id', task.negotiation_id)
        .single();

      if (!negotiation) {
        await supabase.rpc('complete_agent_task', {
          queue_id: task.queue_id,
          error_msg: 'Negotiation not found'
        });
        return Response.json({ error: 'Negotiation not found' }, { status: 404 });
      }

      // Check if offer is still the latest (avoid processing stale offers)
      const latestOffer = negotiation.offers
        .filter((o: any) => o.offer_type === 'buyer')
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      if (latestOffer?.id !== task.offer_id) {
        await supabase.rpc('complete_agent_task', {
          queue_id: task.queue_id,
          error_msg: 'Stale offer - newer offer exists'
        });
        return Response.json({ message: 'Stale offer', processed: 0 });
      }

      // Get all competing offers for multi-offer analysis
      const { data: competingNegotiations } = await supabase
        .from('negotiations')
        .select(`
          id,
          buyer_id,
          offers!inner(
            id,
            price,
            created_at,
            offer_type
          )
        `)
        .eq('item_id', task.item_id)
        .eq('status', 'active')
        .neq('id', task.negotiation_id);

      // Extract competing offers data for enhanced analysis
      const competingOffers = competingNegotiations?.flatMap(neg => 
        neg.offers
          .filter((o: any) => o.offer_type === 'buyer')
          .map((o: any) => ({
            id: o.id,
            buyerName: `Buyer-${neg.buyer_id.slice(-4)}`, // Anonymous buyer name
            offerPrice: parseFloat(o.price),
            hoursAgo: Math.floor((Date.now() - new Date(o.created_at).getTime()) / (1000 * 60 * 60))
          }))
      ) || [];

      const competingOffersCount = competingOffers.length;

      // Enhanced AI analysis with competitive context
      let analysisPrompt = '';
      
      if (competingOffers.length > 0) {
        // Multi-offer competitive analysis
        analysisPrompt = `Analyze this competitive negotiation scenario:

Item: ${task.furniture_type} listed at $${task.listing_price}

Current Offer Analysis:
- This offer: $${task.offer_price} (focus of decision)

Competitive Context:
- Total competing offers: ${competingOffersCount}
- All offers: ${competingOffers.map(o => `$${o.offerPrice} (${o.buyerName}, ${o.hoursAgo}h ago)`).join(', ')}
- Highest competing offer: $${Math.max(...competingOffers.map(o => o.offerPrice))}
- Average offer: $${Math.round(competingOffers.reduce((sum, o) => sum + o.offerPrice, 0) / competingOffers.length)}

Seller Agent Settings:
- Aggressiveness: ${settings.aggressiveness_level}
- Auto-accept threshold: ${settings.auto_accept_threshold}%
- Min acceptable ratio: ${settings.min_acceptable_ratio}%

Strategic Objectives:
1. Leverage competitive pressure to maximize price
2. Balance between accepting strong offers vs encouraging bidding wars
3. Consider timing - newer offers may indicate rising interest
4. Avoid losing all buyers by being too aggressive

Make strategic decision considering the full competitive landscape.`;
      } else {
        // Single offer analysis
        analysisPrompt = `Analyze this single offer:

Item: ${task.furniture_type} listed at $${task.listing_price}
Current offer: $${task.offer_price}
Competing offers: 0 (no competition)

Seller Agent Settings:
- Aggressiveness: ${settings.aggressiveness_level}
- Auto-accept threshold: ${settings.auto_accept_threshold}%
- Min acceptable ratio: ${settings.min_acceptable_ratio}%

Since there's no competition, focus on:
1. Whether offer meets minimum thresholds
2. Encouraging higher offers through strategic countering
3. Building negotiation momentum

Make decision to maximize seller profit while avoiding buyer loss.`;
      }

      const decision = await generateObject({
        model: openai('gpt-4o'),
        system: SYSTEM_PROMPT,
        prompt: analysisPrompt,
        tools: {
          nashEquilibrium: nashEquilibriumTool,
          marketAnalysis: marketAnalysisTool,
        },
        schema: z.object({
          decision: z.enum(['ACCEPT', 'COUNTER', 'DECLINE']),
          recommendedPrice: z.number().optional(),
          confidence: z.number().min(0).max(1),
          reasoning: z.string(),
          nashPrice: z.number(),
          marketValue: z.number(),
        }),
      });

      const executionTime = Date.now() - startTime;

      // Log the decision
      const { data: decisionLog, error: logError } = await supabase
        .from('agent_decisions')
        .insert({
          seller_id: task.seller_id,
          negotiation_id: task.negotiation_id,
          item_id: task.item_id,
          decision_type: decision.object.decision,
          original_offer_price: task.offer_price,
          recommended_price: decision.object.recommendedPrice || task.offer_price,
          listing_price: task.listing_price,
          nash_equilibrium_price: decision.object.nashPrice,
          confidence_score: decision.object.confidence,
          reasoning: decision.object.reasoning,
          market_conditions: {
            competingOffers: competingOffersCount || 0,
            competingOffersData: competingOffers.slice(0, 5), // Store top 5 competing offers
            highestCompetingOffer: competingOffers.length > 0 ? Math.max(...competingOffers.map(o => o.offerPrice)) : null,
            averageCompetingOffer: competingOffers.length > 0 ? Math.round(competingOffers.reduce((sum, o) => sum + o.offerPrice, 0) / competingOffers.length) : null,
            aggressivenessLevel: settings.aggressiveness_level,
            autoAcceptThreshold: settings.auto_accept_threshold,
            minAcceptableRatio: settings.min_acceptable_ratio,
            executionTimeMs: executionTime,
          },
          execution_time_ms: executionTime,
        })
        .select()
        .single();

      if (logError) {
        console.error('Failed to log decision:', logError);
      }

      // Execute the decision
      let actionResult: any = { success: true };

      if (decision.object.decision === 'ACCEPT') {
        // Accept the offer
        const { error: acceptError } = await supabase
          .from('negotiations')
          .update({
            status: 'completed',
            final_price: task.offer_price,
            completed_at: new Date().toISOString(),
          })
          .eq('id', task.negotiation_id);

        if (!acceptError) {
          // Mark item as sold
          await supabase
            .from('items')
            .update({
              item_status: 'sold',
              final_price: task.offer_price,
              buyer_id: negotiation.buyer_id,
              sold_at: new Date().toISOString(),
            })
            .eq('id', task.item_id);

          actionResult = { success: true, action: 'ACCEPTED', price: task.offer_price };
        } else {
          actionResult = { success: false, error: acceptError.message };
        }

      } else if (decision.object.decision === 'COUNTER' && decision.object.recommendedPrice) {
        // Create counter offer
        const counterPrice = Math.round(decision.object.recommendedPrice / 5) * 5; // Round to $5

        const { error: counterError } = await supabase
          .from('offers')
          .insert({
            negotiation_id: task.negotiation_id,
            offer_type: 'seller',
            price: counterPrice,
            message: `Counter offer: $${counterPrice}`,
            agent_generated: true,
            agent_decision_id: decisionLog?.id,
          });

        actionResult = { 
          success: !counterError, 
          action: 'COUNTERED', 
          price: counterPrice,
          error: counterError?.message 
        };

      } else if (decision.object.decision === 'DECLINE') {
        // Decline the offer
        await supabase
          .from('negotiations')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', task.negotiation_id);

        actionResult = { success: true, action: 'DECLINED' };
      }

      // Mark task as completed
      await supabase.rpc('complete_agent_task', {
        queue_id: task.queue_id,
        decision_id: decisionLog?.id
      });

      return Response.json({
        success: true,
        processed: 1,
        task: {
          negotiationId: task.negotiation_id,
          itemId: task.item_id,
          decision: decision.object.decision,
          confidence: decision.object.confidence,
          reasoning: decision.object.reasoning,
          actionResult,
          executionTimeMs: executionTime,
          competitiveAnalysis: {
            competingOffersCount,
            highestCompetingOffer: competingOffers.length > 0 ? Math.max(...competingOffers.map(o => o.offerPrice)) : null,
            averageCompetingOffer: competingOffers.length > 0 ? Math.round(competingOffers.reduce((sum, o) => sum + o.offerPrice, 0) / competingOffers.length) : null,
            isCompetitiveScenario: competingOffers.length > 0
          }
        }
      });

    } catch (error) {
      console.error('Agent processing error:', error);
      
      // Mark task as failed
      await supabase.rpc('complete_agent_task', {
        queue_id: task.queue_id,
        error_msg: error instanceof Error ? error.message : 'Unknown error'
      });

      return Response.json({
        success: false,
        error: 'Processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        task: {
          negotiationId: task.negotiation_id,
          itemId: task.item_id,
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Agent monitor error:', error);
    return Response.json({
      error: 'Monitor service failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check monitoring service status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // Get queue status
    const { data: queueStats } = await supabase
      .from('agent_processing_queue')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    queueStats?.forEach((item: any) => {
      stats[item.status as keyof typeof stats]++;
    });

    // Get recent decision count
    const { count: recentDecisions } = await supabase
      .from('agent_decisions')
      .select('id', { count: 'exact' })
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

    return Response.json({
      status: 'operational',
      queueStats: stats,
      recentDecisions: recentDecisions || 0,
      lastCheck: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Monitor status error:', error);
    return Response.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}