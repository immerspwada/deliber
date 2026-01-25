<script setup lang="ts">
/**
 * Ride Tracking Map Component
 * แสดงตำแหน่ง Provider แบบ Realtime บนแผนที่
 * Uses CachedTileLayer for offline support
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useProviderTracking } from '../../composables/useProviderTracking'
import { cachedTileLayer } from '../../lib/CachedTileLayer'

interface Props {
  rideId: string
  pickupLat: number
  pickupLng: number
  dropoffLat: number
  dropoffLng: number
  status: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  openChat: []
}>()

// Tracking composable
const { 
  providerLocation, 
  loading, 
  isTracking,
  loadProviderLocation,
  getDistanceToPickup,
  getEstimatedArrival
} = useProviderTracking(props.rideId)

// Map state
const mapContainer = ref<HTMLDivElement | null>(null)
 
let map: any = null
 
let providerMarker: any = null
 
let pickupMarker: any = null
 
let dropoffMarker: any = null

// Computed
const distanceText = computed(() => {
  const distance = getDistanceToPickup(props.pickupLat, props.pickupLng)
  if (distance === null) return null
  if (distance < 1) return `${Math.round(distance * 1000)} ม.`
  return `${distance.toFixed(1)} กม.`
})

const etaText = computed(() => {
  const eta = getEstimatedArrival(props.pickupLat, props.pickupLng)
  if (eta === null) return null
  if (eta < 1) return 'ใกล้ถึงแล้ว'
  return `${eta} นาที`
})

const statusMessage = computed(() => {
  switch (props.status) {
    case 'matched':
      return 'คนขับกำลังเตรียมตัว'
    case 'arriving':
      return 'คนขับกำลังมารับคุณ'
    case 'pickup':
      return 'คนขับถึงจุดรับแล้ว'
    case 'in_progress':
      return 'กำลังเดินทาง'
    default:
      return 'รอคนขับ'
  }
})

// Initialize map
async function initMap(): Promise<void> {
  if (!mapContainer.value) return

  // Dynamic import Leaflet (CSS already loaded via CDN in index.html)
  const L = await import('leaflet')

  // Create map centered on pickup
  map = L.map(mapContainer.value).setView([props.pickupLat, props.pickupLng], 15)

  // Add cached tile layer for offline support
  const tileLayer = cachedTileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      attribution: '© OpenStreetMap',
      subdomains: 'abc'
    }
  )
  tileLayer.addTo(map)

  // Custom icons
  const pickupIcon = L.divIcon({
    className: 'custom-marker',
    html: '<div class="marker-pickup">📍</div>',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  })

  const dropoffIcon = L.divIcon({
    className: 'custom-marker',
    html: '<div class="marker-dropoff">🏁</div>',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  })

  const providerIcon = L.divIcon({
    className: 'custom-marker',
    html: '<div class="marker-provider">🚗</div>',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  })

  // Add pickup marker
  pickupMarker = L.marker([props.pickupLat, props.pickupLng], { icon: pickupIcon })
    .addTo(map)
    .bindPopup('จุดรับ')

  // Add dropoff marker
  dropoffMarker = L.marker([props.dropoffLat, props.dropoffLng], { icon: dropoffIcon })
    .addTo(map)
    .bindPopup('จุดส่ง')

  // Add provider marker (will be updated)
  if (providerLocation.value) {
    providerMarker = L.marker(
      [providerLocation.value.latitude, providerLocation.value.longitude],
      { icon: providerIcon }
    ).addTo(map)
  }

  // Fit bounds to show all markers
  const bounds = L.latLngBounds([
    [props.pickupLat, props.pickupLng],
    [props.dropoffLat, props.dropoffLng]
  ])
  if (providerLocation.value) {
    bounds.extend([providerLocation.value.latitude, providerLocation.value.longitude])
  }
  map.fitBounds(bounds, { padding: [50, 50] })
}

// Update provider marker position
function updateProviderMarker(): void {
  if (!map || !providerLocation.value) return

  // Dynamic import Leaflet
  import('leaflet').then((L) => {
    const providerIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-provider" style="transform: rotate(${providerLocation.value?.heading || 0}deg)">🚗</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    })

    if (providerMarker) {
      providerMarker.setLatLng([
        providerLocation.value!.latitude,
        providerLocation.value!.longitude
      ])
      providerMarker.setIcon(providerIcon)
    } else {
      providerMarker = L.marker(
        [providerLocation.value!.latitude, providerLocation.value!.longitude],
        { icon: providerIcon }
      ).addTo(map)
    }
  })
}

// Watch for location updates
watch(providerLocation, () => {
  updateProviderMarker()
}, { deep: true })

// Lifecycle
onMounted(async () => {
  await loadProviderLocation()
  await initMap()
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div class="tracking-container">
    <!-- Status Header -->
    <div class="status-header">
      <div class="status-info">
        <div class="status-icon" :class="{ pulsing: isTracking }">
          <span v-if="status === 'arriving'">🚗</span>
          <span v-else-if="status === 'pickup'">📍</span>
          <span v-else-if="status === 'in_progress'">🛣️</span>
          <span v-else>⏳</span>
        </div>
        <div class="status-text">
          <h3>{{ statusMessage }}</h3>
          <p v-if="etaText && status === 'arriving'">
            ถึงใน {{ etaText }} ({{ distanceText }})
          </p>
          <p v-else-if="isTracking" class="tracking-active">
            กำลังติดตามตำแหน่ง
          </p>
        </div>
      </div>
      
      <button 
        class="chat-btn"
        type="button"
        aria-label="แชทกับคนขับ"
        @click="emit('openChat')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      </button>
    </div>

    <!-- Map -->
    <div class="map-wrapper">
      <div v-if="loading" class="map-loading">
        <div class="loader"></div>
        <span>กำลังโหลดแผนที่...</span>
      </div>
      <div ref="mapContainer" class="map-container"></div>
    </div>

    <!-- Provider Info -->
    <div v-if="providerLocation" class="provider-info">
      <div class="info-item">
        <span class="info-label">ความเร็ว</span>
        <span class="info-value">{{ Math.round(providerLocation.speed || 0) }} กม./ชม.</span>
      </div>
      <div class="info-item">
        <span class="info-label">อัพเดทล่าสุด</span>
        <span class="info-value">{{ new Date(providerLocation.updated_at).toLocaleTimeString('th-TH') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tracking-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Status Header */
.status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-icon {
  width: 48px;
  height: 48px;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.status-icon.pulsing {
  animation: pulse 2s ease-in-out infinite;
  background: #dcfce7;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.status-text h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111;
  margin: 0 0 2px 0;
}

.status-text p {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.tracking-active {
  color: #10b981 !important;
}

.chat-btn {
  width: 48px;
  height: 48px;
  background: #f3f4f6;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.chat-btn:active {
  background: #e5e7eb;
}

.chat-btn svg {
  width: 24px;
  height: 24px;
  color: #374151;
}

/* Map - CRITICAL: Must allow interaction */
.map-wrapper {
  flex: 1;
  position: relative;
  min-height: 300px;
  /* CRITICAL FIX: Ensure wrapper has height */
  height: 100%;
  /* CRITICAL: Enable pointer events */
  pointer-events: auto !important;
  z-index: 1;
}

.map-container {
  width: 100%;
  height: 100%;
  /* CRITICAL FIX: Ensure container has minimum height */
  min-height: 300px;
  /* CRITICAL: Enable pointer events */
  pointer-events: auto !important;
}

/* Ensure all Leaflet layers are visible */
.map-container :deep(.leaflet-container) {
  background: #f5f5f5 !important;
  z-index: 0 !important;
}

.map-container :deep(.leaflet-tile-pane) {
  z-index: 200 !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.map-container :deep(.leaflet-tile),
.map-container :deep(.osm-tiles) {
  opacity: 1 !important;
  visibility: visible !important;
  display: block !important;
}

.map-container :deep(.leaflet-overlay-pane) {
  z-index: 400 !important;
}

.map-container :deep(.leaflet-marker-pane) {
  z-index: 600 !important;
}

.map-container :deep(.leaflet-popup-pane) {
  z-index: 700 !important;
}

.map-container :deep(.leaflet-control-container) {
  z-index: 800 !important;
}

.map-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  gap: 12px;
  z-index: 10;
  /* CRITICAL: Loading overlay should not block map after it loads */
  pointer-events: none !important;
}

.loader {
  width: 32px;
  height: 32px;
  border: 2px solid #f3f4f6;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.map-loading span {
  font-size: 14px;
  color: #6b7280;
}

/* Provider Info */
.provider-info {
  display: flex;
  justify-content: space-around;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.info-label {
  font-size: 11px;
  color: #9ca3af;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #111;
}

/* Custom Markers */
:deep(.custom-marker) {
  background: none;
  border: none;
}

:deep(.marker-pickup),
:deep(.marker-dropoff),
:deep(.marker-provider) {
  font-size: 28px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

:deep(.marker-provider) {
  font-size: 32px;
  transition: transform 0.3s ease;
}
</style>
