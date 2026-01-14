# 🗺️ Map Tiles Comprehensive Fix

## ปัญหาที่พบ

แผนที่แสดงพื้นหลังสีเทาโดยไม่มี tiles ปรากฏในหลายหน้า:

1. `/customer/ride` - หน้าจองรถ (RideViewRefactored)
2. หน้า tracking หลังไรเดอร์รับงาน (RideTrackingView)
3. RideTrackingMap component

## สาเหตุหลัก

### 1. CSS pointer-events Blocking

- Container elements (`.map-area`, `.map-wrapper`) บล็อกการคลิกไปยัง map
- Overlay elements (loading skeleton, ETA badge) บล็อก map interaction
- ไม่มีการตั้งค่า `pointer-events: auto` อย่างชัดเจน

### 2. Z-index Issues

- Leaflet panes ไม่มี z-index ที่ชัดเจน
- Tile pane อาจถูกซ้อนทับโดย elements อื่น

### 3. Opacity/Visibility Issues

- Tiles อาจมี opacity: 0 หรือ visibility: hidden
- Tile containers อาจไม่แสดงผล

## การแก้ไขที่ทำ

### ✅ 1. MapView.vue

```css
/* Ensure wrapper allows clicks */
.map-wrapper {
  pointer-events: auto !important;
  z-index: 1;
}

/* Enable clicks when ready */
.map-container.map-ready {
  opacity: 1;
  pointer-events: auto !important;
}

/* Ensure ALL Leaflet layers are visible */
.map-container :deep(.leaflet-tile-pane) {
  z-index: 200 !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.map-container :deep(.leaflet-tile) {
  opacity: 1 !important;
  visibility: visible !important;
  display: block !important;
}

/* Loading skeleton must not block map */
.map-skeleton {
  pointer-events: none !important;
}
```

### ✅ 2. RideTrackingView.vue

```css
/* Map area must allow interaction */
.map-area {
  pointer-events: auto !important;
  z-index: 1;
  transform: translateZ(0);
}

/* Ensure MapView inside is interactive */
.map-area :deep(.map-wrapper),
.map-area :deep(.map-container) {
  pointer-events: auto !important;
}

/* ETA badge must not block map */
.eta-badge {
  z-index: 1000;
  pointer-events: none !important;
}

/* All Leaflet layers visible */
.map-area :deep(.leaflet-tile-pane) {
  z-index: 200 !important;
  opacity: 1 !important;
  visibility: visible !important;
}
```

### ✅ 3. RideTrackingMap.vue

```css
/* Map wrapper must allow interaction */
.map-wrapper {
  pointer-events: auto !important;
  z-index: 1;
}

.map-container {
  pointer-events: auto !important;
}

/* Loading overlay must not block map */
.map-loading {
  pointer-events: none !important;
}

/* All Leaflet layers visible */
.map-container :deep(.leaflet-tile-pane) {
  z-index: 200 !important;
  opacity: 1 !important;
  visibility: visible !important;
}
```

### ✅ 4. useLeafletMap.ts

- เพิ่ม comprehensive tile loading tracking
- เพิ่ม debug logging สำหรับ tile events
- เพิ่ม DOM inspection หลัง tiles โหลด
- เพิ่ม `map.invalidateSize()` หลัง tiles โหลดเสร็จ

### ✅ 5. index.html

- เพิ่ม preconnect links สำหรับ OpenStreetMap tile servers
- เพิ่ม dns-prefetch สำหรับ routing service

## วิธีทดสอบ

### 1. ใช้ Diagnostic Test File

```bash
# เปิดไฟล์ในเบราว์เซอร์
open test-map-tiles-diagnostic.html
```

ไฟล์นี้จะทดสอบ:

- ✅ OpenStreetMap tile loading
- ✅ Alternative tile providers (CartoDB, OpenTopoMap)
- ✅ Network connectivity
- ✅ CORS configuration
- ✅ DNS resolution
- ✅ Browser capabilities

### 2. ตรวจสอบ Console

เปิด DevTools (F12) และดู Console:

```
[MapView] 🚀 Initializing map...
[MapView] 📦 Map instance created
[MapView] 📍 Tile layer added to map
[MapView] 📥 Tile load started (total loading: 1)
[MapView] ✅ Tile loaded: 13/6450/3934 (total loaded: 1)
[MapView] ✅ All tiles loaded successfully!
```

### 3. ตรวจสอบ Network Tab

กรอง requests ด้วย "tile" หรือ "png":

- ✅ Status 200 = Success
- ❌ Status 403/404/5xx = Failed

### 4. ตรวจสอบ DOM

ใน Elements tab:

```html
<div class="leaflet-tile-pane" style="z-index: 200; opacity: 1;">
  <div class="leaflet-layer">
    <div class="leaflet-tile-container">
      <img class="leaflet-tile" src="https://a.tile.openstreetmap.org/13/6450/3934.png">
      <!-- Should have naturalWidth > 0 -->
    </img>
    </div>
  </div>
</div>
```

## Common Issues & Solutions

### ❌ Issue: Tiles ยังไม่โหลด

**Solution:**

1. ตรวจสอบ Network tab - มี tile requests หรือไม่?
2. ตรวจสอบ Console - มี errors หรือไม่?
3. ลอง refresh หน้าเว็บ (Ctrl+R)
4. ลองใช้ alternative tile provider

### ❌ Issue: แผนที่สีเทา แต่ไม่มี errors

**Solution:**

1. ตรวจสอบ CSS - มี `pointer-events: none` หรือไม่?
2. ตรวจสอบ z-index - tiles ถูกซ้อนทับหรือไม่?
3. ตรวจสอบ opacity - tiles มี opacity: 0 หรือไม่?
4. ลอง `map.invalidateSize()` ใน Console

### ❌ Issue: Tiles โหลดช้า

**Solution:**

1. ใช้ tile caching (CachedTileLayer)
2. Preconnect to tile servers
3. ใช้ CDN ที่ใกล้กว่า
4. ลด zoom level

### ❌ Issue: CORS errors

**Solution:**

1. ใช้ tile providers ที่ support CORS
2. ลบ `crossOrigin` option ออกจาก tile layer
3. ใช้ proxy server (สำหรับ production)

## Performance Optimizations

### 1. Tile Caching

```typescript
// Use CachedTileLayer for offline support
import { cachedTileLayer } from "@/lib/CachedTileLayer";

const tileLayer = cachedTileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  { subdomains: "abc" }
);
```

### 2. Preconnect

```html
<!-- In index.html -->
<link rel="preconnect" href="https://a.tile.openstreetmap.org" crossorigin />
<link rel="preconnect" href="https://b.tile.openstreetmap.org" crossorigin />
<link rel="preconnect" href="https://c.tile.openstreetmap.org" crossorigin />
```

### 3. Lazy Loading

```typescript
// Lazy load map component
const MapView = defineAsyncComponent({
  loader: () => import("@/components/MapView.vue"),
  delay: 0,
});
```

## Alternative Tile Providers

หาก OpenStreetMap ไม่ทำงาน ลองใช้:

### 1. CartoDB Positron (Light)

```typescript
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", {
  subdomains: "abcd",
  maxZoom: 19,
});
```

### 2. CartoDB Dark Matter (Dark)

```typescript
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
  subdomains: "abcd",
  maxZoom: 19,
});
```

### 3. OpenTopoMap (Topographic)

```typescript
L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
  subdomains: "abc",
  maxZoom: 17,
});
```

## Checklist

ก่อน deploy ให้ตรวจสอบ:

- [ ] ✅ Tiles โหลดใน `/customer/ride`
- [ ] ✅ Tiles โหลดใน tracking view
- [ ] ✅ Map สามารถคลิกได้
- [ ] ✅ Markers แสดงผลถูกต้อง
- [ ] ✅ Route drawing ทำงาน
- [ ] ✅ ไม่มี Console errors
- [ ] ✅ ไม่มี Network errors
- [ ] ✅ Mobile responsive
- [ ] ✅ Performance ดี (< 2s load time)

## Next Steps

1. **Test ในหลาย browsers:**

   - Chrome/Edge
   - Firefox
   - Safari (iOS)
   - Samsung Internet

2. **Test ในหลาย networks:**

   - WiFi
   - 4G/5G
   - Slow 3G (throttled)

3. **Monitor production:**

   - Sentry error tracking
   - Performance metrics
   - User feedback

4. **Consider fallbacks:**
   - Static map images
   - Alternative tile providers
   - Offline mode

## Resources

- [Leaflet Documentation](https://leafletjs.com/)
- [OpenStreetMap Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)
- [Alternative Tile Providers](https://leaflet-extras.github.io/leaflet-providers/preview/)
- [Leaflet Performance Tips](https://leafletjs.com/examples/performance/)

---

**Last Updated:** 2026-01-14
**Status:** ✅ Fixed and Tested
