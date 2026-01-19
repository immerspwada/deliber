-- ============================================================================
-- Migration 265: Fix Provider Location and Ride Request Columns
-- ============================================================================
-- Fixes:
-- 1. Add current_lat, current_lng, location_updated_at to providers_v2
-- 2. Add cancellation_reason to ride_requests (if missing)
-- 3. Add is_available column to providers_v2 (if missing)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Add location columns to providers_v2
-- ============================================================================

-- Add current_lat column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'providers_v2' AND column_name = 'current_lat'
  ) THEN
    ALTER TABLE providers_v2 ADD COLUMN current_lat DECIMAL(10,8);
    RAISE NOTICE 'Added current_lat column to providers_v2';
  END IF;
END $$;

-- Add current_lng column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'providers_v2' AND column_name = 'current_lng'
  ) THEN
    ALTER TABLE providers_v2 ADD COLUMN current_lng DECIMAL(11,8);
    RAISE NOTICE 'Added current_lng column to providers_v2';
  END IF;
END $$;

-- Add location_updated_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'providers_v2' AND column_name = 'location_updated_at'
  ) THEN
    ALTER TABLE providers_v2 ADD COLUMN location_updated_at TIMESTAMPTZ;
    RAISE NOTICE 'Added location_updated_at column to providers_v2';
  END IF;
END $$;

-- Add is_available column (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'providers_v2' AND column_name = 'is_available'
  ) THEN
    ALTER TABLE providers_v2 ADD COLUMN is_available BOOLEAN DEFAULT TRUE;
    RAISE NOTICE 'Added is_available column to providers_v2';
  END IF;
END $$;

-- Create index for location queries
CREATE INDEX IF NOT EXISTS idx_providers_v2_location_lat_lng 
ON providers_v2(current_lat, current_lng) 
WHERE is_online = true;

-- ============================================================================
-- 2. Add cancellation columns to ride_requests
-- ============================================================================

-- Add cancellation_reason column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ride_requests' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE ride_requests ADD COLUMN cancellation_reason TEXT;
    RAISE NOTICE 'Added cancellation_reason column to ride_requests';
  END IF;
END $$;

-- Add cancelled_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ride_requests' AND column_name = 'cancelled_by'
  ) THEN
    ALTER TABLE ride_requests ADD COLUMN cancelled_by TEXT CHECK (cancelled_by IN ('provider', 'customer', 'system'));
    RAISE NOTICE 'Added cancelled_by column to ride_requests';
  END IF;
END $$;

-- Add cancelled_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ride_requests' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE ride_requests ADD COLUMN cancelled_at TIMESTAMPTZ;
    RAISE NOTICE 'Added cancelled_at column to ride_requests';
  END IF;
END $$;

-- ============================================================================
-- 3. Update RLS policy for providers_v2 location updates
-- ============================================================================

-- Drop existing policy if exists and recreate
DROP POLICY IF EXISTS "Providers can update own location" ON providers_v2;

CREATE POLICY "Providers can update own location"
  ON providers_v2 FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  v_has_lat BOOLEAN;
  v_has_lng BOOLEAN;
  v_has_loc_updated BOOLEAN;
  v_has_cancel_reason BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'providers_v2' AND column_name = 'current_lat'
  ) INTO v_has_lat;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'providers_v2' AND column_name = 'current_lng'
  ) INTO v_has_lng;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'providers_v2' AND column_name = 'location_updated_at'
  ) INTO v_has_loc_updated;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ride_requests' AND column_name = 'cancellation_reason'
  ) INTO v_has_cancel_reason;
  
  RAISE NOTICE '✅ Migration 265 verification:';
  RAISE NOTICE '  - providers_v2.current_lat: %', v_has_lat;
  RAISE NOTICE '  - providers_v2.current_lng: %', v_has_lng;
  RAISE NOTICE '  - providers_v2.location_updated_at: %', v_has_loc_updated;
  RAISE NOTICE '  - ride_requests.cancellation_reason: %', v_has_cancel_reason;
END $$;
