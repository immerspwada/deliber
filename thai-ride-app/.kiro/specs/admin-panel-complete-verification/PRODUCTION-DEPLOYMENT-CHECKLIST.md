# Production Deployment Checklist - Migration 301

## ⚠️ IMPORTANT: Manual Deployment Required

This migration **MUST be applied manually** to your production database. I cannot access your production environment directly.

## Pre-Deployment Checklist

- [ ] **Backup Production Database**
  - Go to Supabase Dashboard → Database → Backups
  - Create a manual backup before proceeding
  - Note the backup timestamp

- [ ] **Review Migration Content**
  - File: `supabase/migrations/301_fix_admin_rpc_role_check.sql`
  - Changes: Updates 4 RPC functions to check `users` table instead of `profiles`
  - Impact: Fixes 404 errors on admin providers page

- [ ] **Verify Production URL**
  - Production URL: `https://onsflqhkgqhydeupiqyt.supabase.co`
  - Admin email: `superadmin@gobear.app`

## Deployment Steps

### Step 1: Open Supabase Dashboard

1. Navigate to: https://supabase.com/dashboard
2. Select project: `onsflqhkgqhydeupiqyt`
3. Click "SQL Editor" in left sidebar

### Step 2: Copy Migration SQL

1. Open file: `supabase/migrations/301_fix_admin_rpc_role_check.sql`
2. Copy **ALL** content (Ctrl+A, Ctrl+C)

### Step 3: Execute Migration

1. In SQL Editor, click "New query"
2. Paste the migration SQL
3. Click "Run" button (or press Ctrl+Enter)
4. Wait for success message: "Success. No rows returned"

### Step 4: Verify Functions Created

Run this verification query:

```sql
SELECT
  routine_name,
  routine_type,
  data_type as return_type
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

**Expected Result:** 4 rows showing all functions

### Step 5: Test RPC Functions

Test each function directly in SQL Editor:

```sql
-- Test 1: Get providers
SELECT * FROM get_admin_providers_v2(
  p_status := NULL,
  p_provider_type := NULL,
  p_limit := 5,
  p_offset := 0
);

-- Test 2: Count providers
SELECT count_admin_providers_v2(
  p_status := NULL,
  p_provider_type := NULL
);

-- Test 3: Get customers
SELECT * FROM get_admin_customers(
  p_search := NULL,
  p_status := NULL,
  p_limit := 5,
  p_offset := 0
);

-- Test 4: Count customers
SELECT count_admin_customers(
  p_search := NULL,
  p_status := NULL
);
```

**Expected:** All queries return data without errors

### Step 6: Verify Admin User Role

Check your admin user has correct role:

```sql
-- Check current role
SELECT id, email, role, created_at
FROM users
WHERE email = 'superadmin@gobear.app';
```

**Expected:** Role should be `super_admin` or `admin`

If role is NULL or incorrect, update it:

```sql
-- Update to super_admin
UPDATE users
SET role = 'super_admin'
WHERE email = 'superadmin@gobear.app';
```

### Step 7: Test Admin Panel

1. Open browser to: http://localhost:5173/admin/login
2. Login with: `superadmin@gobear.app`
3. Navigate to: http://localhost:5173/admin/providers

**Expected Results:**

- ✅ Page loads without errors
- ✅ No 404 errors in browser console
- ✅ Provider list displays
- ✅ Real-time indicator shows "Live" (green dot)
- ✅ Statistics show correct counts
- ✅ Filters work (status, type)

### Step 8: Check Browser Console

Open DevTools (F12) → Console tab

**Should see:**

- ✅ No 404 errors
- ✅ RPC calls succeed: `POST .../rpc/get_admin_providers_v2 200 (OK)`
- ✅ Real-time subscription connected

**Should NOT see:**

- ❌ `POST .../rpc/get_admin_providers_v2 404 (Not Found)`
- ❌ `POST .../rpc/count_admin_providers_v2 404 (Not Found)`

## Post-Deployment Verification

### Test All Admin Pages

- [ ] `/admin/dashboard` - Dashboard loads with statistics
- [ ] `/admin/customers` - Customer list with search/filter
- [ ] `/admin/providers` - Provider list with approve/reject
- [ ] `/admin/verification-queue` - Document review
- [ ] `/admin/orders` - All orders with filters

### Monitor Logs

1. Go to Supabase Dashboard → Logs → Postgres Logs
2. Check for any errors related to RPC functions
3. Monitor for 5-10 minutes after deployment

### Update TypeScript Types (Optional)

If you have the project linked:

```bash
npx supabase gen types --linked > src/types/database.ts
```

## Troubleshooting

### Issue: "User not found"

**Solution:** Create user record in `users` table:

```sql
-- Get your auth user ID
SELECT id, email FROM auth.users WHERE email = 'superadmin@gobear.app';

-- Create user record (replace UUID)
INSERT INTO users (id, email, role, first_name, last_name)
VALUES (
  'YOUR-AUTH-USER-ID-HERE',
  'superadmin@gobear.app',
  'super_admin',
  'Super',
  'Admin'
)
ON CONFLICT (id) DO UPDATE
SET role = 'super_admin';
```

### Issue: "Access denied. Admin privileges required"

**Solution:** Update user role:

```sql
UPDATE users
SET role = 'super_admin'
WHERE email = 'superadmin@gobear.app';
```

### Issue: Functions still return 404

**Solution:**

1. Verify migration ran successfully (no errors)
2. Check functions exist with verification query
3. Clear browser cache and reload
4. Check Supabase Dashboard → Database → Functions

## Rollback Plan

If something goes wrong:

1. **Restore from backup:**
   - Go to Supabase Dashboard → Database → Backups
   - Select the backup created in Pre-Deployment step
   - Click "Restore"

2. **Or manually drop functions:**

```sql
DROP FUNCTION IF EXISTS get_admin_providers_v2(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_admin_providers_v2(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_admin_customers(TEXT, TEXT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS count_admin_customers(TEXT, TEXT) CASCADE;
```

## Completion Checklist

- [ ] Migration 301 applied successfully
- [ ] All 4 RPC functions exist and work
- [ ] Admin user has correct role
- [ ] Admin providers page loads without 404 errors
- [ ] Real-time updates working
- [ ] No errors in Supabase logs
- [ ] No errors in browser console
- [ ] All admin pages tested

## Next Steps

After successful deployment:

1. Mark task 16.1 as complete
2. Proceed to task 16.2: Verify RPC functions
3. Proceed to task 16.3: Test admin providers page
4. Proceed to task 16.4: Verify admin user role

## Support

If you encounter issues:

1. Check Supabase Dashboard → Logs
2. Check browser console for detailed errors
3. Verify migration SQL was executed completely
4. Ensure no syntax errors in SQL
5. Contact Supabase support if needed

---

**Status:** Ready for manual deployment
**Migration File:** `supabase/migrations/301_fix_admin_rpc_role_check.sql`
**Production URL:** `https://onsflqhkgqhydeupiqyt.supabase.co`
