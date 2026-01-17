# Task 16.2: Verify RPC Functions in Production

## Overview

This guide helps you verify that migration 301 was successfully applied and all 4 admin RPC functions exist and work correctly in production.

## Prerequisites

- ✅ Task 16.1 completed (Migration 301 applied to production)
- ✅ Access to Supabase Dashboard (https://supabase.com/dashboard)
- ✅ Admin credentials for superadmin@gobear.app

## Production Database

- **Project URL**: https://onsflqhkgqhydeupiqyt.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt

## Verification Steps

### Step 1: Access SQL Editor

1. Go to Supabase Dashboard
2. Select your project: `onsflqhkgqhydeupiqyt`
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Verify Functions Exist

Run this query to check all 4 functions are created:

```sql
-- Query 1: Check RPC Functions Exist
SELECT
  routine_name,
  routine_type,
  data_type as return_type,
  routine_definition IS NOT NULL as has_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_admin_providers_v2',
  'count_admin_providers_v2',
  'get_admin_customers',
  'count_admin_customers'
)
ORDER BY routine_name;
```

**Expected Result**: 4 rows showing:

- `count_admin_customers` - FUNCTION - bigint - true
- `count_admin_providers_v2` - FUNCTION - bigint - true
- `get_admin_customers` - FUNCTION - SETOF record - true
- `get_admin_providers_v2` - FUNCTION - SETOF record - true

**✅ PASS**: All 4 functions exist with has_definition = true
**❌ FAIL**: Less than 4 functions found → Re-run migration 301

### Step 3: Verify Function Security

Run this query to confirm functions use SECURITY DEFINER:

```sql
-- Query 2: Check Function Security Settings
SELECT
  p.proname as function_name,
  CASE p.prosecdef
    WHEN true THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_type,
  pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
  'get_admin_providers_v2',
  'count_admin_providers_v2',
  'get_admin_customers',
  'count_admin_customers'
)
ORDER BY p.proname;
```

**Expected Result**: All 4 functions show `security_type = 'SECURITY DEFINER'`

**✅ PASS**: All functions are SECURITY DEFINER
**❌ FAIL**: Any function is SECURITY INVOKER → Re-run migration 301

### Step 4: Verify Admin User Role

Run this query to check your admin user has the correct role:

```sql
-- Query 3: Check Admin User Role
SELECT
  id,
  email,
  role,
  first_name,
  last_name,
  created_at
FROM users
WHERE email = 'superadmin@gobear.app';
```

**Expected Result**: 1 row with `role = 'super_admin'` or `role = 'admin'`

**✅ PASS**: User exists with correct role
**❌ FAIL**: No rows → User doesn't exist in users table
**❌ FAIL**: role is NULL → Need to update role

**Fix if needed**:

```sql
-- Update admin role (replace YOUR-AUTH-USER-ID with actual ID from auth.users)
UPDATE users
SET role = 'super_admin'
WHERE email = 'superadmin@gobear.app';
```

### Step 5: Test get_admin_providers_v2

Run this query to test the providers function:

```sql
-- Query 4: Test get_admin_providers_v2
SELECT
  id,
  email,
  first_name,
  last_name,
  provider_type,
  status,
  is_online,
  rating,
  total_trips
FROM get_admin_providers_v2(
  p_status := NULL,
  p_provider_type := NULL,
  p_limit := 5,
  p_offset := 0
);
```

**Expected Result**:

- Returns provider data (may be 0 rows if no providers exist)
- **NO ERRORS** like "User not found" or "Access denied"

**✅ PASS**: Query executes without errors
**❌ FAIL**: Error "User not found" → Check admin user role in Step 4
**❌ FAIL**: Error "Access denied" → Check function security in Step 3

### Step 6: Test count_admin_providers_v2

Run this query to test the count function:

```sql
-- Query 5: Test count_admin_providers_v2
SELECT count_admin_providers_v2(
  p_status := NULL,
  p_provider_type := NULL
) as total_providers;
```

**Expected Result**: Returns integer (e.g., 0, 5, 10, etc.)

**✅ PASS**: Returns a number without errors
**❌ FAIL**: Any error → Check previous steps

### Step 7: Test get_admin_customers

Run this query to test the customers function:

```sql
-- Query 6: Test get_admin_customers
SELECT
  id,
  email,
  first_name,
  last_name,
  role,
  total_rides,
  wallet_balance
FROM get_admin_customers(
  p_search := NULL,
  p_status := NULL,
  p_limit := 5,
  p_offset := 0
);
```

**Expected Result**: Returns customer data (may be 0 rows if no customers)

**✅ PASS**: Query executes without errors
**❌ FAIL**: Any error → Check admin user role

### Step 8: Test count_admin_customers

Run this query to test the count function:

```sql
-- Query 7: Test count_admin_customers
SELECT count_admin_customers(
  p_search := NULL,
  p_status := NULL
) as total_customers;
```

**Expected Result**: Returns integer

**✅ PASS**: Returns a number without errors
**❌ FAIL**: Any error → Check previous steps

### Step 9: Run Comprehensive Verification

Run this final verification script:

```sql
-- Query 8: Comprehensive Verification
DO $$
DECLARE
  v_functions_count INT;
  v_admin_exists BOOLEAN;
  v_admin_role TEXT;
  v_test_providers INT;
  v_test_customers INT;
BEGIN
  -- Check functions exist
  SELECT COUNT(*) INTO v_functions_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_admin_providers_v2',
    'count_admin_providers_v2',
    'get_admin_customers',
    'count_admin_customers'
  );

  -- Check admin user
  SELECT EXISTS(
    SELECT 1 FROM users WHERE email = 'superadmin@gobear.app'
  ) INTO v_admin_exists;

  SELECT role INTO v_admin_role
  FROM users WHERE email = 'superadmin@gobear.app';

  -- Test function calls
  SELECT count_admin_providers_v2(NULL, NULL) INTO v_test_providers;
  SELECT count_admin_customers(NULL, NULL) INTO v_test_customers;

  -- Print results
  RAISE NOTICE '=== VERIFICATION RESULTS ===';
  RAISE NOTICE 'Functions created: % of 4', v_functions_count;
  RAISE NOTICE 'Admin user exists: %', v_admin_exists;
  RAISE NOTICE 'Admin user role: %', COALESCE(v_admin_role, 'NULL');
  RAISE NOTICE 'Total providers: %', v_test_providers;
  RAISE NOTICE 'Total customers: %', v_test_customers;
  RAISE NOTICE '';

  IF v_functions_count = 4 AND v_admin_exists AND v_admin_role IN ('admin', 'super_admin') THEN
    RAISE NOTICE '✅ DEPLOYMENT SUCCESSFUL - All checks passed!';
  ELSE
    RAISE WARNING '⚠️ DEPLOYMENT INCOMPLETE - Please review results above';
  END IF;
END;
$$;
```

**Expected Output** (in Messages tab):

```
NOTICE:  === VERIFICATION RESULTS ===
NOTICE:  Functions created: 4 of 4
NOTICE:  Admin user exists: t
NOTICE:  Admin user role: super_admin
NOTICE:  Total providers: 5
NOTICE:  Total customers: 12
NOTICE:
NOTICE:  ✅ DEPLOYMENT SUCCESSFUL - All checks passed!
```

## Verification Checklist

After running all queries, confirm:

- [ ] ✅ All 4 RPC functions exist (Query 1)
- [ ] ✅ All functions use SECURITY DEFINER (Query 2)
- [ ] ✅ Admin user exists with correct role (Query 3)
- [ ] ✅ get_admin_providers_v2 works without errors (Query 4)
- [ ] ✅ count_admin_providers_v2 returns a number (Query 5)
- [ ] ✅ get_admin_customers works without errors (Query 6)
- [ ] ✅ count_admin_customers returns a number (Query 7)
- [ ] ✅ Comprehensive verification passes (Query 8)

## Common Issues and Solutions

### Issue 1: Functions Don't Exist

**Symptom**: Query 1 returns less than 4 rows

**Solution**: Re-apply migration 301

1. Go to SQL Editor
2. Open file: `supabase/migrations/301_fix_admin_rpc_role_check.sql`
3. Copy entire content
4. Paste into SQL Editor
5. Click **Run**

### Issue 2: Admin User Not Found

**Symptom**: Query 3 returns 0 rows

**Solution**: Check auth.users table

```sql
-- Find your auth user ID
SELECT id, email FROM auth.users WHERE email = 'superadmin@gobear.app';

-- Insert into users table (replace UUID)
INSERT INTO users (id, email, role, first_name, last_name)
VALUES (
  'YOUR-AUTH-USER-ID-HERE',
  'superadmin@gobear.app',
  'super_admin',
  'Super',
  'Admin'
);
```

### Issue 3: Admin Role is NULL

**Symptom**: Query 3 shows role = NULL

**Solution**: Update role

```sql
UPDATE users
SET role = 'super_admin'
WHERE email = 'superadmin@gobear.app';
```

### Issue 4: "User not found" Error

**Symptom**: Query 4 or 6 returns error "User not found in users table"

**Root Cause**: Function checks users table for admin role, but user doesn't exist

**Solution**: Follow Issue 2 solution above

### Issue 5: "Access denied" Error

**Symptom**: Query 4 or 6 returns error "Access denied"

**Root Cause**: User exists but role is not 'admin' or 'super_admin'

**Solution**: Follow Issue 3 solution above

## Next Steps

Once all verifications pass:

1. ✅ Mark Task 16.2 as complete
2. ➡️ Proceed to Task 16.3: Test admin providers page in production
3. ➡️ Verify page loads at: http://localhost:5173/admin/providers (or production URL)

## Rollback Plan

If verification fails and cannot be fixed:

1. **Backup current state**: Export database schema
2. **Drop functions**:

```sql
DROP FUNCTION IF EXISTS get_admin_providers_v2;
DROP FUNCTION IF EXISTS count_admin_providers_v2;
DROP FUNCTION IF EXISTS get_admin_customers;
DROP FUNCTION IF EXISTS count_admin_customers;
```

3. **Restore old functions** (if they existed)
4. **Report issue** with error messages

## Support

If you encounter issues not covered here:

1. Check Supabase logs: Dashboard → Logs → Postgres Logs
2. Review migration file: `supabase/migrations/301_fix_admin_rpc_role_check.sql`
3. Check requirements: `.kiro/specs/admin-panel-complete-verification/requirements.md`

---

**Status**: Ready for verification
**Last Updated**: 2026-01-17
**Migration**: 301_fix_admin_rpc_role_check.sql
