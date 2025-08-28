-- Optimize negotiation history queries for agent context awareness

-- Add index for efficient negotiation history queries
-- This supports the getNegotiationHistoryTool queries
CREATE INDEX IF NOT EXISTS idx_offers_negotiation_history 
ON offers(negotiation_id, created_at ASC) 
INCLUDE (price, offer_type, message, is_counter_offer);

-- Add round_number column to offers for easier tracking
-- This will be calculated dynamically in the tool for now, but could be materialized later
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS round_number INTEGER;

-- Add computed column for negotiation context (optional optimization for future)
-- This could store precomputed negotiation metadata to reduce AI processing time

-- Index for agent decision queries with negotiation context
CREATE INDEX IF NOT EXISTS idx_agent_decisions_negotiation_context
ON agent_decisions(negotiation_id, created_at DESC, decision_type)
WHERE decision_type IN ('ACCEPT', 'COUNTER');

-- Add function to efficiently calculate negotiation round number
CREATE OR REPLACE FUNCTION calculate_offer_round(neg_id INTEGER, offer_created_at TIMESTAMP WITH TIME ZONE)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN (
    SELECT CEIL(
      (SELECT COUNT(*) 
       FROM offers 
       WHERE negotiation_id = neg_id 
       AND created_at <= offer_created_at
      ) / 2.0
    )::INTEGER
  );
END;
$$;

-- Comment the new structures
COMMENT ON INDEX idx_offers_negotiation_history IS 'Optimizes agent negotiation history queries for context awareness';
COMMENT ON COLUMN offers.round_number IS 'Negotiation round number (each buyer-seller exchange = 1 round)';
COMMENT ON FUNCTION calculate_offer_round IS 'Efficiently calculates which round an offer belongs to in a negotiation';