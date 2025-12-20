-- Migration: 126_fix_rls_and_functions.sql
-- Description: Fix RLS policies and missing functions causing 401/404 errors
-- Issues Fixed:
--   1. analytics_events 401 Unauthorized - Allow anonymous inserts
--   2. topup_requests 404 Not Found - Fix RLS policy
--   3. get_favorite_drivers 404 Not Found - Ensure function exists

-- =====================================================
-- 1. FIX analytics_events RLS POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can insert analytics" ON analytics_events;
DROP POLICY IF EXISTS "Users can insert own events" ON analytics_events;
DROP POLICY IF EXISTS "Users can read own events" ON analytics_events;
DROP POLICY IF EXISTS "Admin can read all events" ON analytics_events;
DROP POLICY IF EXISTS "Admins can read analytics" ON analytics_events;

-- Create new policies that allow anonymous tracking
-- Allow anyone to insert (for anonymous users and logged-in users)
CREATE POLICY "analytics_insert_all" ON analytics_events
  FOR INSERT WITH CHECK (true);

-- Allow users to read their own events
CREATE POLICY "analytics_read_own" ON analytics_events
  FOR SELECT USING (
    user_id IS NULL 
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 2. FIX topup_requests RLS POLICIES
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Allow all topup_requests" ON public.topup_requests;
DROP POLICY IF EXISTS "topup_requests_user_select" ON public.topup_requests;
DROP POLICY IF EXISTS "topup_requests_user_insert" ON public.topup_requests;
DROP POLICY IF EXISTS "topup_requests_admin_all" ON public.topup_requests;

-- Users can read their own topup requests
CREATE POLICY "topup_requests_user_select" ON public.topup_requests
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can insert their own topup requests
CREATE POLICY "topup_requests_user_insert" ON public.topup_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admin can update (approve/reject)
CREATE POLICY "topup_requests_admin_update" ON public.topup_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- 3. ENSURE get_favorite_drivers FUNCTION EXISTS
-- =====================================================

-- Create or replace the function
CREATE OR REPLACE FUNCTION get_favorite_drivers(p_user_id UUID)
RETURNS TABLE (
  provider_id UUID,
  provider_name TEXT,
  provider_phone TEXT,
  provider_rating NUMERIC,
  total_rides INTEGER,
  vehicle_type TEXT,
  vehicle_plate TEXT,
  favorited_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id as provider_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.name, 'ไม่ระบุชื่อ') as provider_name,
    u.phone_number as provider_phone,
    COALESCE(sp.rating, 5.0) as provider_rating,
    COALESCE(sp.total_rides, 0)::INTEGER as total_rides,
    sp.vehicle_type,
    sp.vehicle_plate,
    fd.created_at as favorited_at
  FROM favorite_drivers fd
  JOIN service_providers sp ON sp.id = fd.driver_id
  JOIN users u ON u.id = sp.user_id
  WHERE fd.user_id = p_user_id
  ORDER BY fd.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_favorite_drivers(UUID) TO authenticated;

-- =====================================================
-- 4. ENSURE favorite_drivers TABLE EXISTS
-- =====================================================

CREATE TABLE IF NOT EXISTS favorite_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, driver_id)
);

-- Enable RLS
ALTER TABLE favorite_drivers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "favorite_drivers_user_all" ON favorite_drivers;
CREATE POLICY "favorite_drivers_user_all" ON favorite_drivers
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index
CREATE INDEX IF NOT EXISTS idx_favorite_drivers_user ON favorite_drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_drivers_driver ON favorite_drivers(driver_id);

-- =====================================================
-- 5. ENSURE blocked_drivers TABLE EXISTS
-- =====================================================

CREATE TABLE IF NOT EXISTS blocked_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, driver_id)
);

-- Enable RLS
ALTER TABLE blocked_drivers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "blocked_drivers_user_all" ON blocked_drivers;
CREATE POLICY "blocked_drivers_user_all" ON blocked_drivers
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index
CREATE INDEX IF NOT EXISTS idx_blocked_drivers_user ON blocked_drivers(user_id);

-- =====================================================
-- 6. CREATE is_driver_blocked FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION is_driver_blocked(p_user_id UUID, p_driver_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_drivers
    WHERE user_id = p_user_id AND driver_id = p_driver_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_driver_blocked(UUID, UUID) TO authenticated;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, DELETE ON favorite_drivers TO authenticated;
GRANT SELECT, INSERT, DELETE ON blocked_drivers TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON POLICY "analytics_insert_all" ON analytics_events IS 'Allow all users (including anonymous) to insert analytics events';
COMMENT ON POLICY "analytics_read_own" ON analytics_events IS 'Users can read their own events, admins can read all';
COMMENT ON FUNCTION get_favorite_drivers(UUID) IS 'Get list of favorite drivers for a user (F18)';
COMMENT ON FUNCTION is_driver_blocked(UUID, UUID) IS 'Check if a driver is blocked by user (F18)';
