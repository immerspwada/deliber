<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
const { getCurrentPosition, shouldShowPermissionModal } = useLocation()
const { homePlace, workPlace, recentPlaces, fetchSavedPlaces, fetchRecentPlaces } = useServices()

const loading = ref(false)
const pickupLocation = ref<GeoLocation | null>(null)
const showLocationPermission = ref(false)

const DEFAULT_LOCATION = { lat: 13.7563, lng: 100.5018, address: 'กรุงเทพฯ' }

// Main services - บริการหลัก
const mainServices = [
  { id: 'ride', name: 'เรียกรถ', route: '/customer/ride', color: '#00A86B' },
  { id: 'delivery', name: 'ส่งของ', route: '/customer/delivery', color: '#F5A623' },
  { id: 'shopping', name: 'ซื้อของ', route: '/customer/shopping', color: '#E53935' }
]

// Additional services - บริการเพิ่มเติม
const additionalServices = [
  { id: 'queue', name: 'จองคิว', route: '/customer/queue-booking', color: '#9C27B0', description: 'จองคิวร้านค้า/โรงพยาบาล' },
  { id: 'moving', name: 'ยกของ', route: '/customer/moving', color: '#2196F3', description: 'บริการยกของ/ขนย้าย' },
  { id: 'laundry', name: 'ซักผ้า', route: '/customer/laundry', color: '#00BCD4', description: 'รับ-ส่งซักผ้า' }
]

const savedPlaces = computed(() => [
  { id: 'home', name: homePlace.value?.name || 'บ้าน', place: homePlace.value, icon: 'home' },
  { id: 'work', name: workPlace.value?.name || 'ที่ทำงาน', place: workPlace.value, icon: 'work' }
])

const displayRecentPlaces = computed(() => recentPlaces.value.slice(0, 2))

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

const handlePermissionAllow = async () => {
  showLocationPermission.value = false
  await fetchCurrentLocation()
}

const handlePermissionDeny = () => {
  showLocationPermission.value = false
  pickupLocation.value = DEFAULT_LOCATION
}

const goToService = (route: string) => {
  router.push(route)
}

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

const handleSavedPlace = (item: { id: string; place: any }) => {
  if (item.place?.lat && item.place?.lng) {
    goToRideWithDestination(item.place)
  } else {
    toast.info(`กรุณาเพิ่มที่อยู่${item.id === 'home' ? 'บ้าน' : 'ที่ทำงาน'}ก่อน`)
    router.push({ path: '/customer/saved-places', query: { add: item.id } })
  }
}

const goBack = () => {
  router.back()
}

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
    <!-- Map Background (smaller) -->
    <div class="map-container">
      <MapView
        :pickup="pickupLocation"
        :show-route="false"
        :draggable="false"
        height="100%"
      />
      
      <!-- Top Bar -->
      <div class="top-bar">
        <button class="back-btn" @click="goBack" aria-label="กลับ">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div class="logo">
          <svg viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="#00A86B" stroke-width="2"/>
            <path d="M16 8L22 20H10L16 8Z" fill="#00A86B"/>
            <circle cx="16" cy="18" r="3" fill="#00A86B"/>
          </svg>
          <span>GOBEAR</span>
        </div>
        <div class="spacer"></div>
      </div>
    </div>

    <!-- Bottom Sheet - Main Content -->
    <div class="bottom-sheet">
      <div class="sheet-handle"></div>
      
      <!-- Main Services - กดได้ใน 1 วินาที -->
      <div class="services-grid">
        <button 
          v-for="service in mainServices" 
          :key="service.id"
          class="service-btn"
          :style="{ '--accent': service.color }"
          @click="goToService(service.route)"
        >
          <div class="service-icon">
            <!-- Ride Icon -->
            <svg v-if="service.id === 'ride'" viewBox="0 0 24 24" fill="none">
              <path d="M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0z" stroke="currentColor" stroke-width="2"/>
              <path d="M5 17H3v-4l2-5h9l4 5h3v4h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M14 8V5H6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <!-- Delivery Icon -->
            <svg v-else-if="service.id === 'delivery'" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="7" width="12" height="12" rx="1" stroke="currentColor" stroke-width="2"/>
              <path d="M15 11h4l2 4v4h-6v-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="7" cy="19" r="2" stroke="currentColor" stroke-width="2"/>
              <circle cx="17" cy="19" r="2" stroke="currentColor" stroke-width="2"/>
            </svg>
            <!-- Shopping Icon -->
            <svg v-else viewBox="0 0 24 24" fill="none">
              <path d="M6 6h15l-1.5 9h-12L6 6z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M6 6L5 3H2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="9" cy="20" r="1.5" stroke="currentColor" stroke-width="2"/>
              <circle cx="18" cy="20" r="1.5" stroke="currentColor" stroke-width="2"/>
            </svg>
          </div>
          <span class="service-name">{{ service.name }}</span>
        </button>
      </div>

      <!-- Quick Destination - กดได้ใน 2 วินาที -->
      <button class="destination-btn" @click="goToService('/customer/ride')">
        <div class="dest-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" fill="#E53935"/>
            <circle cx="12" cy="12" r="8" stroke="#E53935" stroke-width="2"/>
          </svg>
        </div>
        <div class="dest-text">
          <span class="dest-label">ไปไหนดี?</span>
          <span class="dest-hint">กดเพื่อค้นหาจุดหมาย</span>
        </div>
        <svg class="dest-arrow" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      <!-- Saved Places - กดได้ใน 3 วินาที -->
      <div class="saved-section">
        <div class="saved-row">
          <button 
            v-for="item in savedPlaces" 
            :key="item.id"
            class="saved-btn"
            @click="handleSavedPlace(item)"
          >
            <div class="saved-icon">
              <svg v-if="item.icon === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
            </div>
            <span>{{ item.name }}</span>
          </button>
        </div>
      </div>

      <!-- Additional Services - บริการเพิ่มเติม -->
      <div class="additional-section">
        <h3 class="section-title">บริการเพิ่มเติม</h3>
        <div class="additional-grid">
          <button 
            v-for="service in additionalServices" 
            :key="service.id"
            class="additional-btn"
            :style="{ '--accent': service.color }"
            @click="goToService(service.route)"
          >
            <div class="additional-icon">
              <!-- Queue Icon -->
              <svg v-if="service.id === 'queue'" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M8 9h8M8 13h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="17" cy="13" r="2" stroke="currentColor" stroke-width="2"/>
              </svg>
              <!-- Moving Icon -->
              <svg v-else-if="service.id === 'moving'" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="8" width="10" height="10" rx="1" stroke="currentColor" stroke-width="2"/>
                <path d="M14 12h4l2 3v3h-6v-6z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="8" cy="18" r="2" stroke="currentColor" stroke-width="2"/>
                <circle cx="16" cy="18" r="2" stroke="currentColor" stroke-width="2"/>
                <path d="M7 8V5h6v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <!-- Laundry Icon -->
              <svg v-else viewBox="0 0 24 24" fill="none">
                <rect x="3" y="2" width="18" height="20" rx="2" stroke="currentColor" stroke-width="2"/>
                <circle cx="12" cy="13" r="5" stroke="currentColor" stroke-width="2"/>
                <path d="M9 13c0-1.5 1.5-2 3-1s3 .5 3-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="7" cy="6" r="1" fill="currentColor"/>
                <circle cx="10" cy="6" r="1" fill="currentColor"/>
              </svg>
            </div>
            <div class="additional-info">
              <span class="additional-name">{{ service.name }}</span>
              <span class="additional-desc">{{ service.description }}</span>
            </div>
            <svg class="additional-arrow" viewBox="0 0 24 24" fill="none" stroke="#CCC" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Recent Places (if any) -->
      <div v-if="displayRecentPlaces.length > 0" class="recent-section">
        <h3 class="section-title">ล่าสุด</h3>
        <div class="recent-list">
          <button 
            v-for="place in displayRecentPlaces" 
            :key="place.name"
            class="recent-item"
            @click="goToRideWithDestination(place)"
          >
            <div class="recent-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 8v4l3 3" stroke="#666" stroke-width="2" stroke-linecap="round"/>
                <circle cx="12" cy="12" r="9" stroke="#666" stroke-width="2"/>
              </svg>
            </div>
            <span class="recent-name">{{ place.name }}</span>
            <svg class="recent-arrow" viewBox="0 0 24 24" fill="none" stroke="#CCC" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
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
  background: #FFFFFF;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* Map Container - เล็กลงเพื่อให้ bottom sheet ใหญ่ขึ้น */
.map-container {
  position: relative;
  height: 32vh;
  flex-shrink: 0;
}

/* Top Bar */
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top));
  z-index: 10;
}

.back-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.back-btn svg {
  width: 24px;
  height: 24px;
  color: #1A1A1A;
}

.back-btn:active {
  transform: scale(0.95);
}

.spacer {
  width: 44px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #FFFFFF;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.logo svg {
  width: 24px;
  height: 24px;
}

.logo span {
  font-size: 13px;
  font-weight: 700;
  color: #00A86B;
  letter-spacing: 0.5px;
}

/* Bottom Sheet */
.bottom-sheet {
  flex: 1;
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
  margin-top: -20px;
  padding: 10px 20px 24px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  position: relative;
  z-index: 20;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
  overflow-y: auto;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: #E0E0E0;
  border-radius: 2px;
  margin: 0 auto 16px;
}

/* Services Grid - 3 ปุ่มหลัก กดได้ใน 1 วินาที */
.services-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.service-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 12px;
  background: #FFFFFF;
  border: 2px solid #F0F0F0;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.service-btn:active {
  transform: scale(0.96);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, white);
}

.service-icon {
  width: 52px;
  height: 52px;
  background: color-mix(in srgb, var(--accent) 12%, white);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.service-icon svg {
  width: 28px;
  height: 28px;
  color: var(--accent);
}

.service-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

/* Destination Button - กดได้ใน 2 วินาที */
.destination-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: #F8F8F8;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  margin-bottom: 16px;
  text-align: left;
}

.destination-btn:active {
  background: #F0F0F0;
}

.dest-icon {
  width: 44px;
  height: 44px;
  background: #FFFFFF;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.dest-icon svg {
  width: 24px;
  height: 24px;
}

.dest-text {
  flex: 1;
  min-width: 0;
}

.dest-label {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 2px;
}

.dest-hint {
  display: block;
  font-size: 13px;
  color: #999999;
}

.dest-arrow {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Saved Places - กดได้ใน 3 วินาที */
.saved-section {
  margin-bottom: 16px;
}

.saved-row {
  display: flex;
  gap: 10px;
}

.saved-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  cursor: pointer;
}

.saved-btn:active {
  background: #F5F5F5;
  transform: scale(0.98);
}

.saved-icon {
  width: 36px;
  height: 36px;
  background: #E8F5EF;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.saved-icon svg {
  width: 18px;
  height: 18px;
  color: #00A86B;
}

.saved-btn span {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Additional Services Section */
.additional-section {
  margin-bottom: 16px;
}

.additional-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.additional-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.additional-btn:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, white);
}

.additional-btn:active {
  transform: scale(0.98);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, white);
}

.additional-icon {
  width: 44px;
  height: 44px;
  background: color-mix(in srgb, var(--accent) 12%, white);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.additional-icon svg {
  width: 24px;
  height: 24px;
  color: var(--accent);
}

.additional-info {
  flex: 1;
  min-width: 0;
}

.additional-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 2px;
}

.additional-desc {
  display: block;
  font-size: 12px;
  color: #999999;
}

.additional-arrow {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* Recent Section */
.recent-section {
  margin-top: 8px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  width: 100%;
}

.recent-item:active {
  background: #F5F5F5;
}

.recent-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.recent-icon svg {
  width: 100%;
  height: 100%;
}

.recent-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-arrow {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
</style>
