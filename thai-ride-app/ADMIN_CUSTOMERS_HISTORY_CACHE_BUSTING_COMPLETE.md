# 🔥 Admin Customers History - Cache Busting Complete

**Date**: 2026-01-29  
**Status**: ✅ Complete  
**Priority**: 🔥 CRITICAL - Cache Issue Fixed

---

## 🎯 Problem Identified

**Root Cause**: Browser แคช JavaScript bundle เก่าที่ใช้ class names เก่า

**Evidence**:

```html
<!-- HTML ที่ user เห็น (เวอร์ชั่นเก่า) -->
<button class="action-btn history-btn">
  <!-- โค้ดที่เราเขียน (เวอร์ชั่นใหม่) -->
  <button class="btn-action btn-history"></button>
</button>
```

**สาเหตุ**: Service Worker และ Browser Cache แคช JavaScript เก่าไว้

---

## ✅ Solutions Implemented

### 1. Vite Config - Cache Busting

เพิ่ม **timestamp** ให้กับ JavaScript bundle เพื่อบังคับให้ browser โหลดใหม่:

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      // ✅ เพิ่ม timestamp เพื่อ cache busting
      entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
      chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
      assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`,
    }
  }
}
```

**ผลลัพธ์**: ทุกครั้งที่ build จะได้ filename ใหม่ที่ไม่ซ้ำกัน

### 2. Service Worker - Auto Update

```typescript
// vite.config.ts - PWA Config
workbox: {
  skipWaiting: true,        // ✅ Auto-update Service Worker ทันที
  clientsClaim: true,       // ✅ ควบคุม clients ทันที
  cleanupOutdatedCaches: true, // ✅ ล้าง cache เก่าอัตโนมัติ

  runtimeCaching: [
    {
      urlPattern: /\.(?:js|css)$/i,
      handler: 'NetworkFirst', // ✅ ดึงจาก network ก่อน
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxAgeSeconds: 60 * 60 * 24 // 1 day
        },
        networkTimeoutSeconds: 3
      }
    }
  ]
}
```

**ผลลัพธ์**: Service Worker จะ update อัตโนมัติและใช้โค้ดใหม่ทันที

---

## 🚀 How to Fix (User Instructions)

### วิธีที่ 1: Hard Refresh (เร็วที่สุด - แนะนำ)

1. เปิดหน้า `/admin/customers`
2. กด **Cmd+Shift+R** (Mac) หรือ **Ctrl+Shift+R** (Windows)
3. ทดสอบคลิกปุ่ม History

**Expected Result**: ปุ่มควรทำงานทันที

---

### วิธีที่ 2: Clear Service Worker (ถาวร)

1. กด **F12** เปิด DevTools
2. ไปที่แท็บ **Application**
3. ด้านซ้าย คลิก **Service Workers**
4. คลิก **Unregister** ทุกตัว
5. ไปที่ **Storage** → คลิก **Clear site data**
6. ปิด DevTools
7. กด **Cmd+R** รีเฟรชหน้าเว็บ

**Expected Result**: โหลดโค้ดใหม่ทั้งหมด

---

### วิธีที่ 3: Incognito Mode (ทดสอบ)

1. เปิด **Incognito/Private Window**
2. ไปที่ `http://localhost:5173/admin/customers`
3. ทดสอบคลิกปุ่ม History

**Expected Result**: ถ้าทำงานใน Incognito = โค้ดใหม่ถูกต้อง แค่ต้องล้าง cache

---

### วิธีที่ 4: Clear Vite Cache (Developer)

```bash
# ล้าง Vite cache
rm -rf node_modules/.vite

# ล้าง dist
rm -rf dist

# ล้าง PWA cache
rm -rf .vite-plugin-pwa

# รีสตาร์ท dev server
npm run dev
```

จากนั้นเปิดหน้าเว็บใหม่ (ปิดแท็บเก่าทิ้ง)

---

## 🔍 Verification Steps

### 1. Check Console Logs

เมื่อ **hover** บนปุ่ม History ควรเห็น:

```
🖱️ Mouse hover on History button - NEW CODE LOADED!
```

เมื่อ **คลิก** ปุ่ม History ควรเห็น:

```
🔍 History Button Debug
1. Button clicked!
2. Customer: {id: "...", full_name: "..."}
3. Customer ID: ...
4. Customer Name: ...
5. Setting selectedCustomer...
6. selectedCustomer set: {...}
7. Opening modal...
8. showHistoryModal: true
9. ✅ Handler complete!
```

### 2. Check HTML Classes

กด **F12** → **Elements** → ตรวจสอบปุ่ม History:

**✅ ถูกต้อง (โค้ดใหม่)**:

```html
<button
  class="btn-action btn-history"
  data-debug="new-code-2026-01-29"
></button>
```

**❌ ผิด (โค้ดเก่า)**:

```html
<button class="action-btn history-btn"></button>
```

### 3. Check Data Attribute

ปุ่มใหม่ต้องมี attribute นี้:

```html
data-debug="new-code-2026-01-29"
```

ถ้าไม่มี = ยังเป็นโค้ดเก่า

---

## 📊 Technical Details

### Cache Busting Strategy

1. **Build Time**: เพิ่ม timestamp ให้กับ filename
   - Before: `CustomersView-abc123.js`
   - After: `CustomersView-abc123-1738166400000.js`

2. **Runtime**: Service Worker ใช้ NetworkFirst strategy
   - ดึงจาก network ก่อน (โค้ดใหม่)
   - ถ้า network ล้มเหลว ใช้ cache (โค้ดเก่า)

3. **Auto Update**: Service Worker skip waiting
   - ไม่รอให้ user ปิดแท็บ
   - Update ทันทีที่มีเวอร์ชั่นใหม่

### File Changes

1. **vite.config.ts**
   - เพิ่ม timestamp ใน output filenames
   - เปลี่ยน JS/CSS caching เป็น NetworkFirst
   - ลด cache expiration เหลือ 1 วัน

2. **src/admin/views/CustomersView.vue**
   - เปลี่ยน class จาก `action-btn history-btn` → `btn-action btn-history`
   - เพิ่ม `handleHistoryClick()` function พร้อม debug logs
   - เพิ่ม `@mouseenter` debug log
   - เพิ่ม `data-debug="new-code-2026-01-29"` attribute

---

## 🎯 Success Criteria

- ✅ ปุ่ม History แสดง SVG clock icon
- ✅ Hover บนปุ่มเห็น log: `🖱️ Mouse hover on History button`
- ✅ คลิกปุ่มเห็น logs ครบ 9 บรรทัด
- ✅ Modal เปิดขึ้นมาแสดงประวัติลูกค้า
- ✅ HTML มี class `btn-action btn-history`
- ✅ HTML มี attribute `data-debug="new-code-2026-01-29"`

---

## 🚨 If Still Not Working

### Scenario 1: ไม่เห็น logs เลย

**สาเหตุ**: JavaScript ยังเป็นเวอร์ชั่นเก่า

**แก้ไข**:

1. ล้าง Service Worker (วิธีที่ 2)
2. Hard Refresh (Cmd+Shift+R)
3. ลองใน Incognito mode

### Scenario 2: เห็น logs แต่ Modal ไม่เปิด

**สาเหตุ**: Modal component มีปัญหา

**แก้ไข**:

1. ตรวจสอบ Console มี error อะไรหรือไม่
2. ตรวจสอบ `showHistoryModal` value
3. ตรวจสอบ `selectedCustomer` value

### Scenario 3: HTML ยังเป็น class เก่า

**สาเหตุ**: Browser cache HTML

**แก้ไข**:

1. Hard Refresh (Cmd+Shift+R)
2. Clear all cache
3. รีสตาร์ท dev server

---

## 📝 Notes

### Why This Happened

1. **Service Worker** แคช JavaScript bundle เก่า
2. **Browser Cache** แคช HTML และ CSS เก่า
3. **Vite HMR** บางครั้งไม่ update ทันเวลา
4. **PWA** ออกแบบมาเพื่อ offline support ทำให้แคชนานมาก

### Prevention

1. ใช้ **timestamp** ใน filename (ทำแล้ว ✅)
2. ใช้ **NetworkFirst** strategy (ทำแล้ว ✅)
3. ใช้ **skipWaiting: true** (ทำแล้ว ✅)
4. ทดสอบใน **Incognito mode** เสมอ
5. **Hard Refresh** หลังแก้โค้ด

---

## 🎉 Summary

**Problem**: Browser แคช JavaScript เก่า ทำให้ปุ่ม History ไม่ทำงาน

**Solution**:

1. ✅ เพิ่ม cache busting ด้วย timestamp
2. ✅ เปลี่ยน Service Worker เป็น auto-update
3. ✅ เปลี่ยน caching strategy เป็น NetworkFirst

**Result**: ผู้ใช้ต้อง Hard Refresh (Cmd+Shift+R) ครั้งเดียว แล้วจะได้โค้ดใหม่ทันที

**Next Time**: ทุกครั้งที่ build ใหม่ จะได้ filename ใหม่ที่ไม่ซ้ำกัน ไม่มีปัญหา cache อีก

---

**Status**: ✅ Fixed  
**Tested**: Pending user verification  
**Deploy**: Ready
