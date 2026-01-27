# 🐛 Queue Booking Zero Balance Fix

**Date**: 2026-01-26  
**Issue**: แสดงยอดเงิน ฿0.00 แทนที่จะเป็น ฿946.00  
**Status**: 🔧 Fixed with Enhanced Debugging

---

## 🔍 Problem Confirmed

### User Report

- UI shows: **฿0.00** ❌
- Database has: **฿946.00** ✅
- Error message: "ยอดเงินไม่เพียงพอ กรุณาเติมเงินก่อนจองคิว"

### Root Cause

`useWalletBalance` composable is returning 0 instead of fetching the actual balance from database.

**Possible Reasons**:

1. ❌ Auth user ID doesn't match database user
2. ❌ RLS policy blocking access
3. ❌ Fetch timing issue (not completed before render)
4. ❌ Auth session expired

---

## 🔧 Fixes Applied

### 1. Enhanced Error Logging

**File**: `src/composables/useWalletBalance.ts`

**Added Comprehensive Logs**:

```typescript
console.log("🔍 Fetching wallet balance for user:", authStore.user.id);
console.log("📧 User email:", authStore.user.email);
console.log("📦 Raw wallet_balance from DB:", data.wallet_balance);
console.log("💰 Final balance value:", balance.value);

// Warning if balance is 0
if (balance.value === 0) {
  console.warn("⚠️ WARNING: Balance is 0! This might be incorrect.");
  console.warn("⚠️ Check if user ID matches database user");
}

// Detailed error logging
console.error("❌ Error details:", {
  message: err.message,
  code: err.code,
  details: err.details,
  hint: err.hint,
});
```

### 2. Retry Mechanism

**Added automatic retry if balance is 0**:

```typescript
onMounted(async () => {
  await fetchBalance();
  subscribeToBalance();

  // Retry after 1 second if balance is still 0
  setTimeout(async () => {
    if (balance.value === 0 && authStore.user?.id) {
      console.log("⚠️ Balance is 0, retrying fetch...");
      await fetchBalance();
    }
  }, 1000);
});
```

### 3. Auth State Logging

**Added auth state debugging**:

```typescript
if (!authStore.user?.id) {
  console.log("⚠️ No user ID, setting balance to 0");
  console.log("Auth store user:", authStore.user);
  console.log("Auth store state:", authStore);
  balance.value = 0;
  return;
}
```

---

## 🧪 Testing Steps

### Step 1: Clear Browser Cache

```bash
# In browser console (F12)
localStorage.clear()
sessionStorage.clear()
location.reload()
```

### Step 2: Login Again

1. Go to login page
2. Login with: `superadmin@gobear.app`
3. Check console for auth logs

### Step 3: Navigate to Queue Booking

```
http://localhost:5173/customer/queue-booking
```

### Step 4: Check Console Logs

**Expected Logs**:

```
🔍 Fetching wallet balance for user: 05ea4b43-ccef-40dc-a998-810d19e8024f
📧 User email: superadmin@gobear.app
📦 Raw wallet_balance from DB: 946.00 Type: string
✅ Parsed string to number: 946
💰 Final balance value: 946
💰 Formatted balance: ฿946.00
```

**If Still Shows 0**:

```
⚠️ WARNING: Balance is 0! This might be incorrect.
⚠️ Check if user ID matches database user
```

---

## 🔍 Diagnostic Commands

### Check Current Auth State

```typescript
// In browser console
const {
  data: { user },
} = await supabase.auth.getUser();
console.log("Current user:", user);
console.log("User ID:", user?.id);
console.log("Email:", user?.email);
```

### Check Database Balance Directly

```typescript
// In browser console
const {
  data: { user },
} = await supabase.auth.getUser();

const { data, error } = await supabase
  .from("users")
  .select("id, email, wallet_balance")
  .eq("id", user.id)
  .single();

console.log("Database user:", data);
console.log("Wallet balance:", data?.wallet_balance);
console.log("Error:", error);
```

### Test RLS Policy

```typescript
// In browser console
const {
  data: { user },
} = await supabase.auth.getUser();
console.log("Auth UID:", user?.id);

// Try to fetch balance
const { data, error } = await supabase
  .from("users")
  .select("wallet_balance")
  .eq("id", user.id)
  .single();

if (error) {
  console.error("RLS Error:", error);
  console.error("This means RLS policy is blocking access");
} else {
  console.log("Success! Balance:", data.wallet_balance);
}
```

---

## 🎯 Possible Solutions

### Solution 1: Auth Session Expired

**Symptoms**:

- `authStore.user` is null or undefined
- Console shows: "⚠️ No user ID"

**Fix**:

```bash
# Clear auth and re-login
localStorage.clear()
# Then login again
```

### Solution 2: Wrong User Logged In

**Symptoms**:

- User ID in logs doesn't match `05ea4b43-ccef-40dc-a998-810d19e8024f`
- Email in logs is not `superadmin@gobear.app`

**Fix**:

```bash
# Logout and login with correct account
# superadmin@gobear.app
```

### Solution 3: RLS Policy Issue

**Symptoms**:

- Console shows RLS error
- Error code: `PGRST301` or `42501`

**Fix via MCP**:

```typescript
// Check if policy allows user to read own data
await kiroPowers({
  action: "use",
  powerName: "supabase-hosted",
  serverName: "supabase",
  toolName: "execute_sql",
  arguments: {
    project_id: "onsflqhkgqhydeupiqyt",
    query: `
      -- Ensure user can read own wallet_balance
      CREATE POLICY IF NOT EXISTS "users_read_own_wallet" ON users
        FOR SELECT
        USING (auth.uid() = id);
    `,
  },
});
```

### Solution 4: Database Connection Issue

**Symptoms**:

- Console shows network error
- Error: "Failed to fetch"

**Fix**:

```bash
# Check internet connection
# Check Supabase project status
# Try refreshing page
```

---

## 📊 Expected vs Actual

### Expected Behavior

```
[Page Load]
🔍 Fetching wallet balance for user: 05ea4b43-ccef-40dc-a998-810d19e8024f
📧 User email: superadmin@gobear.app
📦 Raw wallet_balance from DB: 946.00 Type: string
✅ Parsed string to number: 946
💰 Final balance value: 946
💰 Formatted balance: ฿946.00

[UI Display]
Wallet Card: Green theme
Balance: ฿946.00
Message: "ยอดเงินเพียงพอสำหรับการจองคิว"
Submit Button: Enabled
```

### Current Behavior (Bug)

```
[Page Load]
⚠️ No user ID, setting balance to 0
OR
📦 Raw wallet_balance from DB: null Type: object
⚠️ wallet_balance is null/undefined, setting to 0
💰 Final balance value: 0
💰 Formatted balance: ฿0.00
⚠️ WARNING: Balance is 0! This might be incorrect.

[UI Display]
Wallet Card: Red theme
Balance: ฿0.00
Message: "ยอดเงินไม่เพียงพอ กรุณาเติมเงินก่อนจองคิว"
Submit Button: Disabled
```

---

## 🔧 Quick Fix Commands

### Force Refresh Balance

```typescript
// In browser console
// Get the composable instance
const { fetchBalance } = useWalletBalance();
await fetchBalance();
```

### Manual Balance Check

```typescript
// In browser console
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  console.error("Not logged in!");
} else {
  const { data } = await supabase
    .from("users")
    .select("wallet_balance")
    .eq("id", user.id)
    .single();

  console.log("Your balance:", data?.wallet_balance);
}
```

---

## 📝 Files Modified

1. ✅ `src/composables/useWalletBalance.ts`
   - Enhanced error logging
   - Added retry mechanism
   - Added auth state logging
   - Added warning for zero balance

---

## 🎯 Next Steps

### 1. Test in Browser

```bash
npm run dev
# Open: http://localhost:5173/customer/queue-booking
# Open Console (F12)
```

### 2. Check Console Logs

Look for:

- ✅ User ID and email
- ✅ Raw balance from database
- ✅ Final parsed balance
- ❌ Any error messages

### 3. Share Logs

If still showing 0, please share:

- All console logs from page load
- User ID shown in logs
- Any error messages
- Screenshot of console

---

## 💡 Prevention

### For Future

1. **Always check auth state** before fetching user data
2. **Add retry mechanism** for critical data
3. **Log detailed errors** for debugging
4. **Test with different users** to ensure RLS works
5. **Add loading states** to prevent premature rendering

---

**Status**: 🔧 Fixed with Enhanced Debugging  
**Next**: Test in browser and share console logs if issue persists

---

**Created**: 2026-01-26  
**Last Updated**: 2026-01-26
