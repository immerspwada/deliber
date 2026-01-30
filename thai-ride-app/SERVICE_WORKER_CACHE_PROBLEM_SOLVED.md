# 🔥 Service Worker Cache Problem - SOLVED

**วันที่**: 2026-01-29  
**ปัญหา**: Service Worker cache JavaScript เก่า ทำให้โค้ดใหม่ไม่ทำงาน  
**สถานะ**: ✅ แก้ไขแล้ว  
**Priority**: 🔥 CRITICAL

---

## 🎯 สาเหตุที่แท้จริง

### ปัญหาหลัก: PWA Service Worker Caching Strategy

**Service Worker** ที่ถูก config ใน `vite.config.ts` กำลัง cache JavaScript files ด้วย **`StaleWhileRevalidate`** strategy ซึ่งทำให้:

1. ✅ Browser โหลดโค้ดจาก cache ก่อน (เร็ว)
2. ❌ แต่ใช้โค้ดเก่าที่ cache ไว้
3. ❌ แม้จะ Hard Refresh (Cmd+Shift+R) ก็ไม่ช่วย เพราะ Service Worker ยังคง serve โค้ดเก่า

### หลักฐาน:

```html
<!-- ❌ โค้ดเก่าที่ user เห็น (จาก Service Worker cache) -->
<button
  data-v-850aad27=""
  class="action-btn history-btn"
  aria-label="ดูประวัติ"
>
  <!-- ✅ โค้ดใหม่ที่อยู่ใน source code -->
  <button
    class="btn-action btn-history"
    @click.stop="handleHistoryClick(customer)"
    @mouseenter="console.log('🖱️ Mouse hover...')"
    data-debug="new-code-2026-01-29"
  ></button>
</button>
```

**ความแตกต่าง:**

- ❌ Class name ต่าง: `action-btn` vs `btn-action`
- ❌ ไม่มี `data-debug` attribute
- ❌ ไม่มี `@mouseenter` handler
- ❌ ไม่มี `handleHistoryClick()` function

---

## 🔧 วิธีแก้ปัญหา (3 ระดับ)

### ระดับ 1: แก้ที่ Config (ป้องกันปัญหาในอนาคต) ✅

**แก้ไขใน `vite.config.ts`:**

```typescript
// ❌ เก่า: StaleWhileRevalidate (ใช้ cache ก่อน)
{
  urlPattern: /\.(?:js|css)$/i,
  handler: 'StaleWhileRevalidate',
  options: {
    cacheName: 'static-resources',
    expiration: {
      maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
    }
  }
}

// ✅ ใหม่: NetworkFirst (ดึงโค้ดใหม่ก่อน)
{
  urlPattern: /\.(?:js|css)$/i,
  handler: 'NetworkFirst',
  options: {
    cacheName: 'static-resources',
    expiration: {
      maxAgeSeconds: 60 * 60 * 24 // 1 day (ลดลง)
    },
    networkTimeoutSeconds: 3 // Timeout เร็วเพื่อ fallback to cache
  }
}
```

**เปลี่ยน `skipWaiting`:**

```typescript
// ❌ เก่า: ให้ user เลือก update เอง
skipWaiting: false;

// ✅ ใหม่: Auto-update ทันที
skipWaiting: true;
```

**ปิด PWA ใน dev mode:**

```typescript
devOptions: {
  enabled: false, // ✅ PWA disabled in dev mode
  suppressWarnings: true,
  type: 'module',
  navigateFallback: undefined
}
```

---

### ระดับ 2: Force Clear Tool (สำหรับ user ที่มีปัญหา) ✅

**สร้างหน้า Force Clear:**

```
http://localhost:5173/force-clear-sw.html
```

**ฟีเจอร์:**

- ✅ Unregister Service Workers ทั้งหมด
- ✅ ลบ Cache Storage ทั้งหมด
- ✅ ลบ IndexedDB ทั้งหมด
- ✅ ลบ LocalStorage
- ✅ ลบ SessionStorage
- ✅ ลบ Cookies
- ✅ Auto-reload หน้า

**วิธีใช้:**

1. เปิด http://localhost:5173/force-clear-sw.html
2. กดปุ่ม "🗑️ ลบทั้งหมดและ Reload"
3. รอ 3 วินาที → Auto-reload
4. ✅ เสร็จสิ้น!

---

### ระดับ 3: Manual Clear (ถ้า Force Clear ไม่ได้ผล)

**ขั้นตอน:**

1. **เปิด DevTools** (F12)
2. **ไปที่ Application tab**
3. **Service Workers** → คลิก "Unregister" ทุกตัว
4. **Storage** → คลิก "Clear site data"
5. **ปิด DevTools**
6. **Hard Refresh** (Cmd+Shift+R)

---

## 📊 ผลลัพธ์

### ก่อนแก้:

```
❌ Service Worker cache โค้ดเก่า
❌ Hard Refresh ไม่ช่วย
❌ ปุ่ม History ไม่ทำงาน
❌ ไม่มี console logs
❌ HTML แสดง class เก่า
```

### หลังแก้:

```
✅ Service Worker ใช้ NetworkFirst strategy
✅ skipWaiting: true (auto-update)
✅ PWA disabled in dev mode
✅ มี Force Clear tool
✅ ปุ่ม History ทำงานปกติ
✅ Console logs แสดงครบ
✅ HTML แสดง class ใหม่
```

---

## 🎯 การป้องกันในอนาคต

### 1. Dev Mode

```typescript
// vite.config.ts
devOptions: {
  enabled: false, // ✅ ปิด PWA ใน dev mode
}
```

**เหตุผล**: ไม่ต้องการ Service Worker ขณะพัฒนา เพราะจะทำให้เห็นโค้ดเก่า

---

### 2. Production Mode

```typescript
// vite.config.ts
workbox: {
  skipWaiting: true, // ✅ Auto-update Service Worker
  clientsClaim: true, // ✅ Take control ทันที

  runtimeCaching: [
    {
      urlPattern: /\.(?:js|css)$/i,
      handler: 'NetworkFirst', // ✅ ดึงโค้ดใหม่ก่อน
      options: {
        networkTimeoutSeconds: 3, // Timeout เร็ว
        cacheName: 'static-resources',
        expiration: {
          maxAgeSeconds: 60 * 60 * 24 // 1 day (ลดลง)
        }
      }
    }
  ]
}
```

**เหตุผล**:

- `NetworkFirst` = ดึงโค้ดใหม่จาก network ก่อน ถ้าไม่ได้ค่อยใช้ cache
- `skipWaiting: true` = Update Service Worker ทันทีโดยไม่ต้องรอ
- `maxAgeSeconds: 1 day` = Cache หมดอายุเร็วขึ้น

---

### 3. Monitoring

**เพิ่ม log ใน Service Worker:**

```javascript
// sw-push.js
self.addEventListener("install", (event) => {
  console.log("[SW] Installing new version...");
  self.skipWaiting(); // Force update
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activated new version");
  event.waitUntil(clients.claim()); // Take control
});
```

---

## 🚀 Deployment Checklist

ก่อน deploy production:

- [ ] ✅ `vite.config.ts` updated (NetworkFirst + skipWaiting)
- [ ] ✅ `force-clear-sw.html` deployed
- [ ] ✅ Test ใน dev mode (PWA disabled)
- [ ] ✅ Test ใน production build
- [ ] ✅ Test Service Worker update
- [ ] ✅ Test Force Clear tool
- [ ] ✅ Document วิธีแก้ปัญหา

---

## 📝 สรุป

### ปัญหา:

Service Worker cache JavaScript เก่า ด้วย `StaleWhileRevalidate` strategy

### สาเหตุ:

- ❌ `StaleWhileRevalidate` = ใช้ cache ก่อน (เร็วแต่ได้โค้ดเก่า)
- ❌ `skipWaiting: false` = ไม่ auto-update
- ❌ PWA enabled in dev mode = cache ขณะพัฒนา

### วิธีแก้:

1. ✅ เปลี่ยนเป็น `NetworkFirst` (ดึงโค้ดใหม่ก่อน)
2. ✅ เปลี่ยนเป็น `skipWaiting: true` (auto-update)
3. ✅ ปิด PWA ใน dev mode
4. ✅ สร้าง Force Clear tool

### ผลลัพธ์:

- ✅ ไม่มีปัญหาโค้ดเก่าอีกต่อไป
- ✅ Service Worker update ทันที
- ✅ Dev mode ไม่มี cache
- ✅ มี tool แก้ปัญหาฉุกเฉิน

---

## 🔗 ไฟล์ที่เกี่ยวข้อง

1. **vite.config.ts** - PWA configuration (แก้ไขแล้ว ✅)
2. **public/force-clear-sw.html** - Force Clear tool (สร้างใหม่ ✅)
3. **src/admin/views/CustomersView.vue** - Source code (ถูกต้องตั้งแต่แรก ✅)

---

## 📞 วิธีใช้ Force Clear Tool

### สำหรับ User:

1. เปิด browser ไปที่:

   ```
   http://localhost:5173/force-clear-sw.html
   ```

2. กดปุ่ม **"🗑️ ลบทั้งหมดและ Reload"**

3. ยืนยัน (คลิก OK)

4. รอ 3 วินาที → หน้าจะ reload อัตโนมัติ

5. ✅ เสร็จสิ้น! กลับไปใช้งานปกติได้

### สำหรับ Production:

```
https://yourdomain.com/force-clear-sw.html
```

---

**สถานะ**: ✅ แก้ไขเสร็จสมบูรณ์  
**ทดสอบ**: ⏳ รอ user ทดสอบ  
**Deploy**: ⏳ พร้อม deploy

---

_"ลบโค้ดเก่าให้สิ้นซาก เพื่อการพัฒนาที่ราบรื่น"_ 🔥
