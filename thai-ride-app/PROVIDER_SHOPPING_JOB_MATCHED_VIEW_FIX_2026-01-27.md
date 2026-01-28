# 🛒 Provider Shopping Job - Matched View Fix

**Date**: 2026-01-27  
**Status**: ✅ Complete  
**Priority**: 🔥 CRITICAL

---

## 🐛 Problem

เมื่อ Provider รับงาน Shopping order (status = `matched`) แล้วเข้าไปดู job detail หน้าจอแสดง "รอรับงาน" และไม่มีปุ่มดำเนินการต่อ

### Root Cause Analysis

1. ✅ **Database**: `shopping_requests` table มี `matched_at` column แล้ว
2. ✅ **Accept Job**: ProviderOrdersNew.vue รับงานได้ถูกต้อง (set status = `matched`, matched_at)
3. ✅ **Job Detail Loading**: useProviderJobDetail.ts โหลด shopping orders ได้แล้ว
4. ❌ **UI Display**: JobMatchedViewClean.vue ไม่รองรับ shopping orders!

### Current Flow

```
1. Provider เห็น shopping order ใน /provider/orders (status = pending) ✅
2. Provider กดรับงาน → Update status = matched, matched_at ✅
3. Navigate to /provider/job/{id} ✅
4. JobMatchedViewClean.vue แสดงข้อมูล ride/queue แต่ไม่รู้จัก shopping ❌
```

---

## 🎯 Solution

### Shopping Order Status Flow

```
pending → matched → shopping → delivering → completed
          ↑ ตอนนี้
```

### Shopping Order Data Structure

```typescript
{
  id: string
  type: 'shopping'
  status: 'matched'
  store_name: string          // 🏪 ร้านค้า
  store_address: string       // 📍 ที่อยู่ร้าน
  store_lat: number
  store_lng: number
  delivery_address: string    // 🏠 ที่อยู่จัดส่ง
  delivery_lat: number
  delivery_lng: number
  items: Array<{              // 📦 รายการสินค้า
    name: string
    quantity: number
    price?: number
  }>
  service_fee: number         // 💰 ค่าบริการ
  budget_limit?: number       // 💵 งบประมาณ
  special_instructions?: string
}
```

---

## 🔧 Required Changes

### 1. JobMatchedViewClean.vue

**Add Shopping Order Support:**

```vue
<template>
  <!-- Shopping Order View -->
  <div v-if="job.type === 'shopping'" class="shopping-matched-view">
    <!-- Store Info -->
    <div class="store-section">
      <div class="section-icon">🏪</div>
      <div class="section-content">
        <h3>ร้านค้า</h3>
        <p class="store-name">{{ job.store_name }}</p>
        <p class="store-address">{{ job.store_address }}</p>
      </div>
    </div>

    <!-- Shopping List -->
    <div class="items-section">
      <div class="section-header">
        <div class="section-icon">📦</div>
        <h3>รายการสินค้า</h3>
      </div>
      <div class="items-list">
        <div v-for="(item, index) in job.items" :key="index" class="item-row">
          <span class="item-name">{{ item.name }}</span>
          <span class="item-qty">x{{ item.quantity }}</span>
        </div>
      </div>
    </div>

    <!-- Delivery Address -->
    <div class="delivery-section">
      <div class="section-icon">🏠</div>
      <div class="section-content">
        <h3>ที่อยู่จัดส่ง</h3>
        <p class="delivery-address">{{ job.delivery_address }}</p>
      </div>
    </div>

    <!-- Budget Info -->
    <div v-if="job.budget_limit" class="budget-section">
      <div class="section-icon">💵</div>
      <div class="section-content">
        <h3>งบประมาณ</h3>
        <p class="budget-amount">฿{{ job.budget_limit.toFixed(0) }}</p>
      </div>
    </div>

    <!-- Special Instructions -->
    <div v-if="job.special_instructions" class="notes-section">
      <div class="section-icon">📝</div>
      <div class="section-content">
        <h3>หมายเหตุ</h3>
        <p class="notes-text">{{ job.special_instructions }}</p>
      </div>
    </div>

    <!-- Action Button -->
    <button
      class="action-btn primary"
      @click="startShopping"
      :disabled="updating"
    >
      <svg
        class="btn-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      <span v-if="updating">กำลังอัพเดท...</span>
      <span v-else>เริ่มซื้อของ</span>
    </button>
  </div>

  <!-- Existing Ride/Queue View -->
  <div v-else class="ride-matched-view">
    <!-- ... existing code ... -->
  </div>
</template>

<script setup lang="ts">
// Add shopping-specific methods
function startShopping() {
  // Update status: matched → shopping
  updateStatus();
}
</script>
```

### 2. Status Update Logic

**Update `useProviderJobDetail.ts`:**

```typescript
// Shopping status flow
const SHOPPING_STATUS_FLOW = [
  { key: "pending", label: "รอรับงาน" },
  { key: "matched", label: "รับงานแล้ว", next: "shopping" },
  { key: "shopping", label: "กำลังซื้อของ", next: "delivering" },
  { key: "delivering", label: "กำลังจัดส่ง", next: "completed" },
  { key: "completed", label: "เสร็จสิ้น" },
];
```

---

## 📋 Implementation Checklist

### Phase 1: UI Display ✅

- [x] Add shopping order detection in useProviderJobDetail
- [x] Add shopping data transformation
- [x] Update JobMatchedViewClean.vue to show shopping orders
- [x] Add shopping-specific styling

### Phase 2: Status Updates

- [ ] Add "เริ่มซื้อของ" button (matched → shopping)
- [ ] Add "เริ่มจัดส่ง" button (shopping → delivering)
- [ ] Add "ส่งของเสร็จสิ้น" button (delivering → completed)

### Phase 3: Shopping Features

- [ ] Add item checklist (mark items as purchased)
- [ ] Add receipt photo upload
- [ ] Add actual cost input
- [ ] Add delivery proof photo

---

## 🎨 UI Design

### Shopping Order Card (Matched Status)

```
┌─────────────────────────────────────┐
│ 🏪 ร้านค้า                          │
│ ร้านสะดวกซื้อ 7-11                  │
│ 123 ถนนสุขุมวิท แขวงคลองเตย         │
├─────────────────────────────────────┤
│ 📦 รายการสินค้า (3 รายการ)          │
│ • น้ำดื่ม x2                         │
│ • ขนมปัง x1                          │
│ • นม x1                              │
├─────────────────────────────────────┤
│ 🏠 ที่อยู่จัดส่ง                     │
│ 456 ถนนพระราม 4 แขวงปทุมวัน         │
├─────────────────────────────────────┤
│ 💵 งบประมาณ: ฿200                   │
├─────────────────────────────────────┤
│ 📝 หมายเหตุ                          │
│ ซื้อนมรสจืดนะคะ                      │
├─────────────────────────────────────┤
│ [🛒 เริ่มซื้อของ]                   │
└─────────────────────────────────────┘
```

---

## 🧪 Testing Plan

### Test Cases

1. **Accept Shopping Order**
   - ✅ Status changes from `pending` to `matched`
   - ✅ `matched_at` timestamp is set
   - ✅ Navigate to job detail page

2. **View Shopping Order (Matched)**
   - [ ] Store info displays correctly
   - [ ] Items list displays correctly
   - [ ] Delivery address displays correctly
   - [ ] Budget displays correctly
   - [ ] Special instructions display correctly

3. **Start Shopping**
   - [ ] Status changes from `matched` to `shopping`
   - [ ] UI updates to shopping view
   - [ ] Item checklist appears

4. **Complete Shopping**
   - [ ] Can mark items as purchased
   - [ ] Can upload receipt photo
   - [ ] Can input actual cost
   - [ ] Status changes to `delivering`

5. **Complete Delivery**
   - [ ] Can upload delivery proof
   - [ ] Status changes to `completed`
   - [ ] Earnings credited to wallet

---

## 🚀 Next Steps

1. Update JobMatchedViewClean.vue to detect and display shopping orders
2. Add shopping-specific UI components
3. Test accept → view → start shopping flow
4. Add shopping and delivering status views
5. Test complete flow end-to-end

---

**Created**: 2026-01-27 09:08:00  
**Last Updated**: 2026-01-27 09:30:00  
**Status**: ✅ Phase 1 Complete

---

## ✅ Completion Summary

### What Was Fixed

1. **Shopping Order Detection** ✅
   - Added `isShopping` computed property to detect shopping orders
   - Added `shoppingItems` computed to parse items JSON safely

2. **UI Template Updates** ✅
   - Added store location section with 🏪 emoji
   - Added items list with quantities (📦)
   - Added delivery address section (🏠)
   - Added budget display (💵)
   - Changed button text to "เริ่มซื้อของ" for shopping orders
   - Updated header to show "กำลังไปซื้อของ"

3. **CSS Styling** ✅
   - Added `.location-icon.store` styling with warm background
   - Added `.items-card`, `.items-header`, `.items-list` styling
   - Added `.item-row`, `.item-name`, `.item-qty` styling
   - Added `.budget-card`, `.budget-icon`, `.budget-info` styling
   - Added `.budget-label`, `.budget-amount` styling

4. **Code Quality** ✅
   - Removed unused `isQueue` variable
   - Fixed TypeScript warnings
   - Maintained consistent design system

### Testing Required

1. **Accept Shopping Order**
   - Provider accepts shopping order from /provider/orders
   - Status changes to `matched`
   - Navigate to job detail page

2. **View Shopping Order**
   - Store info displays correctly with 🏪 icon
   - Items list shows all items with quantities
   - Delivery address displays correctly
   - Budget displays if available
   - Button shows "เริ่มซื้อของ"

3. **Start Shopping**
   - Click "เริ่มซื้อของ" button
   - Status should update to `shopping`
   - Navigate to shopping view (next phase)

### Next Phase: Shopping & Delivery Views

- [ ] Create JobShoppingViewClean.vue (shopping status)
- [ ] Add item checklist functionality
- [ ] Add receipt photo upload
- [ ] Create JobDeliveringViewClean.vue (delivering status)
- [ ] Add delivery proof photo upload
- [ ] Test complete flow: matched → shopping → delivering → completed

---

**Created**: 2026-01-27 09:08:00  
**Last Updated**: 2026-01-27 09:08:00
