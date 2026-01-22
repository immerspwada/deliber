# 🚨 Fix Topup Function Conflict in Production

**Date**: 2026-01-22  
**Status**: ⚠️ URGENT - Production Issue  
**Error**: PGRST203 - Function overloading conflict

---

## 🔴 Problem

The admin topup requests page is showing error:

```
PGRST203: Could not choose the best candidate function between...
p_status => text, p_limit => integer, p_offset => integer
```

This means there are still **duplicate functions** in production database that are causing conflicts.

---

## ✅ Solution

Run migration 318 to drop all old conflicting functions and verify the new ones.

---

## 📋 Step-by-Step Fix

### Step 1: Open Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt
2. Login with your credentials
3. Navigate to **SQL Editor**

### Step 2: Run Migration 318

Copy the entire content from `supabase/migrations/318_verify_and_fix_topup_conflicts.sql` and paste it into the SQL Editor.

**Or copy this SQL directly:**

```sql
-- =====================================================
-- STEP 1: CHECK EXISTING FUNCTIONS
-- =====================================================

-- List all topup-related functions
DO $$
DECLARE
  func_record RECORD;
BEGIN
  RAISE NOTICE '=== Checking existing topup functions ===';

  FOR func_record IN
    SELECT
      proname as function_name,
      pronargs as num_args,
      pg_get_function_arguments(oid) as arguments,
      pg_get_function_identity_arguments(oid) as identity_args,
      pronamespace::regnamespace as schema_name
    FROM pg_proc
    WHERE proname LIKE '%topup%'
    ORDER BY proname, pronargs
  LOOP
    RAISE NOTICE 'Function: %.% with % args: %',
      func_record.schema_name,
      func_record.function_name,
      func_record.num_args,
      func_record.arguments;
  END LOOP;
END $$;

-- =====================================================
-- STEP 2: DROP ALL OLD TOPUP FUNCTIONS (COMPREHENSIVE)
-- =====================================================

-- Drop any remaining old functions with various signatures
DROP FUNCTION IF EXISTS public.admin_get_topup_requests(VARCHAR, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_requests(character varying, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_requests(TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_requests(text, integer, integer) CASCADE;

DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(VARCHAR, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(character varying, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(TEXT, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(text, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(VARCHAR, INTEGER, INTEGER, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_requests_enhanced(character varying, integer, integer, text, text, text) CASCADE;

DROP FUNCTION IF EXISTS public.admin_get_topup_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_topup_stats(timestamptz, timestamptz) CASCADE;

DROP FUNCTION IF EXISTS public.admin_approve_topup_request(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_approve_topup_request(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_approve_topup_request(UUID, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.admin_approve_topup_request(uuid, text, uuid) CASCADE;

DROP FUNCTION IF EXISTS public.admin_reject_topup_request(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_reject_topup_request(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_reject_topup_request(UUID, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.admin_reject_topup_request(uuid, text, uuid) CASCADE;

DROP FUNCTION IF EXISTS public.admin_count_topup_requests(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS public.admin_count_topup_requests(character varying) CASCADE;
DROP FUNCTION IF EXISTS public.admin_count_topup_requests(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_count_topup_requests(text) CASCADE;

-- Drop any functions with similar names that might conflict
DROP FUNCTION IF EXISTS public.get_topup_requests(TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_topup_requests(text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.count_topup_requests(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.count_topup_requests(text) CASCADE;

-- =====================================================
-- STEP 3: VERIFY NEW FUNCTIONS EXIST (from migration 316)
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Verifying new functions ===';

  -- Check get_topup_requests_admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_topup_requests_admin'
    AND pronargs = 3
    AND pg_get_function_identity_arguments(oid) = 'p_status text, p_limit integer, p_offset integer'
  ) THEN
    RAISE EXCEPTION 'Function get_topup_requests_admin(TEXT, INT, INT) not found. Apply migration 316 first.';
  ELSE
    RAISE NOTICE '✓ get_topup_requests_admin exists';
  END IF;

  -- Check count_topup_requests_admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'count_topup_requests_admin'
    AND pronargs = 1
    AND pg_get_function_identity_arguments(oid) = 'p_status text'
  ) THEN
    RAISE EXCEPTION 'Function count_topup_requests_admin(TEXT) not found. Apply migration 316 first.';
  ELSE
    RAISE NOTICE '✓ count_topup_requests_admin exists';
  END IF;

  -- Check approve_topup_request
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'approve_topup_request'
    AND pronargs = 3
    AND pg_get_function_identity_arguments(oid) = 'p_request_id uuid, p_admin_id uuid, p_admin_note text'
  ) THEN
    RAISE EXCEPTION 'Function approve_topup_request(UUID, UUID, TEXT) not found. Apply migration 316 first.';
  ELSE
    RAISE NOTICE '✓ approve_topup_request exists';
  END IF;

  -- Check reject_topup_request
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'reject_topup_request'
    AND pronargs = 3
    AND pg_get_function_identity_arguments(oid) = 'p_request_id uuid, p_admin_id uuid, p_admin_note text'
  ) THEN
    RAISE EXCEPTION 'Function reject_topup_request(UUID, UUID, TEXT) not found. Apply migration 316 first.';
  ELSE
    RAISE NOTICE '✓ reject_topup_request exists';
  END IF;

  RAISE NOTICE '=== All new topup functions verified successfully ===';
END $$;

-- =====================================================
-- STEP 4: VERIFY NO CONFLICTS REMAIN
-- =====================================================

DO $$
DECLARE
  conflict_count INTEGER;
  func_record RECORD;
BEGIN
  RAISE NOTICE '=== Checking for remaining conflicts ===';

  -- Count functions with same name and arg count
  SELECT COUNT(*) INTO conflict_count
  FROM (
    SELECT proname, pronargs, COUNT(*) as cnt
    FROM pg_proc
    WHERE proname LIKE '%topup%'
    GROUP BY proname, pronargs
    HAVING COUNT(*) > 1
  ) conflicts;

  IF conflict_count > 0 THEN
    RAISE WARNING 'Found % potential conflicts:', conflict_count;

    FOR func_record IN
      SELECT proname, pronargs, COUNT(*) as cnt
      FROM pg_proc
      WHERE proname LIKE '%topup%'
      GROUP BY proname, pronargs
      HAVING COUNT(*) > 1
    LOOP
      RAISE WARNING '  - % with % args has % definitions',
        func_record.proname,
        func_record.pronargs,
        func_record.cnt;
    END LOOP;

    RAISE EXCEPTION 'Function conflicts still exist. Manual intervention required.';
  ELSE
    RAISE NOTICE '✓ No function conflicts detected';
  END IF;
END $$;

-- =====================================================
-- STEP 5: LIST FINAL FUNCTIONS
-- =====================================================

DO $$
DECLARE
  func_record RECORD;
BEGIN
  RAISE NOTICE '=== Final topup functions ===';

  FOR func_record IN
    SELECT
      proname as function_name,
      pronargs as num_args,
      pg_get_function_arguments(oid) as arguments
    FROM pg_proc
    WHERE proname LIKE '%topup%'
    ORDER BY proname, pronargs
  LOOP
    RAISE NOTICE 'Function: %(%) with % args',
      func_record.function_name,
      func_record.arguments,
      func_record.num_args;
  END LOOP;
END $$;
```

### Step 3: Execute the SQL

1. Click **Run** button in SQL Editor
2. Wait for execution to complete
3. Check the **Messages** tab for output

### Step 4: Verify Success

You should see messages like:

```
✓ get_topup_requests_admin exists
✓ count_topup_requests_admin exists
✓ approve_topup_request exists
✓ reject_topup_request exists
✓ No function conflicts detected
```

### Step 5: Test the Admin Page

1. Refresh the admin topup requests page: `http://localhost:5173/admin/topup-requests`
2. The PGRST203 error should be gone
3. The page should load successfully

---

## 🔍 What This Migration Does

### 1. Lists Existing Functions

Shows all topup-related functions currently in the database

### 2. Drops Old Conflicting Functions

Removes all old function variations:

- `admin_get_topup_requests` (old naming)
- `admin_get_topup_requests_enhanced` (old naming)
- `admin_get_topup_stats` (old function)
- `admin_approve_topup_request` (old signature)
- `admin_reject_topup_request` (old signature)
- `admin_count_topup_requests` (old naming)
- `get_topup_requests` (conflicting name)
- `count_topup_requests` (conflicting name)

### 3. Verifies New Functions Exist

Confirms that the correct functions from migration 316 are present:

- `get_topup_requests_admin(TEXT, INT, INT)`
- `count_topup_requests_admin(TEXT)`
- `approve_topup_request(UUID, UUID, TEXT)`
- `reject_topup_request(UUID, UUID, TEXT)`

### 4. Checks for Remaining Conflicts

Ensures no duplicate functions remain

### 5. Lists Final Functions

Shows the clean function list after cleanup

---

## 🎯 Expected Outcome

After running this migration:

✅ All old conflicting functions removed  
✅ Only new standardized functions remain  
✅ No PGRST203 errors  
✅ Admin topup requests page works  
✅ Customer wallet page works

---

## 🚨 If Migration Fails

### Error: "Function not found. Apply migration 316 first"

**Solution**: Migration 316 needs to be applied first

1. Check if migration 316 exists in production
2. If not, apply migration 316 first
3. Then apply migration 318

### Error: "Function conflicts still exist"

**Solution**: Manual cleanup needed

1. Check the error messages for specific conflicting functions
2. Drop them manually using SQL Editor
3. Re-run migration 318

### Error: Permission denied

**Solution**: Use service role key

1. Make sure you're logged in as admin
2. Or use the service role key in SQL Editor

---

## 📝 Post-Migration Checklist

- [ ] Migration 318 executed successfully
- [ ] No errors in SQL Editor
- [ ] All verification checks passed
- [ ] Admin topup requests page loads
- [ ] Customer wallet page loads
- [ ] Can create topup request
- [ ] Can approve/reject requests

---

## 🔗 Related Files

- Migration file: `supabase/migrations/318_verify_and_fix_topup_conflicts.sql`
- Migration 316: `supabase/migrations/316_topup_requests_system.sql`
- Migration 317: `supabase/migrations/317_fix_topup_function_conflict.sql`
- Documentation: `docs/admin-rpc-functions.md`

---

## 💡 Why This Happened

Migration 317 was supposed to fix this, but it seems:

1. Some old functions still exist in production
2. They weren't dropped by migration 317
3. PostgreSQL can't distinguish between similar function signatures
4. This causes PGRST203 error

Migration 318 is more comprehensive and drops **all possible variations** of old functions.

---

**Status**: Ready to apply  
**Urgency**: High - Production issue  
**Impact**: Admin topup management currently broken  
**Time to fix**: ~2 minutes
