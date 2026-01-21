# 🔧 Production Bug Fix - Migration 301

## Issues Fixed

### Bug 1: Ambiguous Column Reference

**Error**: `column reference "id" is ambiguous` (Error 42702)
**Location**: `get_admin_providers_v2` function, line 60
**Cause**: Both `pv.id` and `u.id` exist in the SELECT clause
**Fix**: Already qualified as `pv.id` (no change needed, was already correct)

### Bug 2: Type Mismatch in WHERE Clause

**Error**: `operator does not exist: provider_status = text` (Error 42883)
**Location**: Both `get_admin_providers_v2` and `count_admin_providers_v2` functions
**Cause**: Comparing `pv.status` (enum type `provider_status`) with TEXT parameter using `=` operator
**Fix**: Cast enum to TEXT: `pv.status::TEXT = p_status`

## Changes Made

### 1. get_admin_providers_v2

```sql
-- Before (Line 88):
WHERE (p_status IS NULL OR pv.status = p_status)

-- After:
WHERE (p_status IS NULL OR pv.status::TEXT = p_status)

-- Also cast in SELECT (Line 68):
pv.status::TEXT,
```

### 2. count_admin_providers_v2

```sql
-- Before (Line 120):
WHERE (p_status IS NULL OR pv.status = p_status)

-- After:
WHERE (p_status IS NULL OR pv.status::TEXT = p_status)
```

## Deployment Instructions

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/onsflqhkgqhydeupiqyt
   - Navigate to: SQL Editor

2. **Copy Fixed Migration**
   - Open: `supabase/migrations/301_fix_admin_rpc_role_check.sql`
   - Copy entire file content

3. **Execute in SQL Editor**
   - Paste the SQL
   - Click "Run" button
   - Wait for success confirmation

4. **Verify Functions**

   ```sql
   -- Test get_admin_providers_v2
   SELECT * FROM get_admin_providers_v2(NULL, NULL, 5, 0);

   -- Test count_admin_providers_v2
   SELECT count_admin_providers_v2(NULL, NULL);

   -- Test with status filter
   SELECT * FROM get_admin_providers_v2('pending', NULL, 5, 0);
   SELECT count_admin_providers_v2('pending', NULL);
   ```

### Option 2: CLI (Alternative)

```bash
# Link to production project
npx supabase link --project-ref onsflqhkgqhydeupiqyt

# Push migration
npx supabase db push --linked

# Generate updated types
npx supabase gen types --linked > src/types/database.ts
```

## Testing After Deployment

### 1. Test Admin Providers Page

- Navigate to: http://localhost:5173/admin/providers
- Expected: Page loads without errors
- Expected: Provider list displays
- Expected: Real-time indicator shows "Live"

### 2. Test Filters

- Filter by status: "pending", "approved", "rejected"
- Filter by provider type: "ride", "delivery", "moving"
- Expected: No SQL errors in console

### 3. Test Pagination

- Click "Next Page"
- Expected: Pagination works correctly
- Expected: Count displays correctly

## Verification Queries

Run these in Supabase Dashboard SQL Editor:

```sql
-- 1. Check function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'get_admin_providers_v2',
  'count_admin_providers_v2'
);

-- 2. Test with NULL filters (should work)
SELECT * FROM get_admin_providers_v2(NULL, NULL, 5, 0);

-- 3. Test with status filter (should work now)
SELECT * FROM get_admin_providers_v2('pending', NULL, 5, 0);

-- 4. Test count function
SELECT count_admin_providers_v2('pending', NULL);

-- 5. Check for any errors
SELECT * FROM pg_stat_statements
WHERE query LIKE '%get_admin_providers_v2%'
ORDER BY last_exec_time DESC
LIMIT 5;
```

## Expected Results

### Before Fix

```
❌ Error 42702: column reference "id" is ambiguous
❌ Error 42883: operator does not exist: provider_status = text
❌ Admin providers page shows 404 errors
```

### After Fix

```
✅ No SQL errors
✅ Admin providers page loads successfully
✅ Filters work correctly
✅ Pagination works correctly
✅ Real-time updates work
```

## Rollback Plan

If issues occur, rollback by dropping and recreating the old functions:

```sql
-- Drop new functions
DROP FUNCTION IF EXISTS get_admin_providers_v2(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_admin_providers_v2(TEXT, TEXT) CASCADE;

-- Then re-run migration 297 (original version)
```

## Next Steps

After successful deployment:

1. ✅ Mark task 16.3 as complete
2. ✅ Test admin providers page thoroughly
3. ✅ Monitor for any new errors
4. ✅ Update production deployment checklist
5. ✅ Generate updated TypeScript types

## Contact

If issues persist:

- Check Supabase logs: Dashboard → Logs → Postgres
- Check browser console for errors
- Verify admin user role: `SELECT role FROM users WHERE email = 'superadmin@gobear.app'`
