# ✅ Provider Orders - Shopping & Delivery Support Complete

**Date**: 2026-01-27  
**Issue**: Provider ไม่เห็นงาน Shopping และ Delivery ในหน้า `/provider/orders`  
**Status**: ✅ Fixed - Complete Implementation

---

## 🎯 ปัญหาที่พบ

User รายงานว่า Provider ไปที่ `/provider/orders` แล้ว **ไม่เห็นงาน Shopping** ให้กด

### 🔍 Root Cause Analysis

จากการตรวจสอบโค้ด `ProviderOrdersNew.vue` พบว่า:

1. ✅ **Backend โหลดข้อมูล Shopping ได้** - มี query shopping_requests
2. ✅ **มีตัวแปร computed** - `shoppingOrders`, `deliveryOrders`, `shoppingCount`, `deliveryCount`
3. ❌ **ไม่มี Filter Tab** - มีแค่ all, ride, queue (ไม่มี shopping, delivery)
4. ❌ **ไม่มี UI แสดง** - มีแค่ Ride และ Queue Orders (ไม่มี Shopping, Delivery)
5. ❌ **ไม่มี Realtime Subscription** - ไม่ฟัง INSERT/UPDATE/DELETE ของ shopping_requests และ delivery_requests
6. ❌ **ไม่มี Accept Logic** - `acceptOrder()` ไม่รองรับ shopping และ delivery

---

## ✅ การแก้ไข

### 1. เพิ่ม Filter Tabs สำหรับ Shopping และ Delivery

```vue
<!-- เพิ่ม 2 tabs ใหม่ -->
<button
  class="filter-tab"
  :class="{ active: serviceFilter === 'shopping' }"
  @click="setServiceFilter('shopping')"
>
  <span class="tab-icon">🛒</span>
  <span class="tab-label">ซื้อของ</span>
  <span class="tab-badge">{{ shoppingCount }}</span>
</button>
<button
  class="filter-tab"
  :class="{ active: serviceFilter === 'delivery' }"
  @click="setServiceFilter('delivery')"
>
  <span class="tab-icon">📦</span>
  <span class="tab-label">ส่งของ</span>
  <span class="tab-badge">{{ deliveryCount }}</span>
</button>
```

### 2. เพิ่ม UI แสดง Shopping Orders

```vue
<!-- Shopping Orders Section -->
<div v-if="shoppingOrders.length > 0 && (serviceFilter === 'all' || serviceFilter === 'shopping')" class="orders-group">
  <div v-if="serviceFilter === 'all'" class="group-label">
    <span class="group-icon">🛒</span>
    <span class="group-text">ซื้อของ ({{ shoppingOrders.length }})</span>
  </div>

  <div
    v-for="order in shoppingOrders"
    :key="order.id"
    class="order-card"
  >
    <div class="order-content">
      <div class="order-header">
        <span class="service-badge shopping">
          <span class="badge-icon">🛒</span>
          <span class="badge-text">ซื้อของ</span>
        </span>
        <span class="order-fare">฿{{ getFareDisplay(order) }}</span>
      </div>

      <div class="order-route">
        <div class="route-point pickup">
          <div class="route-dot"></div>
          <span class="route-text">{{ order.pickup_address }}</span>
        </div>
        <div class="route-line"></div>
        <div class="route-point dropoff">
          <div class="route-dot"></div>
          <span class="route-text">{{ order.destination_address }}</span>
        </div>
      </div>

      <div class="order-footer">
        <button class="accept-order-btn" @click="acceptOrder(order)">
          รับงาน ฿{{ getOrderFare(order).toFixed(0) }}
        </button>
      </div>
    </div>
  </div>
</div>
```

### 3. เพิ่ม UI แสดง Delivery Orders

```vue
<!-- Delivery Orders Section -->
<div
  v-if="
    deliveryOrders.length > 0 &&
    (serviceFilter === 'all' || serviceFilter === 'delivery')
  "
  class="orders-group"
>
  <!-- Similar structure to Shopping Orders -->
</div>
```

### 4. เพิ่ม CSS Badges

```css
.service-badge.shopping {
  background: #dcfce7;
  color: #166534;
}

.service-badge.delivery {
  background: #fce7f3;
  color: #9f1239;
}
```

### 5. เพิ่ม Accept Logic สำหรับ Shopping และ Delivery

```typescript
async function acceptOrder(order: Order) {
  // ... existing code ...

  // Accept based on service type
  if (order.service_type === "shopping") {
    const { error: updateError } = await (
      supabase.from("shopping_requests") as any
    )
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
  } else if (order.service_type === "delivery") {
    const { error: updateError } = await (
      supabase.from("delivery_requests") as any
    )
      .update({
        provider_id: provider.id,
        status: "matched",
        matched_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("status", "pending");

    if (updateError) {
      console.error("[Orders] Accept delivery error:", updateError);
      alert(`ไม่สามารถรับงานส่งของได้: ${updateError.message}`);
      acceptingOrderId.value = null;
      return;
    }
  }

  // Navigate to job detail
  router.push(`/provider/job/${order.id}`);
}
```

### 6. เพิ่ม Realtime Subscriptions

```typescript
function setupRealtimeSubscription() {
  realtimeChannel.value = supabase
    .channel('provider-orders-realtime')
    // ... existing ride and queue subscriptions ...

    // Shopping INSERT
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'shopping_requests',
      filter: 'status=eq.pending'
    }, (payload) => {
      console.log('[Orders] 🛒 New shopping order received:', payload.new)
      const newShopping = payload.new as any

      const shoppingOrder: Order = {
        id: newShopping.id,
        tracking_id: newShopping.tracking_id,
        pickup_address: newShopping.store_name || newShopping.store_address || 'ร้านค้า',
        destination_address: newShopping.delivery_address || 'ที่อยู่จัดส่ง',
        pickup_lat: newShopping.store_lat || 0,
        pickup_lng: newShopping.store_lng || 0,
        destination_lat: newShopping.delivery_lat || 0,
        destination_lng: newShopping.delivery_lng || 0,
        estimated_fare: newShopping.service_fee || 0,
        distance: calculateDistance(...),
        created_at: newShopping.created_at,
        service_type: 'shopping'
      }

      orders.value = [shoppingOrder, ...orders.value]
    })

    // Shopping UPDATE
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'shopping_requests'
    }, (payload) => {
      const updated = payload.new as { id: string; status: string }
      if (updated.status !== 'pending') {
        orders.value = orders.value.filter(o => o.id !== updated.id)
      }
    })

    // Shopping DELETE
    .on('postgres_changes', {
      event: 'DELETE',
      schema: 'public',
      table: 'shopping_requests'
    }, (payload) => {
      const deleted = payload.old as { id: string }
      orders.value = orders.value.filter(o => o.id !== deleted.id)
    })

    // Delivery INSERT/UPDATE/DELETE (similar structure)
    // ...

    .subscribe((status) => {
      console.log('[Orders] Realtime subscription status:', status)
    })
}
```

---

## 📊 Changes Summary

| Component         | Before                                   | After                                             |
| ----------------- | ---------------------------------------- | ------------------------------------------------- |
| **Filter Tabs**   | 3 tabs (all, ride, queue)                | 5 tabs (all, ride, queue, shopping, delivery)     |
| **UI Sections**   | 2 sections (Ride, Queue)                 | 4 sections (Ride, Queue, Shopping, Delivery)      |
| **Accept Logic**  | 2 types (ride, queue)                    | 4 types (ride, queue, shopping, delivery)         |
| **Realtime Subs** | 2 tables (ride_requests, queue_bookings) | 4 tables (+ shopping_requests, delivery_requests) |
| **CSS Badges**    | 2 colors (ride, queue)                   | 4 colors (+ shopping, delivery)                   |

---

## 🧪 Testing Guide

### Test Case 1: Shopping Order Visibility

1. Customer สร้างงาน Shopping (SHP-\*)
2. Provider ไปที่ `/provider/orders`
3. ✅ ต้องเห็นงาน Shopping ในรายการ
4. ✅ ต้องเห็น badge "🛒 ซื้อของ"
5. ✅ ต้องเห็น service_fee ที่ถูกต้อง
6. ✅ กดปุ่ม "รับงาน" ได้

### Test Case 2: Shopping Order Accept

1. Provider กดปุ่ม "รับงาน" บนงาน Shopping
2. ✅ ระบบ update `provider_id` และ `status = 'matched'`
3. ✅ Navigate ไปที่ `/provider/job/{id}`
4. ✅ งานหายจากรายการ "งานที่พร้อมรับ"
5. ✅ งานแสดงใน "งานที่กำลังทำ" (Provider Home)

### Test Case 3: Realtime Updates

1. Customer สร้างงาน Shopping ใหม่
2. ✅ Provider เห็นงานปรากฏทันที (ไม่ต้อง refresh)
3. Provider A รับงาน
4. ✅ Provider B เห็นงานหายจากรายการทันที

### Test Case 4: Filter Tabs

1. Provider ไปที่ `/provider/orders`
2. กด tab "ซื้อของ"
3. ✅ แสดงเฉพาะงาน Shopping
4. กด tab "ส่งของ"
5. ✅ แสดงเฉพาะงาน Delivery
6. กด tab "ทั้งหมด"
7. ✅ แสดงงานทุกประเภท

---

## 🔗 Related Files

- `src/views/provider/ProviderOrdersNew.vue` - Main file updated
- `src/views/provider/ProviderHome.vue` - Already supports shopping (verified)
- `PROVIDER_HOME_SHOPPING_ORDER_NOT_VISIBLE_EXPLAINED_2026-01-27.md` - Previous investigation

---

## 📝 Database Schema Reference

### shopping_requests Table

```sql
CREATE TABLE shopping_requests (
  id UUID PRIMARY KEY,
  tracking_id VARCHAR,
  user_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES providers_v2(id),
  store_name VARCHAR,
  store_address TEXT,
  store_lat NUMERIC,
  store_lng NUMERIC,
  delivery_address TEXT,
  delivery_lat NUMERIC,
  delivery_lng NUMERIC,
  items JSONB,
  service_fee NUMERIC,
  status VARCHAR, -- 'pending', 'matched', 'shopping', 'delivering', 'completed', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### delivery_requests Table

```sql
CREATE TABLE delivery_requests (
  id UUID PRIMARY KEY,
  tracking_id VARCHAR,
  user_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES providers_v2(id),
  sender_address TEXT,
  sender_lat NUMERIC,
  sender_lng NUMERIC,
  recipient_address TEXT,
  recipient_lat NUMERIC,
  recipient_lng NUMERIC,
  estimated_fee NUMERIC,
  status VARCHAR, -- 'pending', 'matched', 'pickup', 'in_transit', 'completed', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ✅ Verification Checklist

- [x] Filter tabs เพิ่ม Shopping และ Delivery
- [x] UI แสดง Shopping Orders
- [x] UI แสดง Delivery Orders
- [x] CSS badges สำหรับ Shopping และ Delivery
- [x] Accept logic รองรับ Shopping
- [x] Accept logic รองรับ Delivery
- [x] Realtime INSERT subscription สำหรับ Shopping
- [x] Realtime INSERT subscription สำหรับ Delivery
- [x] Realtime UPDATE subscription สำหรับ Shopping
- [x] Realtime UPDATE subscription สำหรับ Delivery
- [x] Realtime DELETE subscription สำหรับ Shopping
- [x] Realtime DELETE subscription สำหรับ Delivery

---

## 🎯 Next Steps

1. **Test in Production**
   - สร้างงาน Shopping ใหม่
   - ตรวจสอบว่า Provider เห็นงานใน `/provider/orders`
   - ทดสอบรับงานและ navigate ไปหน้า job detail

2. **Browser Cache**
   - แนะนำ Provider ทำ Hard Refresh (Ctrl+Shift+R / Cmd+Shift+R)
   - เพื่อให้ได้ JavaScript version ใหม่

3. **Monitor Realtime**
   - ตรวจสอบ console logs ว่า realtime subscription ทำงาน
   - ดู `[Orders] 🛒 New shopping order received:` ใน console

---

## 🚨 Known Issues

### Data Quality (From Previous Investigation)

งาน SHP-20260127-350085 มีปัญหา:

- ❌ `items = []` - ไม่มีรายการสินค้า
- ❌ `store_name = null` - ไม่มีชื่อร้าน

**แนะนำ:**

- เพิ่ม validation ตอนสร้างงาน Shopping
- ห้ามสร้างงานที่ไม่มี items
- ห้ามสร้างงานที่ไม่มี store_name

---

## 💡 Summary

**ปัญหา:** Provider ไม่เห็นงาน Shopping ในหน้า `/provider/orders`

**สาเหตุ:** UI ไม่มีส่วนแสดง Shopping และ Delivery Orders

**การแก้ไข:** เพิ่ม UI, Filter Tabs, Accept Logic, และ Realtime Subscriptions สำหรับ Shopping และ Delivery

**ผลลัพธ์:** ✅ Provider สามารถเห็นและรับงาน Shopping และ Delivery ได้แล้ว

---

**Created**: 2026-01-27  
**Status**: ✅ Complete  
**Next Action**: Test in production + Hard refresh browser
