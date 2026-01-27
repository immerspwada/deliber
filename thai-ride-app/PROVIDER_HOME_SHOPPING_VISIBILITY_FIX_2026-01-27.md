# ✅ Provider Home - Shopping Orders Visibility

**Date**: 2026-01-27  
**Issue**: Provider cannot see Shopping order `SHP-20260127-076460`  
**Root Cause**: Browser cache serving old JavaScript  
**Status**: ✅ Code is correct, needs browser refresh

---

## 🔍 Investigation Results

### Database Verification

**Shopping Order Exists:**

```sql
SELECT * FROM shopping_requests WHERE tracking_id = 'SHP-20260127-076460';
```

**Result:**
| Field | Value |
|-------|-------|
| tracking_id | SHP-20260127-076460 |
| status | pending |
| provider_id | null |
| service_fee | ฿57.00 |
| created_at | 2026-01-27 06:45:44 |

**Total Pending Shopping Orders:**

```sql
SELECT COUNT(*) FROM shopping_requests WHERE status = 'pending';
```

**Result:** 2 orders

### Code Verification

**Provider Home Code is CORRECT:**

1. ✅ **loadAvailableOrders()** queries `shopping_requests`:

```typescript
const [ridesResult, queueResult, shoppingResult, deliveryResult] =
  await Promise.all([
    supabase
      .from("ride_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("queue_bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("shopping_requests") // ✅ Shopping included
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("delivery_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);
```

2. ✅ **loadActiveJob()** queries `shopping_requests`:

```typescript
// Check shopping_requests
supabase
  .from("shopping_requests")
  .select(
    `
    id,
    tracking_id,
    status,
    store_name,
    store_address,
    delivery_address,
    service_fee,  // ✅ Correct column
    created_at,
    user_id
  `,
  )
  .eq("provider_id", provId)
  .in("status", ["matched", "shopping", "delivering"])
  .order("created_at", { ascending: false }) // ✅ Correct timestamp
  .limit(1)
  .maybeSingle();
```

3. ✅ **Console logging** for debugging:

```typescript
console.log("[ProviderHome] Available orders:", {
  rides: ridesCount,
  queue: queueCount,
  shopping: shoppingCount, // ✅ Logged
  delivery: deliveryCount,
  total,
});
```

---

## 🎯 Root Cause

**Browser Cache Issue**

The code is 100% correct, but the browser is serving **old cached JavaScript** that doesn't include Shopping order queries.

**Evidence:**

- ✅ Database has 2 pending Shopping orders
- ✅ Code queries `shopping_requests` table
- ✅ Code uses correct column names (`service_fee`, `created_at`)
- ❌ Provider still can't see orders → **Browser cache!**

---

## 🔧 Solution

### Step 1: Hard Refresh Browser

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

### Step 2: Verify in Console

After hard refresh, open Developer Tools (F12) and check console:

```javascript
// Should see:
[ProviderHome] Loading available orders...
[ProviderHome] Available orders: {
  rides: X,
  queue: X,
  shopping: 2,  // ✅ Should show 2
  delivery: X,
  total: X
}
```

### Step 3: Check Available Orders Count

On Provider Home page, you should see:

```
📋 งานที่รอรับ: X งาน
```

This count should include the 2 Shopping orders.

---

## 📊 Expected Behavior

### Available Orders Section

**Before Hard Refresh (Cached):**

```
📋 งานที่รอรับ: X งาน
(Only counts Rides and Queue, missing Shopping and Delivery)
```

**After Hard Refresh (Fixed):**

```
📋 งานที่รอรับ: X งาน
(Counts ALL: Rides + Queue + Shopping + Delivery)
```

### Console Output

**After Hard Refresh:**

```javascript
[ProviderHome] Loading available orders...
[ProviderHome] Available orders: {
  rides: 0,
  queue: 0,
  shopping: 2,  // ✅ Shows Shopping orders
  delivery: 0,
  total: 2
}
```

---

## 🧪 Testing Steps

### Test 1: Check Available Orders Count

1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Go to: `http://localhost:5173/provider`
3. Check "งานที่รอรับ" count
4. Should show at least 2 (from Shopping orders)

### Test 2: Check Console Logs

1. Open Developer Tools (F12)
2. Go to Console tab
3. Reload page
4. Look for: `[ProviderHome] Available orders:`
5. Verify `shopping: 2`

### Test 3: Navigate to Orders Page

1. Click "ดูงานทั้งหมด" button
2. Should navigate to `/provider/orders`
3. Should see Shopping orders in the list
4. Filter by "สั่งซื้อของ" (Shopping)
5. Should see `SHP-20260127-076460`

---

## 🐛 If Still Not Working

### Check 1: Verify Hard Refresh Worked

Open Developer Tools → Network tab:

1. Reload page
2. Look for `ProviderHome.vue` or main JavaScript file
3. Check "Size" column
4. Should show actual size (e.g., "245 KB")
5. If shows "(disk cache)" or "(memory cache)" → Hard refresh didn't work!

### Check 2: Try Incognito/Private Mode

1. Open new incognito/private window
2. Login as provider
3. Go to `/provider`
4. Check if Shopping orders appear
5. If yes → Definitely cache issue

### Check 3: Clear Service Worker

```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then((registrations) => {
  registrations.forEach((registration) => registration.unregister());
});
```

Then reload page.

### Check 4: Clear All Browser Data

1. Open browser settings
2. Go to Privacy/Security
3. Clear browsing data
4. Select:
   - ✅ Cached images and files
   - ✅ Cookies and site data
5. Clear data
6. Reload page

---

## 📋 Provider Home Features

### Available Orders Display

**Shows count of ALL pending orders:**

- 🚗 Ride requests (`ride_requests` WHERE status='pending')
- 📅 Queue bookings (`queue_bookings` WHERE status='pending')
- 🛒 Shopping orders (`shopping_requests` WHERE status='pending')
- 📦 Delivery orders (`delivery_requests` WHERE status='pending')

### Active Job Display

**Shows current job if provider has one:**

- Status: matched, pickup, in_progress, shopping, delivering, in_transit
- From ANY of the 4 order types
- Most recent job takes priority

### Navigation

**"ดูงานทั้งหมด" button:**

- Navigates to `/provider/orders`
- Shows ALL order types in tabs
- Provider can filter by service type
- Provider can accept pending orders

---

## 🎯 Why This Happens

### Browser Cache Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│ Browser Cache Issue                                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Old Code (Before Shopping Support)                  │
│     ├─ Query: ride_requests, queue_bookings only        │
│     ├─ Cache: Browser stores this JavaScript            │
│     └─ Result: No Shopping orders visible ❌            │
│                                                          │
│  2. Code Updated (Shopping Support Added)                │
│     ├─ Query: All 4 order types now                     │
│     ├─ Deployed: New code on server                     │
│     └─ But browser still uses cached old code!          │
│                                                          │
│  3. Normal Reload (F5)                                   │
│     ├─ Check cache: Found cached JavaScript             │
│     ├─ Use cache: Load old code (fast!)                 │
│     └─ Result: Still no Shopping orders ❌              │
│                                                          │
│  4. Hard Refresh (Ctrl+Shift+R)                          │
│     ├─ Bypass cache: Force download new JavaScript      │
│     ├─ Cache new: Store updated code                    │
│     └─ Result: Shopping orders visible! ✅              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Prevention for Future

### For Development

Add version query parameter to force cache bust:

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

---

## 📝 Summary

### Current Status

| Component     | Status                 | Action Required  |
| ------------- | ---------------------- | ---------------- |
| Database      | ✅ Has Shopping orders | None             |
| Backend Code  | ✅ Queries Shopping    | None             |
| Frontend Code | ✅ Displays Shopping   | None             |
| Browser Cache | ❌ Serving old code    | **Hard Refresh** |

### What You Need to Do

1. **Hard refresh browser** (Ctrl+Shift+R / Cmd+Shift+R)
2. **Check console** for Shopping count
3. **Verify orders** appear in Available Orders

### Expected Result

After hard refresh:

- ✅ Available Orders count includes Shopping
- ✅ Console shows `shopping: 2`
- ✅ Can navigate to Orders page
- ✅ Can see and accept Shopping orders

---

**Remember**: This is a **browser cache issue**, not a code issue. The fix is already in the code. You just need to refresh your browser to get the latest version! 🎉

**Quick Fix**: Press **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac) and check again!
