-- Add seller notification tracking to agent_decisions table

ALTER TABLE agent_decisions 
ADD COLUMN IF NOT EXISTS seller_notified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS seller_response TEXT CHECK (seller_response IN ('acknowledged', 'accepted', 'declined'));

-- Add index for efficient notification queries
CREATE INDEX IF NOT EXISTS idx_agent_decisions_notifications 
ON agent_decisions(seller_id, decision_type, seller_notified_at, created_at DESC) 
WHERE decision_type = 'ACCEPT' AND seller_notified_at IS NULL;

-- Add index for seller dashboard queries
CREATE INDEX IF NOT EXISTS idx_agent_decisions_seller_dashboard 
ON agent_decisions(seller_id, created_at DESC);

COMMENT ON COLUMN agent_decisions.seller_notified_at IS 'Timestamp when seller was notified about this recommendation';
COMMENT ON COLUMN agent_decisions.seller_response IS 'How the seller responded to the agent recommendation';