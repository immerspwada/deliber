# 🔍 Queue Booking Wallet Balance Zero - Final Diagnosis

**Date**: 2026-01-26  
**Issue**: UI แสดง ฿0.00 แม้ว่า Database มียอดเงิน  
**Status**: 🔍 Investigating

---

## 📊 Analysis from User Logs

### User Provided Information

1. **HTML Element**: Shows `฿0.00` in wallet card
2. **Console Logs**: User mentioned "นี้คือ log" (these are the logs)
3. **Wallet Page**: Shows ฿929 correctly at `/customer/wallet`
4. **Queue Booking Page**: Shows ฿0.00 incorrectly at `/customer/queue-booking`

### Key Observation

**CRITICAL**: The wallet balance shows correctly on `/customer/wallet` (฿929) but shows ฿0.00 on `/customer/queue-booking`

This indicates:

- ✅ Auth is working (user is logged in)
- ✅ Database query is working (wallet page shows correct balance)
- ✅ RLS policies are working
- ❌ **Problem is specific to Queue Booking page**

---

## 🎯 Root Cause Hypothesis

### Most Likely Cause: Composable Initialization Race Condition

The `useQueueBooking` composable destructures `balance` and `formattedBalance` from `useWalletBalance` at the **top level** of the composable:

```typescript
// src/composables/useQueueBooking.ts
export function useQueueBooking() {
  const authStore = useAuthStore();

  // ❌ PROBLEM: Destructuring happens immediately
  const { balance, formattedBalance } = useWalletBalance();

  // At this point, balance.value might still be 0
  // because useWalletBalance hasn't fetched yet
}
```

### Why This Causes Issues

1. **Component mounts** → `useQueueBooking()` is called
2. **Destructuring happens** → `balance` and `formattedBalance` are extracted
3. **useWalletBalance starts fetching** → But destructured refs might not update
4. **Result**: UI shows 0 even though fetch succeeds

### Why Wallet Page Works

The wallet page likely uses `useWalletBalance` directly without destructuring through another composable:

```typescript
// WalletView.vue (works)
const { balance, formattedBalance } = useWalletBalance();
// Direct usage - reactivity works

// QueueBookingView.vue (broken)
const { balance, formattedBalance } = useQueueBooking();
// Indirect usage through another composable - reactivity might break
```

---

## 🔧 Solution

### Option 1: Return Composable Instance (Recommended)

Instead of destructuring in `useQueueBooking`, return the entire composable:

```typescript
// src/composables/useQueueBooking.ts
export function useQueueBooking() {
  const authStore = useAuthStore();

  // ✅ Don't destructure - return the composable
  const walletBalance = useWalletBalance();

  return {
    // ... other properties
    walletBalance, // Return entire composable
  };
}
```

Then in the component:

```vue
<script setup lang="ts">
const { walletBalance } = useQueueBooking();
// Access as walletBalance.balance and walletBalance.formattedBalance
</script>

<template>
  <span>{{ walletBalance.formattedBalance }}</span>
</template>
```

### Option 2: Use Computed Properties

Create computed properties that reference the wallet balance:

```typescript
// src/composables/useQueueBooking.ts
export function useQueueBooking() {
  const authStore = useAuthStore();
  const walletBalance = useWalletBalance();

  // ✅ Create computed refs that stay reactive
  const balance = computed(() => walletBalance.balance.value);
  const formattedBalance = computed(() => walletBalance.formattedBalance.value);

  return {
    balance,
    formattedBalance,
    // ... other properties
  };
}
```

### Option 3: Direct Usage in Component

Use `useWalletBalance` directly in the component instead of through `useQueueBooking`:

```vue
<script setup lang="ts">
const { createQueueBooking, loading, error: bookingError } = useQueueBooking();

// ✅ Use wallet balance directly
const { balance, formattedBalance } = useWalletBalance();
</script>
```

---

## 🧪 Diagnostic Script

Run this in browser console on `/customer/queue-booking`:

```javascript
// Check if composables are working
const checkWalletBalance = async () => {
  console.group("🔍 Wallet Balance Diagnostic");

  // 1. Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("1️⃣ Auth User:", user?.email);
  console.log("   User ID:", user?.id);

  // 2. Check database directly
  if (user) {
    const { data, error } = await supabase
      .from("users")
      .select("wallet_balance")
      .eq("id", user.id)
      .single();

    console.log("2️⃣ Database Query:");
    console.log("   Balance:", data?.wallet_balance);
    console.log("   Error:", error);
  }

  // 3. Check Vue component state
  const app = document.querySelector("#app").__vueParentComponent;
  console.log("3️⃣ Vue Component State:");
  console.log("   Check DevTools Vue tab for reactive values");

  // 4. Check localStorage/sessionStorage
  console.log("4️⃣ Storage:");
  console.log("   localStorage keys:", Object.keys(localStorage));
  console.log("   sessionStorage keys:", Object.keys(sessionStorage));

  console.groupEnd();
};

checkWalletBalance();
```

---

## 🎯 Immediate Fix

I'll implement **Option 1** (Return Composable Instance) as it's the cleanest solution that maintains reactivity.

### Changes Required

1. **useQueueBooking.ts**: Return `walletBalance` composable instead of destructuring
2. **QueueBookingView.vue**: Update to use `walletBalance.balance` and `walletBalance.formattedBalance`

---

## 📝 Testing Checklist

After fix:

- [ ] Navigate to `/customer/queue-booking`
- [ ] Check browser console for `[useWalletBalance]` logs
- [ ] Verify balance shows correct amount (not ฿0.00)
- [ ] Verify wallet card shows green when balance ≥ ฿50
- [ ] Verify submit button is enabled when balance ≥ ฿50
- [ ] Test booking creation
- [ ] Verify balance updates after booking

---

## 💡 Why This Happens

Vue 3's reactivity system works with **refs** and **reactive objects**. When you destructure:

```typescript
// ❌ Loses reactivity
const { balance } = useWalletBalance();
// balance is now a ref, but if it's re-assigned in useWalletBalance,
// this destructured version won't update

// ✅ Maintains reactivity
const wallet = useWalletBalance();
// wallet.balance will always be up-to-date
```

The issue is that `useWalletBalance` might be creating a **new ref** or the destructuring happens before the ref is populated, breaking the reactive link.

---

**Next Step**: Implement the fix in code.
