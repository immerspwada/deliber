# 🚨 PRODUCTION FIX - Admin Customers Access

## Problem

Admin users getting "Unauthorized: Admin access required" when accessing `/admin/customers`

## Root Cause

Migration 314 hasn't been applied to production database yet. The `admin_get_customers` function is checking for admin role but the check is failing.

## Solution - Apply Migration 314

### Option 1: Via Supabase Dashboard (RECOMMENDED)

1. Go to https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt/sql/new
2. Copy the entire content from `supabase/migrations/314_fix_admin_customers_access.sql`
3. Paste and click "Run"
4. Verify with the queries below

### Option 2: Via CLI

```bash
# Push migration to production
npx supabase db push --linked

# Or push specific migration
npx supabase db push --linked --include-all
```

## Verification Queries

Run these in Supabase SQL Editor to verify the fix:

```sql
-- 1. Check if admin_get_customers function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'admin_get_customers';

-- 2. Verify your admin user exists in profiles
SELECT id, email, role
FROM profiles
WHERE email = 'superadmin@gobear.app';

-- 3. If not in profiles, check users table
SELECT id, email, role
FROM users
WHERE email = 'superadmin@gobear.app';

-- 4. Test the function directly (replace with your user ID)
SELECT * FROM admin_get_customers(
  p_search := NULL,
  p_status := NULL,
  p_limit := 10,
  p_offset := 0
);
```

## Quick Fix (If Migration Fails)

If you need immediate access, run this directly in SQL Editor:

```sql
-- Ensure your user has admin role in profiles
INSERT INTO profiles (id, email, role, status, created_at, updated_at)
SELECT
  id,
  email,
  'admin' as role,
  'active' as status,
  created_at,
  NOW() as updated_at
FROM auth.users
WHERE email = 'superadmin@gobear.app'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();
```

## Post-Deployment Verification

1. Refresh your browser at http://localhost:5173/admin/customers
2. Check browser console - should see successful API call
3. Verify customers list loads without errors

## Rollback (If Needed)

```sql
-- Revert to previous function version
DROP FUNCTION IF EXISTS admin_get_customers(TEXT, TEXT[], INTEGER, INTEGER);
```

## Timeline

- **Estimated deployment time**: 2-3 minutes
- **Zero downtime**: Yes (function replacement is atomic)
- **Rollback time**: < 1 minute

## Next Steps After Fix

1. ✅ Verify admin access works
2. ✅ Test customer suspension features
3. ✅ Check all admin RPC functions work
4. ✅ Monitor for any auth-related errors
