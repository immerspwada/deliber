-- ============================================
-- QUICK FIX: Admin Customers Access
-- ============================================
-- Copy and paste this entire script into Supabase SQL Editor
-- Then click "Run" to fix the admin access issue

BEGIN;

-- Step 1: Ensure admin user exists in profiles table
INSERT INTO profiles (id, email, full_name, role, status, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  'admin' as role,
  'active' as status,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
WHERE au.email = 'superadmin@gobear.app'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  email = EXCLUDED.email,
  updated_at = NOW();

-- Step 2: Recreate admin_get_customers function with proper auth check
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
      p.status = ANY(p_status)
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Step 3: Grant execute permission
GRANT EXECUTE ON FUNCTION admin_get_customers(TEXT, TEXT[], INTEGER, INTEGER) TO authenticated;

-- Step 4: Add helpful comment
COMMENT ON FUNCTION admin_get_customers IS 'Get customers list with filtering. Checks both profiles and users tables for admin role.';

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to verify the fix worked:
SELECT 
  'Admin User Check' as test,
  id, 
  email, 
  role 
FROM profiles 
WHERE email = 'superadmin@gobear.app';

-- Test the function:
SELECT 'Function Test' as test, COUNT(*) as customer_count
FROM admin_get_customers(NULL, NULL, 10, 0);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Admin access fix applied successfully!';
  RAISE NOTICE '✅ Refresh your browser to test: http://localhost:5173/admin/customers';
END $$;
