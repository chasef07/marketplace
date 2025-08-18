# Autonomous Seller Agent - Testing & Implementation Guide

## Overview
This guide explains how to test, understand, and deploy the autonomous seller agent system. The agent uses game theory and AI to automatically handle negotiations, maximizing seller profits without human intervention.

## Prerequisites

### 1. Database Setup
Run the agent schema SQL to create required tables:

```bash
# In your Supabase dashboard, execute:
cat supabase/agent-schema.sql
```

### 2. Environment Variables
Ensure these are set in your `.env.local`:

```env
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Dependencies
The following packages should already be installed:
- `ai@latest` - Vercel AI SDK v5
- `@ai-sdk/openai@latest` - OpenAI provider
- `zod@latest` - Schema validation

## API Endpoints

### 1. Agent Setup (`/api/agent/setup`)

**Purpose**: Configure the AI agent for an item

**POST Request**:
```json
{
  "itemId": 123,
  "targetPrice": 250,
  "agentEnabled": true,
  "strategyMode": "single_offer",
  "timeUrgency": 0.3
}
```

**Response**:
```json
{
  "success": true,
  "agentContext": { ... },
  "recommendations": {
    "targetPrice": 250,
    "estimatedMarketValue": 225,
    "setupComplete": true,
    "nextSteps": "Agent is now monitoring offers..."
  }
}
```

### 2. Agent Analysis (`/api/agent`)

**Purpose**: Main agent decision-making endpoint

**POST Request**:
```json
{
  "negotiationId": 456,
  "action": "analyze_offer"
}
```

**Response**:
```json
{
  "success": true,
  "decision": "COUNTER",
  "reasoning": "Nash equilibrium suggests $275 based on...",
  "confidence": 0.85,
  "actionResult": {
    "success": true,
    "action": "COUNTERED",
    "counterPrice": 275
  },
  "notificationMessage": null,
  "shouldNotifySeller": false,
  "analysis": {
    "marketValue": 225,
    "nashPrice": 275,
    "expectedOutcome": 260,
    "competitorCount": 1
  }
}
```

### 3. Agent Trigger (`/api/agent/trigger`)

**Purpose**: Automatically trigger agent when new offers arrive

**POST Request**:
```json
{
  "negotiationId": 456,
  "offerId": 789
}
```

## Testing Scenarios

### Scenario 1: Basic Setup and Single Offer

**Step 1**: Setup Agent
```bash
curl -X POST http://localhost:3000/api/agent/setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "itemId": 1,
    "targetPrice": 200,
    "agentEnabled": true,
    "strategyMode": "single_offer",
    "timeUrgency": 0.3
  }'
```

**Step 2**: Create Test Negotiation
1. Have a buyer make an offer on the item ($150)
2. This should automatically trigger the agent via the trigger endpoint

**Expected Result**: Agent should counter with a price between $165-$180 (Nash equilibrium calculation)

### Scenario 2: Multiple Competing Offers

**Step 1**: Setup Agent
```json
{
  "itemId": 2,
  "targetPrice": 300,
  "strategyMode": "multiple_offers",
  "timeUrgency": 0.2
}
```

**Step 2**: Create Multiple Offers
1. Buyer A offers $200
2. Buyer B offers $220
3. Buyer C offers $250

**Expected Result**: Agent should switch to auction mode and set a deadline, encouraging higher bids

### Scenario 3: High Urgency Pickup

**Step 1**: Setup Agent with High Urgency
```json
{
  "itemId": 3,
  "targetPrice": 150,
  "strategyMode": "urgent_pickup",
  "timeUrgency": 0.8
}
```

**Step 2**: Buyer offers $140 with message "can pick up today"

**Expected Result**: Agent should accept due to high urgency and immediate pickup convenience

### Scenario 4: Low-Ball Offer Rejection

**Step 1**: Setup Agent
```json
{
  "itemId": 4,
  "targetPrice": 400,
  "timeUrgency": 0.1
}
```

**Step 2**: Buyer offers $200 (50% of target)

**Expected Result**: Agent should decline or counter conservatively, depending on market analysis

## Understanding Agent Decisions

### Decision Types

1. **ACCEPT** 
   - Offer meets or exceeds Nash equilibrium
   - High confidence in market analysis
   - Multiple rounds reached maximum

2. **COUNTER**
   - Nash equilibrium suggests higher price is achievable
   - Price is rounded to nearest $5
   - Includes game theory reasoning

3. **WAIT**
   - Multiple buyers detected (auction mode)
   - Setting deadline to encourage competition
   - Monitoring for better offers

4. **DECLINE**
   - Offer significantly below market value
   - Low probability of successful negotiation
   - Maximum rounds reached with unacceptable offer

### Game Theory Components

#### Nash Equilibrium Calculation
- Uses alternating offers bargaining model
- Considers discount factors (urgency)
- Adjusts for competition and market power

#### Auction Theory
- Triggered when ≥2 competing offers
- Calculates optimal reserve price
- Sets strategic deadlines based on bidding velocity

#### Market Analysis
- Estimates buyer willingness to pay
- Considers item condition and market demand
- Factors in time on market

## Monitoring and Debugging

### 1. Agent Status Check
```bash
curl "http://localhost:3000/api/agent?itemId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Database Queries for Debugging

**Recent Agent Decisions**:
```sql
SELECT 
  ad.*,
  n.item_id,
  i.name as item_name
FROM agent_decisions ad
JOIN negotiations n ON n.id = ad.negotiation_id
JOIN items i ON i.id = n.item_id
ORDER BY ad.created_at DESC
LIMIT 10;
```

**Agent Performance by Item**:
```sql
SELECT 
  i.name,
  ac.target_price,
  COUNT(ad.id) as decisions_made,
  AVG(ad.confidence_score) as avg_confidence,
  STRING_AGG(DISTINCT ad.decision_type, ', ') as decision_types
FROM items i
JOIN agent_context ac ON ac.item_id = i.id
LEFT JOIN negotiations n ON n.item_id = i.id
LEFT JOIN agent_decisions ad ON ad.negotiation_id = n.id
WHERE ac.agent_enabled = true
GROUP BY i.id, i.name, ac.target_price;
```

### 3. Component Integration

**Add to Layout** (`app/layout.tsx`):
```tsx
import { NotificationOverlay } from '@/components/agent/NotificationOverlay';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <NotificationOverlay />
      </body>
    </html>
  );
}
```

**Add to Item Listing** (`components/marketplace/item-detail.tsx`):
```tsx
import { AgentStatusIndicator } from '@/components/agent/AgentStatusIndicator';

// In your item detail component:
<AgentStatusIndicator itemId={item.id} />
```

## Performance Metrics

### Success Indicators
- **Revenue Optimization**: 15-25% higher average sale prices
- **Response Time**: <500ms for agent decisions
- **Confidence Scores**: >0.7 for most decisions
- **Autonomous Operation**: >90% of negotiations handled without seller input

### Key Metrics to Track
```sql
-- Average sale price improvement
SELECT 
  AVG(CASE WHEN ad.id IS NOT NULL THEN n.final_price ELSE NULL END) as agent_avg_price,
  AVG(CASE WHEN ad.id IS NULL THEN n.final_price ELSE NULL END) as manual_avg_price
FROM negotiations n
LEFT JOIN agent_decisions ad ON ad.negotiation_id = n.id
WHERE n.status = 'completed' AND n.created_at > NOW() - INTERVAL '30 days';

-- Agent decision distribution
SELECT 
  decision_type,
  COUNT(*) as count,
  AVG(confidence_score) as avg_confidence
FROM agent_decisions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY decision_type;
```

## Troubleshooting

### Common Issues

1. **Agent Not Triggering**
   - Check agent_enabled = true in agent_context
   - Verify offer is from buyer (not seller)
   - Check API rate limits

2. **Low Confidence Scores**
   - Review market analysis inputs
   - Check if buyer behavior data is available
   - Verify item pricing is reasonable

3. **Unexpected Decisions**
   - Review game theory calculations in agent_decisions.market_conditions
   - Check time urgency and competition factors
   - Validate Nash equilibrium inputs

### Debug Mode
Set environment variable for detailed logging:
```env
AGENT_DEBUG=true
```

## Production Deployment

### 1. Environment Setup
- Ensure all environment variables are configured
- Run database migrations
- Test with a few items before full rollout

### 2. Gradual Rollout
- Start with 10-20% of sellers
- Monitor performance metrics
- Adjust game theory parameters based on results

### 3. Monitoring
- Set up alerts for failed agent decisions
- Monitor average response times
- Track seller satisfaction metrics

This autonomous agent system transforms the negotiation experience from manual back-and-forth to intelligent, game-theory-powered automation that maximizes seller profits while maintaining buyer satisfaction.