# Deployment Verification Guide

## Overview

This guide explains how to verify that migrations 306, 308, and 309 have been successfully deployed to production using the provided SQL verification scripts.

## Prerequisites

- Access to Supabase Dashboard
- Production URL: `https://onsflqhkgqhydeupiqyt.supabase.co`
- Admin user credentials
- Migrations 306, 308, 309 already deployed

## Verification Scripts

### 1. Quick Verification (Recommended)

**File:** `verify-deployment-complete.sql`

This is the master verification script that runs all checks in one go.

**Usage:**

1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of `verify-deployment-complete.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Review the output for ✅ or ❌ status indicators

**Expected Output:**

```
✅ ALL CHECKS PASSED - DEPLOYMENT SUCCESSFUL
```

**What it checks:**

- ✅ All 6 RPC functions exist
- ✅ order_reassignments table exists
- ✅ Suspension columns exist in profiles table
- ✅ RLS policies are enabled and configured
- ✅ Performance indexes are created
- ✅ Dual-role system is intact
- ✅ Functions execute without errors

---

### 2. Detailed RPC Functions Check

**File:** `verify-rpc-functions.sql`

Use this for detailed verification of all RPC functions.

**Usage:**

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `verify-rpc-functions.sql`
3. Paste and run

**What it checks:**

- Function existence in `information_schema.routines`
- Function signatures and return types
- Function parameters
- Summary report of all functions

**Expected Functions:**

- `reassign_order` (Migration 306)
- `get_reassignment_history` (Migration 306)
- `get_available_providers` (Migration 306)
- `suspend_customer_account` (Migration 308)
- `unsuspend_customer_account` (Migration 308)
- `get_admin_customers` (Migration 309)

---

### 3. Detailed RLS Policies Check

**File:** `verify-rls-policies.sql`

Use this for detailed verification of Row Level Security policies.

**Usage:**

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `verify-rls-policies.sql`
3. Paste and run

**What it checks:**

- RLS enabled on required tables
- Specific policies exist
- Dual-role system integrity (providers_v2.user_id)
- Storage bucket policies
- Policy definitions and clauses

**Expected Policies:**

- `admin_full_access_reassignments` on order_reassignments
- `customer_suspended_blocked` on profiles
- `customer_suspended_no_update` on profiles

---

### 4. Function Execution Tests

**File:** `test-function-calls.sql`

Use this to test that all functions execute without errors.

**Usage:**

1. **IMPORTANT:** Make sure you're logged in as an admin user
2. Open Supabase Dashboard → SQL Editor
3. Copy contents of `test-function-calls.sql`
4. Paste and run

**What it tests:**

- `get_available_providers()` - Returns provider list
- `get_admin_customers()` - Returns customer list with filters
- `get_reassignment_history()` - Returns reassignment audit trail
- Table and column existence
- Index creation
- Function permissions

**Note:** Some tests may return 0 rows if no data exists. This is OK - we're testing that functions execute without SQL errors.

---

## Verification Checklist

Use this checklist to track your verification progress:

### Pre-Deployment

- [ ] Migrations 306, 308, 309 files reviewed
- [ ] Backup of production database created
- [ ] Admin user credentials confirmed

### Deployment

- [ ] Migration 306 deployed via Supabase Dashboard
- [ ] Migration 308 deployed via Supabase Dashboard
- [ ] Migration 309 deployed via Supabase Dashboard

### Verification

- [ ] Run `verify-deployment-complete.sql` - All checks passed
- [ ] Run `verify-rpc-functions.sql` - All 6 functions exist
- [ ] Run `verify-rls-policies.sql` - All 3 policies exist
- [ ] Run `test-function-calls.sql` - All functions execute

### Post-Verification

- [ ] Document any issues found
- [ ] Test in production UI (admin panel)
- [ ] Monitor error logs for 24 hours
- [ ] Update deployment documentation

---

## Interpreting Results

### ✅ Success Indicators

```sql
✅ EXISTS
✅ PASSED
✅ ENABLED
✅ GRANTED
✅ ALL CHECKS PASSED
```

### ❌ Failure Indicators

```sql
❌ MISSING
❌ FAILED
❌ DISABLED
❌ DENIED
❌ SOME CHECKS FAILED
```

### ⚠️ Warning Indicators

```sql
⚠️ WARNING
⚠️ NO DUAL-ROLE REFERENCE
```

Warnings may not be critical but should be investigated.

---

## Troubleshooting

### Issue: "Function does not exist"

**Cause:** Migration not deployed or deployment failed

**Solution:**

1. Check migration was executed in SQL Editor
2. Look for error messages in SQL Editor output
3. Re-run the migration
4. Check for syntax errors in migration file

---

### Issue: "Only admins can view available providers"

**Cause:** Not logged in as admin user

**Solution:**

1. Verify you're logged into Supabase Dashboard with admin account
2. Check `profiles` table: `SELECT role FROM profiles WHERE id = auth.uid()`
3. If not admin, use admin credentials

---

### Issue: "RLS policy missing"

**Cause:** Policy creation failed during migration

**Solution:**

1. Check if RLS is enabled: `SELECT rowsecurity FROM pg_tables WHERE tablename = 'table_name'`
2. Re-run the policy creation part of the migration
3. Verify policy exists: `SELECT * FROM pg_policies WHERE tablename = 'table_name'`

---

### Issue: "Column does not exist"

**Cause:** ALTER TABLE statement failed

**Solution:**

1. Check if column exists: `SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles'`
2. Re-run the ALTER TABLE statement
3. Check for constraint violations

---

### Issue: "Dual-role system check failed"

**Cause:** providers_v2.user_id column missing

**Solution:**

1. Verify providers_v2 table exists
2. Check column: `SELECT column_name FROM information_schema.columns WHERE table_name = 'providers_v2' AND column_name = 'user_id'`
3. This is critical - do not proceed without fixing
4. Review provider system migrations

---

## Rollback Procedures

If verification fails and you need to rollback:

### Rollback Migration 309

```sql
-- Restore previous get_admin_customers function
-- (See rollback/309_rollback.sql)
```

### Rollback Migration 308

```sql
-- Remove suspension columns from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS status;
ALTER TABLE profiles DROP COLUMN IF EXISTS suspension_reason;
ALTER TABLE profiles DROP COLUMN IF EXISTS suspended_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS suspended_by;

-- Drop functions
DROP FUNCTION IF EXISTS suspend_customer_account;
DROP FUNCTION IF EXISTS unsuspend_customer_account;
```

### Rollback Migration 306

```sql
-- Drop functions
DROP FUNCTION IF EXISTS reassign_order;
DROP FUNCTION IF EXISTS get_reassignment_history;
DROP FUNCTION IF EXISTS get_available_providers;

-- Drop table
DROP TABLE IF EXISTS order_reassignments;
```

**⚠️ WARNING:** Rollback will lose audit trail data in order_reassignments table!

---

## Success Criteria

Deployment is considered successful when:

1. ✅ All 6 RPC functions exist and are callable
2. ✅ All 3 RLS policies exist and are enabled
3. ✅ order_reassignments table exists with all columns
4. ✅ profiles table has all 4 suspension columns
5. ✅ All performance indexes are created
6. ✅ Dual-role system (providers_v2.user_id) is intact
7. ✅ All functions execute without SQL errors
8. ✅ Function permissions granted to authenticated users

---

## Next Steps After Verification

1. **Test in UI:**
   - Open admin panel
   - Test order reassignment modal
   - Test customer suspension feature
   - Verify customer list shows status correctly

2. **Monitor Logs:**
   - Check Supabase logs for errors
   - Monitor API error rates
   - Watch for RLS policy violations

3. **Performance Check:**
   - Verify queries use indexes
   - Check query execution times
   - Monitor database load

4. **Documentation:**
   - Update deployment log
   - Document any issues encountered
   - Share verification results with team

---

## Support

If you encounter issues not covered in this guide:

1. Check Supabase Dashboard logs
2. Review migration files for syntax errors
3. Verify admin user permissions
4. Check database connection
5. Contact development team with:
   - Error messages
   - Verification script output
   - Migration number
   - Timestamp of deployment

---

## Appendix: Quick Reference

### Run All Verifications (One Command)

```bash
# Copy this entire block into SQL Editor
\i verify-deployment-complete.sql
```

### Check Single Function

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'function_name_here';
```

### Check Single Policy

```sql
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'table_name_here'
AND policyname = 'policy_name_here';
```

### Test Single Function

```sql
SELECT * FROM function_name(param1, param2) LIMIT 5;
```

---

## Version History

- **v1.0** (2026-01-18): Initial verification guide
- Covers migrations 306, 308, 309
- Includes 4 verification scripts
- Comprehensive troubleshooting section
