-- Migration: 281_fix_provider_read_assigned_rides_rls.sql
-- Author: AI Assistant
-- Date: 2026-01-15
-- Description: Fix RLS policy for provider reading assigned rides
-- Problem: Provider cannot SELECT ride_requests after accepting (406 error)
--          Policy simple_provider_assigned was too restrictive
-- Solution: Split into separate SELECT and UPDATE policies for assigned rides
-- 
-- Applied to hosted Supabase: onsflqhkgqhydeupiqyt (delivery project)

-- Drop existing problematic policy
DROP POLICY IF EXISTS "simple_provider_assigned" ON ride_requests;

-- Create new policy that allows provider to read ANY ride where they are assigned
-- This includes all statuses: matched, arrived, in_progress, completed, cancelled
CREATE POLICY "provider_read_assigned_rides" ON ride_requests
  FOR SELECT
  TO authenticated
  USING (
    provider_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = ride_requests.provider_id
      AND providers_v2.user_id = (SELECT auth.uid())
    )
  );

-- Create separate policy for provider to UPDATE assigned rides (non-pending)
CREATE POLICY "provider_update_assigned_rides" ON ride_requests
  FOR UPDATE
  TO authenticated
  USING (
    provider_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = ride_requests.provider_id
      AND providers_v2.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    provider_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = ride_requests.provider_id
      AND providers_v2.user_id = (SELECT auth.uid())
    )
  );

-- Add comments
COMMENT ON POLICY "provider_read_assigned_rides" ON ride_requests IS 
  'Provider can read any ride they are assigned to (all statuses including cancelled)';

COMMENT ON POLICY "provider_update_assigned_rides" ON ride_requests IS 
  'Provider can update rides they are assigned to (status changes, photos, etc)';
