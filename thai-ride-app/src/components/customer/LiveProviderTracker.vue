<script setup lang="ts">
/**
 * LiveProviderTracker - Real-time map showing provider location
 * F175 - Cross-Role Integration
 * Uses Leaflet for map display with provider marker, heading direction, and route line
 * Updates location every 5 seconds via realtime subscription
 * MUNEEF Style: Primary #00A86B, Background #FFFFFF
 */
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { supabase } from '@/lib/supabase'
import { useCrossRoleEvents, type ProviderLocationPayload } from '@/lib/crossRoleEventBus'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Props
interface Props {
  providerId: string
  pickupLat: number
  pickupLng: number
  requestId: string
  destinationLat?: number
  destinationLng?: number
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'provider-arrived': []
  'location-updated': [location: ProviderLocationPayload]
}>()

const { subscribe } = useCrossRoleEvents()

// State
const mapContainer = ref<HTMLDivElement | null>(null)
const map = ref<any>(null)
const providerMarker = ref<any>(null)
const pickupMarker = ref<any>(null)
const destinationMarker = ref<any>(null)
const routeLine = ref<any>(null)
const providerLocation = ref<ProviderLocationPayload | null>(null)
const isMapLoaded = ref(false)
const mapError = ref<string | null>(null)
const lastUpdateTime = ref<Date | null>(null)
const connectionStatus = ref<'connected' | 'waiting' | 'disconnected'>('waiting')

// Leaflet instance (loaded dynamically)
let L: any = null
let realtimeChannel: RealtimeChannel | null = null
let locationUpdateInterval: ReturnType<typeof setInterval> | null = null

// Computed
const distanceToPickup = computed(() => {
  if (!providerLocation.value) return null
  
  const distance = calculateDistance(
    providerLocation.value.lat,
    providerLocation.value.lng,
    props.pickupLat,
    props.pickupLng
  )
  
  if (distance < 1) {
    return `${Math.round(distance * 1000)} ม.`
  }
  return `${distance.toFixed(1)} กม.`
})

const isProviderNearby = computed(() => {
  if (!providerLocation.value) return false
  
  const distance = calculateDistance(
    providerLocation.value.lat,
    providerLocation.value.lng,
    props.pickupLat,
    props.pickupLng
  )
  
  return distance < 0.1 // 100 meters
})

// Calculate distance using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Create custom SVG icons for markers
function createProviderIcon(heading?: number): any {
  const rotation = heading || 0
  const svgIcon = `
    <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
        </filter>
      </defs>
      <g transform="rotate(${rotation}, 24, 24)" filter="url(#shadow)">
        <circle cx="24" cy="24" r="18" fill="#1A1A1A"/>
        <path d="M24 10 L30 28 L24 24 L18 28 Z" fill="#00A86B"/>
        <circle cx="24" cy="24" r="6" fill="#FFFFFF"/>
      </g>
    </svg>
  `
  
  return L.divIcon({
    html: svgIcon,
    className: 'provider-marker-icon',
    iconSize: [48, 48],
    iconAnchor: [24, 24]
  })
}

function createPickupIcon(): any {
  const svgIcon = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="16" fill="#00A86B" stroke="#FFFFFF" stroke-width="3"/>
      <circle cx="20" cy="20" r="6" fill="#FFFFFF"/>
    </svg>
  `
  
  return L.divIcon({
    html: svgIcon,
    className: 'pickup-marker-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  })
}

function createDestinationIcon(): any {
  const svgIcon = `
    <svg width="40" height="52" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 0C8.95 0 0 8.95 0 20c0 15 20 32 20 32s20-17 20-32C40 8.95 31.05 0 20 0z" fill="#E53935"/>
      <circle cx="20" cy="20" r="8" fill="#FFFFFF"/>
    </svg>
  `
  
  return L.divIcon({
    html: svgIcon,
    className: 'destination-marker-icon',
    iconSize: [40, 52],
    iconAnchor: [20, 52]
  })
}

// Initialize Leaflet map
async function initMap() {
  try {
    // Dynamically import Leaflet
    L = await import('leaflet')
    await import('leaflet/dist/leaflet.css')
    
    if (!mapContainer.value) return
    
    // Create map centered on pickup location
    map.value = L.map(mapContainer.value, {
      center: [props.pickupLat, props.pickupLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    })
    
    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map.value)
    
    // Add pickup marker
    pickupMarker.value = L.marker([props.pickupLat, props.pickupLng], {
      icon: createPickupIcon()
    }).addTo(map.value)
    
    // Add destination marker if provided
    if (props.destinationLat && props.destinationLng) {
      destinationMarker.value = L.marker([props.destinationLat, props.destinationLng], {
        icon: createDestinationIcon()
      }).addTo(map.value)
    }
    
    isMapLoaded.value = true
    
    // Fit bounds to show all markers
    fitMapBounds()
    
  } catch (error) {
    console.error('Failed to initialize map:', error)
    mapError.value = 'ไม่สามารถโหลดแผนที่ได้'
  }
}

// Update provider marker position and heading
function updateProviderMarker(location: ProviderLocationPayload) {
  if (!map.value || !L) return
  
  const { lat, lng, heading } = location
  
  if (providerMarker.value) {
    providerMarker.value.setLatLng([lat, lng])
    providerMarker.value.setIcon(createProviderIcon(heading))
  } else {
    providerMarker.value = L.marker([lat, lng], {
      icon: createProviderIcon(heading)
    }).addTo(map.value)
  }
  
  updateRouteLine(location)
  map.value.panTo([lat, lng], { animate: true, duration: 0.5 })
}

// Update route line from provider to pickup
function updateRouteLine(location: ProviderLocationPayload) {
  if (!map.value || !L) return
  
  if (routeLine.value) {
    map.value.removeLayer(routeLine.value)
  }
  
  const points: [number, number][] = [
    [location.lat, location.lng],
    [props.pickupLat, props.pickupLng]
  ]
  
  if (props.destinationLat && props.destinationLng) {
    points.push([props.destinationLat, props.destinationLng])
  }
  
  routeLine.value = L.polyline(points, {
    color: '#00A86B',
    weight: 4,
    opacity: 0.8,
    dashArray: '10, 10',
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(map.value)
}

// Fit map bounds to show all markers
function fitMapBounds() {
  if (!map.value || !L) return
  
  const bounds = L.latLngBounds([[props.pickupLat, props.pickupLng]])
  
  if (providerLocation.value) {
    bounds.extend([providerLocation.value.lat, providerLocation.value.lng])
  }
  
  if (props.destinationLat && props.destinationLng) {
    bounds.extend([props.destinationLat, props.destinationLng])
  }
  
  map.value.fitBounds(bounds, { padding: [50, 50] })
}

// Handle location update
function handleLocationUpdate(location: ProviderLocationPayload) {
  providerLocation.value = location
  lastUpdateTime.value = new Date()
  connectionStatus.value = 'connected'
  
  updateProviderMarker(location)
  emit('location-updated', location)
  
  if (isProviderNearby.value) {
    emit('provider-arrived')
  }
}

// Subscribe to realtime provider location updates
function subscribeToProviderLocation() {
  realtimeChannel = supabase
    .channel(`provider-location-${props.providerId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'service_providers',
        filter: `id=eq.${props.providerId}`
      },
      (payload) => {
        const { current_lat, current_lng, heading } = payload.new as any
        if (current_lat && current_lng) {
          handleLocationUpdate({
            providerId: props.providerId,
            lat: current_lat,
            lng: current_lng,
            heading: heading || 0
          })
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        connectionStatus.value = 'connected'
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        connectionStatus.value = 'disconnected'
      }
    })
}

// Poll for location updates every 5 seconds as backup
function startLocationPolling() {
  locationUpdateInterval = setInterval(async () => {
    try {
      const { data } = await supabase
        .from('service_providers')
        .select('current_lat, current_lng, heading')
        .eq('id', props.providerId)
        .single()
      
      if (data && data.current_lat && data.current_lng) {
        handleLocationUpdate({
          providerId: props.providerId,
          lat: data.current_lat,
          lng: data.current_lng,
          heading: data.heading || 0
        })
      }
    } catch (error) {
      console.error('Failed to poll provider location:', error)
    }
  }, 5000)
}

let unsubscribeCrossRole: (() => void) | null = null

onMounted(async () => {
  await nextTick()
  await initMap()
  
  subscribeToProviderLocation()
  startLocationPolling()
  
  unsubscribeCrossRole = subscribe<ProviderLocationPayload>(
    'provider:location_updated',
    (event) => {
      if (event.metadata.requestId === props.requestId) {
        handleLocationUpdate(event.payload)
      }
    },
    { requestIds: [props.requestId] }
  )
  
  try {
    const { data } = await supabase
      .from('service_providers')
      .select('current_lat, current_lng, heading')
      .eq('id', props.providerId)
      .single()
    
    if (data && data.current_lat && data.current_lng) {
      handleLocationUpdate({
        providerId: props.providerId,
        lat: data.current_lat,
        lng: data.current_lng,
        heading: data.heading || 0
      })
    }
  } catch (error) {
    console.error('Failed to fetch initial provider location:', error)
  }
})

onUnmounted(() => {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel)
  if (locationUpdateInterval) clearInterval(locationUpdateInterval)
  if (unsubscribeCrossRole) unsubscribeCrossRole()
  if (map.value) map.value.remove()
})

watch(isProviderNearby, (nearby) => {
  if (nearby) emit('provider-arrived')
})
</script>

<template>
  <div class="live-tracker">
    <div class="map-container">
      <div ref="mapContainer" class="map-element" :class="{ loaded: isMapLoaded }"></div>
      
      <div v-if="!isMapLoaded && !mapError" class="map-loading">
        <div class="loading-spinner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"/>
          </svg>
        </div>
        <span>กำลังโหลดแผนที่...</span>
      </div>
      
      <div class="connection-badge" :class="connectionStatus">
        <span class="status-dot"></span>
        <span class="status-text">
          {{ connectionStatus === 'connected' ? 'Live' : 
             connectionStatus === 'waiting' ? 'รอสัญญาณ' : 'ไม่เชื่อมต่อ' }}
        </span>
      </div>
      
      <div v-if="distanceToPickup" class="distance-overlay">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0z"/>
          <path d="M5 17H3v-4l2-5h9l4 5h3v4h-2"/>
        </svg>
        <span>{{ distanceToPickup }}</span>
      </div>
      
      <div v-if="lastUpdateTime" class="update-time">
        อัพเดทล่าสุด: {{ lastUpdateTime.toLocaleTimeString('th-TH') }}
      </div>
    </div>
    
    <Transition name="slide-up">
      <div v-if="isProviderNearby" class="nearby-alert">
        <div class="alert-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div class="alert-content">
          <span class="alert-title">ผู้ให้บริการใกล้ถึงแล้ว!</span>
          <span class="alert-subtitle">กรุณาเตรียมตัวที่จุดรับ</span>
        </div>
      </div>
    </Transition>
    
    <div v-if="mapError" class="map-error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{{ mapError }}</span>
    </div>
  </div>
</template>

<style scoped>
.live-tracker {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.map-container {
  position: relative;
  width: 100%;
  height: 300px;
  border-radius: 16px;
  overflow: hidden;
  background: #F5F5F5;
}

.map-element {
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.map-element.loaded {
  opacity: 1;
}

.map-loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: linear-gradient(135deg, #E8F5EF 0%, #F5F5F5 100%);
}

.loading-spinner svg {
  width: 32px;
  height: 32px;
  color: #00A86B;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.map-loading span {
  font-size: 14px;
  color: #666666;
}

.connection-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999999;
}

.connection-badge.connected .status-dot {
  background: #00A86B;
  animation: blink 1.5s ease infinite;
}

.connection-badge.waiting .status-dot {
  background: #F5A623;
  animation: blink 1s ease infinite;
}

.connection-badge.disconnected .status-dot {
  background: #E53935;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 12px;
  font-weight: 600;
  color: #1A1A1A;
}

.distance-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(0, 168, 107, 0.95);
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 168, 107, 0.3);
  z-index: 1000;
}

.distance-overlay svg {
  width: 18px;
  height: 18px;
  color: #FFFFFF;
}

.distance-overlay span {
  font-size: 14px;
  font-weight: 700;
  color: #FFFFFF;
}

.update-time {
  position: absolute;
  bottom: 12px;
  left: 12px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  font-size: 11px;
  color: #666666;
  z-index: 1000;
}

.nearby-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  border-radius: 16px;
  color: #FFFFFF;
}

.alert-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  flex-shrink: 0;
}

.alert-icon svg {
  width: 24px;
  height: 24px;
}

.alert-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.alert-title {
  font-size: 16px;
  font-weight: 700;
}

.alert-subtitle {
  font-size: 13px;
  opacity: 0.9;
}

.map-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #FFF3F3;
  border-radius: 12px;
  color: #E53935;
  font-size: 14px;
}

.map-error svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

:deep(.provider-marker-icon),
:deep(.pickup-marker-icon),
:deep(.destination-marker-icon) {
  background: transparent;
  border: none;
}

:deep(.leaflet-control-attribution) {
  display: none;
}
</style>
