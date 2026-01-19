-- Verify Status Column in Profiles Table
-- =========================================

-- 1. ตรวจสอบว่า profiles table มี status column
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('status', 'suspension_reason', 'suspended_at', 'suspended_by')
ORDER BY column_name;

-- Expected Result:
-- status           | character varying | 'active'::character varying | YES
-- suspended_at     | timestamp with time zone | NULL | YES
-- suspended_by     | uuid | NULL | YES
-- suspension_reason| text | NULL | YES

-- 2. ตรวจสอบว่า RPC function ใช้ profiles.status
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'get_admin_customers'
  AND routine_type = 'FUNCTION';

-- ควรเห็น: FROM profiles p ... WHERE p.role = 'customer'

-- 3. ทดสอบเรียก RPC function
SELECT 
  id,
  email,
  full_name,
  status,
  suspension_reason
FROM get_admin_customers(NULL, NULL, 5, 0);

-- Expected: ควรได้ข้อมูลลูกค้า พร้อม status = 'active'

-- 4. ตรวจสอบ RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles'
  AND policyname LIKE '%suspend%'
ORDER BY policyname;

-- Expected: customer_suspended_blocked, customer_suspended_no_update

-- 5. ตรวจสอบ indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'profiles'
  AND indexname LIKE '%status%'
ORDER BY indexname;

-- Expected: idx_profiles_status, idx_profiles_role_status

-- 6. ตรวจสอบ suspend/unsuspend functions
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN ('suspend_customer_account', 'unsuspend_customer_account')
ORDER BY routine_name;

-- Expected: 2 functions

-- 7. ทดสอบ count function
SELECT count_admin_customers(NULL, 'active') as active_count;
SELECT count_admin_customers(NULL, 'suspended') as suspended_count;

-- Expected: จำนวนลูกค้าแต่ละสถานะ
