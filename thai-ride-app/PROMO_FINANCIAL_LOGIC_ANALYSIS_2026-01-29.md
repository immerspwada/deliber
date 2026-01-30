# 💰 Promo Financial Logic - Complete Analysis

**Date**: 2026-01-29  
**Status**: 🔥 CRITICAL - Must Fix  
**Priority**: ⚠️ Business Logic Correction

---

## 🚨 ปัญหาที่พบ

ระบบโปรโมชั่นต้องมีการคำนวณทางการเงินที่ถูกต้องและยุติธรรมกับทุก Role:

- **Customer**: ได้ส่วนลดตามที่โฆษณา
- **Provider**: ได้รับค่าบริการเต็มตามที่ควรได้
- **Platform**: รับภาระส่วนลดเป็น Marketing Cost

---

## 📊 การวิเคราะห์ Business Logic

### ❌ วิธีที่ผิด (ต้องไม่ทำ)

```typescript
// ❌ ผิด: หักคอมมิชชั่นจากราคาหลังหักส่วนลด
const baseFare = 200;
const promoDiscount = 50;
const afterDiscount = baseFare - promoDiscount; // 150
const commission = afterDiscount * 0.2; // 30 ❌ ผิด!
const providerEarnings = afterDiscount - commission; // 120

// ผลลัพธ์:
// - ลูกค้าจ่าย: 150 บาท ✅
// - Provider ได้: 120 บาท ❌ เสียเปรียบ!
// - Platform ได้: 30 บาท (คอมมิชชั่น)
// - Platform จ่ายส่วนลด: 0 บาท (ไม่ได้รับภาระ)
// - Platform สุทธิ: +30 บาท (กำไร แต่ไม่ยุติธรรม)
```

**ปัญหา:**

- Provider เสียเปรียบ 40 บาท (ควรได้ 160 แต่ได้แค่ 120)
- Platform ไม่ได้รับภาระส่วนลดเลย
- Provider อาจปฏิเสธงานที่มีโปรโมชั่น

---

### ✅ วิธีที่ถูก (แนะนำ): Platform รับภาระส่วนลด

```typescript
// ✅ ถูก: หักคอมมิชชั่นจากราคาเต็ม, Platform รับภาระส่วนลด
const baseFare = 200;
const commission = baseFare * 0.2; // 40 ✅ คำนวณจากราคาเต็ม
const providerEarnings = baseFare - commission; // 160
const promoDiscount = 50;
const customerPays = baseFare - promoDiscount; // 150

// ผลลัพธ์:
// - ลูกค้าจ่าย: 150 บาท ✅
// - Provider ได้: 160 บาท ✅ ยุติธรรม!
// - Platform ได้: 40 บาท (คอมมิชชั่น)
// - Platform จ่ายส่วนลด: 50 บาท (Marketing Cost)
// - Platform สุทธิ: -10 บาท (ขาดทุนเพื่อดึงลูกค้า)
```

**ข้อดี:**

- ✅ Provider ได้รับเงินเต็มตามที่ควรได้
- ✅ Platform รับภาระส่วนลดเอง (เป็น Marketing Investment)
- ✅ ยุติธรรมกับทุกฝ่าย
- ✅ Provider ยินดีรับงานที่มีโปรโมชั่น

---

## 🔄 Money Flow ที่ถูกต้อง

### Scenario 1: ไม่มีโปรโมชั่น

```
ราคาเต็ม: 200 บาท
├─ ลูกค้าจ่าย: 200 บาท
├─ Platform คอมมิชชั่น: 40 บาท (20%)
└─ Provider ได้: 160 บาท (80%)

Platform P&L:
  รายได้: +40 บาท
  ต้นทุน: 0 บาท
  กำไร: +40 บาท ✅
```

### Scenario 2: มีโปรโมชั่น 50 บาท

```
ราคาเต็ม: 200 บาท
ส่วนลด: 50 บาท
├─ ลูกค้าจ่าย: 150 บาท
├─ Platform คอมมิชชั่น: 40 บาท (20% จากราคาเต็ม)
├─ Platform จ่ายส่วนลด: 50 บาท
└─ Provider ได้: 160 บาท (80% จากราคาเต็ม)

Platform P&L:
  รายได้: +40 บาท (คอมมิชชั่น)
  ต้นทุน: -50 บาท (ส่วนลด)
  กำไร: -10 บาท ❌ (ขาดทุนเพื่อ Marketing)
```

### Scenario 3: มีโปรโมชั่น 20% (สูงสุด 100 บาท)

```
ราคาเต็ม: 200 บาท
ส่วนลด: 40 บาท (20% = 40, ไม่เกิน 100)
├─ ลูกค้าจ่าย: 160 บาท
├─ Platform คอมมิชชั่น: 40 บาท (20% จากราคาเต็ม)
├─ Platform จ่ายส่วนลด: 40 บาท
└─ Provider ได้: 160 บาท (80% จากราคาเต็ม)

Platform P&L:
  รายได้: +40 บาท (คอมมิชชั่น)
  ต้นทุน: -40 บาท (ส่วนลด)
  กำไร: 0 บาท (Break-even)
```

---

## 💾 Database Schema ที่ต้องมี

```sql
-- ride_requests table
CREATE TABLE ride_requests (
  id UUID PRIMARY KEY,

  -- Pricing (ราคาเต็ม)
  base_fare NUMERIC NOT NULL,              -- ราคาฐาน
  distance_fare NUMERIC DEFAULT 0,         -- ค่าระยะทาง
  time_fare NUMERIC DEFAULT 0,             -- ค่าเวลา
  surge_multiplier NUMERIC DEFAULT 1.0,    -- ตัวคูณ Surge

  -- Total (ราคาเต็มรวม)
  total_fare NUMERIC NOT NULL,             -- ราคาเต็มก่อนหักส่วนลด

  -- Commission (คำนวณจากราคาเต็ม)
  commission_rate NUMERIC DEFAULT 0.20,    -- อัตราคอมมิชชั่น (20%)
  platform_commission NUMERIC NOT NULL,    -- คอมมิชชั่น Platform (total_fare * commission_rate)

  -- Provider Earnings (คำนวณจากราคาเต็ม)
  provider_earnings NUMERIC NOT NULL,      -- รายได้ Provider (total_fare - platform_commission)

  -- Promo (ส่วนลด - Platform รับภาระ)
  promo_code_id UUID REFERENCES promo_codes(id),
  promo_code TEXT,
  promo_discount_amount NUMERIC DEFAULT 0, -- จำนวนส่วนลด (Platform จ่าย)

  -- Customer Payment (ราคาหลังหักส่วนลด)
  customer_paid_amount NUMERIC NOT NULL,   -- ลูกค้าจ่าย (total_fare - promo_discount_amount)

  -- Platform P&L
  platform_revenue NUMERIC,                -- รายได้ Platform (platform_commission - promo_discount_amount)

  -- Tip (ทิปเพิ่มเติม)
  tip_amount NUMERIC DEFAULT 0,            -- ทิป (ไปให้ Provider 100%)

  -- Status
  status VARCHAR NOT NULL,
  payment_status TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

---

## 🔧 การคำนวณที่ถูกต้อง

### Function: calculateFareWithPromo

```typescript
interface FareCalculation {
  // Input
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeMultiplier: number;
  commissionRate: number;
  promoCode?: PromoCode;

  // Output
  totalFare: number;
  platformCommission: number;
  providerEarnings: number;
  promoDiscountAmount: number;
  customerPaidAmount: number;
  platformRevenue: number;
}

function calculateFareWithPromo(input: FareInput): FareCalculation {
  // 1. คำนวณราคาเต็ม
  const subtotal = input.baseFare + input.distanceFare + input.timeFare;
  const totalFare = subtotal * input.surgeMultiplier;

  // 2. คำนวณคอมมิชชั่น (จากราคาเต็ม)
  const platformCommission = totalFare * input.commissionRate;

  // 3. คำนวณรายได้ Provider (จากราคาเต็ม)
  const providerEarnings = totalFare - platformCommission;

  // 4. คำนวณส่วนลด
  let promoDiscountAmount = 0;
  if (input.promoCode) {
    if (input.promoCode.discount_type === "fixed") {
      promoDiscountAmount = input.promoCode.discount_value;
    } else {
      // Percentage
      const percentage = input.promoCode.discount_value / 100;
      promoDiscountAmount = totalFare * percentage;

      // Apply max discount cap
      if (input.promoCode.max_discount) {
        promoDiscountAmount = Math.min(
          promoDiscountAmount,
          input.promoCode.max_discount,
        );
      }
    }

    // ส่วนลดต้องไม่เกินราคาเต็ม
    promoDiscountAmount = Math.min(promoDiscountAmount, totalFare);
  }

  // 5. คำนวณยอดที่ลูกค้าจ่าย
  const customerPaidAmount = totalFare - promoDiscountAmount;

  // 6. คำนวณรายได้สุทธิของ Platform
  const platformRevenue = platformCommission - promoDiscountAmount;

  return {
    totalFare,
    platformCommission,
    providerEarnings,
    promoDiscountAmount,
    customerPaidAmount,
    platformRevenue,
  };
}
```

---

## 📱 UI Display ที่ถูกต้อง

### Customer View (ลูกค้า)

```vue
<template>
  <div class="fare-breakdown">
    <div class="line-item">
      <span>ค่าโดยสาร</span>
      <span>฿{{ totalFare }}</span>
    </div>

    <div v-if="promoDiscountAmount > 0" class="line-item discount">
      <span>ส่วนลด ({{ promoCode }})</span>
      <span class="text-green-600">-฿{{ promoDiscountAmount }}</span>
    </div>

    <div class="line-item total">
      <span class="font-bold">ยอดที่ต้องจ่าย</span>
      <span class="font-bold">฿{{ customerPaidAmount }}</span>
    </div>
  </div>
</template>
```

### Provider View (ไรเดอร์)

```vue
<template>
  <div class="earnings-breakdown">
    <div class="line-item">
      <span>ค่าโดยสาร</span>
      <span>฿{{ totalFare }}</span>
    </div>

    <div class="line-item">
      <span>คอมมิชชั่น Platform ({{ commissionRate * 100 }}%)</span>
      <span class="text-red-600">-฿{{ platformCommission }}</span>
    </div>

    <div v-if="promoDiscountAmount > 0" class="line-item info">
      <span class="text-sm text-gray-600"> ส่วนลด (Platform รับภาระ) </span>
      <span class="text-sm text-gray-600">-฿{{ promoDiscountAmount }}</span>
    </div>

    <div class="line-item total">
      <span class="font-bold">คุณได้รับ</span>
      <span class="font-bold text-green-600">฿{{ providerEarnings }}</span>
    </div>

    <div v-if="tipAmount > 0" class="line-item bonus">
      <span>ทิป</span>
      <span class="text-green-600">+฿{{ tipAmount }}</span>
    </div>
  </div>
</template>
```

### Admin View (แอดมิน)

```vue
<template>
  <div class="admin-breakdown">
    <h3>รายละเอียดทางการเงิน</h3>

    <div class="section">
      <h4>ลูกค้า</h4>
      <div class="line-item">
        <span>ราคาเต็ม</span>
        <span>฿{{ totalFare }}</span>
      </div>
      <div class="line-item discount">
        <span>ส่วนลด</span>
        <span>-฿{{ promoDiscountAmount }}</span>
      </div>
      <div class="line-item total">
        <span>ลูกค้าจ่าย</span>
        <span>฿{{ customerPaidAmount }}</span>
      </div>
    </div>

    <div class="section">
      <h4>Provider</h4>
      <div class="line-item">
        <span>ราคาเต็ม</span>
        <span>฿{{ totalFare }}</span>
      </div>
      <div class="line-item">
        <span>คอมมิชชั่น</span>
        <span>-฿{{ platformCommission }}</span>
      </div>
      <div class="line-item total">
        <span>Provider ได้รับ</span>
        <span>฿{{ providerEarnings }}</span>
      </div>
    </div>

    <div class="section">
      <h4>Platform P&L</h4>
      <div class="line-item">
        <span>รายได้ (คอมมิชชั่น)</span>
        <span class="text-green-600">+฿{{ platformCommission }}</span>
      </div>
      <div class="line-item">
        <span>ต้นทุน (ส่วนลด)</span>
        <span class="text-red-600">-฿{{ promoDiscountAmount }}</span>
      </div>
      <div class="line-item total">
        <span>กำไร/ขาดทุนสุทธิ</span>
        <span :class="platformRevenue >= 0 ? 'text-green-600' : 'text-red-600'">
          {{ platformRevenue >= 0 ? "+" : "" }}฿{{ platformRevenue }}
        </span>
      </div>
    </div>
  </div>
</template>
```

---

## 🧪 Test Cases

### Test 1: ไม่มีโปรโมชั่น

```typescript
const result = calculateFareWithPromo({
  baseFare: 150,
  distanceFare: 30,
  timeFare: 20,
  surgeMultiplier: 1.0,
  commissionRate: 0.2,
  promoCode: null,
});

expect(result).toEqual({
  totalFare: 200,
  platformCommission: 40,
  providerEarnings: 160,
  promoDiscountAmount: 0,
  customerPaidAmount: 200,
  platformRevenue: 40,
});
```

### Test 2: ส่วนลดแบบ Fixed

```typescript
const result = calculateFareWithPromo({
  baseFare: 150,
  distanceFare: 30,
  timeFare: 20,
  surgeMultiplier: 1.0,
  commissionRate: 0.2,
  promoCode: {
    discount_type: "fixed",
    discount_value: 50,
  },
});

expect(result).toEqual({
  totalFare: 200,
  platformCommission: 40, // 20% จากราคาเต็ม
  providerEarnings: 160, // Provider ได้เต็ม
  promoDiscountAmount: 50, // Platform จ่าย
  customerPaidAmount: 150, // ลูกค้าจ่าย
  platformRevenue: -10, // Platform ขาดทุน
});
```

### Test 3: ส่วนลดแบบ Percentage

```typescript
const result = calculateFareWithPromo({
  baseFare: 150,
  distanceFare: 30,
  timeFare: 20,
  surgeMultiplier: 1.0,
  commissionRate: 0.2,
  promoCode: {
    discount_type: "percentage",
    discount_value: 20,
    max_discount: 100,
  },
});

expect(result).toEqual({
  totalFare: 200,
  platformCommission: 40, // 20% จากราคาเต็ม
  providerEarnings: 160, // Provider ได้เต็ม
  promoDiscountAmount: 40, // 20% = 40 (ไม่เกิน 100)
  customerPaidAmount: 160, // ลูกค้าจ่าย
  platformRevenue: 0, // Platform Break-even
});
```

### Test 4: Surge Pricing + Promo

```typescript
const result = calculateFareWithPromo({
  baseFare: 100,
  distanceFare: 0,
  timeFare: 0,
  surgeMultiplier: 2.0, // Surge 2x
  commissionRate: 0.2,
  promoCode: {
    discount_type: "fixed",
    discount_value: 50,
  },
});

expect(result).toEqual({
  totalFare: 200, // 100 * 2.0
  platformCommission: 40, // 20% จากราคาเต็ม
  providerEarnings: 160, // Provider ได้เต็ม
  promoDiscountAmount: 50, // Platform จ่าย
  customerPaidAmount: 150, // ลูกค้าจ่าย
  platformRevenue: -10, // Platform ขาดทุน
});
```

---

## 📊 Impact on Promo ROI Calculation

การคำนวณ ROI ใน `usePromoImpact.ts` ต้องแก้ไข:

```typescript
// ✅ ถูก: Platform รับภาระส่วนลดทั้งหมด
const estimated_discount_cost = estimated_usage * discount_per_use;

// Platform ยังได้คอมมิชชั่นเต็ม
const commission_revenue = estimated_usage * avg_order_value * commission_rate;

// ต้นทุนสุทธิ
const net_cost = estimated_discount_cost - commission_revenue;

// ROI = (new_revenue - net_cost) / estimated_discount_cost
```

---

## ✅ Action Items

### 1. Database Migration (ถ้าจำเป็น)

```sql
-- เพิ่ม columns ที่จำเป็น
ALTER TABLE ride_requests
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0.20,
ADD COLUMN IF NOT EXISTS platform_commission NUMERIC,
ADD COLUMN IF NOT EXISTS customer_paid_amount NUMERIC,
ADD COLUMN IF NOT EXISTS platform_revenue NUMERIC;

-- Update existing records
UPDATE ride_requests
SET
  commission_rate = 0.20,
  platform_commission = total_fare * 0.20,
  customer_paid_amount = total_fare - COALESCE(promo_discount_amount, 0),
  platform_revenue = (total_fare * 0.20) - COALESCE(promo_discount_amount, 0)
WHERE platform_commission IS NULL;
```

### 2. Update Calculation Functions

- [ ] แก้ไข `usePricingCalculator.ts`
- [ ] แก้ไข `usePromoImpact.ts`
- [ ] แก้ไข `useRideRequest.ts`
- [ ] แก้ไข `useQueueBooking.ts`
- [ ] แก้ไข `useShopping.ts`

### 3. Update UI Components

- [ ] แก้ไข Customer fare display
- [ ] แก้ไข Provider earnings display
- [ ] แก้ไข Admin financial breakdown
- [ ] แก้ไข Receipt components

### 4. Update Documentation

- [ ] อัพเดท Business Model doc
- [ ] อัพเดท Promo Implementation doc
- [ ] สร้าง Financial Logic guide

---

## 🎯 Summary

**การหักที่ถูกต้อง:**

1. ✅ คำนวณคอมมิชชั่นจาก**ราคาเต็ม** (ก่อนหักส่วนลด)
2. ✅ Provider ได้รับเงิน**เต็มตามที่ควรได้** (ไม่เสียเปรียบ)
3. ✅ Platform รับภาระส่วนลด**ทั้งหมด** (Marketing Cost)
4. ✅ ลูกค้าจ่าย**ราคาหลังหักส่วนลด**

**ผลลัพธ์:**

- Customer: ได้ส่วนลดตามที่โฆษณา ✅
- Provider: ได้รับค่าบริการเต็ม ยุติธรรม ✅
- Platform: รับภาระส่วนลดเป็น Marketing Investment ✅

---

**Status**: 📝 Analysis Complete - Ready for Implementation  
**Next Step**: แก้ไข calculation functions และ UI components  
**Priority**: 🔥 HIGH - ต้องแก้ก่อน Production

---

_Last Updated: 2026-01-29_
