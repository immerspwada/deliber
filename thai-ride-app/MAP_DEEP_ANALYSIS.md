# 🔬 การวิเคราะห์เจาะลึก: ทำไมแผนที่ไม่แสดงถนน

## 📊 สถานะปัจจุบัน

จากภาพที่เห็น:
```
✅ Leaflet library loaded
✅ Map instance created
✅ Zoom controls visible
✅ Attribution visible
✅ Markers rendered
❌ Tile images NOT loading (gray background)
```

---

## 🔍 Root Cause Analysis

### 1. Leaflet Tile Loading Process

```
User opens page
    ↓
Vue component mounts
    ↓
initMap() called
    ↓
L.map() creates map instance
    ↓
L.tileLayer() creates tile layer
    ↓
tileLayer.addTo(map) adds layer to map
    ↓
Leaflet calculates visible tiles
    ↓
For each tile:
      ↓
    Create <img> element
      ↓
    Set src = "https://a.tile.openstreetmap.org/13/6445/3976.png"
      ↓
    Browser fetches image
      ↓
    [THIS IS WHERE IT FAILS]
      ↓
    Image loads → Display
    OR
    Image fails → Gray tile
```

### 2. ทำไม Tiles ไม่โหลด?

#### Scenario A: Network Request ไม่ส่ง
```javascript
// ตรวจสอบใน Network Tab (F12)
// ถ้าไม่เห็น requests ไปที่ tile.openstreetmap.org
// แสดงว่า:

1. Tile layer ไม่ได้ add to map
2. Map ไม่ได้ render
3. Tile URLs ผิด
```

#### Scenario B: Network Request ส่งแต่ Failed
```javascript
// ถ้าเห็น requests แต่ status เป็น:

// 403 Forbidden
→ Tile server block requests
→ Rate limit exceeded
→ User-Agent blocked

// 404 Not Found
→ Tile URL ผิด
→ Zoom level ไม่ support

// CORS Error
→ crossOrigin not set
→ Browser security block

// Network Error
→ Internet connection issue
→ DNS resolution failed
→ Firewall blocking
```

#### Scenario C: Request สำเร็จแต่ Image ไม่แสดง
```javascript
// Status 200 OK แต่ไม่เห็นภาพ
→ CSS hiding tiles (opacity: 0, display: none)
→ Z-index issues
→ Parent container overflow: hidden
→ Image decode error
```

---

## 🧪 Diagnostic Steps

### Step 1: ตรวจสอบ Network Requests

```javascript
// เปิด Browser Console (F12)
// ไปที่ Network tab
// Filter: "tile.openstreetmap.org"

// Case 1: ไม่เห็น requests เลย
console.log('Map instance:', mapInstance.value)
console.log('Tile layer added:', map._layers)
// → Tile layer ไม่ได้ add to map

// Case 2: เห็น requests แต่ failed
// ดู status code และ response
// → Network/CORS issue

// Case 3: เห็น requests และ 200 OK
// → CSS/Rendering issue
```

### Step 2: ตรวจสอบ DOM Elements

```javascript
// ใน Console
const tiles = document.querySelectorAll('.leaflet-tile')
console.log('Tile count:', tiles.length)
// ถ้า = 0 → Tiles ไม่ได้สร้าง
// ถ้า > 0 → Tiles สร้างแล้วแต่ไม่แสดง

// ตรวจสอบ tile images
tiles.forEach((tile, i) => {
  console.log(`Tile ${i}:`, {
    src: tile.src,
    complete: tile.complete,
    naturalWidth: tile.naturalWidth,
    naturalHeight: tile.naturalHeight,
    opacity: window.getComputedStyle(tile).opacity,
    visibility: window.getComputedStyle(tile).visibility,
    display: window.getComputedStyle(tile).display
  })
})
```

### Step 3: ตรวจสอบ Leaflet Events

```javascript
// เพิ่ม event listeners
tileLayer.on('loading', () => {
  console.log('🔄 Tiles loading...')
})

tileLayer.on('load', () => {
  console.log('✅ All tiles loaded')
})

tileLayer.on('tileloadstart', (e) => {
  console.log('📥 Tile load start:', e.coords)
})

tileLayer.on('tileload', (e) => {
  console.log('✅ Tile loaded:', e.coords, e.tile.src)
})

tileLayer.on('tileerror', (e) => {
  console.error('❌ Tile error:', e.coords, e.tile.src, e.error)
})
```

---

## 🐛 Common Issues & Solutions

### Issue 1: CSS Opacity Inheritance

```css
/* ❌ Problem */
.map-container {
  opacity: 0; /* Parent opacity affects children */
}

/* Children inherit opacity */
.leaflet-tile {
  opacity: 0; /* Invisible! */
}

/* ✅ Solution */
.map-container :deep(.leaflet-tile),
.map-container :deep(.leaflet-tile-container) {
  opacity: 1 !important;
}
```

### Issue 2: Tile Layer Not Added

```typescript
// ❌ Problem
const tileLayer = L.tileLayer('...')
// Forgot to add to map!

// ✅ Solution
const tileLayer = L.tileLayer('...')
tileLayer.addTo(map)

// Or chain it
L.tileLayer('...').addTo(map)
```

### Issue 3: Wrong Tile URL

```typescript
// ❌ Problem
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png')
// Missing subdomain placeholder {s}

// ✅ Solution
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  subdomains: ['a', 'b', 'c']
})
```

### Issue 4: CORS Issues

```typescript
// ❌ Problem
L.tileLayer('https://...')
// No CORS headers

// ✅ Solution
L.tileLayer('https://...', {
  crossOrigin: true
})
```

### Issue 5: Rate Limiting

```
OpenStreetMap Usage Policy:
- Max 1 request per second
- Must have valid User-Agent
- Must not hammer servers

If exceeded:
→ 403 Forbidden
→ 429 Too Many Requests
→ Temporary ban
```

### Issue 6: Z-index Stacking

```css
/* ❌ Problem */
.map-container {
  z-index: 1;
}
.some-overlay {
  z-index: 999; /* Covers map */
}

/* ✅ Solution */
.map-container {
  z-index: 1;
  position: relative;
}
.leaflet-tile-pane {
  z-index: 200 !important;
}
```

---

## 🔧 Debugging Commands

### In Browser Console:

```javascript
// 1. Check Leaflet loaded
console.log('Leaflet:', typeof L, L.version)

// 2. Check map instance
console.log('Map:', window.mapInstance || 'Not found')

// 3. Check tile layer
const map = window.mapInstance
if (map) {
  console.log('Layers:', Object.keys(map._layers))
  Object.values(map._layers).forEach(layer => {
    console.log('Layer:', layer)
    if (layer._url) {
      console.log('Tile URL:', layer._url)
    }
  })
}

// 4. Check tiles in DOM
const tiles = document.querySelectorAll('.leaflet-tile')
console.log('Tiles in DOM:', tiles.length)
if (tiles.length > 0) {
  console.log('First tile:', {
    src: tiles[0].src,
    loaded: tiles[0].complete,
    width: tiles[0].naturalWidth,
    height: tiles[0].naturalHeight
  })
}

// 5. Check tile pane
const tilePane = document.querySelector('.leaflet-tile-pane')
if (tilePane) {
  const style = window.getComputedStyle(tilePane)
  console.log('Tile pane style:', {
    opacity: style.opacity,
    visibility: style.visibility,
    display: style.display,
    zIndex: style.zIndex
  })
}

// 6. Force tile reload
if (map) {
  map.eachLayer(layer => {
    if (layer._url) {
      layer.redraw()
      console.log('Redrawing tiles...')
    }
  })
}

// 7. Test single tile manually
const testImg = new Image()
testImg.onload = () => console.log('✅ Test tile loaded')
testImg.onerror = (e) => console.error('❌ Test tile failed:', e)
testImg.src = 'https://a.tile.openstreetmap.org/13/6445/3976.png'
```

---

## 🎯 Most Likely Causes (Ranked)

### 1. CSS Opacity/Visibility (80% probability)
```
Parent .map-container has opacity: 0
→ Children tiles inherit opacity
→ Tiles exist but invisible
```

**Fix**: Add explicit CSS rules

### 2. Tile Layer Not Added (10% probability)
```
tileLayer created but not added to map
→ No tile requests sent
→ Gray background
```

**Fix**: Ensure `.addTo(map)` is called

### 3. Network/CORS Issues (5% probability)
```
Tile requests blocked by:
- CORS policy
- Rate limiting
- Firewall
- Ad blocker
```

**Fix**: Check Network tab, try different provider

### 4. Wro