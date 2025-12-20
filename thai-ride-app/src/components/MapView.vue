<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import L from 'leaflet'
import { useLeafletMap } from '../composables/useLeafletMap'
import type { GeoLocation } from '../composables/useLocation'

const props = defineProps<{
  pickup?: GeoLocation | null
  destination?: GeoLocation | null
  driverLocation?: { lat: number; lng: number; heading?: number } | null
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
const driverMarker = ref<L.Marker | null>(null)

// Haptic feedback for mobile devices
const triggerHapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(50) // Short vibration 50ms
  }
}

// Trigger bounce animation on marker after drag
const triggerBounceAnimation = (marker: L.Marker) => {
  const element = marker.getElement()
  if (element) {
    const markerDiv = element.querySelector('.pickup-marker, .destination-marker')
    if (markerDiv) {
      markerDiv.classList.add('bounce')
      setTimeout(() => markerDiv.classList.remove('bounce'), 400)
    }
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
        triggerBounceAnimation(pickupMarker)
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
        triggerBounceAnimation(destMarker)
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

// Watch driver location for realtime updates
watch(() => props.driverLocation, (newLocation) => {
  if (!isMapReady.value || !mapInstance.value) return
  
  if (newLocation) {
    updateDriverMarker(newLocation)
  } else if (driverMarker.value) {
    mapInstance.value.removeLayer(driverMarker.value as unknown as L.Layer)
    driverMarker.value = null
  }
}, { deep: true })

// Update or create driver marker with smooth animation
const updateDriverMarker = (location: { lat: number; lng: number; heading?: number }) => {
  if (!mapInstance.value) return

  // Create driver icon
  const rotation = location.heading || 0
  const driverIcon = L.divIcon({
    className: 'driver-marker',
    html: `
      <div class="driver-marker-inner" style="transform: rotate(${rotation}deg)">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="18" fill="#000" stroke="#fff" stroke-width="3"/>
          <path d="M20 10L26 26H14L20 10Z" fill="#fff"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  })

  if (driverMarker.value) {
    // Smooth animation to new position
    const currentLatLng = driverMarker.value.getLatLng()
    const newLatLng = L.latLng(location.lat, location.lng)
    
    // Animate marker movement
    const steps = 20
    const latStep = (newLatLng.lat - currentLatLng.lat) / steps
    const lngStep = (newLatLng.lng - currentLatLng.lng) / steps
    let step = 0
    
    const animate = () => {
      if (step < steps && driverMarker.value) {
        step++
        const lat = currentLatLng.lat + (latStep * step)
        const lng = currentLatLng.lng + (lngStep * step)
        driverMarker.value.setLatLng([lat, lng])
        requestAnimationFrame(animate)
      }
    }
    
    animate()
    driverMarker.value.setIcon(driverIcon)
  } else {
    // Create new marker
    driverMarker.value = L.marker([location.lat, location.lng], {
      icon: driverIcon,
      zIndexOffset: 1000
    }).addTo(mapInstance.value)
  }
}

onMounted(async () => {
  if (!mapContainer.value) return

  // Default center (Su-ngai Kolok, Narathiwat)
  let center = { lat: 6.0296, lng: 101.9653 }
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

  // Always update markers if pickup or destination is provided
  if (props.pickup || props.destination) {
    // Use nextTick to ensure map is fully ready
    setTimeout(() => {
      updateMarkers()
    }, 100)
  }

  // Get GPS location in background (non-blocking)
  getCurrentLocation()
    .then((gpsLocation) => {
      currentLocation.value = gpsLocation
      emit('locationDetected', gpsLocation)
      
      // If no markers exist yet, add one for current location
      if (isMapReady.value && markers.value.length === 0) {
        addMarker({
          position: gpsLocation,
          title: 'ตำแหน่งของคุณ',
          icon: 'pickup'
        })
      }
      
      // Center map on GPS location
      if (mapInstance.value) {
        mapInstance.value.setView([gpsLocation.lat, gpsLocation.lng], 18)
      }
    })
    .catch(() => {
      console.log('GPS not available, using default location')
      // If GPS fails but we have pickup, still show marker
      if (props.pickup && isMapReady.value && markers.value.length === 0) {
        updateMarkers()
      }
    })
})
</script>

<template>
  <div class="map-wrapper" :style="{ height: height || '200px' }">
    <!-- Loading skeleton -->
    <div v-if="!isMapReady" class="map-skeleton">
      <div class="skeleton-pulse"></div>
      <div class="skeleton-grid">
        <div class="skeleton-tile" v-for="i in 9" :key="i"></div>
      </div>
      <div class="skeleton-center">
        <div class="skeleton-spinner"></div>
        <span class="skeleton-text">กำลังโหลดแผนที่...</span>
      </div>
    </div>
    
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

/* Driver marker styles */
:deep(.driver-marker) {
  background: transparent;
  border: none;
}

:deep(.driver-marker-inner) {
  transition: transform 0.3s ease;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

:deep(.driver-marker-inner svg) {
  animation: driver-pulse 2s ease-in-out infinite;
}

@keyframes driver-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* Loading skeleton - Uber style */
.map-skeleton {
  position: absolute;
  inset: 0;
  background: #F6F6F6;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.skeleton-grid {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 2px;
  opacity: 0.5;
}

.skeleton-tile {
  background: linear-gradient(135deg, #e8e8e8 0%, #f0f0f0 50%, #e8e8e8 100%);
  background-size: 200% 200%;
  animation: tile-pulse 2s ease-in-out infinite;
}

.skeleton-tile:nth-child(1) { animation-delay: 0s; }
.skeleton-tile:nth-child(2) { animation-delay: 0.1s; }
.skeleton-tile:nth-child(3) { animation-delay: 0.2s; }
.skeleton-tile:nth-child(4) { animation-delay: 0.1s; }
.skeleton-tile:nth-child(5) { animation-delay: 0.2s; }
.skeleton-tile:nth-child(6) { animation-delay: 0.3s; }
.skeleton-tile:nth-child(7) { animation-delay: 0.2s; }
.skeleton-tile:nth-child(8) { animation-delay: 0.3s; }
.skeleton-tile:nth-child(9) { animation-delay: 0.4s; }

.skeleton-pulse {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

.skeleton-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 1;
  background: rgba(255,255,255,0.9);
  padding: 20px 28px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.skeleton-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #E5E5E5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.skeleton-text {
  font-size: 14px;
  color: #6B6B6B;
  font-weight: 500;
}

@keyframes tile-pulse {
  0%, 100% { background-position: 0% 50%; opacity: 0.3; }
  50% { background-position: 100% 50%; opacity: 0.6; }
}

@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
