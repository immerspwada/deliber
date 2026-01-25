<script setup lang="ts">
/**
 * Job Heat Map Component
 * Shows areas with high job demand
 * Uses CachedTileLayer for offline support
 */
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { cachedTileLayer } from '../../lib/CachedTileLayer'

interface HotZone {
  id: string
  name: string
  lat: number
  lng: number
  intensity: 'low' | 'medium' | 'high'
  jobCount: number
}

const props = withDefaults(defineProps<{
  hotZones?: HotZone[]
  userLocation?: { lat: number; lng: number } | null
}>(), {
  hotZones: () => [],
  userLocation: null
})

const emit = defineEmits<{
  zoneClick: [zone: HotZone]
  navigate: [zone: HotZone]
}>()

// Navigate to hot zone using Google Maps
function navigateToZone(zone: HotZone) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${zone.lat},${zone.lng}&travelmode=driving`
  window.open(url, '_blank')
  emit('navigate', zone)
}

// State
const mapContainer = ref<HTMLElement | null>(null)
 
const map = ref<any>(null)
 
const markers = ref<any[]>([])
 
const userMarker = ref<any>(null)

// Mock hot zones if none provided
const zones = ref<HotZone[]>([
  { id: '1', name: 'สยาม', lat: 13.7466, lng: 100.5347, intensity: 'high', jobCount: 24 },
  { id: '2', name: 'อโศก', lat: 13.7380, lng: 100.5601, intensity: 'high', jobCount: 18 },
  { id: '3', name: 'ทองหล่อ', lat: 13.7320, lng: 100.5780, intensity: 'medium', jobCount: 12 },
  { id: '4', name: 'เอกมัย', lat: 13.7195, lng: 100.5852, intensity: 'medium', jobCount: 9 },
  { id: '5', name: 'อ่อนนุช', lat: 13.7055, lng: 100.6012, intensity: 'low', jobCount: 5 },
  { id: '6', name: 'ลาดพร้าว', lat: 13.8058, lng: 100.5614, intensity: 'medium', jobCount: 11 },
  { id: '7', name: 'รัชดา', lat: 13.7649, lng: 100.5739, intensity: 'high', jobCount: 15 },
  { id: '8', name: 'พระราม 9', lat: 13.7572, lng: 100.5650, intensity: 'medium', jobCount: 10 }
])

// Intensity colors
const intensityColors = {
  low: { fill: '#fef3c7', stroke: '#f59e0b', opacity: 0.6 },
  medium: { fill: '#fed7aa', stroke: '#f97316', opacity: 0.7 },
  high: { fill: '#fecaca', stroke: '#ef4444', opacity: 0.8 }
}

const intensityRadius = {
  low: 400,
  medium: 600,
  high: 800
}

// Initialize map
async function initMap() {
  // Wait for next tick to ensure DOM is ready
  await nextTick()
  
  if (!mapContainer.value) {
    console.warn('[JobHeatMap] Map container not ready')
    return
  }

  // Dynamic import Leaflet (CSS already loaded via CDN in index.html)
  const L = await import('leaflet')

  // Default center (Bangkok)
  const center: [number, number] = props.userLocation 
    ? [props.userLocation.lat, props.userLocation.lng]
    : [13.7563, 100.5018]

  map.value = L.map(mapContainer.value, {
    center,
    zoom: 12,
    zoomControl: false,
    attributionControl: false
  })

  // Add cached tile layer for offline support
  const tileLayer = cachedTileLayer(
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    {
      maxZoom: 19,
      subdomains: 'abcd'
    }
  )
  tileLayer.addTo(map.value)

  // Add zoom control to bottom right
  L.control.zoom({ position: 'bottomright' }).addTo(map.value)

  // Add hot zones
  addHotZones(L)

  // Add user location if available
  if (props.userLocation) {
    addUserMarker(L)
  }
}

function addHotZones(L: typeof import('leaflet')) {
  if (!map.value) return

  const displayZones = props.hotZones.length > 0 ? props.hotZones : zones.value

  displayZones.forEach(zone => {
    const colors = intensityColors[zone.intensity]
    const radius = intensityRadius[zone.intensity]

    // Create circle marker
    const circle = L.circle([zone.lat, zone.lng], {
      radius,
      fillColor: colors.fill,
      fillOpacity: colors.opacity,
      color: colors.stroke,
      weight: 2
    }).addTo(map.value!)

    // Add popup
    circle.bindPopup(`
      <div style="text-align: center; padding: 4px;">
        <strong style="font-size: 14px;">${zone.name}</strong><br>
        <span style="color: #ef4444; font-weight: 600;">${zone.jobCount} งาน</span><br>
        <span style="font-size: 11px; color: #6b7280;">ความต้องการ${zone.intensity === 'high' ? 'สูง' : zone.intensity === 'medium' ? 'ปานกลาง' : 'ต่ำ'}</span>
      </div>
    `)

    circle.on('click', () => {
      emit('zoneClick', zone)
    })

    markers.value.push(circle as unknown as L.CircleMarker)
  })
}

function addUserMarker(L: typeof import('leaflet')) {
  if (!map.value || !props.userLocation) return

  // Custom user icon
  const userIcon = L.divIcon({
    className: 'user-marker',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: #3b82f6;
        border: 3px solid #fff;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  })

  userMarker.value = L.marker([props.userLocation.lat, props.userLocation.lng], {
    icon: userIcon
  }).addTo(map.value)

  userMarker.value.bindPopup('ตำแหน่งของคุณ')
}

// Center on user
function centerOnUser() {
  if (map.value && props.userLocation) {
    map.value.setView([props.userLocation.lat, props.userLocation.lng], 14)
  }
}

// Watch for user location changes
watch(() => props.userLocation, async (newLoc) => {
  if (newLoc && map.value) {
    const L = await import('leaflet')
    
    if (userMarker.value) {
      userMarker.value.setLatLng([newLoc.lat, newLoc.lng])
    } else {
      addUserMarker(L)
    }
  }
})

// Lifecycle
onMounted(() => {
  initMap()
})

onUnmounted(() => {
  if (map.value) {
    map.value.remove()
    map.value = null
  }
})
</script>

<template>
  <div class="heat-map">
    <!-- Header -->
    <div class="map-header">
      <div class="map-title">
        <h3>พื้นที่งานเยอะ</h3>
        <span class="map-subtitle">แสดงพื้นที่ที่มีความต้องการสูง</span>
      </div>
      <button 
        v-if="userLocation" 
        class="locate-btn"
        aria-label="ไปยังตำแหน่งของฉัน"
        @click="centerOnUser"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
        </svg>
      </button>
    </div>

    <!-- Map Container -->
    <div ref="mapContainer" class="map-container"></div>

    <!-- Legend -->
    <div class="map-legend">
      <div class="legend-item">
        <span class="legend-circle high"></span>
        <span>สูง</span>
      </div>
      <div class="legend-item">
        <span class="legend-circle medium"></span>
        <span>ปานกลาง</span>
      </div>
      <div class="legend-item">
        <span class="legend-circle low"></span>
        <span>ต่ำ</span>
      </div>
    </div>

    <!-- Hot Zones List -->
    <div class="zones-list">
      <div 
        v-for="zone in (hotZones.length > 0 ? hotZones : zones).slice(0, 4)" 
        :key="zone.id"
        class="zone-item"
      >
        <div class="zone-main" @click="emit('zoneClick', zone)">
          <div class="zone-info">
            <span class="zone-name">{{ zone.name }}</span>
            <span class="zone-intensity" :class="zone.intensity">
              {{ zone.intensity === 'high' ? 'สูง' : zone.intensity === 'medium' ? 'ปานกลาง' : 'ต่ำ' }}
            </span>
          </div>
          <span class="zone-count">{{ zone.jobCount }} งาน</span>
        </div>
        <button 
          class="navigate-btn"
          aria-label="นำทางไปยัง {{ zone.name }}"
          @click.stop="navigateToZone(zone)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 11l19-9-9 19-2-8-8-2z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.heat-map {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #f0f0f0;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 16px 12px;
}

.map-title h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111;
  margin: 0 0 2px 0;
}

.map-subtitle {
  font-size: 12px;
  color: #9ca3af;
}

.locate-btn {
  width: 36px;
  height: 36px;
  background: #f3f4f6;
  border: none;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.locate-btn:active {
  background: #e5e7eb;
  color: #3b82f6;
}

.locate-btn svg {
  width: 18px;
  height: 18px;
}

.map-container {
  height: 200px;
  background: #f9fafb;
}

.map-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.legend-circle {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid;
}

.legend-circle.high {
  background: #fecaca;
  border-color: #ef4444;
}

.legend-circle.medium {
  background: #fed7aa;
  border-color: #f97316;
}

.legend-circle.low {
  background: #fef3c7;
  border-color: #f59e0b;
}

.zones-list {
  padding: 8px;
}

.zone-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 10px;
  transition: background 0.2s;
}

.zone-item:active {
  background: #f9fafb;
}

.zone-main {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px;
  cursor: pointer;
}

.zone-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.zone-name {
  font-size: 14px;
  font-weight: 500;
  color: #111;
}

.zone-intensity {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
}

.zone-intensity.high {
  background: #fecaca;
  color: #b91c1c;
}

.zone-intensity.medium {
  background: #fed7aa;
  color: #c2410c;
}

.zone-intensity.low {
  background: #fef3c7;
  color: #b45309;
}

.zone-count {
  font-size: 14px;
  font-weight: 600;
  color: #ef4444;
}

.navigate-btn {
  width: 40px;
  height: 40px;
  background: #10b981;
  border: none;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  transition: all 0.2s;
  flex-shrink: 0;
}

.navigate-btn:active {
  transform: scale(0.95);
  background: #059669;
}

.navigate-btn svg {
  width: 18px;
  height: 18px;
}
</style>
