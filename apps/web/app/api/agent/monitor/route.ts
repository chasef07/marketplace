import { NextRequest } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { offerService } from '@/lib/services/offer-service';

// Game theory tools now implemented inline

export const runtime = 'edge';

const SYSTEM_PROMPT = `You are an autonomous seller agent. Analyze offers with full negotiation context to make intelligent counter-offers that close deals.

Decision Rules (In Order of Priority):
1. ANALYZE negotiation history and buyer momentum before making decisions
2. ACCEPT if offer ≥ 95% of listing price OR reasonable in context of negotiation progression
3. COUNTER with incremental increases based on Nash equilibrium price - NEVER dramatic jumps
4. If buyer is trending UP, use counters to maintain momentum
5. If buyer is trending DOWN, hold firm or decline - don't chase with big counters
6. DECLINE if offer < 60% of listing AND buyer shows no upward movement
7. In rounds 5+, be more accepting of reasonable offers to close deals

CRITICAL: Counter offers must respect negotiation psychology. A buyer offering $205 after $200 shows positive momentum - counter around $210-$215, NOT $250.

Keep reasoning brief and justify based on negotiation context and buyer behavior patterns.`;

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

      // Check negotiation status first - if not active, remove from queue
      const { data: negotiationStatus } = await supabase
        .from('negotiations')
        .select('status')
        .eq('id', task.negotiation_id)
        .single();

      if (!negotiationStatus || negotiationStatus.status !== 'active') {
        await supabase.rpc('complete_agent_task', {
          queue_id: task.queue_id,
          error_msg: `Negotiation is ${negotiationStatus?.status || 'not found'} - removing from queue`
        });
        console.log(`🧹 Cleaned up queue entry for ${negotiationStatus?.status || 'missing'} negotiation ${task.negotiation_id}`);
        return Response.json({ 
          message: `Negotiation is ${negotiationStatus?.status || 'not found'}`, 
          processed: 0,
          cleaned: true 
        });
      }

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

      // Get negotiation context with full offer history
      const { data: fullNegotiation } = await supabase
        .from('negotiations')
        .select(`
          *,
          offers!inner(*)
        `)
        .eq('id', task.negotiation_id)
        .single();

      if (!fullNegotiation) {
        await supabase.rpc('complete_agent_task', {
          queue_id: task.queue_id,
          error_msg: 'Negotiation not found'
        });
        return Response.json({ error: 'Negotiation not found' }, { status: 404 });
      }

      // Get complete negotiation history for context-aware decisions
      const { data: negotiationHistory } = await supabase
        .from('offers')
        .select('*')
        .eq('negotiation_id', task.negotiation_id)
        .order('created_at', { ascending: true });

      const offerHistory = negotiationHistory || [];
      const currentRound = offerHistory.length;
      
      // Analyze negotiation momentum
      const buyerOffers = offerHistory.filter(o => o.offer_type === 'buyer');
      
      let negotiationMomentum = 'neutral';
      let priceDirection = 'stable';
      
      if (buyerOffers.length >= 2) {
        const lastBuyerOffer = buyerOffers[buyerOffers.length - 1].price;
        const prevBuyerOffer = buyerOffers[buyerOffers.length - 2].price;
        
        if (lastBuyerOffer > prevBuyerOffer) {
          negotiationMomentum = 'positive';
          priceDirection = 'increasing';
        } else if (lastBuyerOffer < prevBuyerOffer) {
          negotiationMomentum = 'negative';
          priceDirection = 'decreasing';
        }
      }

      // Check if offer is still the latest (avoid processing stale offers)
      const latestOffer = fullNegotiation.offers
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

      // Enhanced AI analysis with negotiation history and competitive context
      const historyTimeline = offerHistory.map((offer, index) => 
        `Round ${index + 1}: ${offer.offer_type} offered $${offer.price} (${new Date(offer.created_at).toLocaleString()})`
      ).join('\n');

      let analysisPrompt = '';
      
      if (competingOffers.length > 0) {
        // Multi-offer competitive analysis
        analysisPrompt = `Analyze this competitive negotiation scenario with full context:

Item: ${task.furniture_type} listed at $${task.listing_price}

NEGOTIATION HISTORY (Critical Context):
${historyTimeline}

Current Analysis:
- Round: ${currentRound}
- Current offer: $${task.offer_price}
- Momentum: ${negotiationMomentum} (buyer prices are ${priceDirection})
- Price trajectory: ${buyerOffers.map(o => `$${o.price}`).join(' → ')}

Competitive Context:
- Total competing offers: ${competingOffersCount}
- All offers: ${competingOffers.map(o => `$${o.offerPrice} (${o.buyerName}, ${o.hoursAgo}h ago)`).join(', ')}
- Highest competing offer: $${Math.max(...competingOffers.map(o => o.offerPrice))}
- Average offer: $${Math.round(competingOffers.reduce((sum, o) => sum + o.offerPrice, 0) / competingOffers.length)}

Seller Agent Settings:
- Aggressiveness: ${settings.aggressiveness_level}
- Auto-accept threshold: ${settings.auto_accept_threshold}%
- Min acceptable ratio: ${settings.min_acceptable_ratio}%

CRITICAL RULES:
1. Counter offers should be incremental (5-15% above buyer's offer)
2. If buyer is trending up, use smaller counters to encourage momentum
3. If buyer is trending down, consider accepting or declining
4. Never make dramatic price jumps that break negotiation flow
5. Consider round fatigue - accept reasonable offers in later rounds

Make strategic decision considering negotiation psychology and momentum.`;
      } else {
        // Single offer analysis with history context
        analysisPrompt = `Analyze this negotiation with full historical context:

Item: ${task.furniture_type} listed at $${task.listing_price}

NEGOTIATION HISTORY (Critical Context):
${historyTimeline}

Current Analysis:
- Round: ${currentRound}
- Current offer: $${task.offer_price}
- Momentum: ${negotiationMomentum} (buyer prices are ${priceDirection})
- Price trajectory: ${buyerOffers.map(o => `$${o.price}`).join(' → ')}
- Competing offers: 0 (no competition)

Seller Agent Settings:
- Aggressiveness: ${settings.aggressiveness_level}
- Auto-accept threshold: ${settings.auto_accept_threshold}%
- Min acceptable ratio: ${settings.min_acceptable_ratio}%

CRITICAL RULES:
1. Counter offers should be incremental (5-15% above buyer's offer)
2. If buyer is trending up, use SMALLER counters to encourage continued movement
3. If buyer is trending down, hold firm or consider declining
4. Never make dramatic price jumps that break negotiation flow
5. In later rounds (5+), be more accepting of reasonable offers
6. Build on negotiation momentum - don't restart price discovery

Make decision based on buyer's demonstrated behavior and negotiation psychology.`;
      }

      const decision = await generateText({
        model: openai('gpt-4o'),
        system: SYSTEM_PROMPT,
        prompt: analysisPrompt + `

Please respond with a JSON object containing:
- decision: "ACCEPT", "COUNTER", or "DECLINE"
- recommendedPrice: number (required if COUNTER)
- confidence: number between 0 and 1
- reasoning: string explanation
- nashPrice: number (estimated Nash equilibrium price)
- marketValue: number (estimated market value)
- negotiationContext: object with currentRound, momentum, priceDirection, historyConsidered`,
        tools: {
          nashEquilibrium: tool({
            description: 'Calculate Nash equilibrium price for negotiation',
            inputSchema: z.object({
              sellerTargetPrice: z.number(),
              buyerOfferPrice: z.number(),
              estimatedBuyerMax: z.number(),
            }),
            execute: async ({ sellerTargetPrice, buyerOfferPrice, estimatedBuyerMax }) => {
              // Simple Nash equilibrium calculation
              const equilibrium = (sellerTargetPrice + estimatedBuyerMax) / 2;
              return {
                equilibriumPrice: Math.round(equilibrium),
                confidence: Math.abs(buyerOfferPrice - equilibrium) / equilibrium < 0.1 ? 0.8 : 0.6
              };
            }
          })
        },
      });

      const executionTime = Date.now() - startTime;

      // Parse the JSON response from generateText
      let parsedDecision;
      try {
        parsedDecision = JSON.parse(decision.text);
      } catch (error) {
        console.error('Failed to parse AI decision:', decision.text);
        throw new Error('Invalid AI response format');
      }

      // CRITICAL: Validate decision to prevent unreasonable counter offers
      const validatedDecision = { ...parsedDecision };
      let validationWarning = '';

      if (validatedDecision.decision === 'COUNTER' && validatedDecision.recommendedPrice) {
        const counterPrice = validatedDecision.recommendedPrice;
        const offerPrice = task.offer_price;
        const increasePercentage = ((counterPrice - offerPrice) / offerPrice) * 100;

        // Prevent dramatic price jumps
        if (increasePercentage > 25) {
          // Cap the counter offer to a reasonable increase
          const maxReasonableCounter = Math.min(
            offerPrice * 1.15, // Max 15% increase
            (offerPrice + task.listing_price) / 2 // Or split the difference
          );
          
          validatedDecision.recommendedPrice = Math.round(maxReasonableCounter / 5) * 5; // Round to $5
          validationWarning = `Original AI suggestion of $${counterPrice} (${increasePercentage.toFixed(1)}% increase) was too aggressive. Capped at $${validatedDecision.recommendedPrice}.`;
          
          validatedDecision.reasoning += ` [VALIDATION: Counter capped to prevent dramatic jump that could kill negotiation momentum.]`;
        }

        // If buyer is trending up, use smaller counters
        if (negotiationMomentum === 'positive' && increasePercentage > 15) {
          const conservativeCounter = offerPrice * 1.08; // Only 8% increase for positive momentum
          validatedDecision.recommendedPrice = Math.round(conservativeCounter / 5) * 5;
          validationWarning = `Buyer trending up - using smaller counter of $${validatedDecision.recommendedPrice} to maintain momentum.`;
          
          validatedDecision.reasoning += ` [VALIDATION: Smaller counter due to positive buyer momentum.]`;
        }
      }

      // Log the decision with validation info
      const { data: decisionLog, error: logError } = await supabase
        .from('agent_decisions')
        .insert({
          seller_id: task.seller_id,
          negotiation_id: task.negotiation_id,
          item_id: task.item_id,
          decision_type: validatedDecision.decision,
          original_offer_price: task.offer_price,
          recommended_price: validatedDecision.recommendedPrice || task.offer_price,
          listing_price: task.listing_price,
          nash_equilibrium_price: validatedDecision.nashPrice,
          confidence_score: validatedDecision.confidence,
          reasoning: validatedDecision.reasoning,
          market_conditions: {
            competingOffers: competingOffersCount || 0,
            competingOffersData: competingOffers.slice(0, 5),
            highestCompetingOffer: competingOffers.length > 0 ? Math.max(...competingOffers.map(o => o.offerPrice)) : null,
            averageCompetingOffer: competingOffers.length > 0 ? Math.round(competingOffers.reduce((sum, o) => sum + o.offerPrice, 0) / competingOffers.length) : null,
            aggressivenessLevel: settings.aggressiveness_level,
            autoAcceptThreshold: settings.auto_accept_threshold,
            minAcceptableRatio: settings.min_acceptable_ratio,
            executionTimeMs: executionTime,
            negotiationHistory: offerHistory.length,
            currentRound: currentRound,
            momentum: negotiationMomentum,
            priceDirection: priceDirection,
            validationWarning: validationWarning || null
          },
          execution_time_ms: executionTime,
        })
        .select()
        .single();

      if (logError) {
        console.error('Failed to log decision:', logError);
      }

      // Execute the decision using validated decision
      let actionResult: any = { success: true };

      if (validatedDecision.decision === 'ACCEPT') {
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
              buyer_id: fullNegotiation.buyer_id,
              sold_at: new Date().toISOString(),
            })
            .eq('id', task.item_id);

          actionResult = { success: true, action: 'ACCEPTED', price: task.offer_price };
        } else {
          actionResult = { success: false, error: acceptError.message };
        }

      } else if (validatedDecision.decision === 'COUNTER' && validatedDecision.recommendedPrice) {
        // Create counter offer using validated price
        const counterPrice = Math.round(validatedDecision.recommendedPrice / 5) * 5; // Round to $5

        // Double-check negotiation status before creating offer (race condition protection)
        const { data: freshNegotiation } = await supabase
          .from('negotiations')
          .select('status')
          .eq('id', task.negotiation_id)
          .single();

        if (!freshNegotiation || freshNegotiation.status !== 'active') {
          console.log(`🚫 Negotiation ${task.negotiation_id} status changed to ${freshNegotiation?.status || 'missing'} before counter offer creation`);
          actionResult = { 
            success: false, 
            action: 'FAILED', 
            error: `Negotiation became ${freshNegotiation?.status || 'missing'} before counter offer` 
          };
        } else {
          // Use unified offer service for agent counter offers
          const result = await offerService.createOffer({
            negotiationId: task.negotiation_id,
            offerType: 'seller',
            price: counterPrice,
            message: `Counter offer: $${counterPrice}`,
            isCounterOffer: true,
            isMessageOnly: false,
            agentGenerated: true,
            agentDecisionId: decisionLog?.id,
            userId: task.seller_id
          });

          if (!result.success) {
            console.error(`💥 Agent offer creation failed for negotiation ${task.negotiation_id}:`, 'error' in result ? result.error : 'Unknown error');
          }

          actionResult = { 
            success: result.success, 
            action: 'COUNTERED', 
            price: counterPrice,
            error: result.success ? undefined : ('error' in result ? result.error : 'Unknown error')
          };
        }

      } else if (validatedDecision.decision === 'DECLINE') {
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
          decision: validatedDecision.decision,
          confidence: validatedDecision.confidence,
          reasoning: validatedDecision.reasoning,
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