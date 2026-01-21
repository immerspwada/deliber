# Deploy Migration 303 - Fix Wallets Table Reference

## Issue

The `get_admin_providers_v2` RPC function references a table called `wallets` that doesn't exist. The actual table name is `user_wallets`.

## Error

```
relation "wallets" does not exist
POST /rest/v1/rpc/get_admin_providers_v2 404 (Not Found)
```

## Solution

Migration 303 fixes the table reference from `wallets` to `user_wallets`.

## Deployment Steps

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/303_fix_wallets_table_reference.sql`
4. Paste and run the SQL
5. Verify the function works

### Option 2: Supabase CLI

```bash
# Link to your project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Push the migration
npx supabase db push

# Or push specific migration
npx supabase db push --include-all
```

## Verification

After deployment, test the function:

```sql
-- Test the function
SELECT * FROM get_admin_providers_v2(NULL, NULL, 10, 0);

-- Should return provider data with wallet_balance column populated
```

## Expected Result

- Admin Providers view should load without errors
- Wallet balance should display correctly for each provider
- No more "relation wallets does not exist" errors

## Rollback (if needed)

If issues occur, you can rollback by running migration 302 again, but this should not be necessary as this is a pure fix.
