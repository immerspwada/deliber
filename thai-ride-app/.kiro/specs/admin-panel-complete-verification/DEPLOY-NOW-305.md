# 🚀 DEPLOY NOW - Migration 305

## ⚡ Quick Deploy (Copy & Paste)

### Step 1: Open Supabase Dashboard

1. Go to your Supabase project
2. Click "SQL Editor" in the left sidebar
3. Click "New query"

### Step 2: Copy & Run This SQL

```sql
-- =====================================================
-- Migration: 305_fix_topup_requests_columns.sql
-- Purpose: Add missing columns to topup_requests table
-- =====================================================

-- Add missing columns
ALTER TABLE public.topup_requests
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT created_at,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- Backfill data
UPDATE public.topup_requests
SET requested_at = created_at
WHERE requested_at IS NULL;

UPDATE public.topup_requests
SET processed_at = COALESCE(approved_at, rejected_at)
WHERE processed_at IS NULL AND (approved_at IS NOT NULL OR rejected_at IS NOT NULL);

UPDATE public.topup_requests
SET processed_by = admin_id
WHERE processed_by IS NULL AND admin_id IS NOT NULL;

UPDATE public.topup_requests
SET rejection_reason = admin_note
WHERE rejection_reason IS NULL
  AND status = 'rejected'
  AND admin_note IS NOT NULL;

UPDATE public.topup_requests
SET payment_proof_url = slip_image_url
WHERE payment_proof_url IS NULL AND slip_image_url IS NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_topup_requests_requested_at ON public.topup_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_topup_requests_processed_at ON public.topup_requests(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_topup_requests_processed_by ON public.topup_requests(processed_by);

-- Update approve function
CREATE OR REPLACE FUNCTION approve_topup_request(
  p_request_id UUID,
  p_admin_id UUID,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_balance DECIMAL(12,2)
) AS $$
DECLARE
  v_request RECORD;
  v_txn_result RECORD;
BEGIN
  SELECT * INTO v_request
  FROM public.topup_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบคำขอเติมเงิน'::TEXT, 0::DECIMAL(12,2);
    RETURN;
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN QUERY SELECT false, 'คำขอนี้ถูกดำเนินการแล้ว'::TEXT, 0::DECIMAL(12,2);
    RETURN;
  END IF;

  UPDATE public.topup_requests
  SET status = 'approved',
      admin_id = p_admin_id,
      processed_by = p_admin_id,
      admin_note = p_admin_note,
      approved_at = NOW(),
      processed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id;

  SELECT * INTO v_txn_result
  FROM add_wallet_transaction(
    v_request.user_id,
    'topup',
    v_request.amount,
    'เติมเงินผ่าน ' || v_request.payment_method || ' (อนุมัติแล้ว) รหัส: ' || v_request.tracking_id,
    'topup_request',
    p_request_id
  );

  PERFORM send_notification(
    v_request.user_id,
    'payment',
    'เติมเงินสำเร็จ!',
    'เติมเงิน ฿' || v_request.amount::TEXT || ' เข้ากระเป๋าเรียบร้อยแล้ว',
    jsonb_build_object('request_id', p_request_id, 'amount', v_request.amount, 'new_balance', v_txn_result.new_balance),
    '/customer/wallet'
  );

  RETURN QUERY SELECT true, 'อนุมัติคำขอเติมเงินสำเร็จ'::TEXT, v_txn_result.new_balance;
END;
$$ LANGUAGE plpgsql;

-- Update reject function
CREATE OR REPLACE FUNCTION reject_topup_request(
  p_request_id UUID,
  p_admin_id UUID,
  p_admin_note TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request
  FROM public.topup_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'ไม่พบคำขอเติมเงิน'::TEXT;
    RETURN;
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN QUERY SELECT false, 'คำขอนี้ถูกดำเนินการแล้ว'::TEXT;
    RETURN;
  END IF;

  UPDATE public.topup_requests
  SET status = 'rejected',
      admin_id = p_admin_id,
      processed_by = p_admin_id,
      admin_note = p_admin_note,
      rejection_reason = p_admin_note,
      rejected_at = NOW(),
      processed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id;

  PERFORM send_notification(
    v_request.user_id,
    'payment',
    'คำขอเติมเงินถูกปฏิเสธ',
    'คำขอเติมเงิน ฿' || v_request.amount::TEXT || ' ถูกปฏิเสธ เหตุผล: ' || COALESCE(p_admin_note, 'ไม่ระบุ'),
    jsonb_build_object('request_id', p_request_id, 'reason', p_admin_note),
    '/customer/wallet'
  );

  RETURN QUERY SELECT true, 'ปฏิเสธคำขอเติมเงินสำเร็จ'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON COLUMN public.topup_requests.requested_at IS 'Timestamp when topup was requested';
COMMENT ON COLUMN public.topup_requests.processed_at IS 'Timestamp when topup was approved or rejected';
COMMENT ON COLUMN public.topup_requests.processed_by IS 'Admin user ID who processed the request';
COMMENT ON COLUMN public.topup_requests.rejection_reason IS 'Reason for rejection';
COMMENT ON COLUMN public.topup_requests.payment_proof_url IS 'URL to payment proof image';
```

### Step 3: Verify (Copy & Run)

```sql
-- Should return 5 rows
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'topup_requests'
  AND column_name IN (
    'requested_at',
    'processed_at',
    'processed_by',
    'rejection_reason',
    'payment_proof_url'
  )
ORDER BY column_name;
```

### Step 4: Test

1. Go to `https://your-domain.com/admin/topup-requests`
2. Page should load without errors
3. Try approve/reject buttons

## ✅ Success Indicators

- SQL runs without errors
- Verification query returns 5 rows
- Admin page loads successfully
- Approve/reject buttons work

## 🆘 If Something Goes Wrong

Run this to rollback:

```sql
ALTER TABLE public.topup_requests
  DROP COLUMN IF EXISTS requested_at,
  DROP COLUMN IF EXISTS processed_at,
  DROP COLUMN IF EXISTS processed_by,
  DROP COLUMN IF EXISTS rejection_reason,
  DROP COLUMN IF EXISTS payment_proof_url;
```

## 📞 Need Help?

Check these files:

- `TOPUP-QUICK-FIX.md` - Quick reference
- `DEPLOY-MIGRATION-305.md` - Detailed guide
- `DEPLOYMENT-SUMMARY.md` - Complete checklist

---

**Time Required**: 5 minutes
**Risk Level**: Low (backward compatible)
**Downtime**: None
