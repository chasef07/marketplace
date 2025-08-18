# Autonomous Seller Agent - Simplified Testing Guide

## Overview
The agent now works automatically at the account level. No per-item setup required - sellers just list items and the AI handles everything automatically.

## How It Works

### 🎯 **Simple Flow**:
1. **Seller signs up** → Agent automatically enabled
2. **Seller lists item** at $200 → Agent knows target is $200
3. **Buyer offers** $150 → Agent automatically analyzes and responds
4. **No setup needed** - truly autonomous

### 🔧 **Key Components**:
- **Account-level agent** (not per-item)
- **Automatic offer monitoring** via database triggers
- **Background processing** every 30 seconds
- **Simple settings** - just enable/disable + aggressiveness level

## Database Setup

Run the simplified schema:
```bash
# In Supabase SQL Editor:
cat supabase/autonomous-agent-schema.sql
```

**Key Tables Created**:
- `seller_agent_profile` - One per seller (auto-created on signup)
- `agent_decisions` - Decision audit log
- `agent_processing_queue` - Background processing queue
- `market_intelligence` - Simple market data

## API Endpoints

### 1. Agent Settings (`/api/agent/settings`)

**Get Settings**:
```bash
curl "http://localhost:3000/api/agent/settings" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response**:
```json
{
  "settings": {
    "agentEnabled": true,
    "aggressivenessLevel": 0.5,
    "autoAcceptThreshold": 0.95,
    "minAcceptableRatio": 0.75,
    "responseDelayMinutes": 0
  },
  "statistics": {
    "activeItems": 3,
    "decisionsLast30Days": {
      "total": 12,
      "accepted": 4,
      "countered": 6,
      "declined": 2
    }
  }
}
```

**Update Settings**:
```bash
curl -X PUT http://localhost:3000/api/agent/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "agentEnabled": true,
    "aggressivenessLevel": 0.7
  }'
```

### 2. Background Monitor (`/api/agent/monitor`)

**Manual Trigger** (for testing):
```bash
curl -X POST http://localhost:3000/api/agent/monitor
```

**Response**:
```json
{
  "success": true,
  "processed": 1,
  "task": {
    "negotiationId": 123,
    "itemId": 456,
    "decision": "COUNTER",
    "confidence": 0.85,
    "reasoning": "Nash equilibrium suggests $175",
    "actionResult": {
      "success": true,
      "action": "COUNTERED",
      "price": 175
    }
  }
}
```

### 3. Cron Service (`/api/agent/cron`)

**Check Status**:
```bash
curl "http://localhost:3000/api/agent/cron"
```

## Testing Scenarios

### Scenario 1: Complete Autonomous Flow

**Step 1**: Create seller account
- Agent profile automatically created with defaults

**Step 2**: List item
```json
{
  "name": "Dining Table",
  "starting_price": 200,
  "furniture_type": "dining_table"
}
```

**Step 3**: Buyer makes offer
```json
{
  "price": 150,
  "message": "Interested in this table"
}
```

**Expected Result**: 
- Offer automatically queued for processing
- Agent analyzes using game theory
- Responds with counter-offer around $175-$180
- Seller gets brief notification: "Countered to $175"

### Scenario 2: Multiple Competing Offers

**Step 1**: List item at $300

**Step 2**: Multiple buyers offer:
- Buyer A: $220
- Buyer B: $240  
- Buyer C: $260

**Expected Result**:
- Agent detects competition
- May counter higher or accept best offer
- Uses auction dynamics

### Scenario 3: Agent Settings Adjustment

**Step 1**: Set aggressive mode
```json
{
  "aggressivenessLevel": 0.8,
  "autoAcceptThreshold": 0.98
}
```

**Step 2**: Buyer offers 90% of listing price

**Expected Result**: Agent counters for more (aggressive mode)

**Step 3**: Set conservative mode  
```json
{
  "aggressivenessLevel": 0.3,
  "autoAcceptThreshold": 0.85
}
```

**Expected Result**: Agent accepts lower offers more readily

## Monitoring & Debugging

### Database Queries

**Check Agent Queue**:
```sql
SELECT 
  apq.*,
  n.item_id,
  i.name as item_name,
  o.price as offer_price
FROM agent_processing_queue apq
JOIN negotiations n ON n.id = apq.negotiation_id
JOIN items i ON i.id = n.item_id
JOIN offers o ON o.id = apq.offer_id
ORDER BY apq.created_at DESC;
```

**Recent Agent Decisions**:
```sql
SELECT 
  ad.*,
  i.name as item_name,
  i.starting_price
FROM agent_decisions ad
JOIN items i ON i.id = ad.item_id
ORDER BY ad.created_at DESC
LIMIT 10;
```

**Agent Performance by Seller**:
```sql
SELECT 
  p.username,
  sap.agent_enabled,
  COUNT(ad.id) as total_decisions,
  AVG(ad.confidence_score) as avg_confidence,
  STRING_AGG(DISTINCT ad.decision_type, ', ') as decision_types
FROM seller_agent_profile sap
JOIN profiles p ON p.id = sap.seller_id
LEFT JOIN agent_decisions ad ON ad.seller_id = sap.seller_id
WHERE sap.agent_enabled = true
GROUP BY p.username, sap.agent_enabled;
```

### Background Processing

**Manual Process Queue**:
```bash
# Process next 5 items in queue
curl -X POST http://localhost:3000/api/agent/cron \
  -H "Content-Type: application/json" \
  -d '{"maxTasks": 5}'
```

**Monitor Queue Status**:
```bash
curl "http://localhost:3000/api/agent/monitor"
```

## UI Integration

### Add Agent Toggle to Settings Page

```tsx
import { AgentToggle } from '@/components/agent/SimpleAgentStatus';

// In seller settings:
<AgentToggle />
```

### Add Status Indicator to Dashboard

```tsx
import { SimpleAgentStatus } from '@/components/agent/SimpleAgentStatus';

// In seller dashboard:
<SimpleAgentStatus />
```

### Add Status Badge to Navigation

```tsx
import { AgentStatusBadge } from '@/components/agent/SimpleAgentStatus';

// In navigation:
<AgentStatusBadge />
```

## Production Setup

### 1. Vercel Cron (Recommended)

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/agent/cron",
    "schedule": "*/30 * * * * *"
  }]
}
```

### 2. External Cron (Alternative)

```bash
# Every 30 seconds
*/30 * * * * * curl -X GET https://your-domain.com/api/agent/cron
```

### 3. Environment Variables

```env
OPENAI_API_KEY=your_key
CRON_SECRET=your_secret_for_cron_security
```

## Success Metrics

**Expected Performance**:
- **Queue Processing**: <500ms per offer
- **Decision Accuracy**: >80% confidence scores
- **Autonomous Rate**: >95% offers handled without seller intervention
- **Revenue Improvement**: 15-25% higher average sale prices

## Troubleshooting

### Common Issues

1. **Offers Not Processing**
   - Check `seller_agent_profile.agent_enabled = true`
   - Verify cron job is running
   - Check queue: `SELECT * FROM agent_processing_queue WHERE status = 'pending'`

2. **Low Decision Quality**
   - Review `agent_decisions.confidence_score`
   - Check market intelligence data
   - Adjust aggressiveness settings

3. **Queue Backing Up**
   - Increase cron frequency
   - Check for failed tasks: `status = 'failed'`
   - Review execution times

### Debug Commands

```bash
# Check system status
curl "http://localhost:3000/api/agent/monitor"

# Process queue manually  
curl -X POST "http://localhost:3000/api/agent/monitor"

# Reset failed tasks
# (Run in Supabase SQL Editor)
UPDATE agent_processing_queue 
SET status = 'pending' 
WHERE status = 'failed' AND created_at > NOW() - INTERVAL '1 hour';
```

This simplified system delivers true "set it and forget it" autonomous negotiation without any complex setup requirements.