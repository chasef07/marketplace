# Agent Tools

This directory contains AI agent tools for autonomous marketplace operations using the Vercel AI SDK v5.

## Overview

The agent tools provide AI agents with the ability to:
- **Analyze offers** - Assess offer value, detect lowballs, and suggest counter-offers
- **Submit counter-offers** - Make intelligent counter-offers via API
- **Make decisions** - Accept or reject offers based on parameters

## Architecture

All tools follow **Option B architecture** - they call existing API endpoints instead of direct database access for:
- **Security** - Proper authentication and authorization
- **Consistency** - Same validation and business logic as the rest of the app
- **Maintainability** - Single source of truth for operations

## Tools

### 1. analyzeOfferTool
Analyzes offers to assess value and detect lowballs.

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
  suggestedCounter: number;
  reason: string;
}
```

### 2. counterOfferTool
Submits counter-offers via the marketplace API.

**Parameters:**
- `negotiationId` - Negotiation ID
- `amount` - Counter-offer price in USD
- `message` - Message to buyer (optional)
- `authToken` - Authentication token for the seller

**API Endpoint:** `POST /api/negotiations/{negotiationId}/counter`

### 3. decideOfferTool  
Accepts or rejects offers via the marketplace API.

**Parameters:**
- `negotiationId` - Negotiation ID
- `decision` - 'accept' or 'reject'
- `reason` - Reason for decision (optional)
- `authToken` - Authentication token for the seller

**API Endpoints:**
- Accept: `POST /api/negotiations/{negotiationId}/accept`
- Reject: `POST /api/negotiations/{negotiationId}/decline`

## Usage Example

```typescript
import { analyzeOfferTool, counterOfferTool, decideOfferTool } from './agent_tools';

// Analyze an offer
const analysis = await analyzeOfferTool.execute({
  offerAmount: 800,
  listPrice: 1000,
  minAccept: 750,
  offerId: 'offer-123'
});

// Make a counter-offer if needed
if (analysis.assessment === 'Weak') {
  const counterResult = await counterOfferTool.execute({
    negotiationId: 123,
    amount: analysis.suggestedCounter,
    message: 'I can meet you at this price.',
    authToken: 'user-jwt-token'
  });
}

// Accept good offers
if (analysis.assessment === 'Strong') {
  const acceptResult = await decideOfferTool.execute({
    negotiationId: 123,
    decision: 'accept',
    authToken: 'user-jwt-token'
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

- Tools use the existing API infrastructure with rate limiting
- Authentication is handled via JWT tokens
- All operations respect Row Level Security (RLS) policies
- Real-time updates work via Supabase Realtime subscriptions

## Security

- No direct database access - all operations go through authenticated API endpoints
- Proper authorization checks in all API routes
- Rate limiting prevents abuse
- Input validation via Zod schemas