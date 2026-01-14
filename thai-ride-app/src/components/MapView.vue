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
  (e: 'mapClick', data: { lat: number; lng: number }): void
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

// ✅ CRITICAL: Watch isMapReady and enable pointer events
watch(isMapReady, (ready) => {
  console.log('[MapView] isMapReady changed:', ready)
  if (ready && mapContainer.value) {
    mapContainer.value.style.pointerEvents = 'auto'
    console.log('[MapView] ✅ Pointer events enabled!')
    
    // Debug: Log all computed styles
    const computedStyle = window.getComputedStyle(mapContainer.value)
    console.log('[MapView] 🔍 Map container computed styles:', {
      pointerEvents: computedStyle.pointerEvents,
      zIndex: computedStyle.zIndex,
      position: computedStyle.position,
      opacity: computedStyle.opacity,
      visibility: computedStyle.visibility
    })
    
    // Debug: Check if any parent has pointer-events: none
    let parent = mapContainer.value.parentElement
    let level = 0
    while (parent && level < 5) {
      const parentStyle = window.getComputedStyle(parent)
      if (parentStyle.pointerEvents === 'none') {
        console.warn(`[MapView] ⚠️ Parent at level ${level} has pointer-events: none!`, parent.className)
      }
      parent = parent.parentElement
      level++
    }
  }
})

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

// Get current GPS location with reduced timeout (non-blocking)
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
        enableHighAccuracy: false, // Faster, less accurate (good enough for initial load)
        timeout: 3000, // Reduced from 10s to 3s
        maximumAge: 120000 // Accept cached position up to 2 minutes old
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
  if (!mapContainer.value) {
    console.error('[MapView] Map container not found')
    return
  }

  // Default center (Bangkok for better initial view)
  let center = { lat: 13.7563, lng: 100.5018 }
  const defaultZoom = 14

  // Use pickup location if provided (priority)
  if (props.pickup) {
    center = { lat: props.pickup.lat, lng: props.pickup.lng }
    console.log('[MapView] Using pickup location:', center)
  } else {
    console.log('[MapView] Using default center (Bangkok)')
  }

  try {
    // Initialize map immediately with default/pickup location
    initMap(mapContainer.value, {
      center,
      zoom: defaultZoom
    })
    
    console.log('[MapView] ✅ Map initialized, isMapReady:', isMapReady.value)
    console.log('[MapView] ✅ Map container pointer-events:', mapContainer.value.style.pointerEvents)
    
    // Force map to render properly
    setTimeout(() => {
      if (mapInstance.value) {
        mapInstance.value.invalidateSize()
        console.log('[MapView] 🔄 Map size invalidated after init')
        
        // Check if tiles are visible
        const tilePane = mapContainer.value?.querySelector('.leaflet-tile-pane')
        if (tilePane) {
          const style = window.getComputedStyle(tilePane)
          console.log('[MapView] 🔍 Tile pane styles:', {
            opacity: style.opacity,
            visibility: style.visibility,
            display: style.display,
            zIndex: style.zIndex
          })
          
          // Count tiles
          const tiles = tilePane.querySelectorAll('.leaflet-tile')
          console.log('[MapView] 📊 Number of tiles:', tiles.length)
          
          if (tiles.length > 0) {
            const firstTile = tiles[0] as HTMLImageElement
            console.log('[MapView] 🖼️ First tile:', {
              src: firstTile.src,
              complete: firstTile.complete,
              naturalWidth: firstTile.naturalWidth,
              opacity: window.getComputedStyle(firstTile).opacity
            })
          }
        }
      }
    }, 500)
  } catch (error) {
    console.error('[MapView] Failed to initialize map:', error)
    return
  }

  if (!mapInstance.value) {
    console.error('[MapView] Map instance not available')
    return
  }

  // Add click event listener for tap-to-select
  mapInstance.value.on('click', (e: L.LeafletMouseEvent) => {
    console.log('[MapView] 🖱️ Map clicked!', e.latlng)
    triggerHapticFeedback()
    emit('mapClick', { lat: e.latlng.lat, lng: e.latlng.lng })
  })
  
  // Debug: Add mousedown/touchstart listeners to container
  mapContainer.value.addEventListener('mousedown', (e) => {
    console.log('[MapView] 🖱️ Container mousedown detected!', {
      target: (e.target as HTMLElement).className,
      clientX: e.clientX,
      clientY: e.clientY
    })
  })
  
  mapContainer.value.addEventListener('touchstart', (e) => {
    console.log('[MapView] 👆 Container touchstart detected!', {
      target: (e.target as HTMLElement).className,
      touches: e.touches.length
    })
  }, { passive: true })

  // Always update markers if pickup or destination is provided
  if (props.pickup || props.destination) {
    // Use nextTick to ensure map is fully ready
    setTimeout(() => {
      console.log('[MapView] Updating markers...')
      updateMarkers()
    }, 100)
  } else {
    console.log('[MapView] No pickup/destination to display')
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
    <!-- Loading skeleton - MUST disappear when map is ready -->
    <Transition name="fade">
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
    </Transition>
    
    <!-- Map container - MUST be clickable when ready -->
    <div 
      ref="mapContainer" 
      class="map-container" 
      :class="{ 'map-ready': isMapReady }"
    ></div>

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
  border-radius: 16px;
  overflow: hidden;
  background-color: #f5f5f5;
  /* CRITICAL: Ensure wrapper allows clicks */
  pointer-events: auto !important;
}

.map-container {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.3s ease;
  /* CRITICAL: Will be set to auto when ready */
  pointer-events: none;
  /* Ensure proper rendering */
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
}

.map-container.map-ready {
  opacity: 1;
  /* CRITICAL: Enable clicks when ready */
  pointer-events: auto !important;
}

/* ✅ CRITICAL: Ensure map wrapper is visible */
.map-wrapper {
  position: relative;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background-color: #f5f5f5;
  pointer-events: auto !important;
  /* Ensure proper stacking */
  z-index: 1;
}

.map-container {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  /* Force GPU acceleration */
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  will-change: opacity;
}

.map-container.map-ready {
  opacity: 1;
  pointer-events: auto !important;
}

/* ✅ CRITICAL: Ensure ALL Leaflet layers are visible */
.map-container :deep(.leaflet-container) {
  background: #f5f5f5 !important;
  z-index: 0 !important;
}

.map-container :deep(.leaflet-pane) {
  z-index: auto !important;
}

.map-container :deep(.leaflet-tile-pane) {
  z-index: 200 !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.map-container :deep(.leaflet-overlay-pane) {
  z-index: 400 !important;
}

.map-container :deep(.leaflet-shadow-pane) {
  z-index: 500 !important;
}

.map-container :deep(.leaflet-marker-pane) {
  z-index: 600 !important;
}

.map-container :deep(.leaflet-tooltip-pane) {
  z-index: 650 !important;
}

.map-container :deep(.leaflet-popup-pane) {
  z-index: 700 !important;
}

/* ✅ CRITICAL: Ensure tiles are fully visible */
.map-container :deep(.leaflet-tile),
.map-container :deep(.osm-tiles) {
  opacity: 1 !important;
  visibility: visible !important;
  display: block !important;
  max-width: none !important;
  max-height: none !important;
  width: 256px !important;
  height: 256px !important;
}

/* ✅ CRITICAL: Fix tile container scaling issues */
.map-container :deep(.leaflet-tile-container) {
  opacity: 1 !important;
  visibility: visible !important;
  display: block !important;
  position: absolute !important;
  /* Prevent extreme scaling that makes tiles invisible */
  will-change: transform;
}

/* ✅ Ensure tile layer is visible */
.map-container :deep(.leaflet-layer) {
  opacity: 1 !important;
  visibility: visible !important;
}

/* ✅ CRITICAL: Ensure tile containers are visible */
.map-container :deep(.leaflet-tile-container) {
  opacity: 1 !important;
  visibility: visible !important;
  display: block !important;
  position: absolute !important;
  z-index: auto !important;
}

/* ✅ CRITICAL: Ensure tile layer is visible */
.map-container :deep(.leaflet-layer) {
  opacity: 1 !important;
  visibility: visible !important;
  display: block !important;
  position: absolute !important;
  left: 0 !important;
  top: 0 !important;
}

/* ✅ Ensure map pane is visible */
.map-container :deep(.leaflet-map-pane) {
  z-index: auto !important;
}

/* ✅ Ensure controls are visible and clickable */
.map-container :deep(.leaflet-control-container) {
  position: absolute !important;
  z-index: 800 !important;
  pointer-events: none !important;
}

.map-container :deep(.leaflet-control) {
  pointer-events: auto !important;
}

.map-container :deep(.leaflet-control-zoom),
.map-container :deep(.leaflet-control-attribution) {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
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

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
  pointer-events: none !important; /* CRITICAL: Don't block map */
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
