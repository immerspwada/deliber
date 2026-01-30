# 💰 Promo & Financial Calculation Rules

**Date**: 2026-01-29  
**Status**: ✅ Active  
**Priority**: 🔥 CRITICAL - Must Follow Always

---

## 🎯 Core Principle

**"Platform bears the discount cost as Marketing Investment"**

ระบบโปรโมชั่นต้องยุติธรรมกับทุกฝ่าย:

- **Customer**: ได้ส่วนลดตามที่โฆษณา
- **Provider**: ได้รับค่าบริการเต็มตามที่ควรได้
- **Platform**: รับภาระส่วนลดเป็น Marketing Investment

---

## 🚨 CRITICAL RULES (ห้ามฝ่าฝืน)

### Rule 1: Commission from Full Fare

**กฎ**: คอมมิชชั่นต้องคำนวณจาก**ราคาเต็ม** (ก่อนหักส่วนลด)

```typescript
// ✅ CORRECT
const platformCommission = totalFare * commissionRate;

// ❌ WRONG - Never calculate from discounted price
const platformCommission = (totalFare - discount) * commissionRate;
```

**เหตุผล**: Provider ต้องได้รับเงินเต็มตามที่ควรได้ ไม่ว่าจะมีโปรโมชั่นหรือไม่

---

### Rule 2: Provider Gets Full Earnings

**กฎ**: Provider ต้องได้รับเงิน**เต็มตามที่ควรได้** (ไม่เสียเปรียบจากโปรโมชั่น)

```typescript
// ✅ CORRECT - Provider earnings from full fare
const providerEarnings = totalFare - platformCommission;

// ❌ WRONG - Provider should not bear discount cost
const providerEarnings = totalFare - discount - platformCommission;
```

**เหตุผล**: Provider ให้บริการเต็มที่ ต้องได้รับค่าตอบแทนเต็มที่

---

### Rule 3: Platform Bears Discount

**กฎ**: Platform ต้องรับภาระส่วนลด**ทั้งหมด** (Marketing Investment)

```typescript
// ✅ CORRECT - Platform bears full discount
const platformRevenue = platformCommission - promoDiscountAmount;

// ❌ WRONG - Discount should not affect provider
const platformRevenue = platformCommission;
const providerEarnings = totalFare - platformCommission - promoDiscountAmount;
```

**เหตุผล**: โปรโมชั่นเป็นกลยุทธ์ Marketing ของ Platform ไม่ใช่ของ Provider

---

### Rule 4: Customer Pays Discounted Price

**กฎ**: Customer จ่าย**ราคาหลังหักส่วนลด**

```typescript
// ✅ CORRECT
const customerPaidAmount = totalFare - promoDiscountAmount;

// ❌ WRONG - Customer must get the advertised discount
const customerPaidAmount = totalFare;
```

**เหตุผล**: Customer ต้องได้รับส่วนลดตามที่โฆษณาไว้

---

## 💾 Database Schema Requirements

### Required Columns for All Service Tables

```sql
-- ✅ MUST HAVE these columns
ALTER TABLE {service_table} ADD COLUMN IF NOT EXISTS
  -- Full fare (before discount)
  total_fare NUMERIC NOT NULL,

  -- Commission (from full fare)
  commission_rate NUMERIC DEFAULT 0.20,
  platform_commission NUMERIC NOT NULL,

  -- Provider earnings (from full fare)
  provider_earnings NUMERIC NOT NULL,

  -- Promo discount (Platform bears this)
  promo_code_id UUID REFERENCES promo_codes(id),
  promo_code TEXT,
  promo_discount_amount NUMERIC DEFAULT 0,

  -- Customer payment (after discount)
  customer_paid_amount NUMERIC NOT NULL,

  -- Platform P&L
  platform_revenue NUMERIC NOT NULL;
```

**Tables that MUST have these columns:**

- `ride_requests`
- `queue_bookings`
- `shopping_requests`
- `delivery_requests`
- `moving_requests`
- `laundry_requests`

---

## 🔧 Calculation Formula (Standard)

### Step-by-Step Calculation

```typescript
/**
 * Standard fare calculation with promo
 *
 * @param baseFare - Base fare
 * @param distanceFare - Distance-based fare
 * @param timeFare - Time-based fare
 * @param surgeMultiplier - Surge pricing multiplier
 * @param commissionRate - Platform commission rate (e.g., 0.20 = 20%)
 * @param promoCode - Promo code object (optional)
 */
function calculateFareWithPromo(input: FareInput): FareCalculation {
  // Step 1: Calculate full fare
  const subtotal = input.baseFare + input.distanceFare + input.timeFare;
  const totalFare = Math.round(subtotal * input.surgeMultiplier);

  // Step 2: Calculate commission (from FULL FARE) ✅
  const platformCommission = Math.round(totalFare * input.commissionRate);

  // Step 3: Calculate provider earnings (from FULL FARE) ✅
  const providerEarnings = totalFare - platformCommission;

  // Step 4: Calculate promo discount
  let promoDiscountAmount = 0;
  if (input.promoCode && input.promoCode.is_active) {
    if (input.promoCode.discount_type === "fixed") {
      promoDiscountAmount = input.promoCode.discount_value;
    } else if (input.promoCode.discount_type === "percentage") {
      const percentage = input.promoCode.discount_value / 100;
      promoDiscountAmount = Math.round(totalFare * percentage);

      // Apply max discount cap
      if (input.promoCode.max_discount) {
        promoDiscountAmount = Math.min(
          promoDiscountAmount,
          input.promoCode.max_discount,
        );
      }
    }

    // Discount cannot exceed total fare
    promoDiscountAmount = Math.min(promoDiscountAmount, totalFare);
  }

  // Step 5: Calculate customer payment (after discount) ✅
  const customerPaidAmount = totalFare - promoDiscountAmount;

  // Step 6: Calculate platform net revenue ✅
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

## 📊 Money Flow Verification

### Example: 200 THB Ride with 50 THB Promo

```
Input:
  Total Fare: 200 บาท
  Commission Rate: 20%
  Promo Discount: 50 บาท

Calculation:
  1. Platform Commission = 200 * 0.20 = 40 บาท ✅ (from full fare)
  2. Provider Earnings = 200 - 40 = 160 บาท ✅ (full earnings)
  3. Customer Pays = 200 - 50 = 150 บาท ✅ (after discount)
  4. Platform Revenue = 40 - 50 = -10 บาท ✅ (bears discount)

Verification:
  ✅ Customer pays: 150 บาท (saved 50 บาท)
  ✅ Provider gets: 160 บาท (80% of full fare)
  ✅ Platform gets: 40 บาท (commission)
  ✅ Platform pays: 50 บาท (discount)
  ✅ Platform net: -10 บาท (Marketing Investment)

  Total: 150 (customer) + 160 (provider) = 310 บาท
  Platform: 40 (commission) - 50 (discount) = -10 บาท
  Balance: 150 + 160 - 10 = 300 บาท ✅ (matches 200 + 40 + 160 - 200)
```

---

## 🎨 UI Display Requirements

### Customer View (ลูกค้า)

```vue
<template>
  <div class="fare-breakdown">
    <!-- Show full fare -->
    <div class="line-item">
      <span>ค่าโดยสาร</span>
      <span>฿{{ totalFare }}</span>
    </div>

    <!-- Show discount (if any) -->
    <div v-if="promoDiscountAmount > 0" class="line-item discount">
      <span>ส่วนลด ({{ promoCode }})</span>
      <span class="text-green-600">-฿{{ promoDiscountAmount }}</span>
    </div>

    <!-- Show final amount -->
    <div class="line-item total">
      <span class="font-bold">ยอดที่ต้องจ่าย</span>
      <span class="font-bold">฿{{ customerPaidAmount }}</span>
    </div>
  </div>
</template>
```

**Rules:**

- ✅ แสดงราคาเต็มก่อน
- ✅ แสดงส่วนลดชัดเจน (ถ้ามี)
- ✅ แสดงยอดที่ต้องจ่ายหลังหักส่วนลด

---

### Provider View (ไรเดอร์)

```vue
<template>
  <div class="earnings-breakdown">
    <!-- Show full fare -->
    <div class="line-item">
      <span>ค่าโดยสาร</span>
      <span>฿{{ totalFare }}</span>
    </div>

    <!-- Show commission -->
    <div class="line-item">
      <span>คอมมิชชั่น Platform ({{ commissionRate * 100 }}%)</span>
      <span class="text-red-600">-฿{{ platformCommission }}</span>
    </div>

    <!-- Show provider earnings -->
    <div class="line-item total">
      <span class="font-bold">คุณได้รับ</span>
      <span class="font-bold text-green-600">฿{{ providerEarnings }}</span>
    </div>

    <!-- Info: Platform bears discount -->
    <div v-if="promoDiscountAmount > 0" class="info-note">
      <span class="text-sm text-gray-600">
        ℹ️ ส่วนลด {{ promoDiscountAmount }} บาท (Platform รับภาระ)
      </span>
    </div>
  </div>
</template>
```

**Rules:**

- ✅ แสดงรายได้เต็มของ Provider
- ✅ แสดงคอมมิชชั่นที่หัก
- ✅ แสดงข้อมูลว่า Platform รับภาระส่วนลด (ไม่ใช่ Provider)

---

### Admin View (แอดมิน)

```vue
<template>
  <div class="admin-financial-breakdown">
    <!-- Customer Section -->
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

    <!-- Provider Section -->
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

    <!-- Platform P&L Section -->
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

**Rules:**

- ✅ แสดงข้อมูลครบทั้ง 3 ฝ่าย
- ✅ แสดง Platform P&L ชัดเจน
- ✅ แสดงว่า Platform รับภาระส่วนลด

---

## 🧪 Testing Requirements

### Unit Tests (Required)

```typescript
describe("calculateFareWithPromo", () => {
  it("should calculate commission from full fare", () => {
    const result = calculateFareWithPromo({
      baseFare: 150,
      distanceFare: 30,
      timeFare: 20,
      surgeMultiplier: 1.0,
      commissionRate: 0.2,
      promoCode: {
        discount_type: "fixed",
        discount_value: 50,
        is_active: true,
      },
    });

    // ✅ Commission from full fare (200 * 0.2 = 40)
    expect(result.platformCommission).toBe(40);

    // ✅ Provider gets full earnings (200 - 40 = 160)
    expect(result.providerEarnings).toBe(160);

    // ✅ Customer pays after discount (200 - 50 = 150)
    expect(result.customerPaidAmount).toBe(150);

    // ✅ Platform bears discount (40 - 50 = -10)
    expect(result.platformRevenue).toBe(-10);
  });

  it("should handle percentage discount with max cap", () => {
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
        is_active: true,
      },
    });

    // ✅ Discount is 20% of 200 = 40 (within max 100)
    expect(result.promoDiscountAmount).toBe(40);

    // ✅ Commission still from full fare
    expect(result.platformCommission).toBe(40);

    // ✅ Provider still gets full earnings
    expect(result.providerEarnings).toBe(160);
  });

  it("should not allow discount to exceed total fare", () => {
    const result = calculateFareWithPromo({
      baseFare: 100,
      distanceFare: 0,
      timeFare: 0,
      surgeMultiplier: 1.0,
      commissionRate: 0.2,
      promoCode: {
        discount_type: "fixed",
        discount_value: 150, // More than total fare
        is_active: true,
      },
    });

    // ✅ Discount capped at total fare
    expect(result.promoDiscountAmount).toBe(100);

    // ✅ Customer pays 0 (minimum)
    expect(result.customerPaidAmount).toBe(0);
  });
});
```

---

## 🚫 Common Mistakes (Anti-Patterns)

### ❌ Mistake 1: Commission from Discounted Price

```typescript
// ❌ WRONG - Never do this!
const afterDiscount = totalFare - promoDiscount;
const platformCommission = afterDiscount * commissionRate;
const providerEarnings = afterDiscount - platformCommission;

// Problem: Provider loses money when there's a promo
```

**Why Wrong**: Provider ให้บริการเต็มที่ แต่ได้เงินน้อยลง ไม่ยุติธรรม

---

### ❌ Mistake 2: Provider Bears Discount

```typescript
// ❌ WRONG - Never do this!
const platformCommission = totalFare * commissionRate;
const providerEarnings = totalFare - platformCommission - promoDiscount;
const customerPays = totalFare - promoDiscount;

// Problem: Provider bears the discount cost
```

**Why Wrong**: โปรโมชั่นเป็นกลยุทธ์ของ Platform ไม่ใช่ของ Provider

---

### ❌ Mistake 3: Customer Doesn't Get Discount

```typescript
// ❌ WRONG - Never do this!
const customerPays = totalFare;
const platformRevenue = platformCommission - promoDiscount;

// Problem: Customer doesn't get the advertised discount
```

**Why Wrong**: ผิดสัญญากับลูกค้า ทำให้เสียความน่าเชื่อถือ

---

## 📋 Pre-Deployment Checklist

Before deploying any promo-related changes:

- [ ] Commission calculated from **full fare** (before discount)
- [ ] Provider earnings from **full fare** (not affected by promo)
- [ ] Platform bears **full discount cost**
- [ ] Customer pays **discounted price**
- [ ] Database schema has all required columns
- [ ] UI displays correct information for all roles
- [ ] Unit tests pass (commission, earnings, discount)
- [ ] Integration tests pass (end-to-end flow)
- [ ] Manual testing completed
- [ ] Documentation updated

---

## 🎯 Verification Steps

### Step 1: Code Review

```bash
# Check calculation logic
grep -r "platformCommission.*totalFare" src/
grep -r "providerEarnings.*totalFare" src/
grep -r "customerPaidAmount.*promoDiscount" src/
```

### Step 2: Database Verification

```sql
-- Check schema
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN (
  'ride_requests',
  'queue_bookings',
  'shopping_requests'
)
AND column_name IN (
  'platform_commission',
  'provider_earnings',
  'customer_paid_amount',
  'platform_revenue',
  'promo_discount_amount'
);

-- Verify calculation
SELECT
  id,
  total_fare,
  platform_commission,
  provider_earnings,
  promo_discount_amount,
  customer_paid_amount,
  platform_revenue,
  -- Verify: commission from full fare
  (platform_commission = total_fare * commission_rate) as commission_correct,
  -- Verify: provider earnings from full fare
  (provider_earnings = total_fare - platform_commission) as earnings_correct,
  -- Verify: customer pays after discount
  (customer_paid_amount = total_fare - promo_discount_amount) as payment_correct,
  -- Verify: platform bears discount
  (platform_revenue = platform_commission - promo_discount_amount) as revenue_correct
FROM ride_requests
WHERE promo_discount_amount > 0
LIMIT 10;
```

### Step 3: UI Verification

1. **Customer View**: ตรวจสอบว่าแสดงส่วนลดชัดเจน
2. **Provider View**: ตรวจสอบว่าแสดงรายได้เต็ม
3. **Admin View**: ตรวจสอบว่าแสดง Platform P&L ถูกต้อง

---

## 📚 References

- `PROMO_FINANCIAL_LOGIC_ANALYSIS_2026-01-29.md` - Detailed analysis
- `PROMO_SYSTEM_VERIFICATION_REPORT_2026-01-29.md` - Verification report
- `src/utils/fareCalculation.ts` - Implementation
- `supabase/migrations/999_add_promo_financial_columns.sql` - Database schema

---

## 🔄 Update History

| Date       | Change           | Reason                          |
| ---------- | ---------------- | ------------------------------- |
| 2026-01-29 | Initial creation | Establish promo financial rules |

---

**Status**: ✅ Active - Must Follow  
**Enforcement**: 🔥 CRITICAL - Zero Tolerance  
**Review**: Monthly or when business model changes

---

_"ยุติธรรมกับทุกฝ่าย - Customer, Provider, และ Platform"_
