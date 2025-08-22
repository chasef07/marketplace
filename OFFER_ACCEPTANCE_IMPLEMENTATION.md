# Comprehensive Offer Acceptance System Implementation

## Overview

This document outlines the complete implementation of buyer offer acceptance functionality for the furniture marketplace. The system provides atomic, secure, and data-consistent offer acceptance with proper validation and error handling.

## Database Schema Changes

### New Columns Added to `offers` Table

```sql
-- Acceptance tracking columns
is_accepted BOOLEAN DEFAULT FALSE
accepted_at TIMESTAMP WITH TIME ZONE
accepted_by UUID REFERENCES public.profiles(id)

-- Status tracking column  
status offer_status DEFAULT 'pending'
```

### New Enum Type: `offer_status`

```sql
CREATE TYPE offer_status AS ENUM (
    'pending',      -- Waiting for response
    'accepted',     -- Accepted by recipient
    'declined',     -- Declined by recipient  
    'superseded',   -- Replaced by newer offer
    'expired'       -- Expired due to time limit
);
```

## Core RPC Functions

### 1. `accept_offer(p_negotiation_id, p_accepting_user_id)`

**Purpose**: Atomically accept an offer and complete the entire transaction flow.

**Workflow**:
1. Validates negotiation exists and is active
2. Determines user role (buyer/seller) and validates permissions
3. Fetches latest offer and validates it can be accepted
4. Ensures user isn't accepting their own offer
5. Atomically updates:
   - Accepted offer status to 'accepted'
   - All other offers to 'superseded'
   - Negotiation status to 'completed'
   - Item status to 'sold' with buyer assignment
   - Cancels other active negotiations for the same item

**Returns**:
```sql
TABLE (
    success BOOLEAN,
    message TEXT,
    final_price DECIMAL(10,2),
    offer_id BIGINT,
    negotiation_id BIGINT
)
```

### 2. `get_current_offer(neg_id)`

**Purpose**: Retrieve the latest offer in a negotiation with full details.

**Returns**: Complete offer information including buyer/seller IDs from the negotiation.

### 3. `get_negotiation_summary(neg_id)`

**Purpose**: Get comprehensive negotiation status with acceptance capabilities.

**Returns**: 
- Negotiation details
- Latest offer information
- Boolean flags for `can_buyer_accept` and `can_seller_accept`
- User information and offer counts

## API Endpoints

### Enhanced Endpoints

1. **`/api/negotiations/[negotiationId]/accept`** - Seller accepts buyer offers
2. **`/api/negotiations/[negotiationId]/buyer-accept`** - Buyer accepts seller offers  
3. **`/api/negotiations/[negotiationId]/accept-offer`** - Unified endpoint for both roles

### Unified Accept Endpoint Features

- **Role Detection**: Automatically determines if user is buyer or seller
- **Permission Validation**: Uses `get_negotiation_summary` to validate acceptance permissions
- **Detailed Error Messages**: Provides specific feedback about why acceptance failed
- **Atomic Operations**: Uses the `accept_offer` RPC for guaranteed consistency

## Security Implementation

### Row Level Security (RLS) Policies

```sql
-- Users can view offers for their negotiations
"Users can view offers for their negotiations"

-- Users can update offer status in their active negotiations
"Users can update offer status in their negotiations"
```

### Validation Triggers

**`handle_offer_status_validation()`**:
- Ensures accepted offers have required metadata
- Prevents acceptance of non-pending offers
- Automatically sets acceptance flags and timestamps

## Data Flow and State Management

### Offer Acceptance Workflow

```
1. User initiates acceptance → API endpoint
2. Validate user permissions → get_negotiation_summary
3. Execute atomic acceptance → accept_offer RPC
4. Update all related records:
   ├── offers (accepted/superseded)
   ├── negotiations (completed)
   ├── items (sold + buyer assignment)
   └── other negotiations (cancelled)
5. Return success confirmation
```

### State Transitions

**Offer States**:
- `pending` → `accepted` (by recipient)
- `pending` → `superseded` (by newer offer)
- `pending` → `declined` (explicit rejection)
- `pending` → `expired` (time-based expiration)

**Negotiation States**:
- `active` → `completed` (offer accepted)
- `active` → `cancelled` (explicit cancellation or item sold to other buyer)

**Item States**:
- `active`/`under_negotiation` → `sold` (offer accepted)

## Performance Optimizations

### New Indexes

```sql
-- Offer status queries
idx_offers_status ON offers(status, negotiation_id)

-- Accepted offers tracking
idx_offers_accepted ON offers(is_accepted, accepted_at DESC)

-- Pending offers by negotiation
idx_offers_pending_negotiation ON offers(negotiation_id, created_at DESC)

-- Comprehensive acceptance lookups
idx_offers_acceptance_lookup ON offers(negotiation_id, offer_type, status, created_at DESC)
```

### Database Views

**`active_negotiations_with_offers`**:
- Pre-computed acceptance capabilities
- Latest offer details
- User information
- Performance-optimized for dashboard queries

## Error Handling and Validation

### Comprehensive Validation Checks

1. **Authentication**: User must be authenticated
2. **Authorization**: User must be part of the negotiation
3. **Negotiation Status**: Must be 'active'
4. **Offer Availability**: Must have pending offer from other party
5. **Self-Acceptance Prevention**: Cannot accept own offers
6. **Item Availability**: Item must still be available for sale
7. **Concurrent Modification**: Handles race conditions atomically

### Error Response Format

```json
{
  "error": "Specific error message",
  "details": {
    "latest_offer_type": "buyer|seller",
    "latest_offer_status": "pending|accepted|superseded",
    "can_accept": false
  }
}
```

## Testing and Validation

### Comprehensive Test Suite

The `test-offer-acceptance.sql` file includes:

1. **Functional Tests**: Core acceptance workflow
2. **Validation Tests**: Error conditions and edge cases
3. **Security Tests**: RLS policy verification
4. **Performance Tests**: Index effectiveness
5. **Data Integrity Tests**: Atomic operation verification

### Test Coverage

- ✅ Basic offer acceptance (buyer and seller)
- ✅ Self-acceptance prevention
- ✅ Duplicate acceptance prevention
- ✅ Negotiation completion workflow
- ✅ Item status updates
- ✅ Other negotiation cancellation
- ✅ Offer status tracking
- ✅ Permission validation
- ✅ Data consistency verification

## Migration and Deployment

### Step-by-Step Deployment

1. **Apply Schema Changes**: Run `offer-acceptance-migration.sql`
2. **Verify Functions**: Test RPC functions with sample data
3. **Update API Routes**: Deploy enhanced endpoints
4. **Run Test Suite**: Execute `test-offer-acceptance.sql`
5. **Monitor Performance**: Check index usage and query performance

### Data Migration

The migration automatically:
- Sets default status for existing offers
- Marks final offers in completed negotiations as 'accepted'
- Updates superseded offers in completed negotiations
- Preserves all existing data integrity

## Frontend Integration

### Usage Examples

```typescript
// Accept an offer (unified endpoint)
const response = await fetch(`/api/negotiations/${negotiationId}/accept-offer`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();

if (result.success) {
  // Handle successful acceptance
  console.log(`Deal completed for $${result.final_price}`);
} else {
  // Handle specific error
  console.error(result.error);
}
```

### Real-time Updates

The system supports real-time updates through Supabase Realtime:

```typescript
// Subscribe to negotiation changes
supabase
  .channel(`negotiation-${negotiationId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'negotiations',
    filter: `id=eq.${negotiationId}`
  }, (payload) => {
    if (payload.new.status === 'completed') {
      // Handle negotiation completion
      refreshNegotiationData();
    }
  })
  .subscribe();
```

## Monitoring and Analytics

### Key Metrics to Track

1. **Acceptance Rate**: Offers accepted vs. total offers
2. **Time to Acceptance**: Duration between offer and acceptance
3. **Negotiation Completion Rate**: Active → Completed ratio
4. **Error Rates**: API endpoint error frequencies
5. **Performance Metrics**: RPC function execution times

### Database Queries for Analytics

```sql
-- Acceptance rate by time period
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) FILTER (WHERE status = 'accepted') as accepted_offers,
  COUNT(*) as total_offers,
  ROUND(COUNT(*) FILTER (WHERE status = 'accepted') * 100.0 / COUNT(*), 2) as acceptance_rate
FROM public.offers
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date;

-- Average negotiation duration
SELECT 
  AVG(EXTRACT(EPOCH FROM completed_at - created_at) / 3600) as avg_hours_to_completion
FROM public.negotiations
WHERE status = 'completed'
AND completed_at >= NOW() - INTERVAL '30 days';
```

## Security Considerations

### Data Protection

1. **RLS Enforcement**: All queries respect user-level security
2. **Input Validation**: All parameters validated at API and database level
3. **Atomic Operations**: Prevent partial state updates
4. **Audit Trail**: Complete tracking of acceptance events

### Access Control

- Users can only accept offers in negotiations they're part of
- Cannot accept their own offers
- Cannot modify completed negotiations
- All acceptance events are logged with timestamps and user IDs

## Future Enhancements

### Potential Improvements

1. **Offer Expiration**: Automatic expiration based on time limits
2. **Acceptance Conditions**: Conditional acceptance with modifications
3. **Bulk Operations**: Accept multiple offers simultaneously
4. **Advanced Analytics**: Machine learning for acceptance prediction
5. **Notification System**: Real-time alerts for offer status changes

This implementation provides a robust, secure, and scalable foundation for offer acceptance in the furniture marketplace, ensuring data integrity and excellent user experience.