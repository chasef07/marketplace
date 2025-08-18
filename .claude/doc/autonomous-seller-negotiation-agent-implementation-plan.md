# Autonomous Seller Negotiation Agent - Vercel AI SDK v5 Implementation Plan

## Overview

This plan outlines the implementation of an autonomous seller negotiation agent using Vercel AI SDK v5 with tool calling capabilities on Edge runtime. The agent will leverage game theory calculations, market analysis, and autonomous decision-making to handle negotiations without human intervention while providing critical-only notifications to sellers.

## Architecture Overview

### Core Components
1. **Edge Runtime API Endpoint** - Fast response times with `runtime = 'edge'`
2. **Game Theory Tools** - Nash equilibrium, auction theory, market analysis calculations
3. **Supabase Integration** - Real-time negotiation data access and updates
4. **Autonomous Decision Engine** - Rule-based decision making with AI assistance
5. **Notification System** - Critical-only seller notifications
6. **Rate Limiting** - Upstash Redis integration for API protection

### Technology Stack
- **AI Framework**: Vercel AI SDK v5 with tool calling
- **Runtime**: Vercel Edge Runtime for sub-100ms response times
- **Model**: OpenAI GPT-4o for decision making and analysis
- **Database**: Existing Supabase PostgreSQL with real-time subscriptions
- **Validation**: Zod schemas for type-safe tool inputs/outputs
- **Caching**: Redis for rate limiting and caching calculations

## Implementation Plan

### Phase 1: Dependencies and Setup

#### 1.1 Install Required Dependencies

```bash
cd apps/web
npm install ai@latest @ai-sdk/openai@latest zod@latest
```

**Rationale**: 
- `ai@latest` - Vercel AI SDK v5 core package
- `@ai-sdk/openai@latest` - OpenAI provider for AI SDK v5
- `zod@latest` - Schema validation for tool inputs/outputs

#### 1.2 Environment Variables

Add to `apps/web/.env.local`:
```env
# Existing variables remain
OPENAI_API_KEY=your_openai_api_key
AUTONOMOUS_AGENT_ENABLED=true
AGENT_DECISION_THRESHOLD=0.8
AGENT_MAX_COUNTER_OFFERS=3
AGENT_MIN_PROFIT_MARGIN=0.15
```

### Phase 2: Tool Definitions with Game Theory

#### 2.1 Create Game Theory Tools Directory

**File Structure**:
```
apps/web/src/lib/ai-tools/
├── game-theory/
│   ├── nash-equilibrium.ts
│   ├── auction-theory.ts
│   ├── market-analysis.ts
│   └── negotiation-strategies.ts
├── negotiation/
│   ├── decision-engine.ts
│   ├── offer-evaluation.ts
│   └── counter-offer-generation.ts
└── index.ts
```

#### 2.2 Nash Equilibrium Tool (`apps/web/src/lib/ai-tools/game-theory/nash-equilibrium.ts`)

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const nashEquilibriumTool = tool({
  description: 'Calculate Nash equilibrium for buyer-seller negotiation scenarios',
  inputSchema: z.object({
    sellerMinPrice: z.number().positive().describe('Seller minimum acceptable price'),
    sellerMaxPrice: z.number().positive().describe('Seller starting/maximum price'),
    buyerMaxPrice: z.number().positive().describe('Buyer maximum willingness to pay'),
    buyerOfferPrice: z.number().positive().describe('Current buyer offer price'),
    marketValue: z.number().positive().describe('Estimated market value of item'),
    negotiationRound: z.number().int().min(1).describe('Current negotiation round'),
    timeUrgency: z.number().min(0).max(1).describe('Seller urgency factor (0-1)'),
  }),
  execute: async ({
    sellerMinPrice,
    sellerMaxPrice,
    buyerMaxPrice,
    buyerOfferPrice,
    marketValue,
    negotiationRound,
    timeUrgency,
  }) => {
    // Nash equilibrium calculation
    const sellerReservationValue = sellerMinPrice;
    const buyerReservationValue = buyerMaxPrice;
    
    // Calculate bargaining zone
    const bargainingZone = buyerReservationValue - sellerReservationValue;
    
    if (bargainingZone <= 0) {
      return {
        equilibriumExists: false,
        recommendedAction: 'reject',
        equilibriumPrice: null,
        bargainingPower: { seller: 0.5, buyer: 0.5 },
        explanation: 'No mutually beneficial zone exists',
      };
    }
    
    // Calculate bargaining power based on multiple factors
    const urgencyFactor = timeUrgency; // Higher urgency = lower seller power
    const marketPositionFactor = Math.min(marketValue / sellerMaxPrice, 1.5); // Above market = higher power
    const negotiationProgressFactor = Math.max(0.2, 1 - (negotiationRound * 0.15)); // Decreasing power over rounds
    
    const sellerBargainingPower = (1 - urgencyFactor) * marketPositionFactor * negotiationProgressFactor;
    const normalizedSellerPower = Math.max(0.1, Math.min(0.9, sellerBargainingPower));
    const buyerPower = 1 - normalizedSellerPower;
    
    // Nash equilibrium price using bargaining power
    const equilibriumPrice = sellerReservationValue + (bargainingZone * normalizedSellerPower);
    
    // Evaluate current offer against equilibrium
    const offerDeviation = Math.abs(buyerOfferPrice - equilibriumPrice) / equilibriumPrice;
    
    let recommendedAction: 'accept' | 'counter' | 'reject';
    if (buyerOfferPrice >= sellerMinPrice && offerDeviation <= 0.1) {
      recommendedAction = 'accept';
    } else if (buyerOfferPrice >= sellerMinPrice * 0.9) {
      recommendedAction = 'counter';
    } else {
      recommendedAction = 'reject';
    }
    
    return {
      equilibriumExists: true,
      equilibriumPrice: Math.round(equilibriumPrice * 100) / 100,
      recommendedAction,
      bargainingPower: {
        seller: Math.round(normalizedSellerPower * 100) / 100,
        buyer: Math.round(buyerPower * 100) / 100,
      },
      bargainingZone: Math.round(bargainingZone * 100) / 100,
      offerDeviation: Math.round(offerDeviation * 100) / 100,
      explanation: `Equilibrium at $${equilibriumPrice.toFixed(2)} based on ${Math.round(normalizedSellerPower * 100)}% seller bargaining power`,
    };
  },
});
```

#### 2.3 Market Analysis Tool (`apps/web/src/lib/ai-tools/game-theory/market-analysis.ts`)

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const marketAnalysisTool = tool({
  description: 'Analyze market conditions and pricing strategies for furniture items',
  inputSchema: z.object({
    itemType: z.enum(['couch', 'dining_table', 'bookshelf', 'chair', 'desk', 'bed', 'dresser', 'coffee_table', 'nightstand', 'cabinet', 'other']),
    currentPrice: z.number().positive().describe('Current asking price'),
    originalPrice: z.number().positive().describe('Original retail price if known'),
    condition: z.enum(['excellent', 'good', 'fair', 'poor']).describe('Item condition'),
    ageInMonths: z.number().min(0).describe('Age of item in months'),
    locationZip: z.string().optional().describe('Zip code for local market analysis'),
    similarListings: z.array(z.object({
      price: z.number(),
      condition: z.string(),
      ageInMonths: z.number(),
    })).optional().describe('Comparable listings data'),
  }),
  execute: async ({
    itemType,
    currentPrice,
    originalPrice,
    condition,
    ageInMonths,
    locationZip,
    similarListings = [],
  }) => {
    // Depreciation calculation based on furniture type
    const depreciationRates = {
      couch: 0.20, // 20% per year
      dining_table: 0.15,
      bookshelf: 0.10,
      chair: 0.25,
      desk: 0.18,
      bed: 0.22,
      dresser: 0.15,
      coffee_table: 0.20,
      nightstand: 0.18,
      cabinet: 0.12,
      other: 0.20,
    };
    
    const annualDepreciation = depreciationRates[itemType];
    const monthlyDepreciation = annualDepreciation / 12;
    const totalDepreciation = Math.min(0.8, ageInMonths * monthlyDepreciation); // Cap at 80%
    
    // Condition multipliers
    const conditionMultipliers = {
      excellent: 1.0,
      good: 0.85,
      fair: 0.65,
      poor: 0.45,
    };
    
    const conditionMultiplier = conditionMultipliers[condition];
    
    // Calculate estimated market value
    const deprecatedValue = originalPrice * (1 - totalDepreciation);
    const conditionAdjustedValue = deprecatedValue * conditionMultiplier;
    
    // Analyze similar listings if provided
    let marketComparison = null;
    if (similarListings.length > 0) {
      const avgMarketPrice = similarListings.reduce((sum, listing) => sum + listing.price, 0) / similarListings.length;
      const priceVsMarket = (currentPrice - avgMarketPrice) / avgMarketPrice;
      
      marketComparison = {
        averageMarketPrice: Math.round(avgMarketPrice * 100) / 100,
        priceVsMarket: Math.round(priceVsMarket * 100) / 100,
        competitiveness: priceVsMarket < -0.1 ? 'aggressive' : priceVsMarket > 0.1 ? 'premium' : 'competitive',
      };
    }
    
    // Price recommendation
    const estimatedValue = conditionAdjustedValue;
    const pricingStrategy = currentPrice / estimatedValue;
    
    let recommendation: 'reduce_price' | 'maintain_price' | 'increase_price';
    if (pricingStrategy > 1.2) {
      recommendation = 'reduce_price';
    } else if (pricingStrategy < 0.9) {
      recommendation = 'increase_price';
    } else {
      recommendation = 'maintain_price';
    }
    
    return {
      estimatedMarketValue: Math.round(estimatedValue * 100) / 100,
      depreciationFactor: Math.round(totalDepreciation * 100) / 100,
      conditionAdjustment: conditionMultiplier,
      pricingStrategy: Math.round(pricingStrategy * 100) / 100,
      recommendation,
      marketComparison,
      confidenceScore: similarListings.length > 0 ? Math.min(0.95, 0.6 + (similarListings.length * 0.1)) : 0.6,
      explanation: `Item valued at $${estimatedValue.toFixed(2)} considering ${Math.round(totalDepreciation * 100)}% depreciation and ${condition} condition`,
    };
  },
});
```

#### 2.4 Auction Theory Tool (`apps/web/src/lib/ai-tools/game-theory/auction-theory.ts`)

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const auctionTheoryTool = tool({
  description: 'Apply auction theory principles to negotiation scenarios',
  inputSchema: z.object({
    reservePrice: z.number().positive().describe('Seller reserve (minimum) price'),
    currentOffer: z.number().positive().describe('Current buyer offer'),
    estimatedBuyerValuation: z.number().positive().describe('Estimated maximum buyer willingness to pay'),
    competitionLevel: z.enum(['none', 'low', 'medium', 'high']).describe('Level of competition from other buyers'),
    timeRemaining: z.number().min(0).describe('Time pressure factor (hours until decision needed)'),
    informationAsymmetry: z.number().min(0).max(1).describe('Information advantage factor (0-1)'),
  }),
  execute: async ({
    reservePrice,
    currentOffer,
    estimatedBuyerValuation,
    competitionLevel,
    timeRemaining,
    informationAsymmetry,
  }) => {
    // Competition impact on pricing power
    const competitionMultipliers = {
      none: 1.0,
      low: 1.05,
      medium: 1.15,
      high: 1.25,
    };
    
    const competitionMultiplier = competitionMultipliers[competitionLevel];
    
    // Time pressure calculation (decreasing seller power over time)
    const timePressureFactor = timeRemaining > 48 ? 1.0 : Math.max(0.7, timeRemaining / 48);
    
    // Information asymmetry advantage
    const informationAdvantage = 1 + (informationAsymmetry * 0.1);
    
    // Calculate optimal reserve and counter-offer
    const adjustedReserve = reservePrice * competitionMultiplier * timePressureFactor * informationAdvantage;
    
    // Revenue equivalence theorem application
    const optimalPrice = Math.min(
      estimatedBuyerValuation * 0.9, // Don't exceed 90% of buyer valuation
      adjustedReserve + ((estimatedBuyerValuation - adjustedReserve) * 0.6) // Split surplus 60/40 in seller favor
    );
    
    // Bid evaluation
    const offerQuality = (currentOffer - reservePrice) / (estimatedBuyerValuation - reservePrice);
    
    let strategy: 'accept' | 'counter_aggressive' | 'counter_moderate' | 'reject';
    let counterOfferPrice: number | null = null;
    
    if (currentOffer >= optimalPrice * 0.95) {
      strategy = 'accept';
    } else if (currentOffer >= reservePrice && offerQuality > 0.5) {
      strategy = 'counter_moderate';
      counterOfferPrice = Math.round((currentOffer + optimalPrice) / 2 * 100) / 100;
    } else if (currentOffer >= reservePrice) {
      strategy = 'counter_aggressive';
      counterOfferPrice = Math.round(optimalPrice * 100) / 100;
    } else {
      strategy = 'reject';
    }
    
    return {
      optimalPrice: Math.round(optimalPrice * 100) / 100,
      adjustedReserve: Math.round(adjustedReserve * 100) / 100,
      offerQuality: Math.round(offerQuality * 100) / 100,
      strategy,
      counterOfferPrice,
      competitionImpact: Math.round((competitionMultiplier - 1) * 100) / 100,
      timePressureImpact: Math.round((1 - timePressureFactor) * 100) / 100,
      recommendedResponse: strategy === 'accept' 
        ? 'Accept the current offer' 
        : strategy === 'reject' 
          ? 'Reject - offer below minimum threshold'
          : `Counter with $${counterOfferPrice}`,
      confidence: Math.min(0.95, 0.7 + (informationAsymmetry * 0.25)),
    };
  },
});
```

### Phase 3: Decision Engine and Offer Evaluation

#### 3.1 Decision Engine (`apps/web/src/lib/ai-tools/negotiation/decision-engine.ts`)

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const negotiationDecisionTool = tool({
  description: 'Make autonomous negotiation decisions based on multiple factors',
  inputSchema: z.object({
    nashAnalysis: z.object({
      equilibriumPrice: z.number().nullable(),
      recommendedAction: z.enum(['accept', 'counter', 'reject']),
      bargainingPower: z.object({
        seller: z.number(),
        buyer: z.number(),
      }),
    }),
    marketAnalysis: z.object({
      estimatedMarketValue: z.number(),
      recommendation: z.enum(['reduce_price', 'maintain_price', 'increase_price']),
      confidenceScore: z.number(),
    }),
    auctionAnalysis: z.object({
      strategy: z.enum(['accept', 'counter_aggressive', 'counter_moderate', 'reject']),
      counterOfferPrice: z.number().nullable(),
      confidence: z.number(),
    }),
    sellerPreferences: z.object({
      minProfitMargin: z.number().describe('Minimum profit margin (0-1)'),
      maxNegotiationRounds: z.number().int(),
      timeUrgency: z.number().min(0).max(1),
      autoAcceptThreshold: z.number().describe('Auto-accept if offer is within this % of asking price'),
    }),
    currentNegotiation: z.object({
      currentRound: z.number().int(),
      buyerOffer: z.number(),
      sellerAskingPrice: z.number(),
      itemCost: z.number(),
    }),
  }),
  execute: async ({
    nashAnalysis,
    marketAnalysis,
    auctionAnalysis,
    sellerPreferences,
    currentNegotiation,
  }) => {
    const { buyerOffer, sellerAskingPrice, itemCost, currentRound } = currentNegotiation;
    const { minProfitMargin, maxNegotiationRounds, autoAcceptThreshold } = sellerPreferences;
    
    // Calculate minimum acceptable price based on cost + margin
    const minAcceptablePrice = itemCost * (1 + minProfitMargin);
    
    // Weight the different analyses
    const weights = {
      nash: 0.4,
      market: 0.3,
      auction: 0.3,
    };
    
    // Calculate confidence-weighted decision scores
    const nashScore = nashAnalysis.recommendedAction === 'accept' ? 1 : 
                     nashAnalysis.recommendedAction === 'counter' ? 0.5 : 0;
    
    const marketScore = marketAnalysis.recommendation === 'maintain_price' ? 0.7 :
                       marketAnalysis.recommendation === 'reduce_price' ? 0.3 : 0.9;
    
    const auctionScore = auctionAnalysis.strategy === 'accept' ? 1 :
                        auctionAnalysis.strategy.includes('counter') ? 0.6 : 0;
    
    const weightedScore = (nashScore * weights.nash) + 
                         (marketScore * weights.market) + 
                         (auctionScore * weights.auction);
    
    // Apply confidence weighting
    const confidenceWeightedScore = weightedScore * 
      ((nashAnalysis.bargainingPower.seller + marketAnalysis.confidenceScore + auctionAnalysis.confidence) / 3);
    
    // Decision logic
    let finalDecision: 'accept' | 'counter' | 'reject';
    let counterOfferPrice: number | null = null;
    let reasoning: string[] = [];
    
    // Auto-accept if within threshold
    const offerPercentageOfAsk = buyerOffer / sellerAskingPrice;
    if (offerPercentageOfAsk >= autoAcceptThreshold) {
      finalDecision = 'accept';
      reasoning.push(`Offer ${Math.round(offerPercentageOfAsk * 100)}% of asking price meets auto-accept threshold`);
    }
    // Reject if below minimum acceptable
    else if (buyerOffer < minAcceptablePrice) {
      finalDecision = 'reject';
      reasoning.push(`Offer $${buyerOffer} below minimum acceptable price $${minAcceptablePrice.toFixed(2)}`);
    }
    // Reject if max rounds exceeded
    else if (currentRound >= maxNegotiationRounds) {
      finalDecision = buyerOffer >= minAcceptablePrice ? 'accept' : 'reject';
      reasoning.push(`Maximum negotiation rounds (${maxNegotiationRounds}) reached`);
    }
    // Use weighted analysis for decision
    else if (confidenceWeightedScore >= 0.7) {
      finalDecision = 'accept';
      reasoning.push(`High confidence score ${confidenceWeightedScore.toFixed(2)} suggests acceptance`);
    }
    else if (confidenceWeightedScore >= 0.4) {
      finalDecision = 'counter';
      // Use the best counter offer from analyses
      const possibleCounters = [
        nashAnalysis.equilibriumPrice,
        auctionAnalysis.counterOfferPrice,
        (buyerOffer + sellerAskingPrice) / 2, // Simple middle ground
      ].filter(price => price !== null && price >= minAcceptablePrice);
      
      counterOfferPrice = possibleCounters.length > 0 
        ? Math.min(...possibleCounters)
        : Math.max(minAcceptablePrice, buyerOffer * 1.1);
      
      reasoning.push(`Moderate confidence suggests counter-offer at $${counterOfferPrice.toFixed(2)}`);
    }
    else {
      finalDecision = 'reject';
      reasoning.push(`Low confidence score ${confidenceWeightedScore.toFixed(2)} suggests rejection`);
    }
    
    // Calculate expected profit
    const finalPrice = finalDecision === 'accept' ? buyerOffer : 
                      finalDecision === 'counter' ? counterOfferPrice : 0;
    const expectedProfit = finalPrice ? finalPrice - itemCost : 0;
    const profitMargin = finalPrice ? (expectedProfit / finalPrice) : 0;
    
    return {
      decision: finalDecision,
      counterOfferPrice: counterOfferPrice ? Math.round(counterOfferPrice * 100) / 100 : null,
      confidence: Math.round(confidenceWeightedScore * 100) / 100,
      reasoning,
      expectedProfit: Math.round(expectedProfit * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100,
      analysis: {
        nashWeight: weights.nash,
        marketWeight: weights.market,
        auctionWeight: weights.auction,
        weightedScore: Math.round(weightedScore * 100) / 100,
      },
      shouldNotifySeller: finalDecision === 'reject' || 
                         (finalDecision === 'accept' && expectedProfit > itemCost * 0.5) ||
                         currentRound >= maxNegotiationRounds - 1,
    };
  },
});
```

### Phase 4: Edge Runtime API Endpoint

#### 4.1 Create Autonomous Agent API Route (`apps/web/app/api/negotiations/autonomous-agent/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { nashEquilibriumTool } from '@/lib/ai-tools/game-theory/nash-equilibrium';
import { marketAnalysisTool } from '@/lib/ai-tools/game-theory/market-analysis';
import { auctionTheoryTool } from '@/lib/ai-tools/game-theory/auction-theory';
import { negotiationDecisionTool } from '@/lib/ai-tools/negotiation/decision-engine';
import { rateLimit } from '@/lib/rate-limit';

// Edge Runtime for faster response times
export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Input validation schema
const negotiationRequestSchema = z.object({
  negotiationId: z.number().int().positive(),
  buyerOfferId: z.number().int().positive(),
  sellerId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = request.ip ?? 'anonymous';
    const { success } = await rateLimit.limit(identifier);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    // Validate input
    const body = await request.json();
    const { negotiationId, buyerOfferId, sellerId } = negotiationRequestSchema.parse(body);

    // Fetch negotiation and related data
    const { data: negotiationData, error: negError } = await supabase
      .from('negotiations_enhanced')
      .select('*')
      .eq('id', negotiationId)
      .eq('seller_id', sellerId)
      .single();

    if (negError || !negotiationData) {
      return NextResponse.json(
        { error: 'Negotiation not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch the specific buyer offer
    const { data: offerData, error: offerError } = await supabase
      .from('offers')
      .select('*')
      .eq('id', buyerOfferId)
      .eq('negotiation_id', negotiationId)
      .single();

    if (offerError || !offerData) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    // Count negotiation rounds
    const { count: roundCount } = await supabase
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('negotiation_id', negotiationId);

    // Fetch seller preferences (with defaults)
    const sellerPreferences = {
      minProfitMargin: Number(process.env.AGENT_MIN_PROFIT_MARGIN) || 0.15,
      maxNegotiationRounds: Number(process.env.AGENT_MAX_COUNTER_OFFERS) || 3,
      timeUrgency: 0.3, // Default moderate urgency
      autoAcceptThreshold: 0.9, // Auto-accept if offer is 90% of asking price
    };

    // Use AI with tools to make decision
    const result = await generateText({
      model: openai('gpt-4o'),
      system: `You are an autonomous negotiation agent for furniture marketplace sellers. 
      
      Your role is to:
      1. Analyze buyer offers using game theory principles
      2. Make data-driven negotiation decisions
      3. Maximize seller profit while maintaining fairness
      4. Complete negotiations efficiently
      
      Use the provided tools to analyze the situation and make a final decision.
      Be decisive and efficient - sellers rely on you for autonomous operation.`,
      
      prompt: `Analyze this negotiation scenario and make a decision:
      
      Item: ${negotiationData.item_name}
      Starting Price: $${negotiationData.starting_price}
      Buyer Offer: $${offerData.price}
      Negotiation Round: ${roundCount || 1}
      
      Seller wants minimum ${sellerPreferences.minProfitMargin * 100}% profit margin.
      Maximum ${sellerPreferences.maxNegotiationRounds} rounds allowed.
      
      Please analyze using Nash equilibrium, market analysis, auction theory, and make a final decision.`,
      
      tools: {
        nashEquilibrium: nashEquilibriumTool,
        marketAnalysis: marketAnalysisTool,
        auctionTheory: auctionTheoryTool,
        decisionEngine: negotiationDecisionTool,
      },
      
      toolChoice: 'required',
      maxSteps: 5,
    });

    // Extract decision from tool results
    const decisionResults = result.toolCalls.find(call => call.toolName === 'decisionEngine')?.result;
    
    if (!decisionResults) {
      throw new Error('Decision engine did not provide results');
    }

    // Execute the decision
    const executionResult = await executeNegotiationDecision(
      negotiationId,
      sellerId,
      decisionResults,
      offerData
    );

    // Send notification if required
    if (decisionResults.shouldNotifySeller) {
      await sendSellerNotification(sellerId, negotiationData, decisionResults);
    }

    return NextResponse.json({
      success: true,
      decision: decisionResults.decision,
      counterOfferPrice: decisionResults.counterOfferPrice,
      confidence: decisionResults.confidence,
      reasoning: decisionResults.reasoning,
      executionResult,
      analysisId: result.request?.id,
    });

  } catch (error) {
    console.error('Autonomous agent error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function executeNegotiationDecision(
  negotiationId: number,
  sellerId: string,
  decision: any,
  buyerOffer: any
) {
  const { decision: action, counterOfferPrice } = decision;
  
  switch (action) {
    case 'accept':
      // Accept the buyer's offer
      const { error: acceptError } = await supabase
        .from('negotiations')
        .update({
          status: 'deal_pending',
          final_price: buyerOffer.price,
          updated_at: new Date().toISOString(),
        })
        .eq('id', negotiationId);
      
      if (acceptError) throw acceptError;
      
      return { action: 'accepted', finalPrice: buyerOffer.price };
      
    case 'counter':
      // Create counter-offer
      const { error: counterError } = await supabase
        .from('offers')
        .insert({
          negotiation_id: negotiationId,
          offer_type: 'seller',
          price: counterOfferPrice,
          message: `Autonomous agent counter-offer based on market analysis. Confidence: ${decision.confidence}`,
          is_counter_offer: true,
        });
      
      if (counterError) throw counterError;
      
      return { action: 'countered', counterPrice: counterOfferPrice };
      
    case 'reject':
      // Reject and close negotiation
      const { error: rejectError } = await supabase
        .from('negotiations')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', negotiationId);
      
      if (rejectError) throw rejectError;
      
      return { action: 'rejected', reason: decision.reasoning[0] };
      
    default:
      throw new Error(`Unknown decision action: ${action}`);
  }
}

async function sendSellerNotification(
  sellerId: string,
  negotiationData: any,
  decision: any
) {
  // Implementation would depend on your notification system
  // For now, we'll just log critical notifications
  console.log(`CRITICAL NOTIFICATION for seller ${sellerId}:`, {
    item: negotiationData.item_name,
    decision: decision.decision,
    confidence: decision.confidence,
    reasoning: decision.reasoning,
  });
  
  // TODO: Integrate with email/SMS/push notification service
  // Example: await emailService.sendCriticalNotification(sellerId, notificationData);
}
```

### Phase 5: Integration with Existing Negotiation System

#### 5.1 Trigger Autonomous Agent (`apps/web/app/api/negotiations/[negotiationId]/offers/route.ts` - Enhancement)

Add to the existing POST handler to trigger autonomous agent:

```typescript
// Add after creating the offer, before returning response
if (offerType === 'buyer' && process.env.AUTONOMOUS_AGENT_ENABLED === 'true') {
  // Trigger autonomous agent processing (non-blocking)
  fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/negotiations/autonomous-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      negotiationId: parseInt(negotiationIdStr),
      buyerOfferId: newOffer.id,
      sellerId: negotiation.seller_id,
    }),
  }).catch(error => {
    console.error('Failed to trigger autonomous agent:', error);
  });
}
```

#### 5.2 Seller Dashboard Integration

Update seller dashboard to show autonomous agent activity:

```typescript
// Add to existing seller dashboard component
const autonomousAgentStatus = {
  enabled: true,
  lastAction: 'countered',
  confidence: 0.85,
  reasoning: ['Market analysis suggests optimal price at $450', 'Buyer offer within acceptable range'],
};

// Display in UI
<div className="autonomous-agent-status">
  <Badge variant={autonomousAgentStatus.enabled ? "success" : "secondary"}>
    Autonomous Agent {autonomousAgentStatus.enabled ? "Active" : "Inactive"}
  </Badge>
  {autonomousAgentStatus.lastAction && (
    <div className="agent-activity">
      <p>Last Action: {autonomousAgentStatus.lastAction}</p>
      <p>Confidence: {(autonomousAgentStatus.confidence * 100).toFixed(0)}%</p>
    </div>
  )}
</div>
```

### Phase 6: Monitoring and Analytics

#### 6.1 Agent Performance Tracking (`apps/web/app/api/analytics/agent-performance/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get agent performance metrics
  const { data: agentNegotiations } = await supabase
    .from('negotiations')
    .select(`
      id, status, final_price, created_at, completed_at,
      items(starting_price),
      offers(price, offer_type, created_at)
    `)
    .contains('offers', [{ message: { like: '%Autonomous agent%' } }]);

  const metrics = {
    totalNegotiations: agentNegotiations?.length || 0,
    successRate: 0,
    averageNegotiationTime: 0,
    averageProfitMargin: 0,
    decisionsPerHour: 0,
  };

  // Calculate success rate
  const completedNegotiations = agentNegotiations?.filter(n => n.status === 'completed') || [];
  metrics.successRate = completedNegotiations.length / metrics.totalNegotiations;

  // Calculate average profit margin
  const profitMargins = completedNegotiations.map(n => 
    (n.final_price - n.items.starting_price * 0.7) / n.final_price // Assuming 70% cost basis
  );
  metrics.averageProfitMargin = profitMargins.reduce((a, b) => a + b, 0) / profitMargins.length;

  return NextResponse.json(metrics);
}
```

### Phase 7: Testing Strategy

#### 7.1 Unit Tests for Tools

```typescript
// apps/web/src/lib/ai-tools/__tests__/nash-equilibrium.test.ts
import { nashEquilibriumTool } from '../game-theory/nash-equilibrium';

describe('Nash Equilibrium Tool', () => {
  it('should calculate equilibrium price correctly', async () => {
    const result = await nashEquilibriumTool.execute({
      sellerMinPrice: 100,
      sellerMaxPrice: 200,
      buyerMaxPrice: 180,
      buyerOfferPrice: 150,
      marketValue: 175,
      negotiationRound: 1,
      timeUrgency: 0.3,
    });

    expect(result.equilibriumExists).toBe(true);
    expect(result.equilibriumPrice).toBeGreaterThan(100);
    expect(result.equilibriumPrice).toBeLessThan(180);
    expect(result.recommendedAction).toBeOneOf(['accept', 'counter', 'reject']);
  });
});
```

#### 7.2 Integration Tests

```typescript
// apps/web/src/__tests__/autonomous-agent.integration.test.ts
describe('Autonomous Agent Integration', () => {
  it('should process buyer offer and make decision', async () => {
    const response = await fetch('/api/negotiations/autonomous-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        negotiationId: 1,
        buyerOfferId: 1,
        sellerId: 'test-seller-id',
      }),
    });

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.decision).toBeOneOf(['accept', 'counter', 'reject']);
    expect(result.confidence).toBeGreaterThan(0);
  });
});
```

## Deployment Checklist

### Pre-Deployment
1. [ ] Install all dependencies (`npm install ai @ai-sdk/openai zod`)
2. [ ] Set environment variables in Vercel dashboard
3. [ ] Run type checking (`npm run type-check`)
4. [ ] Run unit tests
5. [ ] Test integration locally

### Post-Deployment
1. [ ] Monitor autonomous agent decisions
2. [ ] Track performance metrics
3. [ ] Verify seller notifications
4. [ ] Monitor Edge runtime performance
5. [ ] Check rate limiting effectiveness

## Performance Considerations

### Edge Runtime Benefits
- **Sub-100ms response times** for negotiation decisions
- **Global distribution** via Vercel Edge Network
- **Reduced cold starts** compared to traditional serverless
- **Better concurrency** for high-volume negotiations

### Optimization Strategies
1. **Tool Result Caching** - Cache market analysis results for similar items
2. **Batch Processing** - Process multiple offers in single AI call when possible
3. **Precomputed Metrics** - Store common calculations in database
4. **Selective Tool Usage** - Only use necessary tools based on negotiation context

## Security Considerations

1. **Rate Limiting** - Prevent abuse of autonomous agent endpoint
2. **Input Validation** - Zod schemas validate all tool inputs
3. **Authorization** - Verify seller ownership of negotiations
4. **Data Sanitization** - Clean all inputs before processing
5. **Error Handling** - Never expose internal errors to clients

## Monitoring and Alerts

### Key Metrics to Track
1. **Decision Accuracy** - How often agent decisions lead to successful negotiations
2. **Response Time** - Average time from offer to agent decision
3. **Profit Optimization** - Agent vs manual negotiation profit margins
4. **Error Rate** - Failed tool executions or API errors
5. **User Satisfaction** - Seller feedback on autonomous decisions

### Alert Conditions
- Agent error rate > 5%
- Average response time > 200ms
- Profit margin below seller minimum
- Failed notifications to sellers
- High volume of rejected offers

---

This implementation plan provides a comprehensive foundation for building an autonomous seller negotiation agent using Vercel AI SDK v5 with advanced game theory capabilities, Edge runtime performance, and seamless integration with your existing Supabase-based marketplace.