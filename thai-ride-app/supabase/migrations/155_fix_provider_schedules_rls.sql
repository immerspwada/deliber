-- Migration: 155_fix_provider_schedules_rls.sql
-- Fix: Secure RLS policies for provider schedule tables
-- Issue: Migration 154 had overly permissive policies allowing any user to modify any schedule

-- =====================================================
-- DROP INSECURE POLICIES
-- =====================================================
DROP POLICY IF EXISTS "schedule_slots_all" ON provider_schedule_slots;
DROP POLICY IF EXISTS "schedule_exceptions_all" ON provider_schedule_exceptions;

-- =====================================================
-- provider_schedule_slots - SECURE RLS Policies
-- =====================================================

-- Providers can manage their own schedule slots
CREATE POLICY "provider_own_schedule_slots" ON provider_schedule_slots
  FOR ALL TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

-- Admin can manage all schedule slots
CREATE POLICY "admin_all_schedule_slots" ON provider_schedule_slots
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Authenticated users can view schedules (for availability checking)
CREATE POLICY "authenticated_view_schedule_slots" ON provider_schedule_slots
  FOR SELECT TO authenticated
  USING (true);

-- =====================================================
-- provider_schedule_exceptions - SECURE RLS Policies
-- =====================================================

-- Providers can manage their own exceptions
CREATE POLICY "provider_own_schedule_exceptions" ON provider_schedule_exceptions
  FOR ALL TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

-- Admin can manage all exceptions
CREATE POLICY "admin_all_schedule_exceptions" ON provider_schedule_exceptions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Authenticated users can view exceptions (for availability checking)
CREATE POLICY "authenticated_view_schedule_exceptions" ON provider_schedule_exceptions
  FOR SELECT TO authenticated
  USING (true);

-- =====================================================
-- REVOKE ANONYMOUS ACCESS (Security hardening)
-- =====================================================
REVOKE ALL ON provider_schedule_slots FROM anon;
REVOKE ALL ON provider_schedule_exceptions FROM anon;

-- Grant only to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_schedule_slots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_schedule_exceptions TO authenticated;

-- =====================================================
-- Add Foreign Key Constraints (if not exists)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_schedule_slots_provider'
  ) THEN
    ALTER TABLE provider_schedule_slots 
    ADD CONSTRAINT fk_schedule_slots_provider 
    FOREIGN KEY (provider_id) REFERENCES service_providers(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_schedule_exceptions_provider'
  ) THEN
    ALTER TABLE provider_schedule_exceptions 
    ADD CONSTRAINT fk_schedule_exceptions_provider 
    FOREIGN KEY (provider_id) REFERENCES service_providers(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMENT ON POLICY "provider_own_schedule_slots" ON provider_schedule_slots IS 
  'Providers can only manage their own schedule slots';
COMMENT ON POLICY "admin_all_schedule_slots" ON provider_schedule_slots IS 
  'Admins have full access to all schedule slots';
COMMENT ON POLICY "provider_own_schedule_exceptions" ON provider_schedule_exceptions IS 
  'Providers can only manage their own schedule exceptions';
COMMENT ON POLICY "admin_all_schedule_exceptions" ON provider_schedule_exceptions IS 
  'Admins have full access to all schedule exceptions';
