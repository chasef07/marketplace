import { openai } from '@ai-sdk/openai';
import { generateText, stepCountIs } from 'ai';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { analyzeOfferTool, counterOfferTool, decideOfferTool, getListingAgeTool, getCompetingOffersTool } from './agent_tools';

// Enhanced system prompt with market context and human-like negotiation
const SYSTEM_PROMPT = `You are an autonomous seller agent for a marketplace. Negotiate like a real person would, using market context to make smart decisions.

NEGOTIATION STRATEGY:
1. First, gather context:
   - Use analyzeOfferTool to assess the offer quality (assessment, ratio, lowball status)
   - Use getListingAgeTool to understand time on market  
   - Use getCompetingOffersTool to see competition level

2. Think like a human seller and decide YOUR OWN counter price:
   - Fresh listings (≤7 days) with competition: Be firm, counter closer to asking price (90-95%)
   - Stale listings (>21 days) with no competition: Be flexible, counter more aggressively (80-87%)  
   - High competing offers: You have leverage, don't discount much (92-96%)
   - No competing offers: Consider reasonable counters to generate interest (82-88%)

3. Counter-offer examples (decide your own price based on context):
   - $1200 item, $900 offer (75%): Fresh + competition = counter $1080-1140 | Stale + no competition = counter $960-1044
   - $800 item, $600 offer (75%): Fresh + competition = counter $720-760 | Stale + no competition = counter $640-696
   - YOU decide the exact price based on all gathered context, not pre-calculated suggestions


4. Decision guidelines:
   - Accept: 95%+ of asking price or exceptional circumstances
   - Counter: 50-94% of asking price, use market context for amount
   - Reject: <50% of asking price AND no urgency to sell

Use your tools for context, then negotiate strategically like a real person would.`;

export interface ImmediateProcessorInput {
  negotiationId: number;
  offerId: number;
  sellerId: string;
  itemId: number;
  listingPrice: number;
  offerPrice: number;
  furnitureType: string;
  minAcceptableRatio?: number;
}

export interface ImmediateProcessorResult {
  success: boolean;
  decision: string;
  reasoning: string;
  actionResult: {
    success: boolean;
    action: string;
    price?: number;
    error?: string;
  };
  executionTimeMs: number;
  toolResults: Array<{
    tool: string;
    success?: boolean;
    details: any;
  }>;
  error?: string;
}

/**
 * Process an offer immediately with AI agent decision making
 * No queue system - direct, real-time processing
 */
export async function processOfferImmediately(input: ImmediateProcessorInput): Promise<ImmediateProcessorResult> {
  const startTime = Date.now();
  const supabase = createSupabaseServerClient();

  console.log('🤖 Immediate Agent Processing - Started:', {
    negotiationId: input.negotiationId,
    offerId: input.offerId,
    offerPrice: input.offerPrice,
    listingPrice: input.listingPrice
  });

  try {
    // Verify negotiation is still active
    const { data: negotiationStatus } = await supabase
      .from('negotiations')
      .select('status')
      .eq('id', input.negotiationId)
      .single();

    if (!negotiationStatus || negotiationStatus.status !== 'active') {
      return {
        success: false,
        decision: 'error',
        reasoning: `Negotiation is ${negotiationStatus?.status || 'not found'}`,
        actionResult: { success: false, action: 'FAILED', error: 'Negotiation not active' },
        executionTimeMs: Date.now() - startTime,
        toolResults: [],
        error: 'Negotiation not active'
      };
    }

    // Check if agent is enabled for item
    const { data: item } = await supabase
      .from('items')
      .select('agent_enabled')
      .eq('id', input.itemId)
      .single();

    if (!item?.agent_enabled) {
      return {
        success: false,
        decision: 'disabled',
        reasoning: 'Agent is disabled for this item',
        actionResult: { success: false, action: 'DISABLED', error: 'Agent disabled' },
        executionTimeMs: Date.now() - startTime,
        toolResults: [],
        error: 'Agent disabled'
      };
    }

    // Get seller agent profile for min acceptable ratio
    const { data: agentProfile } = await supabase
      .from('seller_agent_profile')
      .select('min_acceptable_ratio')
      .eq('seller_id', input.sellerId)
      .single();

    const minAcceptableRatio = input.minAcceptableRatio || agentProfile?.min_acceptable_ratio || 0.75;

    // AI reasoning and execution with tools
    const { text, steps } = await generateText({
      model: openai('gpt-4o-mini'),
      tools: { analyzeOfferTool, counterOfferTool, decideOfferTool, getListingAgeTool, getCompetingOffersTool },
      system: SYSTEM_PROMPT + `\n\nYou have access to tools to execute your decisions. Use them to take action based on your analysis.`,
      stopWhen: stepCountIs(8),
      prompt: `Analyze and decide on this offer for item: ${input.furnitureType}
- Negotiation ID: ${input.negotiationId}
- Offer ID: ${input.offerId}
- Item ID: ${input.itemId}
- Offer price: $${input.offerPrice}
- Listing price: $${input.listingPrice}
- Min acceptable ratio: ${minAcceptableRatio}
- Seller ID: ${input.sellerId}

First, gather market context using your tools:
1. Use getListingAgeTool to check how long this item has been on market
2. Use getCompetingOffersTool to see if there are other buyers interested
3. Use analyzeOfferTool to assess the offer quality and ratio

Then analyze ALL the context and decide YOUR OWN counter price (if countering) based on:
- Listing age (fresh vs stale)  
- Competition level (high vs none)
- Offer quality (strong vs weak vs lowball)
- Market position and seller leverage

Take appropriate action (accept, counter with YOUR chosen price, or reject) based on the full context.`,
    });

    const executionTime = Date.now() - startTime;

    // Extract tool results from AI execution steps
    const toolResults = steps
      .filter((step): step is any => 'toolResults' in step && Array.isArray(step.toolResults))
      .flatMap(step => step.toolResults)
      .map((toolResult: any) => ({
        tool: toolResult.toolName,
        result: toolResult.result
      }));

    // Determine overall decision from tool results
    let decision = 'analyzed';
    let actionResult: any = { success: true, action: 'ANALYZED' };

    if (toolResults.some(tr => tr.tool === 'counterOfferTool')) {
      decision = 'counter';
      const counterResult = toolResults.find(tr => tr.tool === 'counterOfferTool')?.result;
      actionResult = { 
        success: counterResult?.success || false, 
        action: 'COUNTERED',
        price: counterResult?.counterAmount,
        error: counterResult?.error
      };
    } else if (toolResults.some(tr => tr.tool === 'decideOfferTool')) {
      const decideResult = toolResults.find(tr => tr.tool === 'decideOfferTool')?.result;
      if (decideResult?.newStatus === 'Accepted') {
        decision = 'accept';
        actionResult = { success: decideResult.success, action: 'ACCEPTED' };
      } else if (decideResult?.newStatus === 'Rejected') {
        decision = 'reject';
        actionResult = { success: decideResult.success, action: 'REJECTED' };
      }
    }

    // Log decision to Supabase
    const analysisResult = toolResults.find(tr => tr.tool === 'analyzeOfferTool')?.result;
    const { data: decisionLog, error: logError } = await supabase
      .from('agent_decisions')
      .insert({
        seller_id: input.sellerId,
        negotiation_id: input.negotiationId,
        item_id: input.itemId,
        decision_type: decision,
        original_offer_price: input.offerPrice,
        recommended_price: actionResult.price || input.offerPrice,
        listing_price: input.listingPrice,
        confidence_score: analysisResult?.isLowball ? 0.9 : 0.7,
        reasoning: text,
        market_conditions: {
          minAcceptableRatio,
          executionTimeMs: executionTime,
          toolResults: toolResults.map(tr => ({ tool: tr.tool, success: tr.result?.success })),
          analysis: analysisResult,
          immediate: true // Mark as immediate processing
        },
        execution_time_ms: executionTime,
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to log agent decision:', logError);
    }

    console.log('🤖 Immediate Agent Processing - Completed:', {
      negotiationId: input.negotiationId,
      decision,
      executionTimeMs: executionTime,
      toolsUsed: toolResults.map(tr => tr.tool)
    });

    return {
      success: true,
      decision,
      reasoning: text,
      actionResult,
      executionTimeMs: executionTime,
      toolResults: toolResults.map(tr => ({
        tool: tr.tool,
        success: tr.result?.success,
        details: tr.result
      }))
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('🤖 Immediate Agent Processing - Error:', {
      negotiationId: input.negotiationId,
      error: errorMessage,
      executionTimeMs: executionTime
    });

    return {
      success: false,
      decision: 'error',
      reasoning: `Processing failed: ${errorMessage}`,
      actionResult: { success: false, action: 'FAILED', error: errorMessage },
      executionTimeMs: executionTime,
      toolResults: [],
      error: errorMessage
    };
  }
}