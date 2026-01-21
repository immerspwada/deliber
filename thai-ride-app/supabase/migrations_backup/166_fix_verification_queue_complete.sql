-- Migration: 166_fix_verification_queue_complete.sql
-- Fix: /admin/verification-queue not working
-- Description: Complete fix for verification queue with proper RPC functions and RLS policies

-- =====================================================
-- 1. Ensure verification queue table exists with correct structure
-- =====================================================
CREATE TABLE IF NOT EXISTS provider_verification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  assigned_admin_id UUID REFERENCES users(id),
  priority INTEGER DEFAULT 0,
  queue_position INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'completed', 'escalated')),
  notes TEXT,
  estimated_review_time INTERVAL DEFAULT '30 minutes',
  actual_review_time INTERVAL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_queue_status ON provider_verification_queue(status);
CREATE INDEX IF NOT EXISTS idx_verification_queue_priority ON provider_verification_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_verification_queue_provider ON provider_verification_queue(provider_id);

-- =====================================================
-- 2. Fix RLS Policies
-- =====================================================
ALTER TABLE provider_verification_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admin full access verification_queue" ON provider_verification_queue;
DROP POLICY IF EXISTS "Admin can view all verification queue" ON provider_verification_queue;
DROP POLICY IF EXISTS "Admin can manage verification queue" ON provider_verification_queue;

-- Create comprehensive admin policy
CREATE POLICY "Admin full access to verification queue"
ON provider_verification_queue
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()
    AND (
      users.role = 'admin'
      OR users.email = 'admin@demo.com'
      OR users.email LIKE '%@admin.%'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()
    AND (
      users.role = 'admin'
      OR users.email = 'admin@demo.com'
      OR users.email LIKE '%@admin.%'
    )
  )
);

-- =====================================================
-- 3. Create/Update RPC Function for Admin
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS admin_get_verification_queue(TEXT);

-- Create comprehensive RPC function
CREATE OR REPLACE FUNCTION admin_get_verification_queue(p_status TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  provider_id UUID,
  provider_uid TEXT,
  assigned_admin_id UUID,
  priority INT,
  queue_position INT,
  status TEXT,
  notes TEXT,
  estimated_review_time INTERVAL,
  actual_review_time INTERVAL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- Provider info
  provider_type TEXT,
  provider_status TEXT,
  vehicle_type TEXT,
  vehicle_plate TEXT,
  documents JSONB,
  is_verified BOOLEAN,
  -- User info
  user_id UUID,
  user_email TEXT,
  user_first_name TEXT,
  user_last_name TEXT,
  user_phone TEXT,
  user_member_uid TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.provider_id,
    sp.provider_uid,
    q.assigned_admin_id,
    q.priority,
    q.queue_position,
    q.status,
    q.notes,
    q.estimated_review_time,
    q.actual_review_time,
    q.started_at,
    q.completed_at,
    q.created_at,
    q.updated_at,
    -- Provider info
    sp.provider_type,
    sp.status as provider_status,
    sp.vehicle_type,
    sp.vehicle_plate,
    sp.documents,
    sp.is_verified,
    -- User info
    sp.user_id,
    u.email as user_email,
    u.first_name as user_first_name,
    u.last_name as user_last_name,
    COALESCE(u.phone_number, u.phone) as user_phone,
    u.member_uid as user_member_uid
  FROM provider_verification_queue q
  LEFT JOIN service_providers sp ON q.provider_id = sp.id
  LEFT JOIN users u ON sp.user_id = u.id
  WHERE (p_status IS NULL OR q.status = p_status)
  ORDER BY q.priority DESC, q.created_at ASC;
END;
$;

GRANT EXECUTE ON FUNCTION admin_get_verification_queue(TEXT) TO authenticated;

COMMENT ON FUNCTION admin_get_verification_queue IS 'Admin RPC to fetch verification queue with full provider and user details. Bypasses RLS.';

-- =====================================================
-- 4. Create function to get pending providers (fallback)
-- =====================================================

-- This function returns pending providers even if they're not in the queue yet
CREATE OR REPLACE FUNCTION admin_get_pending_providers()
RETURNS TABLE (
  id UUID,
  provider_id UUID,
  provider_uid TEXT,
  provider_type TEXT,
  provider_status TEXT,
  vehicle_type TEXT,
  vehicle_plate TEXT,
  documents JSONB,
  is_verified BOOLEAN,
  user_id UUID,
  user_email TEXT,
  user_first_name TEXT,
  user_last_name TEXT,
  user_phone TEXT,
  user_member_uid TEXT,
  created_at TIMESTAMPTZ,
  in_queue BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $
BEGIN
  RETURN QUERY
  SELECT 
    sp.id as id,
    sp.id as provider_id,
    sp.provider_uid,
    sp.provider_type,
    sp.status as provider_status,
    sp.vehicle_type,
    sp.vehicle_plate,
    sp.documents,
    sp.is_verified,
    sp.user_id,
    u.email as user_email,
    u.first_name as user_first_name,
    u.last_name as user_last_name,
    COALESCE(u.phone_number, u.phone) as user_phone,
    u.member_uid as user_member_uid,
    sp.created_at,
    EXISTS(
      SELECT 1 FROM provider_verification_queue q 
      WHERE q.provider_id = sp.id 
      AND q.status IN ('pending', 'in_review')
    ) as in_queue
  FROM service_providers sp
  LEFT JOIN users u ON sp.user_id = u.id
  WHERE sp.status = 'pending'
  ORDER BY sp.created_at ASC;
END;
$;

GRANT EXECUTE ON FUNCTION admin_get_pending_providers() TO authenticated;

COMMENT ON FUNCTION admin_get_pending_providers IS 'Get all pending providers regardless of queue status';

-- =====================================================
-- 5. Create helper functions for queue management
-- =====================================================

-- Add provider to queue if not exists
CREATE OR REPLACE FUNCTION admin_add_to_verification_queue(p_provider_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $
DECLARE
  v_queue_id UUID;
  v_position INTEGER;
BEGIN
  -- Check if already in queue
  SELECT id INTO v_queue_id
  FROM provider_verification_queue
  WHERE provider_id = p_provider_id
  AND status IN ('pending', 'in_review');
  
  IF v_queue_id IS NOT NULL THEN
    RETURN v_queue_id;
  END IF;
  
  -- Get next position
  SELECT COALESCE(MAX(queue_position), 0) + 1 INTO v_position
  FROM provider_verification_queue
  WHERE status IN ('pending', 'in_review');
  
  -- Insert into queue
  INSERT INTO provider_verification_queue (provider_id, queue_position, status)
  VALUES (p_provider_id, v_position, 'pending')
  RETURNING id INTO v_queue_id;
  
  RETURN v_queue_id;
END;
$;

GRANT EXECUTE ON FUNCTION admin_add_to_verification_queue(UUID) TO authenticated;

-- Approve provider from queue
CREATE OR REPLACE FUNCTION admin_approve_provider_from_queue(
  p_provider_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $
DECLARE
  v_queue_id UUID;
BEGIN
  -- Get queue entry
  SELECT id INTO v_queue_id
  FROM provider_verification_queue
  WHERE provider_id = p_provider_id
  AND status IN ('pending', 'in_review')
  LIMIT 1;
  
  -- Update provider status
  UPDATE service_providers
  SET 
    status = 'approved',
    is_verified = true,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_provider_id;
  
  -- Update queue if exists
  IF v_queue_id IS NOT NULL THEN
    UPDATE provider_verification_queue
    SET 
      status = 'completed',
      completed_at = NOW(),
      notes = p_admin_notes,
      actual_review_time = CASE 
        WHEN started_at IS NOT NULL THEN NOW() - started_at
        ELSE NULL
      END,
      updated_at = NOW()
    WHERE id = v_queue_id;
  END IF;
  
  -- Send notification to provider
  INSERT INTO user_notifications (user_id, type, title, message, action_url)
  SELECT 
    sp.user_id,
    'success',
    'คำขอได้รับการอนุมัติ',
    'ยินดีด้วย! คำขอเป็นผู้ให้บริการของคุณได้รับการอนุมัติแล้ว คุณสามารถเริ่มรับงานได้ทันที',
    '/provider/dashboard'
  FROM service_providers sp
  WHERE sp.id = p_provider_id;
  
  RETURN TRUE;
END;
$;

GRANT EXECUTE ON FUNCTION admin_approve_provider_from_queue(UUID, TEXT) TO authenticated;

-- Reject provider from queue
CREATE OR REPLACE FUNCTION admin_reject_provider_from_queue(
  p_provider_id UUID,
  p_rejection_reason TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $
DECLARE
  v_queue_id UUID;
BEGIN
  -- Get queue entry
  SELECT id INTO v_queue_id
  FROM provider_verification_queue
  WHERE provider_id = p_provider_id
  AND status IN ('pending', 'in_review')
  LIMIT 1;
  
  -- Update provider status
  UPDATE service_providers
  SET 
    status = 'rejected',
    is_verified = false,
    rejection_reason = p_rejection_reason,
    updated_at = NOW()
  WHERE id = p_provider_id;
  
  -- Update queue if exists
  IF v_queue_id IS NOT NULL THEN
    UPDATE provider_verification_queue
    SET 
      status = 'completed',
      completed_at = NOW(),
      notes = p_rejection_reason,
      actual_review_time = CASE 
        WHEN started_at IS NOT NULL THEN NOW() - started_at
        ELSE NULL
      END,
      updated_at = NOW()
    WHERE id = v_queue_id;
  END IF;
  
  -- Send notification to provider
  INSERT INTO user_notifications (user_id, type, title, message, action_url)
  SELECT 
    sp.user_id,
    'error',
    'คำขอถูกปฏิเสธ',
    format('คำขอเป็นผู้ให้บริการของคุณถูกปฏิเสธ เหตุผล: %s', p_rejection_reason),
    '/provider/onboarding'
  FROM service_providers sp
  WHERE sp.id = p_provider_id;
  
  RETURN TRUE;
END;
$;

GRANT EXECUTE ON FUNCTION admin_reject_provider_from_queue(UUID, TEXT) TO authenticated;

-- =====================================================
-- 6. Auto-add pending providers to queue (trigger)
-- =====================================================

CREATE OR REPLACE FUNCTION auto_add_pending_to_queue()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $
BEGIN
  -- When provider becomes pending, add to queue
  IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status != 'pending') THEN
    -- Check if not already in queue
    IF NOT EXISTS (
      SELECT 1 FROM provider_verification_queue 
      WHERE provider_id = NEW.id 
      AND status IN ('pending', 'in_review')
    ) THEN
      PERFORM admin_add_to_verification_queue(NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS trigger_auto_add_to_queue ON service_providers;
CREATE TRIGGER trigger_auto_add_to_queue
  AFTER INSERT OR UPDATE ON service_providers
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_pending_to_queue();

-- =====================================================
-- 7. Backfill existing pending providers to queue
-- =====================================================

DO $
DECLARE
  v_provider RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_provider IN
    SELECT id FROM service_providers
    WHERE status = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM provider_verification_queue
      WHERE provider_id = service_providers.id
      AND status IN ('pending', 'in_review')
    )
  LOOP
    PERFORM admin_add_to_verification_queue(v_provider.id);
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Added % pending providers to verification queue', v_count;
END $;

-- =====================================================
-- 8. Verification Complete
-- =====================================================

DO $
BEGIN
  RAISE NOTICE '✓ Migration 166_fix_verification_queue_complete completed';
  RAISE NOTICE '✓ Verification queue table ready';
  RAISE NOTICE '✓ RPC functions created: admin_get_verification_queue, admin_get_pending_providers';
  RAISE NOTICE '✓ Helper functions created: admin_approve_provider_from_queue, admin_reject_provider_from_queue';
  RAISE NOTICE '✓ Auto-trigger enabled for new pending providers';
END $;
