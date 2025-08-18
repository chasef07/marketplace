-- Autonomous Seller Agent - Simplified Account-Level Schema
-- This replaces the complex per-item setup with automatic account-level agent

-- Seller agent profile (one per seller account)
CREATE TABLE IF NOT EXISTS seller_agent_profile (
  seller_id UUID REFERENCES profiles(id) PRIMARY KEY,
  agent_enabled BOOLEAN DEFAULT true,
  aggressiveness_level DECIMAL(3,2) DEFAULT 0.5 CHECK (aggressiveness_level >= 0 AND aggressiveness_level <= 1),
  auto_accept_threshold DECIMAL(3,2) DEFAULT 0.95 CHECK (auto_accept_threshold >= 0 AND auto_accept_threshold <= 1),
  min_acceptable_ratio DECIMAL(3,2) DEFAULT 0.75 CHECK (min_acceptable_ratio >= 0 AND min_acceptable_ratio <= 1),
  response_delay_minutes INTEGER DEFAULT 0 CHECK (response_delay_minutes >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent decision audit (simplified - no per-item context needed)
CREATE TABLE IF NOT EXISTS agent_decisions (
  id BIGSERIAL PRIMARY KEY,
  seller_id UUID REFERENCES profiles(id) NOT NULL,
  negotiation_id BIGINT REFERENCES negotiations(id) NOT NULL,
  item_id BIGINT REFERENCES items(id) NOT NULL,
  decision_type TEXT NOT NULL CHECK (decision_type IN ('ACCEPT', 'COUNTER', 'WAIT', 'DECLINE')),
  original_offer_price DECIMAL(10,2) NOT NULL,
  recommended_price DECIMAL(10,2),
  listing_price DECIMAL(10,2) NOT NULL,
  nash_equilibrium_price DECIMAL(10,2),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  reasoning TEXT,
  market_conditions JSONB DEFAULT '{}',
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market intelligence (simplified for quick lookups)
CREATE TABLE IF NOT EXISTS market_intelligence (
  furniture_type furniture_type NOT NULL PRIMARY KEY,
  avg_sale_ratio DECIMAL(3,2) DEFAULT 0.80, -- Average sale price / listing price
  demand_score DECIMAL(3,2) DEFAULT 0.5,
  avg_negotiation_rounds INTEGER DEFAULT 3,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent processing queue (for background service)
CREATE TABLE IF NOT EXISTS agent_processing_queue (
  id BIGSERIAL PRIMARY KEY,
  negotiation_id BIGINT REFERENCES negotiations(id) NOT NULL,
  offer_id BIGINT REFERENCES offers(id) NOT NULL,
  seller_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Add agent-related columns to existing offers table
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS agent_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS agent_decision_id BIGINT REFERENCES agent_decisions(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_seller_agent_profile_enabled ON seller_agent_profile(agent_enabled);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_seller ON agent_decisions(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_negotiation ON agent_decisions(negotiation_id);
CREATE INDEX IF NOT EXISTS idx_agent_queue_status ON agent_processing_queue(status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_queue_seller ON agent_processing_queue(seller_id, status);

-- RLS Policies

-- Seller agent profile: users can only see/modify their own
ALTER TABLE seller_agent_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own agent profile" ON seller_agent_profile
  FOR SELECT USING (seller_id = auth.uid());
CREATE POLICY "Users can update their own agent profile" ON seller_agent_profile
  FOR UPDATE USING (seller_id = auth.uid());
CREATE POLICY "Users can insert their own agent profile" ON seller_agent_profile
  FOR INSERT WITH CHECK (seller_id = auth.uid());

-- Agent decisions: negotiation participants can view
ALTER TABLE agent_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Negotiation participants can view agent decisions" ON agent_decisions
  FOR SELECT USING (
    seller_id = auth.uid() OR
    negotiation_id IN (
      SELECT id FROM negotiations WHERE buyer_id = auth.uid()
    )
  );

-- Market intelligence: public read-only
ALTER TABLE market_intelligence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Market intelligence is publicly readable" ON market_intelligence
  FOR SELECT USING (true);

-- Agent queue: system use only (no RLS needed for background service)

-- Functions for automatic agent activation

-- Function to create agent profile for new users
CREATE OR REPLACE FUNCTION create_seller_agent_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO seller_agent_profile (seller_id)
  VALUES (NEW.id)
  ON CONFLICT (seller_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to auto-create agent profile when user signs up
CREATE TRIGGER trigger_create_seller_agent_profile
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_seller_agent_profile();

-- Function to queue offers for agent processing
CREATE OR REPLACE FUNCTION queue_offer_for_agent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  seller_uuid UUID;
  agent_enabled_flag BOOLEAN;
BEGIN
  -- Only process buyer offers
  IF NEW.offer_type != 'buyer' THEN
    RETURN NEW;
  END IF;

  -- Get seller ID and check if agent is enabled
  SELECT n.seller_id INTO seller_uuid
  FROM negotiations n
  WHERE n.id = NEW.negotiation_id;

  -- Check if seller has agent enabled
  SELECT sap.agent_enabled INTO agent_enabled_flag
  FROM seller_agent_profile sap
  WHERE sap.seller_id = seller_uuid;

  -- Queue for processing if agent is enabled
  IF agent_enabled_flag = true THEN
    INSERT INTO agent_processing_queue (
      negotiation_id,
      offer_id,
      seller_id,
      priority
    ) VALUES (
      NEW.negotiation_id,
      NEW.id,
      seller_uuid,
      CASE 
        WHEN NEW.created_at > NOW() - INTERVAL '5 minutes' THEN 1 -- High priority for recent offers
        ELSE 2
      END
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to auto-queue buyer offers for agent processing
CREATE TRIGGER trigger_queue_offer_for_agent
  AFTER INSERT ON offers
  FOR EACH ROW
  EXECUTE FUNCTION queue_offer_for_agent();

-- Function to get next item for agent processing
CREATE OR REPLACE FUNCTION get_next_agent_task()
RETURNS TABLE (
  queue_id BIGINT,
  negotiation_id BIGINT,
  offer_id BIGINT,
  seller_id UUID,
  item_id BIGINT,
  listing_price DECIMAL(10,2),
  offer_price DECIMAL(10,2),
  furniture_type furniture_type
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.negotiation_id,
    q.offer_id,
    q.seller_id,
    n.item_id,
    i.starting_price,
    o.price,
    i.furniture_type
  FROM agent_processing_queue q
  JOIN negotiations n ON n.id = q.negotiation_id
  JOIN items i ON i.id = n.item_id
  JOIN offers o ON o.id = q.offer_id
  WHERE q.status = 'pending'
  ORDER BY q.priority ASC, q.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
END;
$$;

-- Function to mark agent task as completed
CREATE OR REPLACE FUNCTION complete_agent_task(
  queue_id BIGINT,
  decision_id BIGINT DEFAULT NULL,
  error_msg TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE agent_processing_queue
  SET 
    status = CASE WHEN error_msg IS NULL THEN 'completed' ELSE 'failed' END,
    processed_at = NOW(),
    error_message = error_msg
  WHERE id = queue_id;
END;
$$;

-- Initialize market intelligence with default values
INSERT INTO market_intelligence (furniture_type, avg_sale_ratio, demand_score, avg_negotiation_rounds)
VALUES 
  ('couch', 0.82, 0.7, 3),
  ('dining_table', 0.85, 0.8, 2),
  ('bed', 0.78, 0.75, 3),
  ('chair', 0.70, 0.6, 2),
  ('desk', 0.80, 0.65, 3),
  ('dresser', 0.75, 0.6, 3),
  ('coffee_table', 0.72, 0.55, 2),
  ('nightstand', 0.73, 0.5, 2),
  ('bookshelf', 0.68, 0.5, 3),
  ('cabinet', 0.77, 0.6, 3),
  ('other', 0.70, 0.5, 3)
ON CONFLICT (furniture_type) DO NOTHING;

-- Clean up old queue entries (run periodically)
CREATE OR REPLACE FUNCTION cleanup_agent_queue()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM agent_processing_queue 
  WHERE status IN ('completed', 'failed') 
    AND processed_at < NOW() - INTERVAL '7 days';
END;
$$;