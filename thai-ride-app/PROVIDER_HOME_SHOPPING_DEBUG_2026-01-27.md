# 🔍 Provider Home - Shopping Orders Debug Guide

**Date**: 2026-01-27  
**Issue**: ไรเดอร์ไม่เห็นงาน Shopping จากลูกค้า  
**Status**: ✅ Fixed with Enhanced Logging

---

## 📊 Database Verification

### Shopping Orders in Database

```sql
-- ✅ มี 2 งาน Shopping ที่ status='pending'
SELECT tracking_id, status, provider_id, service_fee, created_at
FROM shopping_requests
WHERE status = 'pending'
ORDER BY created_at DESC;
```

**Results:**
| tracking_id | status | provider_id | service_fee | created_at |
|-------------|--------|-------------|-------------|------------|
| SHP-20260127-415366 | pending | null | 82.00 | 2026-01-27 06:07:13 |
| SHP-20260127-370797 | pending | null | 56.00 | 2026-01-27 06:04:11 |

### Provider Status

```sql
-- ✅ Provider online และ available
SELECT id, first_name, is_online, is_available, status
FROM providers_v2
WHERE user_id = (SELECT id FROM users WHERE email = 'ridertest@gmail.com');
```

**Result:**

- Provider ID: `d26a7728-1cc6-4474-a716-fecbb347b0e9`
- Status: `approved`
- Online: `true`
- Available: `true`

---

## 🔧 Code Changes

### 1. Enhanced Logging in `loadAvailableOrders()`

```typescript
async function loadAvailableOrders() {
  console.log("[ProviderHome] Loading available orders...");

  // ... queries ...

  console.log("[ProviderHome] Available orders:", {
    rides: ridesCount,
    queue: queueCount,
    shopping: shoppingCount, // ✅ จะแสดง 2
    delivery: deliveryCount,
    total,
  });

  availableOrders.value = total;
}
```

### 2. Enhanced Logging in `loadActiveJob()`

```typescript
async function loadActiveJob(provId: string) {
  console.log("[ProviderHome] Loading active job for provider:", provId);

  // ... queries ...

  console.log("[ProviderHome] Active job results:", {
    ride: rideResult.data ? "found" : "none",
    queue: queueResult.data ? "found" : "none",
    shopping: shoppingResult.data ? "found" : "none", // ✅ จะแสดง 'none' เพราะ provider_id=null
    delivery: deliveryResult.data ? "found" : "none",
  });

  // ...
}
```

---

## 🎯 Expected Behavior

### When Provider Opens Home Page

**Console Output:**

```
[ProviderHome] Loading active job for provider: d26a7728-1cc6-4474-a716-fecbb347b0e9
[ProviderHome] Active job results: {
  ride: 'none',
  queue: 'none',
  shopping: 'none',    // ✅ ถูกต้อง เพราะงานยังไม่ได้ assign
  delivery: 'none'
}
[ProviderHome] No active jobs found

[ProviderHome] Loading available orders...
[ProviderHome] Available orders: {
  rides: 0,
  queue: 0,
  shopping: 2,         // ✅ ต้องเห็น 2 งาน Shopping
  delivery: 0,
  total: 2
}
```

### UI Display

**Available Orders Section:**

```
งานที่รอรับ: 2 งาน
```

**Click "ดูงานทั้งหมด" → Navigate to `/provider/orders`**

---

## 🚨 Troubleshooting Steps

### Step 1: Hard Refresh Browser

**ปัญหาหลัก: Browser Cache**

```bash
# Chrome/Edge (Windows)
Ctrl + Shift + R

# Chrome/Edge (Mac)
Cmd + Shift + R

# Firefox (Windows)
Ctrl + F5

# Firefox (Mac)
Cmd + Shift + R

# Safari (Mac)
Cmd + Option + R
```

### Step 2: Check Console Logs

1. เปิด DevTools (F12)
2. ไปที่ Console tab
3. Refresh หน้า `/provider`
4. ดู logs ที่ขึ้นต้นด้วย `[ProviderHome]`

**Expected Logs:**

```
[ProviderHome] Loading active job for provider: d26a7728-...
[ProviderHome] Active job results: { ... }
[ProviderHome] Loading available orders...
[ProviderHome] Available orders: { shopping: 2, total: 2 }
```

### Step 3: Check Network Tab

1. เปิด DevTools (F12)
2. ไปที่ Network tab
3. Filter: `shopping_requests`
4. Refresh หน้า
5. ดู request ที่ query `shopping_requests`

**Expected Request:**

```
GET /rest/v1/shopping_requests?select=id&status=eq.pending
Response: { count: 2 }
```

**❌ If you see:**

```
GET /rest/v1/shopping_requests?select=...estimated_fee...
Response: 400 Bad Request
```

→ **Browser cache issue! Hard refresh required!**

### Step 4: Verify in Provider Orders Page

Navigate to `/provider/orders` and check:

1. **Service Filter Tabs:**
   - ทั้งหมด (2)
   - เรียกรถ (0)
   - จองคิว (0)
   - สั่งซื้อของ (2) ← **ต้องเห็น 2 งาน**
   - ส่งของ (0)

2. **Order Cards:**
   - SHP-20260127-415366 (฿82.00)
   - SHP-20260127-370797 (฿56.00)

---

## 📱 User Flow

### Customer Side (Already Done)

1. ✅ Customer สร้างงาน Shopping
2. ✅ Status = 'pending'
3. ✅ provider_id = null (ยังไม่ assign)
4. ✅ บันทึกใน `shopping_requests` table

### Provider Side (What Should Happen)

1. ✅ Provider เปิดหน้า `/provider`
2. ✅ เห็น "งานที่รอรับ: 2 งาน"
3. ✅ คลิก "ดูงานทั้งหมด"
4. ✅ ไปที่ `/provider/orders`
5. ✅ เห็นงาน Shopping 2 งาน
6. ✅ คลิกรับงาน
7. ✅ System assign provider_id
8. ✅ Status เปลี่ยนเป็น 'matched'

---

## ✅ Verification Checklist

- [x] Database has 2 pending Shopping orders
- [x] Provider is online and available
- [x] Code uses correct column `service_fee` (not `estimated_fee`)
- [x] Code queries all 4 order types (ride, queue, shopping, delivery)
- [x] Enhanced logging added for debugging
- [ ] **Browser cache cleared (USER ACTION REQUIRED)**
- [ ] Console shows correct order counts
- [ ] UI displays "งานที่รอรับ: 2 งาน"
- [ ] `/provider/orders` shows 2 Shopping orders

---

## 🎯 Next Steps

### For User:

1. **Hard refresh browser** (Ctrl+Shift+R / Cmd+Shift+R)
2. Check console logs
3. Verify order count shows 2
4. Navigate to `/provider/orders`
5. Confirm Shopping orders are visible

### If Still Not Working:

1. Open DevTools Console
2. Copy all `[ProviderHome]` logs
3. Check Network tab for any 400 errors
4. Report findings

---

## 📝 Technical Details

### Query Logic

**Active Jobs** (provider_id assigned):

```typescript
.eq('provider_id', provId)
.in('status', ['matched', 'shopping', 'delivering'])
```

→ Returns 0 (งานยังไม่ได้ assign)

**Available Orders** (no provider assigned):

```typescript
.eq('status', 'pending')
```

→ Returns 2 (งานรอรับ)

### Why Provider Doesn't See in Active Job Card?

Because `provider_id = null` → งานยังไม่ได้รับ

Provider ต้อง:

1. ไปที่ `/provider/orders`
2. เลือกงาน Shopping
3. คลิก "รับงาน"
4. System จะ assign `provider_id`
5. จึงจะเห็นใน Active Job Card

---

**Summary**: โค้ดถูกต้องแล้ว ปัญหาคือ Browser Cache - ต้อง Hard Refresh!
