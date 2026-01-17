# Admin Providers Page Fix

## Problem Summary

The admin providers page at `http://localhost:5173/admin/providers` was not working due to two issues:

### Issue 1: Wrong Table Name in Realtime Subscription

The `useAdminRealtime` composable was subscribing to `service_providers` table, but the actual table name is `providers_v2`.

### Issue 2: Wrong Table in RPC Function Role Check

The admin RPC functions (`get_admin_providers_v2`, `count_admin_providers_v2`, etc.) were checking admin role in the `profiles` table, which doesn't exist. The correct table is `users`.

## Fixes Applied

### 1. Fixed Realtime Composable

**File**: `src/admin/composables/useAdminRealtime.ts`

Changed:

- `service_providers` → `providers_v2` in ServiceTable type
- Updated `subscribeToProviders()` to use `providers_v2`
- Updated `getTableLabel()` to show correct Thai label

### 2. Created Migration to Fix RPC Functions

**File**: `supabase/migrations/301_fix_admin_rpc_role_check.sql`

Updated all admin RPC functions to:

- Check role in `users` table instead of `profiles`
- Support both `admin` and `super_admin` roles
- Provide better error messages showing current role

Functions fixed:

- `get_admin_providers_v2()`
- `count_admin_providers_v2()`
- `get_admin_customers()`
- `count_admin_customers()`

## How to Apply Fixes

### Step 1: Start Docker (if not running)

```bash
# macOS
open -a Docker

# Or check if running
docker ps
```

### Step 2: Start Supabase Local

```bash
npx supabase start
```

### Step 3: Apply Migration

```bash
npx supabase db push --local
```

### Step 4: Generate Types

```bash
npx supabase gen types --local > src/types/database.ts
```

### Step 5: Restart Dev Server

```bash
npm run dev
```

## Testing the Fix

### 1. Login to Admin Panel

Navigate to: `http://localhost:5173/admin/login`

Use admin credentials:

- Email: `superadmin@gobear.app` or `admin@gobear.app`
- Password: Your admin password

### 2. Navigate to Providers Page

Go to: `http://localhost:5173/admin/providers`

### 3. Expected Behavior

You should see:

- ✅ Provider list loads successfully
- ✅ Real-time indicator shows "Live" (green)
- ✅ Statistics badges show correct counts
- ✅ Filters work (status, type)
- ✅ Pagination works
- ✅ Can view provider details
- ✅ Can approve/reject/suspend providers

### 4. Test Real-time Updates

Open two browser windows:

1. Admin panel at `/admin/providers`
2. Database editor or another admin session

Make changes to a provider record and watch the admin panel update automatically.

## Verification Checklist

- [ ] Docker is running
- [ ] Supabase local is started (`npx supabase status`)
- [ ] Migration 301 is applied
- [ ] Dev server is running
- [ ] Can login to admin panel
- [ ] Providers page loads without errors
- [ ] Real-time connection shows "Live"
- [ ] Can see provider list
- [ ] Can filter providers
- [ ] Can view provider details
- [ ] Can approve/reject providers

## Common Issues

### Issue: "Access denied. Admin privileges required"

**Solution**: Make sure your user has `role = 'admin'` or `role = 'super_admin'` in the `users` table.

Check with:

```sql
SELECT id, email, role FROM users WHERE email = 'your-email@example.com';
```

Update if needed:

```sql
UPDATE users SET role = 'super_admin' WHERE email = 'your-email@example.com';
```

### Issue: "User not found"

**Solution**: Your auth user exists but doesn't have a record in the `users` table. The admin login will automatically create one for known admin emails.

### Issue: Real-time not connecting

**Solution**:

1. Check Supabase is running: `npx supabase status`
2. Check browser console for WebSocket errors
3. Verify RLS policies allow real-time subscriptions

### Issue: Empty provider list

**Solution**: You may not have any providers in the database yet. Create a test provider:

```sql
-- Create a test user
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'testprovider@example.com')
ON CONFLICT (id) DO NOTHING;

-- Create a test provider
INSERT INTO providers_v2 (
  user_id,
  first_name,
  last_name,
  phone_number,
  provider_type,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test',
  'Provider',
  '0812345678',
  'ride',
  'pending'
);
```

## Architecture Notes

### Admin Authentication Flow

1. User logs in via `/admin/login`
2. `adminAuth.store.ts` validates credentials with Supabase Auth
3. Checks user role in `users` table
4. Creates admin session in localStorage
5. Router guard verifies session on navigation

### Provider Data Flow

1. Component calls `useAdminProviders().fetchProviders()`
2. Composable calls `get_admin_providers_v2()` RPC function
3. RPC function checks admin role in `users` table
4. Returns provider data from `providers_v2` table
5. Real-time subscription updates on changes

### Dual-Role Architecture

The system uses a dual-role architecture:

- `auth.uid()` = User ID from auth.users
- `provider_id` = Provider ID from providers_v2.id
- Join via `providers_v2.user_id = auth.uid()`

This allows users to be both customers and providers.

## Related Files

### Frontend

- `src/admin/views/ProvidersView.vue` - Main providers page
- `src/admin/composables/useAdminProviders.ts` - Data fetching logic
- `src/admin/composables/useAdminRealtime.ts` - Real-time subscriptions
- `src/admin/stores/adminAuth.store.ts` - Authentication state
- `src/admin/router.ts` - Admin routes

### Backend

- `supabase/migrations/297_admin_priority1_rpc_functions.sql` - Original RPC functions
- `supabase/migrations/301_fix_admin_rpc_role_check.sql` - Fixed RPC functions
- `supabase/migrations/218_provider_system_redesign_schema.sql` - providers_v2 table

## Next Steps

After verifying the providers page works:

1. Test other admin pages (customers, orders, etc.)
2. Verify all RPC functions use correct role checks
3. Test real-time updates across all admin views
4. Deploy migration to production when ready

## Production Deployment

When deploying to production:

```bash
# 1. Review migration
cat supabase/migrations/301_fix_admin_rpc_role_check.sql

# 2. Apply to production
npx supabase db push --linked

# 3. Verify in production
# Login to admin panel and test providers page

# 4. Monitor logs
# Check for any RPC errors in Supabase dashboard
```

## Support

If issues persist:

1. Check browser console for errors
2. Check Supabase logs: `npx supabase logs`
3. Verify database schema: `npx supabase db diff`
4. Review this document's troubleshooting section
