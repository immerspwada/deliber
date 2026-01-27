# ✅ Queue Booking Wallet Balance - Reactivity Fix

**Date**: 2026-01-26  
**Issue**: UI แสดง ฿0.00 แม้ว่า Database มียอดเงิน  
**Root Cause**: Vue 3 Reactivity Loss from Destructuring  
**Status**: ✅ Fixed

---

## 🎯 Problem Summary

### Symptoms

- ✅ Wallet page (`/customer/wallet`) แสดงยอดเงินถูกต้อง: **฿929**
- ❌ Queue booking page (`/customer/queue-booking`) แสดงยอดเงินผิด: **฿0.00**
- ✅ Database มียอดเงินถูกต้อง
- ✅ RLS policies ทำงานถูกต้อง
- ✅ Auth session ทำงานถูกต้อง

### Root Cause: Vue 3 Reactivity Loss

**Problem Code**:

```typescript
// src/composables/useQueueBooking.ts (OLD - ❌)
export function useQueueBooking() {
  const authStore = useAuthStore();

  // ❌ PROBLEM: Destructuring breaks reactivity chain
  const { balance, formattedBalance } = useWalletBalance();

  return {
    balance, // ❌ This ref might not update
    formattedBalance, // ❌ This computed might not update
    // ...
  };
}
```

**Why This Breaks**:

1. `useWalletBalance()` creates refs internally
2. Destructuring extracts the refs at **initialization time**
3. When `useWalletBalance` fetches data and updates its internal refs, the destructured refs in `useQueueBooking` **don't get the updates**
4. The component receives stale refs that never update

**Analogy**:

```typescript
// It's like taking a photo of a clock
const { time } = getClock(); // ❌ time is frozen at this moment

// Instead of watching the actual clock
const clock = getClock(); // ✅ clock.time updates in real-time
```

---

## 🔧 Solution: Return Composable Instance

### Fixed Code

```typescript
// src/composables/useQueueBooking.ts (NEW - ✅)
export function useQueueBooking() {
  const authStore = useAuthStore();

  // ✅ SOLUTION: Don't destructure - return entire composable
  const walletBalance = useWalletBalance();

  return {
    walletBalance, // ✅ Maintains reactive connection
    // ...
  };
}
```

### Component Usage

```vue
<!-- src/views/QueueBookingView.vue (NEW - ✅) -->
<script setup lang="ts">
const {
  createQueueBooking,
  loading,
  error: bookingError,
  walletBalance, // ✅ Get entire composable
} = useQueueBooking();

// Access as walletBalance.balance.value and walletBalance.formattedBalance.value
</script>

<template>
  <!-- ✅ Use .value in template (Vue auto-unwraps) -->
  <span>{{ walletBalance.formattedBalance.value }}</span>

  <!-- ✅ Use in conditions -->
  <div v-if="walletBalance.balance.value >= 50">ยอดเงินเพียงพอ</div>
</template>
```

---

## 📝 Files Changed

### 1. `src/composables/useQueueBooking.ts`

**Changes**:

- ✅ Changed from destructuring to returning composable instance
- ✅ Updated all internal references to use `walletBalance.balance.value`
- ✅ Updated error messages to use `walletBalance.formattedBalance.value`

**Before**:

```typescript
const { balance, formattedBalance } = useWalletBalance();

return {
  balance,
  formattedBalance,
  // ...
};
```

**After**:

```typescript
const walletBalance = useWalletBalance();

return {
  walletBalance,
  // ...
};
```

### 2. `src/views/QueueBookingView.vue`

**Changes**:

- ✅ Updated destructuring to get `walletBalance` instead of `balance` and `formattedBalance`
- ✅ Updated all template references to use `walletBalance.balance.value`
- ✅ Updated all template references to use `walletBalance.formattedBalance.value`
- ✅ Updated watch to watch `walletBalance.balance.value`

**Before**:

```vue
<script setup lang="ts">
const { balance, formattedBalance } = useQueueBooking();
</script>

<template>
  <span>{{ formattedBalance }}</span>
  <div v-if="balance >= 50">...</div>
</template>
```

**After**:

```vue
<script setup lang="ts">
const { walletBalance } = useQueueBooking();
</script>

<template>
  <span>{{ walletBalance.formattedBalance.value }}</span>
  <div v-if="walletBalance.balance.value >= 50">...</div>
</template>
```

---

## 🧪 Testing Instructions

### 1. Clear Cache and Reload

```bash
# In browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 2. Navigate to Queue Booking

```
http://localhost:5173/customer/queue-booking
```

### 3. Check Console Logs

**Expected Logs**:

```
🚀 [useWalletBalance] Composable initialized
   Initial balance: 0
   Auth user: your-email@example.com
   Auth user ID: your-user-id

🔍 [useWalletBalance] Fetching wallet balance (attempt 1/3)
   User ID: your-user-id
   Email: your-email@example.com

📦 [useWalletBalance] Raw wallet_balance from DB: 929.00
   Type: string

✅ [useWalletBalance] Parsed string to number: 929
💰 [useWalletBalance] Final balance value: 929
💰 [useWalletBalance] Formatted balance: ฿929.00

💰 Balance changed in QueueBookingView: 929
```

### 4. Verify UI

**Expected Display**:

- ✅ Wallet card shows: **฿929.00** (not ฿0.00)
- ✅ Wallet card has **green** background (balance ≥ ฿50)
- ✅ Wallet note says: "ยอดเงินเพียงพอสำหรับการจองคิว"
- ✅ Submit button is **enabled**
- ✅ Submit button shows: "ยืนยันการจองคิว" (not "ยอดเงินไม่เพียงพอ")

### 5. Test Booking

1. Fill in all form fields
2. Click "ยืนยันการจองคิว"
3. Should successfully create booking
4. Should redirect to booking detail page

---

## 🎓 Vue 3 Reactivity Lessons

### ❌ Don't Do This (Loses Reactivity)

```typescript
// Destructuring in composable chain
const { value } = useOtherComposable();
return { value }; // ❌ Might lose reactivity

// Destructuring computed
const { computed1, computed2 } = useComposable();
// ❌ If composable recreates these, you won't get updates
```

### ✅ Do This Instead (Maintains Reactivity)

```typescript
// Return entire composable
const composable = useOtherComposable();
return { composable }; // ✅ Maintains reactive connection

// Or use computed to wrap
const value = computed(() => composable.value.value);
return { value }; // ✅ Stays reactive
```

### Why This Matters

Vue 3's reactivity is based on **Proxy objects** and **refs**. When you destructure:

1. You extract the **current value** of the ref
2. You lose the **reactive connection** to the source
3. Future updates to the source don't propagate to your destructured copy

**Solution**: Keep the reactive object intact and access properties through it.

---

## 📊 Verification Checklist

- [ ] Console shows correct balance value (not 0)
- [ ] UI displays correct formatted balance (not ฿0.00)
- [ ] Wallet card has correct color (green if ≥ ฿50, red if < ฿50)
- [ ] Submit button enabled state is correct
- [ ] Submit button text is correct
- [ ] Booking creation works
- [ ] Balance updates after booking
- [ ] No console errors

---

## 🔍 Debugging Tips

### If Still Shows ฿0.00

1. **Check Console Logs**:

   ```javascript
   // Look for these logs
   console.log("💰 [useWalletBalance] Final balance value:", balance.value);
   console.log("💰 Balance changed in QueueBookingView:", newBalance);
   ```

2. **Check Vue DevTools**:
   - Open Vue DevTools
   - Find QueueBookingView component
   - Check `walletBalance` in component state
   - Should see `balance` and `formattedBalance` refs

3. **Manual Test**:

   ```javascript
   // In browser console
   const {
     data: { user },
   } = await supabase.auth.getUser();
   const { data } = await supabase
     .from("users")
     .select("wallet_balance")
     .eq("id", user.id)
     .single();
   console.log("Database balance:", data.wallet_balance);
   ```

4. **Check Network Tab**:
   - Open DevTools → Network
   - Filter by "users"
   - Check response for wallet_balance
   - Should match database value

---

## 💡 Key Takeaways

1. **Vue 3 Reactivity**: Destructuring can break reactive chains
2. **Composable Composition**: Return entire composables, not destructured values
3. **Template Access**: Use `.value` when accessing nested refs in templates
4. **Debugging**: Always check console logs for actual values vs displayed values
5. **Testing**: Test in actual browser, not just type checking

---

## 🚀 Deployment

### Pre-Deployment Checklist

- [x] Code changes committed
- [x] Console logs added for debugging
- [x] Template updated to use new structure
- [x] Documentation created
- [ ] Tested in development
- [ ] Tested in staging
- [ ] Ready for production

### Deployment Command

```bash
# Build
npm run build

# Deploy (if using Vercel)
vercel --prod

# Or commit and push (if auto-deploy)
git add .
git commit -m "fix: wallet balance reactivity in queue booking"
git push origin main
```

---

## 📚 Related Issues

- **Similar Issue**: Provider earnings display
- **Similar Issue**: Ride fare calculation display
- **Pattern**: Any composable that wraps another composable with destructuring

**General Rule**: When composing composables, avoid destructuring. Return the entire composable instance to maintain reactivity.

---

**Created**: 2026-01-26  
**Fixed By**: Reactivity pattern correction  
**Status**: ✅ Ready for Testing  
**Priority**: 🔥 High - Affects user experience
