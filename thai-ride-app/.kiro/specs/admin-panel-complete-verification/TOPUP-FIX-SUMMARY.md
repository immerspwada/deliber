# Admin Topup Requests Fix - Summary

## Issue

The admin topup requests page at `http://localhost:5173/admin/topup-requests` was not working due to schema mismatch between the database table and the RPC function.

## Root Cause

The `get_topup_requests_admin` RPC function (created in migration 298) expects columns that don't exist in the `topup_requests` table (created in migration 079):

| Expected by RPC     | Exists in Table                      | Issue          |
| ------------------- | ------------------------------------ | -------------- |
| `requested_at`      | ❌ (has `created_at`)                | Column missing |
| `processed_at`      | ❌ (has `approved_at`/`rejected_at`) | Column missing |
| `processed_by`      | ❌ (has `admin_id`)                  | Column missing |
| `rejection_reason`  | ❌ (has `admin_note`)                | Column missing |
| `payment_proof_url` | ❌ (has `slip_image_url`)            | Column missing |

## Solution

### 1. Database Migration (305_fix_topup_requests_columns.sql)

- ✅ Adds missing columns to `topup_requests` table
- ✅ Backfills data from existing columns
- ✅ Updates `approve_topup_request` function to populate both old and new columns
- ✅ Updates `reject_topup_request` function to populate both old and new columns
- ✅ Creates indexes for performance
- ✅ Maintains backward compatibility

### 2. Composable Updates (useAdminTopupRequests.ts)

- ✅ Changed `approveTopup` to use `approve_topup_request` RPC function
- ✅ Changed `rejectTopup` to use `reject_topup_request` RPC function
- ✅ Removed direct table updates (better security with SECURITY DEFINER functions)

## Files Changed

1. **supabase/migrations/305_fix_topup_requests_columns.sql** (NEW)
   - Adds missing columns
   - Backfills data
   - Updates approve/reject functions

2. **src/admin/composables/useAdminTopupRequests.ts** (MODIFIED)
   - Uses RPC functions instead of direct table updates
   - Better error handling

3. **.kiro/specs/admin-panel-complete-verification/TOPUP-FIX-DEPLOYMENT.md** (NEW)
   - Deployment instructions

4. **.kiro/specs/admin-panel-complete-verification/verify-topup-fix.sql** (NEW)
   - Verification queries

## Deployment Instructions

### Quick Deploy (Supabase Dashboard)

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/305_fix_topup_requests_columns.sql`
3. Run the query
4. Verify with `verify-topup-fix.sql`

### Verify Success

```sql
-- Should return 5 columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'topup_requests'
  AND column_name IN ('requested_at', 'processed_at', 'processed_by', 'rejection_reason', 'payment_proof_url');

-- Should return data without errors
SELECT * FROM get_topup_requests_admin(NULL, 10, 0);
```

## Testing Checklist

After deployment, test the admin panel:

- [ ] Navigate to `/admin/topup-requests`
- [ ] Stats cards display correctly (pending, approved, rejected counts)
- [ ] Table loads with topup requests
- [ ] Filter by status works (pending, approved, rejected)
- [ ] Approve button works for pending requests
- [ ] Reject button works with reason input
- [ ] Payment proof images display correctly
- [ ] Refresh button reloads data
- [ ] No console errors

## Security Notes

- ✅ RPC functions use `SECURITY DEFINER` with admin role check
- ✅ Only admins can approve/reject topup requests
- ✅ RLS policies remain in place
- ✅ Wallet balance updates are atomic (within transaction)
- ✅ Notifications sent to users on approval/rejection

## Backward Compatibility

The migration maintains backward compatibility:

- Old columns (`created_at`, `admin_id`, `admin_note`, `slip_image_url`) are kept
- New columns are added alongside old ones
- Functions update both old and new columns
- No data loss occurs

## Performance

New indexes added:

- `idx_topup_requests_requested_at` - for sorting by request date
- `idx_topup_requests_processed_at` - for filtering processed requests
- `idx_topup_requests_processed_by` - for admin activity tracking

## Next Steps

1. Deploy migration 305 to production
2. Test admin panel functionality
3. Monitor for any errors in production logs
4. Consider deprecating old columns in future migration (after confirming no dependencies)
