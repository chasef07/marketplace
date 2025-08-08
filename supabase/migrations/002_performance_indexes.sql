-- Additional performance indexes for optimized queries
-- Run this migration to add composite indexes for better query performance

-- Composite index for available items ordered by creation date (most common marketplace query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_available_created 
ON public.items(is_available, created_at DESC) 
WHERE is_available = true;

-- Composite index for category filtering with availability
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_category_available 
ON public.items(furniture_type, is_available, created_at DESC) 
WHERE is_available = true;

-- Composite index for price range queries with category
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_category_price 
ON public.items(furniture_type, starting_price, is_available) 
WHERE is_available = true;

-- Index for item search by seller with availability
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_seller_available 
ON public.items(seller_id, is_available, created_at DESC);

-- Partial index for active negotiations only (most queries filter by active status)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_negotiations_active 
ON public.negotiations(item_id, seller_id, buyer_id, created_at DESC) 
WHERE status = 'active';

-- Index for recent offers by negotiation (frequently accessed in UI)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_negotiation_recent 
ON public.offers(negotiation_id, created_at DESC, offer_type);

-- Index for user's recent negotiations (dashboard queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_negotiations_user_recent_seller 
ON public.negotiations(seller_id, status, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_negotiations_user_recent_buyer 
ON public.negotiations(buyer_id, status, updated_at DESC);

-- Index for chat system performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_seller_updated 
ON public.conversations(seller_id, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_conversation_created 
ON public.chat_messages(conversation_id, created_at DESC);

-- Index for view count updates (frequently updated)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_views 
ON public.items(views_count DESC, is_available) 
WHERE is_available = true;

-- Text search indexes for better performance on item names and descriptions
-- Note: These use PostgreSQL's built-in text search capabilities
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_search_name 
ON public.items USING gin(to_tsvector('english', name)) 
WHERE is_available = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_items_search_description 
ON public.items USING gin(to_tsvector('english', description)) 
WHERE is_available = true;