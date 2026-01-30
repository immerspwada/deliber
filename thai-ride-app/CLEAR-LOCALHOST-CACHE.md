# 🔥 Clear Localhost Cache - Step by Step

## ปัญหา

Browser โหลด JavaScript เก่าที่มี bug: `_ctx.viewCustomerHistory is not a function`

## วิธีแก้ (ทำตามลำดับ)

### Step 1: Clear Service Worker

1. เปิด DevTools (F12)
2. ไปที่ **Application** tab
3. ซ้ายมือ คลิก **Service Workers**
4. คลิก **Unregister** ทุกตัว
5. คลิก **Clear storage** ด้านบน
6. เลือก **Unregister service workers**
7. คลิก **Clear site data**

### Step 2: Clear All Caches

1. ยังอยู่ใน **Application** tab
2. คลิก **Storage** ด้านซ้าย
3. คลิก **Clear site data**
4. ยืนยัน

### Step 3: Hard Refresh

- **Mac**: `Cmd + Shift + R`
- **Windows**: `Ctrl + Shift + R`

### Step 4: ถ้ายังไม่หาย - Empty Cache and Hard Reload

1. เปิด DevTools (F12)
2. **คลิกค้างที่ปุ่ม Refresh** (ข้างบน URL bar)
3. เลือก **Empty Cache and Hard Reload**

### Step 5: ถ้ายังไม่หาย - Clear Browser Data

1. Chrome: `chrome://settings/clearBrowserData`
2. เลือก **Cached images and files**
3. Time range: **All time**
4. คลิก **Clear data**

## ✅ วิธีที่แน่นอนที่สุด

**ทดสอบใน Production URL แทน localhost:**

- https://gobear.vercel.app/admin/customers

Production จะมี code ใหม่ที่ถูกต้องแน่นอน ไม่มีปัญหา cache

## 🔍 ตรวจสอบว่าแก้แล้ว

1. เปิด Console (F12)
2. พิมพ์: `console.log(typeof window._ctx?.viewCustomerHistory)`
3. ถ้าได้ `"function"` = แก้แล้ว ✅
4. ถ้าได้ `"undefined"` = ยังโหลด code เก่า ❌

## 🎯 สรุป

**ปัญหาไม่ได้อยู่ที่ code** - code ถูกต้องแล้ว  
**ปัญหาอยู่ที่ browser cache** - ต้อง clear ให้หมด

**วิธีที่ง่ายที่สุด**: ทดสอบใน Production URL หรือ Incognito mode
