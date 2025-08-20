import { NextRequest } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { nashEquilibriumTool, marketAnalysisTool } from '@/src/lib/ai-tools/game-theory/nash-equilibrium';

export const runtime = 'edge';

const SYSTEM_PROMPT = `You are an autonomous seller agent. Analyze offers and make decisions to maximize seller profits using game theory.

Decision Rules:
1. ACCEPT if offer ≥ 95% of listing price OR Nash equilibrium suggests acceptance
2. COUNTER using Nash equilibrium price, rounded to nearest $5
3. DECLINE if offer is < 60% of listing price and no upward negotiation potential
4. Always maximize seller profit using market analysis

Keep reasoning brief and focus on the mathematical rationale.`;

/**
 * Simulate agent decision-making for testing scenarios
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      itemName,
      furnitureType,
      listingPrice,
      offerPrice,
      competingOffers,
      aggressivenessLevel,
      autoAcceptThreshold,
      minAcceptableRatio,
      multipleOffersData = [],
    } = body;

    // Validate inputs
    if (!itemName || !furnitureType || !listingPrice || !offerPrice) {
      return Response.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    const startTime = Date.now();

    // MAIN SIMULATION - Enhanced with competitive awareness
    const hasMultipleOffers = multipleOffersData && multipleOffersData.length > 0;
    let mainPrompt = '';
    
    if (hasMultipleOffers) {
      // Enhanced prompt with competitive context
      mainPrompt = `Analyze this competitive situation:

Item: ${furnitureType} "${itemName}" listed at $${listingPrice}

Primary Analysis Focus: Best offer of $${Math.max(...multipleOffersData.map(o => o.offerPrice))}

All Competing Offers Context:
${multipleOffersData.map((o, i) => `${i + 1}. ${o.buyerName}: $${o.offerPrice} (${o.hoursAgo}h ago)`).join('\n')}

Agent Settings:
- Seller aggressiveness: ${aggressivenessLevel}
- Auto-accept threshold: ${autoAcceptThreshold}
- Min acceptable ratio: ${minAcceptableRatio}

Provide overall strategic guidance considering the competitive landscape.`;
    } else {
      // Original single-offer prompt
      mainPrompt = `Analyze this offer:

Item: ${furnitureType} "${itemName}" listed at $${listingPrice}
Current offer: $${offerPrice}
Competing offers: ${competingOffers || 0}
Seller aggressiveness: ${aggressivenessLevel}
Auto-accept threshold: ${autoAcceptThreshold}
Min acceptable ratio: ${minAcceptableRatio}

Make decision to maximize seller profit.`;
    }

    const decision = await generateObject({
      model: openai('gpt-4o'),
      system: SYSTEM_PROMPT,
      prompt: mainPrompt,
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

    // Round recommended price to nearest $5 if it exists
    const recommendedPrice = decision.object.recommendedPrice 
      ? Math.round(decision.object.recommendedPrice / 5) * 5 
      : undefined;

    // INDIVIDUAL OFFER ANALYSIS - Separate detailed analysis for each offer
    let individualOfferResults = [];
    let overallStrategy = '';

    if (hasMultipleOffers) {
      // Sort offers by price for ranking
      const sortedOffers = [...multipleOffersData].sort((a, b) => b.offerPrice - a.offerPrice);
      
      for (let i = 0; i < multipleOffersData.length; i++) {
        const offer = multipleOffersData[i];
        const ranking = sortedOffers.findIndex(o => o.id === offer.id) + 1;
        
        const startTimeIndividual = Date.now();

        // Generate individual analysis for this offer
        const individualDecision = await generateObject({
          model: openai('gpt-4o'),
          system: SYSTEM_PROMPT,
          prompt: `Analyze this individual offer in context of competing bids:

Item: ${furnitureType} "${itemName}" listed at $${listingPrice}
This offer: $${offer.offerPrice} from ${offer.buyerName} (submitted ${offer.hoursAgo}h ago)

Competing context:
- Total competing offers: ${multipleOffersData.length}
- This offer ranks #${ranking} by price
- All competing offers: ${multipleOffersData.map(o => `$${o.offerPrice} (${o.buyerName}, ${o.hoursAgo}h ago)`).join(', ')}

Agent settings:
- Seller aggressiveness: ${aggressivenessLevel}
- Auto-accept threshold: ${autoAcceptThreshold}
- Min acceptable ratio: ${minAcceptableRatio}

Make decision for this specific offer considering the competitive landscape.`,
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

        const individualExecutionTime = Date.now() - startTimeIndividual;
        const individualRecommendedPrice = individualDecision.object.recommendedPrice 
          ? Math.round(individualDecision.object.recommendedPrice / 5) * 5 
          : undefined;

        // Determine offer strength
        const offerRatio = offer.offerPrice / listingPrice;
        let offerStrength: 'strong' | 'fair' | 'weak';
        if (offerRatio >= autoAcceptThreshold) {
          offerStrength = 'strong';
        } else if (offerRatio >= minAcceptableRatio) {
          offerStrength = 'fair';
        } else {
          offerStrength = 'weak';
        }

        individualOfferResults.push({
          offerId: offer.id,
          buyerName: offer.buyerName,
          offerPrice: offer.offerPrice,
          decision: individualDecision.object.decision,
          recommendedPrice: individualRecommendedPrice,
          confidence: individualDecision.object.confidence,
          reasoning: individualDecision.object.reasoning,
          nashPrice: Math.round(individualDecision.object.nashPrice),
          marketValue: Math.round(individualDecision.object.marketValue),
          executionTime: individualExecutionTime,
          competitiveRanking: ranking,
          offerStrength,
        });
      }

      // Generate overall strategy based on individual results
      const acceptedOffers = individualOfferResults.filter(r => r.decision === 'ACCEPT').length;
      const counterOffers = individualOfferResults.filter(r => r.decision === 'COUNTER').length;
      const declinedOffers = individualOfferResults.filter(r => r.decision === 'DECLINE').length;

      if (acceptedOffers > 0) {
        const bestAccepted = individualOfferResults.find(r => r.decision === 'ACCEPT' && r.competitiveRanking === 1);
        overallStrategy = `Accept highest offer from ${bestAccepted?.buyerName} at $${bestAccepted?.offerPrice}. Strong competitive position with multiple offers.`;
      } else if (counterOffers > 0) {
        overallStrategy = `Counter all viable offers. Competitive bidding situation allows for negotiating upward. Focus on top ${Math.min(3, counterOffers)} offers.`;
      } else {
        overallStrategy = `All offers below threshold. Consider waiting for better offers or reducing listing price to attract serious buyers.`;
      }
    }

    return Response.json({
      decision: decision.object.decision,
      recommendedPrice,
      confidence: decision.object.confidence,
      reasoning: decision.object.reasoning,
      nashPrice: Math.round(decision.object.nashPrice),
      marketValue: Math.round(decision.object.marketValue),
      executionTime,
      individualOfferResults,
      overallStrategy,
      // Additional analysis for testing
      analysis: {
        offerRatio: offerPrice / listingPrice,
        aboveAutoAccept: (offerPrice / listingPrice) >= autoAcceptThreshold,
        aboveMinAcceptable: (offerPrice / listingPrice) >= minAcceptableRatio,
        competitionFactor: competingOffers > 0 ? 'High' : 'Low',
        aggressivenessLevel: aggressivenessLevel >= 0.7 ? 'High' : 
                           aggressivenessLevel >= 0.4 ? 'Medium' : 'Low',
      }
    });

  } catch (error) {
    console.error('Simulation failed:', error);
    return Response.json({ 
      error: 'Simulation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}