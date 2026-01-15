# 🚗 Realtime Tracking Features

## Overview

ระบบติดตามตำแหน่งแบบ realtime พร้อมฟีเจอร์ขั้นสูง 3 อย่าง

## ✅ Features Implemented

### 1. 📍 Realtime ETA Calculation

**คำนวณเวลามาถึงแบบ realtime จากตำแหน่งจริงของคนขับ**

#### Role Impact:

| Role        | Impact                 | Details                                   |
| ----------- | ---------------------- | ----------------------------------------- |
| 👤 Customer | ✅ เห็น ETA แม่นยำขึ้น | แสดง ETA ที่คำนวณจากตำแหน่งจริง + routing |
| 🚗 Provider | - ไม่มีผลกระทบ         | ใช้ข้อมูล location เดิม                   |
| 👑 Admin    | ✅ ดู ETA ใน dashboard | สามารถ monitor ETA ของทุก ride            |

#### Features:

- ใช้ OSRM routing service สำหรับ ETA ที่แม่นยำ
- Fallback เป็น straight-line calculation ถ้า routing ล้มเหลว
- อัพเดทอัตโนมัติทุก 5 วินาที
- แสดงระยะทางและเวลาที่เหลือ
- ตรวจจับว่าคนขับใกล้ถึงหรือยัง (< 500m)

#### Implementation:

```typescript
// src/composables/useRealtimeETA.ts
const { etaMinutes, distanceText, isDriverNearby } = useRealtimeETA(
  driverLocation,
  pickupLocation
);
```

---

### 2. 🛣️ Location History Trail

**แสดงเส้นทางที่คนขับเคลื่อนที่มา**

#### Role Impact:

| Role        | Impact              | Details                                 |
| ----------- | ------------------- | --------------------------------------- |
| 👤 Customer | ✅ เห็นเส้นทางคนขับ | แสดง trail บนแผนที่ด้วย gradient effect |
| 🚗 Provider | - ไม่มีผลกระทบ      | ระบบบันทึก location อัตโนมัติ           |
| 👑 Admin    | ✅ ดู trail history | ดูประวัติการเคลื่อนที่ใน monitoring     |

#### Features:

- บันทึก location history สูงสุด 50 จุด
- กรองจุดที่ใกล้กันเกินไป (< 50m)
- เก็บข้อมูลย้อนหลัง 30 นาที
- แสดง trail ด้วย gradient fade effect
- คำนวณระยะทางรวมที่เคลื่อนที่มา
- Subscribe realtime updates จาก `provider_locations`

#### Implementation:

```typescript
// src/composables/useLocationHistory.ts
const { coordinates, hasHistory, totalDistance } = useLocationHistory(
  providerId,
  {
    maxPoints: 30,
    minDistance: 0.05, // 50m
    maxAge: 20 * 60 * 1000, // 20 min
  }
);
```

---

### 3. 🔔 Geofencing Alerts

**แจ้งเตือนเมื่อคนขับเข้าใกล้จุดรับ**

#### Role Impact:

| Role        | Impact              | Details                                       |
| ----------- | ------------------- | --------------------------------------------- |
| 👤 Customer | ✅ รับ notification | แจ้งเตือนเมื่อคนขับใกล้ถึง (500m, 300m, 100m) |
| 🚗 Provider | - ไม่มีผลกระทบ      | ไม่มีการเปลี่ยนแปลง                           |
| 👑 Admin    | ✅ ดู alert logs    | ดู geofence events ใน monitoring              |

#### Features:

- 3 ระดับ geofence zones:
  - **Approaching** (500m): แจ้งเตือนว่ากำลังมา
  - **Nearby** (300m): แจ้งเตือนว่าใกล้ถึงแล้ว
  - **Very Close** (100m): แจ้งเตือนว่ามาถึงแล้ว
- Browser notification พร้อม icon
- Haptic feedback (vibration) แบบต่างกันตาม zone
- ตรวจสอบทุก 3 วินาที
- แสดง alert badge บนแผนที่

#### Implementation:

```typescript
// src/composables/useGeofencing.ts
const { activeZones, recentEvents } = useGeofencing(
  driverLocation,
  geofenceZones,
  {
    enableNotifications: true,
    enableHaptic: true,
  }
);
```

---

## 🗄️ Database Schema

### provider_locations Table

```sql
CREATE TABLE provider_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers_v2(id),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  heading DECIMAL(5, 2), -- 0-360 degrees
  speed DECIMAL(5, 2), -- km/h
  accuracy DECIMAL(6, 2), -- meters
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180)
);

-- Indexes
CREATE INDEX idx_provider_locations_provider ON provider_locations(provider_id, updated_at DESC);
CREATE INDEX idx_provider_locations_updated ON provider_locations(updated_at DESC);

-- RLS Policies
ALTER TABLE provider_locations ENABLE ROW LEVEL SECURITY;

-- Customer: เห็น location ของคนขับที่รับงานตัวเอง
CREATE POLICY "customer_see_assigned_provider" ON provider_locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ride_requests
      WHERE ride_requests.provider_id = provider_locations.provider_id
        AND ride_requests.user_id = auth.uid()
        AND ride_requests.status IN ('matched', 'arriving', 'picked_up', 'in_progress')
    )
  );

-- Provider: เห็น location ตัวเอง
CREATE POLICY "provider_own_location" ON provider_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM providers_v2
      WHERE providers_v2.id = provider_locations.provider_id
        AND providers_v2.user_id = auth.uid()
    )
  );

-- Admin: เห็นทุกอย่าง
CREATE POLICY "admin_all_locations" ON provider_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
```

---

## 📱 UI Components

### RideTrackingView.vue

- แสดง ETA badge ที่เปลี่ยนสีตาม state (nearby/approaching)
- แสดง geofence alert เมื่อคนขับเข้า zone
- แสดง location history trail บนแผนที่
- Animation effects สำหรับ alerts

### MapView.vue

- รองรับ `locationHistory` prop
- วาด trail ด้วย `drawDriverPath()` function
- Gradient fade effect สำหรับ trail

---

## 🔧 Configuration

### Geofence Zones

```typescript
const ZONE_PRESETS = {
  VERY_CLOSE: 100, // 100m
  NEARBY: 300, // 300m
  APPROACHING: 500, // 500m
  AREA: 1000, // 1km
};
```

### Location History

```typescript
const DEFAULT_OPTIONS = {
  maxPoints: 50, // จำนวนจุดสูงสุด
  minDistance: 0.05, // 50m ระหว่างจุด
  maxAge: 30 * 60 * 1000, // 30 นาที
};
```

### ETA Calculation

```typescript
const SPEED_CONFIG = {
  highway: 80, // km/h
  urban: 40, // km/h
  congested: 20, // km/h
  default: 35, // km/h
};
```

---

## 🧪 Testing

### Customer Testing

1. จองรถและรอคนขับรับงาน
2. ตรวจสอบว่า ETA แสดงและอัพเดท
3. ดู location history trail บนแผนที่
4. รอคนขับเข้าใกล้เพื่อทดสอบ geofence alerts
5. ตรวจสอบ notification และ haptic feedback

### Provider Testing

1. รับงานและเริ่มเดินทาง
2. ตรวจสอบว่า location ถูกบันทึก
3. เคลื่อนที่ไปยังจุดรับ
4. ตรวจสอบว่า customer เห็น trail

### Admin Testing

1. เปิด monitoring dashboard
2. ดู ETA ของทุก active rides
3. ดู location history trails
4. ดู geofence event logs

---

## 🚀 Performance

- **ETA Calculation**: Throttled ทุก 5 วินาที
- **Location History**: จำกัด 50 จุด, กรองจุดที่ใกล้กัน
- **Geofencing**: ตรวจสอบทุก 3 วินาที
- **Realtime Updates**: ใช้ Supabase realtime subscriptions

---

## 📊 Monitoring (Admin)

### Metrics to Track

- Average ETA accuracy
- Location update frequency
- Geofence alert delivery rate
- Trail rendering performance

### Admin Dashboard Queries

```sql
-- ETA accuracy
SELECT
  AVG(ABS(estimated_eta - actual_arrival_time)) as avg_eta_error
FROM ride_requests
WHERE status = 'completed';

-- Location update frequency
SELECT
  provider_id,
  COUNT(*) as updates,
  MAX(updated_at) - MIN(updated_at) as duration
FROM provider_locations
WHERE updated_at > NOW() - INTERVAL '1 hour'
GROUP BY provider_id;

-- Geofence events (requires event logging table)
SELECT
  zone_name,
  COUNT(*) as events,
  AVG(distance) as avg_distance
FROM geofence_events
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY zone_name;
```

---

## 🔐 Security & Privacy

### RLS Policies

- ✅ Customer เห็นเฉพาะ location ของคนขับที่รับงานตัวเอง
- ✅ Provider เห็นเฉพาะ location ตัวเอง
- ✅ Admin เห็นทุกอย่าง

### Data Retention

- Location history เก็บ 30 นาที (configurable)
- Old locations ถูกลบอัตโนมัติ
- Geofence events เก็บ 7 วัน (ถ้ามี logging)

---

## 💡 Future Enhancements

1. **Traffic-aware ETA** - ใช้ traffic data จริง
2. **Predictive ETA** - ใช้ ML predict ETA จาก historical data
3. **Custom Geofence Zones** - ให้ customer กำหนด zone เอง
4. **Location Sharing** - แชร์ location กับเพื่อน/ครอบครัว
5. **Offline Support** - Cache location history สำหรับ offline viewing

---

## 📝 Notes

- ทุกฟีเจอร์ออกแบบตาม **Role-Based Development** principles
- มี fallback mechanisms สำหรับทุกฟีเจอร์
- Performance optimized ด้วย throttling และ caching
- Notification permission ต้องขออนุญาตจาก user ก่อน
