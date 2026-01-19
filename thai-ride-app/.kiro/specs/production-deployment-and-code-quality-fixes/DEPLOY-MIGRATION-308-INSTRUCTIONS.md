# 🚀 Migration 308 Deployment Instructions

## Task 1.4: Deploy Migration 308 (Customer Suspension System)

**Status:** Ready for Manual Deployment  
**Migration File:** `supabase/migrations_backup/308_customer_suspension_system_production_ready.sql`  
**Production URL:** `https://onsflqhkgqhydeupiqyt.supabase.co`  
**Estimated Time:** 5-10 minutes  
**Requirements:** 1.2, 1.4, 1.5

---

## 📋 Overview

Migration 308 implements the Customer Suspension System, which allows administrators to:

- Suspend customer accounts with reason tracking
- Unsuspend customer accounts
- Track suspension history with full audit trail
- Prevent suspended customers from accessing the system
- Protect admin and provider accounts from suspension

**What This Migration Creates:**

1. ✅ 4 new columns in `profiles` table (status, suspension_reason, suspended_at, suspended_by)
2. ✅ `suspend_customer_account()` function (admin-only suspension)
3. ✅ `unsuspend_customer_account()` function (admin-only unsuspension)
4. ✅ 3 performance indexes
5. ✅ 2 RLS policies for customer access control
6. ✅ Role-based protection (customers only, not admins/providers)

---

## ⚠️ Prerequisites

Before starting deployment, ensure you have:

### Required Access

- [ ] Supabase Dashboard access to production project
- [ ] Admin user credentials (`superadmin@gobear.app`)
- [ ] Production project ID: `onsflqhkgqhydeupiqyt`

### Required Files

- [ ] Migration file: `supabase/migrations_backup/308_customer_suspension_system_production_ready.sql`
- [ ] Verification script: `verify-rpc-functions.sql`

### Pre-Deployment Checks

- [ ] Create database backup via Supabase Dashboard
  - Navigate to: Dashboard → Database → Backups
  - Click "Create backup"
  - Wait for completion
  - **Backup timestamp:** ********\_********

- [ ] Verify you're on production environment

  ```
  URL: https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt
  ```

- [ ] Confirm admin role

  ```sql
  SELECT id, email, role FROM profiles WHERE id = auth.uid();
  -- Expected: role = 'admin'
  ```

- [ ] Verify profiles table exists
  ```sql
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_name = 'profiles';
  -- Expected: 1
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

### Step 2: Copy Migration 308 Content

1. **Open Migration File**
   - File location: `supabase/migrations_backup/308_customer_suspension_system_production_ready.sql`
   - Open in your code editor

2. **Copy Entire Content**
   - Select all (Ctrl+A / Cmd+A)
   - Copy (Ctrl+C / Cmd+C)
   - **Verify:** Content starts with `BEGIN;` and ends with `COMMIT;`

3. **Review Migration Content**
   - Ensure no syntax errors
   - Verify all sections are present:
     - ALTER TABLE profiles (add 4 columns)
     - CREATE INDEX (3 indexes)
     - CREATE FUNCTION suspend_customer_account
     - CREATE FUNCTION unsuspend_customer_account
     - CREATE POLICY (2 RLS policies)
     - GRANT EXECUTE
     - COMMENT statements

---

### Step 3: Execute Migration

1. **Paste into SQL Editor**
   - Click in the SQL Editor text area
   - Paste (Ctrl+V / Cmd+V)
   - **Verify:** All content pasted correctly

2. **Review Before Execution**
   - Scroll through the SQL
   - Check for any obvious issues
   - Ensure it's the correct migration (308)
   - **IMPORTANT:** This migration uses `DO $` blocks for safe column additions

3. **Execute Migration**
   - Click "Run" button (bottom right)
   - Or press Ctrl+Enter / Cmd+Enter
   - Wait for execution (approximately 3-5 seconds)

4. **Check Execution Status**
   - Look for success message in output panel
   - Should see: "Success. No rows returned."
   - Or: Multiple "Success" messages for each statement

**Expected Output:**

```
✅ DO (column additions)
✅ CREATE INDEX
✅ CREATE INDEX
✅ CREATE INDEX
✅ CREATE FUNCTION (suspend_customer_account)
✅ CREATE FUNCTION (unsuspend_customer_account)
✅ CREATE POLICY (customer_suspended_blocked)
✅ CREATE POLICY (customer_suspended_no_update)
✅ GRANT EXECUTE
✅ GRANT EXECUTE
✅ COMMENT (multiple)
```

**📸 Screenshot:** Take screenshot of successful execution

---

### Step 4: Immediate Verification

Run these verification queries in a **new SQL Editor tab**:

#### 4.1 Verify Columns Added

```sql
-- Check if all 4 new columns exist in profiles table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
AND column_name IN ('status', 'suspension_reason', 'suspended_at', 'suspended_by')
ORDER BY column_name;
-- Expected: 4 rows
```

**Expected Result:**

```
column_name        | data_type                   | is_nullable | column_default
-------------------+-----------------------------+-------------+----------------
status             | character varying           | YES         | 'active'::character varying
suspended_at       | timestamp with time zone    | YES         | NULL
suspended_by       | uuid                        | YES         | NULL
suspension_reason  | text                        | YES         | NULL
```

---

#### 4.2 Verify Functions Created

```sql
-- Check if both suspension functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'suspend_customer_account',
  'unsuspend_customer_account'
)
ORDER BY routine_name;
-- Expected: 2 rows
```

**Expected Result:**

```
routine_name              | routine_type
--------------------------+-------------
suspend_customer_account  | FUNCTION
unsuspend_customer_account| FUNCTION
```

---

#### 4.3 Verify Indexes Created

```sql
-- Check if all 3 indexes exist on profiles table
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'profiles'
AND indexname IN (
  'idx_profiles_status',
  'idx_profiles_suspended_by',
  'idx_profiles_role_status'
)
ORDER BY indexname;
-- Expected: 3 rows
```

**Expected Result:**

```
indexname
---------------------------------
idx_profiles_role_status
idx_profiles_status
idx_profiles_suspended_by
```

---

#### 4.4 Verify RLS Policies Created

```sql
-- Check if both RLS policies exist
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles'
AND policyname IN (
  'customer_suspended_blocked',
  'customer_suspended_no_update'
);
-- Expected: 2 rows
```

**Expected Result:**

```
policyname                    | cmd
------------------------------+--------
customer_suspended_blocked    | SELECT
customer_suspended_no_update  | UPDATE
```

---

#### 4.5 Verify Column Constraints

```sql
-- Check status column constraint
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
AND conname LIKE '%status%';
-- Expected: 1 row with CHECK constraint
```

**Expected Result:**

```
constraint_name              | constraint_definition
-----------------------------+-----------------------------------------------
profiles_status_check        | CHECK ((status)::text = ANY (ARRAY[('active'::character varying)::text, ('suspended'::character varying)::text, ('banned'::character varying)::text]))
```

**📸 Screenshot:** Take screenshot of all verification results

---

### Step 5: Comprehensive Verification

Run the complete verification script:

```sql
-- Comprehensive verification for Migration 308
SELECT
  '✅ Migration 308 Verification' as check_name,
  'Starting verification...' as status;

-- 1. Columns exist
SELECT
  '1. Columns (4 total)' as check_name,
  CASE
    WHEN COUNT(*) = 4 THEN '✅ ALL EXIST'
    ELSE '❌ MISSING: ' || (4 - COUNT(*))::text
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
AND column_name IN ('status', 'suspension_reason', 'suspended_at', 'suspended_by');

-- 2. Functions exist
SELECT
  '2. Functions (2 total)' as check_name,
  CASE
    WHEN COUNT(*) = 2 THEN '✅ ALL EXIST'
    ELSE '❌ MISSING: ' || (2 - COUNT(*))::text
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'suspend_customer_account',
  'unsuspend_customer_account'
);

-- 3. Indexes exist
SELECT
  '3. Indexes (3 total)' as check_name,
  CASE
    WHEN COUNT(*) >= 3 THEN '✅ ALL EXIST'
    ELSE '❌ MISSING: ' || (3 - COUNT(*))::text
  END as status
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'profiles'
AND indexname IN (
  'idx_profiles_status',
  'idx_profiles_suspended_by',
  'idx_profiles_role_status'
);

-- 4. RLS policies exist
SELECT
  '4. RLS Policies (2 total)' as check_name,
  CASE
    WHEN COUNT(*) = 2 THEN '✅ ALL EXIST'
    ELSE '❌ MISSING: ' || (2 - COUNT(*))::text
  END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles'
AND policyname IN (
  'customer_suspended_blocked',
  'customer_suspended_no_update'
);

-- 5. Status column constraint
SELECT
  '5. Status Column Constraint' as check_name,
  CASE
    WHEN COUNT(*) >= 1 THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
AND conname LIKE '%status%'
AND contype = 'c';

-- 6. Function permissions
SELECT
  '6. Function Permissions' as check_name,
  CASE
    WHEN COUNT(*) = 2 THEN '✅ ALL GRANTED'
    ELSE '❌ MISSING: ' || (2 - COUNT(*))::text
  END as status
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
AND routine_name IN (
  'suspend_customer_account',
  'unsuspend_customer_account'
)
AND grantee = 'authenticated';

-- Summary
SELECT
  '═══════════════════════════════' as separator,
  'MIGRATION 308 VERIFICATION' as title,
  '═══════════════════════════════' as separator2
UNION ALL
SELECT
  '',
  CASE
    WHEN (
      SELECT COUNT(*) FROM information_schema.columns
      WHERE table_name = 'profiles'
      AND column_name IN ('status', 'suspension_reason', 'suspended_at', 'suspended_by')
    ) = 4
    AND (
      SELECT COUNT(*) FROM information_schema.routines
      WHERE routine_name IN ('suspend_customer_account', 'unsuspend_customer_account')
    ) = 2
    AND (
      SELECT COUNT(*) FROM pg_indexes
      WHERE tablename = 'profiles'
      AND indexname IN ('idx_profiles_status', 'idx_profiles_suspended_by', 'idx_profiles_role_status')
    ) >= 3
    AND (
      SELECT COUNT(*) FROM pg_policies
      WHERE tablename = 'profiles'
      AND policyname IN ('customer_suspended_blocked', 'customer_suspended_no_update')
    ) = 2
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

Migration 308 is successfully deployed when:

- [x] Column `status` exists in profiles table with CHECK constraint
- [x] Column `suspension_reason` exists in profiles table
- [x] Column `suspended_at` exists in profiles table
- [x] Column `suspended_by` exists in profiles table with FK to profiles(id)
- [x] Function `suspend_customer_account` exists and is callable
- [x] Function `unsuspend_customer_account` exists and is callable
- [x] All 3 indexes created on profiles table
- [x] RLS policy `customer_suspended_blocked` exists
- [x] RLS policy `customer_suspended_no_update` exists
- [x] Both functions have EXECUTE permission for authenticated users
- [x] All verification queries pass
- [x] No SQL errors during execution

---

## 🧪 Functional Testing

After successful deployment, test the functions:

### Test 1: Verify Function Signatures

```sql
-- Check function parameters and return types
SELECT
  routine_name,
  data_type as return_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('suspend_customer_account', 'unsuspend_customer_account');
```

**Expected:** Both functions return `jsonb`

---

### Test 2: Test Suspend Function (Dry Run)

```sql
-- This will fail with "Customer not found" but proves function is callable
-- DO NOT use a real customer ID yet
SELECT suspend_customer_account(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Test suspension reason'
);
```

**Expected Error:** `Customer not found` (this is correct - proves function works)

---

### Test 3: Test Unsuspend Function (Dry Run)

```sql
-- This will fail with "Customer not found" but proves function is callable
-- DO NOT use a real customer ID yet
SELECT unsuspend_customer_account(
  '00000000-0000-0000-0000-000000000000'::uuid
);
```

**Expected Error:** `Customer not found` (this is correct - proves function works)

---

### Test 4: Verify Role Protection

```sql
-- Verify function checks admin role
-- This should succeed if you're logged in as admin
SELECT
  id,
  email,
  role,
  status
FROM profiles
WHERE role = 'customer'
LIMIT 1;
```

**Expected:** Returns customer data (you have admin access)

---

### Test 5: Verify Status Values

```sql
-- Check that status column accepts valid values
SELECT DISTINCT status
FROM profiles
WHERE status IS NOT NULL;
```

**Expected:** Returns 'active' (and possibly 'suspended' or 'banned' if any exist)

---

## 📊 Record Deployment

Document the deployment:

**Deployment Record:**

```
Migration: 308_customer_suspension_system_production_ready.sql
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
-- Rollback Migration 308
BEGIN;

-- 1. Drop RLS policies
DROP POLICY IF EXISTS "customer_suspended_blocked" ON public.profiles;
DROP POLICY IF EXISTS "customer_suspended_no_update" ON public.profiles;

-- 2. Drop functions
DROP FUNCTION IF EXISTS public.suspend_customer_account(UUID, TEXT);
DROP FUNCTION IF EXISTS public.unsuspend_customer_account(UUID);

-- 3. Drop indexes
DROP INDEX IF EXISTS public.idx_profiles_status;
DROP INDEX IF EXISTS public.idx_profiles_suspended_by;
DROP INDEX IF EXISTS public.idx_profiles_role_status;

-- 4. Remove columns (CAREFUL - this loses data!)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS status;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS suspension_reason;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS suspended_at;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS suspended_by;

COMMIT;
```

**⚠️ WARNING:** Rollback will lose all suspension history data!

**Before Rollback:** Export data if needed:

```sql
SELECT
  id,
  email,
  full_name,
  role,
  status,
  suspension_reason,
  suspended_at,
  suspended_by
FROM profiles
WHERE status = 'suspended' OR suspended_at IS NOT NULL
ORDER BY suspended_at DESC;
```

---

## 🐛 Troubleshooting

### Issue: "Column already exists"

**Cause:** Migration was partially run before

**Solution:**

1. Check which columns exist:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'profiles'
   AND column_name IN ('status', 'suspension_reason', 'suspended_at', 'suspended_by');
   ```
2. The migration uses `IF NOT EXISTS` checks, so it's safe to re-run
3. Re-execute the migration

---

### Issue: "Function does not exist"

**Cause:** Migration didn't execute successfully

**Solution:**

1. Check SQL Editor output for errors
2. Re-run migration
3. Verify function exists:
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name = 'suspend_customer_account';
   ```

---

### Issue: "Only admins can suspend customers"

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

### Issue: "Cannot suspend admin accounts"

**Cause:** Trying to suspend an admin user (this is correct behavior)

**Solution:**

- This is working as designed
- The function protects admin and provider accounts
- Only customer accounts can be suspended
- Verify target user is a customer:
  ```sql
  SELECT id, email, role FROM profiles WHERE id = '[target_user_id]';
  ```

---

### Issue: "Cannot suspend provider accounts"

**Cause:** Trying to suspend a provider user (this is correct behavior)

**Solution:**

- This is working as designed
- Providers have their own management system in `providers_v2` table
- Use provider-specific suspension mechanisms
- Only customer accounts can be suspended via this function

---

## 📝 Next Steps

After successful deployment of Migration 308:

1. ✅ Mark task 1.4 as complete
2. ✅ Update deployment documentation
3. ✅ Notify team of successful deployment
4. ✅ Proceed to task 1.5 (Deploy migration 309)
5. ✅ Monitor error logs for 24 hours
6. ✅ Test in production UI when frontend is deployed
7. ✅ Create admin UI for customer suspension management

---

## 📚 Related Documentation

- **Full Deployment Guide:** `DEPLOYMENT-GUIDE.md`
- **Verification Guide:** `VERIFICATION-GUIDE.md`
- **Migration File:** `supabase/migrations_backup/308_customer_suspension_system_production_ready.sql`
- **Test Scripts:** `verify-rpc-functions.sql`
- **Feature Documentation:** `.kiro/specs/admin-customer-suspension/README.md`
- **3 Roles Impact:** `.kiro/specs/admin-customer-suspension/3-ROLES-IMPACT.md`

---

## 🎭 3-Role System Impact

This migration implements role-based suspension:

| Role     | Can Be Suspended? | Can Suspend Others? | Notes                                  |
| -------- | ----------------- | ------------------- | -------------------------------------- |
| Customer | ✅ Yes            | ❌ No               | Main target of suspension system       |
| Provider | ❌ No             | ❌ No               | Use providers_v2 management instead    |
| Admin    | ❌ No             | ✅ Yes              | Protected from suspension, can suspend |

**Key Protection Rules:**

- ✅ Customers can be suspended by admins
- ❌ Admins cannot be suspended (protected)
- ❌ Providers cannot be suspended via this system (use providers_v2)
- ✅ Suspended customers cannot access their data (RLS blocks)
- ✅ Suspended customers cannot update their profile (RLS blocks)
- ✅ Full audit trail (who suspended, when, why)

---

## ✅ Deployment Checklist

Use this checklist to track your progress:

- [ ] Prerequisites verified
- [ ] Database backup created
- [ ] SQL Editor accessed
- [ ] Migration 308 content copied
- [ ] Migration executed successfully
- [ ] Columns verification passed
- [ ] Functions verification passed
- [ ] Indexes verification passed
- [ ] RLS policies verification passed
- [ ] Constraints verification passed
- [ ] Comprehensive verification passed
- [ ] Functional testing completed
- [ ] Screenshots captured
- [ ] Deployment documented
- [ ] Team notified
- [ ] Task 1.4 marked complete

---

**End of Migration 308 Deployment Instructions**

For questions or issues, refer to the troubleshooting section or contact the development team.
