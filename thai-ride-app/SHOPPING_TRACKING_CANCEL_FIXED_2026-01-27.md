# ✅ Shopping Tracking - Cancel Function Fixed

**Date**: 2026-01-27  
**Issue**: Shopping orders cannot be cancelled from tracking page  
**Status**: ✅ Fixed

---

## 🔍 Problem Analysis

### Error Message

```
POST /rest/v1/rpc/cancel_request_with_pending_refund 400 (Bad Request)
Cancel error: {code: 'P0001', details: null, hint: null, message: 'REQUEST_NOT_FOUND'}
```

### Root Cause

The `cancel_request_with_pending_refund` function had **incorrect column mapping** for Shopping orders:

**❌ Before:**

```sql
v_amount_column := CASE p_request_type
  WHEN 'delivery' THEN 'estimated_fee'
  ELSE 'estimated_fare'  -- ❌ Wrong for Shopping!
END;
```

**Shopping orders use `service_fee` NOT `estimated_fare`**

---

## 🔧 Solution

### 1. Fixed Column Mapping

```sql
-- ✅ Correct column mapping
v_amount_column := CASE p_request_type
  WHEN 'shopping' THEN 'service_fee'      -- ✅ Shopping uses service_fee
  WHEN 'queue' THEN 'service_fee'         -- ✅ Queue uses service_fee
  WHEN 'delivery' THEN 'estimated_fee'    -- ✅ Delivery uses estimated_fee
  ELSE 'estimated_fare'                   -- ✅ Ride/Moving/Laundry use estimated_fare
END;
```

### 2. Fixed Timestamp Column

Shopping and Delivery tables don't have `matched_at` column, they use `created_at`:

```sql
-- ✅ Use correct timestamp column
IF p_request_type IN ('shopping', 'delivery') THEN
  EXECUTE format(
    'SELECT user_id, provider_id, status, %I, tracking_id, created_at
     FROM %I WHERE id = $1 FOR UPDATE',
    v_amount_column,
    v_table_name
  ) INTO v_user_id, v_provider_id, v_current_status, v_estimated_amount, v_tracking_id, v_matched_at
  USING p_request_id;
ELSE
  EXECUTE format(
    'SELECT user_id, provider_id, status, %I, tracking_id, matched_at
     FROM %I WHERE id = $1 FOR UPDATE',
    v_amount_column,
    v_table_name
  ) INTO v_user_id, v_provider_id, v_current_status, v_estimated_amount, v_tracking_id, v_matched_at
  USING p_request_id;
END IF;
```

### 3. Added Shopping Statuses

```sql
-- ✅ Support Shopping-specific statuses
ELSIF v_current_status IN ('arriving', 'picked_up', 'pickup', 'in_progress', 'in_transit', 'shopping', 'delivering') THEN
  -- Service in progress (added shopping, delivering statuses)
  IF p_cancelled_by_role = 'customer' THEN
    v_cancellation_fee := LEAST(100, v_estimated_amount * 0.30);
  ELSE
    v_cancellation_fee := 0;
  END IF;
END IF;
```

---

## ✅ Verification

### Test Cancellation

```sql
SELECT cancel_request_with_pending_refund(
  '5f7fb2e0-976b-4849-9d88-21776727804c'::uuid,  -- Shopping order ID
  'shopping',
  'bc1a3546-ee13-47d6-804a-6be9055509b4'::uuid,  -- Customer ID
  'customer',
  'ทดสอบยกเลิก'
);
```

**Result:**

```json
{
  "success": true,
  "request_id": "5f7fb2e0-976b-4849-9d88-21776727804c",
  "request_type": "shopping",
  "tracking_id": "SHP-20260127-415366",
  "previous_status": "pending",
  "cancelled_by_role": "customer",
  "cancellation_fee": 0,
  "refund_amount": 82,
  "refund_status": "pending_admin_approval",
  "refund_request_id": "d043be18-2269-4a40-96d8-b14854fea9a3",
  "refund_tracking_id": "RFD-20260127-262165",
  "message": "ยกเลิกสำเร็จ คำขอคืนเงินรอการอนุมัติจาก Admin"
}
```

### Verify Shopping Order Status

```sql
SELECT
  tracking_id,
  status,
  cancelled_at,
  cancelled_by_role,
  cancel_reason,
  cancellation_fee,
  refund_status,
  service_fee
FROM shopping_requests
WHERE id = '5f7fb2e0-976b-4849-9d88-21776727804c';
```

**Result:**
| tracking_id | status | cancelled_at | cancelled_by_role | cancel_reason | cancellation_fee | refund_status | service_fee |
|-------------|--------|--------------|-------------------|---------------|------------------|---------------|-------------|
| SHP-20260127-415366 | cancelled | 2026-01-27 06:38:36 | customer | ทดสอบยกเลิก | 0.00 | pending | 82.00 |

### Verify Refund Request Created

```sql
SELECT
  tracking_id,
  request_type,
  request_tracking_id,
  original_amount,
  cancellation_fee,
  refund_amount,
  status
FROM cancellation_refund_requests
WHERE request_id = '5f7fb2e0-976b-4849-9d88-21776727804c';
```

**Result:**
| tracking_id | request_type | request_tracking_id | original_amount | cancellation_fee | refund_amount | status |
|-------------|--------------|---------------------|-----------------|------------------|---------------|--------|
| RFD-20260127-262165 | shopping | SHP-20260127-415366 | 82.00 | 0.00 | 82.00 | pending |

---

## 📋 Column Name Reference

| Request Type | Table Name        | Amount Column    | Timestamp Column |
| ------------ | ----------------- | ---------------- | ---------------- |
| **ride**     | ride_requests     | `estimated_fare` | `matched_at`     |
| **delivery** | delivery_requests | `estimated_fee`  | `created_at` ✅  |
| **shopping** | shopping_requests | `service_fee` ✅ | `created_at` ✅  |
| **queue**    | queue_bookings    | `service_fee` ✅ | `confirmed_at`   |
| **moving**   | moving_requests   | `estimated_fare` | `matched_at`     |
| **laundry**  | laundry_requests  | `estimated_fare` | `matched_at`     |

---

## 🎯 Cancellation Fee Logic

### Pending Status

- **Fee**: ฿0
- **Refund**: 100% of service_fee

### Matched Status (< 5 minutes)

- **Fee**: ฿0
- **Refund**: 100% of service_fee

### Matched Status (> 5 minutes)

- **Customer cancels**: 20% fee (max ฿50)
- **Provider/Admin cancels**: ฿0 fee
- **Refund**: service_fee - cancellation_fee

### In Progress (shopping/delivering)

- **Customer cancels**: 30% fee (max ฿100)
- **Provider/Admin cancels**: ฿0 fee
- **Refund**: service_fee - cancellation_fee

---

## 🔄 Complete Flow

### 1. Customer Cancels from Tracking Page

```
http://localhost:5173/tracking/SHP-20260127-415366
↓
Click "ยกเลิกคำสั่งซื้อ"
↓
Confirm cancellation
↓
Call: cancel_request_with_pending_refund()
```

### 2. Function Execution

```
1. Validate request type: 'shopping' ✅
2. Validate role: 'customer' ✅
3. Get table name: 'shopping_requests' ✅
4. Get amount column: 'service_fee' ✅
5. Get timestamp column: 'created_at' ✅
6. Lock row and get data ✅
7. Calculate cancellation fee: ฿0 (pending status) ✅
8. Calculate refund: ฿82.00 ✅
9. Update shopping_requests:
   - status = 'cancelled' ✅
   - cancelled_at = NOW() ✅
   - cancelled_by_role = 'customer' ✅
   - cancellation_fee = 0 ✅
   - refund_status = 'pending' ✅
10. Create refund request:
    - tracking_id = 'RFD-20260127-262165' ✅
    - status = 'pending' ✅
    - refund_amount = ฿82.00 ✅
11. Return success response ✅
```

### 3. Admin Approval (Next Step)

```
Admin Dashboard → Refund Requests
↓
Find: RFD-20260127-262165
↓
Review: Shopping order SHP-20260127-415366
↓
Approve refund
↓
Credit ฿82.00 back to customer wallet
```

---

## 🎉 Success Criteria

- [x] Shopping orders can be cancelled from tracking page
- [x] Correct column names used (`service_fee` not `estimated_fare`)
- [x] Correct timestamp column used (`created_at` not `matched_at`)
- [x] Cancellation fee calculated correctly
- [x] Refund amount calculated correctly
- [x] Shopping order status updated to 'cancelled'
- [x] Refund request created with status 'pending'
- [x] No errors in console
- [x] Function returns success response

---

## 🚀 Next Steps

### For Customer:

1. ✅ Can cancel Shopping orders from tracking page
2. ✅ See cancellation confirmation
3. ⏳ Wait for admin to approve refund
4. ⏳ Receive refund in wallet

### For Admin:

1. ⏳ Review refund request RFD-20260127-262165
2. ⏳ Approve/Reject refund
3. ⏳ System credits wallet automatically

---

**Summary**: Shopping order cancellation now works correctly! Function updated to use `service_fee` column and `created_at` timestamp for Shopping orders.
