-- Enhanced Profiles Migration
-- Adds profile picture, bio, and other community features

-- Add new columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_picture_filename text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS location_city text,
ADD COLUMN IF NOT EXISTS location_state text,
ADD COLUMN IF NOT EXISTS is_verified boolean default false,
ADD COLUMN IF NOT EXISTS total_sales integer default 0,
ADD COLUMN IF NOT EXISTS total_purchases integer default 0,
ADD COLUMN IF NOT EXISTS rating_average decimal(3,2) default 0.0,
ADD COLUMN IF NOT EXISTS rating_count integer default 0;

-- Update the display_name to use username as default for existing users
UPDATE public.profiles 
SET display_name = username 
WHERE display_name IS NULL;

-- Make display_name not null after setting defaults
ALTER TABLE public.profiles 
ALTER COLUMN display_name SET NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(location_city, location_state);
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON public.profiles(rating_average DESC);

-- Create a function to update profile stats (will be useful later for ratings)
CREATE OR REPLACE FUNCTION update_profile_stats(profile_id uuid)
RETURNS void AS $$
BEGIN
  -- Update total sales count
  UPDATE public.profiles 
  SET total_sales = (
    SELECT COUNT(*) 
    FROM public.items 
    WHERE seller_id = profile_id AND sold_at IS NOT NULL
  )
  WHERE id = profile_id;
  
  -- Note: total_purchases and ratings will be implemented when we add those features
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update profile stats when items are sold
CREATE OR REPLACE FUNCTION handle_item_sold()
RETURNS trigger AS $$
BEGIN
  IF NEW.sold_at IS NOT NULL AND OLD.sold_at IS NULL THEN
    PERFORM update_profile_stats(NEW.seller_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_item_sold ON public.items;
CREATE TRIGGER trigger_item_sold
  AFTER UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION handle_item_sold();

-- Update RLS policies for profiles to allow public viewing but restrict editing
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);