# 🚀 Production Deployment Guide - Manual Deployment via Supabase Dashboard

## Overview

This guide provides step-by-step instructions for manually deploying migrations 306, 308, and 309 to production using the Supabase Dashboard SQL Editor. This approach is necessary because Docker and MCP tools are not available in the production environment.

**Production Environment:**

- URL: `https://onsflqhkgqhydeupiqyt.supabase.co`
- Deployment Method: Manual via Supabase Dashboard
- Migrations to Deploy: 306, 308, 309

**Estimated Time:** 15-20 minutes

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Deployment Steps](#deployment-steps)
4. [Verification Procedures](#verification-procedures)
5. [Rollback Procedures](#rollback-procedures)
6. [Troubleshooting](#troubleshooting)
7. [Post-Deployment Tasks](#post-deployment-tasks)

---

## Prerequisites

### Required Access

- ✅ Supabase Dashboard access
- ✅ Admin user credentials (`superadmin@gobear.app`)
- ✅ Production project access (`onsflqhkgqhydeupiqyt`)

### Required Files

- ✅ `supabase/migrations/306_admin_order_reassignment_system.sql`
- ✅ `supabase/migrations/308_customer_suspension_system_production_ready.sql`
- ✅ `supabase/migrations/309_fix_get_admin_customers_status.sql`

### Verification Scripts

- ✅ `verify-deployment-complete.sql`
- ✅ `verify-rpc-functions.sql`
- ✅ `verify-rls-policies.sql`
- ✅ `test-function-calls.sql`

---

## Pre-Deployment Checklist

Before starting deployment, complete this checklist:

### Database Backup

- [ ] Create database backup via Supabase Dashboard
  - Navigate to: Dashboard → Database → Backups
  - Click "Create backup"
  - Wait for backup completion
  - Note backup timestamp: `_______________`

### Environment Verification

- [ ] Confirm production URL: `https://onsflqhkgqhydeupiqyt.supabase.co`
- [ ] Verify admin access: Login to Supabase Dashboard
- [ ] Check current migration status:
  ```sql
  SELECT version, name FROM supabase_migrations.schema_migrations
  ORDER BY version DESC LIMIT 10;
  ```

### Migration Files Ready

- [ ] Migration 306 file accessible
- [ ] Migration 308 file accessible
- [ ] Migration 309 file accessible
- [ ] Verification scripts accessible

### Team Notification

- [ ] Notify team of deployment window
- [ ] Schedule deployment during low-traffic period
- [ ] Have rollback plan ready

---

## Deployment Steps

### Step 1: Access Supabase Dashboard SQL Editor

1. **Open Supabase Dashboard**

   ```
   https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt
   ```

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query" button

3. **Prepare Editor**
   - Clear any existing queries
   - Ensure you're connected to production database

**Screenshot Location:** Take screenshot of SQL Editor interface

---

### Step 2: Deploy Migration 306 (Admin Order Reassignment System)

#### 2.1 Copy Migration Content

1. Open file: `supabase/migrations/306_admin_order_reassignment_system.sql`
2. Copy the entire file content (Ctrl+A, Ctrl+C)

#### 2.2 Execute Migration

1. Paste content into SQL Editor
2. Review the SQL to ensure it's correct
3. Click "Run" button (or press Ctrl+Enter)
4. Wait for execution to complete (approximately 2-3 seconds)

#### 2.3 Verify Success

Look for success indicators in the output:

```
✅ CREATE TABLE
✅ CREATE INDEX (3 indexes)
✅ ALTER TABLE
✅ CREATE POLICY
✅ CREATE FUNCTION (3 functions)
✅ GRANT EXECUTE
```

**Expected Output:**

```
Success. No rows returned.
```

#### 2.4 Immediate Verification

Run this query in a new SQL Editor tab:

```sql
-- Verify table created
SELECT COUNT(*) as table_exists
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'order_reassignments';
-- Expected: 1

-- Verify functions created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'reassign_order',
  'get_reassignment_history',
  'get_available_providers'
);
-- Expected: 3 rows

-- Test function execution
SELECT * FROM get_available_providers('ride', 5);
-- Expected: List of available providers (or empty if none)
```

**Screenshot Location:** Take screenshot of verification results

#### 2.5 Record Deployment

- [ ] Migration 306 deployed successfully
- [ ] Deployment timestamp: `_______________`
- [ ] Verification queries passed
- [ ] Screenshots saved

---

### Step 3: Deploy Migration 308 (Customer Suspension System)

#### 3.1 Copy Migration Content

1. Open file: `supabase/migrations/308_customer_suspension_system_production_ready.sql`
2. Copy the entire file content

#### 3.2 Execute Migration

1. Create new query in SQL Editor
2. Paste migration content
3. Review the SQL
4. Click "Run" button
5. Wait for execution to complete

#### 3.3 Verify Success

Look for success indicators:

```
✅ ALTER TABLE (4 columns added to profiles)
✅ CREATE INDEX (2 indexes)
✅ CREATE FUNCTION (2 functions)
✅ CREATE POLICY (2 policies)
✅ GRANT EXECUTE
```

#### 3.4 Immediate Verification

```sql
-- Verify columns added to profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
AND column_name IN ('status', 'suspension_reason', 'suspended_at', 'suspended_by');
-- Expected: 4 rows

-- Verify functions created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'suspend_customer_account',
  'unsuspend_customer_account'
);
-- Expected: 2 rows

-- Verify RLS policies
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles'
AND policyname LIKE '%suspend%';
-- Expected: 2 rows

-- Test function execution (dry run - don't actually suspend)
SELECT routine_name, data_type as return_type
FROM information_schema.routines
WHERE routine_name = 'suspend_customer_account';
-- Expected: 1 row showing function exists
```

**Screenshot Location:** Take screenshot of verification results

#### 3.5 Record Deployment

- [ ] Migration 308 deployed successfully
- [ ] Deployment timestamp: `_______________`
- [ ] Verification queries passed
- [ ] Screenshots saved

---

### Step 4: Deploy Migration 309 (Fix get_admin_customers Status)

#### 4.1 Copy Migration Content

1. Open file: `supabase/migrations/309_fix_get_admin_customers_status.sql`
2. Copy the entire file content

#### 4.2 Execute Migration

1. Create new query in SQL Editor
2. Paste migration content
3. Review the SQL
4. Click "Run" button
5. Wait for execution to complete

#### 4.3 Verify Success

Look for success indicators:

```
✅ DROP FUNCTION (old version)
✅ CREATE FUNCTION (new version with status)
✅ GRANT EXECUTE
```

#### 4.4 Immediate Verification

```sql
-- Verify function updated
SELECT routine_name, routine_type, data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_admin_customers';
-- Expected: 1 row

-- Test function returns status column
SELECT * FROM get_admin_customers(
  p_page := 1,
  p_page_size := 5,
  p_search_query := NULL,
  p_status_filter := NULL
);
-- Expected: Customer list with status column (active/suspended)

-- Verify status values are correct
SELECT DISTINCT status
FROM (
  SELECT * FROM get_admin_customers(1, 100, NULL, NULL)
) AS customers;
-- Expected: 'active' and/or 'suspended'
```

**Screenshot Location:** Take screenshot of verification results

#### 4.5 Record Deployment

- [ ] Migration 309 deployed successfully
- [ ] Deployment timestamp: `_______________`
- [ ] Verification queries passed
- [ ] Screenshots saved

---

## Verification Procedures

### Comprehensive Verification Script

After deploying all three migrations, run the comprehensive verification:

#### Option 1: Run Complete Verification (Recommended)

1. Open new SQL Editor tab
2. Copy content from: `verify-deployment-complete.sql`
3. Paste and run
4. Review output for all checks

**Expected Output:**

```
✅ ALL CHECKS PASSED - DEPLOYMENT SUCCESSFUL

Summary:
- 6 RPC functions verified
- 1 new table created
- 4 columns added to profiles
- 3 RLS policies verified
- 5 indexes created
- Dual-role system intact
- All functions executable
```

#### Option 2: Run Individual Verification Scripts

If you prefer detailed verification, run each script separately:

**A. Verify RPC Functions**

```bash
File: verify-rpc-functions.sql
```

Expected: All 6 functions exist

- `reassign_order`
- `get_reassignment_history`
- `get_available_providers`
- `suspend_customer_account`
- `unsuspend_customer_account`
- `get_admin_customers`

**B. Verify RLS Policies**

```bash
File: verify-rls-policies.sql
```

Expected: All policies exist and are enabled

- `admin_full_access_reassignments` on order_reassignments
- `customer_suspended_blocked` on profiles
- `customer_suspended_no_update` on profiles

**C. Test Function Calls**

```bash
File: test-function-calls.sql
```

Expected: All functions execute without errors

**Screenshot Location:** Take screenshots of all verification results

---

### Dual-Role System Verification

Critical security check - verify the dual-role system is intact:

```sql
-- 1. Verify providers_v2.user_id column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'providers_v2'
AND column_name = 'user_id';
-- Expected: 1 row (uuid type)

-- 2. Verify RLS policies use dual-role pattern
SELECT tablename, policyname, definition
FROM pg_policies
WHERE schemaname = 'public'
AND definition LIKE '%providers_v2%user_id%auth.uid()%';
-- Expected: Multiple rows showing dual-role checks

-- 3. Verify storage policies use dual-role pattern
SELECT policyname, definition
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND definition LIKE '%providers_v2%user_id%';
-- Expected: Storage policies with dual-role checks
```

**Screenshot Location:** Take screenshot of dual-role verification

---

### Production UI Testing

After database verification, test the features in the production UI:

#### Test 1: Order Reassignment Feature

1. **Access Admin Panel**

   ```
   https://YOUR_PRODUCTION_DOMAIN/admin/orders
   ```

2. **Login as Admin**
   - Email: `superadmin@gobear.app`
   - Password: [Your admin password]

3. **Test Order Reassignment**
   - Find an order with status "matched" or "accepted"
   - Click the reassignment button (🔄)
   - Modal should open showing available providers
   - Select a different provider
   - Add reason (optional): "Testing deployment"
   - Click "Confirm Reassignment"
   - Verify success message appears
   - Verify order is reassigned to new provider

4. **Verify Audit Trail**

   ```sql
   SELECT * FROM order_reassignments
   ORDER BY created_at DESC
   LIMIT 5;
   ```

   - Should show your test reassignment

**Screenshot Location:** Take screenshots of:

- Order list with reassignment button
- Reassignment modal with provider list
- Success message
- Updated order details

#### Test 2: Customer Suspension Feature

1. **Access Admin Customers Page**

   ```
   https://YOUR_PRODUCTION_DOMAIN/admin/customers
   ```

2. **Test Suspend Customer**
   - Find an active customer (status: "active")
   - Click suspend button
   - Enter suspension reason: "Testing deployment"
   - Click "Confirm Suspension"
   - Verify success message
   - Verify customer status changes to "suspended"

3. **Verify Customer Cannot Create Rides**
   - Login as the suspended customer
   - Try to create a new ride request
   - Should see error: "Your account is suspended"

4. **Test Unsuspend Customer**
   - Return to admin panel
   - Find the suspended customer
   - Click unsuspend button
   - Verify success message
   - Verify customer status changes to "active"

5. **Verify Customer Can Create Rides Again**
   - Login as the customer
   - Try to create a new ride request
   - Should succeed

**Screenshot Location:** Take screenshots of:

- Customer list showing status
- Suspension modal
- Suspended customer error message
- Unsuspension success

#### Test 3: Customer List Status Display

1. **Access Admin Customers Page**
2. **Verify Status Column**
   - Should see "status" column in customer list
   - Values should be "active" or "suspended"
   - Status badges should have correct colors:
     - Active: Green badge
     - Suspended: Red badge

3. **Test Status Filter**
   - Use status filter dropdown
   - Select "Active" - should show only active customers
   - Select "Suspended" - should show only suspended customers
   - Select "All" - should show all customers

**Screenshot Location:** Take screenshots of:

- Customer list with status column
- Status filter in action

---

## Rollback Procedures

If any issues occur during or after deployment, follow these rollback procedures:

### When to Rollback

Rollback if you encounter:

- ❌ Migration execution errors
- ❌ Verification checks fail
- ❌ Critical functionality broken
- ❌ Data integrity issues
- ❌ Performance degradation

### Rollback Migration 309

**Impact:** Restores previous version of `get_admin_customers` function (without status column)

```sql
-- Rollback 309: Restore previous get_admin_customers function
DROP FUNCTION IF EXISTS public.get_admin_customers(INTEGER, INTEGER, TEXT, TEXT);

-- Recreate previous version (without status)
CREATE OR REPLACE FUNCTION public.get_admin_customers(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_search_query TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ,
  total_rides INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Previous implementation without status column
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    COALESCE(p.full_name, p.first_name || ' ' || p.last_name) as full_name,
    p.phone,
    p.created_at,
    COUNT(rr.id)::INTEGER as total_rides
  FROM profiles p
  LEFT JOIN ride_requests rr ON rr.customer_id = p.id
  WHERE p.role = 'customer'
  AND (p_search_query IS NULL OR
       p.email ILIKE '%' || p_search_query || '%' OR
       p.full_name ILIKE '%' || p_search_query || '%' OR
       p.phone ILIKE '%' || p_search_query || '%')
  GROUP BY p.id, p.email, p.full_name, p.first_name, p.last_name, p.phone, p.created_at
  ORDER BY p.created_at DESC
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_customers TO authenticated;
```

**Data Loss:** None (function only, no data affected)

---

### Rollback Migration 308

**Impact:** Removes customer suspension system

**⚠️ WARNING:** This will lose suspension history data!

```sql
-- Rollback 308: Remove customer suspension system

-- 1. Drop RLS policies
DROP POLICY IF EXISTS "customer_suspended_blocked" ON public.profiles;
DROP POLICY IF EXISTS "customer_suspended_no_update" ON public.profiles;

-- 2. Drop functions
DROP FUNCTION IF EXISTS public.suspend_customer_account(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.unsuspend_customer_account(UUID, TEXT);

-- 3. Drop indexes
DROP INDEX IF EXISTS public.idx_profiles_status;
DROP INDEX IF EXISTS public.idx_profiles_suspended_at;

-- 4. Remove columns from profiles table
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS suspension_reason,
  DROP COLUMN IF EXISTS suspended_at,
  DROP COLUMN IF EXISTS suspended_by;
```

**Data Loss:**

- ⚠️ All suspension history (status, reason, timestamps)
- ⚠️ Suspended customers will become active again

**Before Rollback:** Export suspension data if needed:

```sql
-- Export suspended customers
SELECT
  id,
  email,
  full_name,
  status,
  suspension_reason,
  suspended_at,
  suspended_by
FROM profiles
WHERE status = 'suspended';
```

---

### Rollback Migration 306

**Impact:** Removes order reassignment system

**⚠️ WARNING:** This will lose reassignment audit trail data!

```sql
-- Rollback 306: Remove order reassignment system

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
```

**Data Loss:**

- ⚠️ All order reassignment history
- ⚠️ Audit trail of who reassigned what and when

**Before Rollback:** Export reassignment data if needed:

```sql
-- Export reassignment history
SELECT
  r.id,
  r.order_id,
  r.order_type,
  r.old_provider_id,
  old_p.full_name as old_provider_name,
  r.new_provider_id,
  new_p.full_name as new_provider_name,
  r.reassigned_by,
  admin.email as admin_email,
  r.reason,
  r.notes,
  r.created_at
FROM order_reassignments r
LEFT JOIN providers_v2 old_p ON old_p.id = r.old_provider_id
LEFT JOIN providers_v2 new_p ON new_p.id = r.new_provider_id
LEFT JOIN profiles admin ON admin.id = r.reassigned_by
ORDER BY r.created_at DESC;
```

---

### Rollback All Migrations (Emergency)

If you need to rollback all three migrations:

```sql
-- Execute rollbacks in reverse order
-- 1. Rollback 309 (see above)
-- 2. Rollback 308 (see above)
-- 3. Rollback 306 (see above)
```

**After Rollback:**

1. Verify database is in stable state
2. Run verification queries to confirm rollback
3. Test admin panel functionality
4. Restore from backup if needed
5. Document issues encountered
6. Plan corrective actions

---

### Partial Rollback Strategy

If only one migration is problematic:

**Scenario 1: Migration 309 fails**

- Rollback only 309
- Keep 306 and 308 deployed
- Customer list won't show status, but other features work

**Scenario 2: Migration 308 fails**

- Rollback 308 and 309 (309 depends on 308)
- Keep 306 deployed
- Order reassignment works, suspension doesn't

**Scenario 3: Migration 306 fails**

- Rollback only 306
- Keep 308 and 309 deployed
- Suspension works, order reassignment doesn't

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Function does not exist" Error

**Symptoms:**

```
ERROR: function public.get_available_providers does not exist
```

**Causes:**

- Migration didn't execute successfully
- SQL syntax error in migration
- PostgREST cache not refreshed

**Solutions:**

1. **Verify function exists:**

   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name = 'get_available_providers';
   ```

2. **If function doesn't exist, re-run migration:**
   - Copy migration content again
   - Execute in SQL Editor
   - Check for error messages

3. **If function exists, refresh PostgREST cache:**
   - Wait 1-2 minutes for automatic refresh
   - Or restart PostgREST via Supabase Dashboard
   - Or use: `NOTIFY pgrst, 'reload schema'`

4. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear browser cache completely

---

#### Issue 2: "Only admins can..." Error

**Symptoms:**

```
ERROR: Only admins can view available providers
ERROR: Only admins can reassign orders
```

**Causes:**

- User doesn't have admin role
- Checking wrong table for role
- RLS policy blocking access

**Solutions:**

1. **Verify your role:**

   ```sql
   SELECT id, email, role FROM profiles WHERE id = auth.uid();
   ```

2. **If role is not 'admin', update it:**

   ```sql
   UPDATE profiles
   SET role = 'admin'
   WHERE id = auth.uid();
   ```

3. **Verify you're logged in:**

   ```sql
   SELECT auth.uid();
   -- Should return your user UUID, not NULL
   ```

4. **Check if profiles table exists:**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'profiles';
   ```

---

#### Issue 3: "Column does not exist" Error

**Symptoms:**

```
ERROR: column "status" does not exist
ERROR: column "suspension_reason" does not exist
```

**Causes:**

- Migration 308 didn't execute successfully
- ALTER TABLE statement failed
- Column name mismatch

**Solutions:**

1. **Verify columns exist:**

   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'public'
   AND table_name = 'profiles'
   AND column_name IN ('status', 'suspension_reason', 'suspended_at', 'suspended_by');
   ```

2. **If columns don't exist, re-run migration 308:**
   - Copy migration 308 content
   - Execute in SQL Editor
   - Verify success

3. **Check for constraint violations:**
   ```sql
   -- Check if there are any constraints blocking the ALTER TABLE
   SELECT constraint_name, constraint_type
   FROM information_schema.table_constraints
   WHERE table_schema = 'public'
   AND table_name = 'profiles';
   ```

---

#### Issue 4: "Table does not exist" Error

**Symptoms:**

```
ERROR: relation "order_reassignments" does not exist
```

**Causes:**

- Migration 306 didn't execute successfully
- CREATE TABLE statement failed
- Schema mismatch

**Solutions:**

1. **Verify table exists:**

   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'order_reassignments';
   ```

2. **If table doesn't exist, re-run migration 306:**
   - Copy migration 306 content
   - Execute in SQL Editor
   - Verify CREATE TABLE succeeds

3. **Check for naming conflicts:**
   ```sql
   -- Check if similar table exists
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name LIKE '%reassign%';
   ```

---

#### Issue 5: RLS Policy Violation

**Symptoms:**

```
ERROR: new row violates row-level security policy
ERROR: permission denied for table
```

**Causes:**

- RLS policy not created
- RLS policy too restrictive
- Dual-role system check failing

**Solutions:**

1. **Verify RLS is enabled:**

   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename IN ('order_reassignments', 'profiles');
   ```

2. **Verify policies exist:**

   ```sql
   SELECT tablename, policyname, cmd
   FROM pg_policies
   WHERE schemaname = 'public'
   AND tablename IN ('order_reassignments', 'profiles');
   ```

3. **Check dual-role system:**

   ```sql
   -- Verify providers_v2.user_id exists
   SELECT column_name FROM information_schema.columns
   WHERE table_schema = 'public'
   AND table_name = 'providers_v2'
   AND column_name = 'user_id';
   ```

4. **Test policy with specific user:**

   ```sql
   -- Set role to test user
   SET LOCAL ROLE authenticated;
   SET LOCAL request.jwt.claim.sub = 'USER_UUID_HERE';

   -- Try query
   SELECT * FROM order_reassignments LIMIT 1;

   -- Reset
   RESET ROLE;
   ```

---

#### Issue 6: Performance Issues After Deployment

**Symptoms:**

- Slow query execution
- High database CPU usage
- Timeout errors

**Causes:**

- Missing indexes
- Inefficient queries
- Large table scans

**Solutions:**

1. **Verify indexes were created:**

   ```sql
   SELECT indexname, tablename
   FROM pg_indexes
   WHERE schemaname = 'public'
   AND tablename IN ('order_reassignments', 'profiles');
   ```

2. **Check query execution plans:**

   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM get_available_providers('ride', 50);
   ```

3. **Monitor slow queries:**

   ```sql
   SELECT query, calls, total_exec_time, mean_exec_time
   FROM pg_stat_statements
   WHERE query LIKE '%get_available_providers%'
   OR query LIKE '%reassign_order%'
   ORDER BY mean_exec_time DESC;
   ```

4. **If indexes are missing, recreate them:**
   - Re-run the index creation part of the migration
   - Or manually create missing indexes

---

#### Issue 7: Dual-Role System Check Failed

**Symptoms:**

```
⚠️ WARNING: Dual-role system check failed
ERROR: column "user_id" does not exist in providers_v2
```

**Causes:**

- providers_v2 table missing user_id column
- Critical system architecture issue
- Previous migration not applied

**Solutions:**

1. **STOP DEPLOYMENT IMMEDIATELY** - This is critical!

2. **Verify providers_v2 structure:**

   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'public'
   AND table_name = 'providers_v2'
   ORDER BY ordinal_position;
   ```

3. **Check if user_id column exists:**

   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_schema = 'public'
   AND table_name = 'providers_v2'
   AND column_name = 'user_id';
   ```

4. **If user_id is missing, DO NOT PROCEED:**
   - This indicates a critical system issue
   - Contact development team immediately
   - Review provider system migrations
   - May need to apply earlier migrations first

5. **Verify dual-role architecture:**
   ```sql
   -- Check relationship between auth.users and providers_v2
   SELECT
     u.id as auth_user_id,
     u.email,
     p.id as provider_id,
     p.user_id
   FROM auth.users u
   LEFT JOIN providers_v2 p ON p.user_id = u.id
   WHERE u.email LIKE '%provider%'
   LIMIT 5;
   ```

**⚠️ CRITICAL:** Do not deploy migrations 306, 308, or 309 if dual-role system is broken!

---

#### Issue 8: Migration Execution Timeout

**Symptoms:**

```
ERROR: canceling statement due to statement timeout
```

**Causes:**

- Large table operations
- Slow database
- Network issues

**Solutions:**

1. **Increase statement timeout:**

   ```sql
   SET statement_timeout = '300s'; -- 5 minutes
   -- Then re-run migration
   ```

2. **Break migration into smaller parts:**
   - Execute CREATE TABLE separately
   - Execute CREATE INDEX separately
   - Execute CREATE FUNCTION separately

3. **Check database load:**
   - Navigate to Supabase Dashboard → Database → Performance
   - Check CPU and memory usage
   - Wait for lower load period

4. **Retry during off-peak hours:**
   - Schedule deployment during low-traffic period
   - Notify users of maintenance window

---

## Post-Deployment Tasks

### Immediate Tasks (Within 1 Hour)

#### 1. Monitor Error Logs

**Supabase Dashboard Logs:**

```
Dashboard → Logs → Postgres Logs
Dashboard → Logs → API Logs
```

**Look for:**

- ❌ Function execution errors
- ❌ RLS policy violations
- ❌ Permission denied errors
- ❌ Constraint violations

**Action:** If errors found, investigate immediately and consider rollback

---

#### 2. Monitor Performance Metrics

**Check:**

- Query execution times
- Database CPU usage
- Memory usage
- Connection count

**Acceptable Ranges:**

- Query time: < 500ms for most queries
- CPU usage: < 70%
- Memory usage: < 80%
- Connections: < 80% of max

**Action:** If metrics exceed thresholds, investigate slow queries

---

#### 3. Test Critical User Flows

**Admin Flows:**

- [ ] Login to admin panel
- [ ] View orders list
- [ ] Reassign an order
- [ ] View customers list
- [ ] Suspend a customer
- [ ] Unsuspend a customer
- [ ] View reassignment history

**Customer Flows:**

- [ ] Active customer can create rides
- [ ] Suspended customer cannot create rides
- [ ] Suspended customer sees appropriate error message

**Provider Flows:**

- [ ] Provider receives reassigned orders
- [ ] Provider can accept reassigned orders
- [ ] Provider notifications work

---

#### 4. Update TypeScript Types

If using TypeScript, regenerate database types:

```bash
# If you have Supabase CLI linked
npx supabase gen types --linked > src/types/database.ts

# Or manually via Supabase Dashboard
# Dashboard → API → Generate Types
```

**Verify types include:**

- `order_reassignments` table type
- New columns in `profiles` table
- Updated function signatures

---

### Short-Term Tasks (Within 24 Hours)

#### 5. Document Deployment

Create deployment record with:

- [ ] Deployment date and time
- [ ] Migrations deployed (306, 308, 309)
- [ ] Verification results
- [ ] Issues encountered and resolutions
- [ ] Screenshots of verification
- [ ] Team members involved

**Template:**

```markdown
# Deployment Record - [Date]

## Migrations Deployed

- Migration 306: Admin Order Reassignment System
- Migration 308: Customer Suspension System
- Migration 309: Fix get_admin_customers Status

## Deployment Time

- Start: [Time]
- End: [Time]
- Duration: [Minutes]

## Verification Results

- ✅ All RPC functions verified
- ✅ All RLS policies verified
- ✅ All indexes created
- ✅ Dual-role system intact
- ✅ UI testing passed

## Issues Encountered

[None / List issues and resolutions]

## Team Members

- Deployed by: [Name]
- Verified by: [Name]
- Approved by: [Name]
```

---

#### 6. Monitor User Feedback

**Channels to Monitor:**

- Support tickets
- User reports
- Admin panel usage
- Error tracking (Sentry, etc.)

**Look for:**

- Confusion about new features
- Unexpected behavior
- Performance complaints
- Feature requests

**Action:** Address issues promptly and document for future improvements

---

#### 7. Performance Baseline

Establish performance baselines for monitoring:

```sql
-- Query execution time baseline
SELECT
  routine_name,
  AVG(total_exec_time) as avg_time_ms,
  COUNT(*) as call_count
FROM pg_stat_statements
WHERE query LIKE '%get_available_providers%'
   OR query LIKE '%reassign_order%'
   OR query LIKE '%suspend_customer%'
GROUP BY routine_name;
```

**Record baselines:**

- `get_available_providers`: \_\_\_ ms
- `reassign_order`: \_\_\_ ms
- `suspend_customer_account`: \_\_\_ ms
- `get_admin_customers`: \_\_\_ ms

**Monitor:** Alert if execution time exceeds baseline by 50%

---

#### 8. Security Audit

Verify security measures are working:

**RLS Policies:**

```sql
-- Test that non-admin cannot access admin functions
-- (Run as non-admin user)
SELECT * FROM get_available_providers('ride', 5);
-- Should fail with "Only admins can view available providers"

-- Test that suspended customer cannot create rides
-- (Run as suspended customer)
INSERT INTO ride_requests (customer_id, pickup_lat, pickup_lng, ...)
VALUES (...);
-- Should fail with RLS policy violation
```

**Audit Logging:**

```sql
-- Verify all reassignments are logged
SELECT COUNT(*) FROM order_reassignments;
-- Should match number of reassignments performed

-- Verify suspension history is tracked
SELECT COUNT(*) FROM profiles WHERE suspended_at IS NOT NULL;
-- Should match number of suspensions
```

---

### Long-Term Tasks (Within 1 Week)

#### 9. Create Admin Training Materials

Document new features for admin users:

**Order Reassignment Guide:**

- When to reassign orders
- How to select appropriate provider
- Best practices for reassignment reasons
- How to view reassignment history

**Customer Suspension Guide:**

- When to suspend customers
- How to document suspension reasons
- How to handle suspension appeals
- How to unsuspend customers

---

#### 10. Set Up Monitoring Alerts

Configure alerts for:

**Error Rate Alerts:**

- Alert if function errors > 5% of calls
- Alert if RLS violations spike
- Alert if query timeouts increase

**Performance Alerts:**

- Alert if query time > 1 second
- Alert if database CPU > 80%
- Alert if connection pool exhausted

**Business Logic Alerts:**

- Alert if reassignments > 10 per hour (unusual)
- Alert if suspensions > 5 per hour (unusual)
- Alert if suspended customers attempt rides

---

#### 11. Plan Feature Enhancements

Based on initial usage, plan improvements:

**Potential Enhancements:**

- Bulk reassignment capability
- Automated reassignment rules
- Suspension appeal workflow
- Reassignment analytics dashboard
- Provider availability prediction
- Customer behavior analysis

**Gather Requirements:**

- Admin feedback on usability
- Provider feedback on reassignments
- Customer feedback on suspension process
- Performance optimization opportunities

---

## Deployment Checklist Summary

Use this checklist to track your deployment progress:

### Pre-Deployment

- [ ] Database backup created
- [ ] Production URL confirmed
- [ ] Admin access verified
- [ ] Migration files ready
- [ ] Verification scripts ready
- [ ] Team notified
- [ ] Rollback plan reviewed

### Migration 306 Deployment

- [ ] Migration 306 copied to SQL Editor
- [ ] Migration 306 executed successfully
- [ ] Table `order_reassignments` created
- [ ] 3 functions created
- [ ] 3 indexes created
- [ ] RLS policy created
- [ ] Immediate verification passed
- [ ] Screenshots saved

### Migration 308 Deployment

- [ ] Migration 308 copied to SQL Editor
- [ ] Migration 308 executed successfully
- [ ] 4 columns added to `profiles`
- [ ] 2 functions created
- [ ] 2 indexes created
- [ ] 2 RLS policies created
- [ ] Immediate verification passed
- [ ] Screenshots saved

### Migration 309 Deployment

- [ ] Migration 309 copied to SQL Editor
- [ ] Migration 309 executed successfully
- [ ] Function `get_admin_customers` updated
- [ ] Status column returned correctly
- [ ] Immediate verification passed
- [ ] Screenshots saved

### Comprehensive Verification

- [ ] `verify-deployment-complete.sql` executed
- [ ] All 6 RPC functions verified
- [ ] All RLS policies verified
- [ ] Dual-role system verified
- [ ] All indexes verified
- [ ] Function execution tests passed

### UI Testing

- [ ] Order reassignment tested
- [ ] Customer suspension tested
- [ ] Customer unsuspension tested
- [ ] Customer list status display tested
- [ ] All screenshots captured

### Post-Deployment

- [ ] Error logs monitored (1 hour)
- [ ] Performance metrics checked
- [ ] TypeScript types updated
- [ ] Deployment documented
- [ ] Team notified of completion
- [ ] User feedback channels monitored

---

## Success Criteria

Deployment is considered successful when ALL of the following are true:

### Database Level

✅ All 6 RPC functions exist and are callable
✅ Table `order_reassignments` exists with all columns
✅ Table `profiles` has 4 new suspension columns
✅ All 5 indexes created
✅ All 3 RLS policies exist and are enabled
✅ Dual-role system (providers_v2.user_id) is intact
✅ All verification queries pass

### Application Level

✅ Admin can view available providers
✅ Admin can reassign orders
✅ Admin can view reassignment history
✅ Admin can suspend customers
✅ Admin can unsuspend customers
✅ Customer list shows status correctly
✅ Suspended customers cannot create rides
✅ Active customers can create rides

### Performance Level

✅ Query execution times < 500ms
✅ Database CPU usage < 70%
✅ No timeout errors
✅ No RLS policy violations
✅ No function execution errors

### Security Level

✅ Only admins can access admin functions
✅ RLS policies enforce access control
✅ Dual-role system prevents unauthorized access
✅ Audit trail captures all actions
✅ Sensitive data is protected

---

## Quick Reference

### Essential SQL Queries

**Check Migration Status:**

```sql
SELECT version, name, inserted_at
FROM supabase_migrations.schema_migrations
WHERE version IN ('306', '308', '309')
ORDER BY version;
```

**Verify All Functions:**

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'reassign_order',
  'get_reassignment_history',
  'get_available_providers',
  'suspend_customer_account',
  'unsuspend_customer_account',
  'get_admin_customers'
)
ORDER BY routine_name;
```

**Check Your Admin Role:**

```sql
SELECT id, email, role FROM profiles WHERE id = auth.uid();
```

**Test Function Execution:**

```sql
-- Test get_available_providers
SELECT * FROM get_available_providers('ride', 5);

-- Test get_admin_customers
SELECT * FROM get_admin_customers(1, 10, NULL, NULL);
```

**View Recent Reassignments:**

```sql
SELECT * FROM order_reassignments
ORDER BY created_at DESC
LIMIT 10;
```

**View Suspended Customers:**

```sql
SELECT id, email, full_name, status, suspension_reason, suspended_at
FROM profiles
WHERE status = 'suspended'
ORDER BY suspended_at DESC;
```

---

### Important File Locations

**Migration Files:**

- `supabase/migrations/306_admin_order_reassignment_system.sql`
- `supabase/migrations/308_customer_suspension_system_production_ready.sql`
- `supabase/migrations/309_fix_get_admin_customers_status.sql`

**Verification Scripts:**

- `.kiro/specs/production-deployment-and-code-quality-fixes/verify-deployment-complete.sql`
- `.kiro/specs/production-deployment-and-code-quality-fixes/verify-rpc-functions.sql`
- `.kiro/specs/production-deployment-and-code-quality-fixes/verify-rls-policies.sql`
- `.kiro/specs/production-deployment-and-code-quality-fixes/test-function-calls.sql`

**Documentation:**

- `.kiro/specs/production-deployment-and-code-quality-fixes/VERIFICATION-GUIDE.md`
- `.kiro/specs/production-deployment-and-code-quality-fixes/DEPLOYMENT-GUIDE.md` (this file)

---

### Contact Information

**For Deployment Issues:**

- Check Supabase Dashboard logs first
- Review troubleshooting section in this guide
- Contact development team with:
  - Error messages
  - Verification script output
  - Migration number
  - Timestamp of deployment
  - Screenshots of errors

**For Rollback Assistance:**

- Follow rollback procedures in this guide
- Export data before rollback if needed
- Document reason for rollback
- Contact team for post-rollback analysis

---

## Appendix: Screenshot Guidelines

### Required Screenshots

Take screenshots at these key points:

1. **SQL Editor Interface**
   - Before executing any migration
   - Shows production database connection

2. **Migration 306 Execution**
   - SQL Editor with migration content
   - Success message after execution
   - Verification query results

3. **Migration 308 Execution**
   - SQL Editor with migration content
   - Success message after execution
   - Verification query results

4. **Migration 309 Execution**
   - SQL Editor with migration content
   - Success message after execution
   - Verification query results

5. **Comprehensive Verification**
   - `verify-deployment-complete.sql` results
   - All checks passed message

6. **UI Testing - Order Reassignment**
   - Order list with reassignment button
   - Reassignment modal with provider list
   - Success message
   - Updated order details

7. **UI Testing - Customer Suspension**
   - Customer list with status column
   - Suspension modal
   - Success message
   - Suspended customer error when trying to create ride

8. **Dual-Role System Verification**
   - Query results showing providers_v2.user_id exists
   - RLS policies using dual-role pattern

### Screenshot Naming Convention

Use this naming format:

```
deployment-[migration]-[step]-[timestamp].png

Examples:
deployment-306-execution-2026-01-18-14-30.png
deployment-306-verification-2026-01-18-14-32.png
deployment-308-execution-2026-01-18-14-35.png
deployment-complete-verification-2026-01-18-14-45.png
deployment-ui-order-reassignment-2026-01-18-15-00.png
```

### Screenshot Storage

Store screenshots in:

```
.kiro/specs/production-deployment-and-code-quality-fixes/screenshots/
```

Create subdirectories:

```
screenshots/
├── migration-306/
├── migration-308/
├── migration-309/
├── verification/
└── ui-testing/
```

---

## Version History

- **v1.0** (2026-01-18): Initial deployment guide
  - Covers migrations 306, 308, 309
  - Manual deployment via Supabase Dashboard
  - Comprehensive verification procedures
  - Rollback procedures for all migrations
  - Troubleshooting guide
  - Post-deployment tasks

---

## Document Maintenance

**Update this guide when:**

- New migrations are added
- Deployment procedures change
- New troubleshooting scenarios discovered
- Rollback procedures updated
- Verification scripts modified

**Review schedule:**

- After each deployment
- Monthly for accuracy
- When team feedback received

---

**End of Deployment Guide**

For questions or issues not covered in this guide, contact the development team.
