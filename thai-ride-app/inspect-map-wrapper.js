// ========================================
// INSPECT .map-wrapper SCRIPT
// วาง script นี้ใน Console (F12)
// ========================================

(function() {
  console.log('🔍 Inspecting .map-wrapper...\n');
  
  // ========================================
  // 1. หา .map-wrapper element
  // ========================================
  const mapWrapper = document.querySelector('.map-wrapper');
  
  if (!mapWrapper) {
    console.error('❌ .map-wrapper not found!');
    return;
  }
  
  console.log('✅ Found .map-wrapper');
  
  // ========================================
  // 2. ดึง UID (data-v-* attribute)
  // ========================================
  const attributes = Array.from(mapWrapper.attributes);
  const vueUID = attributes.find(attr => attr.name.startsWith('data-v-'));
  
  console.log('\n📋 ELEMENT INFO:');
  console.log('  Tag:', mapWrapper.tagName);
  console.log('  ID:', mapWrapper.id || '(none)');
  console.log('  Classes:', mapWrapper.className);
  console.log('  Vue UID:', vueUID ? vueUID.name : '(none)');
  
  // ========================================
  // 3. ดึง Computed Styles (สไตล์ที่คำนวณแล้ว)
  // ========================================
  const computedStyles = window.getComputedStyle(mapWrapper);
  
  console.log('\n🎨 COMPUTED STYLES:');
  console.log('  Display:', computedStyles.display);
  console.log('  Visibility:', computedStyles.visibility);
  console.log('  Opacity:', computedStyles.opacity);
  console.log('  Width:', computedStyles.width);
  console.log('  Height:', computedStyles.height);
  console.log('  Position:', computedStyles.position);
  console.log('  Z-Index:', computedStyles.zIndex);
  console.log('  Overflow:', computedStyles.overflow);
  console.log('  Overflow-X:', computedStyles.overflowX);
  console.log('  Overflow-Y:', computedStyles.overflowY);
  console.log('  Background-Color:', computedStyles.backgroundColor);
  console.log('  Pointer-Events:', computedStyles.pointerEvents);
  console.log('  Transform:', computedStyles.transform);
  
  // ========================================
  // 4. ดึง Inline Styles (สไตล์ที่กำหนดเอง)
  // ========================================
  console.log('\n✏️ INLINE STYLES:');
  if (mapWrapper.style.cssText) {
    console.log('  ', mapWrapper.style.cssText);
  } else {
    console.log('  (no inline styles)');
  }
  
  // ========================================
  // 5. ดึง Bounding Box (ขนาดจริงบนหน้าจอ)
  // ========================================
  const rect = mapWrapper.getBoundingClientRect();
  
  console.log('\n📐 BOUNDING BOX:');
  console.log('  Width:', rect.width, 'px');
  console.log('  Height:', rect.height, 'px');
  console.log('  Top:', rect.top, 'px');
  console.log('  Left:', rect.left, 'px');
  console.log('  Right:', rect.right, 'px');
  console.log('  Bottom:', rect.bottom, 'px');
  
  // ========================================
  // 6. ตรวจสอบเนื้อหาภายใน (innerHTML)
  // ========================================
  console.log('\n📦 INNER CONTENT:');
  console.log('  Children count:', mapWrapper.children.length);
  
  if (mapWrapper.children.length > 0) {
    console.log('\n  Children elements:');
    Array.from(mapWrapper.children).forEach((child, index) => {
      const childStyles = window.getComputedStyle(child);
      console.log(`\n  [${index}] ${child.tagName}.${child.className}`);
      console.log('      Display:', childStyles.display);
      console.log('      Visibility:', childStyles.visibility);
      console.log('      Opacity:', childStyles.opacity);
      console.log('      Width:', childStyles.width);
      console.log('      Height:', childStyles.height);
      console.log('      Pointer-Events:', childStyles.pointerEvents);
      
      // Check for map-specific elements
      if (child.classList.contains('leaflet-container')) {
        console.log('      ✅ This is Leaflet container!');
      }
      if (child.classList.contains('map-container')) {
        console.log('      ✅ This is map container!');
      }
      if (child.tagName === 'IFRAME') {
        console.log('      ✅ This is iframe (Google Maps?)');
        console.log('      Src:', child.src);
      }
      if (child.tagName === 'CANVAS') {
        console.log('      ✅ This is canvas element');
      }
    });
  } else {
    console.log('  ⚠️ No children elements found!');
  }
  
  // ========================================
  // 7. ตรวจสอบ Leaflet-specific elements
  // ========================================
  console.log('\n🗺️ LEAFLET ELEMENTS:');
  
  const leafletContainer = mapWrapper.querySelector('.leaflet-container');
  if (leafletContainer) {
    console.log('  ✅ .leaflet-container found');
    const leafletStyles = window.getComputedStyle(leafletContainer);
    console.log('     Display:', leafletStyles.display);
    console.log('     Width:', leafletStyles.width);
    console.log('     Height:', leafletStyles.height);
    console.log('     Background:', leafletStyles.backgroundColor);
  } else {
    console.log('  ❌ .leaflet-container NOT found');
  }
  
  const leafletTilePane = mapWrapper.querySelector('.leaflet-tile-pane');
  if (leafletTilePane) {
    console.log('  ✅ .leaflet-tile-pane found');
    const paneStyles = window.getComputedStyle(leafletTilePane);
    console.log('     Opacity:', paneStyles.opacity);
    console.log('     Visibility:', paneStyles.visibility);
    console.log('     Z-Index:', paneStyles.zIndex);
  } else {
    console.log('  ❌ .leaflet-tile-pane NOT found');
  }
  
  const tiles = mapWrapper.querySelectorAll('.leaflet-tile');
  console.log('  Tiles found:', tiles.length);
  
  if (tiles.length > 0) {
    console.log('\n  First 3 tiles:');
    Array.from(tiles).slice(0, 3).forEach((tile, index) => {
      const tileStyles = window.getComputedStyle(tile);
      console.log(`\n  Tile ${index}:`);
      console.log('    Src:', tile.src);
      console.log('    Complete:', tile.complete);
      console.log('    Natural Width:', tile.naturalWidth);
      console.log('    Natural Height:', tile.naturalHeight);
      console.log('    Display Width:', tile.width);
      console.log('    Display Height:', tile.height);
      console.log('    Opacity:', tileStyles.opacity);
      console.log('    Visibility:', tileStyles.visibility);
      console.log('    Transform:', tileStyles.transform);
    });
  }
  
  // ========================================
  // 8. ตรวจสอบ Parent Elements
  // ========================================
  console.log('\n👪 PARENT ELEMENTS:');
  
  let parent = mapWrapper.parentElement;
  let level = 0;
  
  while (parent && level < 3) {
    const parentStyles = window.getComputedStyle(parent);
    console.log(`\n  Parent [${level}]: ${parent.tagName}.${parent.className}`);
    console.log('    Display:', parentStyles.display);
    console.log('    Visibility:', parentStyles.visibility);
    console.log('    Opacity:', parentStyles.opacity);
    console.log('    Overflow:', parentStyles.overflow);
    console.log('    Pointer-Events:', parentStyles.pointerEvents);
    console.log('    Width:', parentStyles.width);
    console.log('    Height:', parentStyles.height);
    
    parent = parent.parentElement;
    level++;
  }
  
  // ========================================
  // 9. สรุปปัญหา
  // ========================================
  console.log('\n' + '='.repeat(50));
  console.log('🔍 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(50));
  
  const issues = [];
  const warnings = [];
  
  // Check dimensions
  if (rect.width === 0 || rect.height === 0) {
    issues.push('❌ .map-wrapper has ZERO dimensions!');
  }
  
  // Check visibility
  if (computedStyles.display === 'none') {
    issues.push('❌ .map-wrapper has display: none');
  }
  if (computedStyles.visibility === 'hidden') {
    issues.push('❌ .map-wrapper has visibility: hidden');
  }
  if (computedStyles.opacity === '0') {
    warnings.push('⚠️ .map-wrapper has opacity: 0');
  }
  
  // Check children
  if (mapWrapper.children.length === 0) {
    issues.push('❌ .map-wrapper has NO children elements!');
  }
  
  // Check Leaflet
  if (!leafletContainer) {
    issues.push('❌ Leaflet container NOT found inside .map-wrapper');
  }
  
  if (tiles.length === 0) {
    issues.push('❌ NO map tiles found!');
  }
  
  // Check pointer events
  if (computedStyles.pointerEvents === 'none') {
    warnings.push('⚠️ .map-wrapper has pointer-events: none');
  }
  
  // Display results
  if (issues.length > 0) {
    console.log('\n❌ CRITICAL ISSUES:');
    issues.forEach(issue => console.log('  ' + issue));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️ WARNINGS:');
    warnings.forEach(warning => console.log('  ' + warning));
  }
  
  if (issues.length === 0 && warnings.length === 0) {
    console.log('\n✅ No obvious issues found!');
    console.log('   Check Network tab for tile loading errors.');
  }
  
  // ========================================
  // 10. Store results globally
  // ========================================
  window.mapWrapperInspection = {
    element: mapWrapper,
    uid: vueUID ? vueUID.name : null,
    computedStyles: {
      display: computedStyles.display,
      visibility: computedStyles.visibility,
      opacity: computedStyles.opacity,
      width: computedStyles.width,
      height: computedStyles.height,
      position: computedStyles.position,
      zIndex: computedStyles.zIndex,
      overflow: computedStyles.overflow,
      backgroundColor: computedStyles.backgroundColor,
      pointerEvents: computedStyles.pointerEvents,
      transform: computedStyles.transform
    },
    boundingBox: {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left
    },
    children: mapWrapper.children.length,
    hasLeaflet: !!leafletContainer,
    tileCount: tiles.length,
    issues,
    warnings
  };
  
  console.log('\n💾 Full inspection data saved to: window.mapWrapperInspection');
  console.log('='.repeat(50) + '\n');
  
})();
