<script setup lang="ts">
import { ref, watch } from 'vue'
import { useLocation, type GeoLocation } from '../composables/useLocation'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  type?: 'pickup' | 'destination'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'locationSelected', location: GeoLocation): void
}>()

const { getCurrentPosition, isLocating, locationError } = useLocation()

const inputValue = ref(props.modelValue)
const suggestions = ref<Array<{ place_id: string; display_name: string; lat: string; lon: string }>>([])
const showSuggestions = ref(false)
const isSearching = ref(false)
const selectedLocation = ref<GeoLocation | null>(null)

// Debounce search
let searchTimeout: ReturnType<typeof setTimeout> | null = null

// Search using Nominatim (OpenStreetMap) - FREE!
const searchPlaces = async (query: string) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=th&limit=5&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'th,en'
        }
      }
    )
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Search error:', error)
    return []
  }
}

const handleInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  inputValue.value = value
  emit('update:modelValue', value)
  
  if (searchTimeout) clearTimeout(searchTimeout)
  
  if (value.length < 2) {
    suggestions.value = []
    showSuggestions.value = false
    return
  }
  
  searchTimeout = setTimeout(async () => {
    isSearching.value = true
    try {
      suggestions.value = await searchPlaces(value)
      showSuggestions.value = suggestions.value.length > 0
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      isSearching.value = false
    }
  }, 300)
}

const selectSuggestion = async (place: { place_id: string; display_name: string; lat: string; lon: string }) => {
  showSuggestions.value = false
  
  inputValue.value = place.display_name
  emit('update:modelValue', place.display_name)
  
  selectedLocation.value = {
    lat: parseFloat(place.lat),
    lng: parseFloat(place.lon),
    address: place.display_name
  }
  emit('locationSelected', selectedLocation.value)
}

const useCurrentLocation = async () => {
  try {
    const location = await getCurrentPosition()
    inputValue.value = location.address
    emit('update:modelValue', location.address)
    selectedLocation.value = location
    emit('locationSelected', location)
  } catch (error) {
    console.error('Get current location error:', error)
  }
}

const handleFocus = () => {
  if (suggestions.value.length > 0) {
    showSuggestions.value = true
  }
}

const handleBlur = () => {
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

watch(() => props.modelValue, (newValue) => {
  if (newValue !== inputValue.value) {
    inputValue.value = newValue
  }
})

// Format display name to be shorter
const formatDisplayName = (name: string) => {
  const parts = name.split(',')
  if (parts.length > 3) {
    return parts.slice(0, 3).join(',')
  }
  return name
}
</script>

<template>
  <div class="location-picker">
    <div class="input-wrapper">
      <div class="location-indicator" :class="type === 'pickup' ? 'indicator-pickup' : 'indicator-destination'"></div>
      
      <input
        :value="inputValue"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        type="text"
        :placeholder="placeholder || 'ค้นหาสถานที่'"
        class="location-input"
        autocomplete="off"
      />
      
      <button
        v-if="type === 'pickup'"
        @click="useCurrentLocation"
        :disabled="isLocating"
        class="gps-btn"
        type="button"
        title="ใช้ตำแหน่งปัจจุบัน"
      >
        <svg v-if="isLocating" class="spinner-icon" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <svg v-else class="gps-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0-6v2m0 16v2m8-10h2M2 12h2m13.66-5.66l1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14l-1.41-1.41"/>
        </svg>
      </button>
      
      <div v-if="isSearching" class="search-indicator">
        <svg class="spinner-icon" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
    </div>
    
    <div v-if="showSuggestions && suggestions.length > 0" class="suggestions-dropdown">
      <button
        v-for="suggestion in suggestions"
        :key="suggestion.place_id"
        @click="selectSuggestion(suggestion)"
        class="suggestion-item"
        type="button"
      >
        <svg class="suggestion-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        <div class="suggestion-text">
          <span class="suggestion-main">{{ formatDisplayName(suggestion.display_name) }}</span>
        </div>
      </button>
    </div>
    
    <p v-if="locationError" class="error-text">{{ locationError }}</p>
  </div>
</template>

<style scoped>
.location-picker {
  position: relative;
  width: 100%;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: #F6F6F6;
  border-radius: 8px;
  padding: 0 12px;
}

.location-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.indicator-pickup {
  background-color: #000000;
}

.indicator-destination {
  background-color: #000000;
  border: 2px solid #000000;
  background-color: transparent;
}

.location-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 14px 0;
  font-size: 16px;
  outline: none;
  color: #000000;
}

.location-input::placeholder {
  color: #6B6B6B;
}

.gps-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: #6B6B6B;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.gps-btn:hover:not(:disabled) {
  background-color: #E5E5E5;
  color: #000000;
}

.gps-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.gps-icon {
  width: 20px;
  height: 20px;
}

.search-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.spinner-icon {
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin-top: 4px;
  z-index: 100;
  max-height: 300px;
  overflow-y: auto;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.suggestion-item:hover {
  background-color: #F6F6F6;
}

.suggestion-icon {
  width: 20px;
  height: 20px;
  color: #6B6B6B;
  flex-shrink: 0;
  margin-top: 2px;
}

.suggestion-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.suggestion-main {
  font-size: 14px;
  font-weight: 500;
  color: #000000;
}

.error-text {
  font-size: 12px;
  color: #E11900;
  margin-top: 4px;
  padding-left: 22px;
}
</style>
