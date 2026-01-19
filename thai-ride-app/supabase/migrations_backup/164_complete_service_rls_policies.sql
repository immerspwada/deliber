-- =============================================
-- Migration: 164_complete_service_rls_policies.sql
-- Description: Complete RLS policies for Queue, Moving, and Laundry services
-- Completes: Migration 163 by adding missing RLS policies
-- =============================================

-- =============================================
-- RLS Policies for Queue Bookings
-- =============================================

-- Customer: View own bookings
CREATE POLICY "customer_view_own_queue" ON queue_bookings
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_admin(auth.uid())
  );

-- Customer: Create bookings
CREATE POLICY "customer_create_queue" ON queue_bookings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Customer: Update own pending bookings (for cancellation)
CREATE POLICY "customer_update_own_pending_queue" ON queue_bookings
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND status IN ('pending', 'confirmed')
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND status IN ('pending', 'confirmed', 'cancelled')
  );

-- Provider: View pending bookings
CREATE POLICY "provider_view_pending_queue" ON queue_bookings
  FOR SELECT
  USING (
    (status = 'pending' AND get_provider_id(auth.uid()) IS NOT NULL)
    OR (provider_id = get_provider_id(auth.uid()))
    OR is_admin(auth.uid())
  );

-- Provider: Update assigned bookings
CREATE POLICY "provider_update_assigned_queue" ON queue_bookings
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
CREATE POLICY "admin_full_access_queue" ON queue_bookings
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- =============================================
-- RLS Policies for Moving Requests
-- =============================================

-- Customer: View own requests
CREATE POLICY "customer_view_own_moving" ON moving_requests
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_admin(auth.uid())
  );

-- Customer: Create requests
CREATE POLICY "customer_create_moving" ON moving_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Customer: Update own pending requests
CREATE POLICY "customer_update_own_pending_moving" ON moving_requests
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND status IN ('pending', 'matched')
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND status IN ('pending', 'matched', 'cancelled')
  );

-- Provider: View pending requests
CREATE POLICY "provider_view_pending_moving" ON moving_requests
  FOR SELECT
  USING (
    (status = 'pending' AND get_provider_id(auth.uid()) IS NOT NULL)
    OR (provider_id = get_provider_id(auth.uid()))
    OR is_admin(auth.uid())
  );

-- Provider: Update assigned requests
CREATE POLICY "provider_update_assigned_moving" ON moving_requests
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
CREATE POLICY "admin_full_access_moving" ON moving_requests
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- =============================================
-- RLS Policies for Laundry Requests
-- =============================================

-- Customer: View own requests
CREATE POLICY "customer_view_own_laundry" ON laundry_requests
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_admin(auth.uid())
  );

-- Customer: Create requests
CREATE POLICY "customer_create_laundry" ON laundry_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Customer: Update own pending requests
CREATE POLICY "customer_update_own_pending_laundry" ON laundry_requests
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND status IN ('pending', 'matched')
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND status IN ('pending', 'matched', 'cancelled')
  );

-- Provider: View pending requests
CREATE POLICY "provider_view_pending_laundry" ON laundry_requests
  FOR SELECT
  USING (
    (status = 'pending' AND get_provider_id(auth.uid()) IS NOT NULL)
    OR (provider_id = get_provider_id(auth.uid()))
    OR is_admin(auth.uid())
  );

-- Provider: Update assigned requests
CREATE POLICY "provider_update_assigned_laundry" ON laundry_requests
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
CREATE POLICY "admin_full_access_laundry" ON laundry_requests
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- =============================================
-- Performance Indexes
-- =============================================

CREATE INDEX IF NOT EXISTS idx_queue_bookings_status_created 
  ON queue_bookings(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_queue_bookings_provider_status 
  ON queue_bookings(provider_id, status) 
  WHERE provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_moving_requests_status_created 
  ON moving_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moving_requests_provider_status 
  ON moving_requests(provider_id, status) 
  WHERE provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_laundry_requests_status_created 
  ON laundry_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_laundry_requests_provider_status 
  ON laundry_requests(provider_id, status) 
  WHERE provider_id IS NOT NULL;

-- =============================================
-- Comments
-- =============================================

COMMENT ON POLICY "customer_view_own_queue" ON queue_bookings IS 
  'Customers can view their own queue bookings';
COMMENT ON POLICY "provider_view_pending_queue" ON queue_bookings IS 
  'Providers can view pending bookings and their assigned bookings';
COMMENT ON POLICY "admin_full_access_queue" ON queue_bookings IS 
  'Admins have full access to all queue bookings';

COMMENT ON POLICY "customer_view_own_moving" ON moving_requests IS 
  'Customers can view their own moving requests';
COMMENT ON POLICY "provider_view_pending_moving" ON moving_requests IS 
  'Providers can view pending requests and their assigned requests';
COMMENT ON POLICY "admin_full_access_moving" ON moving_requests IS 
  'Admins have full access to all moving requests';

COMMENT ON POLICY "customer_view_own_laundry" ON laundry_requests IS 
  'Customers can view their own laundry requests';
COMMENT ON POLICY "provider_view_pending_laundry" ON laundry_requests IS 
  'Providers can view pending requests and their assigned requests';
COMMENT ON POLICY "admin_full_access_laundry" ON laundry_requests IS 
  'Admins have full access to all laundry requests';
