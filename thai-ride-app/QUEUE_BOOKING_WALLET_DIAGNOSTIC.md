# 🔍 Queue Booking Wallet Balance Diagnostic Guide

**Date**: 2026-01-26  
**Issue**: Wallet shows ฿0.00 instead of ฿946.00  
**Status**: 🔧 Comprehensive Diagnostic Ready

---

## 🎯 Quick Diagnostic Steps

### Step 1: Open Browser Console

```bash
# Open your browser
# Navigate to: http://localhost:5173/customer/queue-booking
# Press F12 to open Developer Tools
# Go to Console tab
```

### Step 2: Run Diagnostic Script

Copy and paste this entire script into the console:

```javascript
// ========================================
// WALLET BALANCE DIAGNOSTIC SCRIPT
// ========================================

console.log("🔍 Starting Wallet Balance Diagnostic...\n");

// 1. Check Auth State
console.log("📋 STEP 1: Checking Auth State");
console.log("================================");

const checkAuth = async () => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("❌ Auth Error:", error);
      return null;
    }

    if (!user) {
      console.error("❌ No user logged in!");
      console.log("💡 Solution: Please login first");
      return null;
    }

    console.log("✅ User authenticated");
    console.log("   User ID:", user.id);
    console.log("   Email:", user.email);
    console.log("   Created:", user.created_at);
    console.log("");

    return user;
  } catch (err) {
    console.error("❌ Exception:", err);
    return null;
  }
};

// 2. Check Database Connection
console.log("📋 STEP 2: Checking Database Connection");
console.log("========================================");

const checkDatabase = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, wallet_balance, created_at")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("❌ Database Error:", error);
      console.log("   Error Code:", error.code);
      console.log("   Error Message:", error.message);
      console.log("   Error Details:", error.details);
      console.log("   Error Hint:", error.hint);

      if (error.code === "PGRST116") {
        console.log("💡 Solution: User record not found in database");
      } else if (
        error.code === "42501" ||
        error.message.includes("permission")
      ) {
        console.log("💡 Solution: RLS policy blocking access");
      }

      return null;
    }

    if (!data) {
      console.error("❌ No data returned from database");
      return null;
    }

    console.log("✅ Database connection successful");
    console.log("   User ID:", data.id);
    console.log("   Email:", data.email);
    console.log("   Wallet Balance (raw):", data.wallet_balance);
    console.log("   Wallet Balance (type):", typeof data.wallet_balance);
    console.log("   Created At:", data.created_at);
    console.log("");

    return data;
  } catch (err) {
    console.error("❌ Exception:", err);
    return null;
  }
};

// 3. Check RLS Policies
console.log("📋 STEP 3: Checking RLS Policies");
console.log("=================================");

const checkRLS = async (userId) => {
  try {
    // Try to read own data
    const { data, error } = await supabase
      .from("users")
      .select("wallet_balance")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("❌ RLS Policy Error:", error.message);
      console.log(
        "💡 Solution: RLS policy is blocking access to wallet_balance",
      );
      console.log(
        "💡 Action: Check if users_select_own policy exists and is correct",
      );
      return false;
    }

    console.log("✅ RLS policies allow access");
    console.log("   Can read wallet_balance: Yes");
    console.log("");

    return true;
  } catch (err) {
    console.error("❌ Exception:", err);
    return false;
  }
};

// 4. Check Composable State
console.log("📋 STEP 4: Checking Composable State");
console.log("=====================================");

const checkComposable = () => {
  try {
    // Check if Vue app is available
    if (typeof window.__VUE_DEVTOOLS_GLOBAL_HOOK__ === "undefined") {
      console.warn("⚠️ Vue DevTools not available");
    }

    // Check localStorage for any cached data
    const authData = localStorage.getItem("supabase.auth.token");
    if (authData) {
      console.log("✅ Auth token found in localStorage");
    } else {
      console.warn("⚠️ No auth token in localStorage");
    }

    console.log("");
  } catch (err) {
    console.error("❌ Exception:", err);
  }
};

// 5. Test Balance Fetch
console.log("📋 STEP 5: Testing Balance Fetch");
console.log("=================================");

const testBalanceFetch = async (userId) => {
  try {
    console.log("🔄 Fetching balance...");

    const startTime = performance.now();

    const { data, error } = await supabase
      .from("users")
      .select("wallet_balance")
      .eq("id", userId)
      .single();

    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);

    if (error) {
      console.error("❌ Fetch failed:", error.message);
      return null;
    }

    console.log("✅ Fetch successful");
    console.log("   Duration:", duration, "ms");
    console.log("   Raw value:", data.wallet_balance);
    console.log("   Type:", typeof data.wallet_balance);

    // Parse value
    let parsedBalance = 0;
    if (data.wallet_balance === null || data.wallet_balance === undefined) {
      console.warn("⚠️ Balance is null/undefined");
      parsedBalance = 0;
    } else if (typeof data.wallet_balance === "string") {
      parsedBalance = parseFloat(data.wallet_balance);
      console.log("   Parsed (string → number):", parsedBalance);
    } else {
      parsedBalance = data.wallet_balance;
      console.log("   Used directly (number):", parsedBalance);
    }

    // Format value
    const formatted = new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parsedBalance);

    console.log("   Formatted:", formatted);
    console.log("");

    return parsedBalance;
  } catch (err) {
    console.error("❌ Exception:", err);
    return null;
  }
};

// Run all diagnostics
(async () => {
  console.log("🚀 Running all diagnostics...\n");

  const user = await checkAuth();
  if (!user) {
    console.log("\n❌ DIAGNOSTIC FAILED: Not authenticated");
    console.log("💡 Please login and try again");
    return;
  }

  const dbData = await checkDatabase(user.id);
  if (!dbData) {
    console.log("\n❌ DIAGNOSTIC FAILED: Cannot access database");
    return;
  }

  const rlsOk = await checkRLS(user.id);
  if (!rlsOk) {
    console.log("\n❌ DIAGNOSTIC FAILED: RLS policy issue");
    return;
  }

  checkComposable();

  const balance = await testBalanceFetch(user.id);

  console.log("\n📊 DIAGNOSTIC SUMMARY");
  console.log("=====================");
  console.log("✅ Auth: OK");
  console.log("✅ Database: OK");
  console.log("✅ RLS: OK");
  console.log("💰 Balance:", balance);

  if (balance === 0) {
    console.log("\n⚠️ WARNING: Balance is 0");
    console.log("Possible causes:");
    console.log("1. Database actually has 0 balance");
    console.log("2. Composable not updating reactive value");
    console.log("3. Timing issue (fetch not complete before render)");
    console.log("\n💡 Next steps:");
    console.log("1. Check if database value is actually 0");
    console.log("2. Try refreshing the page");
    console.log("3. Check browser console for composable logs");
  } else {
    console.log("\n✅ Balance fetch successful!");
    console.log(
      "If UI still shows ฿0.00, the issue is in the composable or component",
    );
  }

  console.log("\n✅ DIAGNOSTIC COMPLETE");
})();
```

---

## 📊 Expected Output

### ✅ Successful Case

```
🔍 Starting Wallet Balance Diagnostic...

📋 STEP 1: Checking Auth State
================================
✅ User authenticated
   User ID: 05ea4b43-ccef-40dc-a998-810d19e8024f
   Email: superadmin@gobear.app
   Created: 2024-01-15T10:30:00.000Z

📋 STEP 2: Checking Database Connection
========================================
✅ Database connection successful
   User ID: 05ea4b43-ccef-40dc-a998-810d19e8024f
   Email: superadmin@gobear.app
   Wallet Balance (raw): 946.00
   Wallet Balance (type): string
   Created At: 2024-01-15T10:30:00.000Z

📋 STEP 3: Checking RLS Policies
=================================
✅ RLS policies allow access
   Can read wallet_balance: Yes

📋 STEP 4: Checking Composable State
=====================================
✅ Auth token found in localStorage

📋 STEP 5: Testing Balance Fetch
=================================
🔄 Fetching balance...
✅ Fetch successful
   Duration: 45.20 ms
   Raw value: 946.00
   Type: string
   Parsed (string → number): 946
   Formatted: ฿946.00

📊 DIAGNOSTIC SUMMARY
=====================
✅ Auth: OK
✅ Database: OK
✅ RLS: OK
💰 Balance: 946

✅ Balance fetch successful!
If UI still shows ฿0.00, the issue is in the composable or component

✅ DIAGNOSTIC COMPLETE
```

### ❌ Auth Issue

```
📋 STEP 1: Checking Auth State
================================
❌ No user logged in!
💡 Solution: Please login first

❌ DIAGNOSTIC FAILED: Not authenticated
💡 Please login and try again
```

### ❌ RLS Issue

```
📋 STEP 3: Checking RLS Policies
=================================
❌ RLS Policy Error: permission denied for table users
💡 Solution: RLS policy is blocking access to wallet_balance
💡 Action: Check if users_select_own policy exists and is correct

❌ DIAGNOSTIC FAILED: RLS policy issue
```

---

## 🔧 Common Issues & Solutions

### Issue 1: Not Authenticated

**Symptoms**:

```
❌ No user logged in!
```

**Solution**:

```bash
# Clear cache and re-login
localStorage.clear()
sessionStorage.clear()
# Then refresh and login again
```

### Issue 2: RLS Policy Blocking

**Symptoms**:

```
❌ RLS Policy Error: permission denied
```

**Solution**: Run this SQL in Supabase Dashboard:

```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'users';

-- Ensure users can read their own wallet_balance
CREATE POLICY IF NOT EXISTS "users_select_own" ON users
  FOR SELECT
  USING (auth.uid() = id);
```

### Issue 3: Database Returns Null

**Symptoms**:

```
⚠️ Balance is null/undefined
```

**Solution**: Check if user record exists:

```sql
-- Check user record
SELECT id, email, wallet_balance
FROM users
WHERE email = 'superadmin@gobear.app';

-- If wallet_balance is NULL, update it
UPDATE users
SET wallet_balance = 946.00
WHERE email = 'superadmin@gobear.app';
```

### Issue 4: Composable Not Updating

**Symptoms**:

- Diagnostic shows correct balance (946)
- UI still shows ฿0.00

**Solution**: Check composable logs in console:

```
Look for these logs:
🔍 Fetching wallet balance for user: ...
📦 Raw wallet_balance from DB: ...
💰 Final balance value: ...
```

If logs show 0 but database has 946, there's a timing issue.

---

## 🎯 Next Steps Based on Results

### If Diagnostic Shows Balance = 946

✅ Database is correct  
✅ Auth is working  
✅ RLS is working  
❌ Issue is in composable or component

**Action**: Check these files for issues:

1. `src/composables/useWalletBalance.ts` - Check reactive value update
2. `src/views/QueueBookingView.vue` - Check if balance is being watched
3. Browser console - Look for composable logs

### If Diagnostic Shows Balance = 0

❌ Database actually has 0  
OR  
❌ Fetch is failing silently

**Action**:

1. Check database directly in Supabase Dashboard
2. Update balance if needed
3. Check for network errors in Network tab

### If Diagnostic Fails at Auth

❌ Not logged in  
OR  
❌ Session expired

**Action**:

1. Clear browser cache
2. Re-login
3. Run diagnostic again

---

## 📝 Share Results

If issue persists, please share:

1. **Complete console output** from diagnostic script
2. **Screenshot** of console
3. **Network tab** showing API calls to Supabase
4. **User email** you're testing with

---

**Created**: 2026-01-26  
**Status**: Ready for Testing
