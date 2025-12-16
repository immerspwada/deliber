<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useLocation } from '../../composables/useLocation'
import { useProvider } from '../../composables/useProvider'
import ProviderLayout from '../../components/ProviderLayout.vue'
import ActiveRideView from '../../components/provider/ActiveRideView.vue'
import RideRequestCard from '../../components/provider/RideRequestCard.vue'
import ChatModal from '../../components/ChatModal.vue'
import VoiceCallModal from '../../components/VoiceCallModal.vue'
import PassengerRatingModal from '../../components/provider/PassengerRatingModal.vue'
import LocationPermissionModal from '../../components/LocationPermissionModal.vue'

const { getCurrentPosition, currentLocation, shouldShowPermissionModal } = useLocation()
const {
  loading,
  profile,
  isOnline,
  pendingRequests,
  activeRide,
  earnings,
  hasActiveRide,
  fetchProfile,
  toggleOnline,
  acceptRide,
  declineRide,
  updateRideStatus,
  cancelActiveRide,
  fetchEarnings
} = useProvider()

// Local state
const isLoadingLocation = ref(false)
const showChatModal = ref(false)
const showVoiceCallModal = ref(false)
const showRatingModal = ref(false)
const showLocationPermission = ref(false)
const completedRideInfo = ref<{ passengerName: string; fare: number; rideId: string } | null>(null)
const isInitialized = ref(false)
let demoRequestInterval: number | null = null

// Check if demo mode
const isDemoMode = computed(() => localStorage.getItem('demo_mode') === 'true')

// Demo locations in Bangkok
const demoLocations = [
  { name: 'สยามพารากอน', lat: 13.7466, lng: 100.5347 },
  { name: 'เซ็นทรัลเวิลด์', lat: 13.7468, lng: 100.5392 },
  { name: 'MBK Center', lat: 13.7444, lng: 100.5300 },
  { name: 'Terminal 21', lat: 13.7377, lng: 100.5603 },
  { name: 'เอ็มควอเทียร์', lat: 13.7314, lng: 100.5697 },
  { name: 'อโศก BTS', lat: 13.7367, lng: 100.5600 },
  { name: 'สีลม', lat: 13.7280, lng: 100.5340 },
  { name: 'สาทร', lat: 13.7210, lng: 100.5290 },
  { name: 'ลาดพร้าว', lat: 13.8060, lng: 100.5610 },
  { name: 'รัชดา', lat: 13.7580, lng: 100.5740 }
]

const demoPassengers = [
  'คุณสมชาย', 'คุณสมหญิง', 'คุณวิชัย', 'คุณนภา', 'คุณธนา',
  'คุณปิยะ', 'คุณมานี', 'คุณสุดา', 'คุณอนันต์', 'คุณพิมพ์'
]

// Generate demo ride request
const generateDemoRequest = () => {
  const pickupIdx = Math.floor(Math.random() * demoLocations.length)
  const pickup = demoLocations[pickupIdx]!
  let destIdx = Math.floor(Math.random() * demoLocations.length)
  while (destIdx === pickupIdx) {
    destIdx = Math.floor(Math.random() * demoLocations.length)
  }
  const destination = demoLocations[destIdx]!
  
  const distance = Math.round((Math.random() * 8 + 2) * 10) / 10
  const baseFare = 35
  const perKm = 6.5
  const fare = Math.round(baseFare + (distance * perKm))
  const rideType: 'standard' | 'premium' | 'shared' = Math.random() > 0.8 ? 'premium' : 'standard'
  
  return {
    id: `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: `demo-user-${Math.random().toString(36).substr(2, 9)}`,
    pickup_lat: pickup.lat + (Math.random() - 0.5) * 0.01,
    pickup_lng: pickup.lng + (Math.random() - 0.5) * 0.01,
    pickup_address: pickup.name,
    destination_lat: destination.lat + (Math.random() - 0.5) * 0.01,
    destination_lng: destination.lng + (Math.random() - 0.5) * 0.01,
    destination_address: destination.name,
    ride_type: rideType,
    estimated_fare: fare,
    status: 'pending',
    created_at: new Date().toISOString(),
    distance,
    duration: Math.ceil(distance * 3),
    passenger_name: demoPassengers[Math.floor(Math.random() * demoPassengers.length)] || 'ผู้โดยสาร',
    passenger_phone: `08${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
    passenger_rating: Math.round((4 + Math.random()) * 10) / 10
  }
}

// Start demo request simulation
const startDemoSimulation = () => {
  if (!isDemoMode.value) return
  
  // Add initial request after 2 seconds
  setTimeout(() => {
    if (isOnline.value && pendingRequests.value.length < 3) {
      const request = generateDemoRequest()
      pendingRequests.value.unshift(request)
      notifyNewRequest()
    }
  }, 2000)
  
  // Add new requests periodically
  demoRequestInterval = window.setInterval(() => {
    if (isOnline.value && !hasActiveRide() && pendingRequests.value.length < 3) {
      const request = generateDemoRequest()
      pendingRequests.value.unshift(request)
      notifyNewRequest()
    }
  }, 15000 + Math.random() * 15000) // 15-30 seconds
}

// Stop demo simulation
const stopDemoSimulation = () => {
  if (demoRequestInterval) {
    clearInterval(demoRequestInterval)
    demoRequestInterval = null
  }
}

// Notify new request with sound and vibration
const notifyNewRequest = () => {
  // Vibrate if supported
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200])
  }
  
  // Play sound (optional - would need audio file)
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQAA')
    audio.volume = 0.3
    audio.play().catch(() => {})
  } catch {}
}

// Watch online status for demo mode
watch(isOnline, (online) => {
  if (isDemoMode.value) {
    if (online) {
      startDemoSimulation()
    } else {
      stopDemoSimulation()
    }
  }
})

// Toggle online status
const handleToggleOnline = async () => {
  if (!isOnline.value) {
    // Check if we should show permission modal first
    const shouldShow = await shouldShowPermissionModal()
    if (shouldShow) {
      showLocationPermission.value = true
      return
    }
    await executeGoOnline()
  } else {
    await toggleOnline(false)
  }
}

// Execute go online with GPS
const executeGoOnline = async () => {
  isLoadingLocation.value = true
  try {
    const pos = await getCurrentPosition()
    await toggleOnline(true, pos ? { lat: pos.lat, lng: pos.lng } : undefined)
  } catch (e) {
    console.warn('GPS error:', e)
    // For demo, allow without GPS
    if (isDemoMode.value) {
      await toggleOnline(true, { lat: 13.7563, lng: 100.5018 })
    } else {
      globalThis.alert('กรุณาเปิด GPS เพื่อรับงาน')
    }
  } finally {
    isLoadingLocation.value = false
  }
}

// Handle location permission responses
const handleLocationPermissionAllow = async () => {
  showLocationPermission.value = false
  await executeGoOnline()
}

const handleLocationPermissionDeny = () => {
  showLocationPermission.value = false
}

// Open navigation app
const openNavigation = (lat: number, lng: number) => {
  // Try Google Maps first, then Apple Maps
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
  const appleMapsUrl = `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
  
  // Check if iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  
  if (isIOS) {
    window.open(appleMapsUrl, '_blank')
  } else {
    window.open(googleMapsUrl, '_blank')
  }
}

// Handle navigation from ActiveRideView
const handleNavigate = () => {
  if (!activeRide.value) return
  
  // Navigate to pickup or destination based on status
  const showPickup = ['matched', 'arriving', 'arrived'].includes(activeRide.value.status)
  if (showPickup) {
    openNavigation(activeRide.value.pickup.lat, activeRide.value.pickup.lng)
  } else {
    openNavigation(activeRide.value.destination.lat, activeRide.value.destination.lng)
  }
}

// Handle ride status update with rating modal
const handleUpdateStatus = async (status: 'matched' | 'arriving' | 'arrived' | 'picked_up' | 'in_progress' | 'completed') => {
  // Save ride info before completing
  if (status === 'completed' && activeRide.value) {
    completedRideInfo.value = {
      passengerName: activeRide.value.passenger.name,
      fare: activeRide.value.fare,
      rideId: activeRide.value.id
    }
  }
  
  await updateRideStatus(status)
  
  // Show rating modal after completion
  if (status === 'completed') {
    setTimeout(() => {
      showRatingModal.value = true
    }, 500)
  }
}

// Handle rating submission
const handleRatingSubmit = (rating: number, comment: string) => {
  console.log('Rating submitted:', { rating, comment, rideId: completedRideInfo.value?.rideId })
  // In real app, save to database
  showRatingModal.value = false
  completedRideInfo.value = null
}

// Handle rating modal close
const handleRatingClose = () => {
  showRatingModal.value = false
  completedRideInfo.value = null
}

// Initialize
onMounted(async () => {
  // Always await fetchProfile to ensure profile is ready before toggle
  await fetchProfile()
  fetchEarnings() // Can run in background
  isInitialized.value = true
  
  // Start demo simulation if already online (restored from localStorage)
  if (isDemoMode.value && isOnline.value) {
    startDemoSimulation()
  }
})

// Cleanup
onUnmounted(() => {
  stopDemoSimulation()
})
</script>

<template>
  <ProviderLayout>
    <div class="dashboard-page">
      <!-- Loading State -->
      <div v-if="!isInitialized" class="loading-state">
        <div class="loading-spinner"></div>
        <p>กำลังโหลด...</p>
      </div>

      <!-- Active Ride View -->
      <ActiveRideView
        v-else-if="hasActiveRide && activeRide"
        :ride="activeRide"
        :current-location="currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : undefined"
        @update-status="handleUpdateStatus"
        @call="showVoiceCallModal = true"
        @chat="showChatModal = true"
        @cancel="cancelActiveRide"
        @navigate="handleNavigate"
      />

      <!-- Normal Dashboard -->
      <div v-else class="dashboard-content">
        <!-- Status Toggle Card -->
        <div class="status-card" :class="{ online: isOnline }">
          <div class="status-info">
            <div class="status-indicator" :class="{ active: isOnline }"></div>
            <div>
              <h3 class="status-label">{{ isOnline ? 'ออนไลน์' : 'ออฟไลน์' }}</h3>
              <p class="status-text">{{ isOnline ? 'พร้อมรับงาน' : 'เปิดเพื่อเริ่มรับงาน' }}</p>
            </div>
          </div>
          <button
            @click="handleToggleOnline"
            :disabled="isLoadingLocation || loading"
            :class="['toggle-btn', { active: isOnline }]"
          >
            <span v-if="isLoadingLocation || loading" class="toggle-loading"></span>
            <span v-else class="toggle-knob"></span>
          </button>
        </div>

        <!-- Quick Stats -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">฿{{ earnings.today.toLocaleString() }}</span>
              <span class="stat-label">รายได้วันนี้</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ earnings.todayTrips }}</span>
              <span class="stat-label">เที่ยววันนี้</span>
            </div>
          </div>
        </div>

        <!-- Rating Badge -->
        <div class="rating-card">
          <div class="rating-info">
            <svg class="star-icon" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span class="rating-value">{{ profile?.rating || 4.8 }}</span>
          </div>
          <span class="rating-label">คะแนนเฉลี่ย</span>
        </div>

        <!-- Pending Requests Section -->
        <div class="requests-section">
          <h2 class="section-title">
            งานที่รอรับ
            <span v-if="pendingRequests.length > 0" class="count-badge">{{ pendingRequests.length }}</span>
          </h2>

          <!-- Offline State -->
          <div v-if="!isOnline" class="offline-card">
            <div class="offline-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
              </svg>
            </div>
            <h3>คุณออฟไลน์อยู่</h3>
            <p>เปิดสถานะออนไลน์เพื่อเริ่มรับงาน</p>
          </div>

          <!-- Empty State -->
          <div v-else-if="pendingRequests.length === 0" class="empty-state">
            <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <p>ยังไม่มีงานในขณะนี้</p>
            <span>รอสักครู่...</span>
          </div>

          <!-- Requests List -->
          <div v-else class="requests-list">
            <RideRequestCard
              v-for="request in pendingRequests"
              :key="request.id"
              :request="request"
              :auto-decline-seconds="30"
              @accept="acceptRide(request.id)"
              @decline="declineRide(request.id)"
            />
          </div>
        </div>
      </div>

      <!-- Modals -->
      <ChatModal
        v-if="activeRide"
        :ride-id="activeRide.id"
        :driver-name="activeRide.passenger.name"
        :show="showChatModal"
        @close="showChatModal = false"
      />

      <VoiceCallModal
        v-if="activeRide"
        :show="showVoiceCallModal"
        :driver-name="activeRide.passenger.name"
        :driver-phone="activeRide.passenger.phone"
        :ride-id="activeRide.id"
        @close="showVoiceCallModal = false"
        @end="showVoiceCallModal = false"
      />

      <!-- Passenger Rating Modal -->
      <PassengerRatingModal
        v-if="completedRideInfo"
        :show="showRatingModal"
        :passenger-name="completedRideInfo.passengerName"
        :fare="completedRideInfo.fare"
        :ride-id="completedRideInfo.rideId"
        @close="handleRatingClose"
        @submit="handleRatingSubmit"
      />

      <!-- Location Permission Modal -->
      <LocationPermissionModal
        :show="showLocationPermission"
        @allow="handleLocationPermissionAllow"
        @deny="handleLocationPermissionDeny"
      />
    </div>
  </ProviderLayout>
</template>

<style scoped>
.dashboard-page {
  min-height: 100vh;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #000000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  font-size: 14px;
  color: #6B6B6B;
}

.dashboard-content {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
}

/* Status Card */
.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background-color: #FFFFFF;
  border-radius: 16px;
  margin-bottom: 16px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.status-card.online {
  border-color: #000000;
  background-color: rgba(0, 0, 0, 0.02);
}

.status-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  background-color: #CCC;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.status-indicator.active {
  background-color: #22C55E;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.2);
}

.status-label {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 2px;
}

.status-text {
  font-size: 13px;
  color: #6B6B6B;
}

.toggle-btn {
  width: 56px;
  height: 32px;
  background-color: #E5E5E5;
  border: none;
  border-radius: 16px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.toggle-btn.active {
  background-color: #000000;
}

.toggle-knob {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-btn.active .toggle-knob {
  transform: translateX(24px);
}

.toggle-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: #FFFFFF;
  border-radius: 12px;
}

.stat-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F6F6F6;
  border-radius: 10px;
}

.stat-icon svg {
  width: 22px;
  height: 22px;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
}

.stat-label {
  font-size: 12px;
  color: #6B6B6B;
}

/* Rating Card */
.rating-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background-color: #FFFFFF;
  border-radius: 12px;
  margin-bottom: 24px;
}

.rating-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.star-icon {
  width: 24px;
  height: 24px;
  color: #F59E0B;
}

.rating-value {
  font-size: 24px;
  font-weight: 700;
}

.rating-label {
  font-size: 14px;
  color: #6B6B6B;
}

/* Requests Section */
.requests-section {
  margin-top: 8px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.count-badge {
  padding: 2px 10px;
  background-color: #E11900;
  color: white;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
}

/* Offline Card */
.offline-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  background-color: #FFFFFF;
  border-radius: 16px;
  text-align: center;
}

.offline-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F6F6F6;
  border-radius: 50%;
  margin-bottom: 16px;
}

.offline-icon svg {
  width: 32px;
  height: 32px;
  color: #6B6B6B;
}

.offline-card h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.offline-card p {
  font-size: 14px;
  color: #6B6B6B;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  background-color: #FFFFFF;
  border-radius: 16px;
  text-align: center;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: #CCC;
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.empty-state span {
  font-size: 14px;
  color: #6B6B6B;
}

/* Requests List */
.requests-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
