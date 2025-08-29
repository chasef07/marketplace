# AI Agent System

This directory contains the core AI agent system for autonomous marketplace negotiations using the Vercel AI SDK v5 and OpenAI GPT-4o-mini.

## Overview

**Status**: ✅ **ACTIVE** - Core system working with real-time immediate processing

The AI agent provides autonomous seller capabilities:
- **Real-time Processing** - Immediate offer analysis and response (no queuing)
- **Context-Aware Decisions** - Uses negotiation history, market conditions, and competition data
- **Strategic Reasoning** - Human-like negotiation patterns with momentum-based thinking
- **Data-Driven Intelligence** - All decisions based on real Supabase data

## Recent Updates (v2.3)

**✅ Fixed Critical Issues:**
- **Tool Conflict Resolution** - Fixed agent calling both counter-offer AND reject simultaneously
- **Tool Data Extraction** - Resolved undefined tool results, agent now receives real Supabase data
- **Database Cleanup** - Removed references to non-existent tables (`seller_agent_profile`)
- **Comprehensive Debugging** - Added detailed logging for tool execution and data flow

**🔧 Current Architecture:**
- **Immediate Processing** - Real-time offer handling via `immediate-processor.ts`
- **6 Working Tools** - All tools now return proper data to AI reasoning
- **Simplified Structure** - Removed broken components, focused on working core
- **Terminal Logging** - Agent decisions logged to `agent_decisions` table

## File Structure

```
/lib/agent/
├── README.md                    # This documentation
├── immediate-processor.ts       # Core AI processing engine
├── agent_tools.ts              # 6 AI tools for market intelligence & actions
└── types.ts                    # TypeScript interfaces

/app/api/agent/
└── monitor/                    # Statistics and monitoring endpoint
```

## Core Components

### 1. Immediate Processor (`immediate-processor.ts`)
**The brain of the operation** - Processes buyer offers in real-time using AI reasoning.

**Features:**
- **Strategic AI Prompt** - 72-line sophisticated negotiation strategy prompt
- **Tool Orchestration** - Calls all 6 tools to gather complete market intelligence
- **Conflict Prevention** - Prevents calling both counter-offer and reject tools
- **Data Logging** - Records all decisions to `agent_decisions` table
- **Comprehensive Debugging** - Detailed tool result extraction and logging

**Process Flow:**
1. Validate negotiation is active and agent is enabled
2. Gather complete market intelligence using all tools
3. AI strategic reasoning with context-aware decision making
4. Execute single action (counter-offer OR accept/reject)
5. Log decision with reasoning and tool results

### 2. Agent Tools (`agent_tools.ts`)
**6 working tools** that provide market intelligence and execute actions:

## Tools Documentation

### 1. getNegotiationHistoryTool ✅
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

### 2. analyzeOfferTool ✅
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

### 3. counterOfferTool ✅
Submits counter-offers using the offer service directly.

**Parameters:**
- `negotiationId` - Negotiation ID
- `amount` - Counter-offer price in USD
- `message` - Message to buyer (optional)
- `sellerId` - Seller ID for authentication

**Uses:** `offerService.createOffer()` with `agentGenerated: true`

### 4. decideOfferTool ✅
Accepts or rejects offers by updating negotiation status.

**Parameters:**
- `negotiationId` - Negotiation ID
- `decision` - 'accept' or 'reject'
- `reason` - Reason for decision (optional)
- `sellerId` - Seller ID for authentication

**Actions:**
- Accept: Updates negotiation to `completed` status with final price
- Reject: Updates negotiation to `cancelled` status

### 5. getListingAgeTool ✅
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

### 6. getCompetingOffersTool ✅
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

## Debug & Monitoring

### Terminal Logging
The system provides comprehensive logging for debugging:

```
🔍 Debug - Raw AI execution steps: [AI SDK structure details]
🔧 getListingAgeTool - Starting with itemId: 123
🔧 getListingAgeTool - Supabase response: {data: {...}, error: null}
🔧 getNegotiationHistoryTool - Success result: {offers: [...], momentum: 'increasing'}
🤖 Immediate Agent Processing - Completed: {decision: 'counter', executionTimeMs: 14294}
```

### Monitoring Endpoint
- **URL**: `/api/agent/monitor`
- **Purpose**: Real-time statistics and recent decisions
- **Data**: Last 24h activity, execution times, decision breakdown
- **Status**: Shows 'operational' with 'immediate_processing' mode

## Integration Notes

- **Database Access**: Direct Supabase queries for market intelligence
- **Action Execution**: Uses existing `offerService` for consistency
- **Authentication**: Seller ID validation with RLS policies  
- **Real-time**: Supabase Realtime subscriptions for live updates
- **Processing Model**: Immediate (fire-and-forget) for instant buyer response
- **Error Handling**: Comprehensive logging and graceful degradation

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

## Troubleshooting

### Common Issues Fixed

**❌ Tool Results Showing `undefined`**
- **Cause**: Wrong property path in tool result extraction
- **Fix**: Added fallback extraction: `toolResult.result || toolResult.output || toolResult.value`
- **Debug**: Comprehensive JSON logging of raw AI execution steps

**❌ Agent Calling Both Counter-offer AND Reject**
- **Cause**: Conflicting prompt instructions
- **Fix**: Made actions mutually exclusive with priority system
- **Result**: Counter-offers now keep negotiations active

**❌ References to Missing Database Tables**
- **Cause**: `seller_agent_profile` table was removed but code still referenced it
- **Fix**: Removed all references, use default `minAcceptableRatio: 0.75`

### Debug Process
1. Check terminal for `🔧 [ToolName] - Starting` logs to see if tools are called
2. Look for `🔧 [ToolName] - Supabase response` to verify database queries work
3. Check `🔍 Debug - Processed tool results` to see if data flows to AI
4. Verify `🤖 Agent Processing - Completed` shows expected decision type

## Security

- **Database Security**: Authenticated Supabase client with RLS policies
- **Action Authorization**: Uses existing `offerService` with proper seller validation
- **Input Validation**: Zod schemas prevent invalid parameters
- **Error Boundaries**: Comprehensive error handling prevents system crashes