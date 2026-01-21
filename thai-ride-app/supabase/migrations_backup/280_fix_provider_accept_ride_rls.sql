-- Migration: 280_fix_provider_accept_ride_rls.sql
-- Author: AI Assistant
-- Date: 2026-01-15
-- Description: Fix RLS policy for provider accepting pending rides
-- Problem: Provider cannot update ride_requests to set provider_id and status='matched'
--          because the old USING clause checked provider_id IS NULL but after update it's not NULL
-- Solution: Create proper UPDATE policy that allows provider to claim pending rides
-- 
-- Applied to hosted Supabase: onsflqhkgqhydeupiqyt (delivery project)

-- Drop existing problematic policies
DROP POLICY IF EXISTS "simple_provider_accept_pending" ON ride_requests;
DROP POLICY IF EXISTS "provider_accept_pending_rides" ON ride_requests;

-- Create new policy for provider accepting rides
-- USING: Check the OLD row (pending, no provider)
-- WITH CHECK: Check the NEW row (matched, provider assigned to current user)
CREATE POLICY "provider_accept_pending_rides" ON ride_requests
  FOR UPDATE
  TO authenticated
  USING (
    -- Can only update rides that are pending and not yet assigned
    status = 'pending' 
    AND provider_id IS NULL
    -- User must be an approved provider
    AND EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.user_id = (SELECT auth.uid())
        AND providers_v2.status IN ('approved', 'active')
    )
  )
  WITH CHECK (
    -- After update, the provider_id must belong to the current user
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = ride_requests.provider_id
        AND providers_v2.user_id = (SELECT auth.uid())
    )
    -- Status must be 'matched' (provider accepting the ride)
    AND status = 'matched'
  );

-- Comments
COMMENT ON POLICY "provider_accept_pending_rides" ON ride_requests IS 
  'Provider can accept (claim) pending rides by setting provider_id and status=matched';
