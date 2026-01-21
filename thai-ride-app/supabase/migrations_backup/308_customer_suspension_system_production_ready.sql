-- Customer Suspension System - Production Ready
-- ==============================================
-- Migration 308: ระบบระงับลูกค้าที่ทำงานตามกฎ 3 roles

BEGIN;

-- 1. Add suspension columns to profiles table (if not exists)
DO $$ 
BEGIN
  -- Add status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN status VARCHAR(20) DEFAULT 'active' 
    CHECK (status IN ('active', 'suspended', 'banned'));
  END IF;

  -- Add suspension_reason column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'suspension_reason'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN suspension_reason TEXT;
  END IF;

  -- Add suspended_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'suspended_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN suspended_at TIMESTAMPTZ;
  END IF;

  -- Add suspended_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'suspended_by'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN suspended_by UUID REFERENCES public.profiles(id);
  END IF;
END $$;

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended_by ON public.profiles(suspended_by);
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, status);

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
  v_customer_role TEXT;
BEGIN
  -- Get current user
  v_admin_id := auth.uid();
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Verify admin role
  SELECT role INTO v_admin_role
  FROM profiles
  WHERE id = v_admin_id;
  
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can suspend customers';
  END IF;
  
  -- Get customer info
  SELECT full_name, role INTO v_customer_name, v_customer_role
  FROM profiles
  WHERE id = p_customer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  
  -- Prevent suspending admins or providers
  IF v_customer_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot suspend admin accounts';
  END IF;
  
  IF v_customer_role = 'provider' THEN
    RAISE EXCEPTION 'Cannot suspend provider accounts. Use provider management instead.';
  END IF;
  
  -- Only suspend customers
  IF v_customer_role != 'customer' THEN
    RAISE EXCEPTION 'Can only suspend customer accounts';
  END IF;
  
  -- Update customer status
  UPDATE profiles
  SET 
    status = 'suspended',
    suspension_reason = p_reason,
    suspended_at = NOW(),
    suspended_by = v_admin_id,
    updated_at = NOW()
  WHERE id = p_customer_id
  AND role = 'customer';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to suspend customer';
  END IF;
  
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
  v_customer_role TEXT;
BEGIN
  -- Get current user
  v_admin_id := auth.uid();
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Verify admin role
  SELECT role INTO v_admin_role
  FROM profiles
  WHERE id = v_admin_id;
  
  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can unsuspend customers';
  END IF;
  
  -- Get customer info
  SELECT full_name, role INTO v_customer_name, v_customer_role
  FROM profiles
  WHERE id = p_customer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  
  -- Only unsuspend customers
  IF v_customer_role != 'customer' THEN
    RAISE EXCEPTION 'Can only unsuspend customer accounts';
  END IF;
  
  -- Update customer status
  UPDATE profiles
  SET 
    status = 'active',
    suspension_reason = NULL,
    suspended_at = NULL,
    suspended_by = NULL,
    updated_at = NOW()
  WHERE id = p_customer_id
  AND role = 'customer';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to unsuspend customer';
  END IF;
  
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

-- 5. RLS Policies for 3 roles

-- Drop existing policy if exists
DROP POLICY IF EXISTS "suspended_users_blocked" ON public.profiles;

-- Customer: ลูกค้าที่ถูกระงับไม่สามารถเข้าถึงข้อมูลตัวเองได้
CREATE POLICY "customer_suspended_blocked" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- ถ้าเป็นตัวเองและเป็น customer ที่ถูกระงับ → ไม่ให้เข้าถึง
    CASE 
      WHEN auth.uid() = id AND role = 'customer' THEN status != 'suspended'
      ELSE true
    END
  );

-- Customer: ลูกค้าที่ถูกระงับไม่สามารถอัปเดตข้อมูลได้
CREATE POLICY "customer_suspended_no_update" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- ถ้าเป็นตัวเองและเป็น customer ที่ถูกระงับ → ไม่ให้อัปเดต
    CASE 
      WHEN auth.uid() = id AND role = 'customer' THEN status != 'suspended'
      ELSE true
    END
  );

-- Provider: Provider ไม่ได้รับผลกระทบจากระบบนี้
-- (Provider มีระบบจัดการแยกใน providers_v2 table)

-- Admin: Admin เห็นทุกอย่าง (มี policy อยู่แล้วใน migration อื่น)

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.suspend_customer_account TO authenticated;
GRANT EXECUTE ON FUNCTION public.unsuspend_customer_account TO authenticated;

-- 7. Add comments
COMMENT ON FUNCTION public.suspend_customer_account IS 
  'Admin-only function to suspend customer accounts. Cannot suspend admin or provider accounts.';
COMMENT ON FUNCTION public.unsuspend_customer_account IS 
  'Admin-only function to unsuspend customer accounts.';

COMMENT ON COLUMN public.profiles.status IS 
  'Account status: active, suspended (customer only), banned';
COMMENT ON COLUMN public.profiles.suspension_reason IS 
  'Reason for suspension (customer only)';
COMMENT ON COLUMN public.profiles.suspended_at IS 
  'Timestamp when account was suspended';
COMMENT ON COLUMN public.profiles.suspended_by IS 
  'Admin who suspended the account';

COMMIT;
