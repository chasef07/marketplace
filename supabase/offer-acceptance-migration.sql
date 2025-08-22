-- ============================================================================
-- COMPREHENSIVE OFFER ACCEPTANCE SYSTEM
-- ============================================================================
-- This migration adds comprehensive buyer offer acceptance functionality
-- with proper atomic operations, data integrity, and security

-- 1. ADD MISSING COLUMNS TO OFFERS TABLE
-- ============================================================================

-- Add acceptance tracking to offers table
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS is_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES public.profiles(id);

-- Add buyer_id and seller_id to offers for direct access (already exist in schema)
-- These should already exist based on your current schema

-- 2. ADD OFFER ACCEPTANCE STATUS ENUM
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE offer_status AS ENUM (
        'pending',      -- Waiting for response
        'accepted',     -- Accepted by recipient
        'declined',     -- Declined by recipient  
        'superseded',   -- Replaced by newer offer
        'expired'       -- Expired due to time limit
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add status column to offers
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS status offer_status DEFAULT 'pending';

-- 3. CREATE COMPREHENSIVE RPC FUNCTIONS
-- ============================================================================

-- Function to get the current/latest offer in a negotiation
CREATE OR REPLACE FUNCTION public.get_current_offer(neg_id BIGINT)
RETURNS TABLE (
    id BIGINT,
    negotiation_id BIGINT,
    offer_type offer_type,
    price DECIMAL(10,2),
    message TEXT,
    is_counter_offer BOOLEAN,
    is_message_only BOOLEAN,
    status offer_status,
    created_at TIMESTAMP WITH TIME ZONE,
    buyer_id UUID,
    seller_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.negotiation_id,
        o.offer_type,
        o.price,
        o.message,
        o.is_counter_offer,
        o.is_message_only,
        COALESCE(o.status, 'pending'::offer_status) as status,
        o.created_at,
        n.buyer_id,
        n.seller_id
    FROM public.offers o
    JOIN public.negotiations n ON o.negotiation_id = n.id
    WHERE o.negotiation_id = neg_id
    ORDER BY o.created_at DESC
    LIMIT 1;
END;
$$;

-- Function to accept an offer (atomic operation)
CREATE OR REPLACE FUNCTION public.accept_offer(
    p_negotiation_id BIGINT,
    p_accepting_user_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    final_price DECIMAL(10,2),
    offer_id BIGINT,
    negotiation_id BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_negotiation RECORD;
    v_latest_offer RECORD;
    v_item RECORD;
    v_accepting_user_role TEXT;
    v_final_price DECIMAL(10,2);
BEGIN
    -- Get negotiation details
    SELECT * INTO v_negotiation
    FROM public.negotiations
    WHERE id = p_negotiation_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Negotiation not found', NULL::DECIMAL(10,2), NULL::BIGINT, NULL::BIGINT;
        RETURN;
    END IF;
    
    -- Check if negotiation is active
    IF v_negotiation.status != 'active' THEN
        RETURN QUERY SELECT FALSE, 'Negotiation is not active', NULL::DECIMAL(10,2), NULL::BIGINT, NULL::BIGINT;
        RETURN;
    END IF;
    
    -- Determine the role of the accepting user
    IF p_accepting_user_id = v_negotiation.buyer_id THEN
        v_accepting_user_role := 'buyer';
    ELSIF p_accepting_user_id = v_negotiation.seller_id THEN
        v_accepting_user_role := 'seller';
    ELSE
        RETURN QUERY SELECT FALSE, 'User is not part of this negotiation', NULL::DECIMAL(10,2), NULL::BIGINT, NULL::BIGINT;
        RETURN;
    END IF;
    
    -- Get the latest offer
    SELECT * INTO v_latest_offer
    FROM public.offers
    WHERE negotiation_id = p_negotiation_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'No offers found in this negotiation', NULL::DECIMAL(10,2), NULL::BIGINT, NULL::BIGINT;
        RETURN;
    END IF;
    
    -- Validate that the user can accept this offer
    IF (v_accepting_user_role = 'buyer' AND v_latest_offer.offer_type != 'seller') OR
       (v_accepting_user_role = 'seller' AND v_latest_offer.offer_type != 'buyer') THEN
        RETURN QUERY SELECT FALSE, 'Cannot accept your own offer', NULL::DECIMAL(10,2), NULL::BIGINT, NULL::BIGINT;
        RETURN;
    END IF;
    
    -- Check if offer is already accepted or not pending
    IF COALESCE(v_latest_offer.status, 'pending') != 'pending' THEN
        RETURN QUERY SELECT FALSE, 'Offer is no longer available for acceptance', NULL::DECIMAL(10,2), NULL::BIGINT, NULL::BIGINT;
        RETURN;
    END IF;
    
    -- Get item details
    SELECT * INTO v_item
    FROM public.items
    WHERE id = v_negotiation.item_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Item not found', NULL::DECIMAL(10,2), NULL::BIGINT, NULL::BIGINT;
        RETURN;
    END IF;
    
    -- Check if item is still available
    IF v_item.item_status NOT IN ('active', 'under_negotiation') THEN
        RETURN QUERY SELECT FALSE, 'Item is no longer available', NULL::DECIMAL(10,2), NULL::BIGINT, NULL::BIGINT;
        RETURN;
    END IF;
    
    -- Set final price (use offer price, fallback to item starting price)
    v_final_price := COALESCE(v_latest_offer.price, v_item.starting_price);
    
    -- Begin atomic transaction operations
    
    -- 1. Mark the accepted offer as accepted
    UPDATE public.offers
    SET 
        status = 'accepted',
        is_accepted = TRUE,
        accepted_at = timezone('utc'::text, now()),
        accepted_by = p_accepting_user_id
    WHERE id = v_latest_offer.id;
    
    -- 2. Mark all other offers in this negotiation as superseded
    UPDATE public.offers
    SET status = 'superseded'
    WHERE negotiation_id = p_negotiation_id 
    AND id != v_latest_offer.id
    AND COALESCE(status, 'pending') = 'pending';
    
    -- 3. Update negotiation status to completed
    UPDATE public.negotiations
    SET 
        status = 'completed',
        final_price = v_final_price,
        completed_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_negotiation_id;
    
    -- 4. Update item status to sold_pending first, then sold
    UPDATE public.items
    SET 
        item_status = 'sold',
        buyer_id = v_negotiation.buyer_id,
        final_price = v_final_price,
        sold_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_negotiation.item_id;
    
    -- 5. Cancel all other active negotiations for this item
    UPDATE public.negotiations
    SET 
        status = 'cancelled',
        updated_at = timezone('utc'::text, now())
    WHERE item_id = v_negotiation.item_id 
    AND id != p_negotiation_id 
    AND status = 'active';
    
    -- Return success
    RETURN QUERY SELECT 
        TRUE, 
        'Offer accepted successfully', 
        v_final_price,
        v_latest_offer.id,
        p_negotiation_id;
END;
$$;

-- Function to get negotiation summary with latest offer details
CREATE OR REPLACE FUNCTION public.get_negotiation_summary(neg_id BIGINT)
RETURNS TABLE (
    negotiation_id BIGINT,
    item_id BIGINT,
    item_name TEXT,
    item_status item_status,
    starting_price DECIMAL(10,2),
    seller_id UUID,
    seller_username TEXT,
    buyer_id UUID,
    buyer_username TEXT,
    negotiation_status negotiation_status,
    latest_offer_id BIGINT,
    latest_offer_type offer_type,
    latest_offer_price DECIMAL(10,2),
    latest_offer_message TEXT,
    latest_offer_status offer_status,
    latest_offer_created_at TIMESTAMP WITH TIME ZONE,
    can_buyer_accept BOOLEAN,
    can_seller_accept BOOLEAN,
    offer_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id as negotiation_id,
        n.item_id,
        i.name as item_name,
        i.item_status,
        i.starting_price,
        n.seller_id,
        seller.username as seller_username,
        n.buyer_id,
        buyer.username as buyer_username,
        n.status as negotiation_status,
        latest_offer.id as latest_offer_id,
        latest_offer.offer_type as latest_offer_type,
        latest_offer.price as latest_offer_price,
        latest_offer.message as latest_offer_message,
        COALESCE(latest_offer.status, 'pending'::offer_status) as latest_offer_status,
        latest_offer.created_at as latest_offer_created_at,
        -- Buyer can accept if latest offer is from seller and is pending
        (latest_offer.offer_type = 'seller' AND COALESCE(latest_offer.status, 'pending') = 'pending' AND n.status = 'active') as can_buyer_accept,
        -- Seller can accept if latest offer is from buyer and is pending  
        (latest_offer.offer_type = 'buyer' AND COALESCE(latest_offer.status, 'pending') = 'pending' AND n.status = 'active') as can_seller_accept,
        offer_stats.offer_count,
        n.created_at,
        n.updated_at
    FROM public.negotiations n
    JOIN public.items i ON n.item_id = i.id
    JOIN public.profiles seller ON n.seller_id = seller.id
    JOIN public.profiles buyer ON n.buyer_id = buyer.id
    LEFT JOIN LATERAL (
        SELECT o.*
        FROM public.offers o
        WHERE o.negotiation_id = n.id
        ORDER BY o.created_at DESC
        LIMIT 1
    ) latest_offer ON true
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as offer_count
        FROM public.offers o
        WHERE o.negotiation_id = n.id
    ) offer_stats ON true
    WHERE n.id = neg_id;
END;
$$;

-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for offer status queries
CREATE INDEX IF NOT EXISTS idx_offers_status 
ON public.offers(status, negotiation_id);

-- Index for accepted offers
CREATE INDEX IF NOT EXISTS idx_offers_accepted 
ON public.offers(is_accepted, accepted_at DESC)
WHERE is_accepted = TRUE;

-- Index for pending offers by negotiation
CREATE INDEX IF NOT EXISTS idx_offers_pending_negotiation
ON public.offers(negotiation_id, created_at DESC)
WHERE COALESCE(status, 'pending') = 'pending';

-- Composite index for offer acceptance queries
CREATE INDEX IF NOT EXISTS idx_offers_acceptance_lookup
ON public.offers(negotiation_id, offer_type, status, created_at DESC);

-- 5. UPDATE EXISTING TRIGGERS
-- ============================================================================

-- Update the status validation trigger to handle new offer statuses
CREATE OR REPLACE FUNCTION public.handle_offer_status_validation()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    -- Validate that accepted offers have acceptance metadata
    IF NEW.status = 'accepted' AND (NEW.accepted_at IS NULL OR NEW.accepted_by IS NULL) THEN
        RAISE EXCEPTION 'Accepted offers must have accepted_at and accepted_by fields';
    END IF;
    
    -- Validate that only pending offers can be accepted
    IF OLD.status IS NOT NULL AND OLD.status != 'pending' AND NEW.status = 'accepted' THEN
        RAISE EXCEPTION 'Only pending offers can be accepted';
    END IF;
    
    -- Set is_accepted flag when status is accepted
    IF NEW.status = 'accepted' THEN
        NEW.is_accepted := TRUE;
        IF NEW.accepted_at IS NULL THEN
            NEW.accepted_at := timezone('utc'::text, now());
        END IF;
    ELSE
        NEW.is_accepted := FALSE;
        NEW.accepted_at := NULL;
        NEW.accepted_by := NULL;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for offer status validation
DROP TRIGGER IF EXISTS handle_offer_status_validation ON public.offers;
CREATE TRIGGER handle_offer_status_validation 
    BEFORE INSERT OR UPDATE ON public.offers
    FOR EACH ROW 
    EXECUTE PROCEDURE public.handle_offer_status_validation();

-- 6. ENHANCED RLS POLICIES
-- ============================================================================

-- Update offers policies to include new columns
DROP POLICY IF EXISTS "Users can view offers for their negotiations" ON public.offers;
CREATE POLICY "Users can view offers for their negotiations" ON public.offers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.negotiations 
      WHERE id = negotiation_id 
      AND (seller_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()))
    )
  );

-- Allow users to update offer status (for acceptance)
CREATE POLICY "Users can update offer status in their negotiations" ON public.offers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.negotiations 
      WHERE id = negotiation_id 
      AND (seller_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()))
      AND status = 'active'
    )
  );

-- 7. MIGRATE EXISTING DATA
-- ============================================================================

-- Set default status for existing offers
UPDATE public.offers 
SET status = 'pending' 
WHERE status IS NULL;

-- Update completed negotiations to mark final offers as accepted
UPDATE public.offers 
SET 
    status = 'accepted',
    is_accepted = TRUE,
    accepted_at = n.completed_at,
    accepted_by = CASE 
        WHEN offers.offer_type = 'buyer' THEN n.seller_id
        WHEN offers.offer_type = 'seller' THEN n.buyer_id
    END
FROM public.negotiations n
WHERE offers.negotiation_id = n.id
AND n.status = 'completed'
AND offers.price = n.final_price
AND offers.id = (
    SELECT id FROM public.offers o2 
    WHERE o2.negotiation_id = n.id 
    ORDER BY o2.created_at DESC 
    LIMIT 1
);

-- Mark superseded offers in completed negotiations
UPDATE public.offers 
SET status = 'superseded'
FROM public.negotiations n
WHERE offers.negotiation_id = n.id
AND n.status = 'completed'
AND COALESCE(offers.status, 'pending') = 'pending';

-- 8. CREATE HELPER VIEWS
-- ============================================================================

-- View for active negotiations with acceptance status
CREATE OR REPLACE VIEW public.active_negotiations_with_offers AS
SELECT 
    n.*,
    i.name as item_name,
    i.starting_price,
    i.item_status,
    seller.username as seller_username,
    buyer.username as buyer_username,
    latest_offer.id as latest_offer_id,
    latest_offer.offer_type as latest_offer_type,
    latest_offer.price as latest_offer_price,
    latest_offer.message as latest_offer_message,
    COALESCE(latest_offer.status, 'pending'::offer_status) as latest_offer_status,
    latest_offer.created_at as latest_offer_created_at,
    -- Can the buyer accept the latest offer?
    (latest_offer.offer_type = 'seller' AND 
     COALESCE(latest_offer.status, 'pending') = 'pending' AND 
     n.status = 'active') as buyer_can_accept,
    -- Can the seller accept the latest offer?
    (latest_offer.offer_type = 'buyer' AND 
     COALESCE(latest_offer.status, 'pending') = 'pending' AND 
     n.status = 'active') as seller_can_accept,
    offer_count.total_offers
FROM public.negotiations n
JOIN public.items i ON n.item_id = i.id
JOIN public.profiles seller ON n.seller_id = seller.id
JOIN public.profiles buyer ON n.buyer_id = buyer.id
LEFT JOIN LATERAL (
    SELECT o.*
    FROM public.offers o
    WHERE o.negotiation_id = n.id
    ORDER BY o.created_at DESC
    LIMIT 1
) latest_offer ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) as total_offers
    FROM public.offers o
    WHERE o.negotiation_id = n.id
) offer_count ON true
WHERE n.status = 'active';

-- Set security_invoker for the view to respect RLS
ALTER VIEW public.active_negotiations_with_offers SET (security_invoker = true);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.accept_offer(BIGINT, UUID) IS 'Atomically accept an offer, complete the negotiation, and mark item as sold';
COMMENT ON FUNCTION public.get_current_offer(BIGINT) IS 'Get the latest offer in a negotiation with full details';
COMMENT ON FUNCTION public.get_negotiation_summary(BIGINT) IS 'Get comprehensive negotiation summary with acceptance status';
COMMENT ON VIEW public.active_negotiations_with_offers IS 'Active negotiations with latest offer details and acceptance capabilities';
COMMENT ON COLUMN public.offers.status IS 'Current status of the offer: pending, accepted, declined, superseded, expired';
COMMENT ON COLUMN public.offers.is_accepted IS 'Quick boolean flag for accepted offers';
COMMENT ON COLUMN public.offers.accepted_at IS 'Timestamp when offer was accepted';
COMMENT ON COLUMN public.offers.accepted_by IS 'User ID of who accepted the offer';