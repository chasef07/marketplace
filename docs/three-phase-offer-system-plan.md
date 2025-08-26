# Three-Phase Offer System Implementation Plan

## Overview
Implement a three-phase acceptance flow with seller notifications and progress tracking.

## Three-Phase Flow
1. **Buyer Accepts** → `buyer_accepted` status (waiting for seller confirmation)
2. **Seller Confirms** → `deal_pending` status (awaiting pickup/payment)  
3. **Transaction Complete** → `completed` status (fully done)

## Implementation Steps

### 1. Database Schema Updates
- Add `buyer_accepted` to `negotiation_status` enum
- Add `sold_pending` to `item_status` enum

### 2. API Changes
- **Fix buyer-accept endpoint**: Set `buyer_accepted` status instead of `completed`
- **Create seller-confirm endpoint**: Move `buyer_accepted` → `deal_pending`
- **Update my-negotiations API**: Include all three statuses so "Accepted" tab works

### 3. Buyer Interface Fix
- Both `buyer_accepted` and `deal_pending` show in "Accepted" tab
- Different status badges for each phase

### 4. Seller Profile Enhancements
- **Highest Offer Badges**: Show "Highest: $X" on item cards (highest buyer offer only)
- **Action Required Notifications**: Cards for `buyer_accepted` negotiations needing confirmation
- **Progress Tracking**: Visual indicators on seller's items

### 5. Technical Details
- Page refresh updates (no real-time for now)
- Query highest `offer_type: 'buyer'` offers per item
- Simple notification cards with "Confirm Sale" buttons

## Expected Result
- Buyers see accepted offers properly in their tab
- Sellers get clear notifications when action is required
- Sellers can see highest buyer offers at a glance on their items
- Three clear phases prevent premature completion