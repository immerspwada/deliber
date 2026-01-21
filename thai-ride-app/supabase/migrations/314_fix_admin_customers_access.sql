-- Migration: Fix Admin Customers Access
-- ========================================
-- Ensures admin users have proper role in profiles table
-- and fixes the admin_get_customers function

BEGIN;

-- 1. Ensure profiles table has all necessary columns
DO $$ 
BEGIN
  -- Add email column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
  END IF;

  -- Add full_name column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN full_name TEXT;
  END IF;

  -- Add phone_number column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_number TEXT;
  END IF;

  -- Add status column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status TEXT DEFAULT 'active' 
      CHECK (status IN ('active', 'suspended', 'banned'));
  END IF;

  -- Add suspended_at column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'suspended_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN suspended_at TIMESTAMPTZ;
  END IF;

  -- Add suspension_reason column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'suspension_reason'
  ) THEN
    ALTER TABLE profiles ADD COLUMN suspension_reason TEXT;
  END IF;
END $$;

-- 2. Sync existing users to profiles table (only if users table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    INSERT INTO profiles (id, email, full_name, phone_number, role, status, created_at, updated_at)
    SELECT 
      u.id,
      u.email,
      u.name as full_name,
      u.phone as phone_number,
      COALESCE(u.role, 'customer') as role,
      'active' as status,
      u.created_at,
      u.updated_at
    FROM users u
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      phone_number = EXCLUDED.phone_number,
      role = EXCLUDED.role,
      updated_at = NOW();
  END IF;
END $$;

-- 3. Create trigger to keep profiles in sync with users table (only if users table exists)
CREATE OR REPLACE FUNCTION sync_user_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update profile when user is created/updated
  INSERT INTO profiles (id, email, full_name, phone_number, role, status, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.name,
    NEW.phone,
    COALESCE(NEW.role, 'customer'),
    'active',
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone_number = EXCLUDED.phone_number,
    role = EXCLUDED.role,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger only if users table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    -- Drop trigger if exists
    DROP TRIGGER IF EXISTS sync_user_to_profile_trigger ON users;
    
    -- Create trigger
    CREATE TRIGGER sync_user_to_profile_trigger
      AFTER INSERT OR UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION sync_user_to_profile();
  END IF;
END $$;

-- 4. Fix admin_get_customers function to handle auth properly
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
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;

  -- Check if user has admin role in profiles table
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = v_user_id
    AND profiles.role = 'admin'
  ) INTO v_is_admin;

  -- If not admin, check users table as fallback
  IF NOT v_is_admin THEN
    SELECT EXISTS (
      SELECT 1 FROM users
      WHERE users.id = v_user_id
      AND users.role = 'admin'
    ) INTO v_is_admin;
  END IF;

  -- Raise error if not admin
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Return customer data
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

-- 5. Update other admin functions with same fix
CREATE OR REPLACE FUNCTION admin_suspend_customer(
  p_customer_id UUID,
  p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;

  -- Check admin role (profiles first, then users as fallback)
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    SELECT EXISTS (
      SELECT 1 FROM users WHERE id = v_user_id AND role = 'admin'
    ) INTO v_is_admin;
  END IF;

  IF NOT v_is_admin THEN
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

CREATE OR REPLACE FUNCTION admin_unsuspend_customer(
  p_customer_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;

  -- Check admin role (profiles first, then users as fallback)
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    SELECT EXISTS (
      SELECT 1 FROM users WHERE id = v_user_id AND role = 'admin'
    ) INTO v_is_admin;
  END IF;

  IF NOT v_is_admin THEN
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

CREATE OR REPLACE FUNCTION admin_bulk_suspend_customers(
  p_customer_ids UUID[],
  p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
  v_count INTEGER;
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;

  -- Check admin role (profiles first, then users as fallback)
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    SELECT EXISTS (
      SELECT 1 FROM users WHERE id = v_user_id AND role = 'admin'
    ) INTO v_is_admin;
  END IF;

  IF NOT v_is_admin THEN
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

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE role = 'customer';
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone_number) WHERE role = 'customer';
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status) WHERE role = 'customer';
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON profiles(role, status);

-- 7. Add comments
COMMENT ON FUNCTION sync_user_to_profile IS 'Keeps profiles table in sync with users table';
COMMENT ON FUNCTION admin_get_customers IS 'Get customers list with filtering (checks both profiles and users for admin role)';
COMMENT ON FUNCTION admin_suspend_customer IS 'Suspend a customer account with reason (checks both profiles and users for admin role)';
COMMENT ON FUNCTION admin_unsuspend_customer IS 'Unsuspend a customer account (checks both profiles and users for admin role)';
COMMENT ON FUNCTION admin_bulk_suspend_customers IS 'Bulk suspend multiple customer accounts (checks both profiles and users for admin role)';

COMMIT;
