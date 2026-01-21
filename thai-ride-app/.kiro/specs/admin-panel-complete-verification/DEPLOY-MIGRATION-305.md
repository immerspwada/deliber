# 🚀 Deploy Migration 305 - Topup Requests Fix

## Quick Deploy (3 Steps)

### Step 1: Apply Migration to Production

**Option A: Supabase Dashboard (Recommended)**

1. Open Supabase Dashboard → SQL Editor
2. Copy the content from `supabase/migrations/305_fix_topup_requests_columns.sql`
3. Paste and click "Run"

**Option B: CLI (if you have production access)**

```bash
# Push to production
npx supabase db push --db-url "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
```

### Step 2: Verify Deployment

Run this query in SQL Editor:

```sql
-- Should return 5 rows
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'topup_requests'
  AND column_name IN ('requested_at', 'processed_at', 'processed_by', 'rejection_reason', 'payment_proof_url')
ORDER BY column_name;
```

Expected output:

```
payment_proof_url    | text
processed_at         | timestamp with time zone
processed_by         | uuid
rejection_reason     | text
requested_at         | timestamp with time zone
```

### Step 3: Test Admin Panel

1. Navigate to `https://your-domain.com/admin/topup-requests`
2. Verify page loads without errors
3. Check stats display correctly
4. Test approve/reject buttons

## What This Migration Does

### 1. Adds Missing Columns

```sql
ALTER TABLE public.topup_requests
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processed_by UUID,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
```

### 2. Backfills Data

- `requested_at` ← `created_at`
- `processed_at` ← `approved_at` or `rejected_at`
- `processed_by` ← `admin_id`
- `rejection_reason` ← `admin_note` (for rejected requests)
- `payment_proof_url` ← `slip_image_url`

### 3. Updates RPC Functions

- `approve_topup_request()` - Now sets new columns
- `reject_topup_request()` - Now sets new columns

### 4. Creates Indexes

```sql
CREATE INDEX idx_topup_requests_requested_at ON topup_requests(requested_at DESC);
CREATE INDEX idx_topup_requests_processed_at ON topup_requests(processed_at DESC);
CREATE INDEX idx_topup_requests_processed_by ON topup_requests(processed_by);
```

## Verification Checklist

After deployment, verify:

- [ ] Migration applied successfully (no errors)
- [ ] 5 new columns exist in `topup_requests` table
- [ ] Existing data backfilled correctly
- [ ] Indexes created successfully
- [ ] RPC functions updated
- [ ] Admin panel loads at `/admin/topup-requests`
- [ ] Stats display correctly
- [ ] Table shows requests with all columns
- [ ] Approve button works
- [ ] Reject button works
- [ ] Wallet balance updates correctly
- [ ] Notifications sent properly

## Rollback Plan

If issues occur, run this in SQL Editor:

```sql
-- Remove new columns
ALTER TABLE public.topup_requests
  DROP COLUMN IF EXISTS requested_at,
  DROP COLUMN IF EXISTS processed_at,
  DROP COLUMN IF EXISTS processed_by,
  DROP COLUMN IF EXISTS rejection_reason,
  DROP COLUMN IF EXISTS payment_proof_url;

-- Drop indexes
DROP INDEX IF EXISTS idx_topup_requests_requested_at;
DROP INDEX IF EXISTS idx_topup_requests_processed_at;
DROP INDEX IF EXISTS idx_topup_requests_processed_by;

-- Revert RPC functions (copy from migration 298)
-- See: supabase/migrations/298_admin_priority2_rpc_functions.sql
```

## Monitoring

After deployment, monitor for:

1. **Database Performance**
   - Check query execution times
   - Monitor index usage
   - Watch for slow queries

2. **Application Errors**
   - Check browser console
   - Monitor Supabase logs
   - Watch for RPC errors

3. **User Experience**
   - Page load times
   - Button responsiveness
   - Data accuracy

## Support

If you encounter issues:

1. Check Supabase logs for errors
2. Run verification queries (see `verify-topup-fix.sql`)
3. Check browser console for frontend errors
4. Review documentation files:
   - `TOPUP-QUICK-FIX.md`
   - `TOPUP-COMPLETE-FIX.md`
   - `TOPUP-FIX-DEPLOYMENT.md`

## Success Criteria

✅ Migration deployed without errors
✅ All verification queries pass
✅ Admin panel loads successfully
✅ Approve/reject actions work
✅ Wallet balances update correctly
✅ Notifications sent properly
✅ No performance degradation
✅ No security issues

## Timeline

- **Deployment**: 5 minutes
- **Verification**: 10 minutes
- **Testing**: 15 minutes
- **Total**: ~30 minutes

## Notes

- Migration is backward compatible
- Old columns (`created_at`, `approved_at`, `rejected_at`, `admin_id`, `admin_note`, `slip_image_url`) are kept
- Can deprecate old columns after 1 month of stable operation
- No downtime required
- Safe to deploy during business hours

---

**Created**: 2025-01-17
**Status**: Ready for Production
**Risk Level**: Low (backward compatible)
