-- Notifications System Schema
-- Run this SQL in your Supabase project to add the notifications system

-- Notification types enum
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
      'offer_accepted',          -- When buyer accepts seller's counter-offer
      'offer_received',          -- When seller receives new buyer offer
      'sale_completed',          -- When transaction is fully completed
      'pickup_scheduled',        -- When buyer schedules item pickup
      'payment_received',        -- When payment is processed
      'negotiation_cancelled',   -- When negotiation is cancelled
      'item_viewed',             -- When item receives significant views
      'price_suggestion',        -- AI suggests price adjustment
      'system_notification'      -- General system messages
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Notification status enum
DO $$ BEGIN
    CREATE TYPE notification_status AS ENUM (
      'unread',     -- New notification, not seen by user
      'read',       -- User has seen the notification
      'archived'    -- User has archived/dismissed the notification
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Notification priority enum
DO $$ BEGIN
    CREATE TYPE notification_priority AS ENUM (
      'low',        -- General informational notifications
      'medium',     -- Important business events
      'high',       -- Urgent actions required
      'critical'    -- Immediate attention needed
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Main notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id bigserial primary key,
  
  -- User and targeting
  user_id uuid references public.profiles(id) not null,
  
  -- Notification metadata
  type notification_type not null,
  status notification_status default 'unread' not null,
  priority notification_priority default 'medium' not null,
  
  -- Content
  title text not null check (length(trim(title)) >= 1),
  message text not null check (length(trim(message)) >= 1),
  
  -- Rich content and actions
  metadata jsonb default '{}'::jsonb,  -- Additional data (offer details, prices, etc.)
  action_url text,                     -- URL for primary action
  action_label text,                   -- Label for primary action button
  
  -- Related entities (nullable for flexibility)
  item_id bigint references public.items(id),
  negotiation_id bigint references public.negotiations(id),
  offer_id bigint references public.offers(id),
  
  -- Delivery tracking
  delivered_at timestamp with time zone default timezone('utc'::text, now()) not null,
  read_at timestamp with time zone,
  archived_at timestamp with time zone,
  
  -- Timing
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Expiration (for time-sensitive notifications)
  expires_at timestamp with time zone
);

-- User notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id bigserial primary key,
  user_id uuid references public.profiles(id) not null unique,
  
  -- Notification type preferences (JSON for flexibility)
  preferences jsonb default '{
    "offer_accepted": {"enabled": true, "push": true, "email": false, "sound": true},
    "offer_received": {"enabled": true, "push": true, "email": false, "sound": true},
    "sale_completed": {"enabled": true, "push": true, "email": true, "sound": true},
    "pickup_scheduled": {"enabled": true, "push": true, "email": true, "sound": false},
    "payment_received": {"enabled": true, "push": true, "email": true, "sound": true},
    "negotiation_cancelled": {"enabled": true, "push": false, "email": false, "sound": false},
    "item_viewed": {"enabled": false, "push": false, "email": false, "sound": false},
    "price_suggestion": {"enabled": true, "push": false, "email": false, "sound": false},
    "system_notification": {"enabled": true, "push": true, "email": false, "sound": false}
  }'::jsonb not null,
  
  -- Global settings
  push_enabled boolean default true not null,
  email_enabled boolean default false not null,
  sound_enabled boolean default true not null,
  
  -- Quiet hours (UTC)
  quiet_hours_start time,
  quiet_hours_end time,
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_delivered_at ON public.notifications(delivered_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_status_created 
ON public.notifications(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created 
ON public.notifications(user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_item_type 
ON public.notifications(item_id, type) 
WHERE item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_negotiation_type 
ON public.notifications(negotiation_id, type) 
WHERE negotiation_id IS NOT NULL;

-- Partial indexes for active notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
ON public.notifications(user_id, created_at DESC) 
WHERE status = 'unread';

CREATE INDEX IF NOT EXISTS idx_notifications_high_priority 
ON public.notifications(user_id, created_at DESC) 
WHERE priority IN ('high', 'critical');

-- Index for preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id 
ON public.notification_preferences(user_id);

-- Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- System can insert notifications for any user (for API routes)
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Notification preferences policies
CREATE POLICY "Users can view their own notification preferences" ON public.notification_preferences
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own notification preferences" ON public.notification_preferences
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own notification preferences" ON public.notification_preferences
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- Functions for notifications

-- Function to create notification with validation
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type notification_type,
  p_title text,
  p_message text,
  p_priority notification_priority DEFAULT 'medium',
  p_metadata jsonb DEFAULT '{}',
  p_action_url text DEFAULT NULL,
  p_action_label text DEFAULT NULL,
  p_item_id bigint DEFAULT NULL,
  p_negotiation_id bigint DEFAULT NULL,
  p_offer_id bigint DEFAULT NULL,
  p_expires_at timestamp with time zone DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  notification_id bigint;
  user_prefs jsonb;
  type_prefs jsonb;
BEGIN
  -- Validate user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User does not exist: %', p_user_id;
  END IF;
  
  -- Get user preferences
  SELECT preferences INTO user_prefs
  FROM public.notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences exist, use defaults
  IF user_prefs IS NULL THEN
    -- Insert default preferences
    INSERT INTO public.notification_preferences (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get the default preferences
    SELECT preferences INTO user_prefs
    FROM public.notification_preferences
    WHERE user_id = p_user_id;
  END IF;
  
  -- Check if this notification type is enabled
  type_prefs := user_prefs -> p_type::text;
  
  IF type_prefs IS NULL OR NOT (type_prefs ->> 'enabled')::boolean THEN
    -- User has disabled this notification type
    RETURN NULL;
  END IF;
  
  -- Create the notification
  INSERT INTO public.notifications (
    user_id, type, title, message, priority, metadata,
    action_url, action_label, item_id, negotiation_id, offer_id, expires_at
  )
  VALUES (
    p_user_id, p_type, p_title, p_message, p_priority, p_metadata,
    p_action_url, p_action_label, p_item_id, p_negotiation_id, p_offer_id, p_expires_at
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id bigint, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.notifications
  SET 
    status = 'read',
    read_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_notification_id AND user_id = p_user_id AND status = 'unread';
  
  RETURN FOUND;
END;
$$;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.notifications
  SET 
    status = 'read',
    read_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE user_id = p_user_id AND status = 'unread';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  unread_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO unread_count
  FROM public.notifications
  WHERE user_id = p_user_id 
    AND status = 'unread'
    AND (expires_at IS NULL OR expires_at > timezone('utc'::text, now()));
  
  RETURN COALESCE(unread_count, 0);
END;
$$;

-- Function to clean up old notifications (keep last 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < (timezone('utc'::text, now()) - interval '30 days')
    AND status IN ('read', 'archived');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at_notifications 
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_notification_preferences 
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Trigger to create notifications when offers are accepted
CREATE OR REPLACE FUNCTION public.notify_on_offer_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  negotiation_record record;
  item_record record;
  seller_id uuid;
  buyer_id uuid;
  notification_id bigint;
BEGIN
  -- Only process when negotiation status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Get negotiation details
    SELECT n.*, i.name as item_name, i.starting_price, i.seller_id as item_seller_id,
           seller.username as seller_username, buyer.username as buyer_username
    INTO negotiation_record
    FROM public.negotiations n
    JOIN public.items i ON n.item_id = i.id
    JOIN public.profiles seller ON n.seller_id = seller.id
    JOIN public.profiles buyer ON n.buyer_id = buyer.id
    WHERE n.id = NEW.id;
    
    IF negotiation_record IS NOT NULL THEN
      seller_id := negotiation_record.seller_id;
      buyer_id := negotiation_record.buyer_id;
      
      -- Create notification for seller (offer accepted)
      SELECT public.create_notification(
        seller_id,
        'sale_completed',
        'Sale Completed!',
        format('Your item "%s" has been sold to %s for %s. Contact the buyer to arrange pickup.',
               negotiation_record.item_name,
               negotiation_record.buyer_username,
               to_char(NEW.final_price, 'FM$999,999.00')),
        'high',
        jsonb_build_object(
          'final_price', NEW.final_price,
          'starting_price', negotiation_record.starting_price,
          'buyer_username', negotiation_record.buyer_username,
          'item_name', negotiation_record.item_name,
          'profit', NEW.final_price - negotiation_record.starting_price
        ),
        format('/seller/negotiations/%s', NEW.id),
        'Contact Buyer',
        negotiation_record.item_id,
        NEW.id
      ) INTO notification_id;
      
      -- Create notification for buyer (sale confirmed)
      SELECT public.create_notification(
        buyer_id,
        'sale_completed',
        'Purchase Confirmed!',
        format('Congratulations! You purchased "%s" from %s for %s. The seller will contact you to arrange pickup.',
               negotiation_record.item_name,
               negotiation_record.seller_username,
               to_char(NEW.final_price, 'FM$999,999.00')),
        'high',
        jsonb_build_object(
          'final_price', NEW.final_price,
          'starting_price', negotiation_record.starting_price,
          'seller_username', negotiation_record.seller_username,
          'item_name', negotiation_record.item_name
        ),
        format('/negotiations/%s', NEW.id),
        'View Details',
        negotiation_record.item_id,
        NEW.id
      ) INTO notification_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for offer acceptance notifications
CREATE TRIGGER trigger_notify_on_offer_acceptance
  AFTER UPDATE ON public.negotiations
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.notify_on_offer_acceptance();

-- Trigger to create notifications when new offers are received
CREATE OR REPLACE FUNCTION public.notify_on_new_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  negotiation_record record;
  seller_id uuid;
  notification_id bigint;
BEGIN
  -- Only notify on buyer offers (not seller counter-offers)
  IF NEW.offer_type = 'buyer' THEN
    
    -- Get negotiation and item details
    SELECT n.seller_id, n.buyer_id, i.name as item_name, i.starting_price,
           seller.username as seller_username, buyer.username as buyer_username
    INTO negotiation_record
    FROM public.negotiations n
    JOIN public.items i ON n.item_id = i.id
    JOIN public.profiles seller ON n.seller_id = seller.id
    JOIN public.profiles buyer ON n.buyer_id = buyer.id
    WHERE n.id = NEW.negotiation_id;
    
    IF negotiation_record IS NOT NULL THEN
      seller_id := negotiation_record.seller_id;
      
      -- Create notification for seller (new offer received)
      SELECT public.create_notification(
        seller_id,
        'offer_received',
        'New Offer Received',
        format('%s made an offer of %s on your item "%s".',
               negotiation_record.buyer_username,
               to_char(NEW.price, 'FM$999,999.00'),
               negotiation_record.item_name),
        'medium',
        jsonb_build_object(
          'offer_price', NEW.price,
          'starting_price', negotiation_record.starting_price,
          'buyer_username', negotiation_record.buyer_username,
          'item_name', negotiation_record.item_name,
          'offer_message', COALESCE(NEW.message, '')
        ),
        format('/seller/negotiations/%s', NEW.negotiation_id),
        'View Offer',
        (SELECT item_id FROM public.negotiations WHERE id = NEW.negotiation_id),
        NEW.negotiation_id,
        NEW.id
      ) INTO notification_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new offer notifications
CREATE TRIGGER trigger_notify_on_new_offer
  AFTER INSERT ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_offer();

-- Comments for documentation
COMMENT ON TABLE public.notifications IS 'Comprehensive notification system for seller and buyer communications';
COMMENT ON TABLE public.notification_preferences IS 'User preferences for notification types and delivery methods';
COMMENT ON FUNCTION public.create_notification IS 'Creates a new notification with user preference validation';
COMMENT ON FUNCTION public.mark_notification_read IS 'Marks a specific notification as read';
COMMENT ON FUNCTION public.mark_all_notifications_read IS 'Marks all unread notifications as read for a user';
COMMENT ON FUNCTION public.get_unread_notification_count IS 'Returns count of unread notifications for a user';
COMMENT ON FUNCTION public.cleanup_old_notifications IS 'Cleans up old read/archived notifications (30+ days old)';