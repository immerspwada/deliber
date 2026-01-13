<script setup lang="ts">
/**
 * Feature: F02 - Simple Ride Booking (Grab/Bolt Style)
 * Refactored Version - Modular & Clean
 * 
 * Performance Optimizations:
 * - Lazy loaded heavy components (Map, Tracking, Searching, Rating)
 * - Minimal initial bundle
 * - Deferred non-critical rendering
 * 
 * UX Enhancements:
 * - Smooth transitions between steps
 * - Haptic feedback on interactions
 * - Better loading states
 * - Pull-to-refresh for nearby places
 * 
 * UX Flow: 1.เลือกจุดหมาย → 2.กดจอง → 3.ติดตาม → 4.ให้คะแนน
 */
import { ref, onMounted, computed, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useRideRequest } from '../../composables/useRideRequest'
import { usePullToRefresh } from '../../composables/usePullToRefresh'

// Critical components - load immediately
import RideHeader from '../../components/ride/RideHeader.vue'
import RideSearchBox from '../../components/ride/RideSearchBox.vue'
import RidePlacesList from '../../components/ride/RidePlacesList.vue'
import RideBookingPanel from '../../components/ride/RideBookingPanel.vue'
import RideStepIndicator from '../../components/ride/RideStepIndicator.vue'
import PullToRefreshIndicator from '../../components/PullToRefreshIndicator.vue'

// Heavy components - lazy load
const MapView = defineAsyncComponent({
  loader: () => import('../../components/MapView.vue'),
  delay: 0,
  timeout: 10000
})

const RideSearchingView = defineAsyncComponent({
  loader: () => import('../../components/ride/RideSearchingView.vue'),
  delay: 0
})

const RideTrackingView = defineAsyncComponent({
  loader: () => import('../../components/ride/RideTrackingView.vue'),
  delay: 0
})

const RideRatingView = defineAsyncComponent({
  loader: () => import('../../components/ride/RideRatingView.vue'),
  delay: 0
})

const router = useRouter()

// Use the ride request composable
const {
  currentStep,
  pickup,
  destination,
  selectedVehicle,
  isBooking,
  isGettingLocation,
  isLoadingVehicles,
  searchQuery,
  isSearchFocused,
  searchResults,
  searchingSeconds,
  nearbyPlaces,
  isLoadingNearby,
  estimatedFare,
  estimatedTime,
  estimatedDistance,
  matchedDriver,
  userRating,
  isSubmittingRating,
  vehicles,
  savedPlaces,
  recentPlaces,
  finalFare,
  currentBalance,
  hasEnoughBalance,
  canBook,
  statusText,
  activeRide,
  initialize,
  getCurrentLocation,
  searchPlaces,
  selectDestination,
  handleRouteCalculated,
  bookRide,
  cancelRide,
  submitRating,
  callDriver,
  callEmergency
} = useRideRequest()

// Computed rideId from activeRide
const currentRideId = computed(() => {
  if (activeRide.value?.id) {
    return String(activeRide.value.id)
  }
  return undefined
})

// Map interaction state
const rideNotes = ref('')

// Reverse geocode helper
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { Accept: 'application/json', 'User-Agent': 'ThaiRideApp/1.0' } }
    )
    if (response.ok) {
      const data = await response.json()
      return data.display_name?.split(',').slice(0, 2).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }
  } catch {
    // ignore
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

// Handle map click to select destination
async function handleMapClick(coords: { lat: number; lng: number }): Promise<void> {
  // Haptic feedback
  if ('vibrate' in navigator) {
    navigator.vibrate(30)
  }
  
  // Get address from coordinates
  const address = await reverseGeocode(coords.lat, coords.lng)
  
  // Set as destination
  selectDestination({
    name: address,
    address: address,
    lat: coords.lat,
    lng: coords.lng
  })
  
  searchQuery.value = address
}

// Pull-to-refresh setup
const pullToRefreshEnabled = computed(() => 
  currentStep.value === 'select' && !destination.value && !isSearchFocused.value
)

const { pullDistance, isRefreshing, canRelease, progress } = usePullToRefresh({
  threshold: 80,
  resistance: 2.5,
  maxPull: 150,
  enabled: pullToRefreshEnabled,
  onRefresh: async () => {
    await getCurrentLocation()
  }
})

// Navigation
function goBack(): void {
  router.push('/customer')
}

function goToWallet(): void {
  router.push('/customer/wallet')
}

function skipRating(): void {
  userRating.value = 0
  currentStep.value = 'select'
  destination.value = null
  searchQuery.value = ''
}

// Handle booking with options
interface BookingOptions {
  paymentMethod: 'wallet' | 'cash' | 'card'
  scheduledTime: string | null
  promoCode: string | null
  promoDiscount: number
  finalAmount: number
  notes: string
}

function handleBook(options: BookingOptions): void {
  bookRide({ ...options, notes: rideNotes.value })
}

// Initialize on mount
onMounted(() => {
  initialize()
})

// Reset to first step
function resetToSelect(): void {
  currentStep.value = 'select'
  destination.value = null
  searchQuery.value = ''
  rideNotes.value = ''
}
</script>

<template>
  <div class="ride-page">
    <!-- Pull-to-Refresh Indicator -->
    <PullToRefreshIndicator
      :pullDistance="pullDistance"
      :isRefreshing="isRefreshing"
      :canRelease="canRelease"
      :progress="progress"
    />

    <!-- STEP 1: SELECT DESTINATION -->
    <Transition name="page-fade" mode="out-in">
      <div v-if="currentStep === 'select'" key="select" class="select-view">
        <!-- Header -->
        <RideHeader
          :pickup="pickup"
          :isGettingLocation="isGettingLocation"
          @back="goBack"
          @refresh="getCurrentLocation"
        />

        <!-- Map Preview - Tap to select destination -->
        <div v-if="pickup" class="map-section">
          <Suspense>
            <MapView
              :pickup="pickup"
              :destination="destination"
              :showRoute="!!destination"
              height="220px"
              @routeCalculated="handleRouteCalculated"
              @mapClick="handleMapClick"
            />
            <template #fallback>
              <div class="map-skeleton">
                <div class="map-loading-spinner"></div>
                <span class="map-loading-text">กำลังโหลดแผนที่...</span>
              </div>
            </template>
          </Suspense>
          
          <!-- Map hint -->
          <div v-if="!destination" class="map-hint">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>แตะบนแผนที่เพื่อเลือกปลายทาง</span>
          </div>
        </div>

        <!-- Step Indicator - Below Map, Above Search -->
        <RideStepIndicator :currentStep="currentStep" />

        <!-- Search Box -->
        <RideSearchBox
          v-model="searchQuery"
          v-model:isFocused="isSearchFocused"
          :results="searchResults"
          :nearbyPlaces="nearbyPlaces"
          :isLoadingNearby="isLoadingNearby"
          @search="searchPlaces"
          @select="selectDestination"
          @clear="searchResults = []"
        />

        <!-- Places List (when not searching and no destination) -->
        <Transition name="fade-slide">
          <RidePlacesList
            v-if="!isSearchFocused && !destination"
            :savedPlaces="savedPlaces || []"
            :recentPlaces="recentPlaces || []"
            :nearbyPlaces="nearbyPlaces"
            :isLoadingNearby="isLoadingNearby || isRefreshing"
            @select="selectDestination"
          />
        </Transition>

        <!-- Booking Panel (when destination selected) -->
        <Transition name="slide-up">
          <RideBookingPanel
            v-if="destination"
            :pickup="pickup"
            :destination="destination"
            :vehicles="vehicles"
            v-model:selectedVehicle="selectedVehicle"
            v-model:notes="rideNotes"
            :estimatedFare="estimatedFare"
            :estimatedDistance="estimatedDistance"
            :estimatedTime="estimatedTime"
            :finalFare="finalFare"
            :currentBalance="currentBalance"
            :hasEnoughBalance="hasEnoughBalance"
            :canBook="canBook"
            :isBooking="isBooking"
            :isLoadingVehicles="isLoadingVehicles"
            @book="handleBook"
            @topup="goToWallet"
          />
        </Transition>
      </div>

      <!-- STEP 2: SEARCHING FOR DRIVER - Lazy loaded -->
      <div v-else-if="currentStep === 'searching'" key="searching" class="step-view">
        <Suspense>
          <RideSearchingView
            :searchingSeconds="searchingSeconds"
            @cancel="cancelRide"
          />
          <template #fallback>
            <div class="step-loading">
              <div class="loading-spinner"></div>
              <p>กำลังโหลด...</p>
            </div>
          </template>
        </Suspense>
      </div>

      <!-- STEP 3: TRACKING RIDE - Lazy loaded -->
      <div v-else-if="currentStep === 'tracking'" key="tracking" class="step-view">
        <Suspense>
          <RideTrackingView
            :pickup="pickup"
            :destination="destination"
            :matchedDriver="matchedDriver"
            :statusText="statusText"
            :rideId="currentRideId"
            @callDriver="callDriver"
            @callEmergency="callEmergency"
            @cancel="cancelRide"
          />
          <template #fallback>
            <div class="step-loading">
              <div class="loading-spinner"></div>
              <p>กำลังโหลด...</p>
            </div>
          </template>
        </Suspense>
      </div>

      <!-- STEP 4: RATING - Lazy loaded -->
      <div v-else-if="currentStep === 'rating'" key="rating" class="step-view">
        <Suspense>
          <RideRatingView
            v-model:rating="userRating"
            :isSubmitting="isSubmittingRating"
            @submit="submitRating"
            @skip="skipRating"
          />
          <template #fallback>
            <div class="step-loading">
              <div class="loading-spinner"></div>
              <p>กำลังโหลด...</p>
            </div>
          </template>
        </Suspense>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ride-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #f5f5f5;
  padding-bottom: env(safe-area-inset-bottom);
}

.select-view {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
  min-height: calc(100dvh - 120px);
}

.step-view {
  min-height: calc(100vh - 120px);
  min-height: calc(100dvh - 120px);
}

.map-section {
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.map-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 12px;
  background: #f8f8f8;
  border-radius: 20px;
  font-size: 12px;
  color: #666;
}

.map-hint svg {
  color: #00a86b;
}

/* Map skeleton for loading state */
.map-skeleton {
  height: 220px;
  background: linear-gradient(135deg, #f0f0f0 0%, #e8e8e8 50%, #f0f0f0 100%);
  background-size: 200% 200%;
  animation: skeleton-gradient 2s ease infinite;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

@keyframes skeleton-gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.map-loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e0e0e0;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.map-loading-text {
  font-size: 13px;
  color: #999;
}

/* Step loading state */
.step-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  gap: 16px;
  background: #f5f5f5;
}

.loading-spinner {
  width: 44px;
  height: 44px;
  border: 3px solid #e0e0e0;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.step-loading p {
  color: #666;
  font-size: 14px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Page transition */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Fade slide transition */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

/* Slide up transition for booking panel */
.slide-up-enter-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-leave-active {
  transition: all 0.25s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(100%);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(50%);
}
</style>
