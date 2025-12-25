-- Fix analytics_events RLS policy to allow authenticated users to insert
-- Migration: 169_fix_analytics_events_insert.sql

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can insert their own analytics events" ON analytics_events;

-- Create new policy that allows all authenticated users to insert
CREATE POLICY "Authenticated users can insert analytics events"
  ON analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also ensure SELECT policy exists for users to read their own events
DROP POLICY IF EXISTS "Users can view their own analytics events" ON analytics_events;

CREATE POLICY "Users can view their own analytics events"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    user_id IS NULL -- Allow viewing anonymous events
  );

-- Admin full access
DROP POLICY IF EXISTS "Admins have full access to analytics events" ON analytics_events;

CREATE POLICY "Admins have full access to analytics events"
  ON analytics_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add comment
COMMENT ON TABLE analytics_events IS 'Analytics events tracking - allows authenticated users to insert events';
