# 🔍 Map Tiles Diagnostic Script

## วิธีใช้งาน

เปิด DevTools (F12) ในหน้าที่มีแผนที่สีเทา แล้ววาง script นี้ใน Console:

```javascript
// ========================================
// MAP TILES DIAGNOSTIC SCRIPT
// ========================================

(function () {
  console.log("🔍 Starting Map Tiles Diagnostic...\n");

  const results = {
    timestamp: new Date().toISOString(),
    errors: [],
    warnings: [],
    info: [],
  };

  // ========================================
  // 1. ตรวจสอบ Console Errors
  // ========================================
  console.log("📋 Step 1: Checking Console Errors...");

  // Store original console.error
  const originalError = console.error;
  const consoleErrors = [];

  console.error = function (...args) {
    consoleErrors.push(args.join(" "));
    originalError.apply(console, args);
  };

  results.info.push("Console error monitoring enabled");

  // ========================================
  // 2. ตรวจสอบ Map Container Elements
  // ========================================
  console.log("\n📦 Step 2: Checking Map Container Elements...");

  const selectors = [
    ".map-area",
    ".map-wrapper",
    ".map-container",
    ".map-container.map-ready",
    ".leaflet-container",
    ".leaflet-tile-pane",
  ];

  selectors.forEach((selector) => {
    const element = document.querySelector(selector);

    if (!element) {
      results.errors.push(`❌ Element not found: ${selector}`);
      console.error(`❌ Element not found: ${selector}`);
      return;
    }

    const styles = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    const elementInfo = {
      selector,
      dimensions: {
        width: styles.width,
        height: styles.height,
        computedWidth: rect.width,
        computedHeight: rect.height,
      },
      visibility: {
        display: styles.display,
        visibility: styles.visibility,
        opacity: styles.opacity,
        pointerEvents: styles.pointerEvents,
      },
      position: {
        position: styles.position,
        zIndex: styles.zIndex,
        transform: styles.transform,
      },
    };

    console.log(`✅ ${selector}:`, elementInfo);

    // Check for issues
    if (rect.width === 0 || rect.height === 0) {
      results.errors.push(
        `❌ ${selector} has zero dimensions: ${rect.width}x${rect.height}`
      );
    }

    if (styles.display === "none") {
      results.errors.push(`❌ ${selector} has display: none`);
    }

    if (styles.visibility === "hidden") {
      results.errors.push(`❌ ${selector} has visibility: hidden`);
    }

    if (styles.opacity === "0") {
      results.warnings.push(`⚠️ ${selector} has opacity: 0`);
    }

    if (styles.pointerEvents === "none" && selector.includes("map-container")) {
      results.warnings.push(`⚠️ ${selector} has pointer-events: none`);
    }
  });

  // ========================================
  // 3. ตรวจสอบ Tile Images
  // ========================================
  console.log("\n🖼️ Step 3: Checking Tile Images...");

  const tiles = document.querySelectorAll(".leaflet-tile");
  console.log(`Found ${tiles.length} tile elements`);

  if (tiles.length === 0) {
    results.errors.push("❌ No tile elements found in DOM");
  } else {
    let loadedTiles = 0;
    let failedTiles = 0;
    let pendingTiles = 0;

    tiles.forEach((tile, index) => {
      const img = tile;
      const styles = window.getComputedStyle(img);

      const tileInfo = {
        index,
        src: img.src,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth: img.width,
        displayHeight: img.height,
        opacity: styles.opacity,
        visibility: styles.visibility,
        display: styles.display,
        transform: styles.transform,
      };

      if (img.complete && img.naturalWidth > 0) {
        loadedTiles++;
        if (index < 3) console.log(`✅ Tile ${index} loaded:`, tileInfo);
      } else if (img.complete && img.naturalWidth === 0) {
        failedTiles++;
        results.errors.push(`❌ Tile ${index} failed to load: ${img.src}`);
        if (index < 3) console.error(`❌ Tile ${index} failed:`, tileInfo);
      } else {
        pendingTiles++;
        if (index < 3) console.log(`⏳ Tile ${index} pending:`, tileInfo);
      }

      // Check visibility
      if (styles.opacity === "0") {
        results.warnings.push(`⚠️ Tile ${index} has opacity: 0`);
      }
      if (styles.visibility === "hidden") {
        results.warnings.push(`⚠️ Tile ${index} has visibility: hidden`);
      }
    });

    console.log(`\n📊 Tile Summary:`);
    console.log(`  ✅ Loaded: ${loadedTiles}`);
    console.log(`  ❌ Failed: ${failedTiles}`);
    console.log(`  ⏳ Pending: ${pendingTiles}`);

    results.info.push(
      `Tiles: ${loadedTiles} loaded, ${failedTiles} failed, ${pendingTiles} pending`
    );
  }

  // ========================================
  // 4. ตรวจสอบ Network Requests
  // ========================================
  console.log("\n🌐 Step 4: Checking Network Requests...");
  console.log(
    '⚠️ Please check Network tab manually and filter by "tile" or "png"'
  );
  console.log("Look for failed requests (red) with status codes:");
  console.log("  - 401: Unauthorized (API Key issue)");
  console.log("  - 403: Forbidden (Permission issue)");
  console.log("  - 404: Not Found (Wrong URL)");
  console.log("  - 5xx: Server Error");

  results.info.push("Network tab check required - see console instructions");

  // ========================================
  // 5. ตรวจสอบ Leaflet Configuration
  // ========================================
  console.log("\n⚙️ Step 5: Checking Leaflet Configuration...");

  if (typeof L !== "undefined") {
    console.log("✅ Leaflet library loaded:", L.version);
    results.info.push(`Leaflet version: ${L.version}`);

    // Try to find map instance
    const mapContainer = document.querySelector(".leaflet-container");
    if (mapContainer && mapContainer._leaflet_id) {
      console.log("✅ Leaflet map instance found");
      results.info.push("Leaflet map instance exists");
    } else {
      results.errors.push("❌ Leaflet map instance not found");
    }
  } else {
    results.errors.push("❌ Leaflet library not loaded");
  }

  // ========================================
  // 6. ตรวจสอบ Tile Layer URL
  // ========================================
  console.log("\n🔗 Step 6: Testing Tile URL...");

  const testTileUrl = "https://a.tile.openstreetmap.org/13/6450/3934.png";
  console.log(`Testing: ${testTileUrl}`);

  fetch(testTileUrl)
    .then((response) => {
      if (response.ok) {
        console.log("✅ Tile URL is accessible");
        results.info.push("Test tile URL is accessible");
      } else {
        console.error(`❌ Tile URL returned status: ${response.status}`);
        results.errors.push(`Tile URL returned status: ${response.status}`);
      }
    })
    .catch((error) => {
      console.error("❌ Failed to fetch test tile:", error.message);
      results.errors.push(`Failed to fetch test tile: ${error.message}`);
    });

  // ========================================
  // 7. สรุปผล
  // ========================================
  setTimeout(() => {
    console.log("\n" + "=".repeat(50));
    console.log("📊 DIAGNOSTIC SUMMARY");
    console.log("=".repeat(50));

    if (results.errors.length > 0) {
      console.log("\n❌ ERRORS FOUND:");
      results.errors.forEach((err) => console.log(`  ${err}`));
    }

    if (results.warnings.length > 0) {
      console.log("\n⚠️ WARNINGS:");
      results.warnings.forEach((warn) => console.log(`  ${warn}`));
    }

    if (results.info.length > 0) {
      console.log("\n✅ INFO:");
      results.info.forEach((info) => console.log(`  ${info}`));
    }

    console.log("\n" + "=".repeat(50));
    console.log("💡 RECOMMENDATIONS:");
    console.log("=".repeat(50));

    if (results.errors.some((e) => e.includes("zero dimensions"))) {
      console.log("\n1. Fix Container Dimensions:");
      console.log("   Add CSS: height: 400px; (or appropriate height)");
    }

    if (results.errors.some((e) => e.includes("display: none"))) {
      console.log("\n2. Fix Display Property:");
      console.log("   Change CSS: display: block; (or flex/grid)");
    }

    if (results.errors.some((e) => e.includes("failed to load"))) {
      console.log("\n3. Check Tile URL and API Key:");
      console.log("   - Verify tile URL is correct");
      console.log("   - Check API key (if required)");
      console.log("   - Check Network tab for error details");
    }

    if (results.warnings.some((w) => w.includes("opacity: 0"))) {
      console.log("\n4. Fix Opacity:");
      console.log("   Add CSS: opacity: 1 !important;");
    }

    if (results.errors.some((e) => e.includes("Leaflet"))) {
      console.log("\n5. Fix Leaflet Initialization:");
      console.log("   - Ensure Leaflet is loaded before map init");
      console.log("   - Check JavaScript console for errors");
    }

    console.log("\n" + "=".repeat(50));
    console.log(
      "Full results object available as: window.mapDiagnosticResults"
    );
    console.log("=".repeat(50) + "\n");

    // Store results globally
    window.mapDiagnosticResults = results;
  }, 2000);

  console.log("\n⏳ Diagnostic running... Results will appear in 2 seconds.\n");
})();
```

## 📋 คำแนะนำเพิ่มเติม

### หลังรัน Script แล้ว:

1. **ดูผลลัพธ์ใน Console** - จะแสดง summary ของปัญหาที่พบ

2. **ตรวจสอบ Network Tab**:

   ```
   - กด F12 → Network tab
   - Refresh หน้าเว็บ (Ctrl+R)
   - กรองด้วย "tile" หรือ "png"
   - มองหา requests สีแดง (failed)
   - คลิกดู Response เพื่อดูสาเหตุ
   ```

3. **ดู Full Results**:
   ```javascript
   // ใน Console พิมพ์:
   window.mapDiagnosticResults;
   ```

### สาเหตุที่พบบ่อย:

| ปัญหา           | สาเหตุ                 | วิธีแก้                       |
| --------------- | ---------------------- | ----------------------------- |
| Zero dimensions | Container ไม่มี height | เพิ่ม `height: 400px`         |
| display: none   | Container ถูกซ่อน      | เปลี่ยนเป็น `display: block`  |
| 401/403 errors  | API Key ผิด            | ตรวจสอบ API Key               |
| 404 errors      | URL ผิด                | แก้ไข tile URL                |
| opacity: 0      | CSS ซ่อน tiles         | เพิ่ม `opacity: 1 !important` |
| No tiles in DOM | Leaflet ไม่ทำงาน       | ตรวจสอบ JavaScript errors     |

### Quick Fixes:

```css
/* Fix 1: Container Dimensions */
.map-area,
.map-wrapper,
.map-container {
  width: 100% !important;
  height: 400px !important;
  min-height: 400px !important;
}

/* Fix 2: Visibility */
.map-area,
.map-wrapper,
.map-container,
.leaflet-tile-pane,
.leaflet-tile {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}

/* Fix 3: Pointer Events */
.map-container.map-ready {
  pointer-events: auto !important;
}

/* Fix 4: Z-index */
.leaflet-tile-pane {
  z-index: 200 !important;
}
```

### Test Tile URL Manually:

เปิด URL นี้ในเบราว์เซอร์:

```
https://a.tile.openstreetmap.org/13/6450/3934.png
```

ถ้าเห็นรูปแผนที่ = Tile server ทำงานปกติ  
ถ้าเห็น error = มีปัญหากับ tile server หรือ network

---

**หมายเหตุ**: Script นี้จะช่วยระบุปัญหาได้แม่นยำ กรุณารัน script แล้วส่งผลลัพธ์มาให้ผมดูครับ
