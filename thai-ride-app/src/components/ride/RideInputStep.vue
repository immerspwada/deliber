<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import MultiStopInput from '../MultiStopInput.vue'
import { usePlaceSearch, type PlaceResult } from '../../composables/usePlaceSearch'

interface SavedPlace {
  name: string
  address: string
  lat: number
  lng: number
}

interface RecentPlace {
  name: string
  address: string
  lat?: number
  lng?: number
}

interface Stop {
  id: string
  address: string
  lat?: number
  lng?: number
  contactName?: string
  contactPhone?: string
}

interface Suggestion {
  type: 'home' | 'work' | 'recent' | 'search'
  name: string
  address: string
  place?: RecentPlace
  searchResult?: PlaceResult
}

const props = defineProps<{
  pickup: string
  destination: string
  selectedService: 'ride' | 'delivery' | 'shopping'
  homePlace: SavedPlace | null
  workPlace: SavedPlace | null
  recentPlaces: RecentPlace[]
  currentLat?: number
  currentLng?: number
}>()

const emit = defineEmits<{
  'update:pickup': [value: string]
  'update:destination': [value: string]
  'update:selectedService': [value: 'ride' | 'delivery' | 'shopping']
  'confirm': []
  'select-saved-place': [type: 'home' | 'work']
  'select-recent-place': [place: RecentPlace]
  'update:multiStops': [stops: Stop[]]
  'select-search-result': [place: PlaceResult]
}>()

const { results: searchResults, loading: searchLoading, searchPlaces, clearResults } = usePlaceSearch()

const showRecentPlaces = ref(false)
const showMultiStop = ref(false)
const multiStops = ref<Stop[]>([])
const showSuggestions = ref(false)
const destinationInput = ref<HTMLInputElement | null>(null)
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

const services = [
  { id: 'ride', name: 'เรียกรถ', icon: 'car' },
  { id: 'delivery', name: 'ส่งพัสดุ', icon: 'package' },
  { id: 'shopping', name: 'ซื้อของ', icon: 'shopping' }
]

const canConfirm = computed(() => props.pickup && props.destination)

// Combined suggestions: saved places + search results
const filteredSuggestions = computed(() => {
  const query = props.destination.toLowerCase().trim()
  const suggestions: Suggestion[] = []
  
  // If no query, show saved places first
  if (!query || query.length < 2) {
    // Add home if saved
    if (props.homePlace) {
      suggestions.push({
        type: 'home',
        name: props.homePlace.name || 'บ้าน',
        address: props.homePlace.address
      })
    }
    
    // Add work if saved
    if (props.workPlace) {
      suggestions.push({
        type: 'work',
        name: props.workPlace.name || 'ที่ทำงาน',
        address: props.workPlace.address
      })
    }
    
    // Add recent places
    props.recentPlaces.slice(0, 4).forEach(place => {
      suggestions.push({
        type: 'recent',
        name: place.name,
        address: place.address,
        place
      })
    })
  }
  
  // Add search results from API
  searchResults.value.forEach(result => {
    suggestions.push({
      type: 'search',
      name: result.name,
      address: result.address,
      searchResult: result
    })
  })
  
  return suggestions.slice(0, 8)
})

const selectService = (id: string) => {
  emit('update:selectedService', id as 'ride' | 'delivery' | 'shopping')
}

const selectRecentPlace = (place: RecentPlace) => {
  emit('select-recent-place', place)
  showRecentPlaces.value = false
}

const handleMultiStopsUpdate = (stops: Stop[]) => {
  multiStops.value = stops
  emit('update:multiStops', stops)
}

const destinationPlaceholder = computed(() => 
  props.selectedService === 'ride' ? 'ไปไหน?' : 'ส่งที่ไหน?'
)

// Handle destination input
const onDestinationInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  emit('update:destination', value)
  
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

// Handle destination input focus
const onDestinationFocus = () => {
  showSuggestions.value = true
}

// Handle destination input blur with delay for click
const onDestinationBlur = () => {
  setTimeout(() => {
    showSuggestions.value = false
  }, 250)
}

// Handle suggestion selection
const selectSuggestion = (suggestion: Suggestion) => {
  if (suggestion.type === 'home') {
    emit('select-saved-place', 'home')
  } else if (suggestion.type === 'work') {
    emit('select-saved-place', 'work')
  } else if (suggestion.type === 'search' && suggestion.searchResult) {
    emit('select-search-result', suggestion.searchResult)
  } else if (suggestion.place) {
    emit('select-recent-place', suggestion.place)
  }
  showSuggestions.value = false
  clearResults()
}

// Watch destination changes
watch(() => props.destination, (newVal) => {
  if (newVal && document.activeElement === destinationInput.value) {
    showSuggestions.value = true
  }
})
</script>

<template>
  <!-- Service tabs -->
  <div class="service-tabs">
    <button 
      v-for="service in services" 
      :key="service.id"
      @click="selectService(service.id)"
      :class="['service-tab', { active: selectedService === service.id }]"
    >
      <div class="tab-icon">
        <svg v-if="service.icon === 'car'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
        </svg>
        <svg v-else-if="service.icon === 'package'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
        <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
        </svg>
      </div>
      <span>{{ service.name }}</span>
    </button>
  </div>

  <!-- Location inputs -->
  <div class="location-card">
    <div class="location-row">
      <div class="location-dot pickup"></div>
      <div class="location-line"></div>
      <input 
        :value="pickup" 
        @input="$emit('update:pickup', ($event.target as HTMLInputElement).value)"
        type="text" 
        placeholder="จุดรับ" 
        readonly 
        class="location-input" 
      />
    </div>
    <div class="location-divider"></div>
    <div class="location-row destination-row">
      <div class="location-dot destination"></div>
      <input 
        ref="destinationInput"
        :value="destination" 
        @input="onDestinationInput"
        @focus="onDestinationFocus"
        @blur="onDestinationBlur"
        type="text" 
        :placeholder="destinationPlaceholder"
        class="location-input destination-input"
        autocomplete="off"
      />
      <!-- Autocomplete suggestions dropdown -->
      <div v-if="showSuggestions && (filteredSuggestions.length > 0 || searchLoading)" class="suggestions-dropdown">
        <!-- Loading indicator -->
        <div v-if="searchLoading" class="suggestion-loading">
          <div class="loading-spinner"></div>
          <span>กำลังค้นหา...</span>
        </div>
        
        <button 
          v-for="(suggestion, index) in filteredSuggestions" 
          :key="index"
          @mousedown.prevent="selectSuggestion(suggestion)"
          class="suggestion-item"
        >
          <div class="suggestion-icon">
            <!-- Home icon -->
            <svg v-if="suggestion.type === 'home'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            <!-- Work icon -->
            <svg v-else-if="suggestion.type === 'work'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
            <!-- Recent icon -->
            <svg v-else-if="suggestion.type === 'recent'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <!-- Search result / location icon -->
            <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div class="suggestion-text">
            <span class="suggestion-name">{{ suggestion.name }}</span>
            <span class="suggestion-address">{{ suggestion.address }}</span>
          </div>
          <div v-if="suggestion.type !== 'search'" class="suggestion-type">
            <span v-if="suggestion.type === 'home'">บ้าน</span>
            <span v-else-if="suggestion.type === 'work'">ที่ทำงาน</span>
            <span v-else>ล่าสุด</span>
          </div>
        </button>
      </div>
    </div>
  </div>

  <!-- Multi-stop toggle -->
  <button 
    v-if="selectedService === 'ride'" 
    @click="showMultiStop = !showMultiStop" 
    class="multi-stop-toggle"
  >
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
    </svg>
    <span>{{ showMultiStop ? 'ซ่อนจุดแวะ' : 'เพิ่มจุดแวะ' }}</span>
  </button>

  <!-- Multi-stop input -->
  <MultiStopInput 
    v-if="showMultiStop && selectedService === 'ride'"
    :model-value="multiStops"
    @update:model-value="handleMultiStopsUpdate"
    :max-stops="3"
  />

  <!-- Quick destinations -->
  <div class="quick-places">
    <button class="quick-place" @click="$emit('select-saved-place', 'home')">
      <div class="quick-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
      </div>
      <span>{{ homePlace?.name || 'บ้าน' }}</span>
    </button>
    <button class="quick-place" @click="$emit('select-saved-place', 'work')">
      <div class="quick-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
        </svg>
      </div>
      <span>{{ workPlace?.name || 'ที่ทำงาน' }}</span>
    </button>
    <button class="quick-place" @click="showRecentPlaces = true">
      <div class="quick-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <span>ล่าสุด</span>
    </button>
  </div>

  <!-- Recent places modal -->
  <div v-if="showRecentPlaces" class="modal-overlay" @click="showRecentPlaces = false">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>สถานที่ล่าสุด</h3>
        <button @click="showRecentPlaces = false" class="modal-close">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="recent-list">
        <button 
          v-for="place in recentPlaces" 
          :key="place.name"
          @click="selectRecentPlace(place)"
          class="recent-item"
        >
          <div class="recent-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div class="recent-text">
            <span class="recent-name">{{ place.name }}</span>
            <span class="recent-address">{{ place.address }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>

  <button @click="$emit('confirm')" :disabled="!canConfirm" class="btn-primary">
    ยืนยันจุดหมาย
  </button>
</template>

<style scoped>
/* Service Tabs */
.service-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
}

.service-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  background: #F6F6F6;
  border: 2px solid transparent;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 80px;
}

.service-tab:hover {
  background: #EBEBEB;
}

.service-tab:active {
  transform: scale(0.97);
}

.service-tab.active {
  background: white;
  border-color: #000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.tab-icon {
  width: 32px;
  height: 32px;
}

.tab-icon svg {
  width: 100%;
  height: 100%;
  stroke-width: 1.5;
}

.service-tab span {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

/* Location Card */
.location-card {
  background: #F6F6F6;
  border-radius: 16px;
  padding: 6px 0;
  margin-bottom: 16px;
}

.location-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  position: relative;
  min-height: 52px;
}

.location-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.location-dot.pickup {
  background: #000;
}

.location-dot.destination {
  background: transparent;
  border: 2.5px solid #000;
}

.location-line {
  position: absolute;
  left: 23px;
  top: 32px;
  width: 2px;
  height: 28px;
  background: #D0D0D0;
}

.location-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 16px;
  outline: none;
  color: #000;
  padding: 0;
}

.location-input::placeholder {
  color: #888;
}

.destination-input {
  font-weight: 600;
}

.location-divider {
  height: 1px;
  background: #E0E0E0;
  margin-left: 44px;
}

.destination-row {
  position: relative;
}

/* Suggestions Dropdown */
.suggestions-dropdown {
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

.suggestion-item {
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

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background: #F6F6F6;
}

.suggestion-item:active {
  background: #EBEBEB;
}

.suggestion-icon {
  width: 40px;
  height: 40px;
  background: #F6F6F6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.suggestion-icon svg {
  width: 20px;
  height: 20px;
  stroke-width: 1.5;
}

.suggestion-text {
  flex: 1;
  min-width: 0;
}

.suggestion-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-address {
  display: block;
  font-size: 13px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.suggestion-type {
  flex-shrink: 0;
}

.suggestion-type span {
  font-size: 11px;
  font-weight: 500;
  color: #666;
  background: #F0F0F0;
  padding: 4px 10px;
  border-radius: 12px;
}

/* Loading indicator */
.suggestion-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  color: #888;
  font-size: 14px;
}

.loading-spinner {
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

/* Multi-stop toggle */
.multi-stop-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  background: none;
  border: 1px dashed #E5E5E5;
  border-radius: 8px;
  font-size: 13px;
  color: #6B6B6B;
  cursor: pointer;
  transition: all 0.2s ease;
}

.multi-stop-toggle:hover {
  border-color: #000;
  color: #000;
}

/* Quick Places */
.quick-places {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.quick-place {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 12px;
  background: white;
  border: 1.5px solid #E5E5E5;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 72px;
}

.quick-place:hover {
  border-color: #CCC;
  background: #FAFAFA;
}

.quick-place:active {
  transform: scale(0.97);
}

.quick-icon {
  width: 26px;
  height: 26px;
  color: #333;
}

.quick-icon svg {
  width: 100%;
  height: 100%;
  stroke-width: 1.5;
}

.quick-place span {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  width: 100%;
  max-height: 70vh;
  border-radius: 20px 20px 0 0;
  padding: 20px;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.modal-close {
  width: 32px;
  height: 32px;
  background: #F6F6F6;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.modal-close svg {
  width: 18px;
  height: 18px;
}

/* Recent Places */
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #F6F6F6;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
}

.recent-icon {
  width: 36px;
  height: 36px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.recent-icon svg {
  width: 18px;
  height: 18px;
}

.recent-text {
  flex: 1;
}

.recent-name {
  display: block;
  font-size: 15px;
  font-weight: 500;
}

.recent-address {
  font-size: 13px;
  color: #666;
}

/* Button */
.btn-primary {
  width: 100%;
  padding: 18px;
  background: #000;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 8px;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-primary:disabled {
  background: #CCC;
  cursor: not-allowed;
}
</style>
