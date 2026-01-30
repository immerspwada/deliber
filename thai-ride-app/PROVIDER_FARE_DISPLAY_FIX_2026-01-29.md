# 🔧 Provider Fare Display Fix

**Date**: 2026-01-29  
**Issue**: Provider เห็นราคาเต็ม (total_fare) แทนที่จะเห็นรายได้ที่ตัวเองจะได้รับ (provider_earnings)  
**Status**: 🔄 In Progress

---

## 🎯 Problem Analysis

### Current Behavior (❌ Wrong)

Provider Job Views แสดง `job.fare` ซึ่งคือ:

- `final_fare` หรือ `estimated_fare` (ราคาเต็ม)
- **ไม่ได้หักคอมมิชชั่น**
- **ไม่ได้แสดงรายได้จริงที่ Provider จะได้รับ**

### Expected Behavior (✅ Correct)

ตามกฎธุรกิจใน `promo-financial-rules.md`:

**Provider ควรเห็น**:

```
รายได้ที่คุณจะได้รับ: ฿160
(จากราคาเต็ม ฿200 - คอมมิชชั่น 20% = ฿40)
```

**ไม่ใช่**:

```
รายได้ที่คุณจะได้รับ: ฿200  ❌ (นี่คือราคาเต็ม)
```

---

## 📊 Business Logic

### Correct Calculation

```typescript
// ✅ CORRECT
const totalFare = 200; // ราคาเต็ม
const commissionRate = 0.2; // 20%
const platformCommission = totalFare * commissionRate; // 40
const providerEarnings = totalFare - platformCommission; // 160 ✅

// Provider ควรเห็น: ฿160
```

### Current Implementation (Wrong)

```typescript
// ❌ WRONG
const fare = rideData.final_fare || rideData.estimated_fare; // 200

// Provider เห็น: ฿200 (ราคาเต็ม ไม่ใช่รายได้จริง)
```

---

## 🔧 Solution

### Option 1: Use `provider_earnings` from Database (Recommended)

**Database Schema** (from `999_add_promo_financial_columns.sql`):

```sql
ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS
  provider_earnings NUMERIC; -- ✅ This is what provider should see
```

**Update `useProviderJobDetail.ts`**:

```typescript
// Load provider_earnings from database
const { data: rideData } = await supabase.from("ride_requests").select(`
    id, status, estimated_fare, final_fare,
    provider_earnings, -- ✅ Add this
    platform_commission,
    commission_rate,
    ...
  `);
```

**Transform to JobDetail**:

```typescript
jobDetail = {
  ...
  fare: rideData.provider_earnings || calculateProviderEarnings(rideData),
  total_fare: rideData.final_fare || rideData.estimated_fare,
  platform_commission: rideData.platform_commission,
  ...
}
```

### Option 2: Calculate on Frontend (Fallback)

If `provider_earnings` is not available in database:

```typescript
function calculateProviderEarnings(rideData: any): number {
  const totalFare = rideData.final_fare || rideData.estimated_fare || 0;
  const commissionRate = rideData.commission_rate || 0.2;
  const platformCommission = Math.round(totalFare * commissionRate);
  return totalFare - platformCommission;
}
```

---

## 📝 Files to Update

### 1. `src/composables/useProviderJobDetail.ts`

**Changes**:

- Add `provider_earnings` to SELECT query
- Calculate if not available
- Update `JobDetail` type to include both `fare` (earnings) and `total_fare`

### 2. `src/types/ride-requests.ts`

**Add to JobDetail interface**:

```typescript
export interface JobDetail {
  // ... existing fields
  fare: number; // ✅ Provider earnings (what they actually get)
  total_fare?: number; // Total fare (for reference)
  platform_commission?: number;
  commission_rate?: number;
  promo_discount_amount?: number;
}
```

### 3. Provider Job Views (Optional Enhancement)

**Show breakdown** (optional):

```vue
<section class="fare-card">
  <span class="fare-label">รายได้ที่คุณจะได้รับ</span>
  <div class="fare-amount">฿{{ job.fare.toLocaleString() }}</div>
  
  <!-- Optional: Show breakdown -->
  <div v-if="job.total_fare && job.platform_commission" class="fare-breakdown">
    <div class="breakdown-item">
      <span>ค่าโดยสาร</span>
      <span>฿{{ job.total_fare.toLocaleString() }}</span>
    </div>
    <div class="breakdown-item">
      <span>คอมมิชชั่น Platform</span>
      <span class="text-red-600">-฿{{ job.platform_commission.toLocaleString() }}</span>
    </div>
  </div>
</section>
```

---

## ✅ Verification Steps

### 1. Check Database Schema

```sql
-- Verify columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ride_requests'
AND column_name IN (
  'provider_earnings',
  'platform_commission',
  'commission_rate',
  'promo_discount_amount'
);
```

### 2. Test with Sample Order

**Test Case**: Order RID-MKYWLEEK (or any order)

```sql
-- Check values
SELECT
  id,
  total_fare,
  commission_rate,
  platform_commission,
  provider_earnings,
  promo_discount_amount,
  customer_paid_amount
FROM ride_requests
WHERE tracking_id = 'RID-MKYWLEEK';
```

**Expected**:

```
total_fare: 200
commission_rate: 0.20
platform_commission: 40
provider_earnings: 160  ✅ This is what provider should see
promo_discount_amount: 50
customer_paid_amount: 150
```

### 3. Verify UI Display

**Provider should see**:

```
รายได้ที่คุณจะได้รับ: ฿160
```

**NOT**:

```
รายได้ที่คุณจะได้รับ: ฿200  ❌
```

---

## 🎯 Impact Analysis

### Before Fix (❌)

```
Provider เห็น: ฿200 (ราคาเต็ม)
Provider คิดว่าจะได้: ฿200
Provider ได้จริง: ฿160
ความรู้สึก: 😡 โกง! ทำไมได้น้อยกว่าที่เห็น
```

### After Fix (✅)

```
Provider เห็น: ฿160 (รายได้จริง)
Provider คิดว่าจะได้: ฿160
Provider ได้จริง: ฿160
ความรู้สึก: 😊 ตรงตามที่คาดหวัง
```

---

## 📋 Implementation Checklist

- [ ] Check if `provider_earnings` column exists in database
- [ ] Update `useProviderJobDetail.ts` to load `provider_earnings`
- [ ] Add fallback calculation if column doesn't exist
- [ ] Update `JobDetail` type definition
- [ ] Test with real order data
- [ ] Verify UI displays correct amount
- [ ] Test with promo code orders
- [ ] Test with different commission rates
- [ ] Document the change

---

## 🚀 Next Steps

1. **Check Database Schema** - Verify `provider_earnings` column exists
2. **Update Composable** - Load correct data from database
3. **Test with Sample Order** - Use RID-MKYWLEEK or create test order
4. **Verify Display** - Ensure Provider sees correct earnings
5. **Deploy** - Push to production

---

**Priority**: 🔥 HIGH - Provider trust issue  
**Complexity**: 🟢 LOW - Simple data mapping fix  
**Risk**: 🟢 LOW - Only affects display, not calculation
