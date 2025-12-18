<script setup lang="ts">
/**
 * Feature: F268 - Location Picker
 * Map-based location picker with Leaflet - ใช้งานได้จริง
 */
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

interface Location {
  lat: number
  lng: number
  address: string
}

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  label?: string
  type?: 'pickup' | 'destination'
  initialLocation?: { lat: number; lng: number }
}>(), {
  modelValue: '',
  placeholder: 'เลือกตำแหน่งบนแผนที่',
  type: 'pickup'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'confirm': [location: Location]
  'location-selected': [location: Location]
  'close': []
}>()

// Default center: Bangkok
const DEFAULT_CENTER = { lat: 13.7563, lng: 100.5018 }

const mapContainer = ref<HTMLElement | null>(null)
const map = ref<L.Map | null>(null)
const centerMarker = ref<L.Marker | null>(null)
const tempLocation = ref<Location>({ 
  lat: props.initialLocation?.lat || DEFAULT_CENTER.lat, 
  lng: props.initialLocation?.lng || DEFAULT_CENTER.lng, 
  address: props.modelValue || '' 
})
const loading = ref(false)
const isGettingAddress = ref(false)
const searchQuery = ref('')
const searchResults = ref<Array<{ id: string; name: string; address: string; lat: number; lng: number }>>([])
const showSearchResults = ref(false)

// Mock places for search
const mockPlaces = [
  { id: '1', name: 'เซ็นทรัลเวิลด์', address: 'ราชดำริ, ปทุมวัน, กรุงเทพฯ', lat: 13.7466, lng: 100.5391 },
  { id: '2', name: 'สยามพารากอน', address: 'พระราม 1, ปทุมวัน, กรุงเทพฯ', lat: 13.7461, lng: 100.5347 },
  { id: '3', name: 'เทอร์มินอล 21', address: 'สุขุมวิท, วัฒนา, กรุงเทพฯ', lat: 13.7377, lng: 100.5603 },
  { id: '4', name: 'เอ็มควอเทียร์', address: 'สุขุมวิท, คลองเตย, กรุงเทพฯ', lat: 13.7314, lng: 100.5697 },
  { id: '5', name: 'ไอคอนสยาม', address: 'เจริญนคร, คลองสาน, กรุงเทพฯ', lat: 13.7267, lng: 100.5100 },
  { id: '6', name: 'สนามบินสุวรรณภูมิ', address: 'บางพลี, สมุทรปราการ', lat: 13.6900, lng: 100.7501 },
  { id: '7', name: 'สนามบินดอนเมือง', address: 'ดอนเมือง, กรุงเทพฯ', lat: 13.9126, lng: 100.6068 },
  { id: '8', name: 'หมอชิต', address: 'จตุจักร, กรุงเทพฯ', lat: 13.8022, lng: 100.5530 },
  { id: '9', name: 'อนุสาวรีย์ชัยสมรภูมิ', address: 'ราชเทวี, กรุงเทพฯ', lat: 13.7649, lng: 100.5382 },
  { id: '10', name: 'สถานีรถไฟหัวลำโพง', address: 'ปทุมวัน, กรุงเทพฯ', lat: 13.7380, lng: 100.5173 }
]

// Create custom icon based on type
const createPinIcon = () => {
  const color = props.type === 'pickup' ? '#00A86B' : '#E53935'
  const svgIcon = `
    <svg width="48" height="64" viewBox="0 0 48 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="pin-shadow" x="-50%" y="-20%" width="200%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.3"/>
        </filter>
      </defs>
      <ellipse cx="24" cy="60" rx="8" ry="3" fill="#000" opacity="0.2"/>
      <path d="M24 0C10.75 0 0 10.75 0 24c0 18 24 40 24 40s24-22 24-40C48 10.75 37.25 0 24 0z" 
            fill="${color}" filter="url(#pin-shadow)"/>
      <circle cx="24" cy="24" r="10" fill="#fff"/>
      <circle cx="24" cy="24" r="5" fill="${color}"/>
    </svg>
  `
  return L.divIcon({
    html: svgIcon,
    className: 'location-pin-icon',
    iconSize: [48, 64],
    iconAnchor: [24, 64]
  })
}

// Initialize map
const initMap = async () => {
  await nextTick()
  
  if (!mapContainer.value || map.value) return
  
  const initialCenter = props.initialLocation || DEFAULT_CENTER
  
  map.value = L.map(mapContainer.value, {
    center: [initialCenter.lat, initialCenter.lng],
    zoom: 15,
    zoomControl: true,
    attributionControl: false
  })

  // Add tile layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map.value)

  // Add center marker
  centerMarker.value = L.marker([initialCenter.lat, initialCenter.lng], {
    icon: createPinIcon(),
    draggable: true
  }).addTo(map.value)

  // Update location when marker is dragged
  centerMarker.value.on('dragend', async () => {
    if (centerMarker.value) {
      const pos = centerMarker.value.getLatLng()
      tempLocation.value.lat = pos.lat
      tempLocation.value.lng = pos.lng
      await reverseGeocode(pos.lat, pos.lng)
    }
  })

  // Update marker when map is moved
  map.value.on('moveend', async () => {
    if (map.value && centerMarker.value) {
      const center = map.value.getCenter()
      centerMarker.value.setLatLng(center)
      tempLocation.value.lat = center.lat
      tempLocation.value.lng = center.lng
      await reverseGeocode(center.lat, center.lng)
    }
  })

  // Initial reverse geocode
  await reverseGeocode(initialCenter.lat, initialCenter.lng)
}

// Reverse geocode to get address
const reverseGeocode = async (lat: number, lng: number) => {
  isGettingAddress.value = true
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'th' } }
    )
    const data = await response.json()
    
    if (data && data.display_name) {
      // Simplify address
      const parts = data.display_name.split(',').slice(0, 3)
      tempLocation.value.address = parts.join(', ')
    } else {
      tempLocation.value.address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    }
  } catch {
    tempLocation.value.address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  } finally {
    isGettingAddress.value = false
  }
}

// Get current location
const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    alert('เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง')
    return
  }
  
  loading.value = true
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      
      tempLocation.value.lat = lat
      tempLocation.value.lng = lng
      
      if (map.value) {
        map.value.setView([lat, lng], 16)
      }
      if (centerMarker.value) {
        centerMarker.value.setLatLng([lat, lng])
      }
      
      await reverseGeocode(lat, lng)
      loading.value = false
    },
    (error) => {
      console.error('Geolocation error:', error)
      alert('ไม่สามารถระบุตำแหน่งได้ กรุณาลองใหม่')
      loading.value = false
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

// Search places
const searchPlaces = () => {
  if (searchQuery.value.length < 2) {
    searchResults.value = []
    showSearchResults.value = false
    return
  }
  
  const query = searchQuery.value.toLowerCase()
  searchResults.value = mockPlaces.filter(p => 
    p.name.toLowerCase().includes(query) || p.address.toLowerCase().includes(query)
  ).slice(0, 5)
  showSearchResults.value = searchResults.value.length > 0
}

// Select search result
const selectPlace = async (place: typeof mockPlaces[0]) => {
  tempLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.name
  }
  
  if (map.value) {
    map.value.setView([place.lat, place.lng], 16)
  }
  if (centerMarker.value) {
    centerMarker.value.setLatLng([place.lat, place.lng])
  }
  
  searchQuery.value = ''
  searchResults.value = []
  showSearchResults.value = false
}

// Confirm location
const confirmLocation = () => {
  const loc: Location = {
    lat: tempLocation.value.lat,
    lng: tempLocation.value.lng,
    address: tempLocation.value.address || `${tempLocation.value.lat.toFixed(6)}, ${tempLocation.value.lng.toFixed(6)}`
  }
  emit('update:modelValue', loc.address)
  emit('confirm', loc)
  emit('location-selected', loc)
}

// Close picker
const closePicker = () => {
  emit('close')
}

// Cleanup
onMounted(() => {
  initMap()
})

onUnmounted(() => {
  if (map.value) {
    map.value.remove()
    map.value = null
  }
})

// Watch for initial location changes
watch(() => props.initialLocation, (newLoc) => {
  if (newLoc && map.value && centerMarker.value) {
    map.value.setView([newLoc.lat, newLoc.lng], 15)
    centerMarker.value.setLatLng([newLoc.lat, newLoc.lng])
    tempLocation.value.lat = newLoc.lat
    tempLocation.value.lng = newLoc.lng
    reverseGeocode(newLoc.lat, newLoc.lng)
  }
})
</script>

<template>
  <Teleport to="body">
    <div class="location-picker-modal">
      <!-- Header -->
      <div class="modal-header">
        <button type="button" class="close-btn" @click="closePicker">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h3 class="modal-title">
          {{ type === 'pickup' ? 'เลือกจุดรับ' : 'เลือกจุดหมาย' }}
        </h3>
        <div style="width: 40px"></div>
      </div>
      
      <!-- Search Bar -->
      <div class="search-section">
        <div class="search-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="ค้นหาสถานที่..." 
            @input="searchPlaces"
            @focus="showSearchResults = searchResults.length > 0"
          />
          <button v-if="searchQuery" type="button" class="clear-search" @click="searchQuery = ''; searchResults = []">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <!-- Search Results -->
        <div v-if="showSearchResults && searchResults.length > 0" class="search-results">
          <button 
            v-for="place in searchResults" 
            :key="place.id"
            type="button"
            class="search-result-item"
            @click="selectPlace(place)"
          >
            <div class="result-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div class="result-info">
              <span class="result-name">{{ place.name }}</span>
              <span class="result-address">{{ place.address }}</span>
            </div>
          </button>
        </div>
      </div>
      
      <!-- Map Container -->
      <div class="map-wrapper">
        <div ref="mapContainer" class="map-container"></div>
        
        <!-- Center crosshair indicator -->
        <div class="center-indicator">
          <div class="crosshair"></div>
        </div>
        
        <!-- Current Location Button -->
        <button type="button" class="current-location-btn" :disabled="loading" @click="getCurrentLocation">
          <svg v-if="!loading" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
          </svg>
          <div v-else class="spinner-small"></div>
        </button>
      </div>
      
      <!-- Location Info -->
      <div class="location-info-section">
        <div class="location-card">
          <div class="location-marker" :class="type">
            <div class="marker-dot"></div>
          </div>
          <div class="location-details">
            <span class="location-label">{{ type === 'pickup' ? 'จุดรับ' : 'จุดหมาย' }}</span>
            <span v-if="isGettingAddress" class="location-address loading">กำลังค้นหาที่อยู่...</span>
            <span v-else class="location-address">{{ tempLocation.address || 'เลื่อนแผนที่เพื่อเลือกตำแหน่ง' }}</span>
          </div>
        </div>
        
        <div class="coords-display">
          <span>{{ tempLocation.lat.toFixed(6) }}, {{ tempLocation.lng.toFixed(6) }}</span>
        </div>
      </div>
      
      <!-- Confirm Button -->
      <div class="modal-footer">
        <button 
          type="button" 
          class="btn-confirm" 
          :disabled="!tempLocation.address || isGettingAddress"
          @click="confirmLocation"
        >
          ยืนยันตำแหน่ง
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.location-picker-modal {
  position: fixed;
  inset: 0;
  background: #fff;
  z-index: 9999;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top));
  border-bottom: 1px solid #E8E8E8;
  background: #fff;
}

.close-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #1A1A1A;
}

.modal-title {
  font-size: 17px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.search-section {
  position: relative;
  padding: 12px 16px;
  background: #fff;
  z-index: 10;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #F5F5F5;
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.search-bar:focus-within {
  background: #fff;
  border-color: #00A86B;
}

.search-bar input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  color: #1A1A1A;
  outline: none;
}

.search-bar input::placeholder {
  color: #999;
}

.clear-search {
  padding: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #999;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 16px;
  right: 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-height: 280px;
  overflow-y: auto;
  z-index: 100;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  background: transparent;
  border: none;
  border-bottom: 1px solid #F0F0F0;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: #F8FDF9;
}

.result-icon {
  width: 36px;
  height: 36px;
  background: #E8F5EF;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
  flex-shrink: 0;
}

.result-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.result-name {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.result-address {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.map-wrapper {
  flex: 1;
  position: relative;
  min-height: 300px;
}

.map-container {
  width: 100%;
  height: 100%;
}

.center-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 1000;
}

.crosshair {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(0, 0, 0, 0.3);
  border-radius: 50%;
}

.current-location-btn {
  position: absolute;
  bottom: 20px;
  right: 16px;
  width: 48px;
  height: 48px;
  background: #fff;
  border: none;
  border-radius: 50%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
  z-index: 1000;
  transition: all 0.2s;
}

.current-location-btn:hover {
  transform: scale(1.05);
}

.current-location-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.location-info-section {
  padding: 16px;
  background: #fff;
  border-top: 1px solid #E8E8E8;
}

.location-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #F8F8F8;
  border-radius: 12px;
}

.location-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.location-marker.pickup {
  background: #00A86B;
}

.location-marker.destination {
  background: #E53935;
}

.marker-dot {
  width: 6px;
  height: 6px;
  background: #fff;
  border-radius: 50%;
}

.location-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.location-label {
  font-size: 12px;
  font-weight: 500;
  color: #666;
}

.location-address {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.location-address.loading {
  color: #999;
  font-style: italic;
}

.coords-display {
  margin-top: 8px;
  text-align: center;
  font-size: 11px;
  color: #999;
  font-family: monospace;
}

.modal-footer {
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #E8E8E8;
}

.btn-confirm {
  width: 100%;
  padding: 16px 24px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  transition: all 0.2s;
}

.btn-confirm:hover:not(:disabled) {
  background: #008F5B;
}

.btn-confirm:disabled {
  background: #E8E8E8;
  color: #999;
  box-shadow: none;
  cursor: not-allowed;
}

/* Fix Leaflet z-index issues */
:deep(.leaflet-pane) {
  z-index: 1;
}

:deep(.leaflet-control) {
  z-index: 2;
}

:deep(.location-pin-icon) {
  background: transparent !important;
  border: none !important;
}
</style>
