-- =============================================
-- Rollback: 237_fix_places_schema_production
-- Description: Rollback migration 237
-- =============================================

BEGIN;

-- Drop new RLS policies
DROP POLICY IF EXISTS "saved_places_select_own" ON saved_places;
DROP POLICY IF EXISTS "saved_places_insert_own" ON saved_places;
DROP POLICY IF EXISTS "saved_places_update_own" ON saved_places;
DROP POLICY IF EXISTS "saved_places_delete_own" ON saved_places;

DROP POLICY IF EXISTS "recent_places_select_own" ON recent_places;
DROP POLICY IF EXISTS "recent_places_insert_own" ON recent_places;
DROP POLICY IF EXISTS "recent_places_update_own" ON recent_places;
DROP POLICY IF EXISTS "recent_places_delete_own" ON recent_places;

-- Restore permissive policies (dev mode)
CREATE POLICY "Allow all saved_places" ON saved_places FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all recent_places" ON recent_places FOR ALL USING (true) WITH CHECK (true);

-- Drop trigger
DROP TRIGGER IF EXISTS sync_recent_places_trigger ON recent_places;
DROP FUNCTION IF EXISTS sync_recent_places_columns();

-- Drop helper functions
DROP FUNCTION IF EXISTS update_places_sort_order(UUID, UUID[], INTEGER[]);
DROP FUNCTION IF EXISTS add_or_update_recent_place(UUID, VARCHAR, TEXT, DECIMAL, DECIMAL);

-- Drop indexes
DROP INDEX IF EXISTS idx_saved_places_sort;
DROP INDEX IF EXISTS idx_recent_places_last_used;

-- Note: We don't drop the alias columns (name, last_used_at, search_count) 
-- as they may contain data and removing them could cause data loss

COMMIT;
