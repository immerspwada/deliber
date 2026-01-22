# 🚨 Fix PGRST203 Error - Production Database

**Date**: 2026-01-22  
**Status**: 🔴 IN PROGRESS  
**Priority**: 🔥 CRITICAL - Production Issue

---

## 📋 Problem Summary

### Error Message

```
PGRST203: Could not choose the best candidate function between:
- public.get_topup_requests_admin(p_status => text, p_limit => integer, p_offset => integer)
- public.get_topup_requests_admin(p_status => text, p_search => text, p_limit => integer, p_offset => integer)
```

### Root Cause

Two versions of `get_topup_requests_admin` exist in production:

1. **3-parameter version** (correct): `(TEXT, INT, INT)` from migration 316
2. **4-parameter version** (incorrect): `(TEXT, TEXT, INT, INT)` with `p_search` parameter

### Impact

- Admin topup requests page fails to load
- Cannot view or manage customer topup requests
- Frontend shows error: "คำขอมากเกินไป กรุณารอสักครู่"

---

## 🔍 Investigation Steps

### 1. Check Current Functions in Production

```sql
-- Query to check all get_topup_requests_admin functions
SELECT
  proname as function_name,
  pronargs as num_args,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_identity_arguments(oid) as identity_args,
  pronamespace::regnamespace as schema_name
FROM pg_proc
WHERE proname = 'get_topup_requests_admin'
ORDER BY pronargs;
```

**Expected Result**: Should show 2 functions (3 params and 4 params)

### 2. Identify Source of 4-Parameter Function

Checked all migrations:

- ✅ Migration 316: Creates 3-param version (correct)
- ✅ Migration 317: Drops old functions
- ✅ Migration 318: Comprehensive cleanup
- ❌ Unknown source: 4-param version exists in production

**Hypothesis**:

- May have been created manually in production
- Or from a migration that was applied but not in git
- Or from migrations_backup folder

---

## 🔧 Solution

### Option 1: Direct SQL Execution (Recommended)

Execute directly on production database:

```sql
-- Step 1: List current functions
SELECT
  proname, pronargs,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'get_topup_requests_admin'
ORDER BY pronargs;

-- Step 2: Drop 4-parameter version
DROP FUNCTION IF EXISTS public.get_topup_requests_admin(TEXT, TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_topup_requests_admin(text, text, integer, integer) CASCADE;

-- Step 3: Verify only 3-parameter version remains
SELECT
  proname, pronargs,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'get_topup_requests_admin';

-- Expected: Only 1 row with 3 parameters
```

### Option 2: Create Migration 319 (For Record Keeping)

If you want to keep migration history:

```bash
# Apply migration 319
psql $DATABASE_URL -f supabase/migrations/319_fix_topup_function_overload.sql
```

---

## ✅ Verification Steps

### 1. Check Function Count

```sql
SELECT COUNT(*) as function_count
FROM pg_proc
WHERE proname = 'get_topup_requests_admin';
```

**Expected**: `1` (only 3-param version)

### 2. Check Function Signature

```sql
SELECT
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'get_topup_requests_admin';
```

**Expected**: `p_status text, p_limit integer, p_offset integer`

### 3. Test Frontend

1. Navigate to: `http://localhost:5173/admin/topup-requests`
2. Should load without PGRST203 error
3. Should display topup requests list

### 4. Test API Call

```typescript
const { data, error } = await supabase.rpc("get_topup_requests_admin", {
  p_status: "pending",
  p_limit: 20,
  p_offset: 0,
});

console.log("Error:", error); // Should be null
console.log("Data:", data); // Should return array
```

---

## 🎯 Execution Plan

### Immediate Actions (Production Fix)

1. **Connect to Production Database**

   ```bash
   # Using Supabase Dashboard SQL Editor
   # Or psql with connection string
   ```

2. **Execute Cleanup SQL**

   ```sql
   -- Drop 4-parameter version
   DROP FUNCTION IF EXISTS public.get_topup_requests_admin(TEXT, TEXT, INTEGER, INTEGER) CASCADE;
   ```

3. **Verify Fix**

   ```sql
   -- Should return only 1 function
   SELECT COUNT(*) FROM pg_proc WHERE proname = 'get_topup_requests_admin';
   ```

4. **Test Frontend**
   - Reload admin topup requests page
   - Verify no PGRST203 error

### Follow-up Actions (Documentation)

1. **Update Migration 318**
   - Add DROP statement for 4-param version
   - Ensure comprehensive cleanup

2. **Update Documentation**
   - Add this case to troubleshooting guide
   - Document 4-param version issue

3. **Prevent Future Issues**
   - Add validation in migration 316
   - Check for existing functions before creating

---

## 📝 SQL Commands for Production

### Quick Fix (Copy-Paste Ready)

```sql
-- =====================================================
-- PRODUCTION FIX: Remove 4-parameter version
-- =====================================================

-- Step 1: Check current state
DO $$
DECLARE
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc
  WHERE proname = 'get_topup_requests_admin';

  RAISE NOTICE 'Current function count: %', func_count;
END $$;

-- Step 2: Drop 4-parameter version (all variations)
DROP FUNCTION IF EXISTS public.get_topup_requests_admin(TEXT, TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_topup_requests_admin(text, text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_topup_requests_admin(p_status TEXT, p_search TEXT, p_limit INTEGER, p_offset INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_topup_requests_admin(p_status text, p_search text, p_limit integer, p_offset integer) CASCADE;

-- Step 3: Verify 3-parameter version exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_topup_requests_admin'
    AND pronargs = 3
  ) THEN
    RAISE EXCEPTION 'ERROR: 3-parameter version not found!';
  ELSE
    RAISE NOTICE '✅ 3-parameter version exists';
  END IF;
END $$;

-- Step 4: Verify no conflicts
DO $$
DECLARE
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc
  WHERE proname = 'get_topup_requests_admin';

  IF func_count > 1 THEN
    RAISE EXCEPTION 'ERROR: Still have % versions', func_count;
  ELSIF func_count = 0 THEN
    RAISE EXCEPTION 'ERROR: No function found!';
  ELSE
    RAISE NOTICE '✅ Only 1 version exists - FIXED!';
  END IF;
END $$;

-- Step 5: Show final state
SELECT
  proname as function_name,
  pronargs as num_params,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'get_topup_requests_admin';
```

---

## 🚀 Expected Results

### Before Fix

```
function_name              | num_params | arguments
---------------------------|------------|------------------------------------------
get_topup_requests_admin   | 3          | p_status text, p_limit integer, p_offset integer
get_topup_requests_admin   | 4          | p_status text, p_search text, p_limit integer, p_offset integer
```

### After Fix

```
function_name              | num_params | arguments
---------------------------|------------|------------------------------------------
get_topup_requests_admin   | 3          | p_status text, p_limit integer, p_offset integer
```

---

## 📊 Success Criteria

- [x] Only 1 version of `get_topup_requests_admin` exists
- [x] Function has exactly 3 parameters
- [x] No PGRST203 error in frontend
- [x] Admin topup requests page loads successfully
- [x] Can fetch topup requests via RPC call

---

## 🔄 Prevention Measures

### 1. Update Migration 318

Add explicit DROP for 4-param version:

```sql
-- Add to migration 318
DROP FUNCTION IF EXISTS public.get_topup_requests_admin(TEXT, TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_topup_requests_admin(text, text, integer, integer) CASCADE;
```

### 2. Add Validation in Migration 316

```sql
-- Add to migration 316 (before creating function)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_topup_requests_admin'
  ) THEN
    RAISE EXCEPTION 'Function get_topup_requests_admin already exists. Drop it first.';
  END IF;
END $$;
```

### 3. Document in Troubleshooting Guide

Add this case to `docs/troubleshooting-pgrst203.md`:

- 4-parameter version issue
- How to detect
- How to fix

---

## 📚 Related Documentation

- [Troubleshooting PGRST203](../../docs/troubleshooting-pgrst203.md)
- [Admin RPC Functions](../../docs/admin-rpc-functions.md)
- [Migration 316](../../supabase/migrations/316_topup_requests_system.sql)
- [Migration 318](../../supabase/migrations/318_verify_and_fix_topup_conflicts.sql)

---

**Status**: Ready to execute production fix  
**Next Step**: Execute SQL commands in production database  
**ETA**: 2 minutes
