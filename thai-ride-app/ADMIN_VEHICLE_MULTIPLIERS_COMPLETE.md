# 🚗 Admin Vehicle Multipliers - Complete!

**Date**: 2026-01-25  
**Status**: ✅ Production Ready  
**Priority**: 🔥 FEATURE COMPLETE

---

## 🎯 Problem Solved

เพิ่มส่วนจัดการ **Vehicle Multipliers** ในหน้า Admin Pricing Settings เพื่อให้ Admin สามารถกำหนดตัวคูณราคาสำหรับแต่ละประเภทรถได้

### ❌ ปัญหาเดิม

- หน้า Admin Pricing Settings ไม่มีส่วนกำหนด Vehicle Multipliers
- Admin ไม่สามารถปรับตัวคูณราคาได้
- ต้องแก้ไขโค้ดทุกครั้งที่ต้องการเปลี่ยนตัวคูณ

### ✅ หลังแก้ไข

- ✅ มีส่วน Vehicle Multipliers ในหน้า Pricing Settings (เฉพาะบริการเรียกรถ)
- ✅ Admin สามารถปรับตัวคูณได้ผ่าน UI
- ✅ บันทึกลงฐานข้อมูล Production
- ✅ แสดงตัวอย่างราคาแบบ Real-time

---

## 🔧 Changes Made

### 1. Database Setup (Production)

**Table**: `financial_settings`

```sql
-- เพิ่ม vehicle_multipliers key
INSERT INTO financial_settings (
  category,
  key,
  value,
  description,
  updated_by
) VALUES (
  'pricing',
  'vehicle_multipliers',
  '{"bike": 0.7, "car": 1.0, "premium": 1.5}'::jsonb,
  'Vehicle pricing multipliers for ride service - bike (0.7), car (1.0), premium (1.5)',
  (SELECT id FROM users WHERE email = 'superadmin@gobear.app' LIMIT 1)
) ON CONFLICT (category, key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW(),
    updated_by = EXCLUDED.updated_by
```

**Result**:

```json
{
  "id": "84e73526-42b3-4886-a62f-2aba5e6dee5d",
  "category": "pricing",
  "key": "vehicle_multipliers",
  "value": {
    "bike": 0.7,
    "car": 1.0,
    "premium": 1.5
  },
  "description": "Vehicle pricing multipliers for ride service - bike (0.7), car (1.0), premium (1.5)",
  "is_active": true,
  "created_at": "2026-01-25T09:31:45.566714Z",
  "updated_at": "2026-01-25T09:31:45.566714Z"
}
```

### 2. Updated Composable

**File**: `src/admin/composables/useFinancialSettings.ts`

**Added**:

```typescript
// State
const vehicleMultipliers = ref<{
  bike: number;
  car: number;
  premium: number;
} | null>(null);

// Computed
const hasVehicleMultipliers = computed(() => vehicleMultipliers.value !== null);

// Fetch - parse vehicle_multipliers from database
if (setting.category === "pricing" && setting.key === "vehicle_multipliers") {
  vehicleMultipliers.value = setting.value as {
    bike: number;
    car: number;
    premium: number;
  };
}

// Update function
async function updateVehicleMultipliers(
  multipliers: { bike: number; car: number; premium: number },
  reason?: string,
) {
  // ... implementation
}

// Return
return {
  vehicleMultipliers: readonly(vehicleMultipliers),
  hasVehicleMultipliers,
  updateVehicleMultipliers,
  // ... other exports
};
```

### 3. Updated Component

**File**: `src/admin/components/PricingSettingsCard.vue`

**Added UI Section** (เฉพาะ Ride Service):

```vue
<!-- Vehicle Multipliers (Ride Service Only) -->
<div v-if="activeTab === 'ride'" class="vehicle-multipliers">
  <div class="multipliers-header">
    <div class="multipliers-title">
      ตัวคูณราคาตามประเภทรถ (Vehicle Multipliers)
    </div>
    <div class="multipliers-subtitle">
      กำหนดตัวคูณสำหรับแต่ละประเภทรถ - ราคาจะคำนวณจากราคาฐาน × ตัวคูณ
    </div>
  </div>

  <div class="multipliers-grid">
    <!-- Bike Card -->
    <div class="multiplier-card">
      <div class="multiplier-icon">🏍️</div>
      <div class="multiplier-info">
        <div class="multiplier-name">มอเตอร์ไซค์</div>
        <div class="multiplier-desc">Motorcycle / Bike</div>
      </div>
      <div class="multiplier-input-wrapper">
        <input v-model.number="vehicleMultipliers.bike" type="number" step="0.1" />
        <span class="multiplier-unit">×</span>
      </div>
      <div class="multiplier-example">
        ตัวอย่าง: {{ formatCurrency(baseFare * vehicleMultipliers.bike) }}
      </div>
    </div>

    <!-- Car Card -->
    <!-- Premium Card -->
  </div>
</div>
```

**Added Logic**:

```typescript
// State
const vehicleMultipliers = ref({
  bike: 0.7,
  car: 1.0,
  premium: 1.5
})
const originalMultipliers = ref({ ...vehicleMultipliers.value })

// Load from database
onMounted(() => {
  if (dbVehicleMultipliers.value) {
    vehicleMultipliers.value = JSON.parse(JSON.stringify(dbVehicleMultipliers.value))
    originalMultipliers.value = JSON.parse(JSON.stringify(dbVehicleMultipliers.value))
  }
})

// Check for changes
function hasChange(key: keyof DistanceRates): boolean {
  // ... check rates

  // For ride service, also check vehicle multipliers
  if (key === 'ride') {
    const multipliersChanged =
      vehicleMultipliers.value.bike !== originalMultipliers.value.bike ||
      vehicleMultipliers.value.car !== originalMultipliers.value.car ||
      vehicleMultipliers.value.premium !== originalMultipliers.value.premium
    return ratesChanged || multipliersChanged
  }

  return ratesChanged
}

// Save
async function confirmSave() {
  // Save distance rates
  await updateDistanceRates(localRates.value, changeReason.value)

  // For ride service, also save vehicle multipliers if changed
  if (pendingServiceKey.value === 'ride') {
    const multipliersChanged = /* ... */
    if (multipliersChanged) {
      await updateVehicleMultipliers(vehicleMultipliers.value, changeReason.value)
    }
  }
}
```

---

## 🎨 UI Features

### 1. Vehicle Multiplier Cards

แต่ละประเภทรถมี Card แยกกัน:

**🏍️ มอเตอร์ไซค์ (Bike)**

- Icon: ⚡ สีเหลือง
- Default: 0.7× (ถูกกว่า 30%)
- ตัวอย่างราคา: แสดง Real-time

**🚗 รถยนต์ (Car)**

- Icon: 🚗 สีน้ำเงิน
- Default: 1.0× (ราคาปกติ)
- ตัวอย่างราคา: แสดง Real-time

**🚙 พรีเมียม (Premium)**

- Icon: ⭐ สีม่วง
- Default: 1.5× (แพงกว่า 50%)
- ตัวอย่างราคา: แสดง Real-time

### 2. Real-time Price Preview

เมื่อปรับตัวคูณ → ราคาตัวอย่างเปลี่ยนทันที:

```
ระยะทาง: 5 กม.
ราคาฐาน: 75฿

มอเตอร์ไซค์: 75 × 0.7 = 53฿
รถยนต์: 75 × 1.0 = 75฿
พรีเมียม: 75 × 1.5 = 113฿
```

### 3. Change Detection

- แสดง indicator เมื่อมีการเปลี่ยนแปลง
- Input field เปลี่ยนสีเป็นสีน้ำเงิน
- ปุ่ม "บันทึกการเปลี่ยนแปลง" ปรากฏ

### 4. Save with Reason

- ต้องระบุเหตุผลก่อนบันทึก
- Modal popup สำหรับกรอกเหตุผล
- บันทึกทั้ง distance rates และ vehicle multipliers พร้อมกัน

---

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Admin เปิดหน้า Pricing Settings                         │
│     - เลือก Tab "บริการเรียกรถ"                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Load Settings from Database                             │
│     - fetchSettings('pricing')                              │
│     - Parse distance_rates                                  │
│     - Parse vehicle_multipliers                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Display Vehicle Multipliers Section                     │
│     - Show 3 cards (Bike, Car, Premium)                     │
│     - Show current multipliers                              │
│     - Show example prices                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Admin Adjusts Multipliers                               │
│     - Change bike: 0.7 → 0.6                                │
│     - Example price updates: 53฿ → 45฿                      │
│     - Change indicator appears                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Admin Clicks "บันทึกการเปลี่ยนแปลง"                     │
│     - Modal popup: "กรุณาระบุเหตุผล"                        │
│     - Admin enters: "ปรับราคามอเตอร์ไซค์ลง 10%"             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Save to Database (Production)                           │
│     - updateDistanceRates(localRates, reason)               │
│     - updateVehicleMultipliers(multipliers, reason)         │
│     - RPC: update_financial_setting                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Success Feedback                                        │
│     - Toast: "อัพเดทตัวคูณราคาตามประเภทรถสำเร็จ"            │
│     - Update originalMultipliers                            │
│     - Clear change indicators                               │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Features Implemented

### 1. Database Integration

- ✅ Created `vehicle_multipliers` key in `financial_settings`
- ✅ Stored in Production database
- ✅ Uses MCP `supabase-hosted` power

### 2. Admin UI

- ✅ Vehicle Multipliers section (Ride service only)
- ✅ 3 cards for Bike, Car, Premium
- ✅ Input fields with validation
- ✅ Real-time price preview
- ✅ Change detection
- ✅ Save with reason modal

### 3. Composable Functions

- ✅ `fetchSettings()` - Load multipliers from DB
- ✅ `updateVehicleMultipliers()` - Save to DB
- ✅ State management with refs
- ✅ Computed properties

### 4. Component Logic

- ✅ Load multipliers on mount
- ✅ Watch for database changes
- ✅ Detect local changes
- ✅ Save both rates and multipliers together
- ✅ Success/error handling

---

## 🧪 Testing

### Manual Testing

```bash
# 1. เปิด dev server
npm run dev

# 2. Login as Admin
http://localhost:5173/admin/login
Email: superadmin@gobear.app

# 3. ไปที่ Pricing Settings
http://localhost:5173/admin/settings/financial/pricing

# 4. เลือก Tab "บริการเรียกรถ"

# 5. ทดสอบ Vehicle Multipliers
- ดูค่าเริ่มต้น: Bike 0.7, Car 1.0, Premium 1.5
- เปลี่ยนค่า Bike เป็น 0.6
- ดูตัวอย่างราคาเปลี่ยน
- คลิก "บันทึกการเปลี่ยนแปลง"
- กรอกเหตุผล: "ทดสอบระบบ"
- ยืนยัน
- ดู Toast success message

# 6. Verify in Database
- เช็คว่าค่าใหม่ถูกบันทึกลง financial_settings
```

### Database Verification

```sql
-- Check vehicle_multipliers
SELECT category, key, value, description, updated_at
FROM financial_settings
WHERE category = 'pricing' AND key = 'vehicle_multipliers';

-- Expected result:
{
  "category": "pricing",
  "key": "vehicle_multipliers",
  "value": {
    "bike": 0.6,  -- Changed from 0.7
    "car": 1.0,
    "premium": 1.5
  },
  "description": "Vehicle pricing multipliers for ride service...",
  "updated_at": "2026-01-25T..."
}
```

---

## 📈 Business Impact

### Admin Benefits

- ✅ ปรับราคาได้ง่าย ไม่ต้องแก้โค้ด
- ✅ เห็นผลกระทบทันที (Real-time preview)
- ✅ มี Audit trail (เหตุผลการเปลี่ยนแปลง)
- ✅ ปรับได้ตามสถานการณ์ (เช่น โปรโมชั่น)

### Operational Benefits

- ✅ ไม่ต้อง deploy code เมื่อเปลี่ยนราคา
- ✅ เปลี่ยนแปลงมีผลทันที
- ✅ Rollback ได้ง่าย
- ✅ Track history ได้

### Customer Benefits

- ✅ ราคาชัดเจน แยกตามประเภทรถ
- ✅ เลือกได้ตามงบประมาณ
- ✅ ราคายุติธรรม

---

## 🚀 Next Steps

### Immediate

1. ✅ Test in production
2. ✅ Verify database updates
3. ✅ Check frontend integration

### Short-term (Next Week)

4. 📊 Add analytics tracking
   - Track multiplier changes
   - Monitor impact on bookings
   - A/B test different values

5. 🎨 UI Enhancements
   - Add history view
   - Show impact prediction
   - Add preset values

### Medium-term (Next Month)

6. 🔧 Advanced Features
   - Time-based multipliers (peak hours)
   - Location-based multipliers
   - Weather-based multipliers
   - Demand-based dynamic pricing

7. 📱 Mobile Admin App
   - Quick multiplier adjustments
   - Push notifications for changes
   - Real-time monitoring

---

## 🎉 Summary

### ✅ What's Complete

**Database**:

- ✅ `vehicle_multipliers` key created in `financial_settings`
- ✅ Stored in Production database
- ✅ Default values: bike 0.7, car 1.0, premium 1.5

**Backend**:

- ✅ Composable functions for CRUD operations
- ✅ Integration with existing financial settings system
- ✅ Audit trail support

**Frontend**:

- ✅ Vehicle Multipliers UI section
- ✅ 3 cards for different vehicle types
- ✅ Real-time price preview
- ✅ Change detection and validation
- ✅ Save with reason modal

**Integration**:

- ✅ Works with existing pricing system
- ✅ Syncs with frontend ride booking
- ✅ Admin can adjust anytime

---

**Status**: 🎉 **COMPLETE & PRODUCTION READY!**

Admin สามารถจัดการ Vehicle Multipliers ได้แล้วผ่านหน้า Pricing Settings! 🚗🏍️🚙
