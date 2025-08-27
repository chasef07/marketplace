-- Agent processing database functions

-- Function to get the next pending agent task from the queue
CREATE OR REPLACE FUNCTION get_next_agent_task()
RETURNS TABLE (
  queue_id INT,
  negotiation_id INT,
  offer_id INT,
  seller_id UUID,
  item_id BIGINT,
  listing_price DECIMAL(10,2),
  offer_price DECIMAL(10,2),
  furniture_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    apq.id as queue_id,
    apq.negotiation_id::INT,
    apq.offer_id::INT,
    apq.seller_id,
    n.item_id,
    i.starting_price as listing_price,
    o.price as offer_price,
    i.furniture_type::TEXT
  FROM agent_processing_queue apq
  JOIN negotiations n ON n.id = apq.negotiation_id
  JOIN items i ON i.id = n.item_id
  JOIN offers o ON o.id = apq.offer_id
  WHERE apq.status = 'pending'
    AND n.status = 'active'
    AND i.agent_enabled = true
  ORDER BY apq.priority ASC, apq.created_at ASC
  LIMIT 1;
END;
$$;

-- Function to mark an agent task as completed
CREATE OR REPLACE FUNCTION complete_agent_task(
  queue_id INT,
  decision_id INT DEFAULT NULL,
  error_msg TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF error_msg IS NOT NULL THEN
    -- Mark as failed
    UPDATE agent_processing_queue 
    SET 
      status = 'failed',
      processed_at = NOW(),
      error_message = error_msg
    WHERE id = queue_id;
  ELSE
    -- Mark as completed
    UPDATE agent_processing_queue 
    SET 
      status = 'completed',
      processed_at = NOW(),
      agent_decision_id = decision_id
    WHERE id = queue_id;
  END IF;
END;
$$;

-- Function to reset stuck processing tasks (for development)
CREATE OR REPLACE FUNCTION reset_stuck_agent_tasks()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reset_count INT;
BEGIN
  -- Reset tasks that have been "processing" for more than 5 minutes
  UPDATE agent_processing_queue 
  SET 
    status = 'pending',
    processed_at = NULL,
    error_message = NULL
  WHERE status = 'processing' 
    AND created_at < NOW() - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  
  RETURN reset_count;
END;
$$;

-- Function to clean up old completed/failed tasks
CREATE OR REPLACE FUNCTION cleanup_agent_queue()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleanup_count INT;
BEGIN
  -- Remove completed/failed tasks older than 7 days
  DELETE FROM agent_processing_queue 
  WHERE status IN ('completed', 'failed') 
    AND processed_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  RETURN cleanup_count;
END;
$$;

COMMENT ON FUNCTION get_next_agent_task() IS 'Get the next pending agent task from the queue';
COMMENT ON FUNCTION complete_agent_task(INT, INT, TEXT) IS 'Mark an agent task as completed or failed';
COMMENT ON FUNCTION reset_stuck_agent_tasks() IS 'Reset tasks stuck in processing status';
COMMENT ON FUNCTION cleanup_agent_queue() IS 'Clean up old completed/failed tasks';