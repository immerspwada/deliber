<script setup lang="ts">
/**
 * Provider Jobs View - Stable Version
 * 
 * Improvements:
 * - Uses unified providerService (single source of truth)
 * - Auto-reconnect for realtime
 * - Better loading/error states
 * - Haptic feedback
 * - Pull-to-refresh ready
 * - Offline indicator
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProviderService } from '../../composables/useProviderService'

// =====================================================
// Setup
// =====================================================
const router = useRouter()
const {
  profile,
  availableJobs,
  currentJob,
  loading,
  error,
  connectionStatus,
  isOnline,
  isVerified,
  jobCount,
  canAcceptJobs,
  toggleOnlineStatus,
  acceptJobWithRedirect,
  refreshJobs,
  clearError,
  formatDistance,
  formatTime,
  formatFare,
  getErrorMessage
} = useProviderService({ autoInitialize: true, redirectOnAccept: true })

// Local UI state
const toggling = ref(false)
const acceptingId = ref<string | null>(null)
const refreshing = ref(false)
const showError = ref(false)

// Auto-refresh interval
let refreshInterval: ReturnType<typeof setInterval> | null = null

// =====================================================
// Computed
// =====================================================
const statusText = computed(() => {
  if (!isVerified.value) return 'รอการอนุมัติ'
  if (currentJob.value) return 'มีงานอยู่'
  if (isOnline.value) return 'พร้อมรับงาน'
  return 'ออฟไลน์'
})

const statusSubtext = computed(() => {
  if (!isVerified.value) return 'บัญชีอยู่ระหว่างการตรวจสอบ'
  if (currentJob.value) return 'กดเพื่อดูรายละเอียดงาน'
  if (isOnline.value && jobCount.value > 0) return `${jobCount.value} งานรอรับ`
  if (isOnline.value) return 'กำลังค้นหางาน...'
  return 'เปิดเพื่อเริ่มรับงาน'
})

const isConnected = computed(() => connectionStatus.value === 'connected')
const isReconnecting = computed(() => connectionStatus.value === 'connecting')

// =====================================================
// Actions
// =====================================================
async function handleToggle(): Promise<void> {
  if (toggling.value || !isVerified.value) return
  
  toggling.value = true
  clearError()
  
  try {
    const success = await toggleOnlineStatus()
    
    if (success) {
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50)
      }
      
      // Start/stop auto-refresh
      if (isOnline.value) {
        startAutoRefresh()
      } else {
        stopAutoRefresh()
      }
    }
  } finally {
    toggling.value = false
  }
}

async function handleAccept(jobId: string): Promise<void> {
  if (acceptingId.value || !canAcceptJobs.value) return
  
  acceptingId.value = jobId
  clearError()
  
  try {
    const success = await acceptJobWithRedirect(jobId)
    
    if (success && 'vibrate' in navigator) {
      navigator.vibrate([50, 50, 100])
    }
  } finally {
    acceptingId.value = null
  }
}

async function handleRefresh(): Promise<void> {
  if (refreshing.value || !isOnline.value) return
  
  refreshing.value = true
  
  try {
    await refreshJobs()
  } finally {
    refreshing.value = false
  }
}

function handleCurrentJobClick(): void {
  if (currentJob.value) {
    router.push(`/provider/job/${currentJob.value.id}`)
  }
}

function startAutoRefresh(): void {
  if (refreshInterval) return
  refreshInterval = setInterval(() => {
    if (isOnline.value && !loading.value) {
      refreshJobs()
    }
  }, 30000)
}

function stopAutoRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

// =====================================================
// Error handling
// =====================================================
function handleDismissError(): void {
  showError.value = false
  clearError()
}

// Watch for errors
import { watch } from 'vue'
watch(error, (newError) => {
  if (newError) {
    showError.value = true
  }
})

// =====================================================
// Lifecycle
// =====================================================
onMounted(() => {
  if (isOnline.value) {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div class="provider-jobs">
    <!-- Loading Overlay -->
    <Transition name="fade">
      <div v-if="loading && !profile" class="loading-overlay">
        <div class="loading-content">
          <div class="spinner"></div>
          <p>กำลังโหลด...</p>
        </div>
      </div>
    </Transition>

    <!-- Error Toast -->
    <Transition name="slide-down">
      <div v-if="showError && error" class="error-toast" @click="handleDismissError">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
        <span>{{ getErrorMessage(error) }}</span>
        <button type="button" aria-label="ปิด">×</button>
      </div>
    </Transition>

    <!-- Connection Status -->
    <Transition name="slide-down">
      <div v-if="isOnline && !isConnected" class="connection-banner" :class="{ reconnecting: isReconnecting }">
        <svg v-if="isReconnecting" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
        </svg>
        <span>{{ isReconnecting ? 'กำลังเชื่อมต่อ...' : 'ขาดการเชื่อมต่อ' }}</span>
      </div>
    </Transition>

    <!-- Status Header -->
    <header class="status-header" :class="{ online: isOnline, 'has-job': currentJob }">
      <div class="status-content">
        <div class="status-info">
          <div class="status-indicator">
            <div class="status-dot" :class="{ active: isOnline, pulse: isOnline && !currentJob }"></div>
          </div>
          <div class="status-text">
            <h1>{{ statusText }}</h1>
            <p>{{ statusSubtext }}</p>
          </div>
        </div>
        
        <!-- Toggle Button -->
        <button 
          v-if="isVerified && !currentJob"
          class="toggle-btn"
          :class="{ active: isOnline }"
          :disabled="toggling"
          @click="handleToggle"
          type="button"
          :aria-label="isOnline ? 'ปิดรับงาน' : 'เปิดรับงาน'"
          :aria-pressed="isOnline"
        >
          <span class="toggle-track">
            <span class="toggle-thumb">
              <svg v-if="toggling" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 2v10M18.4 6.6a9 9 0 1 1-12.8 0"/>
              </svg>
            </span>
          </span>
        </button>
      </div>
    </header>

    <!-- Current Job Banner -->
    <Transition name="slide-down">
      <button 
        v-if="currentJob" 
        class="current-job-banner"
        @click="handleCurrentJobClick"
        type="button"
      >
        <div class="job-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="job-info">
          <span class="job-status">งานปัจจุบัน</span>
          <span class="job-address">{{ currentJob.pickup_address }}</span>
        </div>
        <div class="job-fare">฿{{ currentJob.estimated_fare?.toLocaleString() }}</div>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </Transition>

    <!-- Not Verified Notice -->
    <div v-if="!isVerified" class="notice-card warning">
      <div class="notice-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      </div>
      <div class="notice-text">
        <h3>รอการอนุมัติ</h3>
        <p>บัญชีของคุณอยู่ระหว่างการตรวจสอบ กรุณารอ 1-2 วันทำการ</p>
      </div>
    </div>

    <!-- Offline State -->
    <div v-else-if="!isOnline && !currentJob" class="empty-state">
      <div class="empty-illustration">
        <svg viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="50" stroke="#E5E7EB" stroke-width="2" stroke-dasharray="8 4"/>
          <circle cx="60" cy="60" r="25" fill="#F3F4F6"/>
          <path d="M50 50l20 20M70 50l-20 20" stroke="#9CA3AF" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </div>
      <h2>คุณกำลังออฟไลน์</h2>
      <p>กดปุ่มด้านบนเพื่อเริ่มรับงาน</p>
    </div>

    <!-- Online: No Jobs -->
    <div v-else-if="isOnline && jobCount === 0 && !currentJob" class="empty-state searching">
      <div class="radar-animation">
        <div class="radar-ring"></div>
        <div class="radar-ring delay-1"></div>
        <div class="radar-ring delay-2"></div>
        <div class="radar-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>
      <h2>กำลังค้นหางาน</h2>
      <p>จะแจ้งเตือนเมื่อมีงานใหม่</p>
      
      <button 
        class="refresh-btn"
        :disabled="refreshing"
        @click="handleRefresh"
        type="button"
      >
        <svg :class="{ spin: refreshing }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        <span>{{ refreshing ? 'กำลังรีเฟรช...' : 'รีเฟรช' }}</span>
      </button>
    </div>

    <!-- Job List -->
    <div v-else-if="isOnline && jobCount > 0" class="job-list">
      <TransitionGroup name="list">
        <article 
          v-for="job in availableJobs" 
          :key="job.id" 
          class="job-card"
          :class="{ accepting: acceptingId === job.id }"
        >
          <!-- Fare & Distance -->
          <div class="job-header">
            <span class="fare">{{ formatFare(job.estimated_fare) }}</span>
            <span v-if="job.distance_from_provider" class="distance">
              {{ formatDistance(job.distance_from_provider) }}
            </span>
          </div>

          <!-- Route -->
          <div class="job-route">
            <div class="route-point pickup">
              <div class="point-marker">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="6"/>
                </svg>
              </div>
              <div class="point-content">
                <span class="point-label">รับ</span>
                <span class="point-address">{{ job.pickup_address }}</span>
              </div>
            </div>
            
            <div class="route-line"></div>
            
            <div class="route-point dropoff">
              <div class="point-marker">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                </svg>
              </div>
              <div class="point-content">
                <span class="point-label">ส่ง</span>
                <span class="point-address">{{ job.destination_address }}</span>
              </div>
            </div>
          </div>

          <!-- Meta -->
          <div class="job-meta">
            <span class="time">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              {{ formatTime(job.created_at) }}
            </span>
          </div>

          <!-- Accept Button -->
          <button 
            class="accept-btn"
            :disabled="acceptingId !== null"
            @click="handleAccept(job.id)"
            type="button"
          >
            <svg v-if="acceptingId === job.id" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M5 13l4 4L19 7"/>
            </svg>
            <span>{{ acceptingId === job.id ? 'กำลังรับ...' : 'รับงาน' }}</span>
          </button>
        </article>
      </TransitionGroup>
    </div>

    <!-- Bottom Navigation -->
    <nav v-if="isOnline || currentJob" class="bottom-nav">
      <button 
        class="nav-item"
        :disabled="refreshing || !isOnline"
        @click="handleRefresh"
        type="button"
        aria-label="รีเฟรช"
      >
        <svg :class="{ spin: refreshing }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      </button>
      
      <button 
        class="nav-item"
        @click="router.push('/provider/my-jobs')"
        type="button"
        aria-label="งานของฉัน"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
        </svg>
      </button>
      
      <button 
        class="nav-item"
        @click="router.push('/provider/earnings')"
        type="button"
        aria-label="รายได้"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      </button>
      
      <button 
        class="nav-item"
        @click="router.push('/provider/profile')"
        type="button"
        aria-label="โปรไฟล์"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </button>
    </nav>
  </div>
</template>


<style scoped>
/* =====================================================
   Base
   ===================================================== */
.provider-jobs {
  min-height: 100vh;
  background: #f8fafc;
  padding-bottom: 100px;
}

/* =====================================================
   Loading Overlay
   ===================================================== */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.loading-content {
  text-align: center;
}

.loading-content p {
  margin-top: 16px;
  color: #64748b;
  font-size: 15px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 3px solid #e2e8f0;
  border-top-color: #16a34a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

/* =====================================================
   Error Toast
   ===================================================== */
.error-toast {
  position: fixed;
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  color: #dc2626;
  font-size: 14px;
  font-weight: 500;
  z-index: 200;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.error-toast svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.error-toast span {
  flex: 1;
}

.error-toast button {
  background: none;
  border: none;
  font-size: 20px;
  color: #dc2626;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

/* =====================================================
   Connection Banner
   ===================================================== */
.connection-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fef3c7;
  color: #92400e;
  font-size: 13px;
  font-weight: 500;
}

.connection-banner.reconnecting {
  background: #dbeafe;
  color: #1e40af;
}

.connection-banner svg {
  width: 16px;
  height: 16px;
}

/* =====================================================
   Status Header
   ===================================================== */
.status-header {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  padding: 24px 20px;
  transition: background 0.3s ease;
}

.status-header.online {
  background: linear-gradient(135deg, #15803d 0%, #16a34a 100%);
}

.status-header.has-job {
  background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
}

.status-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 600px;
  margin: 0 auto;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-indicator {
  position: relative;
}

.status-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #64748b;
  transition: all 0.3s;
}

.status-dot.active {
  background: #fff;
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.3);
}

.status-dot.pulse {
  animation: pulse 2s infinite;
}

.status-text h1 {
  font-size: 20px;
  font-weight: 700;
  color: white;
  margin: 0 0 4px;
}

.status-text p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

/* Toggle Button */
.toggle-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  touch-action: manipulation;
  min-width: 64px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toggle-track {
  display: flex;
  align-items: center;
  width: 64px;
  height: 36px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 18px;
  padding: 3px;
  transition: background 0.3s;
}

.toggle-btn.active .toggle-track {
  background: rgba(255, 255, 255, 0.3);
}

.toggle-thumb {
  width: 30px;
  height: 30px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.toggle-btn.active .toggle-thumb {
  transform: translateX(28px);
}

.toggle-thumb svg {
  width: 16px;
  height: 16px;
  color: #64748b;
  transition: color 0.3s;
}

.toggle-btn.active .toggle-thumb svg {
  color: #16a34a;
}

/* =====================================================
   Current Job Banner
   ===================================================== */
.current-job-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px 20px;
  background: #eff6ff;
  border: none;
  border-bottom: 1px solid #bfdbfe;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
  font-family: inherit;
}

.current-job-banner:hover {
  background: #dbeafe;
}

.current-job-banner:active {
  background: #bfdbfe;
}

.job-icon {
  width: 44px;
  height: 44px;
  background: #2563eb;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.job-icon svg {
  width: 22px;
  height: 22px;
  color: white;
}

.job-info {
  flex: 1;
  min-width: 0;
}

.job-status {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #2563eb;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.job-address {
  display: block;
  font-size: 14px;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.job-fare {
  font-size: 18px;
  font-weight: 700;
  color: #16a34a;
}

.chevron {
  width: 20px;
  height: 20px;
  color: #94a3b8;
}

/* =====================================================
   Notice Card
   ===================================================== */
.notice-card {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 20px;
  padding: 20px;
  border-radius: 16px;
}

.notice-card.warning {
  background: #fef3c7;
  border: 1px solid #fbbf24;
}

.notice-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notice-card.warning .notice-icon {
  background: #fbbf24;
}

.notice-icon svg {
  width: 24px;
  height: 24px;
  color: white;
}

.notice-text h3 {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 4px;
}

.notice-card.warning .notice-text h3 {
  color: #92400e;
}

.notice-text p {
  font-size: 14px;
  margin: 0;
  line-height: 1.5;
}

.notice-card.warning .notice-text p {
  color: #a16207;
}

/* =====================================================
   Empty State
   ===================================================== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-illustration {
  width: 120px;
  height: 120px;
  margin-bottom: 24px;
}

.empty-illustration svg {
  width: 100%;
  height: 100%;
}

.empty-state h2 {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px;
}

.empty-state p {
  font-size: 15px;
  color: #64748b;
  margin: 0 0 24px;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #f1f5f9;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  min-height: 48px;
}

.refresh-btn:hover:not(:disabled) {
  background: #e2e8f0;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-btn svg {
  width: 18px;
  height: 18px;
}

/* Radar Animation */
.radar-animation {
  position: relative;
  width: 120px;
  height: 120px;
  margin-bottom: 24px;
}

.radar-ring {
  position: absolute;
  inset: 0;
  border: 2px solid #16a34a;
  border-radius: 50%;
  opacity: 0;
  animation: radar 2s ease-out infinite;
}

.radar-ring.delay-1 { animation-delay: 0.6s; }
.radar-ring.delay-2 { animation-delay: 1.2s; }

.radar-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  background: #dcfce7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radar-center svg {
  width: 24px;
  height: 24px;
  color: #16a34a;
}

/* =====================================================
   Job List
   ===================================================== */
.job-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 600px;
  margin: 0 auto;
}

/* =====================================================
   Job Card
   ===================================================== */
.job-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.2s;
  border: 2px solid transparent;
}

.job-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.job-card.accepting {
  border-color: #16a34a;
  background: #f0fdf4;
}

.job-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
}

.fare {
  font-size: 28px;
  font-weight: 800;
  color: #16a34a;
  line-height: 1;
}

.distance {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
  padding: 4px 10px;
  border-radius: 20px;
}

/* Route */
.job-route {
  position: relative;
  padding-left: 32px;
  margin-bottom: 16px;
}

.route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
}

.route-point.pickup { margin-bottom: 8px; }
.route-point.dropoff { margin-top: 8px; }

.point-marker {
  position: absolute;
  left: -32px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.point-marker svg {
  width: 16px;
  height: 16px;
}

.route-point.pickup .point-marker svg {
  color: #16a34a;
}

.route-point.dropoff .point-marker svg {
  color: #ef4444;
}

.point-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.point-label {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.point-address {
  font-size: 14px;
  color: #1e293b;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.route-line {
  position: absolute;
  left: -22px;
  top: 24px;
  bottom: 24px;
  width: 2px;
  background: repeating-linear-gradient(
    to bottom,
    #cbd5e1 0,
    #cbd5e1 4px,
    transparent 4px,
    transparent 8px
  );
}

/* Meta */
.job-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #94a3b8;
}

.time svg {
  width: 14px;
  height: 14px;
}

/* Accept Button */
.accept-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  background: #16a34a;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 52px;
  font-family: inherit;
}

.accept-btn:hover:not(:disabled) {
  background: #15803d;
}

.accept-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.accept-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.accept-btn svg {
  width: 20px;
  height: 20px;
}

/* =====================================================
   Bottom Navigation
   ===================================================== */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.06);
}

.nav-item {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-item:hover:not(:disabled) {
  background: #e2e8f0;
}

.nav-item:active:not(:disabled) {
  transform: scale(0.95);
}

.nav-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-item svg {
  width: 24px;
  height: 24px;
  color: #475569;
}

/* =====================================================
   Animations
   ===================================================== */
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.3); }
  50% { opacity: 0.7; box-shadow: 0 0 0 8px rgba(255, 255, 255, 0.1); }
}

@keyframes radar {
  0% { transform: scale(0.5); opacity: 0.8; }
  100% { transform: scale(1.5); opacity: 0; }
}

.spin {
  animation: spin 0.8s linear infinite;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* =====================================================
   Responsive
   ===================================================== */
@media (max-width: 360px) {
  .fare {
    font-size: 24px;
  }
  
  .status-text h1 {
    font-size: 18px;
  }
  
  .bottom-nav {
    gap: 4px;
    padding: 10px 12px;
  }
  
  .nav-item {
    width: 52px;
    height: 52px;
  }
}
</style>
