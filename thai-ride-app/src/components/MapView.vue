<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useLeafletMap } from '../composables/useLeafletMap'
import type { GeoLocation } from '../composables/useLocation'

const props = defineProps<{
  pickup?: GeoLocation | null
  destination?: GeoLocation | null
  showRoute?: boolean
  height?: string
  draggable?: boolean
}>()

const emit = defineEmits<{
  (e: 'routeCalculated', data: { distance: number; duration: number }): void
  (e: 'locationDetected', data: { lat: number; lng: number }): void
  (e: 'markerDragged', data: { type: 'pickup' | 'destination'; lat: number; lng: number }): void
}>()

const mapContainer = ref<HTMLElement | null>(null)
const {
  initMap,
  addMarker,
  clearMarkers,
  fitBounds,
  getDirections,
  clearDirections,
  isMapReady,
  markers,
  mapInstance
} = useLeafletMap()

const routeInfo = ref<{ distance: number; duration: number } | null>(null)
const currentLocation = ref<{ lat: number; lng: number } | null>(null)

// Haptic feedback for mobile devices
const triggerHapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(50) // Short vibration 50ms
  }
}

// Get current GPS location
const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      },
      (error) => {
        reject(error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  })
}

const updateMarkers = async () => {
  if (!isMapReady.value) return

  clearMarkers()
  clearDirections()
  routeInfo.value = null

  const locations: { lat: number; lng: number }[] = []

  if (props.pickup) {
    const pickupMarker = addMarker({
      position: { lat: props.pickup.lat, lng: props.pickup.lng },
      title: 'จุดรับ',
      icon: 'pickup',
      draggable: props.draggable
    })
    locations.push({ lat: props.pickup.lat, lng: props.pickup.lng })
    
    // Listen for drag events on pickup marker
    if (pickupMarker && props.draggable) {
      pickupMarker.on('dragend', () => {
        const pos = pickupMarker.getLatLng()
        triggerHapticFeedback()
        emit('markerDragged', { type: 'pickup', lat: pos.lat, lng: pos.lng })
      })
    }
  }

  if (props.destination) {
    const destMarker = addMarker({
      position: { lat: props.destination.lat, lng: props.destination.lng },
      title: 'จุดหมาย',
      icon: 'destination',
      draggable: props.draggable
    })
    locations.push({ lat: props.destination.lat, lng: props.destination.lng })
    
    // Listen for drag events on destination marker
    if (destMarker && props.draggable) {
      destMarker.on('dragend', () => {
        const pos = destMarker.getLatLng()
        triggerHapticFeedback()
        emit('markerDragged', { type: 'destination', lat: pos.lat, lng: pos.lng })
      })
    }
  }

  // Fit bounds if we have locations
  if (locations.length > 1) {
    fitBounds(locations)
  }

  // Get directions if both points are set
  if (props.showRoute && props.pickup && props.destination) {
    const result = await getDirections(
      { lat: props.pickup.lat, lng: props.pickup.lng },
      { lat: props.destination.lat, lng: props.destination.lng }
    )

    if (result) {
      routeInfo.value = {
        distance: result.distance,
        duration: result.duration
      }
      emit('routeCalculated', routeInfo.value)
    }
  }
}

watch([() => props.pickup, () => props.destination], () => {
  updateMarkers()
}, { deep: true })

onMounted(async () => {
  if (!mapContainer.value) return

  // Default center (Bangkok)
  let center = { lat: 13.7563, lng: 100.5018 }
  const defaultZoom = 18

  // Use pickup location if provided (priority)
  if (props.pickup) {
    center = { lat: props.pickup.lat, lng: props.pickup.lng }
  }

  // Initialize map immediately with default/pickup location
  initMap(mapContainer.value, {
    center,
    zoom: defaultZoom
  })

  if (props.pickup || props.destination) {
    updateMarkers()
  }

  // Get GPS location in background (non-blocking) only if no pickup provided
  if (!props.pickup) {
    getCurrentLocation()
      .then((gpsLocation) => {
        currentLocation.value = gpsLocation
        emit('locationDetected', gpsLocation)
        // Only add marker if still no pickup and no markers exist
        if (!props.pickup && isMapReady.value && markers.value.length === 0) {
          clearMarkers() // Clear any existing markers first
          addMarker({
            position: gpsLocation,
            title: 'ตำแหน่งของคุณ',
            icon: 'pickup'
          })
          // Center map on GPS location
          if (mapInstance.value) {
            mapInstance.value.setView([gpsLocation.lat, gpsLocation.lng], 18)
          }
        }
      })
      .catch(() => {
        console.log('GPS not available, using default location')
      })
  }
})
</script>

<template>
  <div class="map-wrapper" :style="{ height: height || '200px' }">
    <div ref="mapContainer" class="map-container"></div>

    <!-- Route info overlay -->
    <div v-if="routeInfo" class="route-info">
      <div class="route-stat">
        <svg class="route-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
        </svg>
        <span>{{ routeInfo.distance.toFixed(1) }} กม.</span>
      </div>
      <div class="route-stat">
        <svg class="route-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>{{ routeInfo.duration }} นาที</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  border-radius: var(--radius-md);
  overflow: hidden;
  background-color: var(--color-secondary);
}

.map-container {
  width: 100%;
  height: 100%;
}

.route-info {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  gap: 16px;
  background-color: var(--color-surface);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.route-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
}

.route-icon {
  width: 16px;
  height: 16px;
  color: var(--color-text-secondary);
}

/* Custom marker styles */
:deep(.custom-marker) {
  background: transparent;
  border: none;
}
</style>
