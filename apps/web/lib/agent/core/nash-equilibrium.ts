import { tool } from 'ai';
import { z } from 'zod';

export const nashEquilibriumTool = tool({
  description: 'Calculate Nash equilibrium for buyer-seller negotiation scenarios using game theory with full negotiation history',
  inputSchema: z.object({
    sellerTargetPrice: z.number().positive().describe('Seller target/ideal price'),
    buyerOfferPrice: z.number().positive().describe('Current buyer offer price'),
    estimatedBuyerMax: z.number().positive().describe('Estimated buyer maximum willingness to pay'),
    marketValue: z.number().positive().describe('Estimated market value of item'),
    negotiationRound: z.number().int().min(1).describe('Current negotiation round'),
    timeUrgency: z.number().min(0).max(1).describe('Seller urgency factor (0-1)'),
    competitorCount: z.number().int().min(0).describe('Number of competing offers'),
    negotiationHistory: z.array(z.object({
      price: z.number(),
      offerType: z.string(),
      round: z.number()
    })).optional().describe('Previous offers in chronological order'),
    priceDirection: z.string().optional().describe('buyer price trend: increasing, decreasing, or stable'),
  }),
  execute: async ({
    sellerTargetPrice,
    buyerOfferPrice,
    estimatedBuyerMax,
    marketValue,
    negotiationRound,
    timeUrgency,
    competitorCount,
    negotiationHistory = [],
    priceDirection = 'stable',
  }) => {
    // History-aware Nash equilibrium calculation
    
    // Analyze buyer behavior from negotiation history
    const buyerOffers = negotiationHistory.filter(h => h.offerType === 'buyer');
    let buyerTrendFactor = 1.0;
    let buyerLearningAdjustment = 0;
    
    if (buyerOffers.length >= 2) {
      const lastOffer = buyerOffers[buyerOffers.length - 1];
      const prevOffer = buyerOffers[buyerOffers.length - 2];
      const priceChange = lastOffer.price - prevOffer.price;
      const priceChangePercent = priceChange / prevOffer.price;
      
      // Adjust strategy based on buyer behavior
      if (priceDirection === 'increasing') {
        // Buyer is trending up - be less aggressive to maintain momentum
        buyerTrendFactor = 0.85; // More conservative counters
        buyerLearningAdjustment = priceChangePercent * 0.5; // Learn from their increment pattern
      } else if (priceDirection === 'decreasing') {
        // Buyer is trending down - be more firm
        buyerTrendFactor = 1.15; // More aggressive to test their limit
      }
    }
    
    // Discount factors adjusted for negotiation history
    const sellerDiscountFactor = 0.95 - (timeUrgency * 0.1) - (negotiationRound * 0.02); // Fatigue factor
    const buyerDiscountFactor = 0.92 - (negotiationRound * 0.015); // Buyers get more impatient
    
    // Calculate bargaining power with history consideration
    let sellerBargainingPower = Math.min(1, 0.5 + (competitorCount * 0.1) + (timeUrgency * 0.2));
    
    // Adjust bargaining power based on negotiation momentum
    if (priceDirection === 'increasing') {
      sellerBargainingPower += 0.1; // Seller has more power when buyer is moving up
    } else if (priceDirection === 'decreasing') {
      sellerBargainingPower -= 0.1; // Seller has less power when buyer is backing down
    }
    
    const buyerBargainingPower = 1 - sellerBargainingPower;
    
    // History-informed Rubinstein solution
    const denominator = 1 - (sellerDiscountFactor * buyerDiscountFactor);
    let nashPrice: number;
    
    if (negotiationRound % 2 === 1) {
      // Seller's turn to make offer
      nashPrice = (sellerTargetPrice + (buyerDiscountFactor * estimatedBuyerMax)) / denominator;
    } else {
      // Buyer's turn (we're responding to buyer offer) - key scenario
      nashPrice = (estimatedBuyerMax + (sellerDiscountFactor * sellerTargetPrice)) / denominator;
      
      // Apply buyer trend factor
      nashPrice = nashPrice * buyerTrendFactor;
      
      // Learn from buyer's increment pattern
      if (buyerLearningAdjustment > 0) {
        nashPrice = buyerOfferPrice * (1 + buyerLearningAdjustment * 2); // Mirror their increment style
      }
    }
    
    // Adjust for market conditions and competition
    if (competitorCount >= 2) {
      // Multiple buyers create auction dynamics
      nashPrice = Math.min(estimatedBuyerMax, nashPrice * (1 + competitorCount * 0.05));
    }
    
    // History-aware bounds - much more conservative for positive momentum
    let lowerBound = buyerOfferPrice * 1.05; // Default 5% above
    let upperBound = estimatedBuyerMax * 0.95; // Default 95% of max
    
    if (priceDirection === 'increasing') {
      // Buyer trending up - use smaller increments to maintain momentum
      lowerBound = buyerOfferPrice * 1.03; // Only 3% above
      upperBound = buyerOfferPrice * 1.12; // Cap at 12% above current offer
    } else if (priceDirection === 'decreasing') {
      // Buyer backing down - can be more aggressive
      lowerBound = buyerOfferPrice * 1.08; // 8% above minimum
    }
    
    // Apply bounds
    nashPrice = Math.max(lowerBound, Math.min(upperBound, nashPrice));
    
    // Calculate confidence based on information quality and history
    const informationQuality = Math.max(0.3, 1 - (Math.abs(marketValue - estimatedBuyerMax) / marketValue));
    const roundAdjustment = Math.max(0.7, 1 - (negotiationRound * 0.05));
    const historyBonus = buyerOffers.length >= 2 ? 0.1 : 0; // More confidence with history
    const confidence = Math.min(1.0, (informationQuality * roundAdjustment) + historyBonus);
    
    // Expected profit analysis
    const expectedProfit = nashPrice - sellerTargetPrice;
    const profitMargin = expectedProfit / sellerTargetPrice;
    
    // Enhanced recommendation logic based on history
    let recommendation: string;
    const priceIncrease = ((nashPrice - buyerOfferPrice) / buyerOfferPrice) * 100;
    
    if (priceDirection === 'increasing' && priceIncrease <= 10) {
      recommendation = 'COUNTER_CONSERVATIVE'; // Maintain momentum
    } else if (priceDirection === 'increasing' && priceIncrease > 15) {
      recommendation = 'ACCEPT'; // Don't kill positive momentum with big counter
    } else if (nashPrice > buyerOfferPrice * 1.15) {
      recommendation = 'COUNTER';
    } else if (nashPrice > buyerOfferPrice * 1.05) {
      recommendation = 'CONSIDER_COUNTER';
    } else {
      recommendation = 'ACCEPT';
    }
    
    const historyContext = buyerOffers.length >= 2 ? 
      `buyer trending ${priceDirection} (${buyerOffers.map(o => `$${o.price}`).join(' → ')})` : 
      'limited history';
    
    return {
      nashEquilibriumPrice: Number(nashPrice.toFixed(2)),
      confidence: Number(confidence.toFixed(2)),
      expectedProfit: Number(expectedProfit.toFixed(2)),
      profitMargin: Number(profitMargin.toFixed(3)),
      sellerBargainingPower: Number(sellerBargainingPower.toFixed(2)),
      buyerBargainingPower: Number(buyerBargainingPower.toFixed(2)),
      recommendation: recommendation,
      priceIncrease: Number(priceIncrease.toFixed(1)),
      reasoning: `History-aware Nash suggests $${nashPrice.toFixed(0)} (${priceIncrease.toFixed(1)}% increase) considering ${historyContext}, ${competitorCount} competitors, round ${negotiationRound}. ${priceDirection === 'increasing' ? 'Buyer showing positive momentum - use conservative counter.' : priceDirection === 'decreasing' ? 'Buyer backing down - can be more firm.' : 'Stable buyer behavior.'}`
    };
  },
});

export const auctionTheoryTool = tool({
  description: 'Analyze auction dynamics when multiple buyers are present',
  inputSchema: z.object({
    currentOffers: z.array(z.object({
      buyerId: z.string(),
      price: z.number().positive(),
      timestamp: z.string(),
      urgency: z.number().min(0).max(1).optional(),
    })),
    itemValue: z.number().positive().describe('Estimated item market value'),
    sellerTargetPrice: z.number().positive().describe('Seller target price'),
  }),
  execute: async ({ currentOffers, itemValue, sellerTargetPrice }) => {
    if (currentOffers.length < 2) {
      return {
        strategy: 'single_buyer',
        recommendedAction: 'USE_NASH_EQUILIBRIUM',
        reasoning: 'Not enough buyers for auction dynamics'
      };
    }
    
    // Sort offers by price descending
    const sortedOffers = [...currentOffers].sort((a, b) => b.price - a.price);
    const highestOffer = sortedOffers[0];
    const secondHighestOffer = sortedOffers[1];
    
    // Calculate bid increment pattern
    const averageIncrement = currentOffers.length > 1 ? 
      (highestOffer.price - secondHighestOffer.price) : 
      highestOffer.price * 0.05;
    
    // First-price sealed bid theory: optimal reserve price
    const optimalReserve = Math.max(
      sellerTargetPrice,
      itemValue * 0.8, // 80% of market value as minimum
      highestOffer.price * 1.1 // 10% above current highest
    );
    
    // Calculate auction deadline based on bidding velocity
    const now = new Date();
    const recentOffers = currentOffers.filter(offer => 
      (now.getTime() - new Date(offer.timestamp).getTime()) < 24 * 60 * 60 * 1000 // Last 24 hours
    );
    
    let recommendedDeadline: Date;
    if (recentOffers.length >= 3) {
      // Active bidding - short deadline
      recommendedDeadline = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours
    } else if (recentOffers.length >= 1) {
      // Moderate activity
      recommendedDeadline = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours
    } else {
      // Low activity - longer deadline
      recommendedDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    }
    
    // Competition intensity analysis
    const competitionIntensity = Math.min(1, 
      (currentOffers.length - 1) * 0.2 + 
      (averageIncrement / itemValue) * 2
    );
    
    return {
      strategy: 'auction_mode',
      recommendedAction: highestOffer.price >= optimalReserve ? 'ACCEPT' : 'SET_DEADLINE',
      optimalReservePrice: Number(optimalReserve.toFixed(2)),
      recommendedDeadline: recommendedDeadline.toISOString(),
      competitionIntensity: Number(competitionIntensity.toFixed(2)),
      expectedFinalPrice: Number((highestOffer.price * (1 + competitionIntensity * 0.1)).toFixed(2)),
      reasoning: `${currentOffers.length} active buyers with ${(competitionIntensity * 100).toFixed(0)}% competition intensity. ${highestOffer.price >= optimalReserve ? 'Current highest offer meets reserve.' : 'Set deadline to encourage final bids.'}`
    };
  },
});

export const marketAnalysisTool = tool({
  description: 'Analyze market conditions and comparable sales for pricing decisions',
  inputSchema: z.object({
    furnitureType: z.string().describe('Type of furniture being sold'),
    itemCondition: z.string().optional().describe('Condition of the item'),
    listingPrice: z.number().positive().describe('Current listing price'),
    daysListed: z.number().int().min(0).describe('Number of days item has been listed'),
  }),
  execute: async ({ furnitureType, itemCondition, listingPrice, daysListed }) => {
    // This would typically query your market intelligence table
    // For now, we'll use heuristics based on typical furniture market patterns
    
    const furnitureMultipliers: Record<string, number> = {
      'couch': 0.85,
      'dining_table': 0.90,
      'bed': 0.80,
      'chair': 0.75,
      'desk': 0.85,
      'dresser': 0.80,
      'coffee_table': 0.70,
      'nightstand': 0.75,
      'bookshelf': 0.75,
      'cabinet': 0.85,
      'other': 0.70
    };
    
    const baseRetentionRate = furnitureMultipliers[furnitureType] || 0.75;
    
    // Condition adjustments
    const conditionMultiplier = itemCondition === 'excellent' ? 1.0 :
                               itemCondition === 'good' ? 0.9 :
                               itemCondition === 'fair' ? 0.75 :
                               0.85; // default
    
    // Time on market adjustment
    const timeAdjustment = Math.max(0.7, 1 - (daysListed * 0.01)); // 1% decrease per day
    
    const estimatedMarketValue = listingPrice * baseRetentionRate * conditionMultiplier * timeAdjustment;
    
    // Demand scoring (would be real data in production)
    const baseDemandScore = furnitureType === 'dining_table' ? 0.8 :
                           furnitureType === 'couch' ? 0.7 :
                           furnitureType === 'bed' ? 0.75 :
                           0.6;
    
    const demandScore = Math.max(0.1, Math.min(1.0, baseDemandScore * timeAdjustment));
    
    // Price recommendation
    let priceRecommendation: string;
    if (estimatedMarketValue > listingPrice * 0.9) {
      priceRecommendation = 'MAINTAIN_PRICE';
    } else if (estimatedMarketValue > listingPrice * 0.8) {
      priceRecommendation = 'SLIGHT_DECREASE';
    } else {
      priceRecommendation = 'SIGNIFICANT_DECREASE';
    }
    
    return {
      estimatedMarketValue: Number(estimatedMarketValue.toFixed(2)),
      demandScore: Number(demandScore.toFixed(2)),
      priceRecommendation,
      daysToSale: Math.round(30 * (1 - demandScore) + 5),
      competitivePriceRange: {
        low: Number((estimatedMarketValue * 0.9).toFixed(2)),
        high: Number((estimatedMarketValue * 1.1).toFixed(2))
      },
      marketTrend: daysListed > 14 ? 'declining' : daysListed > 7 ? 'stable' : 'rising',
      reasoning: `${furnitureType} typically retains ${(baseRetentionRate * 100).toFixed(0)}% of listing value. After ${daysListed} days, estimated market value is $${estimatedMarketValue.toFixed(0)} with ${(demandScore * 100).toFixed(0)}% demand score.`
    };
  },
});