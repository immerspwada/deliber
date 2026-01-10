# Customer Withdrawal Function Fix

## Problem Identified

The `request_customer_withdrawal` function was **dropped in migration 208** but never recreated, causing a **PostgreSQL error 42703** (undefined column) when customers try to withdraw money.

### Root Cause

- Migration 206 recreated the `customer_withdrawals` table without `bank_account_id` column
- Migration 208 dropped the old function that used `bank_account_id`
- **No new function was created** to replace it
- Frontend still calls the function with the old signature

## Solution

A new migration file has been created: `supabase/migrations/226_fix_request_customer_withdrawal.sql`

This migration recreates the `request_customer_withdrawal` function with:

- Accepts: `p_user_id`, `p_bank_account_id`, `p_amount`
- Looks up bank details from `customer_bank_accounts` table
- Stores bank details directly in `customer_withdrawals` table
- Validates balance and pending withdrawals
- Creates admin notifications

## How to Apply the Fix

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file: `supabase/migrations/226_fix_request_customer_withdrawal.sql`
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click **Run** to execute

### Option 2: Supabase CLI (If Linked)

```bash
# Make sure you're linked to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push the migration
npx supabase db push
```

### Option 3: Manual SQL Execution

Copy and run this SQL directly in your Supabase SQL Editor:

```sql
-- Drop existing function if any
DROP FUNCTION IF EXISTS request_customer_withdrawal(UUID, UUID, DECIMAL);
DROP FUNCTION IF EXISTS request_customer_withdrawal(DECIMAL, TEXT, TEXT, TEXT);

-- Create request_customer_withdrawal function
CREATE OR REPLACE FUNCTION request_customer_withdrawal(
  p_user_id UUID,
  p_bank_account_id UUID,
  p_amount DECIMAL
)
RETURNS TABLE (
  success BOOLEAN,
  withdrawal_id UUID,
  message TEXT
) AS $$
DECLARE
  v_wallet_balance DECIMAL;
  v_pending_amount DECIMAL;
  v_available_balance DECIMAL;
  v_withdrawal_id UUID;
  v_withdrawal_uid TEXT;
  v_bank_name TEXT;
  v_bank_account_number TEXT;
  v_bank_account_name TEXT;
BEGIN
  -- Validate amount
  IF p_amount < 100 THEN
    RETURN QUERY SELECT false, NULL::UUID, 'จำนวนเงินขั้นต่ำ 100 บาท'::TEXT;
    RETURN;
  END IF;

  IF p_amount > 100000 THEN
    RETURN QUERY SELECT false, NULL::UUID, 'จำนวนเงินสูงสุด 100,000 บาท'::TEXT;
    RETURN;
  END IF;

  -- Get wallet balance
  SELECT COALESCE(balance, 0) INTO v_wallet_balance
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF v_wallet_balance IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'ไม่พบข้อมูลกระเป๋าเงิน'::TEXT;
    RETURN;
  END IF;

  -- Calculate pending withdrawal amount
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_amount
  FROM customer_withdrawals
  WHERE user_id = p_user_id
    AND status IN ('pending', 'approved');

  -- Calculate available balance
  v_available_balance := v_wallet_balance - v_pending_amount;

  IF v_available_balance < p_amount THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      ('ยอดเงินไม่เพียงพอ (คงเหลือ ' || v_available_balance || ' บาท)')::TEXT;
    RETURN;
  END IF;

  -- Get bank account details
  SELECT
    bank_name,
    account_number,
    account_name
  INTO
    v_bank_name,
    v_bank_account_number,
    v_bank_account_name
  FROM customer_bank_accounts
  WHERE id = p_bank_account_id AND user_id = p_user_id;

  IF v_bank_name IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'ไม่พบข้อมูลบัญชีธนาคาร'::TEXT;
    RETURN;
  END IF;

  -- Check for existing pending withdrawals
  IF EXISTS (
    SELECT 1 FROM customer_withdrawals
    WHERE user_id = p_user_id AND status = 'pending'
  ) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'มีคำขอถอนเงินที่รออนุมัติอยู่แล้ว'::TEXT;
    RETURN;
  END IF;

  -- Create withdrawal request
  INSERT INTO customer_withdrawals (
    user_id,
    amount,
    bank_name,
    bank_account_number,
    bank_account_name,
    status
  ) VALUES (
    p_user_id,
    p_amount,
    v_bank_name,
    v_bank_account_number,
    v_bank_account_name,
    'pending'
  ) RETURNING id, withdrawal_uid INTO v_withdrawal_id, v_withdrawal_uid;

  -- Create notification for admins
  INSERT INTO user_notifications (
    user_id,
    type,
    title,
    message,
    data
  )
  SELECT
    u.id,
    'withdrawal_request',
    'คำขอถอนเงินใหม่',
    'มีคำขอถอนเงิน ' || p_amount || ' บาท รหัส ' || v_withdrawal_uid,
    json_build_object(
      'withdrawal_id', v_withdrawal_id,
      'withdrawal_uid', v_withdrawal_uid,
      'amount', p_amount,
      'user_id', p_user_id
    )
  FROM users u
  WHERE u.role IN ('admin', 'super_admin');

  RETURN QUERY SELECT
    true,
    v_withdrawal_id,
    ('สร้างคำขอถอนเงินเรียบร้อยแล้ว รหัส: ' || v_withdrawal_uid)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION request_customer_withdrawal(UUID, UUID, DECIMAL) TO anon, authenticated;
```

## Verification

After applying the migration, test the withdrawal function:

```sql
-- Test the function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'request_customer_withdrawal';

-- Should return: request_customer_withdrawal | FUNCTION
```

## What This Fixes

✅ Customers can now request withdrawals without errors  
✅ Function properly validates wallet balance  
✅ Function checks for pending withdrawals  
✅ Function looks up bank account details automatically  
✅ Admin notifications are created for new withdrawal requests

## Frontend Code (No Changes Needed)

The frontend code in `src/stores/wallet.ts` already calls the function correctly:

```typescript
const { data, error } = await supabase.rpc("request_customer_withdrawal", {
  p_user_id: user.id,
  p_bank_account_id: bankAccountId,
  p_amount: amount,
});
```

This will now work as expected! 🎉
