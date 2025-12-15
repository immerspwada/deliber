<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePlaceSearch, type PlaceResult } from '../composables/usePlaceSearch'

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
}>(), {
  placeholder: 'ค้นหาสถานที่...',
  showSavedPlaces: true,
  readonly: false,
  icon: 'none'
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
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        :placeholder="placeholder"
        :readonly="readonly"
        type="text"
        autocomplete="off"
        class="search-input"
        :class="{ 'has-icon': icon !== 'none' }"
      />
      
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
        @mousedown.prevent="selectItem(item)"
        class="dropdown-item"
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

.search-input:focus {
  background: white;
  border-color: #000;
}

.search-input::placeholder {
  color: #888;
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
</style>
