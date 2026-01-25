# Customer Delivery Creation - FIXED ✅

**Date**: 2026-01-23  
**Status**: ✅ Complete  
**Issue**: PGRST203 - Function overloading conflict

---

## 🐛 Problem

Customer delivery creation was failing with error:

```
PGRST203: Could not choose the best candidate function
```

**Root Cause**: Two versions of `create_delivery_atomic` function existed with conflicting parameter types:

1. Version 1: `VARCHAR` for names/phones, `NUMERIC` for coordinates, wrong table `wallets`
2. Version 2: `TEXT` for names/phones, `DOUBLE PRECISION` for coordinates, correct table `user_wallets`

PostgreSQL couldn't determine which function to call because the parameters were ambiguous.

**Additional Issue**: Function was using `'deduct'` as transaction type, but `wallet_transactions` table only allows: `topup`, `payment`, `refund`, `cashback`, `referral`, `promo`, `withdrawal`.

---

## ✅ Solution

### 1. Dropped Both Conflicting Functions

```sql
DROP FUNCTION IF EXISTS create_delivery_atomic(
  uuid, character varying, character varying, text, numeric, numeric,
  character varying, character varying, text, numeric, numeric,
  character varying, numeric, text, text, text, numeric, numeric
);

DROP FUNCTION IF EXISTS create_delivery_atomic(
  uuid, text, text, text, double precision, double precision,
  text, text, text, double precision, double precision,
  text, numeric, text, text, text, numeric, numeric
);
```

### 2. Created Single Correct Version

**Parameter Types**:

- Names/phones: `TEXT` (matches frontend string type)
- Coordinates: `NUMERIC` (matches table schema)
- Table: `user_wallets` (correct table name)
- Transaction type: `payment` (valid type)

```sql
CREATE OR REPLACE FUNCTION create_delivery_atomic(
  p_user_id uuid,
  p_sender_name text,
  p_sender_phone text,
  p_sender_address text,
  p_sender_lat numeric,
  p_sender_lng numeric,
  p_recipient_name text,
  p_recipient_phone text,
  p_recipient_address text,
  p_recipient_lat numeric,
  p_recipient_lng numeric,
  p_package_type text,
  p_package_weight numeric,
  p_package_description text,
  p_package_photo text,
  p_special_instructions text,
  p_estimated_fee numeric,
  p_distance_km numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_balance DECIMAL;
  v_delivery_id UUID;
  v_tracking_id VARCHAR;
  v_result JSON;
BEGIN
  -- Check wallet balance from user_wallets table
  SELECT balance INTO v_wallet_balance
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND';
  END IF;

  IF v_wallet_balance < p_estimated_fee THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  -- Deduct from wallet
  UPDATE user_wallets
  SET
    balance = balance - p_estimated_fee,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Create delivery request
  INSERT INTO delivery_requests (
    user_id,
    sender_name,
    sender_phone,
    sender_address,
    sender_lat,
    sender_lng,
    recipient_name,
    recipient_phone,
    recipient_address,
    recipient_lat,
    recipient_lng,
    package_type,
    package_weight,
    package_description,
    package_photo,
    special_instructions,
    estimated_fee,
    distance_km,
    status,
    payment_method,
    payment_status
  ) VALUES (
    p_user_id,
    p_sender_name,
    p_sender_phone,
    p_sender_address,
    p_sender_lat,
    p_sender_lng,
    p_recipient_name,
    p_recipient_phone,
    p_recipient_address,
    p_recipient_lat,
    p_recipient_lng,
    p_package_type,
    p_package_weight,
    p_package_description,
    p_package_photo,
    p_special_instructions,
    p_estimated_fee,
    p_distance_km,
    'pending',
    'wallet',
    'paid'
  )
  RETURNING id, tracking_id INTO v_delivery_id, v_tracking_id;

  -- Record wallet transaction (use 'payment' type)
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount,
    balance_before,
    balance_after,
    reference_type,
    reference_id,
    description,
    status
  ) VALUES (
    p_user_id,
    'payment',
    p_estimated_fee,
    v_wallet_balance,
    v_wallet_balance - p_estimated_fee,
    'delivery',
    v_delivery_id,
    'ค่าบริการส่งพัสดุ ' || v_tracking_id,
    'completed'
  );

  v_result := json_build_object(
    'success', true,
    'delivery_id', v_delivery_id,
    'tracking_id', v_tracking_id,
    'message', 'สร้างคำขอส่งพัสดุสำเร็จ'
  );

  RETURN v_result;
END;
$$;
```

---

## 🧪 Testing

### Test Case: Create Delivery

```sql
SELECT create_delivery_atomic(
  'bc1a3546-ee13-47d6-804a-6be9055509b4'::uuid,
  'Test Sender',
  '0812345678',
  '123 Test Street, Bangkok',
  13.7563,
  100.5018,
  'Test Recipient',
  '0898765432',
  '456 Test Avenue, Bangkok',
  13.7465,
  100.5345,
  'document',
  0.5,
  'Test package',
  null,
  'Handle with care',
  50.00,
  5.5
);
```

**Result**: ✅ Success

```json
{
  "success": true,
  "delivery_id": "14900cfa-1fef-4cf4-ba1b-6541111ff40a",
  "tracking_id": "DEL-20260123-000004",
  "message": "สร้างคำขอส่งพัสดุสำเร็จ"
}
```

### Verification

1. **Delivery Created**: ✅
   - ID: `14900cfa-1fef-4cf4-ba1b-6541111ff40a`
   - Tracking: `DEL-20260123-000004`
   - Status: `pending`
   - Payment Status: `paid`

2. **Wallet Deducted**: ✅
   - Before: 1150.00 THB
   - After: 1100.00 THB
   - Amount: 50.00 THB

3. **Transaction Recorded**: ✅
   - Type: `payment`
   - Status: `completed`
   - Description: "ค่าบริการส่งพัสดุ DEL-20260123-000004"

---

## 📊 Summary

| Issue                               | Status   | Fix                                                   |
| ----------------------------------- | -------- | ----------------------------------------------------- |
| Function overloading conflict       | ✅ Fixed | Dropped both versions, created single correct version |
| Wrong table reference (`wallets`)   | ✅ Fixed | Changed to `user_wallets`                             |
| Invalid transaction type (`deduct`) | ✅ Fixed | Changed to `payment`                                  |
| Parameter type mismatch             | ✅ Fixed | Used TEXT for strings, NUMERIC for coordinates        |

---

## 🎯 Next Steps

1. ✅ Customer delivery creation working
2. ⏳ Test in frontend at `/customer/delivery`
3. ⏳ Verify admin delivery view at `/admin/delivery`
4. ⏳ Test provider delivery acceptance flow

---

## 📝 Related Files

- **Function**: `create_delivery_atomic` (PostgreSQL)
- **Frontend**: `src/composables/useDelivery.ts`
- **View**: `src/views/DeliveryView.vue`
- **Admin View**: `src/admin/views/DeliveryView.vue`

---

**Last Updated**: 2026-01-23  
**Tested By**: MCP Production Workflow  
**Status**: ✅ Ready for Production
