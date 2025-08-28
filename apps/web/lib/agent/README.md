# Agent Tools

This directory contains AI agent tools for autonomous marketplace operations using the Vercel AI SDK v5.

## Overview

The agent tools provide AI agents with the ability to:
- **Analyze offers** - Assess offer value, detect lowballs, and suggest counter-offers
- **Submit counter-offers** - Make intelligent counter-offers via API
- **Make decisions** - Accept or reject offers based on parameters
- **Gather market context** - Check listing age and competing offers for better decisions
- **Understand negotiation history** - Analyze price progression and buyer momentum for context-aware decisions

## Architecture

All tools follow **Option B architecture** - they call existing API endpoints instead of direct database access for:
- **Security** - Proper authentication and authorization
- **Consistency** - Same validation and business logic as the rest of the app
- **Maintainability** - Single source of truth for operations

## Tools

### 1. getNegotiationHistoryTool
**NEW** - Analyzes complete negotiation history to understand buyer behavior and price momentum.

**Parameters:**
- `negotiationId` - Negotiation ID to get history for

**Returns:**
```typescript
{
  offers: Array<{price, offer_type, created_at, message, round_number}>;
  currentRound: number;
  priceProgression: Array<number>;
  buyerMomentum: 'increasing' | 'decreasing' | 'stagnant' | 'new';
  lastBuyerOffer: number;
  negotiationStage: 'opening' | 'middle' | 'closing';
  highestBuyerOffer: number;
  averageBuyerOffer: number;
}
```

### 2. analyzeOfferTool
Analyzes offers to assess value and detect lowballs. **Provides context only - does NOT suggest prices.**

**Parameters:**
- `offerAmount` - Offer price in USD
- `listPrice` - Listing price in USD  
- `minAccept` - Minimum acceptable price (optional, defaults to 80% of list price)
- `offerId` - Unique offer ID

**Returns:**
```typescript
{
  offerId: string;
  assessment: 'Strong' | 'Fair' | 'Weak';
  isLowball: boolean;
  offerRatio: number; // Decimal ratio of offer to listing price
  reason: string;
}
```

### 2. counterOfferTool
Submits counter-offers using the offer service directly.

**Parameters:**
- `negotiationId` - Negotiation ID
- `amount` - Counter-offer price in USD
- `message` - Message to buyer (optional)
- `sellerId` - Seller ID for authentication

**Uses:** `offerService.createOffer()` with `agentGenerated: true`

### 3. decideOfferTool  
Accepts or rejects offers by updating negotiation status.

**Parameters:**
- `negotiationId` - Negotiation ID
- `decision` - 'accept' or 'reject'
- `reason` - Reason for decision (optional)
- `sellerId` - Seller ID for authentication

**Actions:**
- Accept: Updates negotiation to `completed` status with final price
- Reject: Updates negotiation to `cancelled` status

### 4. getListingAgeTool
Gets market timing context for better negotiation decisions.

**Parameters:**
- `itemId` - Item ID to check listing age for

**Returns:**
```typescript
{
  daysOnMarket: number;
  listingDate: string;
  totalViews: number;
  activityLevel: 'High' | 'Medium' | 'Low';
  marketStatus: 'Fresh' | 'Active' | 'Stale';
}
```

### 5. getCompetingOffersTool
Gets competitive context to understand buyer interest level.

**Parameters:**
- `itemId` - Item ID to check competing offers for
- `currentNegotiationId` - Current negotiation ID to exclude

**Returns:**
```typescript
{
  competingOffers: number;
  highestCompetingOffer: number;
  recentOfferActivity: boolean;
  competitionLevel: 'High' | 'Medium' | 'Low' | 'None';
  competingNegotiations: number;
}
```

## Usage Example

```typescript
import { 
  analyzeOfferTool, 
  counterOfferTool, 
  decideOfferTool,
  getListingAgeTool,
  getCompetingOffersTool 
} from './agent_tools';

// Get market context first
const listingAge = await getListingAgeTool.execute({
  itemId: 456
});

const competition = await getCompetingOffersTool.execute({
  itemId: 456,
  currentNegotiationId: 123
});

// Analyze the offer (context only, no price suggestions)
const analysis = await analyzeOfferTool.execute({
  offerAmount: 800,
  listPrice: 1000,
  minAccept: 750,
  offerId: 'offer-123'
});

// Make intelligent decisions based on ALL context
if (analysis.assessment === 'Weak') {
  // AI decides counter price based on full context
  let counterAmount;
  
  // Fresh listing with competition - be firm (90-95% of listing)
  if (listingAge.marketStatus === 'Fresh' && competition.competitionLevel === 'High') {
    counterAmount = Math.round(1000 * 0.92); // $920 - AI chose 92% based on context
  }
  
  // Stale listing with no competition - be flexible (80-87% of listing)  
  if (listingAge.marketStatus === 'Stale' && competition.competitionLevel === 'None') {
    counterAmount = Math.round(1000 * 0.84); // $840 - AI chose 84% based on context
  }
  
  const counterResult = await counterOfferTool.execute({
    negotiationId: 123,
    amount: counterAmount, // AI-determined price, not pre-calculated
    message: 'Based on current market conditions, this is my best offer.',
    sellerId: 'seller-uuid'
  });
}

// Accept strong offers quickly
if (analysis.assessment === 'Strong') {
  const acceptResult = await decideOfferTool.execute({
    negotiationId: 123,
    decision: 'accept',
    sellerId: 'seller-uuid'
  });
}
```

## Error Handling

All tools include comprehensive error handling:
- Network errors are caught and returned with success: false
- Invalid parameters are validated by Zod schemas
- Authentication errors are handled gracefully
- Proper TypeScript types ensure type safety

## Integration Notes

- Tools use direct Supabase access for market context and offer service for actions
- Authentication handled via seller ID validation
- All operations respect Row Level Security (RLS) policies  
- Real-time updates work via Supabase Realtime subscriptions
- Agent processing is asynchronous (fire-and-forget) for instant buyer response

## Negotiation Strategy

The LLM uses human-like negotiation logic with market context to decide counter prices:

**Fresh Listings (≤7 days) with Competition:**
- Be firm on pricing (counter 90-95% of listing price)
- Leverage buyer competition
- AI decides exact percentage based on context

**Stale Listings (>21 days) with No Competition:**  
- Be flexible on pricing (counter 80-87% of listing price)
- Counter more aggressively to generate interest  
- AI decides exact percentage based on urgency

**AI Strategic Reasoning Process:**
1. **Gather Intelligence** - Use all tools to understand the complete negotiation context
2. **Analyze Buyer Psychology** - Study behavior patterns and commitment indicators  
3. **Think Strategically** - Consider what response moves the negotiation forward constructively
4. **Reason Counter-Offer** - LLM determines price using strategic thinking, not formulas
5. **Execute Decision** - Take action based on contextual reasoning

**Strategic Decision Framework:**
- **Accept:** When offer meets needs OR buyer shows strong commitment near acceptable range
- **Counter:** When there's opportunity for productive negotiation based on buyer patterns
- **Reject:** When buyer pattern suggests lack of seriousness AND offer is far below range

**Key Principle:** Tools provide context and intelligence. LLM applies strategic reasoning to determine all pricing decisions. No hardcoded formulas or percentages - pure AI strategic thinking.

## Security

- Market context tools use authenticated Supabase client with RLS policies
- Action tools use existing offer service with proper authorization
- All operations validate seller permissions
- Input validation via Zod schemas