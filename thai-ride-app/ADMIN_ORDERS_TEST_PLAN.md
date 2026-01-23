# Admin Orders - Complete Test Plan

**Date**: 2026-01-23  
**Status**: Ready for Testing  
**Priority**: 🔥 High

---

## 🎯 Test Objectives

1. Verify admin can update order status for all service types
2. Verify cancellation tracking works correctly
3. Verify notifications are sent
4. Verify database audit trail is correct

---

## 🧪 Test Cases

### Test Case 1: Update Delivery Status

**Preconditions**:

- Admin logged in as superadmin@gobear.app
- At least one delivery order exists with status "pending" or "matched"

**Steps**:

1. Navigate to Admin → Orders
2. Filter by service type: "จัดส่ง" (Delivery)
3. Find an order with status "รอรับ" or "จับคู่แล้ว"
4. Click the status dropdown
5. Select "ยกเลิก" (Cancelled)

**Expected Results**:

- ✅ Status updates to "ยกเลิก" immediately
- ✅ No 404 error in console
- ✅ Success toast message appears
- ✅ Order list refreshes with new status

**Database Verification**:

```sql
SELECT
  id,
  tracking_id,
  status,
  cancelled_by,
  cancelled_by_role,
  cancelled_at,
  cancel_reason
FROM delivery_requests
WHERE id = '<order_id>';
```

**Expected Database State**:

```
status: 'cancelled'
cancelled_by: '<admin_user_uuid>'
cancelled_by_role: 'admin'
cancelled_at: '<timestamp>'
cancel_reason: 'ยกเลิกโดย Admin'
```

---

### Test Case 2: Update Ride Status

**Preconditions**:

- Admin logged in
- At least one ride order exists

**Steps**:

1. Navigate to Admin → Orders
2. Filter by service type: "เรียกรถ" (Ride)
3. Find an order
4. Change status to "กำลังดำเนินการ" (In Progress)

**Expected Results**:

- ✅ Status updates successfully
- ✅ No errors
- ✅ Notification sent to customer

---

### Test Case 3: Update Shopping Status

**Preconditions**:

- Admin logged in
- At least one shopping order exists

**Steps**:

1. Navigate to Admin → Orders
2. Filter by service type: "ช้อปปิ้ง" (Shopping)
3. Find an order
4. Change status to "เสร็จสิ้น" (Completed)

**Expected Results**:

- ✅ Status updates successfully
- ✅ Completion timestamp recorded

---

### Test Case 4: Cancel from Tracking Page (Customer)

**Preconditions**:

- Customer logged in
- Has an active delivery order

**Steps**:

1. Navigate to tracking page: `/tracking/<tracking_id>`
2. Click "ยกเลิกคำสั่ง" button
3. Confirm cancellation

**Expected Results**:

- ✅ Order cancelled successfully
- ✅ Refund request created
- ✅ Database shows:
  - `cancelled_by`: customer's UUID
  - `cancelled_by_role`: 'customer'

---

### Test Case 5: Bulk Status Update

**Preconditions**:

- Admin logged in
- Multiple orders exist

**Steps**:

1. Navigate to Admin → Orders
2. Select multiple orders (checkbox)
3. Click "เปลี่ยนสถานะ" button
4. Select new status
5. Confirm

**Expected Results**:

- ✅ All selected orders updated
- ✅ Each has correct `cancelled_by` and `cancelled_by_role`

---

### Test Case 6: Status Transition Validation

**Test all valid transitions**:

| From        | To          | Should Work         |
| ----------- | ----------- | ------------------- |
| pending     | matched     | ✅                  |
| pending     | cancelled   | ✅                  |
| matched     | in_progress | ✅                  |
| matched     | cancelled   | ✅                  |
| in_progress | completed   | ✅                  |
| in_progress | cancelled   | ✅                  |
| completed   | cancelled   | ❌ (should prevent) |
| cancelled   | any         | ❌ (should prevent) |

---

### Test Case 7: Notification Verification

**Steps**:

1. Admin cancels an order
2. Check customer's notifications

**Expected Results**:

- ✅ Customer receives notification
- ✅ Notification contains:
  - Title: "คำสั่งถูกยกเลิก"
  - Message: "คำสั่ง <tracking_id> ถูกยกเลิกแล้ว"
  - Data: order_id, tracking_id, status

**Database Check**:

```sql
SELECT * FROM user_notifications
WHERE user_id = '<customer_id>'
ORDER BY created_at DESC
LIMIT 1;
```

---

### Test Case 8: RLS Policy Verification

**Test admin access**:

```sql
-- Should return data (admin has access)
SET request.jwt.claims = '{"sub": "<admin_user_id>", "role": "authenticated"}';
SELECT * FROM delivery_requests WHERE id = '<order_id>';
```

**Test customer access**:

```sql
-- Should only return own orders
SET request.jwt.claims = '{"sub": "<customer_user_id>", "role": "authenticated"}';
SELECT * FROM delivery_requests WHERE id = '<order_id>';
```

---

### Test Case 9: Error Handling

**Test authentication error**:

1. Logout
2. Try to access admin orders page
3. Should redirect to login

**Test permission error**:

1. Login as regular customer
2. Try to access `/admin/orders`
3. Should show "Unauthorized" or redirect

**Test network error**:

1. Disconnect internet
2. Try to update status
3. Should show error message

---

### Test Case 10: Audit Trail

**Verify complete audit trail**:

```sql
SELECT
  dr.tracking_id,
  dr.status,
  dr.cancelled_by,
  dr.cancelled_by_role,
  dr.cancelled_at,
  dr.cancel_reason,
  u.email as cancelled_by_email,
  u.first_name,
  u.last_name
FROM delivery_requests dr
LEFT JOIN users u ON u.id = dr.cancelled_by
WHERE dr.status = 'cancelled'
ORDER BY dr.cancelled_at DESC
LIMIT 10;
```

**Expected**:

- ✅ All cancelled orders have `cancelled_by` UUID
- ✅ All have `cancelled_by_role`
- ✅ Can JOIN to users table to get admin info
- ✅ Timestamps are correct

---

## 🔍 Edge Cases

### Edge Case 1: Concurrent Updates

**Scenario**: Two admins try to update same order simultaneously

**Test**:

1. Admin A opens order
2. Admin B opens same order
3. Admin A changes status to "cancelled"
4. Admin B changes status to "completed"

**Expected**: Last write wins, but both should succeed without errors

---

### Edge Case 2: Already Cancelled Order

**Scenario**: Try to cancel an already cancelled order

**Test**:

1. Cancel an order
2. Try to cancel it again

**Expected**: Should show error or prevent action

---

### Edge Case 3: Missing User Session

**Scenario**: Session expires during update

**Test**:

1. Login as admin
2. Wait for session to expire (or manually clear)
3. Try to update order status

**Expected**: Should show "Not authenticated" error

---

## 📊 Performance Tests

### Load Test 1: Large Order List

**Test**:

- Load page with 1000+ orders
- Measure load time
- Check for memory leaks

**Expected**: < 3 seconds load time

---

### Load Test 2: Rapid Status Updates

**Test**:

- Update 10 orders in quick succession
- Check for race conditions

**Expected**: All updates succeed

---

## 🐛 Regression Tests

### Regression 1: Tracking Page Cancel

**Verify previous fix still works**:

1. Go to tracking page
2. Cancel delivery
3. Verify refund request created

**Expected**: ✅ Still works

---

### Regression 2: Provider Cancellation

**Verify provider can still cancel**:

1. Login as provider
2. Accept a job
3. Cancel it

**Expected**:

- ✅ `cancelled_by`: provider's UUID
- ✅ `cancelled_by_role`: 'provider'

---

## ✅ Acceptance Criteria

### Must Pass

- [ ] Admin can update status for all service types
- [ ] No 404 errors
- [ ] Database fields populated correctly
- [ ] Notifications sent
- [ ] Audit trail complete
- [ ] RLS policies work
- [ ] No TypeScript errors
- [ ] No console errors

### Should Pass

- [ ] Performance acceptable (< 3s)
- [ ] Error messages user-friendly
- [ ] UI responsive
- [ ] Mobile works

### Nice to Have

- [ ] Bulk operations work
- [ ] Status history tracked
- [ ] Undo functionality

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] All test cases pass
- [ ] Code reviewed
- [ ] Database migrations applied
- [ ] Types generated
- [ ] No breaking changes

### Deployment

- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Monitor for errors

### Post-Deployment

- [ ] Verify in production
- [ ] Check error logs
- [ ] Monitor performance
- [ ] Collect user feedback

---

## 📝 Test Results Template

```markdown
## Test Execution Report

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Environment**: [Staging/Production]

### Test Results

| Test Case                   | Status  | Notes |
| --------------------------- | ------- | ----- |
| TC1: Update Delivery Status | ✅ Pass |       |
| TC2: Update Ride Status     | ✅ Pass |       |
| TC3: Update Shopping Status | ✅ Pass |       |
| TC4: Cancel from Tracking   | ✅ Pass |       |
| TC5: Bulk Update            | ✅ Pass |       |
| TC6: Status Transitions     | ✅ Pass |       |
| TC7: Notifications          | ✅ Pass |       |
| TC8: RLS Policies           | ✅ Pass |       |
| TC9: Error Handling         | ✅ Pass |       |
| TC10: Audit Trail           | ✅ Pass |       |

### Issues Found

1. [Issue description]
   - Severity: [High/Medium/Low]
   - Status: [Open/Fixed]

### Overall Result

- ✅ PASS / ❌ FAIL
- Ready for production: YES / NO
```

---

**Last Updated**: 2026-01-23  
**Next Review**: After testing complete
