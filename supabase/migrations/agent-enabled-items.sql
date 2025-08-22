-- Add agent_enabled column to items table for per-listing agent control
-- This allows sellers to enable/disable the AI agent on individual listings

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS agent_enabled BOOLEAN DEFAULT false;

-- Add index for agent-enabled items (will be commonly queried)
CREATE INDEX IF NOT EXISTS idx_items_agent_enabled 
ON items(agent_enabled, item_status, created_at DESC) 
WHERE agent_enabled = true AND item_status IN ('active', 'under_negotiation');

-- Update RLS policy to include agent_enabled in item queries (already covered by existing policies)
-- No changes needed to RLS as sellers can already update their own items

COMMENT ON COLUMN items.agent_enabled IS 'When true, the autonomous seller agent will handle negotiations for this item';