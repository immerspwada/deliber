# 🔍 Queue Booking Wallet Balance - MCP Diagnosis

**Date**: 2026-01-26  
**Issue**: UI แสดง ฿0.00 แต่ Database มี ฿946.00  
**Status**: ✅ Diagnosed via MCP

---

## 📊 MCP Diagnostic Results

### ✅ Database Check (via MCP)

```sql
SELECT id, email, wallet_balance, created_at
FROM users
WHERE email = 'superadmin@gobear.app';
```

**Result**:

```json
{
  "id": "05ea4b43-ccef-40dc-a998-810d19e8024f",
  "email": "superadmin@gobear.app",
  "wallet_balance": "946.00",  ✅ มียอดเงินจริง
  "created_at": "2025-12-27 06:36:38.835501+00"
}
```

### ✅ RLS Policies Check (via MCP)

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'users';
```

**Key Policies**:

1. **`users_select_own`** ✅
   - Command: `SELECT`
   - Condition: `auth.uid() = id`
   - Status: ✅ Correct - allows users to read their own data

2. **`authenticated_read_basic_user_info`** ✅
   - Command: `SELECT`
   - Condition: `auth.uid() = id OR true`
   - Status: ✅ Correct - allows authenticated users to read

---

## 🎯 Root Cause Analysis

### Database Status: ✅ CORRECT

- ยอดเงินในฐานข้อมูล: **946.00 บาท**
- User ID: `05ea4b43-ccef-40dc-a998-810d19e8024f`
- Email: `superadmin@gobear.app`

### RLS Policies: ✅ CORRECT

- มี policy `users_select_own` ที่อนุญาตให้อ่านข้อมูลตัวเอง
- มี policy `authenticated_read_basic_user_info` สำหรับ authenticated users

### Frontend Issue: ❌ PROBLEM

- UI แสดง: **฿0.00**
- Expected: **฿946.00**

---

## 🔍 Possible Causes

### 1. Auth Session Issue (Most Likely)

**Symptoms**:

- Database มียอดเงินถูกต้อง
- RLS policies ถูกต้อง
- แต่ UI แสดง 0

**Cause**:

- `authStore.user.id` อาจเป็น `null` หรือไม่ตรงกับ database
- Session อาจยังไม่ ready เมื่อ composable fetch ข้อมูล
- Auth state อาจไม่ sync กับ Supabase

**Solution**: ตรวจสอบ auth state ใน browser console

### 2. Timing Issue

**Symptoms**:

- Fetch เกิดขึ้นก่อน auth ready
- Balance ยังไม่ได้ update reactive value

**Cause**:

- `useWalletBalance` ถูกเรียกก่อน `authStore.user` มีค่า
- Race condition ระหว่าง auth initialization และ balance fetch

**Solution**: รอให้ auth ready ก่อน fetch (แก้ไขแล้วใน code)

### 3. Type Conversion Issue

**Symptoms**:

- Database return `"946.00"` (string)
- แต่ parse ไม่สำเร็จ

**Cause**:

- `parseFloat()` fail
- Type handling ผิดพลาด

**Solution**: เพิ่ม error handling (แก้ไขแล้วใน code)

---

## 🧪 Testing Steps

### Step 1: Check Browser Console

เปิด browser console (F12) และดู logs:

**Expected Logs**:

```
🚀 [useWalletBalance] Component mounted
   Auth user: superadmin@gobear.app
   Auth authenticated: true
🔍 [useWalletBalance] Fetching wallet balance (attempt 1/3)
   User ID: 05ea4b43-ccef-40dc-a998-810d19e8024f
   Email: superadmin@gobear.app
📦 [useWalletBalance] Raw wallet_balance from DB: 946.00
   Type: string
✅ [useWalletBalance] Parsed string to number: 946
💰 [useWalletBalance] Final balance value: 946
💰 [useWalletBalance] Formatted balance: ฿946.00
```

**If Auth Issue**:

```
🚀 [useWalletBalance] Component mounted
   Auth user: undefined
   Auth authenticated: false
⚠️ [useWalletBalance] No user ID, setting balance to 0
```

### Step 2: Run Quick Diagnostic

Copy-paste ใน browser console:

```javascript
// Quick check
const checkAuth = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("Auth User:", user?.email);
  console.log("User ID:", user?.id);

  if (user) {
    const { data } = await supabase
      .from("users")
      .select("wallet_balance")
      .eq("id", user.id)
      .single();
    console.log("Database Balance:", data?.wallet_balance);
  }
};

checkAuth();
```

**Expected Output**:

```
Auth User: superadmin@gobear.app
User ID: 05ea4b43-ccef-40dc-a998-810d19e8024f
Database Balance: 946.00
```

### Step 3: Check Auth Store State

```javascript
// Check auth store
const authStore = useAuthStore();
console.log("Auth Store User:", authStore.user);
console.log("Auth Store Authenticated:", authStore.isAuthenticated);
```

---

## 🔧 Solutions

### Solution 1: Clear Cache and Re-login

```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

Then login again with `superadmin@gobear.app`

### Solution 2: Force Refresh Balance

```javascript
// In browser console
// Navigate to queue booking page first
// Then run:
const { fetchBalance } = useWalletBalance();
await fetchBalance();
```

### Solution 3: Check Network Tab

1. Open DevTools → Network tab
2. Filter by "users"
3. Look for request to Supabase
4. Check response data

**Expected Response**:

```json
{
  "wallet_balance": "946.00"
}
```

---

## 📝 Code Fixes Applied

### 1. Enhanced Logging

```typescript
console.log("🔍 [useWalletBalance] Fetching wallet balance (attempt 1/3)");
console.log("   User ID:", authStore.user.id);
console.log("   Email:", authStore.user.email);
console.log(
  "📦 [useWalletBalance] Raw wallet_balance from DB:",
  data.wallet_balance,
);
console.log("💰 [useWalletBalance] Final balance value:", balance.value);
```

### 2. Retry Mechanism

```typescript
const fetchBalance = async (retryCount = 0): Promise<void> => {
  const MAX_RETRIES = 2;

  try {
    // Fetch with timeout
    const result = await Promise.race([fetchPromise, timeoutPromise]);
    // ...
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * (retryCount + 1)),
      );
      return fetchBalance(retryCount + 1);
    }
  }
};
```

### 3. Auth State Waiting

```typescript
onMounted(async () => {
  // Wait for auth to be ready
  if (!authStore.user?.id && authStore.isAuthenticated) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  await fetchBalance();

  // Retry if still 0
  setTimeout(async () => {
    if (balance.value === 0 && authStore.user?.id) {
      await fetchBalance();
    }
  }, 1500);
});
```

---

## 🎯 Next Steps

### If Still Shows ฿0.00

1. **Check Console Logs**
   - Look for `[useWalletBalance]` logs
   - Check if user ID is present
   - Check if fetch is successful

2. **Run Diagnostic Script**
   - Use script from `QUEUE_BOOKING_WALLET_DIAGNOSTIC.md`
   - Share console output

3. **Check Network Tab**
   - Look for failed requests
   - Check response data
   - Look for CORS errors

4. **Try Different Browser**
   - Test in incognito mode
   - Test in different browser
   - Clear all cache

---

## 📊 Summary

| Check                | Status | Value                                     |
| -------------------- | ------ | ----------------------------------------- |
| Database Balance     | ✅     | 946.00 บาท                                |
| User ID              | ✅     | 05ea4b43-ccef-40dc-a998-810d19e8024f      |
| Email                | ✅     | superadmin@gobear.app                     |
| RLS Policy           | ✅     | users_select_own exists                   |
| Auth Policy          | ✅     | authenticated_read_basic_user_info exists |
| **UI Display**       | ❌     | **0.00 บาท (ผิด)**                        |
| **Expected Display** | ✅     | **946.00 บาท**                            |

---

## 💡 Recommendation

ปัญหาน่าจะอยู่ที่ **Frontend Auth State** ไม่ใช่ Database หรือ RLS

**ขั้นตอนแก้ไข**:

1. ✅ เปิด browser console (F12)
2. ✅ ดู logs ที่ขึ้นต้นด้วย `[useWalletBalance]`
3. ✅ ตรวจสอบว่า User ID มีค่าหรือไม่
4. ✅ ถ้า User ID เป็น `undefined` → Auth issue
5. ✅ ถ้า User ID มีค่าแต่ balance = 0 → Fetch issue
6. ✅ ลอง clear cache และ login ใหม่

---

**Created**: 2026-01-26  
**Verified via**: MCP `supabase-hosted` power  
**Database**: Production (onsflqhkgqhydeupiqyt)  
**Status**: ✅ Database Correct, ❌ Frontend Issue
