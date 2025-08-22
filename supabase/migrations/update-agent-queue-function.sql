-- Update queue_offer_for_agent function to check item-level agent enablement

CREATE OR REPLACE FUNCTION queue_offer_for_agent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  seller_uuid UUID;
  item_uuid BIGINT;
  item_agent_enabled BOOLEAN;
BEGIN
  -- Only process buyer offers
  IF NEW.offer_type != 'buyer' THEN
    RETURN NEW;
  END IF;

  -- Get seller ID and item ID from negotiation
  SELECT n.seller_id, n.item_id INTO seller_uuid, item_uuid
  FROM negotiations n
  WHERE n.id = NEW.negotiation_id;

  -- Check if agent is enabled for this specific item
  SELECT i.agent_enabled INTO item_agent_enabled
  FROM items i
  WHERE i.id = item_uuid;

  -- Queue for processing if agent is enabled for this item
  IF item_agent_enabled = true THEN
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

COMMENT ON FUNCTION queue_offer_for_agent() IS 'Updated to check item-level agent enablement instead of seller-level only';