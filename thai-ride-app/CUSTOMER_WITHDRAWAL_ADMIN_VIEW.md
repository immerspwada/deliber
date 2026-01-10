# Customer Withdrawal Admin View - Implementation Summary

## Date: 2026-01-10

## Changes Made

### 1. Updated Admin Withdrawals View (`src/admin/views/WithdrawalsView.vue`)

**Changed from Provider Withdrawals to Customer Withdrawals:**

- Updated RPC function calls:

  - `admin_get_withdrawals` → `admin_get_customer_withdrawals`
  - `admin_count_withdrawals` → `admin_count_customer_withdrawals`
  - `admin_get_withdrawal_stats` → `admin_get_customer_withdrawal_stats`
  - `admin_approve_withdrawal` / `admin_reject_withdrawal` → `admin_process_withdrawal`

- Updated data fields to match customer withdrawal schema:

  - `provider_name` → `user_name`
  - `provider_uid` → `withdrawal_uid`
  - `provider_phone` → `user_phone`
  - Added `user_email` field
  - `account_number` → `bank_account_number`
  - `account_name` → `bank_account_name`
  - Removed `fee` and `net_amount` fields (not applicable to customer withdrawals)

- Updated UI labels:

  - "คำขอถอนเงิน" → "คำขอถอนเงินลูกค้า"
  - "Provider" → "ลูกค้า"
  - "Provider UID" → "Withdrawal UID"

- Added "cancelled" status support:

  - Added to status filter dropdown
  - Added to status label mapping
  - Added cancelled stats card with red icon

- Fixed toast notification calls to match adminUI store signature:
  - Changed from `showToast(message, type)` to `showToast(type, message)`

### 2. Admin Process Function

The view now uses `admin_process_withdrawal` function with actions:

- `"completed"` - Approve and mark as completed
- `"rejected"` - Reject the withdrawal request

**Note:** The current `admin_process_withdrawal` function (from migration 206) still deducts money on approval, which conflicts with the money reservation system implemented via MCP.

## Current System Flow

### Customer Withdrawal Request (Money Reservation)

1. Customer requests withdrawal at `/customer/wallet`
2. Money is **immediately deducted** from wallet (reserved)
3. Withdrawal transaction created with status: `pending`
4. Admin notification sent

### Admin Approval

1. Admin views request at `/admin/withdrawals`
2. Admin clicks approve
3. Status changes to `completed`
4. **Issue:** Current function tries to deduct money again (already deducted)

### Customer Cancellation

1. Customer clicks cancel button
2. Money is **returned** to wallet
3. Refund transaction created
4. Status changes to `cancelled`

## Known Issues

### ✅ Admin Process Function - FIXED

**Previous Issue:** The `admin_process_withdrawal` function in migration 206 would deduct money again on approval, causing double deduction.

**Solution Applied:** Created migration 227 and applied to hosted database.

The updated function now correctly handles money reservation:

```sql
IF p_action = 'completed' THEN
  -- Money already deducted, just update status
  UPDATE customer_withdrawals
  SET
    status = 'completed',
    completed_at = NOW(),
    processed_by = v_admin_id,
    admin_notes = p_admin_notes
  WHERE id = p_withdrawal_id;

ELSIF p_action = 'rejected' THEN
  -- Return money to wallet (refund)
  UPDATE user_wallets
  SET balance = balance + v_withdrawal.amount
  WHERE user_id = v_withdrawal.user_id;

  -- Create refund transaction
  INSERT INTO wallet_transactions (
    user_id, type, amount, description, reference_id, reference_type
  ) VALUES (
    v_withdrawal.user_id,
    'refund',
    v_withdrawal.amount,
    'คืนเงินจากการปฏิเสธถอนเงิน ' || v_withdrawal.withdrawal_uid,
    v_withdrawal.id,
    'customer_withdrawal_refund'
  );

  UPDATE customer_withdrawals
  SET
    status = 'rejected',
    reason = p_reason,
    processed_by = v_admin_id,
    processed_at = NOW(),
    admin_notes = p_admin_notes,
    released_at = NOW()
  WHERE id = p_withdrawal_id;
```

## Testing Checklist

- [ ] Customer can request withdrawal at `/customer/wallet`
- [ ] Money is deducted immediately (reserved)
- [ ] Admin can see withdrawal at `/admin/withdrawals`
- [ ] Admin can approve withdrawal (status → completed)
- [ ] Admin can reject withdrawal (money returned, status → rejected)
- [ ] Customer can cancel pending withdrawal (money returned, status → cancelled)
- [ ] Stats cards show correct counts and amounts
- [ ] Search and filter work correctly
- [ ] Detail modal shows all customer information
- [ ] No duplicate transactions or double deductions

## ✅ Completed Steps

1. ✅ **Updated `admin_process_withdrawal` function** to work with money reservation system
2. ✅ **Created migration 227** with the updated function
3. ✅ **Applied migration** to hosted database via Supabase MCP
4. ⏳ **Test complete flow** from customer request to admin approval/rejection
5. ⏳ **Verify wallet balances** are correct after all operations

## Next Steps for Testing

1. **Test customer withdrawal request:**

   - Go to `/customer/wallet`
   - Request withdrawal (e.g., 100 THB)
   - Verify money is deducted immediately from wallet
   - Check withdrawal status is "pending"

2. **Test admin approval:**

   - Go to `/admin/withdrawals`
   - Find the pending withdrawal
   - Click approve
   - Verify status changes to "completed"
   - Verify wallet balance remains the same (no double deduction)

3. **Test admin rejection:**

   - Request another withdrawal
   - Admin rejects it
   - Verify money is returned to wallet
   - Verify refund transaction is created
   - Verify status changes to "rejected"

4. **Test customer cancellation:**
   - Request another withdrawal
   - Customer cancels it themselves
   - Verify money is returned to wallet
   - Verify status changes to "cancelled"

## Files Modified

- `src/admin/views/WithdrawalsView.vue` - Updated to show customer withdrawals

## Database Functions Used

- `admin_get_customer_withdrawals(p_status, p_limit, p_offset)` - Get customer withdrawals
- `admin_count_customer_withdrawals(p_status)` - Count withdrawals
- `admin_get_customer_withdrawal_stats()` - Get statistics
- `admin_process_withdrawal(p_withdrawal_id, p_action, p_reason, p_admin_notes)` - Process withdrawal (needs update)

## Routes

- Customer: `/customer/wallet` - Request and cancel withdrawals
- Admin: `/admin/withdrawals` - View and process customer withdrawal requests
