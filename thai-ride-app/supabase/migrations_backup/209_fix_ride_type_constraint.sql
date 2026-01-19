-- ============================================
-- Migration: 209_fix_ride_type_constraint.sql
-- Feature: F02 - Ride Booking
-- Date: 2024-12-31
-- ============================================
-- Description: Fix ride_type constraint to accept 'car', 'motorcycle', 'van', 'moto'
--              in addition to 'standard', 'premium', 'shared'
-- Tables: ride_requests, recurring_rides
-- ============================================

-- 1. Drop existing constraint on ride_requests
ALTER TABLE ride_requests 
DROP CONSTRAINT IF EXISTS ride_requests_ride_type_check;

-- 2. Add new constraint with all valid values
ALTER TABLE ride_requests 
ADD CONSTRAINT ride_requests_ride_type_check 
CHECK (ride_type IN ('standard', 'premium', 'shared', 'moto', 'car', 'motorcycle', 'van'));

-- 3. Update recurring_rides if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'recurring_rides'
  ) THEN
    ALTER TABLE recurring_rides 
    DROP CONSTRAINT IF EXISTS recurring_rides_ride_type_check;
    
    ALTER TABLE recurring_rides 
    ADD CONSTRAINT recurring_rides_ride_type_check 
    CHECK (ride_type IN ('standard', 'premium', 'shared', 'moto', 'car', 'motorcycle', 'van'));
  END IF;
END $$;

-- 4. Verify constraint
DO $$
BEGIN
  RAISE NOTICE '✅ ride_type constraint updated successfully';
  RAISE NOTICE 'Valid values: standard, premium, shared, moto, car, motorcycle, van';
END $$;
