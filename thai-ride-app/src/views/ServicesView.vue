<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import MapView from '../components/MapView.vue'
import LocationPermissionModal from '../components/LocationPermissionModal.vue'
import { useLocation, type GeoLocation } from '../composables/useLocation'
import { useServices } from '../composables/useServices'
import { useRideStore } from '../stores/ride'
import { useToast } from '../composables/useToast'

const router = useRouter()
const rideStore = useRideStore()
const toast = useToast()
const { reverseGeocode, getCurrentPosition, shouldShowPermissionModal } = useLocation()
const { homePlace, workPlace, recentPlaces, fetchSavedPlaces, fetchRecentPlaces } = useServices()

// State
const loading = ref(false)
const pickupLocation = ref<GeoLocation | null>(null)
const showLocationPermission = ref(false)
const searchQuery = ref('')
const showSearch = ref(false)

// Default location (Bangkok)
const DEFAULT_LOCATION = { lat: 13.7563, lng: 100.5018, address: 'กรุงเทพฯ' }

// Services
const services = [
  { id: 'ride', name: 'เรียกรถ', icon: 'car', route: '/customer/ride', color: '#000' },
  { id: 'delivery', name: 'ส่งของ', icon: 'package', route: '/customer/delivery', color: '#000' },
  { id: 'shopping', name: 'ซื้อของ', icon: 'shopping', route: '/customer/shopping', color: '#000' }
]

// Quick actions
const quickActions = computed(() => [
  { id: 'home', name: homePlace.value?.name || 'บ้าน', icon: 'home', place: homePlace.value },
  { id: 'work', name: workPlace.value?.name || 'ที่ทำงาน', icon: 'work', place: workPlace.value }
])

// Recent places (max 3)
const displayRecentPlaces = computed(() => recentPlaces.value.slice(0, 3))

// Format address
const formatAddress = (address: string): string => {
  if (!address) return ''
  const parts = address.split(',').map(p => p.trim())
  return parts.slice(0, 2).join(', ')
}

// Get current location
const getCurrentLocation = async () => {
  const shouldShow = await shouldShowPermissionModal()
  if (shouldShow) {
    showLocationPermission.value = true
    return
  }
  await fetchCurrentLocation()
}

const fetchCurrentLocation = async () => {
  loading.value = true
  try {
    const location = await getCurrentPosition()
    pickupLocation.value = location
  } catch (error) {
    console.warn('Location error:', error)
    pickupLocation.value = DEFAULT_LOCATION
  } finally {
    loading.value = false
  }
}

// Handle permission
const handlePermissionAllow = async () => {
  showLocationPermission.value = false
  await fetchCurrentLocation()
}

const handlePermissionDeny = () => {
  showLocationPermission.value = false
  pickupLocation.value = DEFAULT_LOCATION
}

// Navigate to service
const goToService = (route: string) => {
  router.push(route)
}

// Go to ride with destination
const goToRideWithDestination = (place: { lat?: number; lng?: number; address?: string; name?: string }) => {
  if (place?.lat && place?.lng) {
    rideStore.setDestination({
      lat: place.lat,
      lng: place.lng,
      address: place.address || place.name || ''
    })
  }
  router.push('/customer/ride')
}

// Handle quick action
const handleQuickAction = (action: { id: string; place: any }) => {
  if (action.place?.lat && action.place?.lng) {
    goToRideWithDestination(action.place)
  } else {
    toast.info(`กรุณาเพิ่มที่อยู่${action.id === 'home' ? 'บ้าน' : 'ที่ทำงาน'}ก่อน`)
    router.push({ path: '/customer/saved-places', query: { add: action.id } })
  }
}

// Open search
const openSearch = () => {
  router.push('/customer/ride')
}

// Initialize
onMounted(async () => {
  if (!pickupLocation.value) {
    pickupLocation.value = DEFAULT_LOCATION
  }
  fetchSavedPlaces().catch(() => {})
  fetchRecentPlaces().catch(() => {})
  getCurrentLocation()
})
</script>

<template>
  <div class="services-page">
    <!-- Map Background (subtle) -->
    <div class="map-bg">
      <MapView
        :pickup="pickupLocation"
        :show-route="false"
        :draggable="false"
        height="100%"
      />
      <div class="map-overlay"></div>
    </div>

    <!-- Main Content -->
    <div class="content">
      <!-- Header -->
      <div class="header">
        <h1>ไปไหนดี?</h1>
        <p class="subtitle">เลือกบริการที่ต้องการ</p>
      </div>

      <!-- Search Bar (tap to go to ride) -->
      <button class="search-bar" @click="openSearch">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8" stroke-width="2"/>
          <path d="M21 21l-4.35-4.35" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span class="search-placeholder">ค้นหาจุดหมาย...</span>
      </button>

      <!-- Quick Destinations -->
      <div class="quick-section">
        <div class="quick-row">
          <button 
            v-for="action in quickActions" 
            :key="action.id"
            class="quick-btn"
            @click="handleQuickAction(action)"
          >
            <div class="quick-icon">
              <svg v-if="action.id === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
            </div>
            <span>{{ action.name }}</span>
          </button>
        </div>
      </div>

      <!-- Services Grid -->
      <div class="services-section">
        <h2 class="section-title">บริการ</h2>
        <div class="services-grid">
          <button 
            v-for="service in services" 
            :key="service.id"
            class="service-card"
            @click="goToService(service.route)"
          >
            <div class="service-icon">
              <svg v-if="service.icon === 'car'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 17h.01M16 17h.01M3 11l1.5-5.5A2 2 0 016.4 4h11.2a2 2 0 011.9 1.5L21 11M3 11v6a1 1 0 001 1h1m16-7v6a1 1 0 01-1 1h-1M3 11h18"/>
              </svg>
              <svg v-else-if="service.icon === 'package'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
              </svg>
            </div>
            <span class="service-name">{{ service.name }}</span>
          </button>
        </div>
      </div>

      <!-- Recent Places -->
      <div v-if="displayRecentPlaces.length > 0" class="recent-section">
        <h2 class="section-title">ล่าสุด</h2>
        <div class="recent-list">
          <button 
            v-for="place in displayRecentPlaces" 
            :key="place.name"
            class="recent-item"
            @click="goToRideWithDestination(place)"
          >
            <div class="recent-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div class="recent-info">
              <span class="recent-name">{{ place.name }}</span>
              <span class="recent-address">{{ formatAddress(place.address) }}</span>
            </div>
            <svg class="recent-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Location Permission Modal -->
    <LocationPermissionModal
      :show="showLocationPermission"
      @allow="handlePermissionAllow"
      @deny="handlePermissionDeny"
    />
  </div>
</template>

<style scoped>
.services-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #fff;
  position: relative;
}

/* Map Background */
.map-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 35vh;
  z-index: 0;
}

.map-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%);
}

/* Content */
.content {
  position: relative;
  z-index: 1;
  padding: 0 20px;
  padding-top: max(20vh, 160px);
  padding-bottom: calc(100px + env(safe-area-inset-bottom));
}

/* Header */
.header {
  margin-bottom: 24px;
}

.header h1 {
  font-size: 32px;
  font-weight: 700;
  color: #000;
  margin: 0 0 4px;
}

.subtitle {
  font-size: 16px;
  color: #6B6B6B;
  margin: 0;
}

/* Search Bar */
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px 20px;
  background: #F6F6F6;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 24px;
}

.search-bar:hover {
  background: #EFEFEF;
}

.search-bar:active {
  transform: scale(0.98);
}

.search-icon {
  width: 22px;
  height: 22px;
  color: #6B6B6B;
  flex-shrink: 0;
}

.search-placeholder {
  font-size: 16px;
  color: #6B6B6B;
  text-align: left;
}


/* Quick Section */
.quick-section {
  margin-bottom: 28px;
}

.quick-row {
  display: flex;
  gap: 12px;
}

.quick-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border: 1.5px solid #E5E5E5;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-btn:hover {
  border-color: #000;
  background: #FAFAFA;
}

.quick-btn:active {
  transform: scale(0.97);
}

.quick-icon {
  width: 40px;
  height: 40px;
  background: #F6F6F6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.quick-icon svg {
  width: 22px;
  height: 22px;
  color: #000;
}

.quick-btn span {
  font-size: 15px;
  font-weight: 600;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Services Section */
.services-section {
  margin-bottom: 28px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #000;
  margin: 0 0 14px;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.service-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 12px;
  background: #000;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.service-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}

.service-card:active {
  transform: scale(0.96);
}

.service-icon {
  width: 48px;
  height: 48px;
  background: rgba(255,255,255,0.15);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.service-icon svg {
  width: 28px;
  height: 28px;
  color: #fff;
}

.service-name {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}


/* Recent Section */
.recent-section {
  margin-bottom: 20px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #F6F6F6;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.recent-item:hover {
  background: #EFEFEF;
}

.recent-item:active {
  transform: scale(0.98);
}

.recent-icon {
  width: 40px;
  height: 40px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.recent-icon svg {
  width: 20px;
  height: 20px;
  color: #6B6B6B;
}

.recent-info {
  flex: 1;
  min-width: 0;
}

.recent-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-address {
  display: block;
  font-size: 13px;
  color: #6B6B6B;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.recent-arrow {
  width: 20px;
  height: 20px;
  color: #CCC;
  flex-shrink: 0;
}
</style>
