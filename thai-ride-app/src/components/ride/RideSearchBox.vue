<script setup lang="ts">
/**
 * Component: RideSearchBox
 * ช่องค้นหาจุดหมายปลายทาง พร้อมแสดงสถานที่ใกล้เคียง
 * Enhanced UX: Better animations, haptic feedback, improved touch targets
 */
import { ref, computed, nextTick } from 'vue'

interface SearchResult {
  id: string
  name: string
  address: string
  lat: number
  lng: number
}

interface NearbyPlace {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  type?: string
  icon?: string
  distance?: number
}

const props = defineProps<{
  modelValue: string
  results: SearchResult[]
  isFocused: boolean
  nearbyPlaces?: NearbyPlace[]
  isLoadingNearby?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:isFocused': [value: boolean]
  search: []
  select: [place: SearchResult | NearbyPlace]
  clear: []
}>()

// Haptic feedback helper
function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 30 }
    navigator.vibrate(patterns[style])
  }
}

// Show nearby places when focused and no search query
const showNearbyPlaces = computed(() => 
  props.isFocused && 
  !props.modelValue && 
  props.results.length === 0 &&
  (props.nearbyPlaces?.length || props.isLoadingNearby)
)

// Icon paths for nearby place types
const iconPaths: Record<string, string> = {
  shopping: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0',
  hospital: 'M3 3h18v18H3zM12 8v8M8 12h8',
  train: 'M4 3h16v16a2 2 0 01-2 2H6a2 2 0 01-2-2V3zM4 11h16M12 3v8',
  plane: 'M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z',
  school: 'M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c0 2 2 3 6 3s6-1 6-3v-5',
  temple: 'M12 2L2 7h20L12 2zM4 7v10h16V7M4 17l8 5 8-5',
  default: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 10a3 3 0 100-6 3 3 0 000 6z'
}

function getIconPath(icon?: string): string {
  return iconPaths[icon || 'default'] || iconPaths.default
}

const inputRef = ref<HTMLInputElement | null>(null)
const pressedItemId = ref<string | null>(null)

function handleFocus(): void {
  triggerHaptic('light')
  emit('update:isFocused', true)
}

function handleBlur(): void {
  // Delay to allow click on results
  setTimeout(() => {
    emit('update:isFocused', false)
  }, 200)
}

function handleInput(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
  emit('search')
}

function handleClear(): void {
  triggerHaptic('light')
  emit('update:modelValue', '')
  emit('clear')
  nextTick(() => inputRef.value?.focus())
}

function handleSelectPlace(place: SearchResult | NearbyPlace): void {
  triggerHaptic('medium')
  pressedItemId.value = place.id
  setTimeout(() => {
    pressedItemId.value = null
    emit('select', place)
  }, 100)
}
</script>

<template>
  <div class="search-section">
    <div class="search-box" :class="{ focused: isFocused }">
      <svg class="search-icon" :class="{ active: isFocused }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        ref="inputRef"
        :value="modelValue"
        type="text"
        placeholder="ไปไหนดี?"
        class="search-input"
        enterkeyhint="search"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        @focus="handleFocus"
        @blur="handleBlur"
        @input="handleInput"
      />
      <Transition name="scale-fade">
        <button 
          v-if="modelValue" 
          class="clear-btn" 
          @click="handleClear"
          aria-label="ล้างการค้นหา"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </Transition>
    </div>

    <!-- Search results dropdown -->
    <Transition name="dropdown">
      <div v-if="results.length > 0" class="search-results">
        <TransitionGroup name="list" tag="div">
          <button
            v-for="(place, index) in results"
            :key="place.id"
            class="result-item"
            :class="{ pressed: pressedItemId === place.id }"
            :style="{ '--delay': `${index * 30}ms` }"
            @click="handleSelectPlace(place)"
          >
            <div class="result-icon-wrapper">
              <svg class="result-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div class="result-text">
              <span class="result-name">{{ place.name }}</span>
              <span class="result-address">{{ place.address }}</span>
            </div>
            <svg class="result-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </TransitionGroup>
      </div>
    </Transition>

    <!-- Nearby places dropdown (when focused but no search) -->
    <Transition name="dropdown">
      <div v-if="showNearbyPlaces" class="search-results nearby-dropdown">
        <div class="dropdown-header">
          <div class="header-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <span>สถานที่ใกล้เคียง</span>
        </div>
        
        <!-- Loading -->
        <div v-if="isLoadingNearby" class="nearby-loading">
          <div v-for="i in 3" :key="i" class="skeleton-item" :style="{ '--delay': `${i * 100}ms` }"></div>
        </div>
        
        <!-- Places list -->
        <TransitionGroup v-else name="list" tag="div">
          <button
            v-for="(place, index) in nearbyPlaces?.slice(0, 5)"
            :key="place.id"
            class="result-item nearby-item"
            :class="{ pressed: pressedItemId === place.id }"
            :style="{ '--delay': `${index * 50}ms` }"
            @click="handleSelectPlace(place)"
          >
            <div class="nearby-icon" :class="place.type">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path :d="getIconPath(place.icon)" />
              </svg>
            </div>
            <div class="result-text">
              <span class="result-name">{{ place.name }}</span>
              <span class="result-address">{{ place.address }}</span>
            </div>
            <span v-if="place.distance" class="nearby-distance">
              {{ place.distance.toFixed(1) }} กม.
            </span>
          </button>
        </TransitionGroup>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.search-section {
  padding: 16px;
  background: #fff;
  position: relative;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f5f5f5;
  border-radius: 14px;
  padding: 14px 16px;
  border: 2px solid transparent;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-box.focused {
  border-color: #00a86b;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0, 168, 107, 0.15);
  transform: translateY(-2px);
}

.search-icon {
  color: #999;
  flex-shrink: 0;
  transition: all 0.25s ease;
}

.search-icon.active {
  color: #00a86b;
  transform: scale(1.1);
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 16px;
  outline: none;
  font-family: 'Sarabun', sans-serif;
  min-height: 24px;
}

.search-input::placeholder {
  color: #999;
}

.clear-btn {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 50%;
  background: #e0e0e0;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.clear-btn:active {
  background: #d0d0d0;
  transform: scale(0.9);
}

/* Scale fade transition for clear button */
.scale-fade-enter-active,
.scale-fade-leave-active {
  transition: all 0.2s ease;
}

.scale-fade-enter-from,
.scale-fade-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* Search Results */
.search-results {
  position: absolute;
  top: 100%;
  left: 16px;
  right: 16px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: 100;
  overflow: hidden;
  max-height: 320px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:active,
.result-item.pressed {
  background: #f0fdf4;
}

.result-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #e8f5ef;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.result-icon {
  color: #00a86b;
  flex-shrink: 0;
}

.result-text {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  gap: 2px;
}

.result-name {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
}

.result-address {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-arrow {
  color: #ccc;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.result-item:active .result-arrow,
.result-item.pressed .result-arrow {
  transform: translateX(4px);
  color: #00a86b;
}

/* Dropdown animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
}

/* List item animation */
.list-enter-active {
  transition: all 0.3s ease;
  transition-delay: var(--delay, 0ms);
}

.list-leave-active {
  transition: all 0.2s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-12px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

/* Nearby places dropdown */
.nearby-dropdown {
  max-height: 380px;
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.header-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #e8f5ef;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-icon svg {
  color: #00a86b;
}

.nearby-loading {
  padding: 12px;
}

.skeleton-item {
  height: 60px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  animation-delay: var(--delay, 0ms);
  border-radius: 10px;
  margin-bottom: 8px;
}

.skeleton-item:last-child {
  margin-bottom: 0;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.nearby-item {
  padding: 12px 16px;
}

.nearby-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #f0f0f0;
  color: #666;
  transition: transform 0.2s ease;
}

.result-item:active .nearby-icon,
.result-item.pressed .nearby-icon {
  transform: scale(1.05);
}

.nearby-icon.mall,
.nearby-icon.shopping {
  background: #fff3e0;
  color: #f57c00;
}

.nearby-icon.hospital {
  background: #ffebee;
  color: #e53935;
}

.nearby-icon.station,
.nearby-icon.train {
  background: #e3f2fd;
  color: #1976d2;
}

.nearby-icon.airport,
.nearby-icon.plane {
  background: #e8f5e9;
  color: #388e3c;
}

.nearby-icon.university,
.nearby-icon.school {
  background: #f3e5f5;
  color: #7b1fa2;
}

.nearby-icon.temple {
  background: #fff8e1;
  color: #ffa000;
}

.nearby-distance {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
  margin-left: auto;
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 12px;
}
</style>
