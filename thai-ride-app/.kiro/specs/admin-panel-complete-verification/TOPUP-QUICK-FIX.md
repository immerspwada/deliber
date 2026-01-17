# 🚀 Quick Fix for Admin Topup Requests

## Problem

`http://localhost:5173/admin/topup-requests` ไม่ทำงาน

## Solution (3 Steps)

### Step 1: Deploy Database Migration

**Option A: Supabase Dashboard (แนะนำ)**

1. เปิด Supabase Dashboard → SQL Editor
2. Copy ไฟล์ `supabase/migrations/305_fix_topup_requests_columns.sql`
3. Paste และ Run

**Option B: CLI (ถ้ามี access)**

```bash
npx supabase db push
```

### Step 2: Verify Deployment

Run this query in SQL Editor:

```sql
-- Should return 5 rows
SELECT column_name FROM information_schema.columns
WHERE table_name = 'topup_requests'
  AND column_name IN ('requested_at', 'processed_at', 'processed_by', 'rejection_reason', 'payment_proof_url');
```

### Step 3: Test Admin Panel

1. Navigate to `/admin/topup-requests`
2. Should see stats and table with data
3. Try approve/reject buttons

## What Was Fixed

### Database

- ✅ Added 5 missing columns to `topup_requests` table
- ✅ Backfilled data from existing columns
- ✅ Updated approve/reject functions

### Frontend

- ✅ Updated composable to use RPC functions
- ✅ Better error handling

## Files Changed

1. `supabase/migrations/305_fix_topup_requests_columns.sql` - Database fix
2. `src/admin/composables/useAdminTopupRequests.ts` - Frontend fix

## Rollback (if needed)

```sql
ALTER TABLE public.topup_requests
  DROP COLUMN IF EXISTS requested_at,
  DROP COLUMN IF EXISTS processed_at,
  DROP COLUMN IF EXISTS processed_by,
  DROP COLUMN IF EXISTS rejection_reason,
  DROP COLUMN IF EXISTS payment_proof_url;
```

## Support Files

- `TOPUP-FIX-SUMMARY.md` - Detailed explanation
- `TOPUP-FIX-DEPLOYMENT.md` - Full deployment guide
- `verify-topup-fix.sql` - Verification queries
