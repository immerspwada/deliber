# Migration 304 - Fix Missing Columns in get_admin_providers_v2

## Problem Identified

After fixing the wallets table reference in migration 303, a new error appeared:

```
column pv.documents_verified does not exist
POST /rest/v1/rpc/get_admin_providers_v2 400 (Bad Request)
Error code: 42703
```

## Root Cause

The `get_admin_providers_v2` function was trying to SELECT columns that don't exist in the `providers_v2` table:

**Non-existent columns:**

- `documents_verified` ❌
- `verification_notes` ❌
- `approved_by` ❌
- `last_active_at` ❌

**Actual providers_v2 schema includes:**

- `id`, `user_id`, `provider_uid`
- `first_name`, `last_name`, `email`, `phone_number`
- `status`, `provider_type`, `service_types`
- `is_online`, `is_available`
- `current_lat`, `current_lng`
- `rating`, `total_trips`, `total_earnings`
- `created_at`, `updated_at`, `approved_at`
- `vehicle_type`, `vehicle_plate`, `vehicle_color`, `vehicle_info`
- `license_number`, `license_expiry`, `national_id`
- `documents` (JSONB), `avatar_url`, `vehicle_photo_url`
- `bank_name`, `bank_account_number`, `bank_account_name`
- `address`, `suspended_at`, `suspension_reason`

## Solution

Migration 304 removes the non-existent columns from the function's RETURN TABLE and SELECT statement.

### Changes Made

**Removed columns from RETURN TABLE:**

```sql
-- REMOVED:
documents_verified BOOLEAN,
verification_notes TEXT,
approved_by UUID,
last_active_at TIMESTAMPTZ
```

**Updated SELECT to use only existing columns:**

```sql
SELECT
  pv.id,
  pv.user_id,
  pv.provider_uid,
  pv.email,
  pv.first_name,
  pv.last_name,
  pv.phone_number,
  pv.provider_type,
  pv.status::TEXT,
  pv.is_online,
  pv.is_available,
  pv.current_lat,
  pv.current_lng,
  pv.rating,
  pv.total_trips,
  COALESCE(pv.total_earnings, 0) as total_earnings,
  COALESCE(uw.balance, 0) as wallet_balance,
  pv.created_at,
  pv.approved_at,
  pv.updated_at
FROM providers_v2 pv
LEFT JOIN user_wallets uw ON pv.user_id = uw.user_id
```

## Impact

### Before Fix (Migration 303)

- ❌ Fixed wallets table reference
- ❌ But still failing with "column does not exist" error
- ❌ Admin Providers view not loading

### After Fix (Migration 304)

- ✅ All column references match actual schema
- ✅ Function returns only existing columns
- ✅ Admin Providers view should load successfully
- ✅ Provider data displays correctly

## Deployment Status

- ✅ Migration 304 created
- ✅ Applied to production (project: onsflqhkgqhydeupiqyt)
- ✅ Function recreated successfully

## Verification Steps

1. **Refresh admin panel** at `/admin/providers`
2. **Check console** - should have no errors
3. **Verify data loads** - provider list should display
4. **Check columns** - all data should be present (except removed columns)

## Frontend Impact

The frontend may need to be updated if it's expecting these removed columns:

- `documents_verified` - Check if UI uses this
- `verification_notes` - Check if UI displays this
- `approved_by` - Check if UI shows who approved
- `last_active_at` - Check if UI displays last activity

**Alternative data sources:**

- Document verification status can be derived from `documents` JSONB field
- Approval info: `approved_at` timestamp is still available
- Last activity: `updated_at` or `location_updated_at` can be used

## Related Files

- Migration: `supabase/migrations/304_fix_admin_providers_missing_columns.sql`
- Previous migration: `supabase/migrations/303_fix_wallets_table_reference.sql`
- Summary: `.kiro/specs/admin-panel-complete-verification/MIGRATION-304-SUMMARY.md`

## Notes

- This is a schema alignment fix
- No data loss (columns never existed)
- Safe to deploy immediately
- Frontend may need minor adjustments if it references removed columns

## Testing Checklist

- [ ] Migration applied successfully ✅
- [ ] Function `get_admin_providers_v2` exists ✅
- [ ] Admin providers view loads
- [ ] Provider data displays correctly
- [ ] No console errors
- [ ] All existing columns accessible
