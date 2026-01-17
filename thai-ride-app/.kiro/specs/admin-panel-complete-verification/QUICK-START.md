# Quick Start: Fix Admin Providers Page

## TL;DR

The admin providers page wasn't working due to:

1. Wrong table name in real-time subscription (`service_providers` → `providers_v2`)
2. RPC functions checking wrong table for admin role (`profiles` → `users`)

## Quick Fix (3 steps)

### 1. Start Supabase

```bash
# Start Docker first (if not running)
open -a Docker  # macOS

# Start Supabase
npx supabase start
```

### 2. Apply Migration

```bash
# Apply the fix
npx supabase db push --local

# Generate types
npx supabase gen types --local > src/types/database.ts
```

### 3. Test

```bash
# Start dev server
npm run dev

# Navigate to:
# http://localhost:5173/admin/login
# Then: http://localhost:5173/admin/providers
```

## Automated Verification

Run the verification script:

```bash
./.kiro/specs/admin-panel-complete-verification/verify-admin-providers.sh
```

## What Was Fixed

### File Changes

1. ✅ `src/admin/composables/useAdminRealtime.ts` - Fixed table name
2. ✅ `supabase/migrations/301_fix_admin_rpc_role_check.sql` - Fixed RPC functions

### Database Changes

- Updated `get_admin_providers_v2()` to check `users.role`
- Updated `count_admin_providers_v2()` to check `users.role`
- Updated `get_admin_customers()` to check `users.role`
- Updated `count_admin_customers()` to check `users.role`

## Expected Result

After applying fixes, you should see:

- ✅ Provider list loads successfully
- ✅ Real-time indicator shows "Live" (green dot)
- ✅ Statistics show correct counts
- ✅ Filters work (status, type)
- ✅ Can view provider details
- ✅ Can approve/reject/suspend providers

## Troubleshooting

### "Access denied. Admin privileges required"

Your user needs admin role:

```sql
UPDATE users SET role = 'super_admin' WHERE email = 'your@email.com';
```

### Empty provider list

Create test data:

```sql
INSERT INTO providers_v2 (user_id, first_name, last_name, provider_type, status)
VALUES (auth.uid(), 'Test', 'Provider', 'ride', 'pending');
```

### Real-time not connecting

1. Check Supabase is running: `npx supabase status`
2. Check browser console for errors
3. Refresh the page

## More Details

See `ADMIN-PROVIDERS-FIX.md` for:

- Detailed problem analysis
- Architecture notes
- Production deployment guide
- Complete troubleshooting guide
