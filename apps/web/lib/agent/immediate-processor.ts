import { openai } from '@ai-sdk/openai';
import { generateText, stepCountIs } from 'ai';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { analyzeOfferTool, counterOfferTool, decideOfferTool } from './agent_tools';

// Simplified system prompt for immediate negotiation response
const SYSTEM_PROMPT = `You are an autonomous seller agent for a marketplace. Your goal is to analyze offers, detect lowballs, and decide to accept, counter, or reject in real-time. Follow these steps:

1. Use analyzeOfferTool to assess the offer (lowball if <70% of list price).
2. Reason through the decision:
   - Accept if offer >= 95% of list price OR meets seller's minimum acceptable ratio.
   - Reject if lowball (<70%) or below seller's minimum acceptable threshold.
   - Counter otherwise, using suggestedCounter from analyzeOfferTool.
3. Use counterOfferTool or decideOfferTool to execute your decision immediately.

Be decisive and professional in your negotiation approach.`;

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
      tools: { analyzeOfferTool, counterOfferTool, decideOfferTool },
      system: SYSTEM_PROMPT + `\n\nYou have access to tools to execute your decisions. Use them to take action based on your analysis.`,
      stopWhen: stepCountIs(5),
      prompt: `Analyze and decide on this offer for item: ${input.furnitureType}
- Negotiation ID: ${input.negotiationId}
- Offer ID: ${input.offerId}
- Offer price: $${input.offerPrice}
- Listing price: $${input.listingPrice}
- Min acceptable ratio: ${minAcceptableRatio}
- Seller ID: ${input.sellerId}

Analyze the offer and take appropriate action (accept, counter, or reject) immediately.`,
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