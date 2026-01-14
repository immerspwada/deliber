# 🚀 Quick Test - Customer Ride Page

## เปิดหน้าทดสอบ

```bash
# Dev server กำลังรันอยู่แล้ว
# เปิดเบราว์เซอร์ไปที่:
http://localhost:5173/customer/ride
```

## ✅ Test Checklist (5 นาที)

### 1. หน้าโหลดได้ (30 วินาที)

- [ ] หน้าแสดงผลไม่มี error
- [ ] แผนที่โหลดได้
- [ ] ปุ่มต่างๆ แสดงผล

### 2. GPS Location (1 นาที)

- [ ] ระบบขอ permission GPS
- [ ] แสดงตำแหน่งปัจจุบัน
- [ ] หรือใช้ตำแหน่ง default (Bangkok)

### 3. ค้นหาปลายทาง (1 นาที)

- [ ] พิมพ์ในช่องค้นหา "สยาม"
- [ ] แสดงผลลัพธ์การค้นหา
- [ ] คลิกเลือกสถานที่

### 4. เลือกจากแผนที่ (30 วินาที)

- [ ] คลิกบนแผนที่
- [ ] ระบบตั้งเป็นปลายทาง
- [ ] แสดง booking panel

### 5. Booking Panel (1 นาที)

- [ ] แสดงประเภทรถ (มอเตอร์ไซค์, รถยนต์, พรีเมียม)
- [ ] แสดงค่าโดยสาร
- [ ] แสดงระยะทางและเวลา
- [ ] ปุ่มจองทำงาน

### 6. Pull to Refresh (30 วินาที)

- [ ] ดึงหน้าลง (pull down)
- [ ] แสดง refresh indicator
- [ ] รีเฟรชตำแหน่ง

### 7. Responsive (30 วินาที)

- [ ] ลองย่อ/ขยายหน้าต่าง
- [ ] ทุกอย่างแสดงผลถูกต้อง
- [ ] Touch targets ใหญ่พอ

## 🐛 ถ้าเจอปัญหา

### หน้าไม่โหลด

```bash
# ตรวจสอบ dev server
npm run dev

# หรือ restart
# Ctrl+C แล้ว npm run dev ใหม่
```

### แผนที่ไม่แสดง

- ตรวจสอบ console (F12)
- ตรวจสอบ internet connection
- ลอง refresh (Cmd+R / Ctrl+R)

### GPS ไม่ทำงาน

- อนุญาต location permission
- ลอง refresh หน้า
- ระบบจะใช้ Bangkok เป็น default

### ปุ่มจองไม่ทำงาน

- ตรวจสอบว่าเลือกปลายทางแล้ว
- ตรวจสอบว่า login แล้ว
- ดู console logs

## 📸 Screenshot Checklist

ถ่ายภาพหน้าจอเหล่านี้:

1. หน้าแรก (แผนที่ + ช่องค้นหา)
2. ผลการค้นหา
3. Booking panel
4. Pull to refresh indicator

## 🎯 Expected Results

### ✅ Success

- หน้าโหลดเร็ว (< 2 วินาที)
- แผนที่แสดงผล
- ค้นหาได้
- เลือกปลายทางได้
- Booking panel แสดงผล
- Animations ลื่นไหล

### ⚠️ Acceptable

- GPS ใช้เวลา 5-10 วินาที
- ค้นหาใช้เวลา 1-2 วินาที
- แผนที่โหลดช้าเล็กน้อย

### ❌ Issues

- หน้าไม่โหลด
- Error ใน console
- ปุ่มไม่ทำงาน
- Layout พัง

## 🔍 Debug Commands

```bash
# ดู console logs
# เปิด DevTools (F12) → Console

# ดู network requests
# DevTools → Network

# ดู Vue DevTools
# ติดตั้ง Vue DevTools extension

# ตรวจสอบ TypeScript
npm run type-check

# ตรวจสอบ diagnostics
# ใช้ getDiagnostics tool
```

## 📝 Report Template

```markdown
## Test Results

**Date**: [วันที่]
**Browser**: [Chrome/Safari/Firefox]
**Device**: [Desktop/Mobile]

### ✅ Working

- [ ] หน้าโหลด
- [ ] GPS
- [ ] ค้นหา
- [ ] เลือกปลายทาง
- [ ] Booking panel

### ❌ Issues

1. [อธิบายปัญหา]
2. [อธิบายปัญหา]

### 📸 Screenshots

[แนบภาพ]

### 💡 Suggestions

[ข้อเสนอแนะ]
```

---

**เวลาทดสอบทั้งหมด**: ~5 นาที
**ผลลัพธ์ที่คาดหวัง**: ทุกอย่างทำงานได้ ✅
