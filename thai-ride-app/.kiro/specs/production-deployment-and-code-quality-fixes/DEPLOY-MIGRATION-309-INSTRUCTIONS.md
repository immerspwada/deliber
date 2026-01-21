# 🚀 Migration 309 Deployment Instructions

## Task 1.5: Deploy Migration 309 (Fix get_admin_customers)

**Status:** Ready for Manual Deployment  
**Migration File:** `supabase/migrations_backup/309_fix_get_admin_customers_status.sql`  
**Production URL:** `https://onsflqhkgqhydeupiqyt.supabase.co`  
**Estimated Time:** 3-5 minutes  
**Requirements:** 1.3, 1.4, 1.5

---

## 📋 Overview

Migration 309 fixes the `get_admin_customers` RPC function to correctly use the `profiles.status` column for customer suspension filtering. This is a critical fix that ensures the admin panel displays accurate customer status information.

**What This Migration Does:**

1. ✅ Drops the existing `get_admin_customers` function
2. ✅ Recreates `get_admin_customers` with correct status column reference
3. ✅ Uses `profiles.status` instead of non-existent column
4. ✅ Maintains all existing functionality (search, filters, pagination)
5. ✅ Preserves admin role security checks
6. ✅ Returns suspension metadata (reason, date, admin)

**Key Fix:**

- **Before:** Function referenced non-existent status column
- **After:** Function correctly uses `profiles.status` from migration 308

---

## ⚠️ Prerequisites

Before starting deployment, ensure you have:

### Required Access

- [ ] Supabase Dashboard access to production project
- [ ] Admin user credentials (`superadmin@gobear.app`)
- [ ] Production project ID: `onsflqhkgqhydeupiqyt`

### Required Files

- [ ] Migration file: `supabase/migrations_backup/309_fix_get_admin_customers_status.sql`
- [ ] Verification script: `verify-rpc-functions.sql`

### Pre-Deployment Checks

- [ ] **CRITICAL:** Migration 308 must be deployed first

  ```sql
  -- Verify profiles.status column exists
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'profiles' AND column_name = 'status';
  -- Expected: 1 row
  ```

- [ ] Create database backup via Supabase Dashboard
  - Navigate to: Dashboard → Database → Backups
  - Click "Create backup"
  - Wait for completion
  - **Backup timestamp:** **\*\***\_\_\_\_**\*\***

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

### Step 2: Copy Migration 309 Content

1. **Open Migration File**
   - File location: `supabase/migrations_backup/309_fix_get_admin_customers_status.sql`
   - Open in your code editor

2. **Copy Entire Content**
   - Select all (Ctrl+A / Cmd+A)
   - Copy (Ctrl+C / Cmd+C)
   - **Verify:** Content starts with `BEGIN;` and ends with `COMMIT;`

3. **Review Migration Content**
   - Ensure no syntax errors
   - Verify all sections are present:
     - DROP FUNCTION IF EXISTS get_admin_customers
     - CREATE OR REPLACE FUNCTION get_admin_customers
     - GRANT EXECUTE
     - COMMENT ON FUNCTION

---

### Step 3: Execute Migration

1. **Paste into SQL Editor**
   - Click in the SQL Editor text area
   - Paste (Ctrl+V / Cmd+V)
   - **Verify:** All content pasted correctly

2. **Review Before Execution**
   - Scroll through the SQL
   - Check for any obvious issues
   - Ensure it's the correct migration (309)
   - **Note:** This migration drops and recreates the function

3. **Execute Migration**
   - Click "Run" button (bottom right)
   - Or press Ctrl+Enter / Cmd+Enter
   - Wait for execution (approximately 1-2 seconds)

4. **Check Execution Status**
   - Look for success message in output panel
   - Should see: "Success. No rows returned."

**Expected Output:**

```
✅ DROP FUNCTION
✅ CREATE FUNCTION
✅ GRANT EXECUTE
✅ COMMENT
```

**📸 Screenshot:** Take screenshot of successful execution

---

### Step 4: Immediate Verification

Run these verification queries in a **new SQL Editor tab**:

#### 4.1 Verify Function Exists

```sql
-- Check if get_admin_customers function exists
SELECT
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_admin_customers';
-- Expected: 1 row
```

**Expected Result:**

```
routine_name         | routine_type | return_type
---------------------+--------------+-------------
get_admin_customers  | FUNCTION     | TABLE
```

---

#### 4.2 Verify Function Parameters

```sql
-- Check function signature
SELECT
  routine_name,
  parameter_name,
  data_type,
  parameter_default
FROM information_schema.parameters
WHERE specific_schema = 'public'
AND routine_name = 'get_admin_customers'
ORDER BY ordinal_position;
-- Expected: 4 parameters
```

**Expected Result:**

```
routine_name         | parameter_name | data_type        | parameter_default
---------------------+----------------+------------------+-------------------
get_admin_customers  | p_search_term  | text             | NULL::text
get_admin_customers  | p_status       | text             | NULL::text
get_admin_customers  | p_limit        | integer          | 20
get_admin_customers  | p_offset       | integer          | 0
```

---

#### 4.3 Verify Function Returns Correct Columns

```sql
-- Test function execution (should return customer list or empty)
SELECT * FROM get_admin_customers(
  NULL,  -- search_term
  NULL,  -- status_filter
  5,     -- limit
  0      -- offset
) LIMIT 1;
-- Expected: Returns table with correct columns
```

**Expected Columns:**

- id (UUID)
- email (TEXT)
- full_name (TEXT)
- phone_number (TEXT)
- status (TEXT) ← **This is the fixed column**
- wallet_balance (NUMERIC)
- total_orders (BIGINT)
- total_spent (NUMERIC)
- average_rating (NUMERIC)
- created_at (TIMESTAMPTZ)
- last_order_at (TIMESTAMPTZ)
- suspension_reason (TEXT)
- suspended_at (TIMESTAMPTZ)
- suspended_by (UUID)

---

#### 4.4 Test Status Filtering

```sql
-- Test filtering by status (should work now)
SELECT
  id,
  email,
  full_name,
  status
FROM get_admin_customers(
  NULL,      -- search_term
  'active',  -- status_filter
  10,        -- limit
  0          -- offset
);
-- Expected: Returns only active customers
```

**Expected:** Function executes without errors, returns customers with status = 'active'

---

#### 4.5 Test Search Functionality

```sql
-- Test search by email/name/phone
SELECT
  id,
  email,
  full_name,
  phone_number,
  status
FROM get_admin_customers(
  'test',  -- search_term (searches email, name, phone)
  NULL,    -- status_filter
  10,      -- limit
  0        -- offset
);
-- Expected: Returns customers matching 'test' in email/name/phone
```

**Expected:** Function executes without errors, returns matching customers

**📸 Screenshot:** Take screenshot of all verification results

---

### Step 5: Comprehensive Verification

Run the complete verification script:

```sql
-- Comprehensive verification for Migration 309
SELECT
  '✅ Migration 309 Verification' as check_name,
  'Starting verification...' as status;

-- 1. Function exists
SELECT
  '1. Function: get_admin_customers' as check_name,
  CASE
    WHEN COUNT(*) = 1 THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_admin_customers';

-- 2. Function has correct parameters
SELECT
  '2. Function Parameters (4 total)' as check_name,
  CASE
    WHEN COUNT(*) = 4 THEN '✅ CORRECT'
    ELSE '❌ INCORRECT: ' || COUNT(*)::text
  END as status
FROM information_schema.parameters
WHERE specific_schema = 'public'
AND routine_name = 'get_admin_customers';

-- 3. Function has EXECUTE permission
SELECT
  '3. Function Permissions' as check_name,
  CASE
    WHEN COUNT(*) >= 1 THEN '✅ GRANTED'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
AND routine_name = 'get_admin_customers'
AND grantee = 'authenticated';

-- 4. profiles.status column exists (dependency)
SELECT
  '4. Dependency: profiles.status' as check_name,
  CASE
    WHEN COUNT(*) = 1 THEN '✅ EXISTS'
    ELSE '❌ MISSING (Migration 308 not deployed!)'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
AND column_name = 'status';

-- 5. Test function execution
SELECT
  '5. Function Execution Test' as check_name,
  CASE
    WHEN (
      SELECT COUNT(*) >= 0 FROM get_admin_customers(NULL, NULL, 1, 0)
    ) >= 0 THEN '✅ CALLABLE'
    ELSE '❌ ERROR'
  END as status;

-- Summary
SELECT
  '═══════════════════════════════' as separator,
  'MIGRATION 309 VERIFICATION' as title,
  '═══════════════════════════════' as separator2
UNION ALL
SELECT
  '',
  CASE
    WHEN (
      SELECT COUNT(*) FROM information_schema.routines
      WHERE routine_name = 'get_admin_customers'
    ) = 1
    AND (
      SELECT COUNT(*) FROM information_schema.parameters
      WHERE routine_name = 'get_admin_customers'
    ) = 4
    AND (
      SELECT COUNT(*) FROM information_schema.columns
      WHERE table_name = 'profiles' AND column_name = 'status'
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

Migration 309 is successfully deployed when:

- [x] Function `get_admin_customers` exists
- [x] Function has 4 parameters (p_search_term, p_status, p_limit, p_offset)
- [x] Function returns 14 columns including `status`
- [x] Function correctly references `profiles.status` column
- [x] Function has EXECUTE permission for authenticated users
- [x] Function executes without errors
- [x] Status filtering works correctly ('active', 'suspended', 'banned')
- [x] Search functionality works (email, name, phone)
- [x] Pagination works (limit, offset)
- [x] All verification queries pass
- [x] No SQL errors during execution

---

## 🧪 Functional Testing

After successful deployment, test the function with various scenarios:

### Test 1: Get All Customers (No Filters)

```sql
-- Should return all customers with pagination
SELECT
  id,
  email,
  full_name,
  status,
  total_orders,
  wallet_balance
FROM get_admin_customers(NULL, NULL, 20, 0)
ORDER BY created_at DESC;
```

**Expected:** Returns up to 20 customers with all data

---

### Test 2: Filter by Active Status

```sql
-- Should return only active customers
SELECT
  id,
  email,
  status
FROM get_admin_customers(NULL, 'active', 10, 0)
WHERE status = 'active';
```

**Expected:** All returned rows have status = 'active'

---

### Test 3: Filter by Suspended Status

```sql
-- Should return only suspended customers
SELECT
  id,
  email,
  status,
  suspension_reason,
  suspended_at,
  suspended_by
FROM get_admin_customers(NULL, 'suspended', 10, 0)
WHERE status = 'suspended';
```

**Expected:** All returned rows have status = 'suspended' with suspension metadata

---

### Test 4: Search by Email

```sql
-- Should return customers matching email pattern
SELECT
  id,
  email,
  full_name,
  status
FROM get_admin_customers('gmail', NULL, 10, 0);
```

**Expected:** Returns customers with 'gmail' in their email

---

### Test 5: Combined Search and Filter

```sql
-- Should return active customers matching search term
SELECT
  id,
  email,
  full_name,
  status
FROM get_admin_customers('test', 'active', 10, 0);
```

**Expected:** Returns active customers with 'test' in email/name/phone

---

### Test 6: Pagination

```sql
-- Page 1
SELECT COUNT(*) as page1_count
FROM get_admin_customers(NULL, NULL, 10, 0);

-- Page 2
SELECT COUNT(*) as page2_count
FROM get_admin_customers(NULL, NULL, 10, 10);
```

**Expected:** Both queries return results (or 0 if not enough data)

---

### Test 7: Verify Admin Role Check

```sql
-- This should succeed if you're logged in as admin
SELECT
  id,
  email,
  role
FROM profiles
WHERE id = auth.uid();
-- Expected: role = 'admin'

-- Then test function
SELECT COUNT(*) FROM get_admin_customers(NULL, NULL, 1, 0);
-- Expected: Returns count (function allows admin access)
```

**Expected:** Function executes successfully (you have admin access)

---

### Test 8: Verify Aggregated Data

```sql
-- Check that aggregated statistics are calculated correctly
SELECT
  id,
  email,
  total_orders,
  total_spent,
  average_rating,
  last_order_at
FROM get_admin_customers(NULL, NULL, 5, 0)
WHERE total_orders > 0;
```

**Expected:** Returns customers with order statistics

---

## 📊 Record Deployment

Document the deployment:

**Deployment Record:**

```
Migration: 309_fix_get_admin_customers_status.sql
Deployed By: [Your Name]
Deployment Date: [YYYY-MM-DD]
Deployment Time: [HH:MM]
Duration: [Minutes]
Status: ✅ SUCCESS / ❌ FAILED
Issues Encountered: [None / List issues]
Verification Status: ✅ ALL PASSED / ❌ SOME FAILED
Screenshots Saved: [Yes / No]
Dependencies: Migration 308 (profiles.status column)
```

---

## 🔄 Rollback Procedure (If Needed)

If deployment fails or issues are discovered, rollback using:

```sql
-- Rollback Migration 309
BEGIN;

-- Drop the fixed function
DROP FUNCTION IF EXISTS public.get_admin_customers(TEXT, TEXT, INT, INT);

-- Optionally restore previous version (if you have it backed up)
-- Note: The previous version had bugs, so rollback is not recommended
-- Instead, fix forward by correcting the function

COMMIT;
```

**⚠️ WARNING:**

- Rollback will remove the function entirely
- The previous version had bugs (referenced non-existent column)
- **Recommended:** Fix forward instead of rolling back
- If you must rollback, the admin customers view will not work

**Before Rollback:** Consider fixing forward instead:

1. Identify the issue
2. Create a new migration (310) with the fix
3. Deploy the fix migration

---

## 🐛 Troubleshooting

### Issue: "Column 'status' does not exist"

**Cause:** Migration 308 was not deployed first

**Solution:**

1. Verify migration 308 is deployed:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'profiles' AND column_name = 'status';
   ```
2. If column doesn't exist, deploy migration 308 first
3. Then re-run migration 309

---

### Issue: "Function does not exist"

**Cause:** Migration didn't execute successfully

**Solution:**

1. Check SQL Editor output for errors
2. Re-run migration
3. Verify function exists:
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name = 'get_admin_customers';
   ```

---

### Issue: "Access denied. Admin privileges required."

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

### Issue: "Function returns no data"

**Cause:** No customers exist in database, or all filtered out

**Solution:**

1. Check if customers exist:
   ```sql
   SELECT COUNT(*) FROM profiles WHERE role = 'customer';
   ```
2. If count is 0, this is expected (no customers yet)
3. If count > 0 but function returns nothing, check filters:
   ```sql
   -- Try without filters
   SELECT * FROM get_admin_customers(NULL, NULL, 10, 0);
   ```

---

### Issue: "Status filter not working"

**Cause:** Status values don't match expected values

**Solution:**

1. Check actual status values in database:
   ```sql
   SELECT DISTINCT status FROM profiles WHERE role = 'customer';
   ```
2. Use correct status values: 'active', 'suspended', 'banned'
3. Status is case-sensitive

---

### Issue: "Search returns no results"

**Cause:** Search term doesn't match any customers

**Solution:**

1. Verify customers exist:
   ```sql
   SELECT email, full_name, phone_number FROM profiles WHERE role = 'customer' LIMIT 5;
   ```
2. Try broader search term
3. Search is case-insensitive (ILIKE)
4. Search checks email, full_name, and phone_number

---

## 📝 Next Steps

After successful deployment of Migration 309:

1. ✅ Mark task 1.5 as complete
2. ✅ Update deployment documentation
3. ✅ Notify team of successful deployment
4. ✅ Proceed to task 1.6 (Verify dual-role system integrity)
5. ✅ Test admin customers view in production UI
6. ✅ Verify status filtering works in admin panel
7. ✅ Monitor error logs for 24 hours
8. ✅ Verify search functionality in admin panel

---

## 📚 Related Documentation

- **Full Deployment Guide:** `DEPLOYMENT-GUIDE.md`
- **Verification Guide:** `VERIFICATION-GUIDE.md`
- **Migration File:** `supabase/migrations_backup/309_fix_get_admin_customers_status.sql`
- **Test Scripts:** `test-function-calls.sql`, `verify-rpc-functions.sql`
- **Related Migrations:**
  - Migration 308 (Customer Suspension System - prerequisite)
  - Migration 306 (Admin Order Reassignment)
- **Feature Documentation:** `.kiro/specs/admin-customer-suspension/README.md`

---

## 🔍 What This Migration Fixes

### Before Migration 309:

```sql
-- Old function (BROKEN)
CREATE FUNCTION get_admin_customers(...)
RETURNS TABLE (..., status TEXT, ...)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ...,
    p.status,  -- ❌ Column didn't exist!
    ...
  FROM profiles p
  WHERE ...
END;
$$;
```

**Problem:** Function referenced `profiles.status` column that didn't exist until migration 308

**Symptoms:**

- Admin customers view showed errors
- Status filtering didn't work
- Suspension information not displayed

---

### After Migration 309:

```sql
-- New function (FIXED)
CREATE FUNCTION get_admin_customers(...)
RETURNS TABLE (..., status TEXT, ...)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ...,
    COALESCE(p.status, 'active')::TEXT as status,  -- ✅ Correctly uses profiles.status
    ...
  FROM profiles p
  WHERE ...
    AND (p_status IS NULL OR COALESCE(p.status, 'active') = p_status)  -- ✅ Status filtering works
END;
$$;
```

**Improvements:**

- ✅ Function uses correct `profiles.status` column
- ✅ Status filtering works ('active', 'suspended', 'banned')
- ✅ Defaults to 'active' if status is NULL
- ✅ Returns suspension metadata (reason, date, admin)
- ✅ Admin customers view works correctly
- ✅ Search and pagination maintained

---

## 🎯 Impact on Admin Panel

This migration enables the following admin panel features:

### Customer Management View

- ✅ Display customer status badges (Active/Suspended/Banned)
- ✅ Filter customers by status
- ✅ View suspension details (reason, date, admin)
- ✅ Search customers by email/name/phone
- ✅ Paginate through customer list

### Customer Suspension Workflow

1. Admin views customer list with status
2. Admin can filter by suspended customers
3. Admin can see suspension reason and date
4. Admin can identify who suspended the customer
5. Admin can search for specific customers

### Data Displayed

- Customer basic info (email, name, phone)
- Account status (active/suspended/banned)
- Wallet balance
- Order statistics (total orders, total spent, average rating)
- Last order date
- Suspension metadata (if suspended)

---

## ✅ Deployment Checklist

Use this checklist to track your progress:

- [ ] Prerequisites verified
- [ ] Migration 308 deployed (profiles.status exists)
- [ ] Database backup created
- [ ] SQL Editor accessed
- [ ] Migration 309 content copied
- [ ] Migration executed successfully
- [ ] Function exists verification passed
- [ ] Function parameters verification passed
- [ ] Function execution test passed
- [ ] Status filtering test passed
- [ ] Search functionality test passed
- [ ] Comprehensive verification passed
- [ ] Functional testing completed (8 tests)
- [ ] Screenshots captured
- [ ] Deployment documented
- [ ] Team notified
- [ ] Task 1.5 marked complete

---

## 🔗 Migration Dependencies

```
Migration 308 (Customer Suspension System)
    ↓
    Creates: profiles.status column
    Creates: profiles.suspension_reason column
    Creates: profiles.suspended_at column
    Creates: profiles.suspended_by column
    ↓
Migration 309 (Fix get_admin_customers) ← YOU ARE HERE
    ↓
    Uses: profiles.status for filtering
    Uses: profiles.suspension_* for metadata
    ↓
Admin Panel Customer View
    ↓
    Displays: Customer status
    Filters: By status
    Shows: Suspension details
```

**Critical:** Migration 308 MUST be deployed before migration 309!

---

**End of Migration 309 Deployment Instructions**

For questions or issues, refer to the troubleshooting section or contact the development team.
