-- Migration: 127_fix_analytics_events_rls.sql
-- Description: Fix RLS policies for analytics_events table
-- Issue: 401 Unauthorized when inserting analytics events
-- Root cause: Conflicting RLS policies from migrations 045 and 046

-- =====================================================
-- DROP EXISTING CONFLICTING POLICIES
-- =====================================================

-- Drop all existing policies on analytics_events
DROP POLICY IF EXISTS "Anyone can insert analytics" ON analytics_events;
DROP POLICY IF EXISTS "Admins can read analytics" ON analytics_events;
DROP POLICY IF EXISTS "Users can insert own events" ON analytics_events;
DROP POLICY IF EXISTS "Users can read own events" ON analytics_events;
DROP POLICY IF EXISTS "Admin can read all events" ON analytics_events;

-- =====================================================
-- CREATE NEW UNIFIED POLICIES
-- =====================================================

-- Policy 1: Allow authenticated users to insert events
-- user_id can be NULL for anonymous tracking before login
CREATE POLICY "analytics_insert_authenticated"
ON analytics_events
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can insert their own events or anonymous events
  user_id IS NULL OR user_id = auth.uid()
);

-- Policy 2: Allow anonymous insert for performance metrics
-- This allows tracking before user logs in
CREATE POLICY "analytics_insert_anon"
ON analytics_events
FOR INSERT
TO anon
WITH CHECK (
  -- Anonymous users can only insert events without user_id
  user_id IS NULL
);

-- Policy 3: Users can read their own events
CREATE POLICY "analytics_select_own"
ON analytics_events
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Policy 4: Admin can read all events
CREATE POLICY "analytics_select_admin"
ON analytics_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- =====================================================
-- VERIFY TABLE STRUCTURE
-- =====================================================

-- Ensure user_id column allows NULL
ALTER TABLE analytics_events 
ALTER COLUMN user_id DROP NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE analytics_events IS 
'Analytics events tracking (F237) - Fixed RLS in migration 127';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Ensure proper grants
GRANT SELECT, INSERT ON analytics_events TO authenticated;
GRANT INSERT ON analytics_events TO anon;
