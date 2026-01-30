# 🔄 Admin Customers History - Cache Clear Guide

**Date**: 2026-01-29  
**Issue**: ปุ่มดูประวัติลูกค้าไม่แสดง เพราะบราวเซอร์แคชโค้ดเก่า  
**Solution**: Force clear cache และป้องกันปัญหาในอนาคต

---

## 🚨 ปัญหา

แม้ว่าโค้ดจะถูกเพิ่มไปแล้ว แต่บราวเซอร์ยังแสดงหน้าเก่าเพราะ:

1. **Browser Cache** - เก็บ JavaScript bundle เก่าไว้
2. **Service Worker Cache** - PWA cache ยังเก็บไฟล์เก่า
3. **Vite HMR** - Hot Module Replacement อาจไม่ refresh

---

## ✅ วิธีแก้ไข (ทำตามลำดับ)

### Step 1: Hard Refresh Browser (ลองก่อน)

**Chrome/Edge/Brave:**

```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

**Firefox:**

```
Windows: Ctrl + F5
Mac: Cmd + Shift + R
```

**Safari:**

```
Mac: Cmd + Option + R
```

### Step 2: Clear Browser Cache Completely

**Chrome/Edge/Brave:**

1. กด `F12` เปิด DevTools
2. คลิกขวาที่ปุ่ม Refresh
3. เลือก **"Empty Cache and Hard Reload"**

**หรือ:**

1. กด `Ctrl/Cmd + Shift + Delete`
2. เลือก **"Cached images and files"**
3. เลือก **"All time"**
4. คลิก **"Clear data"**

### Step 3: Clear Service Worker (สำคัญมาก!)

1. เปิด DevTools (`F12`)
2. ไปที่ tab **"Application"**
3. ซ้ายมือเลือก **"Service Workers"**
4. คลิก **"Unregister"** ทุกตัว
5. ไปที่ **"Cache Storage"**
6. คลิกขวาแต่ละ cache → **"Delete"**
7. Refresh หน้าเว็บ

### Step 4: Restart Dev Server

```bash
# หยุด dev server (Ctrl + C)
# แล้วรันใหม่
npm run dev
```

### Step 5: Force Clear All (ถ้ายังไม่ได้)

```bash
# รัน script นี้
./force-clear-cache.sh
```

หรือทำเอง:

```bash
# 1. ลบ node_modules/.vite
rm -rf node_modules/.vite

# 2. ลบ dist
rm -rf dist

# 3. รัน dev ใหม่
npm run dev
```

---

## 🔍 ตรวจสอบว่าแก้แล้ว

### 1. เช็คว่าโค้ดถูกโหลด

เปิด DevTools → Console → พิมพ์:

```javascript
// เช็คว่า CustomerHistoryModal ถูก import หรือยัง
console.log(document.querySelector(".btn-history"));
```

ถ้าได้ `null` = ยังโหลดโค้ดเก่า  
ถ้าได้ `<button>` = โหลดโค้ดใหม่แล้ว ✅

### 2. เช็คว่าปุ่มมีใน DOM

เปิด DevTools → Elements → กด `Ctrl/Cmd + F` → ค้นหา `btn-history`

ถ้าเจอ = โค้ดใหม่โหลดแล้ว ✅  
ถ้าไม่เจอ = ยังโหลดโค้ดเก่า ❌

### 3. เช็ค Network Tab

1. เปิด DevTools → Network
2. Refresh หน้า
3. ดูที่ `CustomersView.vue` หรือ `index.js`
4. เช็ค **"Size"** column:
   - ถ้าเห็น `(disk cache)` = โหลดจาก cache ❌
   - ถ้าเห็นขนาดไฟล์ เช่น `45.2 KB` = โหลดใหม่ ✅

---

## 🛡️ ป้องกันปัญหาในอนาคต

### 1. Disable Cache ใน DevTools (ขณะพัฒนา)

1. เปิด DevTools (`F12`)
2. ไปที่ tab **"Network"**
3. เช็ค **"Disable cache"** ✅
4. **เปิด DevTools ทิ้งไว้ตลอด** ขณะพัฒนา

### 2. ใช้ Incognito/Private Mode

- Chrome: `Ctrl/Cmd + Shift + N`
- Firefox: `Ctrl/Cmd + Shift + P`
- Safari: `Cmd + Shift + N`

ไม่มี cache, ไม่มี service worker = เห็นโค้ดใหม่ทันที

### 3. เพิ่ม Cache Busting ใน vite.config.ts

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // เพิ่ม hash ในชื่อไฟล์
        entryFileNames: "assets/[name].[hash].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]",
      },
    },
  },
});
```

### 4. เพิ่ม Version ใน index.html

```html
<!-- index.html -->
<meta name="version" content="1.0.1" />
```

เปลี่ยน version ทุกครั้งที่ deploy

---

## 🚀 Quick Fix Script

สร้างไฟล์ `clear-dev-cache.sh`:

```bash
#!/bin/bash

echo "🧹 Clearing all caches..."

# 1. Clear Vite cache
echo "1️⃣ Clearing Vite cache..."
rm -rf node_modules/.vite

# 2. Clear dist
echo "2️⃣ Clearing dist..."
rm -rf dist

# 3. Clear browser cache instruction
echo "3️⃣ Please clear browser cache:"
echo "   Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)"
echo "   Firefox: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)"
echo ""
echo "4️⃣ Clear Service Worker:"
echo "   F12 → Application → Service Workers → Unregister"
echo ""

# 4. Restart dev server
echo "5️⃣ Restarting dev server..."
npm run dev

echo "✅ Done! Now hard refresh your browser."
```

ใช้งาน:

```bash
chmod +x clear-dev-cache.sh
./clear-dev-cache.sh
```

---

## 📱 สำหรับ Mobile Testing

### iOS Safari

1. Settings → Safari → Clear History and Website Data
2. หรือ: Settings → Safari → Advanced → Website Data → Remove All

### Android Chrome

1. Settings → Privacy → Clear browsing data
2. เลือก "Cached images and files"
3. คลิก "Clear data"

---

## 🔧 Troubleshooting

### ปัญหา: ยัง clear cache แล้วไม่เห็นปุ่ม

**เช็คว่าโค้ดถูก compile หรือยัง:**

```bash
# ดู console ของ dev server
# ต้องเห็น:
# ✓ built in XXXms
```

**เช็คว่าไฟล์ถูก save หรือยัง:**

```bash
git status
# ต้องเห็น:
# modified: src/admin/views/CustomersView.vue
```

### ปัญหา: Dev server ไม่ HMR

**Restart dev server:**

```bash
# หยุด (Ctrl + C)
npm run dev
```

**หรือ force reload:**

```bash
# ใน browser console
location.reload(true)
```

### ปัญหา: Service Worker ไม่ยอม unregister

**Force unregister ทาง console:**

```javascript
// เปิด DevTools Console
navigator.serviceWorker.getRegistrations().then(function (registrations) {
  for (let registration of registrations) {
    registration.unregister();
    console.log("Unregistered:", registration);
  }
});

// แล้ว refresh
location.reload();
```

---

## ✅ Checklist หลัง Clear Cache

- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Clear browser cache completely
- [ ] Unregister all service workers
- [ ] Delete all cache storage
- [ ] Restart dev server
- [ ] เปิด DevTools → Network → Disable cache
- [ ] Refresh หน้าเว็บ
- [ ] เช็คว่าเห็นปุ่ม History (ไอคอนนาฬิกา)
- [ ] คลิกปุ่มทดสอบว่า modal เปิด
- [ ] ปิด DevTools แล้วทดสอบอีกครั้ง

---

## 📊 สรุป Root Cause

| ปัญหา                 | สาเหตุ                 | วิธีแก้               |
| --------------------- | ---------------------- | --------------------- |
| ไม่เห็นปุ่มใหม่       | Browser cache โค้ดเก่า | Hard refresh          |
| ยัง clear แล้วไม่เห็น | Service Worker cache   | Unregister SW         |
| HMR ไม่ทำงาน          | Vite cache             | ลบ node_modules/.vite |
| ไฟล์ไม่ update        | Dev server ค้าง        | Restart dev server    |

---

## 🎯 Best Practices

### ขณะพัฒนา (Development)

1. **เปิด DevTools ทิ้งไว้** → Network tab → Disable cache ✅
2. **ใช้ Incognito mode** สำหรับทดสอบ
3. **Hard refresh** ทุกครั้งหลังแก้โค้ด
4. **Restart dev server** ถ้า HMR ไม่ทำงาน

### ก่อน Deploy (Production)

1. **Build ใหม่ทุกครั้ง**: `npm run build`
2. **เพิ่ม version number** ใน package.json
3. **Test ใน Incognito** ก่อน deploy
4. **แจ้ง user ให้ hard refresh** หลัง deploy

### หลัง Deploy (Production)

1. **แจ้ง user**: "กรุณา refresh หน้าเว็บ (Ctrl+Shift+R)"
2. **Monitor**: เช็ค error logs ว่ามี cache issue หรือไม่
3. **Version check**: เพิ่ม version display ใน UI

---

## 🚀 ทดสอบว่าแก้แล้ว

```bash
# 1. Clear all caches
./force-clear-cache.sh

# 2. เปิด browser ใหม่ (Incognito)
# Chrome: Ctrl+Shift+N

# 3. ไปที่ http://localhost:5173/admin/customers

# 4. เช็คว่าเห็นปุ่ม History (ไอคอนนาฬิกาสีน้ำเงิน)
#    ตำแหน่ง: ระหว่างปุ่ม "ดูรายละเอียด" และ "ระงับ"

# 5. คลิกปุ่ม → modal ต้องเปิด ✅
```

---

**สร้างเมื่อ**: 2026-01-29  
**ปัญหา**: Browser cache ทำให้ไม่เห็นโค้ดใหม่  
**สถานะ**: ✅ มีวิธีแก้ครบถ้วน  
**ป้องกัน**: เปิด DevTools → Disable cache ขณะพัฒนา
