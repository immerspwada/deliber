<script setup lang="ts">
/**
 * Feature: Enhanced Destination Picker
 * ปรับปรุงการเลือกปลายทางให้ใช้งานง่ายขึ้น
 * - Search input พร้อม autocomplete (Google Places + Nominatim)
 * - Quick access chips (บ้าน, ที่ทำงาน, ใกล้เคียง)
 * - Recent destinations from useRecentPlaces
 * - Unified search with saved/recent/external results
 * - Popular destinations
 * - Long press to preview on map
 * - Share location support
 */
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { usePlaceSearch, type PlaceResult } from '../composables/usePlaceSearch'
import { useRecentPlaces } from '../composables/useRecentPlaces'
import { useSavedPlaces } from '../composables/useSavedPlaces'

interface PreviewPlace {
  name: string
  address: string
  lat: number
  lng: number
}

const props = withDefaults(defineProps<{
  currentLat?: number
  currentLng?: number
  autoFocus?: boolean
}>(), {
  autoFocus: true
})

const emit = defineEmits<{
  select: [place: { name: string; address: string; lat: number; lng: number }]
  selectMap: []
  selectNearby: []
  close: []
}>()

// Composables
const { 
  results: searchResults, 
  groupedResults,
  loading: searchLoading, 
  searchPlaces, 
  clearResults 
} = usePlaceSearch()

const { 
  recentDestinations, 
  addToHistory 
} = useRecentPlaces()

const { 
  homePlace, 
  workPlace,
  favoritePlaces 
} = useSavedPlaces()

const searchQuery = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const isSearching = ref(false)
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

// Long press preview state
const previewPlace = ref<PreviewPlace | null>(null)
const showPreview = ref(false)
const longPressTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const LONG_PRESS_DURATION = 500 // ms

// Popular places in Bangkok
const popularPlaces = [
  { id: 'central', name: 'เซ็นทรัลเวิลด์', address: 'ราชดำริ, ปทุมวัน', lat: 13.7466, lng: 100.5391, icon: 'shopping' },
  { id: 'siam', name: 'สยามพารากอน', address: 'พระราม 1, ปทุมวัน', lat: 13.7461, lng: 100.5347, icon: 'shopping' },
  { id: 'terminal21', name: 'เทอร์มินอล 21', address: 'สุขุมวิท, วัฒนา', lat: 13.7377, lng: 100.5603, icon: 'shopping' },
  { id: 'suvarnabhumi', name: 'สนามบินสุวรรณภูมิ', address: 'บางพลี, สมุทรปราการ', lat: 13.69, lng: 100.7501, icon: 'airport' },
  { id: 'donmuang', name: 'สนามบินดอนเมือง', address: 'ดอนเมือง, กรุงเทพฯ', lat: 13.9126, lng: 100.6068, icon: 'airport' },
  { id: 'mochit', name: 'หมอชิต', address: 'จตุจักร, กรุงเทพฯ', lat: 13.8022, lng: 100.553, icon: 'transport' },
]

// Show mode: 'suggestions' | 'search'
const viewMode = computed(() => {
  return searchQuery.value.length >= 2 ? 'search' : 'suggestions'
})

// Combined suggestions when not searching
const quickSuggestions = computed(() => {
  const items: Array<{ name: string; address: string; lat: number; lng: number; type: string; icon?: string }> = []
  
  if (homePlace.value) {
    items.push({ 
      name: 'บ้าน', 
      address: homePlace.value.address, 
      lat: homePlace.value.lat, 
      lng: homePlace.value.lng, 
      type: 'home' 
    })
  }
  if (workPlace.value) {
    items.push({ 
      name: 'ที่ทำงาน', 
      address: workPlace.value.address, 
      lat: workPlace.value.lat, 
      lng: workPlace.value.lng, 
      type: 'work' 
    })
  }
  
  return items
})

// Long press handlers for preview
const startLongPress = (place: PreviewPlace) => {
  longPressTimer.value = setTimeout(() => {
    triggerHaptic('medium')
    previewPlace.value = place
    showPreview.value = true
  }, LONG_PRESS_DURATION)
}

const cancelLongPress = () => {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

const closePreview = () => {
  showPreview.value = false
  previewPlace.value = null
}

const selectFromPreview = () => {
  if (previewPlace.value) {
    selectPlace(previewPlace.value)
    closePreview()
  }
}

// Google Maps static map URL for preview
const getStaticMapUrl = (lat: number, lng: number): string => {
  // Using OpenStreetMap static tiles as fallback (no API key needed)
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=400x200&markers=${lat},${lng},red`
}

// Handle search input with unified search
const onSearchInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  searchQuery.value = value
  
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  
  if (value.length >= 2) {
    isSearching.value = true
    searchTimeout.value = setTimeout(async () => {
      await searchPlaces(value, { 
        lat: props.currentLat, 
        lng: props.currentLng,
        includeRecent: true,
        includeSaved: true
      })
      isSearching.value = false
    }, 300)
  } else {
    clearResults()
    isSearching.value = false
  }
}

// Clear search
const clearSearch = () => {
  searchQuery.value = ''
  clearResults()
  inputRef.value?.focus()
}

// Select a place and save to history
const selectPlace = async (place: { name: string; address: string; lat: number; lng: number }) => {
  triggerHaptic('medium')
  
  // Save to recent destinations
  await addToHistory(place, 'destination')
  
  emit('select', place)
}

// Select from search results
const selectSearchResult = (result: PlaceResult) => {
  selectPlace({
    name: result.name,
    address: result.address,
    lat: result.lat,
    lng: result.lng
  })
}

// Haptic feedback
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 25, heavy: 50 }
    navigator.vibrate(patterns[type])
  }
}

// Parse shared location from URL or text
const parseSharedLocation = (text: string): PreviewPlace | null => {
  // Google Maps share link: https://maps.google.com/?q=13.7563,100.5018
  // Google Maps short link: https://goo.gl/maps/xxx (would need redirect)
  // Apple Maps: https://maps.apple.com/?ll=13.7563,100.5018
  // Coordinates: 13.7563,100.5018 or 13.7563, 100.5018
  
  const patterns = [
    // Google Maps with q parameter
    /maps\.google\.com.*[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/i,
    // Google Maps with @ symbol
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    // Apple Maps
    /maps\.apple\.com.*ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/i,
    // Plain coordinates
    /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/,
    // Coordinates in text
    /(-?\d{1,3}\.\d{4,})\s*,\s*(-?\d{1,3}\.\d{4,})/,
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1] && match[2]) {
      const lat = parseFloat(match[1])
      const lng = parseFloat(match[2])
      
      // Validate coordinates
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return {
          name: 'ตำแหน่งที่แชร์',
          address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          lat,
          lng
        }
      }
    }
  }
  
  return null
}

// Handle paste event for shared locations
const handlePaste = async (event: ClipboardEvent) => {
  const pastedText = event.clipboardData?.getData('text')
  if (!pastedText) return
  
  const location = parseSharedLocation(pastedText)
  if (location) {
    event.preventDefault()
    triggerHaptic('medium')
    
    // Show preview first
    previewPlace.value = location
    showPreview.value = true
  }
}

// Auto focus on mount
onMounted(() => {
  if (props.autoFocus) {
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
  
  // Add paste listener
  document.addEventListener('paste', handlePaste as EventListener)
})

// Cleanup
onUnmounted(() => {
  document.removeEventListener('paste', handlePaste as EventListener)
  cancelLongPress()
})

watch(() => searchQuery.value, () => {
  if (searchQuery.value.length < 2) {
    clearResults()
  }
})
</script>

<template>
  <div class="destination-picker">
    <!-- Search Header -->
    <div class="search-header">
      <button class="back-btn" @click="emit('close')" type="button" aria-label="กลับ">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      
      <div class="search-input-wrapper">
        <div class="search-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
        <input
          ref="inputRef"
          type="text"
          class="search-input"
          :value="searchQuery"
          @input="onSearchInput"
          placeholder="ค้นหาสถานที่ปลายทาง..."
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
        />
        <button 
          v-if="searchQuery" 
          class="clear-btn" 
          @click="clearSearch"
          type="button"
          aria-label="ล้างการค้นหา"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        </button>
        <div v-if="isSearching || searchLoading" class="search-spinner"></div>
      </div>
    </div>

    <!-- Content -->
    <div class="picker-content">
      <!-- Search Results -->
      <template v-if="viewMode === 'search'">
        <div class="search-results">
          <div v-if="searchLoading && searchResults.length === 0" class="loading-state">
            <div class="loading-spinner"></div>
            <span>กำลังค้นหา...</span>
          </div>
          
          <div v-else-if="searchResults.length === 0 && !searchLoading" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <span>ไม่พบสถานที่ "{{ searchQuery }}"</span>
            <button class="map-fallback-btn" @click="emit('selectMap')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              เลือกจากแผนที่แทน
            </button>
          </div>
          
          <button
            v-for="result in searchResults"
            :key="result.id"
            class="result-item"
            @click="selectSearchResult(result)"
          >
            <div class="result-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div class="result-text">
              <span class="result-name">{{ result.name }}</span>
              <span class="result-address">{{ result.address }}</span>
            </div>
          </button>
        </div>
      </template>

      <!-- Suggestions View -->
      <template v-else>
        <!-- Quick Actions -->
        <div class="quick-actions">
          <button class="action-card map" @click="emit('selectMap')">
            <div class="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span class="action-label">เลือกจากแผนที่</span>
          </button>
          
          <button class="action-card nearby" @click="emit('selectNearby')">
            <div class="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
              </svg>
            </div>
            <span class="action-label">สถานที่ใกล้เคียง</span>
          </button>
        </div>

        <!-- Quick Destinations (Home/Work) -->
        <div v-if="quickSuggestions.length > 0" class="section">
          <h3 class="section-title">ไปบ่อย</h3>
          <div class="quick-chips">
            <button
              v-if="homePlace"
              class="quick-chip home"
              @click="selectPlace({ name: 'บ้าน', address: homePlace.address, lat: homePlace.lat, lng: homePlace.lng })"
            >
              <div class="chip-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9,22 9,12 15,12 15,22" />
                </svg>
              </div>
              <div class="chip-text">
                <span class="chip-label">บ้าน</span>
                <span class="chip-address">{{ homePlace.address }}</span>
              </div>
            </button>
            
            <button
              v-if="workPlace"
              class="quick-chip work"
              @click="selectPlace({ name: 'ที่ทำงาน', address: workPlace.address, lat: workPlace.lat, lng: workPlace.lng })"
            >
              <div class="chip-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                </svg>
              </div>
              <div class="chip-text">
                <span class="chip-label">ที่ทำงาน</span>
                <span class="chip-address">{{ workPlace.address }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Recent Destinations -->
        <div v-if="recentDestinations.length > 0" class="section">
          <h3 class="section-title">ไปเมื่อเร็วๆ นี้</h3>
          <div class="places-list">
            <button
              v-for="place in recentDestinations.slice(0, 5)"
              :key="place.id"
              class="place-item"
              @click="selectPlace({ name: place.name, address: place.address, lat: place.lat, lng: place.lng })"
              @touchstart="startLongPress({ name: place.name, address: place.address, lat: place.lat, lng: place.lng })"
              @touchend="cancelLongPress"
              @touchcancel="cancelLongPress"
              @mousedown="startLongPress({ name: place.name, address: place.address, lat: place.lat, lng: place.lng })"
              @mouseup="cancelLongPress"
              @mouseleave="cancelLongPress"
            >
              <div class="place-icon recent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
              </div>
              <div class="place-text">
                <span class="place-name">{{ place.name }}</span>
                <span class="place-address">{{ place.address }}</span>
              </div>
              <div class="long-press-hint">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              </div>
            </button>
          </div>
        </div>

        <!-- Favorite Places -->
        <div v-if="favoritePlaces.length > 0" class="section">
          <h3 class="section-title">สถานที่โปรด</h3>
          <div class="places-list">
            <button
              v-for="place in favoritePlaces.slice(0, 5)"
              :key="place.id"
              class="place-item"
              @click="selectPlace({ name: place.customName || place.name, address: place.address, lat: place.lat, lng: place.lng })"
              @touchstart="startLongPress({ name: place.customName || place.name, address: place.address, lat: place.lat, lng: place.lng })"
              @touchend="cancelLongPress"
              @touchcancel="cancelLongPress"
              @mousedown="startLongPress({ name: place.customName || place.name, address: place.address, lat: place.lat, lng: place.lng })"
              @mouseup="cancelLongPress"
              @mouseleave="cancelLongPress"
            >
              <div class="place-icon favorite">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                </svg>
              </div>
              <div class="place-text">
                <span class="place-name">{{ place.name }}</span>
                <span class="place-address">{{ place.address }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Popular Destinations -->
        <div class="section">
          <h3 class="section-title">สถานที่ยอดนิยม</h3>
          <div class="popular-grid">
            <button
              v-for="place in popularPlaces"
              :key="place.id"
              class="popular-item"
              @click="selectPlace(place)"
            >
              <div :class="['popular-icon', place.icon]">
                <svg v-if="place.icon === 'shopping'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 01-8 0" />
                </svg>
                <svg v-else-if="place.icon === 'airport'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="3" width="15" height="13" rx="2" />
                  <path d="M16 8h4a2 2 0 012 2v6a2 2 0 01-2 2h-4" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <span class="popular-name">{{ place.name }}</span>
            </button>
          </div>
        </div>
      </template>
    </div>
    
    <!-- Long Press Preview Modal -->
    <Teleport to="body">
      <Transition name="preview-fade">
        <div v-if="showPreview && previewPlace" class="preview-overlay" @click="closePreview">
          <div class="preview-modal" @click.stop>
            <div class="preview-header">
              <h3 class="preview-title">{{ previewPlace.name }}</h3>
              <button class="preview-close" @click="closePreview" type="button" aria-label="ปิด">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div class="preview-map">
              <img 
                :src="getStaticMapUrl(previewPlace.lat, previewPlace.lng)" 
                :alt="`แผนที่ ${previewPlace.name}`"
                loading="lazy"
              />
              <div class="preview-marker">
                <svg viewBox="0 0 24 24" fill="#E53935">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
            </div>
            
            <div class="preview-info">
              <p class="preview-address">{{ previewPlace.address }}</p>
              <p class="preview-coords">{{ previewPlace.lat.toFixed(6) }}, {{ previewPlace.lng.toFixed(6) }}</p>
            </div>
            
            <div class="preview-actions">
              <button class="preview-btn cancel" @click="closePreview" type="button">
                ยกเลิก
              </button>
              <button class="preview-btn confirm" @click="selectFromPreview" type="button">
                เลือกสถานที่นี้
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>


<style scoped>
.destination-picker {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

/* Search Header */
.search-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border: none;
  border-radius: 50%;
  color: #333;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.back-btn:active {
  transform: scale(0.95);
  background: #e5e5e5;
}

.back-btn svg {
  width: 20px;
  height: 20px;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  color: #888;
  pointer-events: none;
}

.search-icon svg {
  width: 18px;
  height: 18px;
}

.search-input {
  width: 100%;
  padding: 14px 44px;
  background: #f6f6f6;
  border: 2px solid transparent;
  border-radius: 12px;
  font-size: 16px;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  background: #fff;
  border-color: #00A86B;
}

.search-input::placeholder {
  color: #999;
}

.clear-btn {
  position: absolute;
  right: 44px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  border-radius: 50%;
}

.clear-btn:active {
  background: #e5e5e5;
}

.clear-btn svg {
  width: 18px;
  height: 18px;
}

.search-spinner {
  position: absolute;
  right: 14px;
  width: 20px;
  height: 20px;
  border: 2px solid #e5e5e5;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Content */
.picker-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  -webkit-overflow-scrolling: touch;
}

/* Quick Actions */
.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 16px;
  background: #f8f9fa;
  border: 2px solid transparent;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-card:active {
  transform: scale(0.98);
  background: #f0f0f0;
}

.action-card.map .action-icon {
  background: linear-gradient(135deg, #00A86B 0%, #00875A 100%);
}

.action-card.nearby .action-icon {
  background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
}

.action-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  color: #fff;
}

.action-icon svg {
  width: 24px;
  height: 24px;
}

.action-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

/* Sections */
.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

/* Quick Chips */
.quick-chips {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-chip {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #fff;
  border: 1.5px solid #e5e5e5;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.quick-chip:active {
  transform: scale(0.98);
  border-color: #00A86B;
  background: #f0fdf4;
}

.quick-chip .chip-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  flex-shrink: 0;
}

.quick-chip.home .chip-icon {
  background: #FEF3C7;
  color: #D97706;
}

.quick-chip.work .chip-icon {
  background: #DBEAFE;
  color: #2563EB;
}

.chip-icon svg {
  width: 22px;
  height: 22px;
}

.chip-text {
  flex: 1;
  min-width: 0;
}

.chip-label {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.chip-address {
  display: block;
  font-size: 13px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

/* Places List */
.places-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.place-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.place-item:active {
  background: #f6f6f6;
  transform: scale(0.99);
}

.place-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.place-icon.recent {
  background: #f0f0f0;
  color: #666;
}

.place-icon.favorite {
  background: #FEF3C7;
  color: #F59E0B;
}

.place-icon svg {
  width: 20px;
  height: 20px;
}

.place-text {
  flex: 1;
  min-width: 0;
}

.place-name {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: #000;
}

.place-address {
  display: block;
  font-size: 13px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

/* Popular Grid */
.popular-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.popular-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: #f8f9fa;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.popular-item:active {
  transform: scale(0.95);
  background: #f0f0f0;
}

.popular-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.popular-icon.shopping {
  background: #FCE7F3;
  color: #DB2777;
}

.popular-icon.airport {
  background: #DBEAFE;
  color: #2563EB;
}

.popular-icon.transport {
  background: #D1FAE5;
  color: #059669;
}

.popular-icon svg {
  width: 22px;
  height: 22px;
}

.popular-name {
  font-size: 12px;
  font-weight: 500;
  color: #333;
  text-align: center;
  line-height: 1.3;
}

/* Search Results */
.search-results {
  display: flex;
  flex-direction: column;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: #888;
  text-align: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e5e5;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state span {
  font-size: 15px;
}

.map-fallback-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 20px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.map-fallback-btn:active {
  transform: scale(0.98);
  background: #00875A;
}

.map-fallback-btn svg {
  width: 18px;
  height: 18px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: transparent;
  border: none;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:active {
  background: #f6f6f6;
}

.result-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 50%;
  color: #666;
  flex-shrink: 0;
}

.result-icon svg {
  width: 20px;
  height: 20px;
}

.result-text {
  flex: 1;
  min-width: 0;
}

.result-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.result-address {
  display: block;
  font-size: 13px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

/* Long press hint icon */
.long-press-hint {
  width: 20px;
  height: 20px;
  color: #ccc;
  opacity: 0;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.place-item:hover .long-press-hint,
.place-item:focus .long-press-hint {
  opacity: 1;
}

.long-press-hint svg {
  width: 100%;
  height: 100%;
}

/* Preview Modal Overlay */
.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.preview-modal {
  background: #fff;
  border-radius: 20px;
  width: 100%;
  max-width: 360px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.preview-title {
  font-size: 17px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.preview-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: #666;
  transition: all 0.2s ease;
}

.preview-close:active {
  transform: scale(0.95);
  background: #e5e5e5;
}

.preview-close svg {
  width: 18px;
  height: 18px;
}

.preview-map {
  position: relative;
  width: 100%;
  height: 180px;
  background: #f0f0f0;
  overflow: hidden;
}

.preview-map img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-marker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -100%);
  width: 32px;
  height: 32px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.preview-marker svg {
  width: 100%;
  height: 100%;
}

.preview-info {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.preview-address {
  font-size: 14px;
  color: #333;
  margin: 0 0 4px 0;
}

.preview-coords {
  font-size: 12px;
  color: #999;
  margin: 0;
  font-family: monospace;
}

.preview-actions {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
}

.preview-btn {
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preview-btn:active {
  transform: scale(0.98);
}

.preview-btn.cancel {
  background: #f5f5f5;
  color: #666;
}

.preview-btn.cancel:active {
  background: #e5e5e5;
}

.preview-btn.confirm {
  background: #00A86B;
  color: #fff;
}

.preview-btn.confirm:active {
  background: #00875A;
}

/* Preview fade animation */
.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: all 0.25s ease;
}

.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
}

.preview-fade-enter-from .preview-modal,
.preview-fade-leave-to .preview-modal {
  transform: scale(0.9);
}

/* Safe area for mobile */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .picker-content {
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
  }
}
</style>
