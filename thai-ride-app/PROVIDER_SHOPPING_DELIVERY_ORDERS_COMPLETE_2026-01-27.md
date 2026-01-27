# Provider Shopping & Delivery Orders Support - Complete

**Date**: 2026-01-27  
**Status**: ✅ Complete  
**Priority**: 🔥 CRITICAL

---

## 🎯 Problem

Provider ไม่เห็นงาน Shopping และ Delivery ในหน้า:

- `/provider` (Provider Home) - ไม่แสดงจำนวนงานที่รอรับ
- `/provider/orders` (Provider Orders) - ไม่แสดงรายการงาน Shopping/Delivery

**Test Case**: ออเดอร์ `SHP-20260127-415366` (Shopping) ไม่แสดงในระบบ

---

## 🔍 Root Cause Analysis

### 1. Provider Home (`ProviderHome.vue`)

- ❌ Query `shopping_requests` ใช้ column `estimated_fee` (ไม่มี) แทน `service_fee`
- ❌ Query ใช้ `.order('matched_at')` (ไม่มี) แทน `.order('created_at')`
- ❌ Data mapping ใช้ `data.estimated_fee` แทน `data.service_fee`

### 2. Provider Orders (`ProviderOrdersNew.vue`)

- ❌ ไม่มี query สำหรับ `shopping_requests` และ `delivery_requests` เลย
- ❌ TypeScript types ไม่รองรับ `shopping` และ `delivery`
- ❌ Service filter, icons, labels ไม่รองรับ Shopping/Delivery

---

## ✅ Solutions Implemented

### File 1: `src/views/provider/ProviderHome.vue`

#### Fix 1: Shopping Query - Column Names

```typescript
// ❌ BEFORE
supabase
  .from("shopping_requests")
  .select(`..., estimated_fee, ...`)
  .order("matched_at", { ascending: false });

// ✅ AFTER
supabase
  .from("shopping_requests")
  .select(`..., service_fee, ...`)
  .order("created_at", { ascending: false });
```

#### Fix 2: Delivery Query - Order Clause

```typescript
// ❌ BEFORE
supabase.from("delivery_requests").order("matched_at", { ascending: false });

// ✅ AFTER
supabase.from("delivery_requests").order("created_at", { ascending: false });
```

#### Fix 3: Data Mapping

```typescript
// ❌ BEFORE
activeJob.value = {
  ...
  estimated_fare: data.estimated_fee, // ❌ Wrong column
}

// ✅ AFTER
activeJob.value = {
  ...
  estimated_fare: data.service_fee, // ✅ Correct column
}
```

---

### File 2: `src/views/provider/ProviderOrdersNew.vue`

#### Fix 1: Add Shopping & Delivery Queries

```typescript
// Added to loadOrders()
const [ridesResult, queueResult, shoppingResult, deliveryResult] =
  await Promise.all([
    // ... existing queries ...

    // ✅ NEW: Shopping requests
    supabase
      .from("shopping_requests")
      .select(
        "id, tracking_id, store_name, store_address, store_lat, store_lng, delivery_address, delivery_lat, delivery_lng, service_fee, created_at",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),

    // ✅ NEW: Delivery requests
    supabase
      .from("delivery_requests")
      .select(
        "id, tracking_id, sender_address, sender_lat, sender_lng, recipient_address, recipient_lat, recipient_lng, estimated_fee, created_at",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
```

#### Fix 2: Process Shopping Orders

```typescript
if (shoppingResult.data) {
  const shoppingOrders = shoppingResult.data.map((s: any) => ({
    id: s.id,
    tracking_id: s.tracking_id,
    pickup_address: s.store_name || s.store_address || 'ร้านค้า',
    destination_address: s.delivery_address || 'ที่อยู่จัดส่ง',
    pickup_lat: s.store_lat || 0,
    pickup_lng: s.store_lng || 0,
    destination_lat: s.delivery_lat || 0,
    destination_lng: s.delivery_lng || 0,
    estimated_fare: s.service_fee || 0,
    distance: calculateDistance(...),
    created_at: s.created_at,
    service_type: 'shopping' as const
  }))
  allOrders.push(...shoppingOrders)
}
```

#### Fix 3: Process Delivery Orders

```typescript
if (deliveryResult.data) {
  const deliveryOrders = deliveryResult.data.map((d: any) => ({
    id: d.id,
    tracking_id: d.tracking_id,
    pickup_address: d.sender_address || 'ที่อยู่ผู้ส่ง',
    destination_address: d.recipient_address || 'ที่อยู่ผู้รับ',
    pickup_lat: d.sender_lat || 0,
    pickup_lng: d.sender_lng || 0,
    destination_lat: d.recipient_lat || 0,
    destination_lng: d.recipient_lng || 0,
    estimated_fare: d.estimated_fee || 0,
    distance: calculateDistance(...),
    created_at: d.created_at,
    service_type: 'delivery' as const
  }))
  allOrders.push(...deliveryOrders)
}
```

#### Fix 4: Update TypeScript Types

```typescript
// ❌ BEFORE
type ServiceFilter = 'all' | 'ride' | 'queue'
service_type?: 'ride' | 'queue'

// ✅ AFTER
type ServiceFilter = 'all' | 'ride' | 'queue' | 'shopping' | 'delivery'
service_type?: 'ride' | 'queue' | 'shopping' | 'delivery'
```

#### Fix 5: Add Computed Properties

```typescript
const shoppingOrders = computed(() =>
  filteredOrders.value.filter((o) => o.service_type === "shopping"),
);

const deliveryOrders = computed(() =>
  filteredOrders.value.filter((o) => o.service_type === "delivery"),
);

const shoppingCount = computed(() => shoppingOrders.value.length);
const deliveryCount = computed(() => deliveryOrders.value.length);
```

#### Fix 6: Update Service Functions

```typescript
function getServiceIcon(
  serviceType: "ride" | "queue" | "shopping" | "delivery" | undefined,
): string {
  if (serviceType === "queue") return "📅";
  if (serviceType === "shopping") return "🛒";
  if (serviceType === "delivery") return "📦";
  return "🚗";
}

function getServiceLabel(
  serviceType: "ride" | "queue" | "shopping" | "delivery" | undefined,
): string {
  if (serviceType === "queue") return "จองคิว";
  if (serviceType === "shopping") return "สั่งซื้อของ";
  if (serviceType === "delivery") return "ส่งของ";
  return "เรียกรถ";
}

function getServiceColor(
  serviceType: "ride" | "queue" | "shopping" | "delivery" | undefined,
): string {
  if (serviceType === "queue") return "queue";
  if (serviceType === "shopping") return "shopping";
  if (serviceType === "delivery") return "delivery";
  return "ride";
}
```

---

## 📊 Database Schema Reference

### shopping_requests Table

```sql
Key Columns:
- id: UUID
- tracking_id: VARCHAR (e.g., 'SHP-20260127-415366')
- status: VARCHAR ('pending', 'matched', 'shopping', 'delivering', 'completed', 'cancelled')
- provider_id: UUID (NULL when pending)
- store_name: VARCHAR
- store_address: TEXT
- store_lat, store_lng: NUMERIC
- delivery_address: TEXT
- delivery_lat, delivery_lng: NUMERIC
- service_fee: NUMERIC ⚠️ NOT estimated_fee
- created_at: TIMESTAMPTZ
```

### delivery_requests Table

```sql
Key Columns:
- id: UUID
- tracking_id: VARCHAR
- status: VARCHAR ('pending', 'matched', 'pickup', 'in_transit', 'delivered', 'cancelled')
- provider_id: UUID (NULL when pending)
- sender_address: TEXT
- sender_lat, sender_lng: NUMERIC
- recipient_address: TEXT
- recipient_lat, recipient_lng: NUMERIC
- estimated_fee: NUMERIC ✅ Has estimated_fee
- created_at: TIMESTAMPTZ
```

---

## 🧪 Testing

### Test Case 1: Shopping Order Display

```
Order: SHP-20260127-415366
Status: pending
Provider: null
Expected: Show in /provider/orders
Result: ✅ PASS
```

### Test Case 2: Service Type Icons

```
🚗 Ride - เรียกรถ
📅 Queue - จองคิว
🛒 Shopping - สั่งซื้อของ
📦 Delivery - ส่งของ
Result: ✅ PASS
```

### Test Case 3: Order Counts

```
Provider Home: Shows total count (all 4 types)
Provider Orders: Shows individual counts per type
Result: ✅ PASS
```

---

## 🎯 Result

### Provider Home (`/provider`)

- ✅ Queries all 4 order types correctly
- ✅ Shows total available orders count
- ✅ Displays active job (if provider has accepted one)
- ✅ Uses correct column names for each table

### Provider Orders (`/provider/orders`)

- ✅ Queries all 4 order types: Ride, Queue, Shopping, Delivery
- ✅ Displays orders with correct icons and labels
- ✅ Supports filtering by service type
- ✅ Shows correct fare (service_fee for Shopping, estimated_fee for Delivery)
- ✅ Calculates distance correctly
- ✅ Sorts by created_at (newest first)

---

## 📝 Summary

**Files Modified:**

1. `src/views/provider/ProviderHome.vue` - Fixed Shopping/Delivery queries
2. `src/views/provider/ProviderOrdersNew.vue` - Added Shopping/Delivery support

**Key Changes:**

- ✅ Fixed column names: `service_fee` for Shopping, `estimated_fee` for Delivery
- ✅ Fixed order clause: `created_at` instead of `matched_at`
- ✅ Added Shopping and Delivery queries to Provider Orders
- ✅ Updated TypeScript types to include 'shopping' and 'delivery'
- ✅ Added service icons, labels, and colors
- ✅ Added computed properties for filtering

**Order Types Supported:**

1. 🚗 Ride (เรียกรถ)
2. 📅 Queue (จองคิว)
3. 🛒 Shopping (สั่งซื้อของ) - **NEW**
4. 📦 Delivery (ส่งของ) - **NEW**

---

**Status**: ✅ Complete - Provider can now see and accept Shopping & Delivery orders!
