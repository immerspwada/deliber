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
  @apply fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50;
}

.modal-content {
  @apply bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-hidden flex flex-col;
}

.modal-header {
  @apply flex items-center justify-between p-4 border-b border-gray-100;
}

.close-btn {
  @apply p-1 text-gray-400 hover:text-gray-600;
}

.modal-body {
  @apply p-4 overflow-y-auto flex-1 space-y-4;
}

.form-group {
  @apply space-y-2;
}

.form-label {
  @apply block text-sm font-medium text-gray-700;
}

.form-input {
  @apply w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent;
}

.type-selector {
  @apply flex gap-2;
}

.type-btn {
  @apply flex-1 py-2 px-3 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 transition-all;
}

.type-btn.active {
  @apply bg-primary-50 border-primary-500 text-primary-700;
}

.type-btn:disabled {
  @apply opacity-50 cursor-not-allowed;
}

.search-input-wrapper {
  @apply relative;
}

.search-spinner {
  @apply absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin;
}

.search-results {
  @apply mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto;
}

.search-result-item {
  @apply flex items-start gap-3 p-3 hover:bg-gray-50 w-full text-left border-b border-gray-100 last:border-0;
}

.selected-location {
  @apply space-y-3;
}

.location-preview {
  @apply flex items-start gap-3 p-3 bg-green-50 rounded-xl;
}

.no-location {
  @apply text-center py-4;
}

.map-picker-btn {
  @apply flex items-center justify-center gap-2 w-full py-2.5 text-primary-600 font-medium border border-primary-200 rounded-xl hover:bg-primary-50;
}

.submit-btn {
  @apply w-full py-3 bg-primary-600 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed;
}
</style>
