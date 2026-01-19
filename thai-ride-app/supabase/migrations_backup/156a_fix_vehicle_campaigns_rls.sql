-- Migration: 156_fix_vehicle_campaigns_rls.sql
-- Fix: Secure RLS policies for vehicle_types, provider_vehicles, promo_campaigns, customer_segments
-- Issue: Migration 155 used overly permissive policies (USING true)

-- =====================================================
-- 1. DROP INSECURE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "vehicle_types_all" ON vehicle_types;
DROP POLICY IF EXISTS "vehicles_all" ON provider_vehicles;
DROP POLICY IF EXISTS "campaigns_all" ON promo_campaigns;
DROP POLICY IF EXISTS "segments_all" ON customer_segments;
DROP POLICY IF EXISTS "segment_members_all" ON customer_segment_members;

-- =====================================================
-- 2. VEHICLE_TYPES - Read-only for all, Admin manages
-- =====================================================
-- Everyone can read active vehicle types (for fare display)
CREATE POLICY "vehicle_types_select_all" ON vehicle_types
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Admin can manage all vehicle types
CREATE POLICY "vehicle_types_admin_all" ON vehicle_types
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 3. PROVIDER_VEHICLES - Providers own, Admin manages
-- =====================================================
-- Providers can view/manage their own vehicles
CREATE POLICY "provider_vehicles_own" ON provider_vehicles
  FOR ALL TO authenticated
  USING (
    provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    provider_id IN (SELECT id FROM service_providers WHERE user_id = auth.uid())
  );

-- Admin can view/manage all vehicles
CREATE POLICY "provider_vehicles_admin" ON provider_vehicles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Customers can view verified vehicles (for driver info display)
CREATE POLICY "provider_vehicles_customer_view" ON provider_vehicles
  FOR SELECT TO authenticated
  USING (is_verified = true AND is_active = true);

-- =====================================================
-- 4. PROMO_CAMPAIGNS - Admin only management
-- =====================================================
-- Everyone can view active campaigns (for promo display)
CREATE POLICY "promo_campaigns_select_active" ON promo_campaigns
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

-- Admin can manage all campaigns
CREATE POLICY "promo_campaigns_admin_all" ON promo_campaigns
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 5. CUSTOMER_SEGMENTS - Admin only
-- =====================================================
-- Admin can manage all segments
CREATE POLICY "customer_segments_admin_all" ON customer_segments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 6. CUSTOMER_SEGMENT_MEMBERS - Admin only
-- =====================================================
-- Admin can manage segment members
CREATE POLICY "customer_segment_members_admin_all" ON customer_segment_members
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Users can see if they're in a segment (for targeted promos)
CREATE POLICY "customer_segment_members_own" ON customer_segment_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- 7. REVOKE EXCESSIVE GRANTS & RE-GRANT PROPERLY
-- =====================================================
REVOKE ALL ON vehicle_types FROM anon;
REVOKE ALL ON provider_vehicles FROM anon;
REVOKE ALL ON promo_campaigns FROM anon;
REVOKE ALL ON customer_segments FROM anon;
REVOKE ALL ON customer_segment_members FROM anon;

-- Grant SELECT only to anon where needed
GRANT SELECT ON vehicle_types TO anon;
GRANT SELECT ON promo_campaigns TO anon;

-- Grant full access to authenticated (RLS will filter)
GRANT SELECT, INSERT, UPDATE, DELETE ON vehicle_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_vehicles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON promo_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON customer_segments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON customer_segment_members TO authenticated;

-- =====================================================
-- 8. ADD MISSING FOREIGN KEY CONSTRAINT
-- =====================================================
-- provider_vehicles.provider_id should reference service_providers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'provider_vehicles_provider_id_fkey'
  ) THEN
    ALTER TABLE provider_vehicles 
    ADD CONSTRAINT provider_vehicles_provider_id_fkey 
    FOREIGN KEY (provider_id) REFERENCES service_providers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- customer_segment_members.user_id should reference users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'customer_segment_members_user_id_fkey'
  ) THEN
    ALTER TABLE customer_segment_members 
    ADD CONSTRAINT customer_segment_members_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON POLICY "vehicle_types_select_all" ON vehicle_types IS 'Everyone can view active vehicle types for fare calculation';
COMMENT ON POLICY "vehicle_types_admin_all" ON vehicle_types IS 'Admin can manage vehicle types and pricing';
COMMENT ON POLICY "provider_vehicles_own" ON provider_vehicles IS 'Providers can manage their own vehicles';
COMMENT ON POLICY "provider_vehicles_admin" ON provider_vehicles IS 'Admin can manage all provider vehicles';
COMMENT ON POLICY "promo_campaigns_select_active" ON promo_campaigns IS 'Everyone can view active campaigns';
COMMENT ON POLICY "promo_campaigns_admin_all" ON promo_campaigns IS 'Admin can manage all campaigns';
COMMENT ON POLICY "customer_segments_admin_all" ON customer_segments IS 'Admin only - customer segmentation';
COMMENT ON POLICY "customer_segment_members_admin_all" ON customer_segment_members IS 'Admin only - segment membership';
COMMENT ON POLICY "customer_segment_members_own" ON customer_segment_members IS 'Users can see their own segment membership';
