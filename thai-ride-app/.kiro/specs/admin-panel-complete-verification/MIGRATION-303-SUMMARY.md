# Migration 303 - Wallets Table Reference Fix

## Problem Identified

The admin panel was failing to load providers with this error:

```
relation "wallets" does not exist
POST /rest/v1/rpc/get_admin_providers_v2 404 (Not Found)
```

## Root Cause

Migration 302 introduced a reference to a table called `wallets`:

```sql
LEFT JOIN wallets w ON pv.user_id = w.user_id
```

However, the actual table name in the database is `user_wallets`, not `wallets`.

## Solution

Migration 303 fixes this by updating the JOIN clause:

```sql
-- Before (incorrect)
LEFT JOIN wallets w ON pv.user_id = w.user_id

-- After (correct)
LEFT JOIN user_wallets uw ON pv.user_id = uw.user_id
```

## Changes Made

### File: `supabase/migrations/303_fix_wallets_table_reference.sql`

1. **Dropped existing functions** (to recreate with fix)
   - `get_admin_providers_v2`
   - `count_admin_providers_v2`

2. **Recreated `get_admin_providers_v2`** with correct table reference
   - Changed `wallets` → `user_wallets`
   - Changed alias `w` → `uw` for clarity

3. **Recreated `count_admin_providers_v2`** (no changes, just consistency)

## Impact

### Before Fix

- ❌ Admin Providers view fails to load
- ❌ Error: "relation wallets does not exist"
- ❌ Cannot view provider wallet balances

### After Fix

- ✅ Admin Providers view loads successfully
- ✅ Provider wallet balances display correctly
- ✅ All provider data accessible

## Deployment Instructions

### Quick Deploy (Supabase Dashboard)

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/303_fix_wallets_table_reference.sql`
3. Run the SQL
4. Refresh your admin panel

### CLI Deploy

```bash
npx supabase db push
```

## Verification Steps

1. **Check table exists:**

   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_name LIKE '%wallet%';
   ```

   Expected: `user_wallets` (not `wallets`)

2. **Test the function:**

   ```sql
   SELECT * FROM get_admin_providers_v2(NULL, NULL, 10, 0);
   ```

   Expected: Returns provider data with `wallet_balance` column

3. **Check admin panel:**
   - Navigate to `/admin/providers`
   - Should load without errors
   - Wallet balances should display

## Related Files

- Migration: `supabase/migrations/303_fix_wallets_table_reference.sql`
- Previous migration: `supabase/migrations/302_fix_admin_providers_ambiguous_id.sql`
- Verification script: `verify-wallet-tables.sql`
- Deployment guide: `DEPLOY-MIGRATION-303.md`

## Notes

- This is a pure bug fix with no schema changes
- No data migration required
- Safe to deploy immediately
- No rollback needed (this fixes a broken state)

## Testing Checklist

- [ ] Migration applied successfully
- [ ] Function `get_admin_providers_v2` exists
- [ ] Admin providers view loads
- [ ] Wallet balances display correctly
- [ ] No console errors
- [ ] All provider data accessible
