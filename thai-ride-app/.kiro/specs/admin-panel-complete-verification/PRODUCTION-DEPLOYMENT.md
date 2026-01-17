# Production Deployment Guide - Admin Providers Fix

## Current Situation

You are connected to **PRODUCTION** Supabase instance:

- URL: `https://onsflqhkgqhydeupiqyt.supabase.co`
- Admin email: `superadmin@gobear.app`

The admin providers page is showing 404 errors because migration `301_fix_admin_rpc_role_check.sql` has **NOT been applied to production yet**.

## Console Errors (Current)

```
POST https://onsflqhkgqhydeupiqyt.supabase.co/rest/v1/rpc/get_admin_providers_v2 404 (Not Found)
POST https://onsflqhkgqhydeupiqyt.supabase.co/rest/v1/rpc/count_admin_providers_v2 404 (Not Found)
```

## What Needs to Be Fixed

The RPC functions are checking for admin role in the wrong table:

- ❌ Currently checking: `profiles` table (doesn't exist)
- ✅ Should check: `users` table

## Deployment Options

### Option A: Supabase Dashboard (Recommended)

This is the safest and most straightforward method:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `onsflqhkgqhydeupiqyt`

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy Migration Content**
   - Open file: `supabase/migrations/301_fix_admin_rpc_role_check.sql`
   - Copy the entire content

4. **Paste and Execute**
   - Paste the SQL into the editor
   - Click "Run" button
   - Wait for success confirmation

5. **Verify Functions Exist**

   ```sql
   SELECT routine_name, routine_type
   FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name IN (
     'get_admin_providers_v2',
     'count_admin_providers_v2',
     'get_admin_customers',
     'count_admin_customers'
   );
   ```

   Expected result: 4 rows showing all functions

6. **Test the Admin Page**
   - Navigate to: http://localhost:5173/admin/providers
   - Should load successfully without 404 errors

### Option B: Supabase CLI (Advanced)

If you have the project linked locally:

1. **Link Project (if not already linked)**

   ```bash
   npx supabase link --project-ref onsflqhkgqhydeupiqyt
   ```

   You'll be prompted for:
   - Database password (from your Supabase project settings)

2. **Apply Migration**

   ```bash
   npx supabase db push --linked
   ```

   This will apply all pending migrations to production.

3. **Verify**

   ```bash
   # Check migration status
   npx supabase migration list --linked

   # Should show 301_fix_admin_rpc_role_check.sql as applied
   ```

### Option C: Direct Database Connection

If you have direct database access:

1. **Get Connection String**
   - From Supabase Dashboard → Settings → Database
   - Copy the connection string

2. **Connect with psql**

   ```bash
   psql "postgresql://postgres:[PASSWORD]@db.onsflqhkgqhydeupiqyt.supabase.co:5432/postgres"
   ```

3. **Run Migration**
   ```sql
   \i supabase/migrations/301_fix_admin_rpc_role_check.sql
   ```

## Post-Deployment Verification

### 1. Check Functions Exist

Run this query in Supabase Dashboard SQL Editor:

```sql
SELECT
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%admin%'
ORDER BY routine_name;
```

You should see:

- `get_admin_providers_v2` (FUNCTION)
- `count_admin_providers_v2` (FUNCTION)
- `get_admin_customers` (FUNCTION)
- `count_admin_customers` (FUNCTION)

### 2. Test RPC Function Directly

```sql
-- Test get_admin_providers_v2
SELECT * FROM get_admin_providers_v2(
  p_status := NULL,
  p_provider_type := NULL,
  p_limit := 10,
  p_offset := 0
);

-- Test count_admin_providers_v2
SELECT count_admin_providers_v2(
  p_status := NULL,
  p_provider_type := NULL
);
```

### 3. Test Admin Page

1. Open browser to: http://localhost:5173/admin/login
2. Login with: `superadmin@gobear.app`
3. Navigate to: http://localhost:5173/admin/providers
4. Expected results:
   - ✅ Page loads without errors
   - ✅ Provider list displays
   - ✅ Real-time indicator shows "Live" (green)
   - ✅ Statistics show correct counts
   - ✅ Filters work (status, type)
   - ✅ Can view provider details

### 4. Check Browser Console

Should see:

```
✅ No 404 errors
✅ RPC calls succeed: 200 OK
✅ Real-time subscription connected
```

## Troubleshooting

### Issue: "Access denied. Admin privileges required"

**Cause**: Your user doesn't have admin role in the `users` table.

**Solution**: Update your user role in Supabase Dashboard SQL Editor:

```sql
-- Check current role
SELECT id, email, role FROM users WHERE email = 'superadmin@gobear.app';

-- Update to super_admin if needed
UPDATE users
SET role = 'super_admin'
WHERE email = 'superadmin@gobear.app';
```

### Issue: "User not found"

**Cause**: Your auth user exists but doesn't have a record in the `users` table.

**Solution**: Create user record:

```sql
-- Get your auth user ID
SELECT id, email FROM auth.users WHERE email = 'superadmin@gobear.app';

-- Create user record (replace UUID with your auth.users.id)
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

### Issue: Functions still return 404

**Cause**: Migration wasn't applied successfully.

**Solution**:

1. Check migration status in Supabase Dashboard → Database → Migrations
2. Verify functions exist with the query in "Check Functions Exist" above
3. If functions don't exist, re-run the migration using Option A

### Issue: "profiles table does not exist"

**Cause**: Old RPC functions are still in use.

**Solution**: The migration drops and recreates the functions. Make sure:

1. The migration ran successfully
2. No errors in the SQL execution
3. Functions were recreated (check with verification query)

## Migration Content Summary

The migration `301_fix_admin_rpc_role_check.sql` does:

1. **Drops old functions** (that check `profiles` table)
2. **Creates new functions** (that check `users` table)
3. **Supports both roles**: `admin` and `super_admin`
4. **Provides better error messages** showing current role

Functions updated:

- `get_admin_providers_v2()` - Get provider list with filters
- `count_admin_providers_v2()` - Count providers for pagination
- `get_admin_customers()` - Get customer list with search
- `count_admin_customers()` - Count customers for pagination

## Security Notes

- All functions use `SECURITY DEFINER` to run with elevated privileges
- All functions check user role before returning data
- All functions use `SET search_path = public` for security
- Functions support both `admin` and `super_admin` roles

## Next Steps After Deployment

1. ✅ Verify admin providers page works
2. ✅ Test all admin pages (customers, orders, etc.)
3. ✅ Verify real-time updates work
4. ✅ Test approve/reject provider actions
5. ✅ Monitor Supabase logs for any errors
6. ✅ Update TypeScript types if needed:
   ```bash
   npx supabase gen types --linked > src/types/database.ts
   ```

## Rollback Plan

If something goes wrong, you can rollback by:

1. **Restore old functions** (if you have them backed up)
2. **Or revert to previous migration**:

   ```sql
   -- Check current migration version
   SELECT * FROM supabase_migrations.schema_migrations
   ORDER BY version DESC LIMIT 5;

   -- If needed, manually drop new functions and restore old ones
   ```

## Support

If issues persist after deployment:

1. Check Supabase Dashboard → Logs → Postgres Logs
2. Check browser console for detailed error messages
3. Verify your user has correct role in `users` table
4. Ensure migration was applied successfully

## Production Checklist

Before deploying to production:

- [ ] Backup current database (Supabase Dashboard → Database → Backups)
- [ ] Review migration SQL carefully
- [ ] Test in staging environment first (if available)
- [ ] Have rollback plan ready
- [ ] Monitor logs after deployment
- [ ] Test critical admin functions
- [ ] Verify no breaking changes for existing users

## Deployment Status

- [x] Migration file created: `301_fix_admin_rpc_role_check.sql`
- [x] Frontend fix applied: `useAdminRealtime.ts` updated
- [ ] **Migration applied to production** ← YOU ARE HERE
- [ ] Production verification complete
- [ ] TypeScript types regenerated
- [ ] All admin pages tested

## Quick Deploy Command

If you choose Option A (Supabase Dashboard):

1. Copy this file path: `supabase/migrations/301_fix_admin_rpc_role_check.sql`
2. Open the file
3. Copy all content
4. Paste in Supabase Dashboard SQL Editor
5. Click "Run"
6. Done! ✅
