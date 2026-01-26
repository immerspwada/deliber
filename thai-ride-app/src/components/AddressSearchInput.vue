<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { usePlaceSearch, type PlaceResult } from '../composables/usePlaceSearch'
import { useLeafletMap } from '../composables/useLeafletMap'
import L from 'leaflet'

interface SavedPlace {
  name: string
  address: string
  lat: number
  lng: number
}

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  label?: string
  homePlace?: SavedPlace | null
  workPlace?: SavedPlace | null
  recentPlaces?: Array<{ name: string; address: string; lat?: number; lng?: number }>
  currentLat?: number
  currentLng?: number
  showSavedPlaces?: boolean
  readonly?: boolean
  icon?: 'pickup' | 'destination' | 'none'
  showMapPicker?: boolean
}>(), {
  placeholder: 'ค้นหาสถานที่...',
  showSavedPlaces: true,
  readonly: false,
  icon: 'none',
  showMapPicker: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'select': [place: PlaceResult]
  'select-home': []
  'select-work': []
  'select-recent': [place: { name: string; address: string; lat?: number; lng?: number }]
  'focus': []
  'blur': []
}>()

const { results: searchResults, loading: searchLoading, searchPlaces, clearResults } = usePlaceSearch()

const inputRef = ref<HTMLInputElement | null>(null)
const showDropdown = ref(false)
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

// Map picker state
const showMapModal = ref(false)
const mapContainer = ref<HTMLElement | null>(null)
const mapPickerLoading = ref(false)
const gettingLocation = ref(false)
const selectedLocation = ref<{ lat: number; lng: number; address: string } | null>(null)
const { mapInstance, initMap, addMarker, clearMarkers, isMapReady, setCenter } = useLeafletMap()
let draggableMarker: L.Marker | null = null

// Combined suggestions
const suggestions = computed(() => {
  const items: Array<{
    type: 'home' | 'work' | 'recent' | 'search'
    name: string
    address: string
    data?: any
  }> = []

  const query = props.modelValue?.toLowerCase().trim() || ''

  // Show saved places when no query or short query
  if (props.showSavedPlaces && query.length < 2) {
    if (props.homePlace) {
      items.push({
        type: 'home',
        name: props.homePlace.name || 'บ้าน',
        address: props.homePlace.address
      })
    }
    if (props.workPlace) {
      items.push({
        type: 'work',
        name: props.workPlace.name || 'ที่ทำงาน',
        address: props.workPlace.address
      })
    }
    props.recentPlaces?.slice(0, 3).forEach(place => {
      items.push({
        type: 'recent',
        name: place.name,
        address: place.address,
        data: place
      })
    })
  }

  // Add search results
  searchResults.value.forEach(result => {
    items.push({
      type: 'search',
      name: result.name,
      address: result.address,
      data: result
    })
  })

  return items.slice(0, 8)
})

const onInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)

  // Debounce search
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }

  if (value.length >= 2) {
    searchTimeout.value = setTimeout(() => {
      searchPlaces(value, props.currentLat, props.currentLng)
    }, 300)
  } else {
    clearResults()
  }
}

const onFocus = () => {
  showDropdown.value = true
  emit('focus')
}

const onBlur = () => {
  setTimeout(() => {
    showDropdown.value = false
  }, 250)
  emit('blur')
}

const selectItem = (item: typeof suggestions.value[0]) => {
  if (item.type === 'home') {
    emit('select-home')
  } else if (item.type === 'work') {
    emit('select-work')
  } else if (item.type === 'recent' && item.data) {
    emit('select-recent', item.data)
  } else if (item.type === 'search' && item.data) {
    emit('select', item.data)
  }
  
  emit('update:modelValue', item.name)
  showDropdown.value = false
  clearResults()
}

// Focus input programmatically
const focus = () => {
  inputRef.value?.focus()
}

// Open map picker modal
const openMapPicker = () => {
  showMapModal.value = true
  showDropdown.value = false
  
  // Initialize map after modal is visible
  nextTick(() => {
    if (mapContainer.value && !mapInstance.value) {
      initializeMapPicker()
    }
  })
}

// Initialize map picker
const initializeMapPicker = () => {
  if (!mapContainer.value) return
  
  // Use current location or default to Su-ngai Kolok, Narathiwat
  const initialLat = props.currentLat || 6.0285
  const initialLng = props.currentLng || 101.9658
  
  // Initialize map
  const map = initMap(mapContainer.value, {
    center: { lat: initialLat, lng: initialLng },
    zoom: 15
  })
  
  // Add draggable marker
  draggableMarker = addMarker({
    position: { lat: initialLat, lng: initialLng },
    icon: 'destination',
    draggable: true
  })
  
  if (draggableMarker) {
    // Handle marker drag
    draggableMarker.on('dragend', async () => {
      if (!draggableMarker) return
      
      const position = draggableMarker.getLatLng()
      await reverseGeocode(position.lat, position.lng)
    })
  }
  
  // Handle map click to move marker
  map.on('click', async (e: L.LeafletMouseEvent) => {
    if (draggableMarker) {
      draggableMarker.setLatLng(e.latlng)
      await reverseGeocode(e.latlng.lat, e.latlng.lng)
    }
  })
  
  // Initial reverse geocode
  reverseGeocode(initialLat, initialLng)
}

// Reverse geocode to get address from coordinates
const reverseGeocode = async (lat: number, lng: number) => {
  mapPickerLoading.value = true
  
  try {
    // Use Nominatim for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=th`
    )
    
    if (!response.ok) throw new Error('Reverse geocoding failed')
    
    const data = await response.json()
    const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    
    selectedLocation.value = { lat, lng, address }
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    selectedLocation.value = {
      lat,
      lng,
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    }
  } finally {
    mapPickerLoading.value = false
  }
}

// Confirm map selection
const confirmMapSelection = () => {
  if (!selectedLocation.value) return
  
  // Emit select event with location data
  emit('select', {
    name: selectedLocation.value.address,
    address: selectedLocation.value.address,
    lat: selectedLocation.value.lat,
    lng: selectedLocation.value.lng
  })
  
  emit('update:modelValue', selectedLocation.value.address)
  closeMapPicker()
}

// Close map picker
const closeMapPicker = () => {
  showMapModal.value = false
  selectedLocation.value = null
  gettingLocation.value = false
  
  // Cleanup map safely with error handling
  try {
    if (draggableMarker) {
      draggableMarker.remove()
      draggableMarker = null
    }
    
    if (mapInstance.value) {
      // Remove all event listeners first
      mapInstance.value.off()
      
      // Clear markers
      clearMarkers()
      
      // Remove map instance
      mapInstance.value.remove()
    }
  } catch (error) {
    // Silently handle cleanup errors - they don't affect user experience
    console.debug('Map cleanup completed with minor issues (safe to ignore)')
  }
}

// Get current location using Geolocation API
const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    alert('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง')
    return
  }
  
  gettingLocation.value = true
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      
      // Move map to current location
      if (mapInstance.value && draggableMarker) {
        setCenter(lat, lng, 16) // Zoom level 16 for detailed view
        draggableMarker.setLatLng([lat, lng])
        
        // Reverse geocode to get address
        await reverseGeocode(lat, lng)
      }
      
      gettingLocation.value = false
    },
    (error) => {
      console.error('Geolocation error:', error)
      gettingLocation.value = false
      
      let errorMessage = 'ไม่สามารถระบุตำแหน่งได้'
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'กรุณาอนุญาตให้เข้าถึงตำแหน่งในการตั้งค่าเบราว์เซอร์'
          break
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'ไม่สามารถระบุตำแหน่งได้ในขณะนี้'
          break
        case error.TIMEOUT:
          errorMessage = 'หมดเวลาในการระบุตำแหน่ง กรุณาลองใหม่'
          break
      }
      
      alert(errorMessage)
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  )
}

defineExpose({ focus })
</script>

<template>
  <div class="address-search">
    <label v-if="label" class="search-label">{{ label }}</label>
    
    <div class="input-wrapper">
      <!-- Icon -->
      <div v-if="icon !== 'none'" class="input-icon">
        <div v-if="icon === 'pickup'" class="dot pickup"></div>
        <div v-else class="dot destination"></div>
      </div>
      
      <input
        ref="inputRef"
        :value="modelValue"
        :placeholder="placeholder"
        :readonly="readonly"
        type="text"
        autocomplete="off"
        class="search-input"
        :class="{ 'has-icon': icon !== 'none', 'has-map-btn': showMapPicker }"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
      />
      
      <!-- Map picker button -->
      <button
        v-if="showMapPicker"
        type="button"
        class="map-picker-btn"
        aria-label="เลือกจากแผนที่"
        @click="openMapPicker"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
        </svg>
      </button>
      
      <!-- Loading spinner -->
      <div v-if="searchLoading" class="input-spinner">
        <div class="spinner"></div>
      </div>
    </div>

    <!-- Dropdown -->
    <div v-if="showDropdown && (suggestions.length > 0 || searchLoading)" class="dropdown">
      <div v-if="searchLoading && suggestions.length === 0" class="dropdown-loading">
        <div class="spinner"></div>
        <span>กำลังค้นหา...</span>
      </div>

      <button
        v-for="(item, index) in suggestions"
        :key="index"
        class="dropdown-item"
        @mousedown.prevent="selectItem(item)"
      >
        <div class="item-icon">
          <!-- Home -->
          <svg v-if="item.type === 'home'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
          <!-- Work -->
          <svg v-else-if="item.type === 'work'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
          <!-- Recent -->
          <svg v-else-if="item.type === 'recent'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <!-- Search result -->
          <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </div>
        
        <div class="item-text">
          <span class="item-name">{{ item.name }}</span>
          <span class="item-address">{{ item.address }}</span>
        </div>
        
        <div v-if="item.type !== 'search'" class="item-badge">
          <span v-if="item.type === 'home'">บ้าน</span>
          <span v-else-if="item.type === 'work'">ที่ทำงาน</span>
          <span v-else>ล่าสุด</span>
        </div>
      </button>
    </div>

    <!-- Map Picker Modal -->
    <Teleport to="body">
      <div v-if="showMapModal" class="map-modal-overlay" @click.self="closeMapPicker">
        <div class="map-modal">
          <!-- Header -->
          <div class="map-modal-header">
            <h3>เลือกตำแหน่งจากแผนที่</h3>
            <button
              type="button"
              class="close-btn"
              aria-label="ปิด"
              @click="closeMapPicker"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Map Container -->
          <div class="map-container">
            <div ref="mapContainer" class="map"></div>
            
            <!-- Instruction overlay -->
            <div class="map-instruction">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"/>
              </svg>
              <span>แตะหรือลากปักหมุดเพื่อเลือกตำแหน่ง</span>
            </div>

            <!-- Current Location Button -->
            <button
              type="button"
              class="current-location-btn"
              :class="{ loading: gettingLocation }"
              :disabled="gettingLocation"
              aria-label="ใช้ตำแหน่งปัจจุบัน"
              @click="getCurrentLocation"
            >
              <svg v-if="!gettingLocation" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <div v-else class="spinner"></div>
            </button>
          </div>

          <!-- Selected Address Display -->
          <div class="selected-address">
            <div v-if="mapPickerLoading" class="loading-address">
              <div class="spinner"></div>
              <span>กำลังค้นหาที่อยู่...</span>
            </div>
            <div v-else-if="selectedLocation" class="address-display">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <div class="address-text">
                <span class="address-label">ที่อยู่ที่เลือก:</span>
                <span class="address-value">{{ selectedLocation.address }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="map-modal-actions">
            <button
              type="button"
              class="btn-secondary"
              @click="closeMapPicker"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              class="btn-primary"
              :disabled="!selectedLocation || mapPickerLoading"
              @click="confirmMapSelection"
            >
              <span v-if="mapPickerLoading">กำลังโหลด...</span>
              <span v-else>ยืนยันตำแหน่ง</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.address-search {
  position: relative;
  width: 100%;
}

.search-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  margin-bottom: 6px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  z-index: 1;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot.pickup {
  background: #000;
}

.dot.destination {
  background: transparent;
  border: 2.5px solid #000;
}

.search-input {
  width: 100%;
  padding: 14px 16px;
  background: #F6F6F6;
  border: 2px solid transparent;
  border-radius: 12px;
  font-size: 16px;
  outline: none;
  transition: all 0.2s ease;
}

.search-input.has-icon {
  padding-left: 42px;
}

.search-input.has-map-btn {
  padding-right: 48px;
}

.search-input:focus {
  background: white;
  border-color: #000;
}

.search-input::placeholder {
  color: #888;
}

.map-picker-btn {
  position: absolute;
  right: 8px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #E5E5E5;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 2;
}

.map-picker-btn:hover {
  background: #F6F6F6;
  border-color: #000;
}

.map-picker-btn:active {
  transform: scale(0.95);
}

.map-picker-btn svg {
  width: 20px;
  height: 20px;
  color: #666;
}

.input-spinner {
  position: absolute;
  right: 14px;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #E5E5E5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Dropdown */
.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  z-index: 100;
  margin-top: 8px;
  overflow: hidden;
  animation: dropdownFade 0.2s ease;
}

@keyframes dropdownFade {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.dropdown-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  color: #888;
  font-size: 14px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  background: white;
  border: none;
  border-bottom: 1px solid #F0F0F0;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: #F6F6F6;
}

.dropdown-item:active {
  background: #EBEBEB;
}

.item-icon {
  width: 40px;
  height: 40px;
  background: #F6F6F6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-icon svg {
  width: 20px;
  height: 20px;
  stroke-width: 1.5;
}

.item-text {
  flex: 1;
  min-width: 0;
}

.item-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-address {
  display: block;
  font-size: 13px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.item-badge {
  flex-shrink: 0;
}

.item-badge span {
  font-size: 11px;
  font-weight: 500;
  color: #666;
  background: #F0F0F0;
  padding: 4px 10px;
  border-radius: 12px;
}

/* Map Modal */
.map-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.map-modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.map-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #F0F0F0;
}

.map-modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F6F6F6;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #EBEBEB;
}

.close-btn:active {
  transform: scale(0.95);
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.map-container {
  position: relative;
  flex: 1;
  min-height: 400px;
  background: #F6F6F6;
}

.map {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.map-instruction {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 10px 16px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-size: 13px;
  font-weight: 500;
  color: #666;
  z-index: 1000;
  pointer-events: none;
}

.map-instruction svg {
  width: 18px;
  height: 18px;
  color: #00A86B;
}

.current-location-btn {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: none;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 1000;
}

.current-location-btn:hover:not(:disabled) {
  background: #F6F6F6;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  transform: scale(1.05);
}

.current-location-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.current-location-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.current-location-btn.loading {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.current-location-btn svg {
  width: 24px;
  height: 24px;
  color: #00A86B;
}

.current-location-btn .spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #E5E5E5;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.selected-address {
  padding: 16px 20px;
  border-top: 1px solid #F0F0F0;
  background: #FAFAFA;
}

.loading-address {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #888;
  font-size: 14px;
}

.address-display {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.address-display svg {
  width: 20px;
  height: 20px;
  color: #00A86B;
  flex-shrink: 0;
  margin-top: 2px;
}

.address-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.address-label {
  font-size: 12px;
  font-weight: 500;
  color: #888;
}

.address-value {
  font-size: 14px;
  font-weight: 500;
  color: #000;
  line-height: 1.4;
}

.map-modal-actions {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #F0F0F0;
}

.btn-secondary,
.btn-primary {
  flex: 1;
  min-height: 48px;
  padding: 0 24px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: #F6F6F6;
  color: #000;
}

.btn-secondary:hover {
  background: #EBEBEB;
}

.btn-secondary:active {
  transform: scale(0.98);
}

.btn-primary {
  background: #00A86B;
  color: white;
}

.btn-primary:hover {
  background: #008F5B;
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-primary:disabled {
  background: #E5E5E5;
  color: #999;
  cursor: not-allowed;
  transform: none;
}

/* Mobile responsive */
@media (max-width: 640px) {
  .map-modal {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .map-container {
    min-height: 300px;
  }

  .map {
    min-height: 300px;
  }

  .map-instruction {
    font-size: 12px;
    padding: 8px 12px;
  }

  .current-location-btn {
    width: 44px;
    height: 44px;
    bottom: 12px;
    right: 12px;
  }

  .current-location-btn svg {
    width: 22px;
    height: 22px;
  }

  .current-location-btn .spinner {
    width: 22px;
    height: 22px;
  }
}
</style>
