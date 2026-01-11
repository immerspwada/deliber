-- =============================================
-- Migration: 237_fix_places_schema_production
-- Description: Fix schema mismatch between code and database for saved_places and recent_places
-- Author: Kiro
-- Date: 2026-01-11
-- =============================================

-- ============================================
-- PART 1: Fix saved_places table
-- ============================================

-- Add sort_order column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'saved_places' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE saved_places ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add is_favorite column if not exists (from customer migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'saved_places' AND column_name = 'is_favorite'
  ) THEN
    ALTER TABLE saved_places ADD COLUMN is_favorite BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================
-- PART 2: Fix recent_places table - add alias columns
-- ============================================

-- Add 'name' column as alias for place_name (code expects 'name')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recent_places' AND column_name = 'name'
  ) THEN
    ALTER TABLE recent_places ADD COLUMN name VARCHAR(200);
    -- Copy existing place_name data to name
    UPDATE recent_places SET name = place_name WHERE name IS NULL AND place_name IS NOT NULL;
  END IF;
END $$;

-- Add 'last_used_at' column as alias for last_visited_at (code expects 'last_used_at')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recent_places' AND column_name = 'last_used_at'
  ) THEN
    ALTER TABLE recent_places ADD COLUMN last_used_at TIMESTAMPTZ;
    -- Copy existing last_visited_at data
    UPDATE recent_places SET last_used_at = last_visited_at WHERE last_used_at IS NULL;
    -- Set default for new records
    ALTER TABLE recent_places ALTER COLUMN last_used_at SET DEFAULT NOW();
  END IF;
END $$;

-- Add 'search_count' column as alias for visit_count (code expects 'search_count')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recent_places' AND column_name = 'search_count'
  ) THEN
    ALTER TABLE recent_places ADD COLUMN search_count INTEGER DEFAULT 1;
    -- Copy existing visit_count data
    UPDATE recent_places SET search_count = visit_count WHERE search_count IS NULL OR search_count = 1;
  END IF;
END $$;

-- ============================================
-- PART 3: Create trigger to sync alias columns
-- ============================================

-- Trigger function to keep alias columns in sync
CREATE OR REPLACE FUNCTION sync_recent_places_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync name <-> place_name
  IF NEW.name IS NOT NULL AND (NEW.place_name IS NULL OR NEW.place_name != NEW.name) THEN
    NEW.place_name := NEW.name;
  ELSIF NEW.place_name IS NOT NULL AND (NEW.name IS NULL OR NEW.name != NEW.place_name) THEN
    NEW.name := NEW.place_name;
  END IF;
  
  -- Sync last_used_at <-> last_visited_at
  IF NEW.last_used_at IS NOT NULL AND (NEW.last_visited_at IS NULL OR NEW.last_visited_at != NEW.last_used_at) THEN
    NEW.last_visited_at := NEW.last_used_at;
  ELSIF NEW.last_visited_at IS NOT NULL AND (NEW.last_used_at IS NULL OR NEW.last_used_at != NEW.last_visited_at) THEN
    NEW.last_used_at := NEW.last_visited_at;
  END IF;
  
  -- Sync search_count <-> visit_count
  IF NEW.search_count IS NOT NULL AND (NEW.visit_count IS NULL OR NEW.visit_count != NEW.search_count) THEN
    NEW.visit_count := NEW.search_count;
  ELSIF NEW.visit_count IS NOT NULL AND (NEW.search_count IS NULL OR NEW.search_count != NEW.visit_count) THEN
    NEW.search_count := NEW.visit_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS sync_recent_places_trigger ON recent_places;

-- Create trigger
CREATE TRIGGER sync_recent_places_trigger
  BEFORE INSERT OR UPDATE ON recent_places
  FOR EACH ROW
  EXECUTE FUNCTION sync_recent_places_columns();

-- ============================================
-- PART 4: Update RLS Policies for Production
-- ============================================

-- Drop permissive policies
DROP POLICY IF EXISTS "Allow all saved_places" ON saved_places;
DROP POLICY IF EXISTS "Allow all recent_places" ON recent_places;
DROP POLICY IF EXISTS "Users can manage own saved places" ON saved_places;
DROP POLICY IF EXISTS "Users can manage own recent places" ON recent_places;

-- Create production-ready RLS policies for saved_places
CREATE POLICY "saved_places_select_own"
ON saved_places FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "saved_places_insert_own"
ON saved_places FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_places_update_own"
ON saved_places FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_places_delete_own"
ON saved_places FOR DELETE
USING (auth.uid() = user_id);

-- Create production-ready RLS policies for recent_places
CREATE POLICY "recent_places_select_own"
ON recent_places FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "recent_places_insert_own"
ON recent_places FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recent_places_update_own"
ON recent_places FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recent_places_delete_own"
ON recent_places FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- PART 5: Create/Update helper functions
-- ============================================

-- Function to update sort order for saved places
CREATE OR REPLACE FUNCTION update_places_sort_order(
  p_user_id UUID,
  p_place_ids UUID[],
  p_sort_orders INTEGER[]
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add or update recent place (production version)
CREATE OR REPLACE FUNCTION add_or_update_recent_place(
  p_user_id UUID,
  p_name VARCHAR(200),
  p_address TEXT,
  p_lat DECIMAL(10,8),
  p_lng DECIMAL(11,8)
)
RETURNS UUID AS $$
DECLARE
  v_place_id UUID;
BEGIN
  -- Check if place already exists (by name match)
  SELECT id INTO v_place_id FROM recent_places
  WHERE user_id = p_user_id
    AND name = p_name;
  
  IF v_place_id IS NOT NULL THEN
    -- Update existing place
    UPDATE recent_places
    SET search_count = search_count + 1,
        visit_count = visit_count + 1,
        last_used_at = NOW(),
        last_visited_at = NOW()
    WHERE id = v_place_id;
  ELSE
    -- Insert new place
    INSERT INTO recent_places (user_id, name, place_name, address, lat, lng, search_count, visit_count, last_used_at, last_visited_at)
    VALUES (p_user_id, p_name, p_name, p_address, p_lat, p_lng, 1, 1, NOW(), NOW())
    RETURNING id INTO v_place_id;
    
    -- Keep only last 20 recent places per user
    DELETE FROM recent_places
    WHERE user_id = p_user_id
      AND id NOT IN (
        SELECT id FROM recent_places
        WHERE user_id = p_user_id
        ORDER BY last_used_at DESC
        LIMIT 20
      );
  END IF;
  
  RETURN v_place_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 6: Add indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_saved_places_sort ON saved_places(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_recent_places_last_used ON recent_places(user_id, last_used_at DESC);

-- ============================================
-- POST-MIGRATION VERIFICATION
-- ============================================
DO $$
BEGIN
  -- Verify sort_order column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'saved_places' AND column_name = 'sort_order'
  ) THEN
    RAISE EXCEPTION 'Migration failed: sort_order column not created';
  END IF;
  
  -- Verify name column exists in recent_places
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recent_places' AND column_name = 'name'
  ) THEN
    RAISE EXCEPTION 'Migration failed: name column not created in recent_places';
  END IF;
  
  -- Verify last_used_at column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recent_places' AND column_name = 'last_used_at'
  ) THEN
    RAISE EXCEPTION 'Migration failed: last_used_at column not created';
  END IF;
  
  RAISE NOTICE 'Migration 237 completed successfully';
END $$;
