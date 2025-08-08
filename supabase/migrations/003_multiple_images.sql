-- Migration: Add support for multiple images per item
-- This migration adds support for storing multiple images per furniture item

-- First, add new column for multiple images (as JSON array)
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::JSONB;

-- Create index on images array for better query performance
CREATE INDEX IF NOT EXISTS idx_items_images ON public.items USING GIN (images);

-- Update existing items to migrate single image to array format
UPDATE public.items 
SET images = CASE 
  WHEN image_filename IS NOT NULL AND image_filename != '' 
  THEN jsonb_build_array(jsonb_build_object('filename', image_filename, 'is_primary', true, 'order', 1))
  ELSE '[]'::JSONB 
END
WHERE images = '[]'::JSONB;

-- Add a comment explaining the new structure
COMMENT ON COLUMN public.items.images IS 'Array of image objects: [{"filename": "image1.jpg", "is_primary": true, "order": 1}, ...]';

-- We keep the old image_filename column for backward compatibility during transition
-- It will be removed in a future migration once all code is updated