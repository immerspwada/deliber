# 🔍 Admin Customers - Buttons Not Visible Debug Guide

**วันที่**: 2026-01-29  
**ปัญหา**: ไม่เห็นปุ่ม Action buttons ทั้งหมด (View, History, Suspend)  
**สถานะ**: 🔥 CRITICAL - ต้องแก้ทันที

---

## 🚨 ปัญหา

User รายงานว่า **ไม่เห็นปุ่ม Action buttons เลย** ในตาราง Customers:

- ❌ ไม่เห็นปุ่ม "ดูรายละเอียด" (ไอคอนตา)
- ❌ ไม่เห็นปุ่ม "ดูประวัติ" (ไอคอนนาฬิกา)
- ❌ ไม่เห็นปุ่ม "ระงับ" (ไอคอนห้าม)

แต่โค้ดมีอยู่แล้วในไฟล์ (บรรทัด 385-430)

---

## 🔍 สาเหตุที่เป็นไปได้

### 1. JavaScript Error (มีโอกาสสูงสุด)

**อาการ**: Component ไม่ render เพราะมี error

**วิธีเช็ค**:

1. กด `F12` เปิด DevTools
2. ไปที่ tab **Console**
3. ดูว่ามี error สีแดงหรือไม่

**Error ที่มักเจอ**:

```
❌ Uncaught TypeError: Cannot read property 'xxx' of undefined
❌ Uncaught ReferenceError: xxx is not defined
❌ [Vue warn]: Failed to resolve component
❌ Uncaught (in promise) Error: ...
```

**วิธีแก้**:

- ถ้าเจอ error → แจ้งข้อความ error มาให้ฉันแก้
- ถ้าไม่มี error → ไปขั้นตอนถัดไป

---

### 2. CSS ซ่อนปุ่ม

**อาการ**: ปุ่มมีใน DOM แต่ถูก CSS ซ่อน

**วิธีเช็ค**:

1. กด `F12` เปิด DevTools
2. ไปที่ tab **Elements**
3. กด `Cmd/Ctrl + F` → ค้นหา `btn-action`
4. ดูว่าเจอ `<button class="btn-action">` หรือไม่

**ถ้าเจอ**:

- คลิกขวาที่ปุ่ม → **Inspect**
- ดูที่ **Styles** panel ขวามือ
- เช็คว่ามี CSS ที่ทำให้ซ่อน:
  ```css
  display: none;
  visibility: hidden;
  opacity: 0;
  width: 0;
  height: 0;
  ```

**วิธีแก้**:

- ลบ CSS ที่ซ่อนออก
- หรือแจ้งมาให้ฉันแก้

---

### 3. Table ไม่ render

**อาการ**: ตารางว่างเปล่า หรือแสดง Loading/Error state

**วิธีเช็ค**:

1. ดูว่าเห็นข้อมูลลูกค้าในตารางหรือไม่
2. ถ้าไม่เห็น = ตารางไม่ render

**สาเหตุ**:

- `customers` array ว่าง
- `loading` = true ค้างอยู่
- `error` มีค่า

**วิธีเช็ค**:

```javascript
// เปิด Console → พิมพ์
console.log("customers:", customers);
console.log("loading:", loading);
console.log("error:", error);
```

---

### 4. v-if Condition ผิด

**อาการ**: ปุ่มไม่แสดงเพราะ condition ไม่ผ่าน

**โค้ดที่เกี่ยวข้อง**:

```vue
<td class="td-actions">
  <div class="action-buttons">
    <!-- ปุ่มเหล่านี้ต้องแสดงเสมอ -->
    <button class="btn-action btn-view" ...>
    <button class="btn-action btn-history" ...>
    
    <!-- ปุ่มนี้มี v-if -->
    <button v-if="customer.status !== 'suspended'" ...>
  </div>
</td>
```

**วิธีเช็ค**:

```javascript
// เปิด Console → พิมพ์
const firstCustomer = customers[0];
console.log("customer:", firstCustomer);
console.log("status:", firstCustomer?.status);
```

---

## 🛠️ วิธีแก้ปัญหา (ทำตามลำดับ)

### ขั้นตอนที่ 1: เช็ค Console Errors

1. เปิด `http://localhost:5173/admin/customers`
2. กด `F12` → tab **Console**
3. **ถ้ามี error สีแดง**:
   - Screenshot error message
   - แจ้งมาให้ฉันแก้ทันที
4. **ถ้าไม่มี error**:
   - ไปขั้นตอนที่ 2

---

### ขั้นตอนที่ 2: เช็คว่าตารางมีข้อมูล

1. ดูที่หน้าเว็บ
2. **ถ้าเห็นข้อมูลลูกค้า** (ชื่อ, อีเมล, เบอร์โทร):
   - ✅ ตารางทำงานปกติ
   - ปัญหาอยู่ที่ปุ่ม → ไปขั้นตอนที่ 3
3. **ถ้าไม่เห็นข้อมูล**:
   - ❌ ตารางไม่ render
   - เช็ค Console errors
   - เช็ค Network tab (F12 → Network)

---

### ขั้นตอนที่ 3: เช็คว่าปุ่มมีใน DOM

1. กด `F12` → tab **Elements**
2. กด `Cmd/Ctrl + F` → ค้นหา `btn-action`
3. **ถ้าเจอ `<button class="btn-action">`**:
   - ✅ ปุ่มมีใน DOM
   - ปัญหาคือ CSS ซ่อน → ไปขั้นตอนที่ 4
4. **ถ้าไม่เจอ**:
   - ❌ ปุ่มไม่ถูก render
   - มี JavaScript error แน่นอน
   - กลับไปเช็ค Console อีกครั้ง

---

### ขั้นตอนที่ 4: เช็ค CSS

1. คลิกขวาที่ปุ่ม (ใน Elements tab) → **Inspect**
2. ดูที่ **Styles** panel ขวามือ
3. เช็คว่ามี CSS ที่ทำให้ซ่อน:
   ```css
   /* ❌ CSS ที่ทำให้ซ่อน */
   display: none;
   visibility: hidden;
   opacity: 0;
   width: 0;
   height: 0;
   ```
4. **ถ้าเจอ**:
   - Uncheck CSS นั้น (คลิกที่ checkbox)
   - ดูว่าปุ่มแสดงหรือไม่
   - แจ้งมาให้ฉันแก้ CSS

---

### ขั้นตอนที่ 5: Force Reload

1. Clear cache ทั้งหมด:
   ```bash
   ./force-clear-dev-cache.sh
   ```
2. Hard Refresh:
   ```
   Cmd + Shift + R (Mac)
   Ctrl + Shift + R (Windows)
   ```
3. Clear Service Worker:
   - F12 → Application → Service Workers → Unregister
4. ลอง Incognito mode:
   ```
   Cmd + Shift + N (Mac)
   Ctrl + Shift + N (Windows)
   ```

---

## 🔍 Debug Commands

### เช็คว่าปุ่มมีใน DOM

```javascript
// เปิด Console → พิมพ์
document.querySelectorAll(".btn-action");
// ถ้าได้ NodeList(3) = มี 3 ปุ่ม ✅
// ถ้าได้ NodeList(0) = ไม่มีปุ่ม ❌
```

### เช็คว่า CSS ซ่อนปุ่ม

```javascript
// เปิด Console → พิมพ์
const btn = document.querySelector(".btn-action");
if (btn) {
  const styles = window.getComputedStyle(btn);
  console.log("display:", styles.display);
  console.log("visibility:", styles.visibility);
  console.log("opacity:", styles.opacity);
  console.log("width:", styles.width);
  console.log("height:", styles.height);
}
// ถ้า display: none = ถูก CSS ซ่อน ❌
```

### เช็คว่า Component มี error

```javascript
// เปิด Console → พิมพ์
console.log("Vue app:", window.__VUE_DEVTOOLS_GLOBAL_HOOK__);
// ถ้าได้ undefined = Vue ไม่ทำงาน ❌
```

---

## 📸 ข้อมูลที่ต้องการ

กรุณา screenshot หรือ copy ข้อมูลเหล่านี้มา:

### 1. Console Errors

```
F12 → Console → Screenshot ทั้งหมด
```

### 2. Network Errors

```
F12 → Network → Filter: "CustomersView" → Screenshot
```

### 3. Elements Tab

```
F12 → Elements → Search: "btn-action" → Screenshot
```

### 4. Computed Styles

```
F12 → Elements → Select button → Styles panel → Screenshot
```

---

## 🚀 Quick Fix (ถ้าเป็น CSS)

ถ้าเจอว่า CSS ซ่อนปุ่ม ให้เพิ่ม CSS นี้ชั่วคราว:

```css
/* เพิ่มใน src/admin/views/CustomersView.vue */
<style scoped>
/* Force show buttons */
.btn-action {
  display: inline-flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  width: auto !important;
  height: auto !important;
}
</style>
```

---

## 📊 สรุป

| ปัญหา                | สาเหตุ           | วิธีเช็ค       | วิธีแก้       |
| -------------------- | ---------------- | -------------- | ------------- |
| ไม่เห็นปุ่มเลย       | JavaScript Error | F12 → Console  | แจ้ง error มา |
| ปุ่มมีแต่ซ่อน        | CSS ซ่อน         | F12 → Elements | แก้ CSS       |
| ตารางว่าง            | Data ไม่โหลด     | F12 → Network  | เช็ค API      |
| Component ไม่ render | Vue error        | F12 → Console  | แจ้ง error มา |

---

## 🎯 ขั้นตอนถัดไป

1. ✅ เปิด `http://localhost:5173/admin/customers`
2. ✅ กด `F12` → เช็ค Console
3. ✅ ถ้ามี error → Screenshot แจ้งมา
4. ✅ ถ้าไม่มี error → เช็ค Elements tab
5. ✅ ค้นหา `btn-action` → Screenshot แจ้งมา

---

**สถานะ**: ⏳ รอข้อมูล Debug จาก User  
**Priority**: 🔥 CRITICAL  
**Next Action**: รอ Console errors หรือ Elements screenshot
