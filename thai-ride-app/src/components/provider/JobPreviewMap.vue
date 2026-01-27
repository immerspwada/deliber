<script setup lang="ts">
/**
 * Job Preview Map Component
 * แสดงแผนที่ preview ของ pickup/dropoff ก่อนรับงาน
 * 
 * Features:
 * - แสดง pickup และ dropoff markers
 * - แสดงเส้นทางระหว่าง 2 จุด
 * - แสดงระยะทางและเวลาโดยประมาณ
 * - ปุ่มเปิด Google Maps
 */
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'

interface Props {
  pickupLat: number
  pickupLng: number
  dropoffLat: number
  dropoffLng: number
  pickupAddress?: string
  dropoffAddress?: string
  show?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pickupAddress: '',
  dropoffAddress: '',
  show: true
})

const emit = defineEmits<{
  close: []
  openGoogleMaps: []
}>()

// State
const mapContainer = ref<HTMLElement | null>(null)
 
let map: any = null
 
let pickupMarker: any = null
 
let dropoffMarker: any = null
 
let routeLine: any = null

const loading = ref(true)
const error = ref<string | null>(null)

// Calculate distance between pickup and dropoff
const distance = computed(() => {
  const R = 6371
  const dLat = (props.dropoffLat - props.pickupLat) * Math.PI / 180
  const dLng = (props.dropoffLng - props.pickupLng) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(props.pickupLat * Math.PI / 180) * Math.cos(props.dropoffLat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
})

// Estimate travel time (assume 25 km/h average in Bangkok traffic)
const estimatedTime = computed(() => {
  const hours = distance.value / 25
  const minutes = Math.round(hours * 60)
  if (minutes < 60) return `${minutes} นาที`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} ชม. ${m} นาที` : `${h} ชม.`
})

// Format distance
const formattedDistance = computed(() => {
  if (distance.value < 1) return `${Math.round(distance.value * 1000)} ม.`
  return `${distance.value.toFixed(1)} กม.`
})

// Initialize map
async function initMap() {
  if (!mapContainer.value) return
  
  loading.value = true
  error.value = null
  
  try {
    const L = await import('leaflet')
    // Note: Leaflet CSS already loaded via CDN in index.html
    
    // Calculate center and bounds
    const centerLat = (props.pickupLat + props.dropoffLat) / 2
    const centerLng = (props.pickupLng + props.dropoffLng) / 2
    
    map = L.map(mapContainer.value, {
      center: [centerLat, centerLng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    })
    
    // Add tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map)
    
    // Custom pickup icon (green) - SVG circle marker
    const pickupIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 32px; height: 32px;
          background: #10b981;
          border: 3px solid #fff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
          display: flex; align-items: center; justify-content: center;
        ">
          <svg style="transform: rotate(45deg); width: 14px; height: 14px;" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3">
            <circle cx="12" cy="12" r="4"/>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    })
    
    // Custom dropoff icon (red) - SVG flag marker
    const dropoffIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 32px; height: 32px;
          background: #ef4444;
          border: 3px solid #fff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
          display: flex; align-items: center; justify-content: center;
        ">
          <svg style="transform: rotate(45deg); width: 14px; height: 14px;" viewBox="0 0 24 24" fill="#fff" stroke="none">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
            <line x1="4" y1="22" x2="4" y2="15" stroke="#fff" stroke-width="2"/>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    })
    
    // Add markers with enhanced tooltips
    pickupMarker = L.marker([props.pickupLat, props.pickupLng], { icon: pickupIcon })
      .addTo(map)
      .bindTooltip('จุดรับ', {
        permanent: true,
        direction: 'top',
        offset: [0, -35],
        className: 'pickup-tooltip'
      })
      .bindPopup(`
        <div style="min-width: 200px;">
          <div style="font-weight: 600; color: #10b981; margin-bottom: 6px; font-size: 14px;">
            📍 จุดรับผู้โดยสาร
          </div>
          <div style="color: #374151; font-size: 13px; line-height: 1.5;">
            ${props.pickupAddress || 'ไม่ระบุที่อยู่'}
          </div>
        </div>
      `)
    
    dropoffMarker = L.marker([props.dropoffLat, props.dropoffLng], { icon: dropoffIcon })
      .addTo(map)
      .bindTooltip('จุดส่ง', {
        permanent: true,
        direction: 'top',
        offset: [0, -35],
        className: 'dropoff-tooltip'
      })
      .bindPopup(`
        <div style="min-width: 200px;">
          <div style="font-weight: 600; color: #ef4444; margin-bottom: 6px; font-size: 14px;">
            🏁 จุดส่งผู้โดยสาร
          </div>
          <div style="color: #374151; font-size: 13px; line-height: 1.5;">
            ${props.dropoffAddress || 'ไม่ระบุที่อยู่'}
          </div>
        </div>
      `)
    
    // Draw route line
    routeLine = L.polyline([
      [props.pickupLat, props.pickupLng],
      [props.dropoffLat, props.dropoffLng]
    ], {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.7,
      dashArray: '10, 10'
    }).addTo(map)
    
    // Fit bounds to show both markers
    const bounds = L.latLngBounds([
      [props.pickupLat, props.pickupLng],
      [props.dropoffLat, props.dropoffLng]
    ])
    map.fitBounds(bounds, { padding: [40, 40] })
    
  } catch (err) {
    console.error('[JobPreviewMap] Init error:', err)
    error.value = 'ไม่สามารถโหลดแผนที่ได้'
  } finally {
    loading.value = false
  }
}

// Open Google Maps for navigation
function openGoogleMaps() {
  const url = `https://www.google.com/maps/dir/${props.pickupLat},${props.pickupLng}/${props.dropoffLat},${props.dropoffLng}`
  window.open(url, '_blank')
  emit('openGoogleMaps')
}

// Cleanup
function cleanup() {
  if (map) {
    map.remove()
    map = null
    pickupMarker = null
    dropoffMarker = null
    routeLine = null
  }
}

// Watch for prop changes
watch([() => props.pickupLat, () => props.dropoffLat], () => {
  if (props.show) {
    cleanup()
    initMap()
  }
})

watch(() => props.show, (show) => {
  if (show) {
    setTimeout(initMap, 100)
  } else {
    cleanup()
  }
})

onMounted(() => {
  if (props.show) {
    initMap()
  }
})

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <div v-if="show" class="job-preview-map">
    <!-- Header -->
    <div class="map-header">
      <h4>ดูเส้นทาง</h4>
      <button class="close-btn" type="button" aria-label="ปิด" @click="emit('close')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
    
    <!-- Map Container -->
    <div class="map-wrapper">
      <div v-if="loading" class="map-loading">
        <div class="loader"></div>
        <span>กำลังโหลดแผนที่...</span>
      </div>
      <div v-else-if="error" class="map-error">
        <span>{{ error }}</span>
      </div>
      <div ref="mapContainer" class="map-container"></div>
    </div>
    
    <!-- Route Info - Enhanced -->
    <div class="route-info">
      <div class="route-stat">
        <div class="stat-icon-wrapper distance">
          <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">ระยะทางรวม</span>
          <span class="stat-value">{{ formattedDistance }}</span>
        </div>
      </div>
      <div class="route-divider"></div>
      <div class="route-stat">
        <div class="stat-icon-wrapper time">
          <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">เวลาโดยประมาณ</span>
          <span class="stat-value">{{ estimatedTime }}</span>
        </div>
      </div>
    </div>
    
    <!-- Route Points - Enhanced -->
    <div class="route-points">
      <div class="route-point">
        <div class="point-marker-wrapper pickup">
          <span class="point-marker pickup"></span>
          <span class="point-number">1</span>
        </div>
        <div class="point-content">
          <div class="point-header">
            <span class="point-label">📍 จุดรับผู้โดยสาร</span>
            <span class="point-badge pickup">เริ่มต้น</span>
          </div>
          <span class="point-address">{{ pickupAddress || 'ไม่ระบุที่อยู่' }}</span>
        </div>
      </div>
      <div class="route-line-vertical">
        <div class="route-line-arrow">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
          </svg>
        </div>
      </div>
      <div class="route-point">
        <div class="point-marker-wrapper dropoff">
          <span class="point-marker dropoff"></span>
          <span class="point-number">2</span>
        </div>
        <div class="point-content">
          <div class="point-header">
            <span class="point-label">🏁 จุดส่งผู้โดยสาร</span>
            <span class="point-badge dropoff">ปลายทาง</span>
          </div>
          <span class="point-address">{{ dropoffAddress || 'ไม่ระบุที่อยู่' }}</span>
        </div>
      </div>
    </div>
    
    <!-- Actions -->
    <div class="map-actions">
      <button class="google-maps-btn" type="button" @click="openGoogleMaps">
        <svg viewBox="0 0 24 24" fill="currentColor" class="maps-icon">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        เปิดใน Google Maps
      </button>
    </div>
  </div>
</template>

<style scoped>
.job-preview-map {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.map-header h4 {
  font-size: 15px;
  font-weight: 600;
  color: #111;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  background: #f3f4f6;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
}

.close-btn:active {
  background: #e5e7eb;
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

.map-wrapper {
  position: relative;
  height: 180px;
  background: #f9fafb;
}

.map-container {
  width: 100%;
  height: 100%;
}

.map-loading,
.map-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #f9fafb;
  font-size: 13px;
  color: #6b7280;
}

.loader {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.route-info {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: linear-gradient(to bottom, #f9fafb, #fff);
  border-bottom: 1px solid #f0f0f0;
}

.route-stat {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-wrapper.distance {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
}

.stat-icon-wrapper.time {
  background: linear-gradient(135deg, #fce7f3, #fbcfe8);
}

.stat-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.stat-icon-wrapper.distance .stat-icon {
  color: #2563eb;
}

.stat-icon-wrapper.time .stat-icon {
  color: #db2777;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #111;
  letter-spacing: -0.02em;
}

.route-divider {
  width: 1px;
  height: 40px;
  background: linear-gradient(to bottom, transparent, #e5e7eb, transparent);
  margin: 0 8px;
}

.route-points {
  padding: 16px;
  position: relative;
  background: #fff;
}

.route-point {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  position: relative;
  z-index: 1;
  background: #fff;
}

.route-point + .route-point {
  margin-top: 20px;
}

.point-marker-wrapper {
  position: relative;
  flex-shrink: 0;
}

.point-marker {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 3px solid #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  display: block;
}

.point-marker.pickup { 
  background: #10b981;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
}

.point-marker.dropoff { 
  background: #ef4444;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
}

.point-number {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  background: #fff;
  border: 2px solid currentColor;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.point-marker-wrapper.pickup .point-number {
  color: #10b981;
}

.point-marker-wrapper.dropoff .point-number {
  color: #ef4444;
}

.route-line-vertical {
  position: absolute;
  left: 23px;
  top: 36px;
  bottom: 36px;
  width: 3px;
  background: linear-gradient(to bottom, #10b981, #3b82f6, #ef4444);
  z-index: 0;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.route-line-arrow {
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.route-line-arrow svg {
  width: 14px;
  height: 14px;
  color: #3b82f6;
}

.point-content {
  flex: 1;
  min-width: 0;
}

.point-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.point-label {
  font-size: 13px;
  color: #111;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.point-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.point-badge.pickup {
  background: #d1fae5;
  color: #065f46;
}

.point-badge.dropoff {
  background: #fee2e2;
  color: #991b1b;
}

.point-address {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.map-actions {
  padding: 12px 16px 16px;
}

.google-maps-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: linear-gradient(135deg, #4285f4, #3367d6);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
}

.google-maps-btn:active {
  background: linear-gradient(135deg, #3367d6, #2851a3);
  transform: scale(0.98);
  box-shadow: 0 1px 4px rgba(66, 133, 244, 0.3);
}

.maps-icon {
  width: 20px;
  height: 20px;
}

/* Leaflet tooltip styles */
:deep(.pickup-tooltip) {
  background: #10b981 !important;
  color: #fff !important;
  border: none !important;
  border-radius: 6px !important;
  padding: 4px 10px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4) !important;
}

:deep(.pickup-tooltip::before) {
  border-top-color: #10b981 !important;
}

:deep(.dropoff-tooltip) {
  background: #ef4444 !important;
  color: #fff !important;
  border: none !important;
  border-radius: 6px !important;
  padding: 4px 10px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4) !important;
}

:deep(.dropoff-tooltip::before) {
  border-top-color: #ef4444 !important;
}

/* Leaflet popup styles */
:deep(.leaflet-popup-content-wrapper) {
  border-radius: 12px !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
}

:deep(.leaflet-popup-content) {
  margin: 12px !important;
}
</style>