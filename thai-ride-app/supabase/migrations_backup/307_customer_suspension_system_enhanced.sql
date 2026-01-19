-- Enhanced Customer Suspension System
-- =====================================
-- Migration 307: Complete suspension system with RLS and audit trail

BEGIN;

-- 1. Add suspension columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES public.profiles(id);

-- 2. Create index for status queries
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended_by ON public.profiles(suspended_by);

-- 3. Function to suspend a customer (Admin only)
CREATE OR REPLACE FUNCTION public.suspend_customer_account(
  p_customer_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_admin_role TEXT;
  v_customer_name TEXT;
BEGIN
  -- Get current user
  v_admin_id := auth.uid();
  
  -- Verify admin role
  SELECT role INTO v_admin_role
  FROM profiles
  WHERE id = v_admin_id;
  
  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can suspend customers';
  END IF;
  
  -- Get customer name for audit
  SELECT full_name INTO v_customer_name
  FROM profiles
  WHERE id = p_customer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  
  -- Update customer status
  UPDATE profiles
  SET 
    status = 'suspended',
    suspension_reason = p_reason,
    suspended_at = NOW(),
    suspended_by = v_admin_id,
    updated_at = NOW()
  WHERE id = p_customer_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'customer_id', p_customer_id,
    'customer_name', v_customer_name,
    'suspended_by', v_admin_id,
    'suspended_at', NOW()
  );
END;
$$;

-- 4. Function to unsuspend a customer (Admin only)
CREATE OR REPLACE FUNCTION public.unsuspend_customer_account(
  p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_admin_role TEXT;
  v_customer_name TEXT;
BEGIN
  -- Get current user
  v_admin_id := auth.uid();
  
  -- Verify admin role
  SELECT role INTO v_admin_role
  FROM profiles
  WHERE id = v_admin_id;
  
  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can unsuspend customers';
  END IF;
  
  -- Get customer name for audit
  SELECT full_name INTO v_customer_name
  FROM profiles
  WHERE id = p_customer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  
  -- Update customer status
  UPDATE profiles
  SET 
    status = 'active',
    suspension_reason = NULL,
    suspended_at = NULL,
    suspended_by = NULL,
    updated_at = NOW()
  WHERE id = p_customer_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'customer_id', p_customer_id,
    'customer_name', v_customer_name,
    'unsuspended_by', v_admin_id,
    'unsuspended_at', NOW()
  );
END;
$$;

-- 5. RLS Policy: Suspended users cannot access their data
CREATE POLICY "suspended_users_blocked" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    CASE 
      WHEN auth.uid() = id THEN status != 'suspended'
      ELSE true
    END
  );

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.suspend_customer_account TO authenticated;
GRANT EXECUTE ON FUNCTION public.unsuspend_customer_account TO authenticated;

-- 7. Add comment
COMMENT ON FUNCTION public.suspend_customer_account IS 'Admin-only function to suspend customer accounts';
COMMENT ON FUNCTION public.unsuspend_customer_account IS 'Admin-only function to unsuspend customer accounts';

COMMIT;
