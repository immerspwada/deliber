<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <h2 class="text-lg font-semibold text-gray-900">
          {{ mode === 'edit' ? 'แก้ไขสถานที่' : 'เพิ่มสถานที่' }}
        </h2>
        <button class="close-btn" @click="$emit('close')">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="modal-body">
        <!-- Place Type (only for new places) -->
        <div v-if="mode === 'add'" class="form-group">
          <label class="form-label">ประเภท</label>
          <div class="type-selector">
            <button
              type="button"
              class="type-btn"
              :class="{ active: form.placeType === 'home' }"
              :disabled="hasHome"
              @click="form.placeType = 'home'"
            >
              🏠 บ้าน
            </button>
            <button
              type="button"
              class="type-btn"
              :class="{ active: form.placeType === 'work' }"
              :disabled="hasWork"
              @click="form.placeType = 'work'"
            >
              💼 ที่ทำงาน
            </button>
            <button
              type="button"
              class="type-btn"
              :class="{ active: form.placeType === 'other' }"
              @click="form.placeType = 'other'"
            >
              ⭐ โปรด
            </button>
          </div>
        </div>

        <!-- Custom Name (for favorites) -->
        <div v-if="form.placeType === 'other'" class="form-group">
          <label class="form-label">ชื่อสถานที่</label>
          <input
            v-model="form.customName"
            type="text"
            class="form-input"
            placeholder="เช่น บ้านแม่, ฟิตเนส, ร้านกาแฟโปรด"
            maxlength="50"
          />
        </div>

        <!-- Address Search -->
        <div class="form-group">
          <label class="form-label">ที่อยู่</label>
          <div class="search-input-wrapper">
            <input
              v-model="searchQuery"
              type="text"
              class="form-input"
              placeholder="ค้นหาที่อยู่..."
              @input="handleSearch"
            />
            <svg v-if="searching" class="search-spinner" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>

          <!-- Search Results -->
          <div v-if="searchResults.length > 0" class="search-results">
            <button
              v-for="result in searchResults"
              :key="result.id"
              type="button"
              class="search-result-item"
              @click="selectPlace(result)"
            >
              <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-gray-900 truncate">{{ result.name }}</div>
                <div class="text-sm text-gray-500 truncate">{{ result.address }}</div>
              </div>
            </button>
          </div>
        </div>

        <!-- Selected Location -->
        <div v-if="form.lat && form.lng" class="selected-location">
          <div class="location-preview">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-900">{{ form.name }}</div>
              <div class="text-sm text-gray-500 truncate">{{ form.address }}</div>
            </div>
          </div>
          
          <!-- Map Picker Button -->
          <button
            type="button"
            class="map-picker-btn"
            @click="showMapPicker = true"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            เลือกจากแผนที่
          </button>
        </div>

        <!-- No Location Selected -->
        <div v-else class="no-location">
          <p class="text-gray-500 text-sm mb-2">ยังไม่ได้เลือกตำแหน่ง</p>
          <button
            type="button"
            class="map-picker-btn"
            @click="showMapPicker = true"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            เลือกจากแผนที่
          </button>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          class="submit-btn"
          :disabled="!isValid || saving"
        >
          <span v-if="saving">กำลังบันทึก...</span>
          <span v-else>{{ mode === 'edit' ? 'บันทึกการแก้ไข' : 'เพิ่มสถานที่' }}</span>
        </button>
      </form>

      <!-- Map Picker Modal -->
      <LocationPicker
        v-if="showMapPicker"
        :initial-lat="form.lat || undefined"
        :initial-lng="form.lng || undefined"
        @select="handleMapSelect"
        @close="showMapPicker = false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { usePlaceSearch, type PlaceResult } from '../composables/usePlaceSearch'
import { useSavedPlaces, type SavedPlace, type PlaceType } from '../composables/useSavedPlaces'
import LocationPicker from './LocationPicker.vue'

interface Props {
  place?: SavedPlace | null
  mode: 'add' | 'edit'
  placeType?: PlaceType
}

const props = withDefaults(defineProps<Props>(), {
  place: null,
  placeType: 'other'
})

const emit = defineEmits<{
  (e: 'save', data: {
    name: string
    address: string
    lat: number
    lng: number
    placeType: PlaceType
    customName?: string
  }): void
  (e: 'close'): void
}>()

// Composables
const { searchPlaces, results: searchResults, loading: searching } = usePlaceSearch()
const { homePlace, workPlace } = useSavedPlaces()

// State
const form = reactive({
  name: '',
  address: '',
  lat: 0,
  lng: 0,
  placeType: props.placeType as PlaceType,
  customName: ''
})

const searchQuery = ref('')
const showMapPicker = ref(false)
const saving = ref(false)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

// Computed
const hasHome = computed(() => !!homePlace.value && props.mode === 'add')
const hasWork = computed(() => !!workPlace.value && props.mode === 'add')

const isValid = computed(() => {
  return form.name && form.address && form.lat && form.lng
})

// Initialize form with existing place data
onMounted(() => {
  if (props.place) {
    form.name = props.place.name
    form.address = props.place.address
    form.lat = props.place.lat
    form.lng = props.place.lng
    form.placeType = props.place.placeType
    form.customName = props.place.customName || ''
    searchQuery.value = props.place.address
  }
})

// Handlers
function handleSearch() {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  searchTimeout = setTimeout(async () => {
    if (searchQuery.value.length >= 2) {
      await searchPlaces(searchQuery.value, { includeSaved: false, includeRecent: false })
    }
  }, 300)
}

function selectPlace(result: PlaceResult) {
  form.name = result.name
  form.address = result.address
  form.lat = result.lat
  form.lng = result.lng
  searchQuery.value = result.address
  searchResults.value = []
}

function handleMapSelect(location: { lat: number; lng: number; address: string; name?: string }) {
  form.lat = location.lat
  form.lng = location.lng
  form.address = location.address
  form.name = location.name || location.address.split(',')[0] || 'ตำแหน่งที่เลือก'
  searchQuery.value = location.address
  showMapPicker.value = false
}

async function handleSubmit() {
  if (!isValid.value) return
  
  saving.value = true
  
  try {
    emit('save', {
      name: form.name,
      address: form.address,
      lat: form.lat,
      lng: form.lng,
      placeType: form.placeType,
      customName: form.placeType === 'other' ? form.customName : undefined
    })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 50;
}

@media (min-width: 640px) {
  .modal-overlay {
    align-items: center;
  }
}

.modal-content {
  background-color: white;
  width: 100%;
  max-width: 28rem;
  border-radius: 1rem 1rem 0 0;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

@media (min-width: 640px) {
  .modal-content {
    border-radius: 1rem;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #f3f4f6;
}

.close-btn {
  padding: 0.25rem;
  color: #9ca3af;
  background: transparent;
  border: none;
  cursor: pointer;
}

.close-btn:hover {
  color: #4b5563;
}

.modal-body {
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
}

.form-input:focus {
  outline: none;
  ring: 2px;
  ring-color: var(--color-primary-500, #3b82f6);
  border-color: transparent;
}

.type-selector {
  display: flex;
  gap: 0.5rem;
}

.type-btn {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  color: #374151;
  transition: all 0.2s;
  background: white;
  cursor: pointer;
}

.type-btn.active {
  background-color: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.type-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-input-wrapper {
  position: relative;
}

.search-spinner {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  color: #9ca3af;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: translateY(-50%) rotate(0deg); }
  to { transform: translateY(-50%) rotate(360deg); }
}

.search-results {
  margin-top: 0.5rem;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  overflow: hidden;
  max-height: 12rem;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  width: 100%;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
  background: transparent;
  border-left: none;
  border-right: none;
  border-top: none;
  cursor: pointer;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background-color: #f9fafb;
}

.selected-location {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.location-preview {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: #f0fdf4;
  border-radius: 0.75rem;
}

.no-location {
  text-align: center;
  padding: 1rem 0;
}

.map-picker-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem;
  color: var(--color-primary-600, #2563eb);
  font-weight: 500;
  border: 1px solid var(--color-primary-200, #bfdbfe);
  border-radius: 0.75rem;
  background: white;
  cursor: pointer;
}

.map-picker-btn:hover {
  background-color: var(--color-primary-50, #eff6ff);
}

.submit-btn {
  width: 100%;
  padding: 0.75rem;
  background-color: var(--color-primary-600, #2563eb);
  color: white;
  font-weight: 600;
  border-radius: 0.75rem;
  border: none;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
