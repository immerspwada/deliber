-- ============================================
-- MCP PRODUCTION FIX: Admin Customers Access
-- ============================================
-- Run this in Supabase SQL Editor (Production)
-- URL: https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt/sql/new

-- ============================================
-- STEP 1: Verify Current State
-- ============================================

-- Check if admin user exists and has correct role
DO $$
DECLARE
  v_admin_count INTEGER;
  v_profiles_exists BOOLEAN;
  v_users_exists BOOLEAN;
BEGIN
  -- Check if profiles table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) INTO v_profiles_exists;

  -- Check if users table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) INTO v_users_exists;

  RAISE NOTICE '📊 Current State:';
  RAISE NOTICE '  - profiles table exists: %', v_profiles_exists;
  RAISE NOTICE '  - users table exists: %', v_users_exists;

  -- Count admin users in profiles
  IF v_profiles_exists THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM profiles WHERE role = 'admin';
    RAISE NOTICE '  - Admin users in profiles: %', v_admin_count;
  END IF;

  -- Count admin users in users
  IF v_users_exists THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM users WHERE role = 'admin';
    RAISE NOTICE '  - Admin users in users: %', v_admin_count;
  END IF;
END $$;

-- ============================================
-- STEP 2: Fix Admin User Role
-- ============================================

BEGIN;

-- Ensure admin user exists in profiles with correct role
INSERT INTO profiles (id, email, full_name, role, status, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    au.email
  ) as full_name,
  'admin' as role,
  'active' as status,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
WHERE au.email = 'superadmin@gobear.app'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
  updated_at = NOW();

-- Also update users table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    UPDATE users
    SET role = 'admin', updated_at = NOW()
    WHERE email = 'superadmin@gobear.app';
  END IF;
END $$;

COMMIT;

-- ============================================
-- STEP 3: Recreate admin_get_customers Function
-- ============================================

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
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN := FALSE;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required'
      USING HINT = 'User must be logged in';
  END IF;

  -- Check if user has admin role in profiles table
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = v_user_id
    AND profiles.role = 'admin'
  ) INTO v_is_admin;

  -- If not admin in profiles, check users table as fallback
  IF NOT v_is_admin THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
      SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = v_user_id
        AND users.role = 'admin'
      ) INTO v_is_admin;
    END IF;
  END IF;

  -- Raise error if not admin
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required'
      USING HINT = 'User role must be admin',
            DETAIL = format('User ID: %s', v_user_id);
  END IF;

  -- Return customer data
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.phone_number,
    COALESCE(p.status, 'active') as status,
    p.created_at,
    p.suspended_at,
    p.suspension_reason
  FROM public.profiles p
  WHERE p.role = 'customer'
    AND (
      p_search IS NULL OR
      p.full_name ILIKE '%' || p_search || '%' OR
      p.email ILIKE '%' || p_search || '%' OR
      p.phone_number ILIKE '%' || p_search || '%'
    )
    AND (
      p_status IS NULL OR
      COALESCE(p.status, 'active') = ANY(p_status)
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_get_customers(TEXT, TEXT[], INTEGER, INTEGER) TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_get_customers IS 
  'Get customers list with filtering. Checks both profiles and users tables for admin role. Uses SECURITY DEFINER with explicit search_path.';

-- ============================================
-- STEP 4: Recreate Other Admin Functions
-- ============================================

-- admin_suspend_customer
CREATE OR REPLACE FUNCTION admin_suspend_customer(
  p_customer_id UUID,
  p_reason TEXT
)
RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_user_id UUID;
  v_is_admin BOOLEAN := FALSE;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;

  -- Check admin role (profiles first, then users as fallback)
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
      SELECT EXISTS (
        SELECT 1 FROM public.users WHERE id = v_user_id AND role = 'admin'
      ) INTO v_is_admin;
    END IF;
  END IF;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Update customer status
  UPDATE public.profiles
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
$$;

GRANT EXECUTE ON FUNCTION admin_suspend_customer(UUID, TEXT) TO authenticated;

-- admin_unsuspend_customer
CREATE OR REPLACE FUNCTION admin_unsuspend_customer(
  p_customer_id UUID
)
RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_user_id UUID;
  v_is_admin BOOLEAN := FALSE;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;

  -- Check admin role
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
      SELECT EXISTS (
        SELECT 1 FROM public.users WHERE id = v_user_id AND role = 'admin'
      ) INTO v_is_admin;
    END IF;
  END IF;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Update customer status
  UPDATE public.profiles
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
$$;

GRANT EXECUTE ON FUNCTION admin_unsuspend_customer(UUID) TO authenticated;

-- admin_bulk_suspend_customers
CREATE OR REPLACE FUNCTION admin_bulk_suspend_customers(
  p_customer_ids UUID[],
  p_reason TEXT
)
RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_user_id UUID;
  v_is_admin BOOLEAN := FALSE;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;

  -- Check admin role
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
      SELECT EXISTS (
        SELECT 1 FROM public.users WHERE id = v_user_id AND role = 'admin'
      ) INTO v_is_admin;
    END IF;
  END IF;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Update customers status
  UPDATE public.profiles
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
$$;

GRANT EXECUTE ON FUNCTION admin_bulk_suspend_customers(UUID[], TEXT) TO authenticated;

-- ============================================
-- STEP 5: Verification
-- ============================================

DO $$
DECLARE
  v_admin_email TEXT;
  v_admin_role TEXT;
  v_function_exists BOOLEAN;
  v_test_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ VERIFICATION RESULTS';
  RAISE NOTICE '============================================';
  
  -- Check admin user
  SELECT email, role INTO v_admin_email, v_admin_role
  FROM profiles 
  WHERE email = 'superadmin@gobear.app';
  
  RAISE NOTICE '1. Admin User:';
  RAISE NOTICE '   Email: %', COALESCE(v_admin_email, 'NOT FOUND');
  RAISE NOTICE '   Role: %', COALESCE(v_admin_role, 'NOT FOUND');
  
  -- Check function exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_name = 'admin_get_customers'
    AND routine_schema = 'public'
  ) INTO v_function_exists;
  
  RAISE NOTICE '2. Function: %', CASE WHEN v_function_exists THEN '✅ EXISTS' ELSE '❌ NOT FOUND' END;
  
  -- Test function (if admin exists)
  IF v_admin_role = 'admin' THEN
    BEGIN
      SELECT COUNT(*) INTO v_test_count
      FROM admin_get_customers(NULL, NULL, 10, 0);
      
      RAISE NOTICE '3. Function Test: ✅ SUCCESS (% customers found)', v_test_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '3. Function Test: ❌ FAILED - %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE '3. Function Test: ⏭️  SKIPPED (admin role not set)';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '🎉 FIX COMPLETE!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Next: Refresh browser at http://localhost:5173/admin/customers';
  RAISE NOTICE '';
END $$;
