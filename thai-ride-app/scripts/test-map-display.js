#!/usr/bin/env node

/**
 * Map Display Test Script
 * ทดสอบว่าแผนที่แสดงได้หรือไม่
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🗺️  Map Display Test\n');

// Test 1: Check if MapView.vue exists
console.log('1️⃣  Checking MapView.vue...');
const mapViewPath = path.join(__dirname, '../src/components/MapView.vue');
if (fs.existsSync(mapViewPath)) {
  console.log('   ✅ MapView.vue exists');
  
  const content = fs.readFileSync(mapViewPath, 'utf-8');
  
  // Check for Leaflet import
  if (content.includes("import L from 'leaflet'")) {
    console.log('   ✅ Leaflet imported');
  } else {
    console.log('   ❌ Leaflet not imported');
  }
  
  // Check for CSS import
  if (content.includes("import 'leaflet/dist/leaflet.css'")) {
    console.log('   ✅ Leaflet CSS imported');
  } else {
    console.log('   ❌ Leaflet CSS not imported');
  }
  
  // Check for map initialization
  if (content.includes('L.map(')) {
    console.log('   ✅ Map initialization found');
  } else {
    console.log('   ❌ Map initialization not found');
  }
  
  // Check for tile layer
  if (content.includes('L.tileLayer') || content.includes('CachedTileLayer')) {
    console.log('   ✅ Tile layer found');
  } else {
    console.log('   ❌ Tile layer not found');
  }
} else {
  console.log('   ❌ MapView.vue not found');
}

console.log('');

// Test 2: Check if RideViewRefactored.vue uses MapView correctly
console.log('2️⃣  Checking RideViewRefactored.vue...');
const rideViewPath = path.join(__dirname, '../src/views/customer/RideViewRefactored.vue');
if (fs.existsSync(rideViewPath)) {
  console.log('   ✅ RideViewRefactored.vue exists');
  
  const content = fs.readFileSync(rideViewPath, 'utf-8');
  
  // Check for MapView import
  if (content.includes("import MapView from")) {
    console.log('   ✅ MapView imported');
  } else {
    console.log('   ❌ MapView not imported');
  }
  
  // Check for MapView usage
  if (content.includes('<MapView')) {
    console.log('   ✅ MapView component used');
    
    // Check for duplicate v-if
    const mapViewMatch = content.match(/<div[^>]*class="map-section"[^>]*>([\s\S]*?)<\/div>/);
    if (mapViewMatch) {
      const mapSection = mapViewMatch[1];
      const vIfCount = (mapSection.match(/v-if="pickup"/g) || []).length;
      
      if (vIfCount > 1) {
        console.log('   ⚠️  Warning: Duplicate v-if="pickup" found');
      } else if (vIfCount === 0) {
        console.log('   ✅ No conditional rendering issues');
      } else {
        console.log('   ℹ️  Single v-if found (check if needed)');
      }
    }
  } else {
    console.log('   ❌ MapView component not used');
  }
} else {
  console.log('   ❌ RideViewRefactored.vue not found');
}

console.log('');

// Test 3: Check package.json for leaflet
console.log('3️⃣  Checking package.json...');
const packagePath = path.join(__dirname, '../package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  
  if (packageJson.dependencies && packageJson.dependencies.leaflet) {
    console.log(`   ✅ Leaflet installed: ${packageJson.dependencies.leaflet}`);
  } else {
    console.log('   ❌ Leaflet not in dependencies');
  }
} else {
  console.log('   ❌ package.json not found');
}

console.log('');

// Test 4: Check if test files exist
console.log('4️⃣  Checking test files...');
const testFiles = [
  'test-leaflet-simple.html',
  'test-customer-ride-map.html',
  'MAP_DEBUG_GUIDE.md'
];

testFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file} exists`);
  } else {
    console.log(`   ❌ ${file} not found`);
  }
});

console.log('');

// Test 5: Check useLeafletMap composable
console.log('5️⃣  Checking useLeafletMap.ts...');
const composablePath = path.join(__dirname, '../src/composables/useLeafletMap.ts');
if (fs.existsSync(composablePath)) {
  console.log('   ✅ useLeafletMap.ts exists');
  
  const content = fs.readFileSync(composablePath, 'utf-8');
  
  // Check for key functions
  const functions = ['initMap', 'addMarker', 'getDirections', 'clearMarkers'];
  functions.forEach(fn => {
    if (content.includes(`const ${fn}`) || content.includes(`function ${fn}`)) {
      console.log(`   ✅ ${fn} function found`);
    } else {
      console.log(`   ❌ ${fn} function not found`);
    }
  });
} else {
  console.log('   ❌ useLeafletMap.ts not found');
}

console.log('');
console.log('═══════════════════════════════════════');
console.log('');
console.log('📋 Summary:');
console.log('');
console.log('To test the map display:');
console.log('');
console.log('1. Open test-leaflet-simple.html in browser');
console.log('   → Tests basic Leaflet functionality');
console.log('');
console.log('2. Run: npm run dev');
console.log('   → Open http://localhost:5173/customer/ride');
console.log('   → Check Browser Console for [MapView] logs');
console.log('');
console.log('3. Check Browser DevTools:');
console.log('   → Console: Look for errors');
console.log('   → Network: Check tile requests (200 OK)');
console.log('   → Elements: Verify .map-container has height');
console.log('');
console.log('4. Read MAP_DEBUG_GUIDE.md for detailed troubleshooting');
console.log('');
console.log('═══════════════════════════════════════');
