# 🛒 Provider Shopping Accept - Browser Cache Fix

**Date**: 2026-01-27  
**Status**: 🔍 Diagnosed  
**Priority**: 🔥 CRITICAL

---

## 🚨 Problem Summary

When Provider clicks "รับงาน" (Accept) button for shopping order, the UPDATE succeeds but the page shows "รอรับงาน" (Pending) screen with URL `/provider/job/{id}/pending`.

---

## 🔍 Root Cause Analysis

### Issue 1: Dual-Role User (Customer + Provider)

```
User ID: bc1a3546-ee13-47d6-804a-6be9055509b4
- Is Customer (created the shopping order)
- Is Provider (trying to accept the order)
```

This is **ALLOWED** by the system but creates confusion in testing.

### Issue 2: Browser Cache

After clicking accept:

1. ✅ UPDATE succeeds (status → 'matched', provider_id set, matched_at set)
2. ✅ Router navigates to `/provider/job/{id}`
3. ❌ `loadJob()` loads **CACHED** data with `status='pending'`
4. ❌ Router redirects to `/provider/job/{id}/pending`
5. ❌ Shows "รอรับงาน" screen

### Issue 3: Race Condition

The `acceptOrder` function in `ProviderOrdersNew.vue`:

```typescript
// 1. UPDATE database
await supabase.from("shopping_requests").update({
  provider_id: provider.id,
  status: "matched",
  matched_at: new Date().toISOString(),
});

// 2. Navigate immediately (doesn't wait for cache clear)
router.push(`/provider/job/${order.id}`);
```

The navigation happens **before** the realtime subscription updates the cache.

---

## ✅ Solution

### Fix 1: Clear Cache After Accept

Modify `acceptOrder` in `ProviderOrdersNew.vue`:

```typescript
async function acceptOrder(order: Order) {
  // ... existing code ...

  if (order.service_type === "shopping") {
    const { error: updateError } = await supabase
      .from("shopping_requests")
      .update({
        provider_id: provider.id,
        status: "matched",
        matched_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("status", "pending");

    if (updateError) {
      console.error("[Orders] Accept shopping error:", updateError);
      alert(`ไม่สามารถรับงานซื้อของได้: ${updateError.message}`);
      acceptingOrderId.value = null;
      return;
    }

    // ✅ FIX: Wait a moment for database to commit
    await new Promise((r) => setTimeout(r, 300));
  }

  // Navigate to job detail
  router.push(`/provider/job/${order.id}`);
}
```

### Fix 2: Force Refresh in loadJob

Modify `useProviderJobDetail.ts`:

```typescript
async function loadJob(
  jobId: string,
  forceRefresh = false,
): Promise<JobDetail | null> {
  // Check cache first (skip if forceRefresh)
  if (!forceRefresh) {
    const cached = cache.get(jobId);
    if (cached && cached.expires > Date.now()) {
      job.value = cached.data;
      return cached.data;
    }
  }

  // ... rest of the code ...
}
```

### Fix 3: Add Query Parameter for Fresh Load

Modify navigation in `acceptOrder`:

```typescript
// Navigate with query param to force refresh
router.push({
  path: `/provider/job/${order.id}`,
  query: { refresh: Date.now().toString() },
});
```

Then in `ProviderJobLayout.vue`:

```typescript
onMounted(async () => {
  const forceRefresh = !!route.query.refresh;
  if (jobId.value) {
    await loadJob(jobId.value, forceRefresh);
    if (job.value) {
      syncURLWithStatus();
    }
  }
});
```

---

## 🧪 Testing Instructions

### Test 1: Hard Refresh Required

**Current workaround:**

1. Click "รับงาน" button
2. See "รอรับงาน" screen
3. **Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)** to hard refresh
4. Should now see "กำลังไปซื้อของ" screen

### Test 2: After Fix

1. Click "รับงาน" button
2. Should immediately see "กำลังไปซื้อของ" screen
3. No hard refresh needed

---

## 📊 Database Verification

```sql
-- Check order status after accept
SELECT id, tracking_id, status, provider_id, matched_at
FROM shopping_requests
WHERE id = '2f35bf57-0c7c-4a99-a27d-2926595b9dcd';

-- Expected result:
-- status = 'matched'
-- provider_id = 'e410a55d-6baa-4a84-8e45-dde0a557b83a'
-- matched_at = (timestamp)
```

---

## 🔒 RLS Policy Status

✅ **All policies are correct:**

- `provider_accept_shopping` - Allows UPDATE from pending → matched
- `provider_assigned_shopping` - Allows SELECT after matched
- `provider_update_shopping` - Allows UPDATE after matched

---

## 📝 Implementation Priority

1. **Immediate**: Add hard refresh instructions to user
2. **Short-term**: Implement Fix 1 (delay before navigation)
3. **Long-term**: Implement Fix 2 + Fix 3 (proper cache management)

---

## 🎯 Next Steps

1. ✅ Diagnose complete
2. ⏳ Implement Fix 1 (300ms delay)
3. ⏳ Test with real Provider user
4. ⏳ Implement Fix 2 + 3 if needed
5. ⏳ Deploy to production

---

**Status**: Ready for implementation
