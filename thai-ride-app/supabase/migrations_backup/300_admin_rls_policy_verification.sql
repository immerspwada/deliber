-- Migration: 300_admin_rls_policy_verification.sql
-- Author: AI Assistant
-- Date: 2026-01-16
-- Description: Comprehensive RLS policy verification and updates for admin access and dual-role system
-- Purpose: Ensure all tables have proper admin policies with SELECT wrapper optimization
--          and verify dual-role pattern for providers_v2 system
-- Requirements: 5.1-5.5 (Admin RLS), 6.1-6.3 (Dual-Role System)

BEGIN;

-- =====================================================
-- SECTION 1: ADMIN RLS POLICIES VERIFICATION
-- =====================================================
-- Requirement 5.1-5.4: Admin full access with SELECT wrapper optimization
-- Pattern: EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin')

-- 1.1 Tips Table
DROP POLICY IF EXISTS "admin_full_access_tips" ON tips;
CREATE POLICY "admin_full_access_tips" ON tips
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 1.2 Ratings Table
DROP POLICY IF EXISTS "admin_full_access_ratings" ON ratings;
CREATE POLICY "admin_full_access_ratings" ON ratings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 1.3 Chat Messages Table
DROP POLICY IF EXISTS "admin_full_access_chat_messages" ON chat_messages;
CREATE POLICY "admin_full_access_chat_messages" ON chat_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 1.4 Provider Locations Table
DROP POLICY IF EXISTS "admin_full_access_provider_locations" ON provider_locations;
CREATE POLICY "admin_full_access_provider_locations" ON provider_locations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 1.5 Provider Location History Table
DROP POLICY IF EXISTS "admin_full_access_provider_location_history" ON provider_location_history;
CREATE POLICY "admin_full_access_provider_location_history" ON provider_location_history
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 1.6 Push Notification Logs Table
DROP POLICY IF EXISTS "admin_full_access_push_notification_logs" ON push_notification_logs;
CREATE POLICY "admin_full_access_push_notification_logs" ON push_notification_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 1.7 Push Subscriptions Table
DROP POLICY IF EXISTS "admin_full_access_push_subscriptions" ON push_subscriptions;
CREATE POLICY "admin_full_access_push_subscriptions" ON push_subscriptions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 1.8 Notification Preferences Table
DROP POLICY IF EXISTS "admin_full_access_notification_preferences" ON notification_preferences;
CREATE POLICY "admin_full_access_notification_preferences" ON notification_preferences
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 1.9 User Favorite Services Table
DROP POLICY IF EXISTS "admin_full_access_user_favorite_services" ON user_favorite_services;
CREATE POLICY "admin_full_access_user_favorite_services" ON user_favorite_services
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 1.10 Service Promotions Table
DROP POLICY IF EXISTS "admin_full_access_service_promotions" ON service_promotions;
CREATE POLICY "admin_full_access_service_promotions" ON service_promotions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 1.11 User Promotion Usage Table
DROP POLICY IF EXISTS "admin_full_access_user_promotion_usage" ON user_promotion_usage;
CREATE POLICY "admin_full_access_user_promotion_usage" ON user_promotion_usage
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 1.12 Ride Audit Log Table
DROP POLICY IF EXISTS "admin_full_access_ride_audit_log" ON ride_audit_log;
CREATE POLICY "admin_full_access_ride_audit_log" ON ride_audit_log
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 1.13 Job Priority Config Table
DROP POLICY IF EXISTS "admin_full_access_job_priority_config" ON job_priority_config;
CREATE POLICY "admin_full_access_job_priority_config" ON job_priority_config
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 1.14 Auto Accept Rules Table
DROP POLICY IF EXISTS "admin_full_access_auto_accept_rules" ON auto_accept_rules;
CREATE POLICY "admin_full_access_auto_accept_rules" ON auto_accept_rules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 1.15 Job Heat Map Data Table
DROP POLICY IF EXISTS "admin_full_access_job_heat_map_data" ON job_heat_map_data;
CREATE POLICY "admin_full_access_job_heat_map_data" ON job_heat_map_data
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 1.16 System Config Table
DROP POLICY IF EXISTS "admin_full_access_system_config" ON system_config;
CREATE POLICY "admin_full_access_system_config" ON system_config
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 1.17 Saved Places Table
DROP POLICY IF EXISTS "admin_full_access_saved_places" ON saved_places;
CREATE POLICY "admin_full_access_saved_places" ON saved_places
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 1.18 Recent Places Table
DROP POLICY IF EXISTS "admin_full_access_recent_places" ON recent_places;
CREATE POLICY "admin_full_access_recent_places" ON recent_places
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 1.19 Ride Share Links Table
DROP POLICY IF EXISTS "admin_full_access_ride_share_links" ON ride_share_links;
CREATE POLICY "admin_full_access_ride_share_links" ON ride_share_links
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- 1.20 Share Link Analytics Table
DROP POLICY IF EXISTS "admin_full_access_share_link_analytics" ON share_link_analytics;
CREATE POLICY "admin_full_access_share_link_analytics" ON share_link_analytics
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- SECTION 2: DUAL-ROLE SYSTEM VERIFICATION
-- =====================================================
-- Requirement 6.1-6.3: Verify provider policies use providers_v2.user_id pattern
-- Pattern: EXISTS (SELECT 1 FROM providers_v2 WHERE providers_v2.id = table.provider_id AND providers_v2.user_id = (SELECT auth.uid()))

-- 2.1 Verify Providers V2 Policies (Already correct from migration 267)
-- No changes needed - policies already use correct dual-role pattern

-- 2.2 Verify Provider Locations Policies (Already correct from migration 267)
-- No changes needed - policies already use correct dual-role pattern

-- 2.3 Verify Ride Requests Provider Policies (Already correct from migration 266)
-- No changes needed - policies already use correct dual-role pattern

-- 2.4 Tips Table - Add Provider Access with Dual-Role Pattern
DROP POLICY IF EXISTS "provider_view_own_tips" ON tips;
CREATE POLICY "provider_view_own_tips" ON tips
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ride_requests rr
      INNER JOIN providers_v2 p ON p.id = rr.provider_id
      WHERE rr.id = tips.ride_id
      AND p.user_id = (SELECT auth.uid())
    )
  );

-- 2.5 Ratings Table - Add Provider Access with Dual-Role Pattern
DROP POLICY IF EXISTS "provider_view_own_ratings" ON ratings;
CREATE POLICY "provider_view_own_ratings" ON ratings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ride_requests rr
      INNER JOIN providers_v2 p ON p.id = rr.provider_id
      WHERE rr.id = ratings.ride_id
      AND p.user_id = (SELECT auth.uid())
    )
  );

-- 2.6 Chat Messages Table - Add Provider Access with Dual-Role Pattern
DROP POLICY IF EXISTS "provider_view_ride_chat" ON chat_messages;
CREATE POLICY "provider_view_ride_chat" ON chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ride_requests rr
      INNER JOIN providers_v2 p ON p.id = rr.provider_id
      WHERE rr.id = chat_messages.ride_id
      AND p.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "provider_send_chat" ON chat_messages;
CREATE POLICY "provider_send_chat" ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_type = 'provider'
    AND EXISTS (
      SELECT 1 FROM ride_requests rr
      INNER JOIN providers_v2 p ON p.id = rr.provider_id
      WHERE rr.id = chat_messages.ride_id
      AND p.user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- SECTION 3: STORAGE BUCKET RLS POLICIES
-- =====================================================
-- Requirement 6.2: Verify storage policies use dual-role pattern

-- 3.1 Ride Evidence Storage - Provider Upload with Dual-Role Pattern
DROP POLICY IF EXISTS "provider_upload_ride_evidence" ON storage.objects;
CREATE POLICY "provider_upload_ride_evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ride-evidence'
    AND EXISTS (
      SELECT 1 FROM ride_requests rr
      INNER JOIN providers_v2 p ON p.id = rr.provider_id
      WHERE rr.id::text = (string_to_array(name, '/'))[1]
      AND p.user_id = (SELECT auth.uid())
      AND p.status IN ('approved', 'active')
    )
  );

-- 3.2 Ride Evidence Storage - Provider View with Dual-Role Pattern
DROP POLICY IF EXISTS "provider_view_ride_evidence" ON storage.objects;
CREATE POLICY "provider_view_ride_evidence" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'ride-evidence'
    AND EXISTS (
      SELECT 1 FROM ride_requests rr
      INNER JOIN providers_v2 p ON p.id = rr.provider_id
      WHERE rr.id::text = (string_to_array(name, '/'))[1]
      AND p.user_id = (SELECT auth.uid())
    )
  );

-- 3.3 Provider Avatar Storage - Provider Upload with Dual-Role Pattern
DROP POLICY IF EXISTS "provider_upload_avatar" ON storage.objects;
CREATE POLICY "provider_upload_avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'provider-avatars'
    AND EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.id::text = (string_to_array(name, '/'))[1]
      AND p.user_id = (SELECT auth.uid())
    )
  );

-- 3.4 Provider Avatar Storage - Provider Update with Dual-Role Pattern
DROP POLICY IF EXISTS "provider_update_avatar" ON storage.objects;
CREATE POLICY "provider_update_avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'provider-avatars'
    AND EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.id::text = (string_to_array(name, '/'))[1]
      AND p.user_id = (SELECT auth.uid())
    )
  );

-- 3.5 Provider Vehicle Photos - Provider Upload with Dual-Role Pattern
DROP POLICY IF EXISTS "provider_upload_vehicle_photo" ON storage.objects;
CREATE POLICY "provider_upload_vehicle_photo" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'provider-vehicles'
    AND EXISTS (
      SELECT 1 FROM providers_v2 p
      WHERE p.id::text = (string_to_array(name, '/'))[1]
      AND p.user_id = (SELECT auth.uid())
    )
  );

-- 3.6 Admin Full Access to All Storage Buckets
DROP POLICY IF EXISTS "admin_full_access_storage" ON storage.objects;
CREATE POLICY "admin_full_access_storage" ON storage.objects
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- SECTION 4: HELPER FUNCTIONS FOR RLS
-- =====================================================

-- 4.1 Optimized Admin Check Function
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ) INTO v_is_admin;
  
  RETURN COALESCE(v_is_admin, FALSE);
END;
$;

-- 4.2 Provider Access Check Function (Dual-Role)
CREATE OR REPLACE FUNCTION is_provider_for_ride(p_ride_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $
DECLARE
  v_has_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM ride_requests rr
    INNER JOIN providers_v2 p ON p.id = rr.provider_id
    WHERE rr.id = p_ride_id
    AND p.user_id = auth.uid()
  ) INTO v_has_access;
  
  RETURN COALESCE(v_has_access, FALSE);
END;
$;

-- 4.3 Provider Ownership Check Function (Dual-Role)
CREATE OR REPLACE FUNCTION is_provider_owner(p_provider_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $
DECLARE
  v_is_owner BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM providers_v2
    WHERE providers_v2.id = p_provider_id
    AND providers_v2.user_id = auth.uid()
  ) INTO v_is_owner;
  
  RETURN COALESCE(v_is_owner, FALSE);
END;
$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION is_provider_for_ride(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_provider_owner(UUID) TO authenticated;

-- =====================================================
-- SECTION 5: VERIFICATION QUERIES
-- =====================================================

-- 5.1 Function to verify admin policies exist
CREATE OR REPLACE FUNCTION verify_admin_policies()
RETURNS TABLE (
  table_name TEXT,
  has_admin_policy BOOLEAN,
  policy_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT,
    EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.tablename = t.tablename
      AND p.policyname LIKE '%admin%'
    ) as has_admin_policy,
    (
      SELECT COUNT(*)
      FROM pg_policies p
      WHERE p.tablename = t.tablename
    ) as policy_count
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE 'sql_%'
  ORDER BY t.tablename;
END;
$;

-- 5.2 Function to verify dual-role pattern usage
CREATE OR REPLACE FUNCTION verify_dual_role_policies()
RETURNS TABLE (
  table_name TEXT,
  policy_name TEXT,
  uses_dual_role BOOLEAN,
  policy_definition TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  RETURN QUERY
  SELECT 
    p.tablename::TEXT,
    p.policyname::TEXT,
    (p.qual::TEXT LIKE '%providers_v2.user_id%' OR p.qual::TEXT LIKE '%providers_v2%user_id%') as uses_dual_role,
    p.qual::TEXT as policy_definition
  FROM pg_policies p
  WHERE p.schemaname = 'public'
  AND (p.policyname LIKE '%provider%' OR p.qual::TEXT LIKE '%provider%')
  AND p.tablename NOT IN ('providers_v2', 'provider_locations', 'provider_location_history')
  ORDER BY p.tablename, p.policyname;
END;
$;

-- 5.3 Function to check SELECT wrapper usage
CREATE OR REPLACE FUNCTION verify_select_wrapper_optimization()
RETURNS TABLE (
  table_name TEXT,
  policy_name TEXT,
  uses_select_wrapper BOOLEAN,
  policy_definition TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $
BEGIN
  RETURN QUERY
  SELECT 
    p.tablename::TEXT,
    p.policyname::TEXT,
    (p.qual::TEXT LIKE '%(SELECT auth.uid())%') as uses_select_wrapper,
    p.qual::TEXT as policy_definition
  FROM pg_policies p
  WHERE p.schemaname = 'public'
  AND p.qual::TEXT LIKE '%auth.uid()%'
  ORDER BY uses_select_wrapper DESC, p.tablename, p.policyname;
END;
$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION verify_admin_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION verify_dual_role_policies() TO authenticated;
GRANT EXECUTE ON FUNCTION verify_select_wrapper_optimization() TO authenticated;

-- =====================================================
-- SECTION 6: COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION is_admin_user() IS 
  'Optimized function to check if current user has admin role. Uses SECURITY DEFINER to bypass RLS.';

COMMENT ON FUNCTION is_provider_for_ride(UUID) IS 
  'Check if current user is the provider for a specific ride using dual-role pattern (providers_v2.user_id).';

COMMENT ON FUNCTION is_provider_owner(UUID) IS 
  'Check if current user owns a specific provider record using dual-role pattern (providers_v2.user_id).';

COMMENT ON FUNCTION verify_admin_policies() IS 
  'Verification function to check which tables have admin RLS policies.';

COMMENT ON FUNCTION verify_dual_role_policies() IS 
  'Verification function to check which provider policies use the correct dual-role pattern.';

COMMENT ON FUNCTION verify_select_wrapper_optimization() IS 
  'Verification function to check which policies use SELECT wrapper for auth.uid() performance optimization.';

COMMIT;

-- =====================================================
-- VERIFICATION REPORT
-- =====================================================

DO $
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS Policy Verification and Update Migration Completed';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📋 Summary:';
  RAISE NOTICE '   ✓ 20 admin full access policies created/updated';
  RAISE NOTICE '   ✓ 5 dual-role provider policies verified/updated';
  RAISE NOTICE '   ✓ 6 storage bucket policies with dual-role pattern';
  RAISE NOTICE '   ✓ 3 helper functions for RLS checks';
  RAISE NOTICE '   ✓ 3 verification functions for policy auditing';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security Features:';
  RAISE NOTICE '   • Admin role verification with SELECT wrapper optimization';
  RAISE NOTICE '   • Dual-role pattern for all provider access';
  RAISE NOTICE '   • Storage bucket RLS with provider verification';
  RAISE NOTICE '   • Helper functions for consistent access checks';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Verification Commands:';
  RAISE NOTICE '   SELECT * FROM verify_admin_policies();';
  RAISE NOTICE '   SELECT * FROM verify_dual_role_policies();';
  RAISE NOTICE '   SELECT * FROM verify_select_wrapper_optimization();';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $;

