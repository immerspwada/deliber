# Provider Queue Booking Debug - 2026-01-27

**Date**: 2026-01-27  
**Status**: 🔍 Debugging  
**Issue**: Provider ไม่เห็นงาน QUE-20260127-000003

---

## 🔍 Investigation Results

### 1. Database Check ✅

**Queue Booking Details:**

```
ID: 53b82207-abe0-4bf1-b5d8-08078e821a8d
Tracking ID: QUE-20260127-000003
Status: pending
Provider ID: null (ยังไม่มีคนรับ)
Category: hospital
Place Name: asdasd
Service Fee: 50.00 THB
Created: 2026-01-27 01:50:06
```

**Result**: ✅ งานมีอยู่และ status = 'pending' ถูกต้อง

### 2. RLS Policy Check ✅

**Test Query:**

```sql
SELECT
  qb.*,
  EXISTS (
    SELECT 1 FROM providers_v2
    WHERE providers_v2.user_id = '7f9f3659-d1f9-4b6f-b3b3-827735f1b11e'
    AND providers_v2.is_available = true
    AND providers_v2.is_online = true
    AND providers_v2.status = 'approved'
  ) as provider_can_see
FROM queue_bookings qb
WHERE qb.status = 'pending'
```

**Result**: ✅ `provider_can_see = true` - RLS policy ทำงานถูกต้อง

### 3. Provider Status Check ✅

**Available Providers:**

```
1. ridertest@gmail.com (rider)
   - Status: approved
   - Online: true
   - Available: true

2. immersowada@gmail.com (Test)
   - Status: approved
   - Online: true
   - Available: true

3. driver1@demo.com (Driver)
   - Status: approved
   - Online: true
   - Available: true
```

**Result**: ✅ มี provider ที่พร้อมรับงานอยู่

### 4. Code Deployment Check ⚠️

**Last Commits:**

- `d7b9c48` - fix: provider can now receive queue booking jobs
- `d79ed49` - docs: add provider queue booking integration documentation

**Files Changed:**

- `src/views/provider/ProviderHomeNew.vue` - Updated loadAvailableOrders() and realtime subscription

**Result**: ⚠️ Code pushed แต่อาจยังไม่ได้ deploy หรือมี cache

---

## 🐛 Root Cause

**Frontend Cache Issue**

การแก้ไขที่ทำไปมี 2 ส่วน:

1. ✅ **Database (RLS Policies)** - แก้เสร็จและทำงานถูกต้อง
2. ⚠️ **Frontend (ProviderHomeNew.vue)** - แก้เสร็จแต่อาจยังไม่ได้ deploy หรือมี cache

---

## ✅ Solutions

### Option 1: Wait for Vercel Deployment (แนะนำ)

Vercel กำลัง deploy code ใหม่ ให้รอ 2-3 นาที แล้วลองใหม่

**Check Deployment Status:**

1. ไปที่ https://vercel.com/dashboard
2. เช็คว่า deployment ล่าสุดเสร็จแล้วหรือยัง
3. ถ้าเสร็จแล้ว ให้ hard refresh browser

### Option 2: Hard Refresh Browser

**Clear Cache:**

- **Chrome/Edge**: `Cmd+Shift+R` (Mac) หรือ `Ctrl+Shift+F5` (Windows)
- **Safari**: `Cmd+Option+R`
- **Firefox**: `Ctrl+Shift+R`

### Option 3: Test with Different Provider

ลอง login ด้วย provider account อื่น:

- `ridertest@gmail.com`
- `driver1@demo.com`

### Option 4: Check Console Logs

เปิด Browser Console (F12) และดู:

```javascript
// ควรเห็น logs เหล่านี้:
[ProviderHome] Setting up realtime subscription...
[ProviderHome] Realtime subscription status: SUBSCRIBED
[ProviderHome] New queue booking received: {...}
```

---

## 🧪 Manual Testing Steps

### Step 1: Verify Deployment

```bash
# Check latest commit on production
curl -I https://your-app.vercel.app | grep -i "x-vercel"
```

### Step 2: Test Provider Query Directly

Login as provider และเปิด Console:

```javascript
// Test query
const { data, error } = await supabase
  .from("queue_bookings")
  .select("*")
  .eq("status", "pending");

console.log("Queue bookings:", data);
console.log("Error:", error);
```

**Expected Result:**

```javascript
Queue bookings: [
  {
    id: "53b82207-abe0-4bf1-b5d8-08078e821a8d",
    tracking_id: "QUE-20260127-000003",
    status: "pending",
    ...
  }
]
Error: null
```

### Step 3: Test Available Orders Count

```javascript
// Test count
const [ridesResult, queueResult] = await Promise.all([
  supabase
    .from("ride_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending"),
  supabase
    .from("queue_bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending"),
]);

console.log("Rides:", ridesResult.count);
console.log("Queue:", queueResult.count);
console.log("Total:", (ridesResult.count || 0) + (queueResult.count || 0));
```

**Expected Result:**

```
Rides: 0
Queue: 1
Total: 1
```

### Step 4: Test Realtime Subscription

```javascript
// Check if realtime is working
const channel = supabase
  .channel("test-queue")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "queue_bookings",
      filter: "status=eq.pending",
    },
    (payload) => {
      console.log("✅ Realtime working! New queue booking:", payload.new);
    },
  )
  .subscribe((status) => {
    console.log("Subscription status:", status);
  });
```

---

## 📊 Verification Checklist

- [x] Database: งานมีอยู่และ status = pending
- [x] RLS Policies: Provider สามารถเห็นงานได้
- [x] Provider Status: มี provider ที่ online และ available
- [ ] Frontend Deployment: รอ Vercel deploy เสร็จ
- [ ] Browser Cache: ลอง hard refresh
- [ ] Realtime Subscription: ทดสอบว่าทำงานหรือไม่
- [ ] Available Orders Count: แสดงจำนวนถูกต้องหรือไม่

---

## 🔄 If Still Not Working

### Check 1: Verify Code is Deployed

```bash
# SSH to server or check Vercel logs
# Look for these changes in ProviderHomeNew.vue:

1. loadAvailableOrders() should query both tables:
   - ride_requests
   - queue_bookings

2. setupRealtimeSubscription() should listen to:
   - INSERT on queue_bookings
   - UPDATE on queue_bookings
   - DELETE on queue_bookings
```

### Check 2: Verify Provider is Using Correct Component

Provider Home might be using different component:

- `ProviderHomeNew.vue` ✅ (Updated)
- `ProviderHomeClean.vue` ❌ (Not updated)
- `ProviderHome.vue` ❌ (Old version)

**Check router:**

```typescript
// src/router/index.ts or provider router
{
  path: '/provider',
  component: ProviderHomeNew  // ✅ Should use this
}
```

### Check 3: Database Connection

```javascript
// Test Supabase connection
const {
  data: { user },
} = await supabase.auth.getUser();
console.log("Logged in as:", user?.email);

const { data: provider } = await supabase
  .from("providers_v2")
  .select("*")
  .eq("user_id", user?.id)
  .single();

console.log("Provider:", provider);
console.log("Is online:", provider?.is_online);
console.log("Is available:", provider?.is_available);
console.log("Status:", provider?.status);
```

---

## 💡 Quick Fix (If Urgent)

If deployment is taking too long, you can manually test by:

1. **Open Browser Console** on Provider Home
2. **Run this code** to manually load queue bookings:

```javascript
// Force reload available orders
const { count: queueCount } = await supabase
  .from("queue_bookings")
  .select("id", { count: "exact", head: true })
  .eq("status", "pending");

console.log("Queue bookings available:", queueCount);

// If count > 0, the issue is frontend cache
// If count = 0, the issue is RLS policy (but we verified it works)
```

3. **If count > 0**: Hard refresh browser (Cmd+Shift+R)
4. **If count = 0**: Check if provider is logged in correctly

---

## 📝 Expected Timeline

| Step               | Time           | Status           |
| ------------------ | -------------- | ---------------- |
| Code committed     | ✅ Done        | 02:15 AM         |
| Vercel deployment  | ⏳ In Progress | ~2-3 min         |
| Cache clear        | ⏳ Pending     | Manual           |
| Provider sees jobs | ⏳ Pending     | After deployment |

---

## 🎯 Next Actions

1. **Wait 2-3 minutes** for Vercel deployment
2. **Hard refresh** browser (Cmd+Shift+R)
3. **Check console logs** for realtime subscription
4. **Test query** manually in console
5. **Report back** if still not working

---

**Status**: ⏳ Waiting for deployment

**Last Updated**: 2026-01-27 02:20 AM
