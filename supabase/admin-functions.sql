-- Admin functions for agent monitoring and analytics

-- Function to get agent seller statistics
CREATE OR REPLACE FUNCTION get_agent_seller_stats()
RETURNS TABLE (
  total_sellers BIGINT,
  active_sellers BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_sellers,
    COUNT(CASE WHEN agent_enabled = true THEN 1 END)::BIGINT as active_sellers
  FROM seller_agent_profile;
END;
$$;