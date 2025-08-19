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
    } = body;

    // Validate inputs
    if (!itemName || !furnitureType || !listingPrice || !offerPrice) {
      return Response.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    const startTime = Date.now();

    // Generate decision using same AI logic as production agent
    const decision = await generateObject({
      model: openai('gpt-4o'),
      system: SYSTEM_PROMPT,
      prompt: `Analyze this offer:

Item: ${furnitureType} "${itemName}" listed at $${listingPrice}
Current offer: $${offerPrice}
Competing offers: ${competingOffers || 0}
Seller aggressiveness: ${aggressivenessLevel}
Auto-accept threshold: ${autoAcceptThreshold}
Min acceptable ratio: ${minAcceptableRatio}

Make decision to maximize seller profit.`,
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

    return Response.json({
      decision: decision.object.decision,
      recommendedPrice,
      confidence: decision.object.confidence,
      reasoning: decision.object.reasoning,
      nashPrice: Math.round(decision.object.nashPrice),
      marketValue: Math.round(decision.object.marketValue),
      executionTime,
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