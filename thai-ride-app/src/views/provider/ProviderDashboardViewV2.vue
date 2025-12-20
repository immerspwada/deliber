<script setup lang="ts">
/**
 * ProviderDashboardViewV2 - Enhanced Provider Dashboard
 * Feature: F14 - Provider Dashboard (50-Session Stability)
 * 
 * Key Features:
 * 1. URL State Sync - tab, sort, search reflected in URL
 * 2. Memory Safe - Auto cleanup all subscriptions
 * 3. Optimistic UI - Instant feedback on actions
 * 4. Retry Logic - Exponential backoff for failures
 * 5. Clean State - Reset after submissions
 * 6. Pull-to-Refresh - Mobile UX enhancement
 * 7. Skeleton Loading - Better perceived performance
 * 8. Sound Notifications - Audio feedback for new requests
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useLocation } from '../../composables/useLocation'
import { useProviderDashboard, type TabType, type PendingRequest } from '../../composables/useProviderDashboard'
import { useSoundNotification } from '../../composables/useSoundNotification'
import ProviderLayout from '../../components/ProviderLayout.vue'
import LocationPermissionModal from '../../components/LocationPermissionModal.vue'
import ProviderSkeleton from '../../components/provider/ProviderSkeleton.vue'
import EarningsChart from '../../components/provider/EarningsChart.vue'

const router = useRouter()
const { getCurrentPosition, shouldShowPermissionModal } = useLocation()
const soundNotification = useSoundNotification()

// Preload sounds on mount
onMounted(() => {
  soundNotification.preloadSounds?.()
})

const {
  loading,
  error,
  isInitialized,
  networkStatus,
  profile,
  isOnline,
  activeJob,
  earnings,
  currentTab,
  currentSort,
  searchQuery,
  filteredRequests,
  requestCounts,
  hasActiveJob,
  isDemoMode,
  initialize,
  toggleOnline,
  acceptRequest,
  declineRequest,
  updateJobStatus,
  cancelActiveJob,
  fetchAllPendingRequests,
  fetchEarnings
} = useProviderDashboard()

// Local UI state
const isLoadingLocation = ref(false)
const showLocationPermission = ref(false)
const showSearch = ref(false)
const localSearchQuery = ref('')
const isRefreshing = ref(false)
const pullDistance = ref(0)
const isPulling = ref(false)
const startY = ref(0)

// Debounced search
let searchTimeout: number | null = null
watch(localSearchQuery, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = window.setTimeout(() => {
    searchQuery.value = val
  }, 300)
})

// Watch for new requests and play sound
const previousRequestCount = ref(0)
watch(() => filteredRequests.value.length, (newCount, oldCount) => {
  if (newCount > oldCount && oldCount > 0) {
    // New request arrived
    soundNotification.notify?.('new_request', true)
  }
  previousRequestCount.value = newCount
})

// Pull-to-Refresh handlers
const handleTouchStart = (e: TouchEvent) => {
  if (isRefreshing.value || !isOnline.value) return
  const touch = e.touches[0]
  if (touch && window.scrollY <= 0) {
    startY.value = touch.clientY
    isPulling.value = true
  }
}

const handleTouchMove = (e: TouchEvent) => {
  if (!isPulling.value || isRefreshing.value) return
  const touch = e.touches[0]
  if (!touch) return
  
  const diff = touch.clientY - startY.value
  if (diff > 0) {
    pullDistance.value = Math.min(diff * 0.5, 100)
    if (pullDistance.value > 10) {
      e.preventDefault()
    }
  }
}

const handleTouchEnd = async () => {
  if (!isPulling.value) return
  isPulling.value = false
  
  if (pullDistance.value >= 60) {
    isRefreshing.value = true
    soundNotification.playSound?.('status_change')
    
    // Refresh data
    await fetchAllPendingRequests()
    await fetchEarnings()
    
    isRefreshing.value = false
  }
  
  pullDistance.value = 0
}



// Tab definitions
const tabs: { key: TabType; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'ride', label: 'เรียกรถ' },
  { key: 'delivery', label: 'ส่งของ' },
  { key: 'shopping', label: 'ซื้อของ' }
]

// Toggle online with location check
const handleToggleOnline = async () => {
  if (!isOnline.value) {
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

const executeGoOnline = async () => {
  isLoadingLocation.value = true
  try {
    const pos = await getCurrentPosition()
    await toggleOnline(true, pos ? { lat: pos.lat, lng: pos.lng } : undefined)
  } catch (e) {
    console.warn('GPS error:', e)
    if (isDemoMode.value) {
      await toggleOnline(true, { lat: 13.7563, lng: 100.5018 })
    } else {
      globalThis.alert('กรุณาเปิด GPS เพื่อรับงาน')
    }
  } finally {
    isLoadingLocation.value = false
  }
}

const handleLocationPermissionAllow = async () => {
  showLocationPermission.value = false
  await executeGoOnline()
}

const handleLocationPermissionDeny = () => {
  showLocationPermission.value = false
}

// Accept request with loading state and haptic feedback
const handleAccept = async (request: PendingRequest) => {
  soundNotification.haptic?.('medium') // Immediate haptic feedback
  const result = await acceptRequest(request.id, request.type)
  if (result.success) {
    soundNotification.playAccept?.()
  } else if (result.error) {
    soundNotification.playSound?.('error')
    globalThis.alert(result.error)
  }
}

// Decline with haptic feedback
const handleDecline = (requestId: string) => {
  soundNotification.haptic?.('light')
  soundNotification.playDecline?.()
  declineRequest(requestId)
}

// Status progression for active job
const statusFlow: Record<string, string[]> = {
  ride: ['matched', 'arriving', 'arrived', 'picked_up', 'in_progress', 'completed'],
  delivery: ['matched', 'pickup', 'in_transit', 'delivered'],
  shopping: ['matched', 'shopping', 'delivering', 'completed']
}

const getNextStatus = computed(() => {
  if (!activeJob.value) return null
  const flow = statusFlow[activeJob.value.type] || statusFlow.ride
  const currentIndex = flow.indexOf(activeJob.value.status)
  return currentIndex < flow.length - 1 ? flow[currentIndex + 1] : null
})

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    matched: 'กำลังไปรับ',
    arriving: 'ใกล้ถึงแล้ว',
    arrived: 'ถึงจุดรับแล้ว',
    picked_up: 'รับผู้โดยสารแล้ว',
    in_progress: 'กำลังเดินทาง',
    completed: 'เสร็จสิ้น',
    pickup: 'รับพัสดุแล้ว',
    in_transit: 'กำลังส่ง',
    delivered: 'ส่งแล้ว',
    shopping: 'กำลังซื้อของ',
    delivering: 'กำลังส่งของ'
  }
  return labels[status] || status
}

const getNextStatusLabel = computed(() => {
  if (!getNextStatus.value) return 'เสร็จสิ้น'
  const labels: Record<string, string> = {
    arriving: 'ใกล้ถึงแล้ว',
    arrived: 'ถึงจุดรับ',
    picked_up: 'รับผู้โดยสาร',
    in_progress: 'เริ่มเดินทาง',
    completed: 'จบงาน',
    pickup: 'รับพัสดุ',
    in_transit: 'เริ่มส่ง',
    delivered: 'ส่งแล้ว',
    shopping: 'เริ่มซื้อของ',
    delivering: 'เริ่มส่งของ'
  }
  return labels[getNextStatus.value] || 'ถัดไป'
})

const handleNextStatus = async () => {
  if (!getNextStatus.value) return
  const result = await updateJobStatus(getNextStatus.value)
  if (!result.success && result.error) {
    globalThis.alert(result.error)
  }
}

// Initialize on mount
onMounted(async () => {
  await initialize()
})
</script>

<template>
  <ProviderLayout>
    <div 
      class="dashboard-page"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- Pull-to-Refresh Indicator -->
      <div 
        v-if="isOnline && !hasActiveJob" 
        class="pull-indicator" 
        :class="{ visible: pullDistance > 0, refreshing: isRefreshing }"
        :style="{ transform: `translateY(${pullDistance - 60}px)`, opacity: Math.min(pullDistance / 60, 1) }"
      >
        <div class="pull-content">
          <div class="pull-spinner" :class="{ spinning: isRefreshing }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          </div>
          <span>{{ isRefreshing ? 'กำลังโหลด...' : pullDistance >= 60 ? 'ปล่อยเพื่อรีเฟรช' : 'ดึงลงเพื่อรีเฟรช' }}</span>
        </div>
      </div>

      <!-- Skeleton Loading State -->
      <div v-if="!isInitialized" class="skeleton-wrapper">
        <ProviderSkeleton type="dashboard" />
      </div>

      <!-- Active Job View -->
      <div v-else-if="hasActiveJob && activeJob" class="active-job-view">
        <div class="job-header">
          <span class="job-type-badge" :class="activeJob.type">
            {{ activeJob.type === 'ride' ? 'เรียกรถ' : activeJob.type === 'delivery' ? 'ส่งของ' : 'ซื้อของ' }}
          </span>
          <span class="job-tracking">{{ activeJob.tracking_id }}</span>
        </div>

        <div class="job-status-card">
          <div class="status-indicator" :class="activeJob.status"></div>
          <span class="status-text">{{ getStatusLabel(activeJob.status) }}</span>
        </div>

        <div class="customer-card">
          <div class="customer-avatar">{{ activeJob.customer.name[0] }}</div>
          <div class="customer-info">
            <span class="customer-name">{{ activeJob.customer.name }}</span>
            <span class="customer-phone">{{ activeJob.customer.phone }}</span>
          </div>
          <a :href="`tel:${activeJob.customer.phone}`" class="call-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
          </a>
        </div>

        <div class="route-card">
          <div class="route-point pickup">
            <div class="point-dot"></div>
            <div class="point-info">
              <span class="point-label">รับ</span>
              <span class="point-address">{{ activeJob.pickup.address }}</span>
            </div>
          </div>
          <div class="route-line"></div>
          <div class="route-point destination">
            <div class="point-dot"></div>
            <div class="point-info">
              <span class="point-label">ส่ง</span>
              <span class="point-address">{{ activeJob.destination.address }}</span>
            </div>
          </div>
        </div>

        <div class="fare-display">
          <span class="fare-label">ค่าบริการ</span>
          <span class="fare-value">฿{{ activeJob.fare.toLocaleString() }}</span>
        </div>

        <div class="job-actions">
          <button class="cancel-btn" @click="cancelActiveJob('provider_cancel')">ยกเลิก</button>
          <button 
            v-if="getNextStatus" 
            class="next-btn" 
            @click="handleNextStatus"
            :disabled="loading"
          >
            {{ getNextStatusLabel }}
          </button>
        </div>
      </div>


      <!-- Normal Dashboard -->
      <div v-else class="dashboard-content">
        <!-- Network Status Banner -->
        <div v-if="networkStatus === 'reconnecting'" class="network-banner">
          <div class="network-spinner"></div>
          <span>กำลังเชื่อมต่อใหม่...</span>
        </div>

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
            <div class="stat-icon earnings-icon">
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
            <div class="stat-icon trips-icon">
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

        <!-- Scheduled Rides Shortcut -->
        <button class="scheduled-rides-btn" @click="router.push('/provider/scheduled-rides')">
          <div class="scheduled-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="scheduled-info">
            <span class="scheduled-title">งานจองล่วงหน้า</span>
            <span class="scheduled-desc">ดูงานที่ลูกค้าจองไว้</span>
          </div>
          <svg class="arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>

        <!-- Earnings Chart -->
        <EarningsChart 
          :today-earnings="earnings.today"
          :week-total="earnings.thisWeek"
          :is-loading="loading"
          @refresh="fetchEarnings"
        />

        <!-- Requests Section -->
        <div class="requests-section">
          <div class="section-header">
            <h2 class="section-title">
              งานที่รอรับ
              <span v-if="requestCounts.all > 0" class="count-badge">{{ requestCounts.all }}</span>
            </h2>
            <button v-if="isOnline" class="search-toggle" @click="showSearch = !showSearch">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </button>
          </div>

          <!-- Search Bar -->
          <div v-if="showSearch && isOnline" class="search-bar">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input 
              v-model="localSearchQuery" 
              type="text" 
              placeholder="ค้นหาตามที่อยู่หรือชื่อลูกค้า..."
              class="search-input"
            />
            <button v-if="localSearchQuery" @click="localSearchQuery = ''" class="clear-search">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Tabs -->
          <div v-if="isOnline" class="tabs-row">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              @click="currentTab = tab.key"
              :class="['tab-btn', { active: currentTab === tab.key }]"
            >
              {{ tab.label }}
              <span v-if="requestCounts[tab.key] > 0" class="tab-count">{{ requestCounts[tab.key] }}</span>
            </button>
          </div>


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
          <div v-else-if="filteredRequests.length === 0" class="empty-state">
            <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <p v-if="searchQuery">ไม่พบงานที่ตรงกับการค้นหา</p>
            <p v-else>ยังไม่มีงานในขณะนี้</p>
            <span>รอสักครู่...</span>
          </div>

          <!-- Requests List -->
          <div v-else class="requests-list">
            <div 
              v-for="request in filteredRequests" 
              :key="request.id" 
              class="request-card"
              :class="{ accepting: request._accepting }"
            >
              <div class="request-header">
                <span class="request-type" :class="request.type">
                  {{ request.type === 'ride' ? 'เรียกรถ' : request.type === 'delivery' ? 'ส่งของ' : 'ซื้อของ' }}
                </span>
                <span class="request-fare">฿{{ request.estimated_fare.toLocaleString() }}</span>
              </div>

              <div class="customer-row">
                <div class="customer-avatar">{{ (request.customer_name || 'U')[0] }}</div>
                <div class="customer-details">
                  <span class="customer-name">{{ request.customer_name || 'ลูกค้า' }}</span>
                  <span v-if="request.customer_rating" class="customer-rating">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    {{ request.customer_rating.toFixed(1) }}
                  </span>
                </div>
              </div>

              <div class="route-mini">
                <div class="route-point-mini pickup">
                  <div class="dot-mini"></div>
                  <span>{{ request.pickup_address }}</span>
                </div>
                <div class="route-point-mini destination">
                  <div class="dot-mini"></div>
                  <span>{{ request.destination_address }}</span>
                </div>
              </div>

              <div v-if="request.distance" class="distance-info">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
                {{ request.distance.toFixed(1) }} กม.
              </div>

              <div class="request-actions">
                <button class="decline-btn" @click="handleDecline(request.id)" :disabled="request._accepting">
                  ปฏิเสธ
                </button>
                <button class="accept-btn" @click="handleAccept(request)" :disabled="request._accepting">
                  <span v-if="request._accepting" class="btn-loading"></span>
                  <span v-else>รับงาน</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
  position: relative;
  overflow-x: hidden;
}

/* Pull-to-Refresh */
.pull-indicator {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%) translateY(-60px);
  z-index: 50;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.pull-indicator.visible { opacity: 1; }

.pull-content {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  background: #FFFFFF;
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.pull-spinner {
  width: 20px;
  height: 20px;
  color: #00A86B;
  transition: transform 0.1s ease;
}

.pull-spinner.spinning {
  animation: spin 1s linear infinite;
}

.pull-spinner svg {
  width: 100%;
  height: 100%;
}

.pull-content span {
  font-size: 13px;
  font-weight: 500;
  color: #666666;
  white-space: nowrap;
}

.skeleton-wrapper {
  padding-top: 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
}

.loading-spinner, .network-spinner, .toggle-loading, .btn-loading {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.network-spinner { width: 16px; height: 16px; border-width: 2px; }
.toggle-loading { width: 16px; height: 16px; border-width: 2px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
.btn-loading { width: 16px; height: 16px; border-width: 2px; border-color: white; border-top-color: transparent; }

@keyframes spin { to { transform: rotate(360deg); } }

.loading-state p { font-size: 14px; color: #6B6B6B; }

.dashboard-content {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
}

/* Network Banner */
.network-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: #FEF3C7;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #92400E;
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
  border-color: #00A86B;
  background-color: rgba(0, 168, 107, 0.05);
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

.status-label { font-size: 16px; font-weight: 600; margin-bottom: 2px; }
.status-text { font-size: 13px; color: #6B6B6B; }

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

.toggle-btn.active { background-color: #00A86B; }

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

.toggle-btn.active .toggle-knob { transform: translateX(24px); }


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
  border-radius: 10px;
}

.stat-icon svg { width: 22px; height: 22px; }
.earnings-icon { background-color: #E8F5EF; color: #00A86B; }
.trips-icon { background-color: #F0F0F0; color: #1A1A1A; }

.stat-content { display: flex; flex-direction: column; }
.stat-value { font-size: 20px; font-weight: 700; }
.stat-label { font-size: 12px; color: #6B6B6B; }

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

.rating-info { display: flex; align-items: center; gap: 8px; }
.star-icon { width: 24px; height: 24px; color: #F59E0B; }
.rating-value { font-size: 24px; font-weight: 700; }
.rating-label { font-size: 14px; color: #6B6B6B; }

/* Scheduled Rides Button */
.scheduled-rides-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px;
  background: #E8F5EF;
  border: none;
  border-radius: 12px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: background 0.2s;
}
.scheduled-rides-btn:hover { background: #D0EBE0; }
.scheduled-icon {
  width: 44px;
  height: 44px;
  background: #00A86B;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.scheduled-icon svg { width: 22px; height: 22px; color: #fff; }
.scheduled-info { flex: 1; text-align: left; }
.scheduled-title { display: block; font-size: 15px; font-weight: 600; color: #1A1A1A; }
.scheduled-desc { display: block; font-size: 12px; color: #6B6B6B; }
.scheduled-rides-btn .arrow-icon { width: 20px; height: 20px; color: #00A86B; }

/* Requests Section */
.requests-section { margin-top: 8px; }

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
}

.count-badge {
  padding: 2px 10px;
  background-color: #E11900;
  color: white;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
}

.search-toggle {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  color: #6B6B6B;
}

/* Search Bar */
.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #FFFFFF;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  margin-bottom: 16px;
}

.search-bar:focus-within { border-color: #00A86B; }
.search-bar svg { color: #999999; flex-shrink: 0; }

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  background: transparent;
}

.clear-search {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F0F0F0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: #6B6B6B;
}

/* Tabs */
.tabs-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #F5F5F5;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #6B6B6B;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab-btn.active {
  background: #00A86B;
  color: white;
}

.tab-count {
  padding: 1px 6px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  font-size: 11px;
}

.tab-btn.active .tab-count { background: rgba(255, 255, 255, 0.3); }


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

.offline-icon svg { width: 32px; height: 32px; color: #6B6B6B; }
.offline-card h3 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.offline-card p { font-size: 14px; color: #6B6B6B; }

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

.empty-icon { width: 48px; height: 48px; color: #CCC; margin-bottom: 12px; }
.empty-state p { font-size: 16px; font-weight: 500; margin-bottom: 4px; }
.empty-state span { font-size: 14px; color: #6B6B6B; }

/* Request Card */
.requests-list { display: flex; flex-direction: column; gap: 16px; }

.request-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 16px;
  transition: all 0.2s;
}

.request-card.accepting { opacity: 0.7; pointer-events: none; }

.request-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.request-type {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.request-type.ride { background: #E8F5EF; color: #00A86B; }
.request-type.delivery { background: #FEF3C7; color: #D97706; }
.request-type.shopping { background: #EDE9FE; color: #7C3AED; }

.request-fare { font-size: 18px; font-weight: 700; color: #00A86B; }

.customer-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.customer-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F6F6F6;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 600;
}

.customer-details { flex: 1; }
.customer-name { font-size: 14px; font-weight: 500; display: block; }
.customer-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6B6B6B;
}
.customer-rating svg { color: #F59E0B; }

.route-mini { margin-bottom: 12px; }

.route-point-mini {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 6px 0;
}

.route-point-mini span {
  font-size: 13px;
  color: #1A1A1A;
  line-height: 1.3;
}

.dot-mini {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.route-point-mini.pickup .dot-mini { background: #00A86B; }
.route-point-mini.destination .dot-mini { border: 2px solid #E53935; }

.distance-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6B6B6B;
  margin-bottom: 12px;
}

.request-actions { display: flex; gap: 10px; }

.decline-btn, .accept-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.decline-btn { background: #F5F5F5; color: #6B6B6B; }
.accept-btn { background: #00A86B; color: white; }
.accept-btn:hover { background: #008F5B; }
.accept-btn:disabled, .decline-btn:disabled { opacity: 0.6; cursor: not-allowed; }


/* Active Job View */
.active-job-view {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
}

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.job-type-badge {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}

.job-type-badge.ride { background: #E8F5EF; color: #00A86B; }
.job-type-badge.delivery { background: #FEF3C7; color: #D97706; }
.job-type-badge.shopping { background: #EDE9FE; color: #7C3AED; }

.job-tracking {
  font-size: 12px;
  font-family: monospace;
  color: #6B6B6B;
}

.job-status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #FFFFFF;
  border-radius: 12px;
  margin-bottom: 16px;
}

.job-status-card .status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #00A86B;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.job-status-card .status-text { font-size: 16px; font-weight: 600; }

.customer-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #FFFFFF;
  border-radius: 12px;
  margin-bottom: 16px;
}

.customer-card .customer-avatar {
  width: 48px;
  height: 48px;
  font-size: 18px;
}

.customer-card .customer-info { flex: 1; }
.customer-card .customer-name { font-size: 16px; font-weight: 600; display: block; }
.customer-card .customer-phone { font-size: 13px; color: #6B6B6B; }

.call-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #00A86B;
  color: white;
  border-radius: 50%;
  text-decoration: none;
}

.route-card {
  padding: 16px;
  background: #FFFFFF;
  border-radius: 12px;
  margin-bottom: 16px;
  position: relative;
}

.route-card .route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.route-card .route-point.pickup { margin-bottom: 16px; }

.route-card .point-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.route-card .pickup .point-dot { background: #00A86B; }
.route-card .destination .point-dot { border: 3px solid #E53935; }

.route-card .route-line {
  position: absolute;
  left: 21px;
  top: 32px;
  bottom: 32px;
  width: 2px;
  background: #E5E5E5;
}

.route-card .point-info { flex: 1; }
.route-card .point-label { font-size: 11px; color: #6B6B6B; text-transform: uppercase; display: block; }
.route-card .point-address { font-size: 14px; font-weight: 500; }

.fare-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #E8F5EF;
  border-radius: 12px;
  margin-bottom: 16px;
}

.fare-label { font-size: 14px; color: #00A86B; }
.fare-value { font-size: 24px; font-weight: 700; color: #00A86B; }

.job-actions { display: flex; gap: 12px; }

.cancel-btn, .next-btn {
  flex: 1;
  padding: 16px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.cancel-btn { background: #F5F5F5; color: #6B6B6B; }
.next-btn { background: #00A86B; color: white; }
.next-btn:hover { background: #008F5B; }
.next-btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
