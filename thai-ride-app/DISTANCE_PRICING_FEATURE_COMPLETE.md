# 🎯 Distance-Based Pricing Feature - Complete

**Date**: 2026-01-25  
**Status**: ✅ Production Ready  
**Priority**: 🔥 CRITICAL - Core Business Feature

---

## 📋 Overview

ระบบตั้งค่าราคาบริการตามระยะทาง (Distance-based Pricing) ที่ให้ Admin สามารถกำหนด:

- **ค่าเริ่มต้น** (Base Fare) - ค่าบริการพื้นฐาน
- **ค่าต่อกิโลเมตร** (Per KM Rate) - ค่าบริการเพิ่มตามระยะทาง
- **ค่าบริการขั้นต่ำ** (Min Fare) - ราคาต่ำสุดที่เรียกเก็บได้
- **ค่าบริการสูงสุด** (Max Fare) - ราคาสูงสุดที่เรียกเก็บได้

---

## 🎨 Features Implemented

### 1. Database Schema

#### Financial Settings Table

```sql
-- Updated constraint to include 'pricing' category
ALTER TABLE financial_settings
ADD CONSTRAINT financial_settings_category_check
CHECK (category IN ('commission', 'withdrawal', 'topup', 'surge', 'subscription', 'pricing'));
```

#### Pricing Configuration

```json
{
  "ride": {
    "base_fare": 35,
    "per_km": 8,
    "min_fare": 35,
    "max_fare": 1000
  },
  "delivery": {
    "base_fare": 30,
    "per_km": 10,
    "min_fare": 30,
    "max_fare": 500
  },
  "shopping": {
    "base_fare": 40,
    "per_km": 12,
    "min_fare": 40,
    "max_fare": 800
  },
  "moving": {
    "base_fare": 200,
    "per_km": 25,
    "min_fare": 200,
    "max_fare": 5000
  },
  "queue": {
    "base_fare": 50,
    "per_km": 0,
    "min_fare": 50,
    "max_fare": 500
  },
  "laundry": {
    "base_fare": 60,
    "per_km": 5,
    "min_fare": 60,
    "max_fare": 300
  }
}
```

#### Calculation Function

```sql
CREATE OR REPLACE FUNCTION calculate_distance_fare(
  p_service_type TEXT,
  p_distance_km DECIMAL
)
RETURNS TABLE (
  base_fare DECIMAL,
  distance_fare DECIMAL,
  total_fare DECIMAL,
  per_km_rate DECIMAL,
  distance_km DECIMAL,
  min_fare DECIMAL,
  max_fare DECIMAL,
  final_fare DECIMAL
)
```

**Formula:**

```
total_fare = base_fare + (distance_km × per_km)
final_fare = MAX(min_fare, MIN(max_fare, total_fare))
```

---

### 2. TypeScript Types

**File**: `src/types/financial-settings.ts`

```typescript
export interface ServicePricing {
  base_fare: number;
  per_km: number;
  min_fare: number;
  max_fare: number;
}

export interface DistanceRates {
  ride: ServicePricing;
  delivery: ServicePricing;
  shopping: ServicePricing;
  moving: ServicePricing;
  queue: ServicePricing;
  laundry: ServicePricing;
}

export interface FareCalculation {
  base_fare: number;
  distance_fare: number;
  total_fare: number;
  per_km_rate: number;
  distance_km: number;
  min_fare: number;
  max_fare: number;
  final_fare: number;
}
```

---

### 3. Admin UI Component

**File**: `src/admin/components/PricingSettingsCard.vue`

#### Features:

- ✅ **Interactive Distance Slider** - ตัวอย่างการคำนวณแบบ real-time
- ✅ **Service Cards** - แสดงการตั้งค่าแต่ละบริการ
- ✅ **4 Input Fields per Service**:
  - ค่าเริ่มต้น (Base Fare)
  - ค่าต่อกิโลเมตร (Per KM)
  - ค่าบริการขั้นต่ำ (Min Fare)
  - ค่าบริการสูงสุด (Max Fare)
- ✅ **Live Preview** - แสดงตัวอย่างราคาตามระยะทางที่เลือก
- ✅ **Formula Display** - แสดงสูตรคำนวณ
- ✅ **Change Tracking** - ไฮไลท์ค่าที่เปลี่ยนแปลง
- ✅ **Individual Save** - บันทึกแต่ละบริการแยกกัน
- ✅ **Change Reason Modal** - บันทึกเหตุผลการเปลี่ยนแปลง

#### UI/UX:

- 🎨 **Gradient Header** - สีม่วงไล่เฉดสวยงาม
- 🎨 **Icon-based Design** - ไอคอนแต่ละบริการชัดเจน
- 🎨 **Responsive Grid** - ปรับตามขนาดหน้าจอ
- 🎨 **Visual Feedback** - แสดงสถานะการเปลี่ยนแปลง

---

### 4. Composables

#### useFinancialSettings

**File**: `src/admin/composables/useFinancialSettings.ts`

```typescript
// New methods added:
const { distanceRates, updateDistanceRates } = useFinancialSettings();

// Fetch pricing settings
await fetchSettings("pricing");

// Update pricing
await updateDistanceRates(newRates, "เหตุผลการเปลี่ยนแปลง");
```

#### usePricingCalculator

**File**: `src/composables/usePricingCalculator.ts`

```typescript
const { calculateFare, calculateFareBreakdown } = usePricingCalculator();

// Calculate fare from database
const result = await calculateFare("ride", 5.0);

// Calculate fare locally
const breakdown = calculateFareBreakdown(35, 8, 5, 35, 1000);
```

---

### 5. Integration

**File**: `src/admin/views/AdminFinancialSettingsView.vue`

- ✅ เพิ่ม PricingSettingsCard เป็นส่วนแรก
- ✅ อัพเดท totalCount เป็น 4 รายการ
- ✅ เพิ่ม category label สำหรับ 'pricing'

---

## 📊 Example Calculations

### Ride Service (5 km)

```
Base Fare: 35 ฿
Per KM: 8 ฿/km
Distance: 5 km

Calculation:
distance_fare = 5 × 8 = 40 ฿
total_fare = 35 + 40 = 75 ฿
final_fare = MAX(35, MIN(1000, 75)) = 75 ฿
```

### Delivery Service (15 km)

```
Base Fare: 30 ฿
Per KM: 10 ฿/km
Distance: 15 km

Calculation:
distance_fare = 15 × 10 = 150 ฿
total_fare = 30 + 150 = 180 ฿
final_fare = MAX(30, MIN(500, 180)) = 180 ฿
```

### Moving Service (100 km)

```
Base Fare: 200 ฿
Per KM: 25 ฿/km
Distance: 100 km

Calculation:
distance_fare = 100 × 25 = 2,500 ฿
total_fare = 200 + 2,500 = 2,700 ฿
final_fare = MAX(200, MIN(5000, 2700)) = 2,700 ฿
```

---

## 🔒 Security & Validation

### Database Level

- ✅ RLS policies applied
- ✅ Admin-only access
- ✅ Audit logging enabled
- ✅ Change reason required

### Application Level

- ✅ Input validation (min/max values)
- ✅ Type safety (TypeScript)
- ✅ Error handling
- ✅ Loading states

---

## 🎯 Business Rules

### Pricing Constraints

1. **Base Fare**: ต้องมากกว่า 0
2. **Per KM**: ต้องมากกว่าหรือเท่ากับ 0
3. **Min Fare**: ต้องน้อยกว่าหรือเท่ากับ Max Fare
4. **Max Fare**: ต้องมากกว่า Min Fare

### Service-Specific Defaults

| Service  | Base | Per KM | Min | Max   | Use Case               |
| -------- | ---- | ------ | --- | ----- | ---------------------- |
| Ride     | 35   | 8      | 35  | 1,000 | รถเรียก ระยะใกล้-กลาง  |
| Delivery | 30   | 10     | 30  | 500   | จัดส่งพัสดุ ระยะใกล้   |
| Shopping | 40   | 12     | 40  | 800   | ช้อปปิ้ง + จัดส่ง      |
| Moving   | 200  | 25     | 200 | 5,000 | ขนย้าย ระยะไกล         |
| Queue    | 50   | 0      | 50  | 500   | จองคิว ไม่คิดระยะทาง   |
| Laundry  | 60   | 5      | 60  | 300   | รับ-ส่งซักรีด ระยะใกล้ |

---

## 🚀 Usage Guide

### For Admin

1. **เข้าหน้า Financial Settings**

   ```
   http://localhost:5173/admin/settings/financial
   ```

2. **ปรับระยะทางตัวอย่าง**
   - ใช้ slider เลือกระยะทาง 1-50 กม.
   - ดูราคาตัวอย่างแต่ละบริการ

3. **แก้ไขราคา**
   - กรอกค่าเริ่มต้น
   - กรอกค่าต่อกิโลเมตร
   - กรอกค่าขั้นต่ำ/สูงสุด
   - ดูสูตรคำนวณ

4. **บันทึกการเปลี่ยนแปลง**
   - คลิก "บันทึก"
   - ระบุเหตุผล
   - ยืนยัน

### For Developers

#### Calculate Fare in Code

```typescript
import { usePricingCalculator } from "@/composables/usePricingCalculator";

const { calculateFare } = usePricingCalculator();

// Get fare from database
const result = await calculateFare("ride", 5.0);
console.log(result.final_fare); // 75
```

#### Use in Booking Flow

```typescript
// 1. Get distance from map
const distance = calculateDistance(pickup, dropoff);

// 2. Calculate fare
const fareResult = await calculateFare(serviceType, distance);

// 3. Show to customer
displayFare(fareResult.final_fare);

// 4. Deduct from wallet
await deductCustomerWallet(fareResult.final_fare, "ride_booking", rideId);
```

---

## 📈 Future Enhancements

### Phase 2 (Planned)

- [ ] **Time-based Pricing** - ราคาตามช่วงเวลา (เช้า/เย็น/กลางคืน)
- [ ] **Zone-based Pricing** - ราคาตามพื้นที่ (ในเมือง/นอกเมือง)
- [ ] **Dynamic Pricing** - ปรับราคาตามอุปสงค์-อุปทาน
- [ ] **Bulk Discount** - ส่วนลดสำหรับระยะทางไกล
- [ ] **Promotional Pricing** - ราคาพิเศษช่วงโปรโมชั่น

### Phase 3 (Future)

- [ ] **AI-based Pricing** - ใช้ ML คาดการณ์ราคาที่เหมาะสม
- [ ] **Competitor Analysis** - เปรียบเทียบราคากับคู่แข่ง
- [ ] **Price Optimization** - หาราคาที่ maximize revenue
- [ ] **A/B Testing** - ทดสอบราคาแบบต่างๆ

---

## 🧪 Testing

### Manual Testing

```bash
# 1. Start dev server
npm run dev

# 2. Login as admin
# Email: superadmin@gobear.app

# 3. Navigate to Financial Settings
# http://localhost:5173/admin/settings/financial

# 4. Test pricing changes
# - Adjust slider
# - Change values
# - Save changes
# - Verify in database
```

### Database Testing

```sql
-- Test calculation function
SELECT * FROM calculate_distance_fare('ride', 5.0);
SELECT * FROM calculate_distance_fare('delivery', 10.0);
SELECT * FROM calculate_distance_fare('moving', 50.0);

-- Verify settings
SELECT * FROM financial_settings WHERE category = 'pricing';

-- Check audit log
SELECT * FROM settings_audit_log WHERE category = 'pricing' ORDER BY created_at DESC LIMIT 10;
```

---

## 📝 Files Created/Modified

### Created

1. ✅ `src/admin/components/PricingSettingsCard.vue` - UI Component
2. ✅ `src/composables/usePricingCalculator.ts` - Calculation Logic
3. ✅ `DISTANCE_PRICING_FEATURE_COMPLETE.md` - This Document

### Modified

1. ✅ `src/types/financial-settings.ts` - Added Types
2. ✅ `src/admin/composables/useFinancialSettings.ts` - Added Methods
3. ✅ `src/admin/views/AdminFinancialSettingsView.vue` - Integrated Component

### Database

1. ✅ Updated `financial_settings` constraint
2. ✅ Created `calculate_distance_fare` function
3. ✅ Inserted default pricing configuration

---

## ✅ Checklist

### Implementation

- [x] Database schema updated
- [x] Calculation function created
- [x] Default pricing configured
- [x] TypeScript types defined
- [x] Admin UI component created
- [x] Composables implemented
- [x] Integration complete
- [x] No TypeScript errors
- [x] No linting errors

### Testing

- [x] Function tested in database
- [x] UI renders correctly
- [x] Calculations accurate
- [x] Save functionality works
- [x] Audit logging works

### Documentation

- [x] Feature documented
- [x] Usage guide written
- [x] Examples provided
- [x] Future enhancements listed

---

## 🎉 Summary

ระบบตั้งค่าราคาบริการตามระยะทางพร้อมใช้งานแล้ว! Admin สามารถ:

1. ✅ **ตั้งค่าราคา** - กำหนดค่าเริ่มต้นและค่าต่อกิโลเมตร
2. ✅ **ดูตัวอย่าง** - คำนวณราคาแบบ real-time
3. ✅ **บันทึกการเปลี่ยนแปลง** - พร้อม audit log
4. ✅ **ใช้งานทันที** - Provider เห็นราคาใหม่ทันที

**ระบบนี้เป็นพื้นฐานสำคัญของ Business Model** ที่ทำให้สามารถ:

- คำนวณค่าบริการอัตโนมัติ
- ปรับราคาตามสภาวะตลาด
- รักษาความยุติธรรมให้ทั้ง Customer และ Provider
- สร้างรายได้ที่คาดการณ์ได้

---

**Created**: 2026-01-25  
**Status**: ✅ Production Ready  
**Next**: Deploy to production and monitor usage
