# Phase-1 Seller Negotiation Agent Implementation Plan

## Overview
Build a deterministic, game-theory-powered seller negotiation agent using Next.js App Router, Vercel AI SDK v5 with tool calling on Edge runtime, integrated with the existing Supabase database.

## Dependencies to Add
```bash
npm install ai @ai-sdk/openai @ai-sdk/react zod
```

## Database Schema Extensions

### New Tables
```sql
-- Agent pricing context and market analysis
CREATE TABLE seller_agent_context (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT REFERENCES items(id),
  map_price DECIMAL(10,2) NOT NULL, -- Minimum Acceptable Price
  target_price DECIMAL(10,2) NOT NULL, -- Seller's ideal price
  equilibrium_price DECIMAL(10,2), -- Rubinstein equilibrium calculation
  market_demand_score DECIMAL(3,2) DEFAULT 0.5, -- 0-1 scale
  time_pressure_score DECIMAL(3,2) DEFAULT 0.3, -- 0-1 scale
  competitor_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Agent decision audit log
CREATE TABLE agent_decisions (
  id BIGSERIAL PRIMARY KEY,
  negotiation_id BIGINT REFERENCES negotiations(id),
  agent_action TEXT, -- 'ACCEPT', 'COUNTER', 'DECLINE', 'WAIT', 'SCHEDULE'
  recommended_price DECIMAL(10,2),
  buyer_prediction TEXT, -- ToM prediction in 1-2 sentences
  reasoning TEXT,
  tool_inputs JSONB,
  tool_outputs JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Extend offers table
ALTER TABLE offers ADD COLUMN agent_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE offers ADD COLUMN round_number INTEGER DEFAULT 1;
```

## Core Architecture

### 1. Quote Ladder Engine (`/src/lib/pricing/quote-ladder.ts`)
```typescript
interface QuoteLadderParams {
  mapPrice: number;
  targetPrice: number;
  currentOffer: number;
  roundNumber: number;
  marketDemand: number; // 0-1
  timePressure: number; // 0-1
  competitorCount: number;
}

interface QuoteLadderResult {
  nextCounter: number;
  equilibriumPrice: number;
  confidence: number;
  reasoning: string;
}
```

### 2. Rubinstein Equilibrium Calculator (`/src/lib/pricing/rubinstein.ts`)
```typescript
interface RubinsteinParams {
  sellerValuation: number;
  buyerValuation: number; // estimated
  sellerDiscount: number; // time preference
  buyerDiscount: number; // estimated
}
```

### 3. Theory of Mind Predictor (`/src/lib/agent/buyer-prediction.ts`)
```typescript
interface BuyerProfile {
  responseTimePattern: 'fast' | 'slow' | 'variable';
  priceFlexibility: 'rigid' | 'moderate' | 'flexible';
  negotiationStyle: 'aggressive' | 'collaborative' | 'passive';
  pickupPreference: 'immediate' | 'flexible' | 'scheduled';
}
```

## API Implementation

### 1. Main Agent Endpoint (`/app/api/seller-agent/route.ts`)
- Edge runtime configuration
- Vercel AI SDK v5 with tool calling
- Integration with existing negotiation system
- Deterministic pricing tools

### 2. Tool Functions for AI
```typescript
const tools = {
  getMarketContext: z.object({
    itemId: z.number(),
    furnitureType: z.string()
  }),
  calculateQuoteLadder: z.object({
    mapPrice: z.number(),
    targetPrice: z.number(),
    currentOffer: z.number(),
    roundNumber: z.number()
  }),
  predictBuyerBehavior: z.object({
    buyerId: z.string(),
    negotiationHistory: z.array(z.object({
      price: z.number(),
      responseTime: z.number(),
      roundNumber: z.number()
    }))
  }),
  checkCompetingOffers: z.object({
    itemId: z.number()
  })
};
```

### 3. System Prompt Template
```
You are SellerAgent. Maximize seller utility = price − time_cost − hassle.
Rules:
(1) Use tools for context and precedents.
(2) Predict buyer's next move in 1–2 sentences (light ToM).
(3) If COUNTER, you MUST call quote_ladder_next; do not invent numbers.
(4) ACCEPT if offer ≥ target or ≥ equilibrium/ladder counter.
(5) With many offers, announce a real deadline and prioritize near-term pickup.
(6) Keep messages concise, friendly, and specific; propose concrete pickup windows.
(7) Rotate non-price levers (pickup time, bundle) before cutting price.
```

## File Structure
```
apps/web/
├── app/api/seller-agent/
│   ├── route.ts                    # Main agent endpoint
│   └── tools/
│       ├── market-context.ts       # Market analysis tool
│       ├── quote-ladder.ts         # Pricing tool
│       ├── buyer-prediction.ts     # ToM tool
│       └── competing-offers.ts     # Multi-offer tool
├── src/lib/
│   ├── pricing/
│   │   ├── quote-ladder.ts         # Core pricing logic
│   │   ├── rubinstein.ts          # Equilibrium calculator
│   │   └── market-analysis.ts     # Demand/supply analysis
│   ├── agent/
│   │   ├── buyer-prediction.ts     # Theory of Mind
│   │   ├── decision-engine.ts     # ACCEPT/COUNTER/DECLINE logic
│   │   └── message-composer.ts    # LLM response formatting
│   └── types/
│       └── agent.ts               # TypeScript interfaces
└── components/seller/
    ├── AgentDashboard.tsx         # Seller agent UI
    └── NegotiationPanel.tsx       # Enhanced negotiation view
```

## Key Implementation Details

### 1. Deterministic Pricing Rules
- All prices calculated by mathematical functions
- LLM only formats messages, never chooses numbers
- Quote ladder ensures counters stay within [MAP...Target] band
- Round to nearest $5

### 2. Edge Runtime Optimization
- Minimal dependencies for Edge compatibility
- Fast response times for real-time negotiations
- Efficient database queries with proper indexing

### 3. Tool Calling Integration
- Vercel AI SDK v5 tool definitions with Zod schemas
- Structured data flow between tools and LLM
- Audit logging for all tool calls

### 4. Multi-Buyer Handling
- Detect competing offers (≥3 active negotiations)
- Switch to deadline/auction messaging
- Maintain individual quote ladders per buyer

### 5. Theory of Mind Implementation
- Analyze buyer response patterns
- Predict next moves based on historical behavior
- Adapt messaging tone and urgency accordingly

## Integration Points

### 1. Existing Chat System
- Enhance `/app/api/chat/conversational/route.ts`
- Add agent mode toggle for sellers
- Maintain compatibility with current UI

### 2. Negotiation Endpoints
- Integrate with existing offer creation/acceptance flows
- Add agent decision logging
- Preserve existing RLS policies

### 3. Seller Dashboard
- Add agent recommendations display
- Show pricing analysis and market context
- Enable manual override capabilities

## Success Metrics
- **Determinism**: Same inputs → same outputs (100%)
- **Price Optimization**: Stay within MAP-Target band (100%)
- **Response Time**: <500ms on Edge runtime
- **Revenue**: 10-15% improvement in average sale prices
- **User Experience**: Friendly, specific, actionable messages

## Guardrails
- Never counter below MAP without explicit override
- Always round to $5 increments
- Log all tool inputs/outputs for audit
- Maintain human override capability
- Respect existing RLS policies

This implementation leverages your existing robust negotiation system while adding sophisticated AI-powered decision making that remains deterministic and auditable.