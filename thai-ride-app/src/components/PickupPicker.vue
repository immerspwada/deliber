<script setup lang="ts">
/**
 * Feature: Enhanced Pickup Picker
 * ปรับปรุงการเลือกจุดรับให้ใช้งานง่ายขึ้น
 * - ปุ่มตำแหน่งปัจจุบันที่โดดเด่น
 * - Search input พร้อม autocomplete (Google Places + Nominatim)
 * - Quick access (บ้าน, ที่ทำงาน)
 * - Recent pickup places from useRecentPlaces
 * - Unified search with saved/recent/external results
 * - เลือกจากแผนที่
 */
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { usePlaceSearch, type PlaceResult } from '../composables/usePlaceSearch'
import { useRecentPlaces } from '../composables/useRecentPlaces'
import { useSavedPlaces } from '../composables/useSavedPlaces'

const props = withDefaults(defineProps<{
  currentLat?: number
  currentLng?: number
  isGettingLocation?: boolean
}>(), {
  isGettingLocation: false
})

const emit = defineEmits<{
  select: [place: { name: string; address: string; lat: number; lng: number }]
  selectCurrentLocation: []
  selectMap: []
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
  recentPickups, 
  addToHistory 
} = useRecentPlaces()

const { 
  homePlace, 
  workPlace,
  savedPlaces 
} = useSavedPlaces()

const searchQuery = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const isSearching = ref(false)
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

// Show mode: 'suggestions' | 'search'
const viewMode = computed(() => {
  return searchQuery.value.length >= 2 ? 'search' : 'suggestions'
})

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
  
  // Save to recent pickups
  await addToHistory(place, 'pickup')
  
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

// Auto focus on mount
onMounted(() => {
  nextTick(() => {
    // Don't auto-focus to avoid keyboard popup
  })
})

// Cleanup
onUnmounted(() => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
})
</script>

<template>
  <div class="pickup-picker">
    <!-- Header -->
    <div class="picker-header">
      <button class="back-btn" @click="emit('close')" type="button" aria-label="กลับ">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h2 class="picker-title">เลือกจุดรับ</h2>
      <div class="header-spacer"></div>
    </div>

    <!-- Current Location Button - Hero -->
    <div class="hero-action">
      <button 
        class="current-location-btn"
        :class="{ 'is-loading': isGettingLocation }"
        :disabled="isGettingLocation"
        @click="emit('selectCurrentLocation'); triggerHaptic('heavy');"
      >
        <div class="btn-icon">
          <template v-if="isGettingLocation">
            <div class="location-spinner"></div>
          </template>
          <template v-else>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
            </svg>
          </template>
        </div>
        <div class="btn-text">
          <span class="btn-label">{{ isGettingLocation ? 'กำลังค้นหาตำแหน่ง...' : 'ใช้ตำแหน่งปัจจุบัน' }}</span>
          <span class="btn-hint">แนะนำ - รวดเร็วที่สุด</span>
        </div>
        <div v-if="!isGettingLocation" class="btn-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </button>
    </div>

    <!-- Divider -->
    <div class="section-divider">
      <span>หรือเลือกจุดรับอื่น</span>
    </div>

    <!-- Search Input -->
    <div class="search-section">
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
          placeholder="ค้นหาสถานที่..."
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
        <!-- Quick Actions Grid -->
        <div class="quick-grid">
          <button class="quick-card" @click="emit('selectMap'); triggerHaptic('medium');">
            <div class="quick-icon map">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span class="quick-label">เลือกจากแผนที่</span>
          </button>
          
          <button 
            v-if="homePlace" 
            class="quick-card"
            @click="selectPlace({ name: 'บ้าน', address: homePlace.address, lat: homePlace.lat, lng: homePlace.lng })"
          >
            <div class="quick-icon home">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9,22 9,12 15,12 15,22" />
              </svg>
            </div>
            <span class="quick-label">บ้าน</span>
          </button>
          
          <button 
            v-if="workPlace" 
            class="quick-card"
            @click="selectPlace({ name: 'ที่ทำงาน', address: workPlace.address, lat: workPlace.lat, lng: workPlace.lng })"
          >
            <div class="quick-icon work">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
              </svg>
            </div>
            <span class="quick-label">ที่ทำงาน</span>
          </button>
        </div>

        <!-- Recent Pickup Places -->
        <div v-if="recentPickups.length > 0" class="section">
          <h3 class="section-title">รับเมื่อเร็วๆ นี้</h3>
          <div class="places-list">
            <button
              v-for="place in recentPickups.slice(0, 5)"
              :key="place.id"
              class="place-item"
              @click="selectPlace({ name: place.name, address: place.address, lat: place.lat, lng: place.lng })"
            >
              <div class="place-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12,6 12,12 16,14" />
                </svg>
              </div>
              <div class="place-text">
                <span class="place-name">{{ place.name }}</span>
                <span class="place-address">{{ place.address }}</span>
              </div>
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>


<style scoped>
.pickup-picker {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

/* Header */
.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
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

.picker-title {
  font-size: 17px;
  font-weight: 600;
  color: #000;
}

.header-spacer {
  width: 40px;
}

/* Hero Current Location Button */
.hero-action {
  padding: 16px;
}

.current-location-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px 18px;
  background: linear-gradient(135deg, #00A86B 0%, #00875A 100%);
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.current-location-btn:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(0, 168, 107, 0.2);
}

.current-location-btn.is-loading {
  background: linear-gradient(135deg, #00875A 0%, #006644 100%);
}

.current-location-btn .btn-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: #fff;
  flex-shrink: 0;
}

.current-location-btn .btn-icon svg {
  width: 26px;
  height: 26px;
}

.location-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.current-location-btn .btn-text {
  flex: 1;
  text-align: left;
}

.current-location-btn .btn-label {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.current-location-btn .btn-hint {
  display: block;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}

.current-location-btn .btn-arrow {
  width: 24px;
  height: 24px;
  color: rgba(255, 255, 255, 0.8);
}

.current-location-btn .btn-arrow svg {
  width: 100%;
  height: 100%;
}

/* Divider */
.section-divider {
  display: flex;
  align-items: center;
  padding: 0 16px;
  margin-bottom: 12px;
}

.section-divider::before,
.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e5e5;
}

.section-divider span {
  padding: 0 12px;
  font-size: 13px;
  color: #999;
}

/* Search Section */
.search-section {
  padding: 0 16px 12px;
}

.search-input-wrapper {
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

/* Content */
.picker-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
  -webkit-overflow-scrolling: touch;
}

/* Quick Grid */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.quick-card {
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

.quick-card:active {
  transform: scale(0.95);
  background: #f0f0f0;
}

.quick-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.quick-icon.map {
  background: linear-gradient(135deg, #00A86B 0%, #00875A 100%);
  color: #fff;
}

.quick-icon.home {
  background: #FEF3C7;
  color: #D97706;
}

.quick-icon.work {
  background: #DBEAFE;
  color: #2563EB;
}

.quick-icon svg {
  width: 22px;
  height: 22px;
}

.quick-label {
  font-size: 12px;
  font-weight: 500;
  color: #333;
  text-align: center;
}

/* Section */
.section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
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
  background: #f0f0f0;
  border-radius: 50%;
  color: #666;
  flex-shrink: 0;
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
  background: #D1FAE5;
  border-radius: 50%;
  color: #059669;
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

/* Safe area for mobile */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .picker-content {
    padding-bottom: calc(16px + env(safe-area-inset-bottom));
  }
}
</style>
