# 🗺️ Quick Test - Map Fix

**วันที่:** 2026-01-14  
**เวลาทดสอบ:** ~2 นาที

---

## ✅ Quick Checklist

```bash
# 1. Start dev server (ถ้ายังไม่ได้รัน)
npm run dev

# 2. เปิด browser
open http://localhost:5173/customer/ride
```

---

## 🧪 ขั้นตอนทดสอบ (2 นาที)

### ขั้นที่ 1: เปิดหน้า Ride (10 วินาที)

```
URL: http://localhost:5173/customer/ride
```

**คาดหวัง:**

- ✅ หน้าโหลดเสร็จภายใน 2 วินาที
- ✅ เห็น loading skeleton ของแผนที่
- ✅ แผนที่แสดงผลภายใน 3 วินาที

### ขั้นที่ 2: ตรวจสอบแผนที่ (20 วินาที)

**ดูว่า:**

- ✅ แผนที่แสดงผล (เห็น tiles)
- ✅ มี zoom controls (+/-)
- ✅ สามารถ zoom in/out ได้
- ✅ สามารถ pan (ลากแผนที่) ได้

### ขั้นที่ 3: ทดสอบ Location (30 วินาที)

**ทำ:**

1. อนุญาต location permission (ถ้าถาม)
2. รอ 2-3 วินาที

**คาดหวัง:**

- ✅ เห็น marker สีเขียว (current location)
- ✅ แผนที่ zoom เข้าที่ตำแหน่งปัจจุบัน

### ขั้นที่ 4: ทดสอบเลือกปลายทาง (40 วินาที)

**ทำ:**

1. พิมพ์ชื่อสถานที่ในช่องค้นหา (เช่น "Central World")
2. เลือกจากผลการค้นหา

**คาดหวัง:**

- ✅ เห็น marker สีแดง (destination)
- ✅ เห็นเส้น route วาดระหว่าง 2 จุด
- ✅ เห็นข้อมูล distance และ duration
- ✅ แผนที่ zoom ให้เห็นทั้ง 2 จุด

### ขั้นที่ 5: ทดสอบ Click บนแผนที่ (20 วินาที)

**ทำ:**

1. คลิกที่ใดก็ได้บนแผนที่

**คาดหวัง:**

- ✅ Marker ปลายทางเปลี่ยนตำแหน่ง
- ✅ Route วาดใหม่
- ✅ ข้อมูล distance/duration อัพเดท

---

## 🔍 Browser Console Check

เปิด DevTools (F12) และตรวจสอบ:

### ✅ ไม่มี Errors

```javascript
// ไม่ควรเห็น errors เหล่านี้:
❌ "L is not defined"
❌ "map is not defined"
❌ "Cannot read property 'on' of undefined"
```

### ✅ เห็น Success Logs

```javascript
// ควรเห็น logs เหล่านี้:
✅ "[MapView] Using default center (Bangkok)"
✅ "[MapView] Map initialized successfully"
✅ "[MapView] Updating markers..."
```

### ✅ Leaflet Loaded

```javascript
// ทดสอบใน console:
typeof L; // ควรได้ "object"
L.version; // ควรได้ "1.9.4"
```

---

## 📱 Mobile Test (Optional)

### iOS Safari

1. เปิด http://localhost:5173/customer/ride
2. ทดสอบ pinch to zoom
3. ทดสอบ tap บนแผนที่

### Android Chrome

1. เปิด http://localhost:5173/customer/ride
2. ทดสอบ touch gestures
3. ทดสอบ location permission

---

## 🐛 Troubleshooting

### แผนที่ไม่แสดง

```bash
# 1. ตรวจสอบ Leaflet CDN
curl -I https://unpkg.com/leaflet@1.9.4/dist/leaflet.js

# 2. Clear browser cache
Cmd+Shift+R (Mac) หรือ Ctrl+Shift+R (Windows)

# 3. Restart dev server
npm run dev
```

### Tiles ไม่โหลด

```bash
# ตรวจสอบ internet connection
ping 8.8.8.8

# ตรวจสอบ CartoDB CDN
curl -I https://a.basemaps.cartocdn.com/light_all/13/6451/3929.png
```

### Console Errors

```bash
# Type check
npm run type-check

# Lint check
npm run lint
```

---

## 📊 Performance Check

### Network Tab (DevTools)

**ตรวจสอบ:**

- ✅ Leaflet CSS: ~15KB
- ✅ Leaflet JS: ~145KB
- ✅ Map tiles: ~50KB each
- ✅ Total load time: < 2s

### Performance Tab

**ตรวจสอบ:**

- ✅ LCP (Largest Contentful Paint): < 2.5s
- ✅ CLS (Cumulative Layout Shift): < 0.1
- ✅ FCP (First Contentful Paint): < 1.8s

---

## ✅ Success Criteria

### ผ่านการทดสอบถ้า:

- [x] แผนที่แสดงผลภายใน 3 วินาที
- [x] Tiles โหลดสมบูรณ์
- [x] Markers แสดงถูกต้อง
- [x] Route drawing ทำงาน
- [x] Interactive controls ทำงาน
- [x] ไม่มี console errors
- [x] Mobile responsive

---

## 🎯 Test Files

### Isolated Test

```bash
# ทดสอบ Leaflet แยกต่างหาก
open test-map-isolated.html
```

### Full Page Test

```bash
# ทดสอบหน้า ride ทั้งหมด
open test-customer-ride-page.html
```

---

## 📝 Test Results Template

```markdown
## Test Results - [วันที่]

### Environment

- Browser: [Chrome/Safari/Firefox]
- OS: [macOS/Windows/Linux]
- Screen: [Desktop/Mobile]

### Results

- [ ] แผนที่แสดงผล
- [ ] Tiles โหลด
- [ ] Markers แสดง
- [ ] Route drawing
- [ ] Interactive controls
- [ ] No console errors

### Issues Found

[ระบุปัญหาที่พบ หรือเขียน "None"]

### Performance

- Load time: [X] seconds
- LCP: [X] seconds
- CLS: [X]

### Notes

[บันทึกเพิ่มเติม]
```

---

## 🚀 Next Steps

### ถ้าทดสอบผ่าน:

1. ✅ Mark task as complete
2. ✅ Update documentation
3. ✅ Commit changes
4. ✅ Deploy to staging

### ถ้าทดสอบไม่ผ่าน:

1. ❌ Check console errors
2. ❌ Review MAP_FIX_COMPLETE.md
3. ❌ Test with test-map-isolated.html
4. ❌ Report issues

---

**Last Updated:** 2026-01-14  
**Status:** 🟢 READY FOR TESTING
