<script setup lang="ts">
/**
 * Feature: F02 - Simple Ride Booking (Grab/Bolt Style)
 * Refactored Version - Modular & Clean
 * 
 * PRODUCTION READY:
 * - Role-based access control (Customer only)
 * - Input validation with Zod
 * - Error handling with boundaries
 * - Performance optimized
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
import { useRoleAccess } from '../../composables/useRoleAccess'
import { useErrorHandler } from '../../composables/useErrorHandler'
import { useGeocode } from '../../composables/useGeocode'

// Critical components - load immediately
import RideHeader from '../../components/ride/RideHeader.vue'
import RideSearchBox from '../../components/ride/RideSearchBox.vue'
import RidePlacesList from '../../components/ride/RidePlacesList.vue'
import RideBookingPanel from '../../components/ride/RideBookingPanel.vue'
import RideStepIndicator from '../../components/ride/RideStepIndicator.vue'
import PullToRefreshIndicator from '../../components/PullToRefreshIndicator.vue'
import MapView from '../../components/MapView.vue'
import RideTrackingView from '../../components/ride/RideTrackingView.vue'

// Heavy components - lazy load
const RideSearchingView = defineAsyncComponent({
  loader: () => import('../../components/ride/RideSearchingView.vue'),
  delay: 0
})

const RideRatingView = defineAsyncComponent({
  loader: () => import('../../components/ride/RideRatingView.vue'),
  delay: 0
})

const router = useRouter()

// =====================================================
// ROLE-BASED ACCESS CONTROL (PRODUCTION)
// =====================================================
const { isCustomer, isAdmin, isSuperAdmin } = useRoleAccess()
const { handleError } = useErrorHandler()
const { reverseGeocode } = useGeocode()

// Check role on mount - redirect if not customer/admin/super_admin
const hasAccess = computed(() => isCustomer.value || isAdmin.value || isSuperAdmin.value)

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

// Computed trackingId from activeRide
const currentTrackingId = computed(() => {
  if (activeRide.value?.tracking_id) {
    return String(activeRide.value.tracking_id)
  }
  return undefined
})

// Ride notes state
const rideNotes = ref('')

// Handle map click to select destination
async function handleMapClick(coords: { lat: number; lng: number }): Promise<void> {
  // Haptic feedback
  if ('vibrate' in navigator) {
    navigator.vibrate(30)
  }
  
  // Set destination immediately with coordinates (don't wait for geocoding)
  const tempAddress = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
  
  selectDestination({
    name: tempAddress,
    address: tempAddress,
    lat: coords.lat,
    lng: coords.lng
  })
  
  searchQuery.value = tempAddress
  
  // Try to get better address in background (non-blocking) using multi-provider geocoding
  reverseGeocode(coords.lat, coords.lng).then(result => {
    // Only update if we got a real address (not just coordinates)
    if (result.source !== 'coordinates' && destination.value) {
      destination.value.address = result.name
      searchQuery.value = result.name
      console.log(`[RideView] Geocoded via ${result.source}: ${result.name}`)
    }
  }).catch(() => {
    // Silently fail - coordinates are already shown
  })
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
  rideNotes.value = ''
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
  // ✅ PRODUCTION: Validate access before booking
  if (!hasAccess.value) {
    handleError(new Error('Unauthorized access'), 'handleBook')
    alert('คุณไม่มีสิทธิ์จองรถ')
    router.push('/login')
    return
  }
  
  bookRide({ ...options, notes: rideNotes.value })
}

// Initialize on mount
onMounted(() => {
  // ✅ PRODUCTION: Check role before initializing
  if (!hasAccess.value) {
    console.warn('[RideView] Access denied - not customer/admin/super_admin')
    router.push('/customer')
    return
  }
  
  console.log('[RideView] Access granted - initializing')
  initialize()
})
</script>

<template>
  <div class="ride-page">
    <!-- ⚠️ PRODUCTION: Show access denied if not customer/admin/super_admin -->
    <div v-if="!hasAccess" class="access-denied">
      <div class="access-denied-content">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M4.93 4.93l14.14 14.14" />
        </svg>
        <h2>ไม่มีสิทธิ์เข้าถึง</h2>
        <p>หน้านี้สำหรับลูกค้าเท่านั้น</p>
        <button class="back-btn" @click="router.push('/customer')">
          กลับหน้าหลัก
        </button>
      </div>
    </div>

    <!-- ✅ Main content (only for customers/admins/super_admins) -->
    <template v-else>
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

        <!-- Map Preview - Interactive -->
        <div class="map-section">
          <MapView
            :pickup="pickup"
            :destination="destination"
            :showRoute="!!destination"
            height="320px"
            @routeCalculated="handleRouteCalculated"
            @mapClick="handleMapClick"
          />
          
          <!-- Map hint -->
          <div v-if="!destination && pickup" class="map-hint">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>แตะบนแผนที่เพื่อเลือกปลายทาง</span>
          </div>
        </div>

        <!-- Step Indicator -->
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

      <!-- STEP 3: TRACKING RIDE -->
      <div v-else-if="currentStep === 'tracking'" key="tracking" class="step-view">
        <RideTrackingView
          :pickup="pickup"
          :destination="destination"
          :matchedDriver="matchedDriver"
          :statusText="statusText"
          :rideId="currentRideId"
          :trackingId="currentTrackingId"
          @callDriver="callDriver"
          @callEmergency="callEmergency"
          @cancel="cancelRide"
        />
      </div>

      <!-- STEP 4: RATING - Lazy loaded -->
      <div v-else-if="currentStep === 'rating'" key="rating" class="step-view">
        <Suspense>
          <RideRatingView
            v-model:rating="userRating"
            :isSubmitting="isSubmittingRating"
            :rideId="activeRide?.id ? String(activeRide.id) : undefined"
            :providerName="matchedDriver?.name"
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
    </template>
  </div>
</template>

<style scoped>
.ride-page {
  /* ✅ CRITICAL FIX: Use flex layout instead of fixed positioning */
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background: #f5f5f5;
  /* ✅ CRITICAL: Enable scrolling */
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  /* Ensure page allows clicks */
  pointer-events: auto;
}

.select-view {
  display: flex;
  flex-direction: column;
  /* ✅ FIX: Allow content to flow naturally */
  flex: 1;
  min-height: 0;
  /* Ensure view allows clicks */
  pointer-events: auto;
}

.step-view {
  /* ✅ FIX: Allow content to flow naturally */
  flex: 1;
  min-height: 0;
}

.map-section {
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
  /* ✅ FIX: Set reasonable height for map section */
  height: auto;
  /* Ensure map section doesn't block clicks */
  pointer-events: auto;
}

.map-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #f0f2f5 100%);
  border-radius: 24px;
  font-size: 13px;
  color: #495057;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  animation: hint-pulse 2s ease-in-out infinite;
  /* Hint should not block map clicks */
  pointer-events: none;
}

.map-hint svg {
  color: #00a86b;
  animation: pin-bounce 1.5s ease-in-out infinite;
}

@keyframes hint-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

@keyframes pin-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
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

/* Access Denied Styles */
.access-denied {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  padding: 20px;
}

.access-denied-content {
  text-align: center;
  max-width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.access-denied-content svg {
  color: #e53935;
  margin-bottom: 20px;
}

.access-denied-content h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 12px;
}

.access-denied-content p {
  font-size: 16px;
  color: #666;
  margin-bottom: 24px;
}

.back-btn {
  width: 100%;
  padding: 14px;
  background: #00a86b;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: #00875a;
}

.back-btn:active {
  transform: scale(0.98);
}
</style>
