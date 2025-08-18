-- Autonomous Seller Agent Database Schema Extensions
-- Run this after the main schema.sql

-- Agent context per item (no floor price dependency)
CREATE TABLE IF NOT EXISTS agent_context (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT REFERENCES items(id) UNIQUE NOT NULL,
  target_price DECIMAL(10,2) NOT NULL, -- Seller's ideal price
  estimated_buyer_valuation DECIMAL(10,2), -- Game theory calculation
  market_demand_level DECIMAL(3,2) DEFAULT 0.5 CHECK (market_demand_level >= 0 AND market_demand_level <= 1), -- 0-1 scale
  competitor_count INTEGER DEFAULT 0,
  strategy_mode TEXT DEFAULT 'single_offer' CHECK (strategy_mode IN ('single_offer', 'multiple_offers', 'urgent_pickup')),
  agent_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Decision audit for game theory validation
CREATE TABLE IF NOT EXISTS agent_decisions (
  id BIGSERIAL PRIMARY KEY,
  negotiation_id BIGINT REFERENCES negotiations(id) NOT NULL,
  decision_type TEXT NOT NULL CHECK (decision_type IN ('ACCEPT', 'COUNTER', 'WAIT', 'DECLINE')),
  recommended_price DECIMAL(10,2),
  nash_equilibrium_price DECIMAL(10,2),
  buyer_valuation_estimate DECIMAL(10,2),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  reasoning TEXT,
  market_conditions JSONB DEFAULT '{}',
  tool_calls JSONB DEFAULT '[]', -- Log of AI tool calls made
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market intelligence cache
CREATE TABLE IF NOT EXISTS market_intelligence (
  id BIGSERIAL PRIMARY KEY,
  furniture_type furniture_type NOT NULL,
  avg_listing_price DECIMAL(10,2),
  avg_sale_price DECIMAL(10,2),
  median_sale_price DECIMAL(10,2),
  active_listings_count INTEGER DEFAULT 0,
  completed_sales_count INTEGER DEFAULT 0,
  avg_negotiation_rounds DECIMAL(3,1),
  avg_time_to_sale_hours INTEGER,
  price_volatility DECIMAL(3,2), -- Standard deviation / mean
  demand_score DECIMAL(3,2) DEFAULT 0.5 CHECK (demand_score >= 0 AND demand_score <= 1),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour')
);

-- Buyer behavior profiles for ToM (Theory of Mind)
CREATE TABLE IF NOT EXISTS buyer_behavior_profiles (
  id BIGSERIAL PRIMARY KEY,
  buyer_id UUID REFERENCES profiles(id) NOT NULL,
  response_time_avg_minutes INTEGER,
  response_time_pattern TEXT CHECK (response_time_pattern IN ('fast', 'slow', 'variable')),
  price_flexibility TEXT CHECK (price_flexibility IN ('rigid', 'moderate', 'flexible')),
  negotiation_style TEXT CHECK (negotiation_style IN ('aggressive', 'collaborative', 'passive')),
  pickup_preference TEXT CHECK (pickup_preference IN ('immediate', 'flexible', 'scheduled')),
  success_rate DECIMAL(3,2) CHECK (success_rate >= 0 AND success_rate <= 1),
  avg_negotiation_rounds INTEGER,
  total_offers_made INTEGER DEFAULT 0,
  total_successful_purchases INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(buyer_id)
);

-- Extend offers table for agent integration
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS agent_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS round_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS agent_decision_id BIGINT REFERENCES agent_decisions(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_context_item_id ON agent_context(item_id);
CREATE INDEX IF NOT EXISTS idx_agent_context_strategy ON agent_context(strategy_mode, agent_enabled);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_negotiation ON agent_decisions(negotiation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_type ON market_intelligence(furniture_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_intelligence_expires ON market_intelligence(expires_at);
CREATE INDEX IF NOT EXISTS idx_buyer_profiles_buyer_id ON buyer_behavior_profiles(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_agent_generated ON offers(agent_generated, created_at DESC);

-- RLS Policies for agent tables

-- Agent context: only item owner can see/modify
ALTER TABLE agent_context ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own item agent context" ON agent_context
  FOR SELECT USING (
    item_id IN (SELECT id FROM items WHERE seller_id = auth.uid())
  );
CREATE POLICY "Users can update their own item agent context" ON agent_context
  FOR UPDATE USING (
    item_id IN (SELECT id FROM items WHERE seller_id = auth.uid())
  );
CREATE POLICY "Users can insert agent context for their items" ON agent_context
  FOR INSERT WITH CHECK (
    item_id IN (SELECT id FROM items WHERE seller_id = auth.uid())
  );

-- Agent decisions: only negotiation participants can view
ALTER TABLE agent_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Negotiation participants can view agent decisions" ON agent_decisions
  FOR SELECT USING (
    negotiation_id IN (
      SELECT id FROM negotiations 
      WHERE seller_id = auth.uid() OR buyer_id = auth.uid()
    )
  );

-- Market intelligence: public read-only
ALTER TABLE market_intelligence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Market intelligence is publicly readable" ON market_intelligence
  FOR SELECT USING (true);

-- Buyer behavior profiles: only the buyer can see their own profile
ALTER TABLE buyer_behavior_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own behavior profile" ON buyer_behavior_profiles
  FOR SELECT USING (buyer_id = auth.uid());

-- Functions for market intelligence updates
CREATE OR REPLACE FUNCTION update_market_intelligence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update market intelligence for each furniture type
  INSERT INTO market_intelligence (
    furniture_type,
    avg_listing_price,
    avg_sale_price,
    median_sale_price,
    active_listings_count,
    completed_sales_count,
    avg_negotiation_rounds,
    avg_time_to_sale_hours,
    price_volatility,
    demand_score
  )
  SELECT 
    i.furniture_type,
    AVG(i.starting_price) as avg_listing_price,
    AVG(i.final_price) as avg_sale_price,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY i.final_price) as median_sale_price,
    COUNT(*) FILTER (WHERE i.item_status = 'active') as active_listings_count,
    COUNT(*) FILTER (WHERE i.item_status = 'sold') as completed_sales_count,
    AVG(offer_stats.round_count) as avg_negotiation_rounds,
    AVG(EXTRACT(EPOCH FROM (i.sold_at - i.created_at))/3600) as avg_time_to_sale_hours,
    STDDEV(i.final_price) / NULLIF(AVG(i.final_price), 0) as price_volatility,
    LEAST(1.0, GREATEST(0.0, 
      COUNT(*) FILTER (WHERE i.item_status = 'sold' AND i.sold_at > NOW() - INTERVAL '7 days')::DECIMAL / 
      NULLIF(COUNT(*) FILTER (WHERE i.item_status = 'active'), 0)
    )) as demand_score
  FROM items i
  LEFT JOIN (
    SELECT 
      n.item_id,
      COUNT(o.id) as round_count
    FROM negotiations n
    JOIN offers o ON o.negotiation_id = n.id
    GROUP BY n.item_id
  ) offer_stats ON offer_stats.item_id = i.id
  WHERE i.created_at > NOW() - INTERVAL '30 days'
  GROUP BY i.furniture_type
  ON CONFLICT (furniture_type) 
  DO UPDATE SET
    avg_listing_price = EXCLUDED.avg_listing_price,
    avg_sale_price = EXCLUDED.avg_sale_price,
    median_sale_price = EXCLUDED.median_sale_price,
    active_listings_count = EXCLUDED.active_listings_count,
    completed_sales_count = EXCLUDED.completed_sales_count,
    avg_negotiation_rounds = EXCLUDED.avg_negotiation_rounds,
    avg_time_to_sale_hours = EXCLUDED.avg_time_to_sale_hours,
    price_volatility = EXCLUDED.price_volatility,
    demand_score = EXCLUDED.demand_score,
    recorded_at = NOW(),
    expires_at = NOW() + INTERVAL '1 hour';
END;
$$;

-- Function to update buyer behavior profiles
CREATE OR REPLACE FUNCTION update_buyer_behavior_profile(buyer_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  behavior_data RECORD;
BEGIN
  -- Calculate buyer behavior metrics
  SELECT 
    AVG(EXTRACT(EPOCH FROM (o2.created_at - o1.created_at))/60) as avg_response_time_minutes,
    CASE 
      WHEN AVG(EXTRACT(EPOCH FROM (o2.created_at - o1.created_at))/60) < 30 THEN 'fast'
      WHEN AVG(EXTRACT(EPOCH FROM (o2.created_at - o1.created_at))/60) > 180 THEN 'slow'
      ELSE 'variable'
    END as response_pattern,
    COUNT(DISTINCT n.id) as total_negotiations,
    COUNT(DISTINCT CASE WHEN n.status = 'completed' THEN n.id END) as successful_purchases,
    AVG(offer_count.rounds) as avg_rounds
  INTO behavior_data
  FROM negotiations n
  JOIN offers o1 ON o1.negotiation_id = n.id AND o1.offer_type = 'seller'
  LEFT JOIN offers o2 ON o2.negotiation_id = n.id AND o2.offer_type = 'buyer' AND o2.created_at > o1.created_at
  LEFT JOIN (
    SELECT negotiation_id, COUNT(*) as rounds
    FROM offers
    GROUP BY negotiation_id
  ) offer_count ON offer_count.negotiation_id = n.id
  WHERE n.buyer_id = buyer_uuid;

  -- Upsert buyer behavior profile
  INSERT INTO buyer_behavior_profiles (
    buyer_id,
    response_time_avg_minutes,
    response_time_pattern,
    success_rate,
    avg_negotiation_rounds,
    total_offers_made,
    total_successful_purchases
  )
  VALUES (
    buyer_uuid,
    behavior_data.avg_response_time_minutes,
    behavior_data.response_pattern,
    CASE WHEN behavior_data.total_negotiations > 0 
      THEN behavior_data.successful_purchases::DECIMAL / behavior_data.total_negotiations 
      ELSE 0 
    END,
    behavior_data.avg_rounds,
    behavior_data.total_negotiations,
    behavior_data.successful_purchases
  )
  ON CONFLICT (buyer_id)
  DO UPDATE SET
    response_time_avg_minutes = EXCLUDED.response_time_avg_minutes,
    response_time_pattern = EXCLUDED.response_time_pattern,
    success_rate = EXCLUDED.success_rate,
    avg_negotiation_rounds = EXCLUDED.avg_negotiation_rounds,
    total_offers_made = EXCLUDED.total_offers_made,
    total_successful_purchases = EXCLUDED.total_successful_purchases,
    updated_at = NOW();
END;
$$;

-- Trigger to update buyer behavior after each offer
CREATE OR REPLACE FUNCTION trigger_update_buyer_behavior()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update buyer behavior profile for buyer offers
  IF NEW.offer_type = 'buyer' THEN
    PERFORM update_buyer_behavior_profile(
      (SELECT buyer_id FROM negotiations WHERE id = NEW.negotiation_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_buyer_behavior_on_offer
  AFTER INSERT ON offers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_buyer_behavior();

-- Clean up expired market intelligence
CREATE OR REPLACE FUNCTION cleanup_expired_market_intelligence()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM market_intelligence WHERE expires_at < NOW();
END;
$$;