-- Migration: Customer Suspension System
-- ========================================
-- Real-time customer suspension for admin panel

BEGIN;

-- Add customer-related columns to profiles if not exists
DO $$ 
BEGIN
  -- Add email column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
  END IF;

  -- Add full_name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
    ALTER TABLE profiles ADD COLUMN full_name TEXT;
  END IF;

  -- Add phone_number column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone_number') THEN
    ALTER TABLE profiles ADD COLUMN phone_number TEXT;
  END IF;

  -- Add status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'status') THEN
    ALTER TABLE profiles ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned'));
  END IF;

  -- Add suspended_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'suspended_at') THEN
    ALTER TABLE profiles ADD COLUMN suspended_at TIMESTAMPTZ;
  END IF;

  -- Add suspension_reason column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'suspension_reason') THEN
    ALTER TABLE profiles ADD COLUMN suspension_reason TEXT;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE role = 'customer';
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone_number) WHERE role = 'customer';
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status) WHERE role = 'customer';

-- Function to suspend customer
CREATE OR REPLACE FUNCTION admin_suspend_customer(
  p_customer_id UUID,
  p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid())
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Update customer status
  UPDATE profiles
  SET 
    status = 'suspended',
    suspended_at = NOW(),
    suspension_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_customer_id
  AND role = 'customer'
  RETURNING row_to_json(profiles.*) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unsuspend customer
CREATE OR REPLACE FUNCTION admin_unsuspend_customer(
  p_customer_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid())
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Update customer status
  UPDATE profiles
  SET 
    status = 'active',
    suspended_at = NULL,
    suspension_reason = NULL,
    updated_at = NOW()
  WHERE id = p_customer_id
  AND role = 'customer'
  RETURNING row_to_json(profiles.*) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk suspend customers
CREATE OR REPLACE FUNCTION admin_bulk_suspend_customers(
  p_customer_ids UUID[],
  p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid())
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Update customers status
  UPDATE profiles
  SET 
    status = 'suspended',
    suspended_at = NOW(),
    suspension_reason = p_reason,
    updated_at = NOW()
  WHERE id = ANY(p_customer_ids)
  AND role = 'customer';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'count', v_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get customers list
CREATE OR REPLACE FUNCTION admin_get_customers(
  p_search TEXT DEFAULT NULL,
  p_status TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  phone_number TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.phone_number,
    p.status,
    p.created_at,
    p.suspended_at,
    p.suspension_reason
  FROM profiles p
  WHERE p.role = 'customer'
    AND (
      p_search IS NULL OR
      p.full_name ILIKE '%' || p_search || '%' OR
      p.email ILIKE '%' || p_search || '%' OR
      p.phone_number ILIKE '%' || p_search || '%'
    )
    AND (
      p_status IS NULL OR
      p.status = ANY(p_status)
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_suspend_customer TO authenticated;
GRANT EXECUTE ON FUNCTION admin_unsuspend_customer TO authenticated;
GRANT EXECUTE ON FUNCTION admin_bulk_suspend_customers TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_customers TO authenticated;

-- Add comments
COMMENT ON FUNCTION admin_suspend_customer IS 'Suspend a customer account with reason';
COMMENT ON FUNCTION admin_unsuspend_customer IS 'Unsuspend a customer account';
COMMENT ON FUNCTION admin_bulk_suspend_customers IS 'Bulk suspend multiple customer accounts';
COMMENT ON FUNCTION admin_get_customers IS 'Get customers list with filtering';

COMMIT;
