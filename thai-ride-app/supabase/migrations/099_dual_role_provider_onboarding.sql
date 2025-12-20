-- Migration: 099_dual_role_provider_onboarding.sql
-- Feature: F14 - Provider Dashboard (Enhanced for Dual-Role)
-- Description: Allow existing users to become providers with proper onboarding flow

-- ============================================================================
-- 1. ENUM for Provider Onboarding Status
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE provider_onboarding_status AS ENUM (
    'DRAFT',      -- User started but hasn't submitted
    'PENDING',    -- Submitted, waiting for admin approval
    'APPROVED',   -- Approved by admin, can access provider features
    'REJECTED',   -- Rejected by admin, can re-apply
    'SUSPENDED'   -- Temporarily suspended by admin
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. Add Onboarding Columns to service_providers table
-- ============================================================================

-- Add onboarding status column if not exists
ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS onboarding_status provider_onboarding_status DEFAULT 'DRAFT',
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_rejection_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS can_reapply_at TIMESTAMPTZ;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_service_providers_onboarding_status 
ON service_providers(onboarding_status);

CREATE INDEX IF NOT EXISTS idx_service_providers_user_id_status 
ON service_providers(user_id, onboarding_status);

-- ============================================================================
-- 3. Provider Onboarding History Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS provider_onboarding_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Status tracking
  from_status provider_onboarding_status,
  to_status provider_onboarding_status NOT NULL,
  
  -- Admin action
  admin_id UUID REFERENCES users(id),
  admin_notes TEXT,
  rejection_reason TEXT,
  
  -- Metadata
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_history_provider 
ON provider_onboarding_history(provider_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_onboarding_history_user 
ON provider_onboarding_history(user_id, changed_at DESC);

-- ============================================================================
-- 4. Function: Start Provider Onboarding
-- ============================================================================

CREATE OR REPLACE FUNCTION start_provider_onboarding(
  p_user_id UUID,
  p_service_type TEXT DEFAULT 'ride'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider_id UUID;
  v_existing_provider UUID;
BEGIN
  -- Check if user already has a provider profile
  SELECT id INTO v_existing_provider
  FROM service_providers
  WHERE user_id = p_user_id;
  
  IF v_existing_provider IS NOT NULL THEN
    -- Return existing provider ID
    RETURN v_existing_provider;
  END IF;
  
  -- Create new provider profile in DRAFT status
  INSERT INTO service_providers (
    user_id,
    service_type,
    onboarding_status,
    onboarding_started_at,
    status,
    is_available,
    rating,
    total_rides
  ) VALUES (
    p_user_id,
    p_service_type,
    'DRAFT',
    NOW(),
    'inactive',
    false,
    0,
    0
  )
  RETURNING id INTO v_provider_id;
  
  -- Log history
  INSERT INTO provider_onboarding_history (
    provider_id,
    user_id,
    from_status,
    to_status,
    admin_notes
  ) VALUES (
    v_provider_id,
    p_user_id,
    NULL,
    'DRAFT',
    'Provider onboarding started'
  );
  
  RETURN v_provider_id;
END;
$$;

-- ============================================================================
-- 5. Function: Submit Provider Application
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_provider_application(
  p_provider_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status provider_onboarding_status;
BEGIN
  -- Get current status
  SELECT onboarding_status INTO v_current_status
  FROM service_providers
  WHERE id = p_provider_id AND user_id = p_user_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Provider profile not found';
  END IF;
  
  -- Only allow submission from DRAFT or REJECTED status
  IF v_current_status NOT IN ('DRAFT', 'REJECTED') THEN
    RAISE EXCEPTION 'Cannot submit application from current status: %', v_current_status;
  END IF;
  
  -- Update to PENDING
  UPDATE service_providers
  SET 
    onboarding_status = 'PENDING',
    onboarding_submitted_at = NOW()
  WHERE id = p_provider_id AND user_id = p_user_id;
  
  -- Log history
  INSERT INTO provider_onboarding_history (
    provider_id,
    user_id,
    from_status,
    to_status,
    admin_notes
  ) VALUES (
    p_provider_id,
    p_user_id,
    v_current_status,
    'PENDING',
    'Application submitted for review'
  );
  
  -- Notify admins (trigger will handle this)
  INSERT INTO user_notifications (
    user_id,
    title,
    message,
    type,
    data
  )
  SELECT 
    id,
    'New Provider Application',
    'A new provider application is waiting for review',
    'admin_alert',
    jsonb_build_object('provider_id', p_provider_id)
  FROM users
  WHERE role = 'admin';
  
  RETURN TRUE;
END;
$$;

-- ============================================================================
-- 6. Function: Approve Provider Application (Admin Only)
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_provider_application(
  p_provider_id UUID,
  p_admin_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_current_status provider_onboarding_status;
BEGIN
  -- Verify admin role
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve applications';
  END IF;
  
  -- Get provider info
  SELECT user_id, onboarding_status 
  INTO v_user_id, v_current_status
  FROM service_providers
  WHERE id = p_provider_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Provider not found';
  END IF;
  
  IF v_current_status != 'PENDING' THEN
    RAISE EXCEPTION 'Can only approve PENDING applications';
  END IF;
  
  -- Update to APPROVED
  UPDATE service_providers
  SET 
    onboarding_status = 'APPROVED',
    onboarding_completed_at = NOW(),
    status = 'active',
    verified_at = NOW()
  WHERE id = p_provider_id;
  
  -- Log history
  INSERT INTO provider_onboarding_history (
    provider_id,
    user_id,
    from_status,
    to_status,
    admin_id,
    admin_notes
  ) VALUES (
    p_provider_id,
    v_user_id,
    'PENDING',
    'APPROVED',
    p_admin_id,
    COALESCE(p_admin_notes, 'Application approved')
  );
  
  -- Notify provider
  INSERT INTO user_notifications (
    user_id,
    title,
    message,
    type,
    data
  ) VALUES (
    v_user_id,
    'Application Approved! 🎉',
    'Congratulations! Your provider application has been approved. You can now start accepting jobs.',
    'provider_approved',
    jsonb_build_object('provider_id', p_provider_id)
  );
  
  RETURN TRUE;
END;
$$;

-- ============================================================================
-- 7. Function: Reject Provider Application (Admin Only)
-- ============================================================================

CREATE OR REPLACE FUNCTION reject_provider_application(
  p_provider_id UUID,
  p_admin_id UUID,
  p_rejection_reason TEXT,
  p_reapply_cooldown_hours INTEGER DEFAULT 24
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_current_status provider_onboarding_status;
BEGIN
  -- Verify admin role
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can reject applications';
  END IF;
  
  -- Get provider info
  SELECT user_id, onboarding_status 
  INTO v_user_id, v_current_status
  FROM service_providers
  WHERE id = p_provider_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Provider not found';
  END IF;
  
  IF v_current_status != 'PENDING' THEN
    RAISE EXCEPTION 'Can only reject PENDING applications';
  END IF;
  
  -- Update to REJECTED
  UPDATE service_providers
  SET 
    onboarding_status = 'REJECTED',
    rejection_reason = p_rejection_reason,
    rejection_count = rejection_count + 1,
    last_rejection_at = NOW(),
    can_reapply_at = NOW() + (p_reapply_cooldown_hours || ' hours')::INTERVAL
  WHERE id = p_provider_id;
  
  -- Log history
  INSERT INTO provider_onboarding_history (
    provider_id,
    user_id,
    from_status,
    to_status,
    admin_id,
    rejection_reason
  ) VALUES (
    p_provider_id,
    v_user_id,
    'PENDING',
    'REJECTED',
    p_admin_id,
    p_rejection_reason
  );
  
  -- Notify provider
  INSERT INTO user_notifications (
    user_id,
    title,
    message,
    type,
    data
  ) VALUES (
    v_user_id,
    'Application Update Required',
    'Your provider application needs some updates. Please review the feedback and reapply.',
    'provider_rejected',
    jsonb_build_object(
      'provider_id', p_provider_id,
      'rejection_reason', p_rejection_reason,
      'can_reapply_at', NOW() + (p_reapply_cooldown_hours || ' hours')::INTERVAL
    )
  );
  
  RETURN TRUE;
END;
$$;

-- ============================================================================
-- 8. Function: Get Provider Onboarding Status
-- ============================================================================

CREATE OR REPLACE FUNCTION get_provider_onboarding_status(p_user_id UUID)
RETURNS TABLE (
  has_provider_profile BOOLEAN,
  provider_id UUID,
  onboarding_status provider_onboarding_status,
  can_access_dashboard BOOLEAN,
  rejection_reason TEXT,
  can_reapply BOOLEAN,
  can_reapply_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (sp.id IS NOT NULL) as has_provider_profile,
    sp.id as provider_id,
    sp.onboarding_status,
    (sp.onboarding_status = 'APPROVED') as can_access_dashboard,
    sp.rejection_reason,
    (sp.onboarding_status = 'REJECTED' AND (sp.can_reapply_at IS NULL OR sp.can_reapply_at <= NOW())) as can_reapply,
    sp.can_reapply_at
  FROM service_providers sp
  WHERE sp.user_id = p_user_id
  LIMIT 1;
  
  -- If no provider profile exists, return default values
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      false as has_provider_profile,
      NULL::UUID as provider_id,
      NULL::provider_onboarding_status as onboarding_status,
      false as can_access_dashboard,
      NULL::TEXT as rejection_reason,
      true as can_reapply,
      NULL::TIMESTAMPTZ as can_reapply_at;
  END IF;
END;
$$;

-- ============================================================================
-- 9. RLS Policies
-- ============================================================================

-- Allow users to read their own provider profile
DROP POLICY IF EXISTS "Users can view own provider profile" ON service_providers;
CREATE POLICY "Users can view own provider profile"
ON service_providers FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow users to update their own DRAFT/REJECTED applications
DROP POLICY IF EXISTS "Users can update own draft applications" ON service_providers;
CREATE POLICY "Users can update own draft applications"
ON service_providers FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  AND onboarding_status IN ('DRAFT', 'REJECTED')
)
WITH CHECK (
  user_id = auth.uid() 
  AND onboarding_status IN ('DRAFT', 'REJECTED')
);

-- Admins can view all provider profiles
DROP POLICY IF EXISTS "Admins can view all providers" ON service_providers;
CREATE POLICY "Admins can view all providers"
ON service_providers FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Admins can update any provider
DROP POLICY IF EXISTS "Admins can update providers" ON service_providers;
CREATE POLICY "Admins can update providers"
ON service_providers FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- History table policies
DROP POLICY IF EXISTS "Users can view own onboarding history" ON provider_onboarding_history;
CREATE POLICY "Users can view own onboarding history"
ON provider_onboarding_history FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all onboarding history" ON provider_onboarding_history;
CREATE POLICY "Admins can view all onboarding history"
ON provider_onboarding_history FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================================
-- 10. Update Feature Registry
-- ============================================================================

COMMENT ON TABLE provider_onboarding_history IS 'Feature: F14 - Provider Dashboard (Dual-Role Onboarding)';
COMMENT ON FUNCTION start_provider_onboarding IS 'Feature: F14 - Start provider onboarding for existing user';
COMMENT ON FUNCTION submit_provider_application IS 'Feature: F14 - Submit provider application for review';
COMMENT ON FUNCTION approve_provider_application IS 'Feature: F14 - Admin approves provider application';
COMMENT ON FUNCTION reject_provider_application IS 'Feature: F14 - Admin rejects provider application';
COMMENT ON FUNCTION get_provider_onboarding_status IS 'Feature: F14 - Get user provider onboarding status';
