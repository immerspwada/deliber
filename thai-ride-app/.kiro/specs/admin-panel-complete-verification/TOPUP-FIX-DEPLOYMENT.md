# Admin Topup Requests Fix - Deployment Guide

## Problem

The admin topup requests page at `/admin/topup-requests` is not working because:

1. The `topup_requests` table is missing columns that the RPC function expects
2. Old schema uses different column names than the new admin RPC functions

## Solution

Migration `305_fix_topup_requests_columns.sql` adds the missing columns and updates the approve/reject functions.

## Column Mapping

### Missing Columns Added:

- `requested_at` - mirrors `created_at`
- `processed_at` - unified timestamp for approval/rejection
- `processed_by` - admin user ID who processed the request
- `rejection_reason` - reason for rejection (mirrors `admin_note` for rejected requests)
- `payment_proof_url` - payment proof image URL (mirrors `slip_image_url`)

### Existing Columns Kept:

- `created_at` - original creation timestamp
- `approved_at` / `rejected_at` - specific approval/rejection timestamps
- `admin_id` - admin who processed (kept for backward compatibility)
- `admin_note` - admin notes (kept for backward compatibility)
- `slip_image_url` - original slip image URL (kept for backward compatibility)

## Deployment Steps

### Option 1: Deploy via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/305_fix_topup_requests_columns.sql`
4. Paste into a new query
5. Click **Run** to execute

### Option 2: Deploy via CLI (if you have access)

```bash
# If using hosted Supabase with linked project
npx supabase db push

# Or deploy specific migration
npx supabase migration up --db-url "your-database-url"
```

### Option 3: Manual SQL Execution

Connect to your database and run:

```sql
-- See supabase/migrations/305_fix_topup_requests_columns.sql
```

## Verification

After deployment, verify the fix:

```sql
-- 1. Check new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'topup_requests'
  AND column_name IN ('requested_at', 'processed_at', 'processed_by', 'rejection_reason', 'payment_proof_url');

-- 2. Test the RPC function
SELECT * FROM get_topup_requests_admin(NULL, 10, 0);

-- 3. Check data was backfilled
SELECT
  id,
  status,
  created_at,
  requested_at,
  approved_at,
  rejected_at,
  processed_at,
  admin_id,
  processed_by
FROM topup_requests
LIMIT 5;
```

## Testing the Admin Panel

1. Navigate to `http://localhost:5173/admin/topup-requests`
2. You should see:
   - Stats cards showing pending/approved/rejected counts
   - Table with topup requests
   - Approve/Reject buttons for pending requests
   - Payment proof images (if available)

## Rollback (if needed)

If something goes wrong:

```sql
-- Remove new columns
ALTER TABLE public.topup_requests
  DROP COLUMN IF EXISTS requested_at,
  DROP COLUMN IF EXISTS processed_at,
  DROP COLUMN IF EXISTS processed_by,
  DROP COLUMN IF EXISTS rejection_reason,
  DROP COLUMN IF EXISTS payment_proof_url;

-- Restore original functions from migration 079
-- (See supabase/migrations/079_wallet_topup_system.sql)
```

## Notes

- The migration is backward compatible - old columns are kept
- Data is automatically backfilled from existing columns
- The approve/reject functions now update both old and new columns
- No data loss occurs during migration
