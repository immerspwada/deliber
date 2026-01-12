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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let map: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pickupMarker: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dropoffMarker: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    await import('leaflet/dist/leaflet.css')
    
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
    
    // Custom pickup icon (green)
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
          <span style="transform: rotate(45deg); color: #fff; font-size: 14px;">📍</span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    })
    
    // Custom dropoff icon (red)
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
          <span style="transform: rotate(45deg); color: #fff; font-size: 14px;">🏁</span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    })
    
    // Add markers
    pickupMarker = L.marker([props.pickupLat, props.pickupLng], { icon: pickupIcon })
      .addTo(map)
      .bindPopup(`<strong>จุดรับ</strong><br>${props.pickupAddress || 'ไม่ระบุ'}`)
    
    dropoffMarker = L.marker([props.dropoffLat, props.dropoffLng], { icon: dropoffIcon })
      .addTo(map)
      .bindPopup(`<strong>จุดส่ง</strong><br>${props.dropoffAddress || 'ไม่ระบุ'}`)
    
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
      <button class="close-btn" @click="emit('close')" type="button" aria-label="ปิด">
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
    
    <!-- Route Info -->
    <div class="route-info">
      <div class="route-stat">
        <span class="stat-icon">📏</span>
        <div class="stat-content">
          <span class="stat-label">ระยะทาง</span>
          <span class="stat-value">{{ formattedDistance }}</span>
        </div>
      </div>
      <div class="route-divider"></div>
      <div class="route-stat">
        <span class="stat-icon">⏱️</span>
        <div class="stat-content">
          <span class="stat-label">เวลาโดยประมาณ</span>
          <span class="stat-value">{{ estimatedTime }}</span>
        </div>
      </div>
    </div>
    
    <!-- Route Points -->
    <div class="route-points">
      <div class="route-point">
        <span class="point-marker pickup"></span>
        <div class="point-content">
          <span class="point-label">จุดรับ</span>
          <span class="point-address">{{ pickupAddress || 'ไม่ระบุที่อยู่' }}</span>
        </div>
      </div>
      <div class="route-line-vertical"></div>
      <div class="route-point">
        <span class="point-marker dropoff"></span>
        <div class="point-content">
          <span class="point-label">จุดส่ง</span>
          <span class="point-address">{{ dropoffAddress || 'ไม่ระบุที่อยู่' }}</span>
        </div>
      </div>
    </div>
    
    <!-- Actions -->
    <div class="map-actions">
      <button class="google-maps-btn" @click="openGoogleMaps" type="button">
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
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #f0f0f0;
}

.route-stat {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-icon {
  font-size: 20px;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 11px;
  color: #9ca3af;
}

.stat-value {
  font-size: 15px;
  font-weight: 600;
  color: #111;
}

.route-divider {
  width: 1px;
  height: 32px;
  background: #e5e7eb;
  margin: 0 12px;
}

.route-points {
  padding: 14px 16px;
  position: relative;
}

.route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.route-point + .route-point {
  margin-top: 16px;
}

.point-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.point-marker.pickup { background: #10b981; }
.point-marker.dropoff { background: #ef4444; }

.route-line-vertical {
  position: absolute;
  left: 21px;
  top: 28px;
  bottom: 28px;
  width: 2px;
  background: linear-gradient(to bottom, #10b981, #ef4444);
  z-index: 0;
}

.point-content {
  flex: 1;
  min-width: 0;
}

.point-label {
  display: block;
  font-size: 11px;
  color: #9ca3af;
  margin-bottom: 2px;
}

.point-address {
  font-size: 13px;
  color: #374151;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
  padding: 12px;
  background: #4285f4;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s;
}

.google-maps-btn:active {
  background: #3367d6;
  transform: scale(0.98);
}

.maps-icon {
  width: 18px;
  height: 18px;
}
</style>