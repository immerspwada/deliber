# Migration 302: Fix Admin Providers RPC Functions

## Problem

The admin providers view was failing with two database errors:

### Error 1: Ambiguous Column Reference

```
code: '42702'
message: 'column reference "id" is ambiguous'
details: 'It could refer to either a PL/pgSQL variable or a table column.'
```

**Root Cause**: In `get_admin_providers_v2`, the function returns a column named `id`, and the query joins `providers_v2 pv` with `users u`. Both tables have an `id` column, causing PostgreSQL to be unable to determine which `id` to use.

### Error 2: Type Mismatch

```
code: '42883'
message: 'operator does not exist: provider_status = text'
hint: 'No operator matches the given name and argument types. You might need to add explicit type casts.'
```

**Root Cause**: In `count_admin_providers_v2`, the `status` column in `providers_v2` is of type `provider_status` (enum), but the function was comparing it directly with TEXT parameter without proper casting.

## Solution

### Fix 1: Qualify Column References

Changed the SELECT statement in the role check to explicitly qualify the table:

```sql
-- Before (ambiguous)
SELECT role INTO v_user_role
FROM users
WHERE id = v_admin_id;

-- After (explicit)
SELECT u.role INTO v_user_role
FROM users u
WHERE u.id = v_admin_id;
```

The main query already had `pv.id` properly qualified, but the role check query needed the same treatment.

### Fix 2: Explicit Type Casting

The WHERE clause already had proper casting (`pv.status::TEXT = p_status`), which was correct. The issue was that migration 301 had this fix, but it wasn't applied to production yet.

## Migration File

Created: `supabase/migrations/302_fix_admin_providers_ambiguous_id.sql`

This migration:

1. Drops the existing functions
2. Recreates them with fully qualified column references
3. Ensures proper type casting for enum comparisons
4. Grants appropriate permissions
5. Adds descriptive comments

## Testing

Use the verification script: `.kiro/specs/admin-panel-complete-verification/verify-migration-302.sql`

### Test Cases:

1. ✅ Functions exist and have correct signatures
2. ✅ Get providers with no filters
3. ✅ Get providers with status filter
4. ✅ Count providers with no filters
5. ✅ Count providers with status filter
6. ✅ No ambiguous column errors

## Deployment

### Local Development

```bash
# Start Docker Desktop first
npx supabase start

# Apply migration
npx supabase db push --local

# Verify
psql -h localhost -p 54322 -U postgres -d postgres -f .kiro/specs/admin-panel-complete-verification/verify-migration-302.sql
```

### Production

```bash
# Apply migration to hosted instance
npx supabase db push

# Or use Supabase Dashboard:
# 1. Go to Database > Migrations
# 2. Upload 302_fix_admin_providers_ambiguous_id.sql
# 3. Run migration
```

## Impact

- **Admin Providers View**: Will now load correctly without errors
- **Admin Customers View**: No changes needed (already working)
- **Performance**: No impact (same query plan)
- **Breaking Changes**: None (function signatures unchanged)

## Related Files

- Migration: `supabase/migrations/302_fix_admin_providers_ambiguous_id.sql`
- Previous Fix: `supabase/migrations/301_fix_admin_rpc_role_check.sql`
- Composable: `src/admin/composables/useAdminProviders.ts`
- View: `src/admin/views/ProvidersView.vue`
- Verification: `.kiro/specs/admin-panel-complete-verification/verify-migration-302.sql`
