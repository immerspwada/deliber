-- Migration: 282_add_original_provider_id_and_fix_rls.sql
-- Author: AI Assistant
-- Date: 2026-01-15
-- Description: Add original_provider_id column and fix RLS for cancelled rides
-- Problem: When ride is cancelled, provider_id is cleared, so provider cannot read the ride
-- Solution: Add original_provider_id to track who accepted the ride, update RLS to check both
-- 
-- Applied to hosted Supabase: onsflqhkgqhydeupiqyt (delivery project)

-- Step 1: Add original_provider_id column
ALTER TABLE ride_requests 
ADD COLUMN IF NOT EXISTS original_provider_id UUID REFERENCES providers_v2(id);

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_ride_requests_original_provider 
ON ride_requests(original_provider_id) WHERE original_provider_id IS NOT NULL;

-- Step 3: Backfill existing data - copy provider_id to original_provider_id where not null
UPDATE ride_requests 
SET original_provider_id = provider_id 
WHERE provider_id IS NOT NULL AND original_provider_id IS NULL;

-- Step 4: Create trigger to auto-set original_provider_id when provider accepts
CREATE OR REPLACE FUNCTION set_original_provider_id()
RETURNS TRIGGER AS $$
BEGIN
  -- When provider_id is set for the first time, also set original_provider_id
  IF NEW.provider_id IS NOT NULL AND OLD.provider_id IS NULL THEN
    NEW.original_provider_id := NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_original_provider_id ON ride_requests;
CREATE TRIGGER trigger_set_original_provider_id
  BEFORE UPDATE ON ride_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_original_provider_id();

-- Step 5: Drop old policy and create new one that checks both provider_id and original_provider_id
DROP POLICY IF EXISTS "provider_read_assigned_rides" ON ride_requests;

CREATE POLICY "provider_read_assigned_rides" ON ride_requests
  FOR SELECT
  TO authenticated
  USING (
    -- Provider can read rides where they are currently assigned OR were originally assigned
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.user_id = (SELECT auth.uid())
      AND (
        providers_v2.id = ride_requests.provider_id
        OR providers_v2.id = ride_requests.original_provider_id
      )
    )
  );

-- Add comment
COMMENT ON COLUMN ride_requests.original_provider_id IS 'Stores the provider who originally accepted the ride, even after cancellation';
COMMENT ON POLICY "provider_read_assigned_rides" ON ride_requests IS 'Provider can read any ride they are assigned to or were originally assigned to (including cancelled rides)';
