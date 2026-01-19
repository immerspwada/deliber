-- Migration: 080_fix_analytics_events_rls.sql
-- Feature: F237 - Analytics Events RLS Fix
-- Description: Fix 401 Unauthorized error when inserting analytics events

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Anyone can insert analytics" ON analytics_events;
DROP POLICY IF EXISTS "Users can insert own events" ON analytics_events;
DROP POLICY IF EXISTS "Admins can read analytics" ON analytics_events;
DROP POLICY IF EXISTS "Users can read own events" ON analytics_events;
DROP POLICY IF EXISTS "Admin can read all events" ON analytics_events;

-- Create new policies that work for both authenticated and anonymous users

-- INSERT: Allow anyone to insert analytics events (for tracking)
CREATE POLICY "analytics_events_insert_policy" ON analytics_events
  FOR INSERT WITH CHECK (true);

-- SELECT: Users can read their own events
CREATE POLICY "analytics_events_select_own" ON analytics_events
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND auth.uid() = user_id
  );

-- SELECT: Admins can read all events
CREATE POLICY "analytics_events_select_admin" ON analytics_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add comment
COMMENT ON TABLE analytics_events IS 'UX Analytics events - INSERT allowed for all, SELECT for owner/admin (F237)';
