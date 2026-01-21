# 🚀 Migration 306 Deployment Instructions

## Task 1.3: Deploy Migration 306 (Admin Order Reassignment)

**Status:** Ready for Manual Deployment  
**Migration File:** `supabase/migrations/306_admin_order_reassignment_system.sql`  
**Production URL:** `https://onsflqhkgqhydeupiqyt.supabase.co`  
**Estimated Time:** 5-10 minutes  
**Requirements:** 1.1, 1.4, 1.5

---

## 📋 Overview

Migration 306 implements the Admin Order Reassignment System, which allows administrators to:

- Reassign orders from one provider to another
- View available providers for reassignment
- Track reassignment history with full audit trail
- Ensure only approved providers receive reassignments

**What This Migration Creates:**

1. ✅ `order_reassignments` table (audit trail)
2. ✅ `reassign_order()` function (main reassignment logic)
3. ✅ `get_reassignment_history()` function (view audit trail)
4. ✅ `get_available_providers()` function (list available providers)
5. ✅ 3 performance indexes
6. ✅ RLS policies for admin-only access

---

## ⚠️ Prerequisites

Before starting deployment, ensure you have:

### Required Access

- [ ] Supabase Dashboard access to production project
- [ ] Admin user credentials (`superadmin@gobear.app`)
- [ ] Production project ID: `onsflqhkgqhydeupiqyt`

### Required Files

- [ ] Migration file: `supabase/migrations/306_admin_order_reassignment_system.sql`
- [ ] Verification script: `test-function-calls.sql`

### Pre-Deployment Checks

- [ ] Create database backup via Supabase Dashboard
  - Navigate to: Dashboard → Database → Backups
  - Click "Create backup"
  - Wait for completion
  - **Backup timestamp:** ******\_\_\_******

- [ ] Verify you're on production environment

  ```
  URL: https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt
  ```

- [ ] Confirm admin role
  ```sql
  SELECT id, email, role FROM profiles WHERE id = auth.uid();
  -- Expected: role = 'admin'
  ```

---

## 🚀 Deployment Steps

### Step 1: Access Supabase Dashboard SQL Editor

1. **Open Production Dashboard**

   ```
   https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt
   ```

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query" button (top right)

3. **Verify Connection**
   - Ensure you see "Connected to production" indicator
   - Check project name matches: `onsflqhkgqhydeupiqyt`

**📸 Screenshot:** Take screenshot of SQL Editor interface

---

### Step 2: Copy Migration 306 Content

1. **Open Migration File**
   - File location: `supabase/migrations/306_admin_order_reassignment_system.sql`
   - Open in your code editor

2. **Copy Entire Content**
   - Select all (Ctrl+A / Cmd+A)
   - Copy (Ctrl+C / Cmd+C)
   - **Verify:** Content starts with `BEGIN;` and ends with `COMMIT;`

3. **Review Migration Content**
   - Ensure no syntax errors
   - Verify all sections are present:
     - CREATE TABLE order_reassignments
     - CREATE INDEX (3 indexes)
     - ALTER TABLE ENABLE ROW LEVEL SECURITY
     - CREATE POLICY
     - CREATE FUNCTION (3 functions)
     - GRANT EXECUTE

---

### Step 3: Execute Migration

1. **Paste into SQL Editor**
   - Click in the SQL Editor text area
   - Paste (Ctrl+V / Cmd+V)
   - **Verify:** All content pasted correctly

2. **Review Before Execution**
   - Scroll through the SQL
   - Check for any obvious issues
   - Ensure it's the correct migration (306)

3. **Execute Migration**
   - Click "Run" button (bottom right)
   - Or press Ctrl+Enter / Cmd+Enter
   - Wait for execution (approximately 2-3 seconds)

4. **Check Execution Status**
   - Look for success message in output panel
   - Should see: "Success. No rows returned."
   - Or: Multiple "Success" messages for each statement

**Expected Output:**

```
✅ CREATE TABLE
✅ CREATE INDEX
✅ CREATE INDEX
✅ CREATE INDEX
✅ ALTER TABLE
✅ CREATE POLICY
✅ CREATE FUNCTION
✅ CREATE FUNCTION
✅ CREATE FUNCTION
✅ GRANT EXECUTE
✅ GRANT EXECUTE
✅ GRANT EXECUTE
```

**📸 Screenshot:** Take screenshot of successful execution

---

### Step 4: Immediate Verification

Run these verification queries in a **new SQL Editor tab**:

#### 4.1 Verify Table Created

```sql
-- Check if order_reassignments table exists
SELECT COUNT(*) as table_exists
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'order_reassignments';
-- Expected: 1
```

**Expected Result:** `table_exists: 1`

---

#### 4.2 Verify Functions Created

```sql
-- Check if all 3 functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'reassign_order',
  'get_reassignment_history',
  'get_available_providers'
)
ORDER BY routine_name;
-- Expected: 3 rows
```

**Expected Result:**

```
routine_name              | routine_type
--------------------------+-------------
get_available_providers   | FUNCTION
get_reassignment_history  | FUNCTION
reassign_order            | FUNCTION
```

---

#### 4.3 Verify Indexes Created

```sql
-- Check if all 3 indexes exist
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'order_reassignments'
ORDER BY indexname;
-- Expected: 3 rows
```

**Expected Result:**

```
indexname
---------------------------------
idx_order_reassignments_admin
idx_order_reassignments_order
idx_order_reassignments_provider
```

---

#### 4.4 Verify RLS Policy Created

```sql
-- Check if RLS policy exists
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'order_reassignments';
-- Expected: 1 row
```

**Expected Result:**

```
policyname                        | cmd
----------------------------------+-----
admin_full_access_reassignments   | ALL
```

---

#### 4.5 Test get_available_providers Function

```sql
-- Test function execution (should return provider list or empty)
SELECT
  id,
  full_name,
  phone,
  vehicle_type,
  rating,
  status,
  is_online
FROM get_available_providers('ride', 5);
-- Expected: List of available providers (or empty if none)
```

**Expected Result:**

- Function executes without errors
- Returns table with columns: id, full_name, phone, vehicle_type, rating, status, is_online
- May return 0 rows if no approved providers exist (this is OK)

**📸 Screenshot:** Take screenshot of all verification results

---

### Step 5: Comprehensive Verification

Run the complete verification script:

```sql
-- Comprehensive verification for Migration 306
SELECT
  '✅ Migration 306 Verification' as check_name,
  'Starting verification...' as status;

-- 1. Table exists
SELECT
  '1. Table: order_reassignments' as check_name,
  CASE
    WHEN COUNT(*) = 1 THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'order_reassignments';

-- 2. Functions exist
SELECT
  '2. Functions (3 total)' as check_name,
  CASE
    WHEN COUNT(*) = 3 THEN '✅ ALL EXIST'
    ELSE '❌ MISSING: ' || (3 - COUNT(*))::text
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'reassign_order',
  'get_reassignment_history',
  'get_available_providers'
);

-- 3. Indexes exist
SELECT
  '3. Indexes (3 total)' as check_name,
  CASE
    WHEN COUNT(*) = 3 THEN '✅ ALL EXIST'
    ELSE '❌ MISSING: ' || (3 - COUNT(*))::text
  END as status
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'order_reassignments';

-- 4. RLS policy exists
SELECT
  '4. RLS Policy' as check_name,
  CASE
    WHEN COUNT(*) = 1 THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'order_reassignments'
AND policyname = 'admin_full_access_reassignments';

-- 5. RLS enabled
SELECT
  '5. RLS Enabled' as check_name,
  CASE
    WHEN rowsecurity = true THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'order_reassignments';

-- 6. Function permissions
SELECT
  '6. Function Permissions' as check_name,
  CASE
    WHEN COUNT(*) = 3 THEN '✅ ALL GRANTED'
    ELSE '❌ MISSING: ' || (3 - COUNT(*))::text
  END as status
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
AND routine_name IN (
  'reassign_order',
  'get_reassignment_history',
  'get_available_providers'
)
AND grantee = 'authenticated';

-- Summary
SELECT
  '═══════════════════════════════' as separator,
  'MIGRATION 306 VERIFICATION' as title,
  '═══════════════════════════════' as separator2
UNION ALL
SELECT
  '',
  CASE
    WHEN (
      SELECT COUNT(*) FROM information_schema.tables
      WHERE table_name = 'order_reassignments'
    ) = 1
    AND (
      SELECT COUNT(*) FROM information_schema.routines
      WHERE routine_name IN ('reassign_order', 'get_reassignment_history', 'get_available_providers')
    ) = 3
    AND (
      SELECT COUNT(*) FROM pg_indexes
      WHERE tablename = 'order_reassignments'
    ) = 3
    AND (
      SELECT COUNT(*) FROM pg_policies
      WHERE tablename = 'order_reassignments'
    ) = 1
    THEN '✅ ALL CHECKS PASSED'
    ELSE '❌ SOME CHECKS FAILED'
  END,
  '';
```

**Expected Output:**

```
✅ ALL CHECKS PASSED
```

**📸 Screenshot:** Take screenshot of verification summary

---

## ✅ Success Criteria

Migration 306 is successfully deployed when:

- [x] Table `order_reassignments` exists with all columns
- [x] Function `reassign_order` exists and is callable
- [x] Function `get_reassignment_history` exists and is callable
- [x] Function `get_available_providers` exists and is callable
- [x] All 3 indexes created
- [x] RLS policy `admin_full_access_reassignments` exists
- [x] RLS is enabled on `order_reassignments` table
- [x] All functions have EXECUTE permission for authenticated users
- [x] All verification queries pass
- [x] No SQL errors during execution

---

## 🧪 Functional Testing

After successful deployment, test the functions:

### Test 1: Get Available Providers

```sql
-- Should return list of approved providers
SELECT * FROM get_available_providers('ride', 10);
```

**Expected:** List of providers with status = 'approved'

---

### Test 2: Get Reassignment History (Empty)

```sql
-- Should return empty result (no reassignments yet)
SELECT * FROM get_reassignment_history(NULL, NULL, 10, 0);
```

**Expected:** 0 rows (no reassignments performed yet)

---

### Test 3: Verify Admin Access Only

```sql
-- Verify function checks admin role
-- This should succeed if you're logged in as admin
SELECT * FROM get_available_providers('ride', 1);
```

**Expected:** Function executes successfully (you're admin)

**Note:** If you get "Only admins can view available providers" error, verify your role:

```sql
SELECT id, email, role FROM profiles WHERE id = auth.uid();
```

---

## 📊 Record Deployment

Document the deployment:

**Deployment Record:**

```
Migration: 306_admin_order_reassignment_system.sql
Deployed By: [Your Name]
Deployment Date: [YYYY-MM-DD]
Deployment Time: [HH:MM]
Duration: [Minutes]
Status: ✅ SUCCESS / ❌ FAILED
Issues Encountered: [None / List issues]
Verification Status: ✅ ALL PASSED / ❌ SOME FAILED
Screenshots Saved: [Yes / No]
```

---

## 🔄 Rollback Procedure (If Needed)

If deployment fails or issues are discovered, rollback using:

```sql
-- Rollback Migration 306
BEGIN;

-- 1. Drop functions
DROP FUNCTION IF EXISTS public.get_available_providers(VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS public.get_reassignment_history(UUID, UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.reassign_order(UUID, VARCHAR, UUID, TEXT, TEXT);

-- 2. Drop RLS policy
DROP POLICY IF EXISTS "admin_full_access_reassignments" ON public.order_reassignments;

-- 3. Drop indexes
DROP INDEX IF EXISTS public.idx_order_reassignments_admin;
DROP INDEX IF EXISTS public.idx_order_reassignments_provider;
DROP INDEX IF EXISTS public.idx_order_reassignments_order;

-- 4. Drop table
DROP TABLE IF EXISTS public.order_reassignments;

COMMIT;
```

**⚠️ WARNING:** Rollback will lose any reassignment history data!

**Before Rollback:** Export data if needed:

```sql
SELECT * FROM order_reassignments ORDER BY created_at DESC;
```

---

## 🐛 Troubleshooting

### Issue: "Function does not exist"

**Cause:** Migration didn't execute successfully

**Solution:**

1. Check SQL Editor output for errors
2. Re-run migration
3. Verify function exists:
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name = 'get_available_providers';
   ```

---

### Issue: "Only admins can view available providers"

**Cause:** User doesn't have admin role

**Solution:**

1. Verify your role:
   ```sql
   SELECT id, email, role FROM profiles WHERE id = auth.uid();
   ```
2. If not admin, update role:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE id = auth.uid();
   ```

---

### Issue: "Table already exists"

**Cause:** Migration was already run

**Solution:**

1. Check if table exists:
   ```sql
   SELECT * FROM order_reassignments LIMIT 1;
   ```
2. If table exists and is correct, migration is already deployed
3. Skip to verification step

---

## 📝 Next Steps

After successful deployment of Migration 306:

1. ✅ Mark task 1.3 as complete
2. ✅ Update deployment documentation
3. ✅ Notify team of successful deployment
4. ✅ Proceed to task 1.4 (Deploy migration 308)
5. ✅ Monitor error logs for 24 hours
6. ✅ Test in production UI when frontend is deployed

---

## 📚 Related Documentation

- **Full Deployment Guide:** `DEPLOYMENT-GUIDE.md`
- **Verification Guide:** `VERIFICATION-GUIDE.md`
- **Migration File:** `supabase/migrations/306_admin_order_reassignment_system.sql`
- **Test Scripts:** `test-function-calls.sql`
- **Feature Documentation:** `.kiro/specs/admin-order-reassignment/README.md`

---

## ✅ Deployment Checklist

Use this checklist to track your progress:

- [ ] Prerequisites verified
- [ ] Database backup created
- [ ] SQL Editor accessed
- [ ] Migration 306 content copied
- [ ] Migration executed successfully
- [ ] Table verification passed
- [ ] Functions verification passed
- [ ] Indexes verification passed
- [ ] RLS policy verification passed
- [ ] Comprehensive verification passed
- [ ] Functional testing completed
- [ ] Screenshots captured
- [ ] Deployment documented
- [ ] Team notified
- [ ] Task 1.3 marked complete

---

**End of Migration 306 Deployment Instructions**

For questions or issues, refer to the troubleshooting section or contact the development team.
