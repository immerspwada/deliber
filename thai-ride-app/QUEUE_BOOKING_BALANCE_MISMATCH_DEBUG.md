# 🐛 Queue Booking Balance Mismatch Debug

**Date**: 2026-01-26  
**Issue**: Error "ยอดเงินไม่เพียงพอ" แม้ว่าจะมียอดเงิน 946 บาท  
**Status**: 🔍 Debugging

---

## 🔍 Problem Description

### User Report

- Wallet shows **946 THB** balance
- System shows error: "ยอดเงินไม่เพียงพอ กรุณาเติมเงินก่อนจองคิว"
- Required amount: **50 THB** (queue booking fee)
- **946 > 50** ✅ Should be sufficient!

### Verified from Database

```sql
SELECT id, email, wallet_balance
FROM users
WHERE email = 'superadmin@gobear.app';
```

**Result**:

```json
{
  "id": "05ea4b43-ccef-40dc-a998-810d19e8024f",
  "email": "superadmin@gobear.app",
  "wallet_balance": "946.00"
}
```

✅ **Confirmed**: Database has correct balance

---

## 🔍 Root Cause Analysis

### Possible Causes

#### 1. **User ID Mismatch** (Most Likely)

- `useWalletBalance` fetches balance for `authStore.user.id`
- `create_queue_atomic` checks balance for `p_user_id`
- If these IDs don't match → Wrong balance checked

#### 2. **Timing Issue**

- `useWalletBalance` hasn't finished fetching when UI renders
- Shows default value (0) instead of actual balance (946)

#### 3. **RLS Policy Blocking**

- RLS policy might block access to `users.wallet_balance`
- Function sees NULL or 0 instead of 946

#### 4. **Transaction Isolation**

- Function uses `FOR UPDATE` lock
- Might see stale data if another transaction is active

---

## 🔧 Debug Logging Added

### 1. In `useWalletBalance.ts`

```typescript
console.log("🔍 Fetching wallet balance for user:", authStore.user.id);
console.log(
  "📦 Raw wallet_balance from DB:",
  data.wallet_balance,
  "Type:",
  typeof data.wallet_balance,
);
console.log("✅ Parsed string to number:", balance.value);
console.log("💰 Final balance value:", balance.value);
console.log("💰 Formatted balance:", formattedBalance.value);
```

### 2. In `useQueueBooking.ts`

```typescript
console.log("🎫 Creating queue booking...");
console.log("👤 User ID:", userId);
console.log("💰 Current balance (from composable):", balance.value);
console.log("💰 Formatted balance:", formattedBalance.value);
console.log("💵 Service fee:", 50);
console.log("🔌 Calling create_queue_atomic RPC...");
console.log("✅ RPC Result:", result);
```

### 3. In `QueueBookingView.vue`

```typescript
watch(
  balance,
  (newBalance) => {
    console.log("💰 Balance changed in QueueBookingView:", newBalance);
  },
  { immediate: true },
);
```

---

## 🧪 Testing Steps

### Step 1: Open Browser Console

```bash
# Start dev server
npm run dev

# Open: http://localhost:5173/customer/queue-booking
# Open DevTools (F12) → Console tab
```

### Step 2: Check Initial Logs

Look for these logs when page loads:

```
🔍 Fetching wallet balance for user: 05ea4b43-ccef-40dc-a998-810d19e8024f
📦 Raw wallet_balance from DB: 946.00 Type: string
✅ Parsed string to number: 946
💰 Final balance value: 946
💰 Formatted balance: ฿946.00
💰 Balance changed in QueueBookingView: 946
```

**Expected**: Balance should be **946**  
**If shows 0**: User ID mismatch or fetch failed

### Step 3: Navigate to Step 4 (Confirmation)

Check wallet card:

- **Green theme** = Balance ≥ 50 ✅
- **Red theme** = Balance < 50 ❌

### Step 4: Click Submit Button

Look for these logs:

```
🎫 Creating queue booking...
👤 User ID: 05ea4b43-ccef-40dc-a998-810d19e8024f
💰 Current balance (from composable): 946
💰 Formatted balance: ฿946.00
💵 Service fee: 50
🔌 Calling create_queue_atomic RPC...
```

**Then one of**:

#### Success Case:

```
✅ RPC Result: [{success: true, booking_id: "...", ...}]
✅ Booking created successfully: ...
```

#### Error Case:

```
❌ RPC Error: {message: "ยอดเงินใน Wallet ไม่เพียงพอ..."}
❌ Booking failed: ยอดเงินใน Wallet ไม่เพียงพอ...
```

---

## 🔍 Diagnostic Queries

### Check Current User

```typescript
// In browser console
const {
  data: { user },
} = await supabase.auth.getUser();
console.log("Current user:", user);
console.log("User ID:", user?.id);
console.log("Email:", user?.email);
```

### Check User's Balance Directly

```typescript
// In browser console
const { data: userData } = await supabase
  .from("users")
  .select("id, email, wallet_balance")
  .eq("id", user.id)
  .single();

console.log("User data:", userData);
console.log("Wallet balance:", userData.wallet_balance);
```

### Test RPC Function Directly

```typescript
// In browser console
const { data, error } = await supabase.rpc("create_queue_atomic", {
  p_user_id: user.id,
  p_category: "hospital",
  p_place_name: "Test Hospital",
  p_place_address: "Test Address",
  p_details: "Test",
  p_scheduled_date: "2026-01-27",
  p_scheduled_time: "10:00",
  p_service_fee: 50,
});

console.log("RPC Result:", data);
console.log("RPC Error:", error);
```

---

## 🔧 Possible Solutions

### Solution 1: User ID Mismatch

**If logs show different user IDs**:

```typescript
// Check auth state
console.log("Auth user ID:", authStore.user?.id);
console.log("Wallet fetch user ID:", authStore.user?.id);
console.log("RPC user ID:", userId);

// They should all be the same!
```

**Fix**: Ensure user is logged in correctly

```bash
# Clear auth state and re-login
localStorage.clear()
# Then login again
```

### Solution 2: RLS Policy Issue

**Check RLS policies**:

```sql
-- Check if user can read their own wallet_balance
SELECT * FROM pg_policies
WHERE tablename = 'users'
AND policyname LIKE '%wallet%';
```

**Fix**: Ensure RLS allows user to read their own balance

```sql
CREATE POLICY "users_read_own_wallet" ON users
  FOR SELECT
  USING (auth.uid() = id);
```

### Solution 3: Timing Issue

**If balance shows 0 initially then updates to 946**:

```typescript
// Add loading state check
if (loading.value) {
  return; // Don't allow submit while loading
}

// Or wait for balance to load
await fetchBalance();
```

### Solution 4: Function Permission Issue

**Check function permissions**:

```sql
-- Check if authenticated users can execute function
SELECT * FROM information_schema.routine_privileges
WHERE routine_name = 'create_queue_atomic';
```

**Fix**: Grant execute permission

```sql
GRANT EXECUTE ON FUNCTION create_queue_atomic TO authenticated;
```

---

## 📊 Expected Console Output

### Successful Flow

```
[Page Load]
🔍 Fetching wallet balance for user: 05ea4b43-ccef-40dc-a998-810d19e8024f
📦 Raw wallet_balance from DB: 946.00 Type: string
✅ Parsed string to number: 946
💰 Final balance value: 946
💰 Formatted balance: ฿946.00
💰 Balance changed in QueueBookingView: 946

[Navigate to Step 4]
[Wallet Card] Theme: sufficient (green)
[Wallet Card] Balance: ฿946.00
[Submit Button] Enabled: true

[Click Submit]
🎫 Creating queue booking...
👤 User ID: 05ea4b43-ccef-40dc-a998-810d19e8024f
💰 Current balance (from composable): 946
💰 Formatted balance: ฿946.00
💵 Service fee: 50
🔌 Calling create_queue_atomic RPC...
✅ RPC Result: [{success: true, booking_id: "...", tracking_id: "QUE-...", message: "จองคิวสำเร็จ"}]
✅ Booking created successfully: ...
```

### Error Flow (Current Issue)

```
[Page Load]
🔍 Fetching wallet balance for user: 05ea4b43-ccef-40dc-a998-810d19e8024f
📦 Raw wallet_balance from DB: 946.00 Type: string
✅ Parsed string to number: 946
💰 Final balance value: 946
💰 Formatted balance: ฿946.00
💰 Balance changed in QueueBookingView: 946

[Navigate to Step 4]
[Wallet Card] Theme: sufficient (green)
[Wallet Card] Balance: ฿946.00
[Submit Button] Enabled: true

[Click Submit]
🎫 Creating queue booking...
👤 User ID: 05ea4b43-ccef-40dc-a998-810d19e8024f
💰 Current balance (from composable): 946
💰 Formatted balance: ฿946.00
💵 Service fee: 50
🔌 Calling create_queue_atomic RPC...
❌ RPC Error: {message: "ยอดเงินใน Wallet ไม่เพียงพอ กรุณาเติมเงินก่อนจองคิว"}
❌ Booking failed: ยอดเงินใน Wallet ไม่เพียงพอ กรุณาเติมเงินก่อนจองคิว
```

**Key Question**: Why does the function see insufficient balance when composable sees 946?

---

## 🎯 Next Steps

### 1. Test in Browser

```bash
npm run dev
# Open: http://localhost:5173/customer/queue-booking
# Open Console (F12)
# Try to create booking
# Copy ALL console logs
```

### 2. Share Console Logs

Please share:

- ✅ All logs from page load
- ✅ All logs from clicking submit
- ✅ Any error messages
- ✅ User ID shown in logs

### 3. Test Direct Query

```typescript
// In browser console, run:
const {
  data: { user },
} = await supabase.auth.getUser();
console.log("User:", user);

const { data: balance } = await supabase
  .from("users")
  .select("wallet_balance")
  .eq("id", user.id)
  .single();
console.log("Balance:", balance);

// Then try RPC
const { data: rpcResult, error: rpcError } = await supabase.rpc(
  "create_queue_atomic",
  {
    p_user_id: user.id,
    p_category: "hospital",
    p_place_name: "Test",
    p_place_address: "Test",
    p_details: null,
    p_scheduled_date: "2026-01-27",
    p_scheduled_time: "14:00",
    p_service_fee: 50,
  },
);
console.log("RPC Result:", rpcResult);
console.log("RPC Error:", rpcError);
```

---

## 📝 Files Modified

1. ✅ `src/composables/useWalletBalance.ts` - Added comprehensive debug logging
2. ✅ `src/composables/useQueueBooking.ts` - Added debug logging for booking creation
3. ✅ `src/views/QueueBookingView.vue` - Added balance watcher

---

**Status**: 🔍 Awaiting Console Logs from User  
**Next**: Analyze logs to identify exact cause

---

**Created**: 2026-01-26  
**Last Updated**: 2026-01-26
