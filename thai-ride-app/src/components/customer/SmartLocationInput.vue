<script setup lang="ts">
/**
 * SmartLocationInput - Smart Location Search with Contextual Suggestions
 * 
 * Input ค้นหาสถานที่ที่ฉลาด พร้อมแนะนำตามบริบทและพฤติกรรม
 * MUNEEF Style: สีเขียว #00A86B, border-radius 12-16px, touch-friendly
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useSmartSuggestions, type SmartSuggestion } from '../../composables/useSmartSuggestions'
import { useHapticFeedback } from '../../composables/useHapticFeedback'
import { usePlaceSearch, type PlaceResult } from '../../composables/usePlaceSearch'
import { quickTrack } from '../../composables/useUXTracking'

interface Props {
  modelValue?: string
  placeholder?: string
  type?: 'pickup' | 'destination'
  pickupLat?: number
  pickupLng?: number
  disabled?: boolean
  autofocus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'ค้นหาสถานที่...',
  type: 'destination',
  disabled: false,
  autofocus: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'select': [place: PlaceResult]
  'focus': []
  'blur': []
}>()

const { getSuggestions, getPickupSuggestions, getDestinationSuggestions } = useSmartSuggestions()
const haptic = useHapticFeedback()
const { search, results: searchResults, loading: searchLoading } = usePlaceSearch()

const inputRef = ref<HTMLInputElement | null>(null)
const query = ref(props.modelValue)
const isFocused = ref(false)
const showSuggestions = ref(false)
const smartSuggestions = ref<SmartSuggestion[]>([])
const isLoadingSuggestions = ref(false)

// Sync with v-model
watch(() => props.modelValue, (val) => {
  query.value = val
})

watch(query, (val) => {
  emit('update:modelValue', val)
  
  // Search when typing
  if (val.length >= 2) {
    search(val)
  }
})

// Load smart suggestions on mount
onMounted(async () => {
  isLoadingSuggestions.value = true
  try {
    if (props.type === 'pickup') {
      smartSuggestions.value = await getPickupSuggestions()
    } else {
      smartSuggestions.value = await getDestinationSuggestions(props.pickupLat, props.pickupLng)
    }
  } finally {
    isLoadingSuggestions.value = false
  }
  
  if (props.autofocus && inputRef.value) {
    inputRef.value.focus()
  }
})

// Combined suggestions (smart + search results)
const combinedSuggestions = computed(() => {
  const results: Array<SmartSuggestion | (PlaceResult & { type: 'search' })> = []
  
  // Add smart suggestions first (if no search query)
  if (query.value.length < 2 && smartSuggestions.value.length > 0) {
    results.push(...smartSuggestions.value)
  }
  
  // Add search results
  if (searchResults.value.length > 0) {
    searchResults.value.forEach(r => {
      results.push({ ...r, type: 'search' as const })
    })
  }
  
  return results.slice(0, 8)
})

const handleFocus = () => {
  isFocused.value = true
  showSuggestions.value = true
  
  // Track location search started
  quickTrack('location_search_started', 'interaction', { 
    type: props.type,
    hasExistingValue: !!query.value
  })
  
  emit('focus')
}

const handleBlur = () => {
  // Delay to allow click on suggestions
  setTimeout(() => {
    isFocused.value = false
    showSuggestions.value = false
    emit('blur')
  }, 200)
}

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  query.value = target.value
}

const selectSuggestion = (item: SmartSuggestion | (PlaceResult & { type: 'search' })) => {
  haptic.selection()
  
  const suggestionType = 'type' in item ? item.type : 'search'
  
  // Track location selected
  quickTrack('location_selected', 'interaction', { 
    locationType: props.type,
    source: suggestionType,
    suggestionName: item.name
  })
  
  // Track smart suggestion clicked if applicable
  if ('type' in item && item.type !== 'search') {
    quickTrack('smart_suggestion_clicked', 'interaction', {
      suggestionType: item.type,
      suggestionName: item.name,
      confidence: 'confidence' in item ? item.confidence : undefined
    })
  }
  
  query.value = item.name
  showSuggestions.value = false
  
  emit('select', {
    name: item.name,
    address: item.address,
    lat: item.lat,
    lng: item.lng
  })
}

const useCurrentLocation = () => {
  haptic.medium()
  
  if (!navigator.geolocation) {
    quickTrack('error_occurred', 'error', { 
      errorType: 'geolocation_not_supported',
      errorMessage: 'Browser does not support geolocation'
    })
    alert('เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง')
    return
  }
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      // Track successful current location use
      quickTrack('location_selected', 'interaction', { 
        locationType: props.type,
        source: 'current_location',
        accuracy: position.coords.accuracy
      })
      
      emit('select', {
        name: 'ตำแหน่งปัจจุบัน',
        address: 'ตำแหน่งปัจจุบันของคุณ',
        lat: position.coords.latitude,
        lng: position.coords.longitude
      })
      showSuggestions.value = false
    },
    (error) => {
      quickTrack('error_occurred', 'error', { 
        errorType: 'geolocation_error',
        errorMessage: error.message,
        errorCode: error.code
      })
      alert('ไม่สามารถระบุตำแหน่งได้')
    }
  )
}

const clearInput = () => {
  haptic.light()
  query.value = ''
  inputRef.value?.focus()
}

const getIconForType = (type: string) => {
  switch (type) {
    case 'home': return 'home'
    case 'work': return 'work'
    case 'predicted': return 'sparkle'
    case 'recent': return 'history'
    case 'contextual': return 'star'
    default: return 'location'
  }
}
</script>

<template>
  <div class="smart-location-input" :class="{ focused: isFocused, disabled }">
    <!-- Input Container -->
    <div class="input-container">
      <!-- Location Icon -->
      <div class="input-icon" :class="type">
        <svg v-if="type === 'pickup'" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" fill="#00A86B"/>
          <circle cx="12" cy="12" r="8" stroke="#00A86B" stroke-width="2" fill="none"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" fill="#E53935"/>
          <circle cx="12" cy="12" r="8" stroke="#E53935" stroke-width="2" fill="none"/>
        </svg>
      </div>
      
      <!-- Input Field -->
      <input
        ref="inputRef"
        type="text"
        :value="query"
        :placeholder="placeholder"
        :disabled="disabled"
        class="location-input"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      
      <!-- Clear Button -->
      <button v-if="query" class="clear-btn" @click="clearInput" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
      
      <!-- Current Location Button -->
      <button v-if="type === 'pickup' && !query" class="location-btn" @click="useCurrentLocation" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
          <circle cx="12" cy="12" r="8"/>
        </svg>
      </button>
    </div>
    
    <!-- Suggestions Panel -->
    <div v-if="showSuggestions && (combinedSuggestions.length > 0 || isLoadingSuggestions || searchLoading)" class="suggestions-panel">
      <!-- Loading State -->
      <div v-if="isLoadingSuggestions || searchLoading" class="loading-state">
        <div class="spinner"></div>
        <span>กำลังค้นหา...</span>
      </div>
      
      <!-- Smart Suggestions Header -->
      <div v-if="query.length < 2 && smartSuggestions.length > 0" class="suggestions-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        <span>แนะนำสำหรับคุณ</span>
      </div>
      
      <!-- Suggestions List -->
      <div class="suggestions-list">
        <button
          v-for="item in combinedSuggestions"
          :key="item.name + item.lat"
          class="suggestion-item"
          @click="selectSuggestion(item)"
        >
          <div class="suggestion-icon" :class="'type' in item ? item.type : 'search'">
            <!-- Home Icon -->
            <svg v-if="'type' in item && item.type === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            <!-- Work Icon -->
            <svg v-else-if="'type' in item && item.type === 'work'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
            <!-- Predicted/Sparkle Icon -->
            <svg v-else-if="'type' in item && item.type === 'predicted'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <!-- History Icon -->
            <svg v-else-if="'type' in item && item.type === 'recent'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <!-- Default Location Icon -->
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          
          <div class="suggestion-content">
            <span class="suggestion-name">{{ item.name }}</span>
            <span v-if="'reason' in item" class="suggestion-reason">{{ item.reason }}</span>
            <span v-else class="suggestion-address">{{ item.address }}</span>
          </div>
          
          <!-- Confidence indicator for predicted -->
          <div v-if="'confidence' in item && item.confidence > 0.8" class="confidence-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
        </button>
      </div>
      
      <!-- Use Current Location Option -->
      <button v-if="type === 'pickup'" class="current-location-option" @click="useCurrentLocation">
        <div class="option-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
            <circle cx="12" cy="12" r="8"/>
          </svg>
        </div>
        <span>ใช้ตำแหน่งปัจจุบัน</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.smart-location-input {
  position: relative;
  width: 100%;
}

.input-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #F5F5F5;
  border: 2px solid transparent;
  border-radius: 14px;
  transition: all 0.2s ease;
}

.smart-location-input.focused .input-container {
  background: #FFFFFF;
  border-color: #00A86B;
  box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1);
}

.smart-location-input.disabled .input-container {
  opacity: 0.6;
  pointer-events: none;
}

.input-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.input-icon svg {
  width: 100%;
  height: 100%;
}

.location-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  font-family: 'Sarabun', sans-serif;
  color: #1A1A1A;
  outline: none;
  min-width: 0;
}

.location-input::placeholder {
  color: #999999;
}

.clear-btn,
.location-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.clear-btn svg,
.location-btn svg {
  width: 18px;
  height: 18px;
  color: #666666;
}

.clear-btn:active,
.location-btn:active {
  transform: scale(0.9);
  background: #F0F0F0;
}

.location-btn {
  background: #E8F5EF;
}

.location-btn svg {
  color: #00A86B;
}

/* Suggestions Panel */
.suggestions-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  z-index: 100;
  max-height: 360px;
  overflow-y: auto;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  color: #666666;
  font-size: 14px;
}

.spinner {
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

.suggestions-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #F0F0F0;
  font-size: 12px;
  font-weight: 600;
  color: #00A86B;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.suggestions-header svg {
  width: 16px;
  height: 16px;
}

.suggestions-list {
  padding: 8px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  background: transparent;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.suggestion-item:hover {
  background: #F8FDF9;
}

.suggestion-item:active {
  background: #E8F5EF;
}

.suggestion-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  flex-shrink: 0;
}

.suggestion-icon svg {
  width: 20px;
  height: 20px;
}

.suggestion-icon.home {
  background: #E8F5EF;
  color: #00A86B;
}

.suggestion-icon.work {
  background: #E3F2FD;
  color: #1976D2;
}

.suggestion-icon.predicted {
  background: #FFF3E0;
  color: #F5A623;
}

.suggestion-icon.recent {
  background: #F5F5F5;
  color: #666666;
}

.suggestion-icon.contextual,
.suggestion-icon.search {
  background: #FFEBEE;
  color: #E53935;
}

.suggestion-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.suggestion-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-reason {
  font-size: 12px;
  color: #00A86B;
  font-weight: 500;
}

.suggestion-address {
  font-size: 12px;
  color: #666666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.confidence-badge {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #00A86B;
  border-radius: 50%;
  flex-shrink: 0;
}

.confidence-badge svg {
  width: 14px;
  height: 14px;
  color: #FFFFFF;
}

.current-location-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  background: #E8F5EF;
  border: none;
  border-top: 1px solid #F0F0F0;
  border-radius: 0 0 14px 14px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #00A86B;
  transition: background 0.15s ease;
}

.current-location-option:active {
  background: #D4EDDA;
}

.option-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border-radius: 10px;
}

.option-icon svg {
  width: 20px;
  height: 20px;
  color: #00A86B;
}
</style>
