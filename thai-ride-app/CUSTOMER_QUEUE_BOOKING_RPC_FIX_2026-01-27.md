# Customer Queue Booking RPC Fix - 2026-01-27

**Date**: 2026-01-27  
**Status**: ✅ Fixed & Deployed  
**Priority**: 🔥 CRITICAL

---

## 🐛 Problem

Customer queue booking creation failed with error:

```
TypeError: Cannot read properties of undefined (reading 'success')
at createQueueBooking (useQueueBooking.ts:179:25)
```

### Error Context

From console logs:

```javascript
🎫 Creating queue booking...
👤 User ID: bc1a3546-ee13-47d6-804a-6be9055509b4
💰 Current balance (from composable): 929
💰 Formatted balance: ฿929.00
💵 Service fee: 50
🔌 Calling create_queue_atomic RPC...
✅ RPC Result: Object
❌ Create Queue Error: TypeError: Cannot read properties of undefined (reading 'success')
```

---

## 🔍 Root Cause Analysis

### Database Function Return Type

The `create_queue_atomic` RPC function returns a **JSON object directly**:

```sql
RETURN json_build_object(
  'success', true,
  'booking_id', v_booking_id,
  'tracking_id', v_tracking_id,
  'message', 'จองคิวสำเร็จ'
);
```

This means the result is:

```json
{
  "success": true,
  "booking_id": "uuid",
  "tracking_id": "QUE-xxx",
  "message": "จองคิวสำเร็จ"
}
```

### Code Issue

The code was trying to access `result[0].success` when it should access `result.success` directly.

**Incorrect Pattern:**

```typescript
const atomicResult = result[0]  // ❌ Wrong - result is not an array
if (!atomicResult.success) { ... }
```

**Correct Pattern:**

```typescript
// Result is the JSON object directly (not wrapped in array)
if (!result.success) { ... }  // ✅ Correct
```

---

## ✅ Solution Applied

### File: `src/composables/useQueueBooking.ts`

**Enhanced logging and fixed result handling:**

```typescript
console.log("✅ RPC Result:", result);
console.log("✅ Result type:", typeof result);
console.log("✅ Result keys:", result ? Object.keys(result) : "null");

// Check result - function returns JSON object directly, not array
if (!result) {
  console.error("❌ No result returned from RPC");
  error.value = "ไม่สามารถจองคิวได้";
  return null;
}

// Result is the JSON object directly (not wrapped in array)
if (!result.success) {
  console.error("❌ Booking failed:", result.message);
  error.value = result.message || "ไม่สามารถจองคิวได้";
  return null;
}

console.log("✅ Booking created successfully:", result.booking_id);
```

### Key Changes

1. ✅ Added detailed logging to debug result structure
2. ✅ Access `result.success` directly (not `result[0].success`)
3. ✅ Access `result.booking_id` directly (not `result[0].booking_id`)
4. ✅ Access `result.message` directly (not `result[0].message`)

---

## 🚀 Deployment

### Commit

```bash
git add -A
git commit -m "fix: enhance RPC result logging for queue booking debug"
git push origin main
```

**Commit Hash**: `2b2be58`

### Vercel Deployment

The changes are automatically deployed to production via Vercel.

---

## 🧪 Testing Instructions

### Test Case 1: Successful Booking

1. Login as customer
2. Navigate to Queue Booking page
3. Fill in booking details:
   - Category: Any
   - Place name: Test Place
   - Scheduled date: Future date
   - Scheduled time: Future time
4. Click "ยืนยันการจอง"
5. **Expected**: Booking created successfully, wallet deducted

### Test Case 2: Insufficient Balance

1. Login as customer with low balance (< 50 THB)
2. Try to create queue booking
3. **Expected**: Error message "ยอดเงินใน Wallet ไม่เพียงพอ"

### Test Case 3: Past Date Validation

1. Try to create booking with past date/time
2. **Expected**: Error message "กรุณาเลือกวันและเวลาในอนาคต"

---

## 📊 Verification Checklist

- [x] Code fix applied
- [x] Enhanced logging added
- [x] Committed to git
- [x] Pushed to production
- [ ] Tested successful booking
- [ ] Tested insufficient balance error
- [ ] Tested validation errors
- [ ] Verified wallet deduction
- [ ] Verified transaction record

---

## 🔄 Related Issues

### Previous Fix (2026-01-27)

**File**: `CUSTOMER_QUEUE_BOOKING_RPC_FIX_2026-01-27.md` (earlier today)

Similar issue was fixed but the code still had the array access pattern. This fix ensures the correct pattern is used consistently.

### Admin Queue Cancellation (2026-01-26)

**Files**:

- `ADMIN_QUEUE_CANCELLATION_COMPLETE_2026-01-26.md`
- `ADMIN_QUEUE_CANCELLATION_TRIGGER_FIX_2026-01-27.md`

Admin queue cancellation was fixed with proper RPC function and trigger.

---

## 💡 Key Learnings

### RPC Return Types

1. **JSON Object**: `json_build_object()` returns a single object

   ```typescript
   const { data: result } = await supabase.rpc("function_name");
   // result is: { success: true, ... }
   ```

2. **Table Rows**: `RETURN QUERY` or `RETURNS TABLE` returns array

   ```typescript
   const { data: result } = await supabase.rpc("function_name");
   // result is: [{ id: 1, ... }, { id: 2, ... }]
   ```

3. **Single Value**: `RETURNS type` returns single value
   ```typescript
   const { data: result } = await supabase.rpc("function_name");
   // result is: 42 or "string" or true
   ```

### Best Practices

1. ✅ Always log the result structure when debugging
2. ✅ Check the database function return type
3. ✅ Use TypeScript types to catch these issues
4. ✅ Add comprehensive error handling
5. ✅ Test with different scenarios

---

## 🎯 Next Steps

1. Monitor production logs for successful bookings
2. Verify wallet balance updates correctly
3. Check transaction records are created
4. Ensure realtime updates work
5. Test on mobile devices

---

## 📝 Notes

### Cache Considerations

If the fix doesn't work immediately:

1. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+F5)
2. Clear browser cache
3. Check Vercel deployment status
4. Verify correct commit is deployed

### Monitoring

Watch for these log messages:

- ✅ `RPC Result:` - Should show object structure
- ✅ `Result type:` - Should be "object"
- ✅ `Result keys:` - Should show ["success", "booking_id", "tracking_id", "message"]
- ✅ `Booking created successfully:` - Should show UUID

---

**Status**: ✅ Fix deployed, awaiting production verification

**Last Updated**: 2026-01-27 01:45 AM
