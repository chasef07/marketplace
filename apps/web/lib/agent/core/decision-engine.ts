import { tool } from 'ai';
import { z } from 'zod';

export const autonomousDecisionTool = tool({
  description: 'Make autonomous negotiation decisions based on game theory analysis and market conditions',
  inputSchema: z.object({
    currentOffer: z.object({
      price: z.number().positive(),
      buyerId: z.string(),
      message: z.string().optional(),
      timestamp: z.string(),
    }),
    gameTheoryAnalysis: z.object({
      nashEquilibriumPrice: z.number(),
      confidence: z.number(),
      recommendation: z.string(),
      reasoning: z.string(),
    }),
    marketAnalysis: z.object({
      estimatedMarketValue: z.number(),
      demandScore: z.number(),
      priceRecommendation: z.string(),
    }),
    auctionContext: z.object({
      competitorCount: z.number(),
      strategy: z.string(),
      optimalReservePrice: z.number().optional(),
    }).optional(),
    negotiationHistory: z.array(z.object({
      round: z.number(),
      offerType: z.string(),
      price: z.number(),
      timestamp: z.string(),
    })),
    sellerContext: z.object({
      targetPrice: z.number(),
      timeUrgency: z.number(),
      maxRounds: z.number().default(5),
    }),
  }),
  execute: async ({
    currentOffer,
    gameTheoryAnalysis,
    marketAnalysis,
    auctionContext,
    negotiationHistory,
    sellerContext,
  }) => {
    const { price: offerPrice } = currentOffer;
    const { nashEquilibriumPrice, confidence } = gameTheoryAnalysis;
    const { targetPrice, timeUrgency, maxRounds } = sellerContext;
    const currentRound = negotiationHistory.length + 1;
    
    // Decision matrix based on multiple factors
    let decision: 'ACCEPT' | 'COUNTER' | 'WAIT' | 'DECLINE';
    let counterOfferPrice: number | null = null;
    let reasoning: string;
    
    // 1. Check if offer exceeds target price (auto-accept condition)
    if (offerPrice >= targetPrice) {
      decision = 'ACCEPT';
      reasoning = `Offer of $${offerPrice} meets or exceeds target price of $${targetPrice}.`;
      
    // 2. Check auction conditions (multiple buyers)
    } else if (auctionContext && auctionContext.competitorCount >= 2) {
      if (auctionContext.optimalReservePrice && offerPrice >= auctionContext.optimalReservePrice) {
        decision = 'ACCEPT';
        reasoning = `Offer meets auction reserve price with ${auctionContext.competitorCount} competing buyers.`;
      } else {
        decision = 'WAIT';
        reasoning = `Setting deadline for ${auctionContext.competitorCount} competing buyers to increase bids.`;
      }
      
    // 3. Check maximum rounds reached
    } else if (currentRound >= maxRounds) {
      if (offerPrice >= targetPrice * 0.85) { // Accept if within 15% of target
        decision = 'ACCEPT';
        reasoning = `Maximum rounds reached. Offer is within acceptable range of target.`;
      } else {
        decision = 'DECLINE';
        reasoning = `Maximum rounds reached and offer too low. Market may not support target price.`;
      }
      
    // 4. Game theory analysis with confidence weighting
    } else if (confidence >= 0.7) {
      if (gameTheoryAnalysis.recommendation === 'ACCEPT') {
        decision = 'ACCEPT';
        reasoning = gameTheoryAnalysis.reasoning;
      } else if (gameTheoryAnalysis.recommendation === 'COUNTER') {
        decision = 'COUNTER';
        counterOfferPrice = nashEquilibriumPrice;
        reasoning = `Game theory suggests counter at Nash equilibrium price of $${nashEquilibriumPrice}.`;
      } else {
        decision = 'COUNTER';
        counterOfferPrice = Math.max(
          offerPrice * 1.1, // At least 10% above offer
          (offerPrice + targetPrice) / 2 // Split the difference
        );
        reasoning = `Conservative counter-offer approach given market uncertainty.`;
      }
      
    // 5. Low confidence scenarios - use market-based decisions
    } else {
      const marketBasedPrice = marketAnalysis.estimatedMarketValue;
      
      if (offerPrice >= marketBasedPrice * 0.9) {
        decision = 'ACCEPT';
        reasoning = `Offer is 90% of estimated market value ($${marketBasedPrice}). Good deal given uncertainty.`;
      } else if (offerPrice >= marketBasedPrice * 0.8) {
        decision = 'COUNTER';
        counterOfferPrice = Math.min(targetPrice, marketBasedPrice * 0.95);
        reasoning = `Counter closer to market value with low confidence in buyer valuation.`;
      } else {
        decision = 'DECLINE';
        reasoning = `Offer significantly below market value and low confidence in negotiation success.`;
      }
    }
    
    // 6. Time urgency adjustments
    if (timeUrgency > 0.7 && decision === 'COUNTER') {
      // High urgency - be more accommodating
      if (counterOfferPrice) {
        counterOfferPrice = Math.min(counterOfferPrice, offerPrice * 1.05); // Only 5% increase
        reasoning += ` Adjusted for high time urgency.`;
      }
    } else if (timeUrgency < 0.3 && decision === 'ACCEPT' && offerPrice < targetPrice * 0.95) {
      // Low urgency - hold out for better price
      decision = 'COUNTER';
      counterOfferPrice = Math.min(targetPrice, offerPrice * 1.15);
      reasoning = `Low time urgency allows for holding out for better price.`;
    }
    
    // 7. Final price adjustments (round to nearest $5)
    if (counterOfferPrice) {
      counterOfferPrice = Math.round(counterOfferPrice / 5) * 5;
    }
    
    // 8. Calculate expected outcome and risk assessment
    const expectedOutcome = decision === 'ACCEPT' ? offerPrice :
                          decision === 'COUNTER' ? (counterOfferPrice || offerPrice) * 0.8 : // 80% chance counter is accepted
                          decision === 'WAIT' ? offerPrice * 1.1 : // 10% improvement expected from auction
                          0; // DECLINE
    
    const riskLevel = confidence < 0.5 ? 'high' :
                     confidence < 0.7 ? 'medium' : 'low';
    
    // 9. Generate seller notification message
    let notificationMessage: string | null = null;
    if (decision === 'ACCEPT') {
      notificationMessage = `Item sold for $${offerPrice}`;
    } else if (decision === 'DECLINE') {
      notificationMessage = `Declined offer of $${offerPrice} - ${reasoning}`;
    }
    // For COUNTER and WAIT, no notification needed (autonomous operation)
    
    return {
      decision,
      counterOfferPrice,
      reasoning,
      confidence: Number(confidence.toFixed(2)),
      expectedOutcome: Number(expectedOutcome.toFixed(2)),
      riskLevel,
      notificationMessage,
      shouldNotifySeller: decision === 'ACCEPT' || decision === 'DECLINE',
      marketContext: {
        currentRound,
        maxRounds,
        timeUrgency,
        competitorCount: auctionContext?.competitorCount || 0,
      },
      nextSteps: decision === 'WAIT' ? 'Monitor for competing offers and set deadline' :
                decision === 'COUNTER' ? `Send counter-offer at $${counterOfferPrice}` :
                decision === 'ACCEPT' ? 'Process sale and arrange pickup' :
                'End negotiation and relist if needed'
    };
  },
});

export const buyerBehaviorAnalysisTool = tool({
  description: 'Analyze buyer behavior patterns and predict negotiation outcomes',
  inputSchema: z.object({
    buyerId: z.string(),
    currentOffer: z.object({
      price: z.number(),
      message: z.string().optional(),
      responseTime: z.number().optional().describe('Time taken to respond in minutes'),
    }),
    negotiationHistory: z.array(z.object({
      round: z.number(),
      price: z.number(),
      offerType: z.string(),
      responseTime: z.number().optional(),
    })),
    buyerProfile: z.object({
      responseTimePattern: z.string().optional(),
      priceFlexibility: z.string().optional(),
      successRate: z.number().optional(),
      negotiationStyle: z.string().optional(),
    }).optional(),
  }),
  execute: async ({ buyerId, currentOffer, negotiationHistory, buyerProfile }) => {
    // Analyze current negotiation patterns
    const buyerOffers = negotiationHistory.filter(h => h.offerType === 'buyer');
    const priceProgression = buyerOffers.map(o => o.price);
    
    // Calculate buyer's price escalation pattern
    let priceFlexibility: 'rigid' | 'moderate' | 'flexible';
    if (priceProgression.length >= 2) {
      const increases = priceProgression.slice(1).map((price, i) => 
        (price - priceProgression[i]) / priceProgression[i]
      );
      const avgIncrease = increases.reduce((a, b) => a + b, 0) / increases.length;
      
      if (avgIncrease < 0.02) priceFlexibility = 'rigid';
      else if (avgIncrease < 0.05) priceFlexibility = 'moderate';
      else priceFlexibility = 'flexible';
    } else {
      priceFlexibility = buyerProfile?.priceFlexibility as any || 'moderate';
    }
    
    // Estimate buyer's maximum willingness to pay
    const currentPrice = currentOffer.price;
    const priceGrowthRate = priceFlexibility === 'flexible' ? 0.15 :
                           priceFlexibility === 'moderate' ? 0.08 :
                           0.03;
    
    const estimatedMaxPrice = currentPrice * (1 + priceGrowthRate * (6 - buyerOffers.length));
    
    // Response time analysis
    const responseTimes = negotiationHistory
      .filter(h => h.responseTime)
      .map(h => h.responseTime!);
    
    const avgResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 
      currentOffer.responseTime || 120; // Default 2 hours
    
    let urgencyLevel: 'low' | 'medium' | 'high';
    if (avgResponseTime < 30) urgencyLevel = 'high';
    else if (avgResponseTime < 120) urgencyLevel = 'medium';
    else urgencyLevel = 'low';
    
    // Negotiation style detection
    let negotiationStyle: 'aggressive' | 'collaborative' | 'passive';
    const messageLength = currentOffer.message?.length || 0;
    const hasPersonalMessage = messageLength > 50;
    
    if (priceFlexibility === 'rigid' && urgencyLevel === 'low') {
      negotiationStyle = 'passive';
    } else if (priceFlexibility === 'flexible' && urgencyLevel === 'high') {
      negotiationStyle = 'aggressive';
    } else {
      negotiationStyle = 'collaborative';
    }
    
    // Predict next move
    let nextMovePrediction: string;
    let probabilityOfAcceptance: number;
    
    if (negotiationStyle === 'aggressive' && urgencyLevel === 'high') {
      nextMovePrediction = 'Likely to increase offer if countered moderately';
      probabilityOfAcceptance = 0.7;
    } else if (negotiationStyle === 'passive') {
      nextMovePrediction = 'May withdraw if countered too high';
      probabilityOfAcceptance = 0.4;
    } else {
      nextMovePrediction = 'Will likely counter if offer is reasonable';
      probabilityOfAcceptance = 0.6;
    }
    
    // Risk assessment
    const riskFactors = [];
    if (buyerOffers.length >= 3) riskFactors.push('Extended negotiation');
    if (urgencyLevel === 'low') riskFactors.push('Low urgency may lead to withdrawal');
    if (priceFlexibility === 'rigid') riskFactors.push('Limited price flexibility');
    
    const riskScore = riskFactors.length / 3; // 0-1 scale
    
    return {
      estimatedMaxPrice: Number(estimatedMaxPrice.toFixed(2)),
      priceFlexibility,
      urgencyLevel,
      negotiationStyle,
      nextMovePrediction,
      probabilityOfAcceptance: Number(probabilityOfAcceptance.toFixed(2)),
      avgResponseTime: Number(avgResponseTime.toFixed(0)),
      riskScore: Number(riskScore.toFixed(2)),
      recommendations: {
        optimalCounterStrategy: priceFlexibility === 'flexible' ? 'moderate_increase' : 'small_increase',
        timingStrategy: urgencyLevel === 'high' ? 'respond_quickly' : 'can_wait',
        communicationStyle: negotiationStyle === 'collaborative' ? 'friendly_professional' : 'concise'
      },
      reasoning: `Buyer shows ${priceFlexibility} price flexibility with ${urgencyLevel} urgency. ${negotiationStyle} style suggests ${nextMovePrediction.toLowerCase()}.`
    };
  },
});