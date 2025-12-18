-- =============================================
-- Migration: 047_saved_places_sort_order.sql
-- Feature: F09 - Saved Places Sort Order
-- Description: Add sort_order column for drag-and-drop reordering
-- =============================================

-- Add sort_order column to saved_places
ALTER TABLE saved_places 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create index for faster sorting
CREATE INDEX IF NOT EXISTS idx_saved_places_sort_order 
ON saved_places(user_id, sort_order);

-- Update existing records with sequential sort_order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as rn
  FROM saved_places
)
UPDATE saved_places 
SET sort_order = numbered.rn
FROM numbered
WHERE saved_places.id = numbered.id;

-- Function to update sort order for multiple places
CREATE OR REPLACE FUNCTION update_places_sort_order(
  p_user_id UUID,
  p_place_ids UUID[],
  p_sort_orders INTEGER[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  i INTEGER;
BEGIN
  -- Validate arrays have same length
  IF array_length(p_place_ids, 1) != array_length(p_sort_orders, 1) THEN
    RAISE EXCEPTION 'Arrays must have same length';
  END IF;
  
  -- Update each place's sort_order
  FOR i IN 1..array_length(p_place_ids, 1) LOOP
    UPDATE saved_places
    SET sort_order = p_sort_orders[i],
        updated_at = NOW()
    WHERE id = p_place_ids[i]
      AND user_id = p_user_id;
  END LOOP;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_places_sort_order TO authenticated;

-- Comment
COMMENT ON COLUMN saved_places.sort_order IS 'Order for displaying saved places (lower = first)';
