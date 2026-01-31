<template>
  <div class="maps-settings-view">
    <!-- Header -->
    <div class="settings-header">
      <button 
        type="button"
        class="back-button"
        @click="$router.back()"
        aria-label="กลับ"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="settings-title">Google แผนที่</h1>
      <button 
        type="button"
        class="save-button"
        :disabled="saving || !hasChanges"
        @click="saveSettings"
      >
        {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
      </button>
    </div>

    <!-- Content -->
    <div class="settings-content">
      <!-- API Keys Section -->
      <section class="settings-section">
        <div class="section-sidebar">
          <h2 class="section-title">คีย์ API แผนที่</h2>
          <p class="section-description">
            ป้อนคีย์ API ของ Google หรือแผนที่การบินของคุณ
          </p>
        </div>

        <div class="section-content">
          <!-- Google Maps Browser API Key -->
          <div class="form-group">
            <label for="browser-api-key" class="form-label">
              คีย์ API Google Maps เซิร์ฟเวอร์
            </label>
            <input
              id="browser-api-key"
              v-model="settings.browserApiKey"
              type="text"
              class="form-input"
              placeholder="ป้อนคีย์แผนที่เซิร์ฟเวอร์"
              @input="markAsChanged"
            />
          </div>

          <!-- Google Maps Server API Key -->
          <div class="form-group">
            <label for="server-api-key" class="form-label">
              คีย์ API Google Maps ของลูกค้า
            </label>
            <input
              id="server-api-key"
              v-model="settings.serverApiKey"
              type="text"
              class="form-input"
              placeholder="ป้อนคีย์แผนที่ของลูกค้า"
              @input="markAsChanged"
            />
          </div>

          <!-- API Documentation Link -->
          <div class="api-docs-link">
            <a 
              href="https://developers.google.com/maps/documentation" 
              target="_blank"
              rel="noopener noreferrer"
              class="link-button"
            >
              คีย์ API แผนที่
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <div class="link-description">
              ประเภทตำแหน่งเพิ่มเติม
            </div>
          </div>
        </div>
      </section>

      <!-- Country Selection Section -->
      <section class="settings-section">
        <div class="section-sidebar">
          <h2 class="section-title">ประเทศที่ค้นหาได้</h2>
          <p class="section-description">
            เลือกประเทศสำหรับการค้นหาแผนที่
          </p>
        </div>

        <div class="section-content">
          <div class="radio-group">
            <label class="radio-option">
              <input
                v-model="settings.countryScope"
                type="radio"
                name="country-scope"
                value="global"
                class="radio-input"
                @change="markAsChanged"
              />
              <div class="radio-content">
                <div class="radio-label">ทั่วโลก</div>
                <div class="radio-description">
                  ผู้ใช้จะได้รับผลลัพธ์การค้นหาทั่วทุกประเทศ
                </div>
              </div>
            </label>

            <label class="radio-option">
              <input
                v-model="settings.countryScope"
                type="radio"
                name="country-scope"
                value="selected"
                class="radio-input"
                @change="markAsChanged"
              />
              <div class="radio-content">
                <div class="radio-label">เลือกประเทศ</div>
                <div class="radio-description">
                  ผู้ใช้จะได้รับผลลัพธ์การค้นหาทั่วประเทศที่เลือก สามารถเลือกได้สูงสุดห้าประเทศ
                </div>
              </div>
            </label>
          </div>

          <!-- Country Selector (shown when "selected" is chosen) -->
          <div v-if="settings.countryScope === 'selected'" class="country-selector">
            <!-- Selected Countries Display -->
            <div v-if="settings.selectedCountries.length > 0" class="selected-countries">
              <div class="selected-countries-label">
                ประเทศที่เลือก ({{ settings.selectedCountries.length }}/5)
              </div>
              <div class="country-chips">
                <button
                  v-for="countryCode in settings.selectedCountries"
                  :key="countryCode"
                  type="button"
                  class="country-chip"
                  @click="removeCountry(countryCode)"
                >
                  <span>{{ COUNTRIES.find(c => c.code === countryCode)?.name }}</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Country Dropdown -->
            <div class="country-dropdown-wrapper">
              <button
                type="button"
                class="country-dropdown-trigger"
                :disabled="!canAddMoreCountries"
                @click="showCountryDropdown = !showCountryDropdown"
              >
                <span v-if="canAddMoreCountries">เลือกประเทศ</span>
                <span v-else>เลือกครบ 5 ประเทศแล้ว</span>
                <svg 
                  class="w-5 h-5 transition-transform"
                  :class="{ 'rotate-180': showCountryDropdown }"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Dropdown Menu -->
              <div v-if="showCountryDropdown" class="country-dropdown-menu">
                <!-- Search Input -->
                <div class="country-search">
                  <svg class="country-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    v-model="countrySearchQuery"
                    type="text"
                    class="country-search-input"
                    placeholder="ค้นหาประเทศ..."
                    @click.stop
                  />
                </div>

                <!-- Country List -->
                <div class="country-list">
                  <button
                    v-for="country in filteredCountries"
                    :key="country.code"
                    type="button"
                    class="country-item"
                    :class="{ 
                      'country-item-selected': isCountrySelected(country.code),
                      'country-item-disabled': !isCountrySelected(country.code) && !canAddMoreCountries
                    }"
                    :disabled="!isCountrySelected(country.code) && !canAddMoreCountries"
                    @click="toggleCountry(country.code)"
                  >
                    <div class="country-item-content">
                      <span class="country-flag">{{ country.code }}</span>
                      <div class="country-names">
                        <div class="country-name-th">{{ country.name }}</div>
                        <div class="country-name-en">{{ country.nameEn }}</div>
                      </div>
                    </div>
                    <div v-if="isCountrySelected(country.code)" class="country-check">
                      <svg class="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  </button>
                  <div v-if="filteredCountries.length === 0" class="country-list-empty">
                    ไม่พบประเทศที่ค้นหา
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Location Lookup Section -->
      <section class="settings-section">
        <div class="section-sidebar">
          <h2 class="section-title">ตำแหน่งผู้ใช้ลูกค้าติดพอลต์</h2>
        </div>

        <div class="section-content">
          <label class="checkbox-option">
            <input
              v-model="settings.enableLocationLookup"
              type="checkbox"
              class="checkbox-input"
              @change="markAsChanged"
            />
            <div class="checkbox-content">
              <div class="checkbox-label">เปิดใช้ตำแหน่งติดพอลต์สำหรับลูกค้า</div>
              <div class="checkbox-description">
                เมื่อเปิดใช้งาน ลูกค้าจะเริ่มต้นด้วยตำแหน่งติดพอลต์นี้
              </div>
            </div>
          </label>

          <label class="checkbox-option">
            <input
              v-model="settings.showAddressInAllCountries"
              type="checkbox"
              class="checkbox-input"
              @change="markAsChanged"
            />
            <div class="checkbox-content">
              <div class="checkbox-label">ซ่อนแถบตำแหน่งในแอปลูกค้า</div>
              <div class="checkbox-description">
                เมื่อเปิดใช้งาน แถบตำแหน่งจะถูกซ่อนจากผู้ใช้ในแอปลูกค้า
              </div>
            </div>
          </label>
        </div>
      </section>

      <!-- Default Location Section -->
      <section class="settings-section">
        <div class="section-sidebar">
          <h2 class="section-title">ตำแหน่งผู้ใช้ลูกค้าติดพอลต์</h2>
        </div>

        <div class="section-content">
          <!-- Latitude & Longitude -->
          <div class="form-row">
            <div class="form-group">
              <label for="latitude" class="form-label">ละติจูด</label>
              <input
                id="latitude"
                v-model.number="settings.defaultLocation.latitude"
                type="text"
                class="form-input"
                placeholder="ป้อนละติจูด"
                @input="markAsChanged"
              />
            </div>

            <div class="form-group">
              <label for="longitude" class="form-label">ลองจิจูด</label>
              <input
                id="longitude"
                v-model.number="settings.defaultLocation.longitude"
                type="text"
                class="form-input"
                placeholder="ป้อนลองจิจูด"
                @input="markAsChanged"
              />
            </div>
          </div>

          <!-- Search Location -->
          <div class="form-group">
            <label for="search-location" class="form-label">ค้นหาตำแหน่ง</label>
            <div class="search-input-wrapper">
              <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                id="search-location"
                v-model="locationSearch"
                type="text"
                class="form-input search-input"
                placeholder="ค้นหาตำแหน่ง"
                autocomplete="off"
                @input="handleLocationSearch"
                @focus="showSearchResults = searchResults.length > 0"
              />
              <button
                v-if="locationSearch"
                type="button"
                class="search-clear"
                @click="locationSearch = ''; searchResults = []; showSearchResults = false"
                aria-label="ล้าง"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <!-- Search Results Dropdown -->
            <div v-if="showSearchResults" class="search-results">
              <div v-if="isSearching" class="search-result-item">
                <div class="animate-pulse">กำลังค้นหา...</div>
              </div>
              <button
                v-for="result in searchResults"
                :key="result.place_id"
                type="button"
                class="search-result-item"
                @click="selectSearchResult(result)"
              >
                <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div class="flex-1 text-left">
                  <div class="text-sm font-medium text-gray-900">
                    {{ result.structured_formatting.main_text }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ result.structured_formatting.secondary_text }}
                  </div>
                </div>
              </button>
              <div v-if="!isSearching && searchResults.length === 0" class="search-result-item text-gray-500">
                ไม่พบผลลัพธ์
              </div>
            </div>
          </div>

          <!-- Map Preview -->
          <div class="map-preview">
            <div ref="mapContainer" class="map-container"></div>
            <button 
              type="button"
              class="map-center-button"
              @click="centerMap"
              aria-label="กลับไปยังตำแหน่งเริ่มต้น"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </button>
          </div>

          <!-- Location Info -->
          <div class="location-info">
            <svg class="location-info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="location-info-text">
              คลิกบนแผนที่หรือลากหมุดเพื่อเลือกตำแหน่งเริ่มต้น
            </p>
          </div>
        </div>
      </section>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const { success, error: showError } = useToast()

// State
const loading = ref(false)
const saving = ref(false)
const hasChanges = ref(false)

// Country list (ISO 3166-1 alpha-2 codes with Thai names)
const COUNTRIES = [
  { code: 'TH', name: 'ไทย', nameEn: 'Thailand' },
  { code: 'US', name: 'สหรัฐอเมริกา', nameEn: 'United States' },
  { code: 'GB', name: 'สหราชอาณาจักร', nameEn: 'United Kingdom' },
  { code: 'JP', name: 'ญี่ปุ่น', nameEn: 'Japan' },
  { code: 'CN', name: 'จีน', nameEn: 'China' },
  { code: 'KR', name: 'เกาหลีใต้', nameEn: 'South Korea' },
  { code: 'SG', name: 'สิงคโปร์', nameEn: 'Singapore' },
  { code: 'MY', name: 'มาเลเซีย', nameEn: 'Malaysia' },
  { code: 'ID', name: 'อินโดนีเซีย', nameEn: 'Indonesia' },
  { code: 'VN', name: 'เวียดนาม', nameEn: 'Vietnam' },
  { code: 'PH', name: 'ฟิลิปปินส์', nameEn: 'Philippines' },
  { code: 'AU', name: 'ออสเตรเลีย', nameEn: 'Australia' },
  { code: 'NZ', name: 'นิวซีแลนด์', nameEn: 'New Zealand' },
  { code: 'IN', name: 'อินเดีย', nameEn: 'India' },
  { code: 'FR', name: 'ฝรั่งเศส', nameEn: 'France' },
  { code: 'DE', name: 'เยอรมนี', nameEn: 'Germany' },
  { code: 'IT', name: 'อิตาลี', nameEn: 'Italy' },
  { code: 'ES', name: 'สเปน', nameEn: 'Spain' },
  { code: 'CA', name: 'แคนาดา', nameEn: 'Canada' },
  { code: 'BR', name: 'บราซิล', nameEn: 'Brazil' }
]

const showCountryDropdown = ref(false)
const countrySearchQuery = ref('')

interface MapsSettings {
  browserApiKey: string
  serverApiKey: string
  countryScope: 'global' | 'selected'
  selectedCountries: string[]
  enableLocationLookup: boolean
  showAddressInAllCountries: boolean
  defaultLocation: {
    latitude: number
    longitude: number
  }
}

const settings = ref<MapsSettings>({
  browserApiKey: '',
  serverApiKey: '',
  countryScope: 'global',
  selectedCountries: [],
  enableLocationLookup: false,
  showAddressInAllCountries: false,
  defaultLocation: {
    latitude: 13.7563,
    longitude: 100.5018
  }
})

// Map state
const mapContainer = ref<HTMLElement | null>(null)
const mapInstance = ref<google.maps.Map | null>(null)
const mapMarker = ref<google.maps.Marker | null>(null)
const locationSearch = ref('')
const autocompleteService = ref<google.maps.places.AutocompleteService | null>(null)
const placesService = ref<google.maps.places.PlacesService | null>(null)
const searchResults = ref<google.maps.places.AutocompletePrediction[]>([])
const isSearching = ref(false)
const showSearchResults = ref(false)

// Methods
function markAsChanged() {
  hasChanges.value = true
}

// Country selection methods
const filteredCountries = computed(() => {
  if (!countrySearchQuery.value) return COUNTRIES
  
  const query = countrySearchQuery.value.toLowerCase()
  return COUNTRIES.filter(country => 
    country.name.toLowerCase().includes(query) ||
    country.nameEn.toLowerCase().includes(query) ||
    country.code.toLowerCase().includes(query)
  )
})

const selectedCountryNames = computed(() => {
  return settings.value.selectedCountries
    .map(code => COUNTRIES.find(c => c.code === code)?.name)
    .filter(Boolean)
})

const canAddMoreCountries = computed(() => {
  return settings.value.selectedCountries.length < 5
})

function toggleCountry(countryCode: string) {
  const index = settings.value.selectedCountries.indexOf(countryCode)
  
  if (index > -1) {
    // Remove country
    settings.value.selectedCountries.splice(index, 1)
  } else {
    // Add country (max 5)
    if (settings.value.selectedCountries.length < 5) {
      settings.value.selectedCountries.push(countryCode)
    }
  }
  
  markAsChanged()
}

function removeCountry(countryCode: string) {
  const index = settings.value.selectedCountries.indexOf(countryCode)
  if (index > -1) {
    settings.value.selectedCountries.splice(index, 1)
    markAsChanged()
  }
}

function isCountrySelected(countryCode: string): boolean {
  return settings.value.selectedCountries.includes(countryCode)
}

async function loadSettings() {
  loading.value = true
  try {
    const { data, error: err } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'maps_settings')
      .single()

    if (err && err.code !== 'PGRST116') throw err

    if (data?.value) {
      settings.value = {
        ...settings.value,
        ...data.value
      }
    }
  } catch (e: any) {
    console.error('Failed to load maps settings:', e)
    showError('ไม่สามารถโหลดการตั้งค่าได้')
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  if (!hasChanges.value) return

  saving.value = true
  try {
    const { error: err } = await supabase
      .from('system_settings')
      .upsert({
        key: 'maps_settings',
        value: settings.value,
        updated_at: new Date().toISOString()
      })

    if (err) throw err

    hasChanges.value = false
    success('บันทึกการตั้งค่าสำเร็จ')
  } catch (e: any) {
    console.error('Failed to save maps settings:', e)
    showError('ไม่สามารถบันทึกการตั้งค่าได้')
  } finally {
    saving.value = false
  }
}

// Google Maps initialization
function initMap() {
  if (!mapContainer.value) return
  
  const center = {
    lat: settings.value.defaultLocation.latitude,
    lng: settings.value.defaultLocation.longitude
  }
  
  mapInstance.value = new google.maps.Map(mapContainer.value, {
    center,
    zoom: 15,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: true,
    gestureHandling: 'greedy'
  })
  
  // Add marker
  mapMarker.value = new google.maps.Marker({
    position: center,
    map: mapInstance.value,
    draggable: true,
    title: 'ตำแหน่งเริ่มต้น'
  })
  
  // Listen to marker drag
  mapMarker.value.addListener('dragend', () => {
    if (!mapMarker.value) return
    const position = mapMarker.value.getPosition()
    if (position) {
      settings.value.defaultLocation.latitude = position.lat()
      settings.value.defaultLocation.longitude = position.lng()
      markAsChanged()
    }
  })
  
  // Listen to map click
  mapInstance.value.addListener('click', (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return
    updateMarkerPosition(e.latLng.lat(), e.latLng.lng())
  })
  
  // Initialize autocomplete service
  autocompleteService.value = new google.maps.places.AutocompleteService()
  placesService.value = new google.maps.places.PlacesService(mapInstance.value)
}

function updateMarkerPosition(lat: number, lng: number) {
  settings.value.defaultLocation.latitude = lat
  settings.value.defaultLocation.longitude = lng
  
  if (mapMarker.value) {
    mapMarker.value.setPosition({ lat, lng })
  }
  
  if (mapInstance.value) {
    mapInstance.value.panTo({ lat, lng })
  }
  
  markAsChanged()
}

function centerMap() {
  if (!mapInstance.value) return
  
  const center = {
    lat: settings.value.defaultLocation.latitude,
    lng: settings.value.defaultLocation.longitude
  }
  
  mapInstance.value.setCenter(center)
  mapInstance.value.setZoom(15)
  
  if (mapMarker.value) {
    mapMarker.value.setPosition(center)
  }
}

// Location search
let searchTimeout: number | null = null

function handleLocationSearch() {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  searchTimeout = window.setTimeout(() => {
    performSearch()
  }, 300)
}

async function performSearch() {
  const query = locationSearch.value.trim()
  
  if (query.length < 3) {
    searchResults.value = []
    showSearchResults.value = false
    return
  }
  
  if (!autocompleteService.value) return
  
  isSearching.value = true
  showSearchResults.value = true
  
  try {
    const request: google.maps.places.AutocompletionRequest = {
      input: query
    }
    
    // Apply country restrictions based on scope
    if (settings.value.countryScope === 'selected' && settings.value.selectedCountries.length > 0) {
      request.componentRestrictions = { 
        country: settings.value.selectedCountries.map(code => code.toLowerCase())
      }
    } else {
      // Default to Thailand if global
      request.componentRestrictions = { country: 'th' }
    }
    
    autocompleteService.value.getPlacePredictions(request, (predictions, status) => {
      isSearching.value = false
      
      if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
        searchResults.value = predictions
      } else {
        searchResults.value = []
      }
    })
  } catch (error) {
    console.error('Search error:', error)
    isSearching.value = false
    searchResults.value = []
  }
}

function selectSearchResult(prediction: google.maps.places.AutocompletePrediction) {
  if (!placesService.value) return
  
  const request: google.maps.places.PlaceDetailsRequest = {
    placeId: prediction.place_id,
    fields: ['geometry', 'name']
  }
  
  placesService.value.getDetails(request, (place, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()
      
      updateMarkerPosition(lat, lng)
      locationSearch.value = prediction.description
      showSearchResults.value = false
      searchResults.value = []
    }
  })
}

function closeSearchResults() {
  showSearchResults.value = false
}

// Watch for coordinate changes
watch(() => [settings.value.defaultLocation.latitude, settings.value.defaultLocation.longitude], () => {
  if (mapMarker.value) {
    const position = {
      lat: settings.value.defaultLocation.latitude,
      lng: settings.value.defaultLocation.longitude
    }
    mapMarker.value.setPosition(position)
  }
})

// Load Google Maps script
function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google?.maps) {
      resolve()
      return
    }
    
    // Get API key from environment or settings
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || settings.value.browserApiKey
    
    if (!apiKey) {
      reject(new Error('Google Maps API key not configured'))
      return
    }
    
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=th`
    script.async = true
    script.defer = true
    
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    
    document.head.appendChild(script)
  })
}

// Lifecycle
onMounted(async () => {
  await loadSettings()
  
  try {
    await loadGoogleMapsScript()
    // Wait for next tick to ensure DOM is ready
    setTimeout(() => {
      initMap()
    }, 100)
  } catch (error) {
    console.error('Failed to initialize Google Maps:', error)
    showError('ไม่สามารถโหลด Google Maps ได้ กรุณาตรวจสอบ API Key')
  }
  
  // Close dropdown when clicking outside
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  document.removeEventListener('click', handleClickOutside)
})

// Click outside handler
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  const dropdown = document.querySelector('.country-dropdown-wrapper')
  
  if (dropdown && !dropdown.contains(target)) {
    showCountryDropdown.value = false
    countrySearchQuery.value = ''
  }
}
</script>

<style scoped>
.maps-settings-view {
  min-height: 100vh;
  background: #f5f5f5;
  position: relative;
}

/* Header */
.settings-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: #374151;
  cursor: pointer;
  transition: background-color 0.2s;
}

.back-button:hover {
  background: #f3f4f6;
}

.settings-title {
  flex: 1;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0 1rem;
}

.save-button {
  padding: 0.625rem 1.5rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.save-button:hover:not(:disabled) {
  background: #1d4ed8;
}

.save-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Content */
.settings-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

/* Section */
.settings-section {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 3rem;
  margin-bottom: 3rem;
  background: white;
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .settings-section {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

.section-sidebar {
  padding-right: 1rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.section-description {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
  margin: 0;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Form Elements */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #111827;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-input::placeholder {
  color: #9ca3af;
}

/* API Docs Link */
.api-docs-link {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.link-button {
  display: inline-flex;
  align-items: center;
  color: #2563eb;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.2s;
}

.link-button:hover {
  color: #1d4ed8;
}

.link-description {
  font-size: 0.75rem;
  color: #6b7280;
}

/* Radio Group */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.radio-option:hover {
  border-color: #2563eb;
  background: #f9fafb;
}

.radio-input {
  margin-top: 0.25rem;
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
  accent-color: #2563eb;
}

.radio-content {
  flex: 1;
}

.radio-label {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #111827;
  margin-bottom: 0.25rem;
}

.radio-description {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
}

/* Checkbox */
.checkbox-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
}

.checkbox-input {
  margin-top: 0.25rem;
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
  accent-color: #2563eb;
}

.checkbox-content {
  flex: 1;
}

.checkbox-label {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #111827;
  margin-bottom: 0.25rem;
}

.checkbox-description {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Search Input */
.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.875rem;
  width: 1.25rem;
  height: 1.25rem;
  color: #9ca3af;
  pointer-events: none;
}

.search-input {
  padding-left: 2.75rem;
  padding-right: 2.5rem;
}

.search-clear {
  position: absolute;
  right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  color: #6b7280;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.search-clear:hover {
  background: #f3f4f6;
  color: #374151;
}

/* Search Results */
.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 10;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  background: transparent;
  border: none;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: #f9fafb;
}

.search-result-item:active {
  background: #f3f4f6;
}

/* Map Container */
.map-container {
  width: 100%;
  height: 100%;
}

/* Location Info */
.location-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.location-info-icon {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  color: #6b7280;
}

.location-info-text {
  flex: 1;
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

/* Country Selector */
.country-selector {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.selected-countries {
  margin-bottom: 1rem;
}

.selected-countries-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.country-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.country-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #eff6ff;
  color: #1e40af;
  border: 1px solid #bfdbfe;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.country-chip:hover {
  background: #dbeafe;
  border-color: #93c5fd;
}

.country-chip svg {
  flex-shrink: 0;
}

.country-dropdown-wrapper {
  position: relative;
}

.country-dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.country-dropdown-trigger:hover:not(:disabled) {
  border-color: #2563eb;
  background: #f9fafb;
}

.country-dropdown-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f9fafb;
}

.country-dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  max-height: 400px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 20;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.country-search {
  position: relative;
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.country-search-icon {
  position: absolute;
  left: 1.25rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  color: #9ca3af;
  pointer-events: none;
}

.country-search-input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #111827;
  transition: all 0.2s;
}

.country-search-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.country-list {
  overflow-y: auto;
  max-height: 300px;
}

.country-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background-color 0.2s;
  text-align: left;
}

.country-item:last-child {
  border-bottom: none;
}

.country-item:hover:not(:disabled) {
  background: #f9fafb;
}

.country-item-selected {
  background: #eff6ff;
}

.country-item-selected:hover {
  background: #dbeafe;
}

.country-item-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.country-item-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.country-flag {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: #f3f4f6;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
}

.country-names {
  flex: 1;
}

.country-name-th {
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
}

.country-name-en {
  font-size: 0.75rem;
  color: #6b7280;
}

.country-check {
  flex-shrink: 0;
}

.country-list-empty {
  padding: 2rem 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: #6b7280;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

.map-preview {
  position: relative;
  width: 100%;
  height: 400px;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.map-center-button {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: white;
  border: none;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s;
  z-index: 5;
}

.map-center-button:hover {
  background: #f9fafb;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.map-center-button:active {
  transform: scale(0.95);
}
</style>
