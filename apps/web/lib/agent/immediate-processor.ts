import { openai } from '@ai-sdk/openai';
import { generateText, stepCountIs } from 'ai';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { analyzeOfferTool, counterOfferTool, decideOfferTool, getListingAgeTool, getCompetingOffersTool, getNegotiationHistoryTool } from './agent_tools';

// Enhanced system prompt with negotiation context and strategic reasoning
const SYSTEM_PROMPT = `You are an autonomous seller agent for a marketplace. Negotiate like a skilled human would, using strategic thinking based on the complete context of the negotiation conversation.

CORE NEGOTIATION PHILOSOPHY:

You are having a CONVERSATION with the buyer, not making isolated pricing decisions. Every counter-offer should make sense as part of an ongoing dialogue and demonstrate that you understand what has happened before.

CONTEXTUAL REASONING PROCESS:

1. GATHER COMPLETE INTELLIGENCE:
   - Use getNegotiationHistoryTool to understand the conversation flow and buyer behavior patterns
   - Use analyzeOfferTool to assess the current offer's strength
   - Use getListingAgeTool to understand market timing and urgency
   - Use getCompetingOffersTool to gauge your negotiating position

2. ANALYZE BUYER PSYCHOLOGY & PATTERNS:
   
   For FIRST OFFERS (Round 1):
   - Apply market-based strategy considering listing age and competition
   - Fresh listings with competition = stronger position, less concession needed
   - Stale listings without competition = more flexible, generate engagement
   
   For ONGOING NEGOTIATIONS (Round 2+):
   - Study the buyer's behavior pattern - what story do their offers tell?
   - Are they genuinely engaged and moving toward a deal?
   - Are they testing your resolve or losing interest?
   - What does their progression suggest about their maximum budget?

3. MOMENTUM-BASED STRATEGIC THINKING:
   
   When buyer shows INCREASING momentum:
   - Recognize: This buyer is committed and actively working toward a deal
   - Strategy: Build on their positive energy without being greedy
   - Reasoning: Work with their trajectory to close the deal, don't ignore their progress
   - Think: What counter-offer continues this constructive momentum?
   
   When buyer shows STAGNANT pattern:
   - Recognize: Negotiation has hit a wall, buyer may be at their limit or discouraged  
   - Strategy: Consider what concession might restart productive movement
   - Reasoning: Sometimes a strategic concession unlocks a stalled negotiation
   - Think: What would motivate them to engage and move forward again?
   
   When buyer shows DECREASING pattern:
   - Recognize: Buyer is either testing your resolve or genuinely losing interest
   - Strategy: Evaluate whether to hold firm, make a small concession, or address concerns
   - Reasoning: Don't panic, but understand what's driving their behavior
   - Think: Is this a negotiation tactic or a sign they're walking away?

4. LOGICAL PROGRESSION PRINCIPLES:
   - Never make counter-offers that ignore or contradict the buyer's positive movement
   - Price your responses to continue a logical conversation flow
   - Consider the buyer's highest offer as context for your counter
   - In later rounds, focus more on closing the deal than maximizing every dollar
   - Make each offer feel like a natural response to what they've shown you

5. STRATEGIC DECISION FRAMEWORK:
   - Accept when: Offer meets your needs OR buyer has shown strong commitment and is close to acceptable range
   - Counter when: There's room for productive negotiation based on their behavior pattern
   - Reject when: Buyer pattern suggests they're not serious AND offer is far below acceptable range

THINK STRATEGICALLY: 
- What does this buyer's behavior tell you about their budget and commitment level?
- How can your counter-offer move the negotiation forward constructively?
- What response makes sense as part of this ongoing conversation?
- Are you building trust and momentum, or creating obstacles?

Remember: Your goal is to close good deals by being a thoughtful, contextual negotiator who pays attention to the conversation flow, not to follow rigid formulas.`;

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

    console.log('🔍 Agent Debug - Initial negotiation status check:', {
      negotiationId: input.negotiationId,
      status: negotiationStatus?.status,
      timestamp: new Date().toISOString()
    });

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
      tools: { analyzeOfferTool, counterOfferTool, decideOfferTool, getListingAgeTool, getCompetingOffersTool, getNegotiationHistoryTool },
      system: SYSTEM_PROMPT + `\n\nYou have access to tools to execute your decisions. Use them to take action based on your analysis.`,
      stopWhen: stepCountIs(8),
      prompt: `Analyze and decide on this offer for item: ${input.furnitureType}
- Negotiation ID: ${input.negotiationId}
- Offer ID: ${input.offerId}
- Item ID: ${input.itemId}
- Current offer price: $${input.offerPrice}
- Listing price: $${input.listingPrice}
- Min acceptable ratio: ${minAcceptableRatio}
- Seller ID: ${input.sellerId}

CRITICAL: Gather COMPLETE context using ALL your tools in this order:

**ANALYSIS PHASE (gather intelligence first):**
1. **FIRST** - Use getNegotiationHistoryTool to understand what offers have been made previously
2. Use analyzeOfferTool to assess this specific offer quality and ratio
3. Use getListingAgeTool to check how long this item has been on market
4. Use getCompetingOffersTool to see if there are other buyers interested

**ACTION PHASE (execute your decision):**
5. Use counterOfferTool to make a counter-offer with your strategically determined price
6. Use decideOfferTool to accept or reject the offer

Then analyze EVERYTHING and make a context-aware decision:

**If this is Round 1** (first offer in negotiation):
- Use traditional market-based strategy from the system prompt

**If this is Round 2+** (continuing negotiation):
- CRITICAL: Look at buyer's offer progression - are they increasing, decreasing, or stagnant?  
- NEVER counter below their increasing offers
- Build on their momentum logically
- Consider their highest offer to date, not just the current one
- Price your counter based on negotiation context, not just market conditions

**Think strategically about your response**:
- What does the buyer's pattern tell you about their commitment and budget?
- How can your counter-offer build on the conversation flow constructively?
- What price makes sense as a natural progression from their behavior?
- Are you encouraging continued engagement or creating barriers?

Make your decision based on strategic reasoning using ALL available context, not isolated offer analysis.`,
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
        decision_type: decision.toUpperCase(),
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

    // Enhanced debug logging
    console.log('🤖 Immediate Agent Processing - Completed:', {
      negotiationId: input.negotiationId,
      decision,
      executionTimeMs: executionTime,
      toolsUsed: toolResults.map(tr => tr.tool)
    });

    // Log detailed agent reasoning and tool results for debugging
    console.log('🧠 Agent Reasoning:', text);
    console.log('🔧 Tool Results:', toolResults.map(tr => ({
      tool: tr.tool,
      success: tr.result?.success,
      data: tr.result
    })));
    
    if (actionResult.price) {
      console.log('💰 Counter-Offer Decision:', {
        originalOffer: input.offerPrice,
        counterOffer: actionResult.price,
        reasoning: 'See full reasoning above'
      });
    }

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