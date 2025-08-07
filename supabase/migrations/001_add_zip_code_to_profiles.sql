-- Add zip_code column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10);

-- Add comment to document the field
COMMENT ON COLUMN public.profiles.zip_code IS 'User''s zip code for local pickup/delivery area';

-- Update existing users with a test zip code (for development/testing)
-- Remove this in production
UPDATE public.profiles 
SET zip_code = '90210' 
WHERE zip_code IS NULL AND created_at < NOW();