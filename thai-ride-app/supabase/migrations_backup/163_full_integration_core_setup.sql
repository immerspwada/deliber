-- =============================================
-- Migration: 163_full_integration_core_setup.sql
-- Task: 1 - Setup Core Infrastructure and Dual-Role System
-- Description: Setup Realtime channels and comprehensive RLS policies
--              for full cross-role integration
-- Requirements: 1.1, 1.2, 1.5
-- =============================================

-- Enable Realtime for all service request tables
ALTER PUBLICATION supabase_realtime ADD TABLE ride_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE queue_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE moving_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE laundry_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE service_providers;
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;

-- =============================================
-- Helper Functions for Role Checking
-- =============================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get provider_id from user_id
CREATE OR REPLACE FUNCTION get_provider_id(user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM service_providers 
    WHERE user_id = user_id 
    AND status IN ('approved', 'active')
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns a provider record
CREATE OR REPLACE FUNCTION is_provider_owner(user_id UUID, provider_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM service_providers 
    WHERE id = provider_id 
    AND user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Enhanced RLS Policies for Ride Requests
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own ride requests" ON ride_requests;
DROP POLICY IF EXISTS "Users can create ride requests" ON ride_requests;
DROP POLICY IF EXISTS "Providers can view assigned rides" ON ride_requests;
DROP POLICY IF EXISTS "Providers can view pending rides" ON ride_requests;
DROP POLICY IF EXISTS "Admin full access to rides" ON ride_requests;

-- Customer: View own requests
CREATE POLICY "customer_view_own_rides" ON ride_requests
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_admin(auth.uid())
  );

-- Customer: Create own requests
CREATE POLICY "customer_create_rides" ON ride_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Customer: Update own pending requests (for cancellation)
CREATE POLICY "customer_update_own_pending_rides" ON ride_requests
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND status IN ('pending', 'matched')
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND status IN ('pending', 'matched', 'cancelled')
  );

-- Provider: View pending rides in their area
CREATE POLICY "provider_view_pending_rides" ON ride_requests
  FOR SELECT
  USING (
    (status = 'pending' AND get_provider_id(auth.uid()) IS NOT NULL)
    OR (provider_id = get_provider_id(auth.uid()))
    OR is_admin(auth.uid())
  );

-- Provider: Update assigned rides
CREATE POLICY "provider_update_assigned_rides" ON ride_requests
  FOR UPDATE
  USING (
    provider_id = get_provider_id(auth.uid())
    OR is_admin(auth.uid())
  )
  WITH CHECK (
    provider_id = get_provider_id(auth.uid())
    OR is_admin(auth.uid())
  );

-- Admin: Full access
CREATE POLICY "admin_full_access_rides" ON ride_requests
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- =============================================
-- Enhanced RLS Policies for Delivery Requests
-- =============================================

DROP POLICY IF EXISTS "Users can view own delivery requests" ON delivery_requests;
DROP POLICY IF EXISTS "Users can create delivery requests" ON delivery_requests;
DROP POLICY IF EXISTS "Providers can view assigned deliveries" ON delivery_requests;

-- Customer policies
CREATE POLICY "customer_view_own_deliveries" ON delivery_requests
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_admin(auth.uid())
  );

CREATE POLICY "customer_create_deliveries" ON delivery_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "customer_update_own_pending_deliveries" ON delivery_requests
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND status IN ('pending', 'matched')
  );

-- Provider policies
CREATE POLICY "provider_view_pending_deliveries" ON delivery_requests
  FOR SELECT
  USING (
    (status = 'pending' AND get_provider_id(auth.uid()) IS NOT NULL)
    OR (provider_id = get_provider_id(auth.uid()))
    OR is_admin(auth.uid())
  );

CREATE POLICY "provider_update_assigned_deliveries" ON delivery_requests
  FOR UPDATE
  USING (
    provider_id = get_provider_id(auth.uid())
    OR is_admin(auth.uid())
  );

-- Admin policy
CREATE POLICY "admin_full_access_deliveries" ON delivery_requests
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- =============================================
-- Enhanced RLS Policies for Shopping Requests
-- =============================================

DROP POLICY IF EXISTS "Users can view own shopping requests" ON shopping_requests;
DROP POLICY IF EXISTS "Users can create shopping requests" ON shopping_requests;

-- Customer policies
CREATE POLICY "customer_view_own_shopping" ON shopping_requests
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_admin(auth.uid())
  );

CREATE POLICY "customer_create_shopping" ON shopping_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "customer_update_own_pending_shopping" ON shopping_requests
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND status IN ('pending', 'matched')
  );

-- Provider policies
CREATE POLICY "provider_view_pending_shopping" ON shopping_requests
  FOR SELECT
  USING (
    (status = 'pending' AND get_provider_id(auth.uid()) IS NOT NULL)
    OR (provider_id = get_provider_id(auth.uid()))
    OR is_admin(auth.uid())
  );

CREATE POLICY "provider_update_assigned_shopping" ON shopping_requests
  FOR UPDATE
  USING (
    provider_id = get_provider_id(auth.uid())
    OR is_admin(auth.uid())
  );

-- Admin policy
CREATE POLICY "admin_full_access_shopping" ON shopping_requests
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- =============================================
-- Enhanced RLS Policies for Service Providers
-- =============================================

DROP POLICY IF EXISTS "Providers can view own profile" ON service_providers;
DROP POLICY IF EXISTS "Providers can update own profile" ON service_providers;
DROP POLICY IF EXISTS "Users can view online providers" ON service_providers;

-- Provider: View own profile
CREATE POLICY "provider_view_own_profile" ON service_providers
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_admin(auth.uid())
  );

-- Provider: Update own profile (limited fields)
CREATE POLICY "provider_update_own_profile" ON service_providers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Customer: View approved/active providers
CREATE POLICY "customer_view_active_providers" ON service_providers
  FOR SELECT
  USING (
    status IN ('approved', 'active')
    OR auth.uid() = user_id
    OR is_admin(auth.uid())
  );

-- Admin: Full access
CREATE POLICY "admin_full_access_providers" ON service_providers
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- =============================================
-- Enhanced RLS Policies for User Notifications
-- =============================================

DROP POLICY IF EXISTS "Users can view own notifications" ON user_notifications;

-- User: View own notifications
CREATE POLICY "user_view_own_notifications" ON user_notifications
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_admin(auth.uid())
  );

-- System: Insert notifications (via service role)
CREATE POLICY "system_insert_notifications" ON user_notifications
  FOR INSERT
  WITH CHECK (true);

-- User: Update own notifications (mark as read)
CREATE POLICY "user_update_own_notifications" ON user_notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin: Full access
CREATE POLICY "admin_full_access_notifications" ON user_notifications
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- =============================================
-- Indexes for Performance
-- =============================================

-- Indexes for realtime filtering
CREATE INDEX IF NOT EXISTS idx_ride_requests_status_created 
  ON ride_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ride_requests_provider_status 
  ON ride_requests(provider_id, status) 
  WHERE provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_requests_status_created 
  ON delivery_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shopping_requests_status_created 
  ON shopping_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_providers_status_available 
  ON service_providers(status, is_available) 
  WHERE status IN ('approved', 'active');

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read 
  ON user_notifications(user_id, is_read, created_at DESC);

-- =============================================
-- Grant Permissions
-- =============================================

GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_provider_owner(UUID, UUID) TO authenticated;

-- =============================================
-- Comments
-- =============================================

COMMENT ON FUNCTION is_admin(UUID) IS 'Check if user has admin role';
COMMENT ON FUNCTION get_provider_id(UUID) IS 'Get provider_id from user_id for approved/active providers';
COMMENT ON FUNCTION is_provider_owner(UUID, UUID) IS 'Check if user owns a provider record';

