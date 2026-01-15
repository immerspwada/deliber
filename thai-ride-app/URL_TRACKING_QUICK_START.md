# 🚀 URL Tracking - Quick Start

## ✅ สิ่งที่ทำเสร็จแล้ว

### 1. สร้าง Composable

- ✅ `src/composables/useURLTracking.ts` - ระบบจัดการ URL tracking
- ✅ รองรับ 3 contexts: `provider_job`, `customer_ride`, `admin`
- ✅ Auto-generate step จาก status
- ✅ Timestamp tracking
- ✅ TypeScript type-safe

### 2. เพิ่ม URL Tracking ใน Provider Job Detail

- ✅ Import `useURLTracking` composable
- ✅ Update URL เมื่อโหลดงาน
- ✅ Update URL เมื่อสถานะเปลี่ยน (realtime)
- ✅ Update URL เมื่อ user กดปุ่มอัพเดทสถานะ
- ✅ Console logs สำหรับ debugging

## 🎯 ผลลัพธ์

### ก่อน (URL ไม่เปลี่ยน)

```
http://localhost:5173/provider/job/7e011cf4-cc74-4eea-afc8-5dd4fb01c5a0
http://localhost:5173/provider/job/7e011cf4-cc74-4eea-afc8-5dd4fb01c5a0
http://localhost:5173/provider/job/7e011cf4-cc74-4eea-afc8-5dd4fb01c5a0
```

### หลัง (URL เปลี่ยนตามสถานะ)

```
http://localhost:5173/provider/job/xxx?status=accepted&step=1-accepted&timestamp=1737012345678
http://localhost:5173/provider/job/xxx?status=arrived&step=2-arrived&timestamp=1737012456789
http://localhost:5173/provider/job/xxx?status=in_progress&step=3-in-progress&timestamp=1737012567890
http://localhost:5173/provider/job/xxx?status=completed&step=4-completed&timestamp=1737012678901
```

## 🧪 ทดสอบทันที

### 1. เปิดหน้า Provider Job Detail

```
http://localhost:5173/provider/job/7e011cf4-cc74-4eea-afc8-5dd4fb01c5a0
```

### 2. ดู URL ใน Address Bar

ควรเห็น:

```
?status=accepted&step=1-accepted&timestamp=1737012345678
```

### 3. กดปุ่ม "ถึงจุดรับแล้ว"

URL จะเปลี่ยนเป็น:

```
?status=arrived&step=2-arrived&timestamp=1737012456789
```

### 4. ดู Console Logs

```javascript
[URLTracking] Updated: {
  context: 'provider_job',
  params: { status: 'arrived' },
  newQuery: { status: 'arrived', step: '2-arrived', timestamp: '1737012456789' },
  fullURL: '/provider/job/xxx?status=arrived&step=2-arrived&timestamp=1737012456789'
}
```

## 📊 Status Flow

```
accepted (1-accepted)
    ↓
arrived (2-arrived)
    ↓
in_progress (3-in-progress)
    ↓
completed (4-completed)
```

## 🔧 การใช้งานในหน้าอื่น

### Import Composable

```typescript
import { useURLTracking } from "@/composables/useURLTracking";

const { updateStatus, updateAction } = useURLTracking();
```

### Update URL เมื่อสถานะเปลี่ยน

```typescript
// Provider context
updateStatus("accepted", "provider_job");

// Customer context
updateStatus("searching", "customer_ride");

// Admin context
updateStatus("approving", "admin");
```

### Track Actions

```typescript
updateAction("accepting_job");
updateAction("uploading_photo");
updateAction("calculating_fare");
```

## 📝 ประโยชน์

1. **Debug ง่ายขึ้น** - เห็นสถานะปัจจุบันใน URL
2. **Share URL ได้** - ส่ง URL ที่แสดงสถานะเฉพาะ
3. **Bookmark ได้** - บันทึก URL ที่สถานะเฉพาะ
4. **Track User Journey** - ติดตามเส้นทางผู้ใช้ผ่าน URL
5. **Analytics** - วิเคราะห์พฤติกรรมผู้ใช้จาก URL

## 🎨 เพิ่ม Debug Panel (Optional)

```vue
<template>
  <div v-if="isDev" class="debug-url">
    <strong>URL:</strong> {{ currentURL }}
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const isDev = computed(() => import.meta.env.DEV);
const currentURL = computed(() => window.location.href);
</script>

<style scoped>
.debug-url {
  position: fixed;
  bottom: 10px;
  left: 10px;
  background: #fef3c7;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-family: monospace;
  z-index: 9999;
  max-width: 90vw;
  overflow-x: auto;
}
</style>
```

## 📚 เอกสารเพิ่มเติม

- `URL_TRACKING_SYSTEM.md` - เอกสารฉบับเต็ม
- `src/composables/useURLTracking.ts` - Source code พร้อม comments

## ✅ Next Steps

1. **ทดสอบ Provider Job Detail** - ตรวจสอบว่า URL เปลี่ยนตามสถานะ
2. **เพิ่ม URL tracking ในหน้าอื่น** - Customer Ride, Provider Jobs, Admin
3. **เพิ่ม Debug Panel** - แสดง URL tracking info
4. **เพิ่ม Analytics** - Track user journey

## 🐛 Troubleshooting

### URL ไม่เปลี่ยน?

1. ตรวจสอบ console logs - ควรเห็น `[URLTracking] Updated:`
2. ตรวจสอบว่าเรียก `updateStatus()` แล้ว
3. ตรวจสอบ context ที่ส่งเข้าไป (`provider_job`, `customer_ride`, `admin`)

### Step แสดง "unknown"?

- Status ที่ส่งเข้าไปไม่อยู่ใน `STATUS_STEP_MAP`
- เพิ่ม mapping ใหม่ใน `useURLTracking.ts`

### Console มี error?

- ตรวจสอบ TypeScript types
- รัน `npm run type-check`
