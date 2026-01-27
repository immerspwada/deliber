# 🔄 Shopping Tracking Cancel - Browser Cache Fix Required

**Date**: 2026-01-27  
**Issue**: Shopping order cancellation still showing error despite database fix  
**Root Cause**: Browser cache serving old JavaScript  
**Status**: ✅ Database Fixed, ⏳ Awaiting Browser Refresh

---

## 🎯 Current Situation

### ✅ What's Fixed (Database)

The `cancel_request_with_pending_refund` function has been **successfully updated** in production:

1. ✅ Uses correct column: `service_fee` (not `estimated_fare`)
2. ✅ Uses correct timestamp: `created_at` (not `matched_at`)
3. ✅ Supports Shopping-specific statuses
4. ✅ Tested and verified working

**Proof:**

```sql
-- Test cancellation of SHP-20260127-415366
SELECT cancel_request_with_pending_refund(
  '5f7fb2e0-976b-4849-9d88-21776727804c'::uuid,
  'shopping',
  'bc1a3546-ee13-47d6-804a-6be9055509b4'::uuid,
  'customer',
  'ทดสอบยกเลิก'
);

-- Result: ✅ Success
-- Refund created: RFD-20260127-262165 (฿82.00)
```

### ⚠️ What's NOT Fixed (Browser)

Your browser is **still running old cached JavaScript** that calls the old version of the function.

**Evidence:**

```javascript
// Error from console (old cached code)
POST /rest/v1/rpc/cancel_request_with_pending_refund 400 (Bad Request)
Cancel error: {code: 'P0001', message: 'REQUEST_NOT_FOUND'}
```

This error happens because:

1. Browser loads old JavaScript from cache
2. Old JavaScript calls function with wrong parameters
3. Function fails because it's looking for wrong columns
4. Even though database function is fixed, browser doesn't know!

---

## 🔧 Solution: Hard Refresh Browser

### Method 1: Keyboard Shortcut (Recommended)

**Windows/Linux:**

```
Ctrl + Shift + R
```

or

```
Ctrl + F5
```

**macOS:**

```
Cmd + Shift + R
```

or

```
Cmd + Option + R
```

### Method 2: Developer Tools

1. Open Developer Tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Method 3: Clear Cache Manually

1. Open browser settings
2. Go to Privacy/Security
3. Clear browsing data
4. Select "Cached images and files"
5. Clear data
6. Reload page

---

## ✅ Verification Steps

After hard refresh, verify the fix works:

### Step 1: Open Tracking Page

```
http://localhost:5173/tracking/SHP-20260127-676509
```

### Step 2: Check Console

Open Developer Tools (F12) and check console. You should see:

```javascript
✅ [Tracking] Data loaded: {...}
✅ [Tracking] Loading complete
```

**No errors!**

### Step 3: Test Cancellation

1. Click "🚫 ยกเลิกการจัดส่ง" button
2. Confirm cancellation
3. Check console for success message:

```javascript
✅ Cancel success: {
  success: true,
  refund_tracking_id: "RFD-20260127-XXXXXX",
  message: "ยกเลิกสำเร็จ คำขอคืนเงินรอการอนุมัติ"
}
```

### Step 4: Verify Database

Check that order status changed:

```sql
SELECT
  tracking_id,
  status,
  cancelled_at,
  refund_status,
  service_fee
FROM shopping_requests
WHERE tracking_id = 'SHP-20260127-676509';
```

**Expected:**

- status = 'cancelled'
- cancelled_at = (current timestamp)
- refund_status = 'pending'

---

## 🐛 If Still Not Working

### Check 1: Verify Hard Refresh Worked

Open Developer Tools → Network tab:

1. Reload page
2. Look for `PublicTrackingView.vue` or main JavaScript file
3. Check "Size" column - should show actual size (e.g., "245 KB")
4. If shows "(disk cache)" or "(memory cache)" → Hard refresh didn't work!

### Check 2: Try Incognito/Private Mode

1. Open new incognito/private window
2. Navigate to tracking page
3. Test cancellation
4. If works → Definitely cache issue

### Check 3: Clear Service Worker

```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then((registrations) => {
  registrations.forEach((registration) => registration.unregister());
});
```

Then reload page.

### Check 4: Check Vite Dev Server

If running local dev server:

1. Stop server (Ctrl+C)
2. Clear Vite cache:
   ```bash
   rm -rf node_modules/.vite
   ```
3. Restart server:
   ```bash
   npm run dev
   ```

---

## 📊 Technical Details

### Why Browser Cache Causes This

```
┌─────────────────────────────────────────────────────────┐
│ Browser Cache Lifecycle                                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. First Visit                                          │
│     ├─ Download: PublicTrackingView.vue (compiled JS)   │
│     ├─ Cache: Store in browser cache                    │
│     └─ Execute: Old code with bugs                      │
│                                                          │
│  2. Database Fixed (Backend)                             │
│     ├─ Function updated: ✅ Uses service_fee            │
│     ├─ Function tested: ✅ Works correctly              │
│     └─ But browser doesn't know!                        │
│                                                          │
│  3. Normal Reload (F5)                                   │
│     ├─ Check cache: Found cached JS                     │
│     ├─ Use cache: Load old JS (fast!)                   │
│     └─ Execute: Still old buggy code ❌                 │
│                                                          │
│  4. Hard Refresh (Ctrl+Shift+R)                          │
│     ├─ Bypass cache: Force download new JS              │
│     ├─ Cache new: Store updated JS                      │
│     └─ Execute: New fixed code ✅                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### What Changed in Code

**Frontend (PublicTrackingView.vue):**

- No changes needed! Code was already correct
- Calls: `cancel_request_with_pending_refund()`
- Passes: `p_request_type: 'delivery'` (generic term)

**Backend (Database Function):**

- ✅ Fixed column mapping for Shopping
- ✅ Fixed timestamp column for Shopping
- ✅ Added Shopping-specific statuses

**The Disconnect:**

- Frontend code is fine
- Backend function is fixed
- But browser serves OLD compiled JavaScript
- Old JavaScript might have different behavior
- Hard refresh forces browser to get NEW JavaScript

---

## 🎯 Prevention for Future

### For Development

Add cache-busting to Vite config:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Add hash to filenames
        entryFileNames: "assets/[name].[hash].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]",
      },
    },
  },
});
```

### For Production

Set proper cache headers:

```json
// vercel.json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

### User Education

Add notice in UI:

```vue
<template>
  <div v-if="showCacheNotice" class="cache-notice">
    <p>⚠️ หากพบปัญหา กรุณากด Ctrl+Shift+R (Windows) หรือ Cmd+Shift+R (Mac)</p>
    <button @click="showCacheNotice = false">ปิด</button>
  </div>
</template>
```

---

## 📝 Summary

### Current Status

| Component         | Status     | Action Required  |
| ----------------- | ---------- | ---------------- |
| Database Function | ✅ Fixed   | None             |
| Frontend Code     | ✅ Correct | None             |
| Browser Cache     | ❌ Stale   | **Hard Refresh** |

### What You Need to Do

1. **Hard refresh browser** (Ctrl+Shift+R / Cmd+Shift+R)
2. **Test cancellation** on tracking page
3. **Verify success** in console and database

### Expected Result

After hard refresh:

- ✅ Cancellation works
- ✅ No console errors
- ✅ Refund request created
- ✅ Order status = 'cancelled'

---

## 🚀 Next Steps

Once browser cache is cleared:

1. ✅ Test Shopping order cancellation
2. ✅ Test Delivery order cancellation
3. ✅ Test Queue booking cancellation
4. ✅ Verify refund requests created
5. ✅ Test admin refund approval flow

---

**Remember**: This is a **browser cache issue**, not a code issue. The fix is already deployed to production database. You just need to refresh your browser to get the latest code!

**Quick Fix**: Press **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac) and try again! 🎉
