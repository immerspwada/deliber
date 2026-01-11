<script setup lang="ts">
/**
 * Provider Dashboard V2 - Main Dashboard Component
 * MUNEEF Design System Compliant
 * Thai Ride App - Provider Dashboard
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProviderStore } from '../../stores/providerStore'
import { useErrorHandler } from '../../composables/useErrorHandler'
import OnlineStatusToggle from './components/OnlineStatusToggle.vue'
import EarningsCard from './components/EarningsCard.vue'
import PerformanceCard from './components/PerformanceCard.vue'
import CurrentJobCard from './components/CurrentJobCard.vue'
import AvailableJobsList from './components/AvailableJobsList.vue'
import NotificationBell from './components/NotificationBell.vue'
import StatusBadge from './shared/StatusBadge.vue'
import LoadingSpinner from './shared/LoadingSpinner.vue'

const router = useRouter()
const providerStore = useProviderStore()
const { handleError } = useErrorHandler()

// Local state
const isInitializing = ref(true)
const refreshInterval = ref<number | null>(null)

// Computed properties
const provider = computed(() => providerStore.provider)
const currentJob = computed(() => providerStore.currentJob)
const availableJobs = computed(() => providerStore.availableJobs)
const earnings = computed(() => providerStore.earnings)
const metrics = computed(() => providerStore.metrics)
const isOnline = computed(() => providerStore.isOnline)
const canAcceptJobs = computed(() => providerStore.canAcceptJobs)
const loading = computed(() => providerStore.loading)
const error = computed(() => providerStore.error)

// Methods
async function initializeDashboard(): Promise<void> {
  try {
    isInitializing.value = true

    // Load provider profile first
    const profile = await providerStore.loadProfile()
    
    if (!profile) {
      // No provider profile found, redirect to registration
      router.replace('/provider/register')
      return
    }

    // Check provider status
    if (profile.status === 'pending' || profile.status === 'rejected') {
      router.replace('/provider/onboarding')
      return
    }

    if (profile.status === 'suspended') {
      // Allow viewing dashboard but show warning
    }

    // Load dashboard data in parallel
    await Promise.all([
      providerStore.loadEarnings(),
      providerStore.loadMetrics(),
      providerStore.loadNotifications(),
      providerStore.loadCurrentJob(),
    ])

    // Load available jobs if online and can accept jobs
    if (canAcceptJobs.value) {
      await providerStore.loadAvailableJobs()
    }

    // Initialize realtime subscriptions
    providerStore.initializeRealtimeSubscriptions()

    // Set up auto-refresh for available jobs
    if (canAcceptJobs.value) {
      refreshInterval.value = window.setInterval(() => {
        if (canAcceptJobs.value) {
          providerStore.loadAvailableJobs()
        }
      }, 30000) // Refresh every 30 seconds
    }

  } catch (err) {
    handleError(err)
    router.replace('/provider/onboarding')
  } finally {
    isInitializing.value = false
  }
}

async function handleJobAccept(jobId: string): Promise<void> {
  try {
    const success = await providerStore.acceptJob(jobId)
    if (success) {
      // Job accepted successfully, will be handled by realtime updates
    }
  } catch (err) {
    handleError(err)
  }
}

function navigateToJobDetail(jobId: string): void {
  router.push(`/provider/job/${jobId}`)
}

function navigateToEarnings(): void {
  router.push('/provider/earnings')
}

function navigateToProfile(): void {
  router.push('/provider/profile')
}

function navigateToNotifications(): void {
  router.push('/provider/notifications')
}

// Lifecycle
onMounted(() => {
  initializeDashboard()
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
  providerStore.cleanup()
})
</script>

<template>
  <div class="provider-dashboard">
    <!-- Loading State -->
    <div v-if="isInitializing" class="loading-container">
      <LoadingSpinner size="lg" />
      <p class="loading-text">กำลังโหลดแดชบอร์ด...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
      </div>
      <h3 class="error-title">เกิดข้อผิดพลาด</h3>
      <p class="error-message">{{ error }}</p>
      <button @click="initializeDashboard" class="retry-button">
        ลองใหม่อีกครั้ง
      </button>
    </div>

    <!-- Main Dashboard -->
    <div v-else-if="provider" class="dashboard-content">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-content">
          <div class="provider-info">
            <div class="avatar">
              <img 
                v-if="provider.profile_image_url" 
                :src="provider.profile_image_url" 
                :alt="`${provider.first_name} ${provider.last_name}`"
                class="avatar-image"
              >
              <div v-else class="avatar-placeholder">
                {{ provider.first_name.charAt(0) }}{{ provider.last_name.charAt(0) }}
              </div>
            </div>
            <div class="provider-details">
              <h1 class="provider-name">
                สวัสดี, {{ provider.first_name }}
              </h1>
              <div class="provider-meta">
                <StatusBadge :status="provider.status" size="sm" />
                <span class="service-type">{{ provider.primary_service }}</span>
              </div>
            </div>
          </div>
          
          <div class="header-actions">
            <NotificationBell 
              :count="providerStore.unreadNotifications"
              @click="navigateToNotifications"
            />
            <button @click="navigateToProfile" class="profile-button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <!-- Suspended Warning -->
      <div v-if="provider.status === 'suspended'" class="suspended-warning">
        <div class="warning-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
        </div>
        <div class="warning-content">
          <h3 class="warning-title">บัญชีถูกระงับชั่วคราว</h3>
          <p class="warning-message">
            กรุณาติดต่อฝ่ายสนับสนุนเพื่อข้อมูลเพิ่มเติม
          </p>
        </div>
      </div>

      <!-- Online Status Toggle -->
      <div class="status-section">
        <OnlineStatusToggle 
          :disabled="provider.status === 'suspended'"
          :online-hours="metrics.online_hours_today"
          :today-jobs="earnings.today_jobs"
        />
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <EarningsCard 
          :earnings="earnings"
          @click="navigateToEarnings"
        />
        <PerformanceCard 
          :metrics="metrics"
          @click="navigateToProfile"
        />
      </div>

      <!-- Current Job -->
      <div v-if="currentJob" class="current-job-section">
        <h2 class="section-title">งานปัจจุบัน</h2>
        <CurrentJobCard 
          :job="currentJob"
          @navigate="navigateToJobDetail(currentJob.id)"
          @update-status="(status) => providerStore.updateJobStatus(currentJob.id, status)"
        />
      </div>

      <!-- Available Jobs -->
      <div v-else-if="canAcceptJobs" class="available-jobs-section">
        <div class="section-header">
          <h2 class="section-title">งานที่รับได้</h2>
          <span v-if="availableJobs.length > 0" class="job-count">
            {{ availableJobs.length }} งาน
          </span>
        </div>
        
        <AvailableJobsList 
          :jobs="availableJobs"
          :loading="loading"
          @accept="handleJobAccept"
          @refresh="providerStore.loadAvailableJobs"
        />
      </div>

      <!-- Offline State -->
      <div v-else-if="!isOnline" class="offline-state">
        <div class="offline-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"/>
          </svg>
        </div>
        <h3 class="offline-title">คุณออฟไลน์อยู่</h3>
        <p class="offline-message">
          เปิดสถานะออนไลน์เพื่อเริ่มรับงานและสร้างรายได้
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.provider-dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #f6f9fc 0%, #ffffff 100%);
  font-family: "Sarabun", -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Loading State */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1rem;
}

.loading-text {
  color: #666666;
  font-size: 0.875rem;
}

/* Error State */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem;
  text-align: center;
}

.error-icon {
  width: 4rem;
  height: 4rem;
  color: #e11900;
  margin-bottom: 1rem;
}

.error-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 0.5rem;
}

.error-message {
  color: #666666;
  margin-bottom: 1.5rem;
}

.retry-button {
  padding: 0.75rem 2rem;
  background: #00a86b;
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button:hover {
  background: #008f5b;
  transform: translateY(-1px);
}

/* Dashboard Content */
.dashboard-content {
  max-width: 480px;
  margin: 0 auto;
  padding: 1rem;
}

/* Header */
.dashboard-header {
  margin-bottom: 1.5rem;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  overflow: hidden;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: #00a86b;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.125rem;
}

.provider-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 0.25rem;
}

.provider-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.service-type {
  font-size: 0.75rem;
  color: #666666;
  text-transform: capitalize;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.profile-button {
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  background: #f6f6f6;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.profile-button:hover {
  background: #e8e8e8;
}

.profile-button svg {
  width: 1.25rem;
  height: 1.25rem;
  color: #666666;
}

/* Suspended Warning */
.suspended-warning {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #f59e0b;
  border-radius: 0.75rem;
  margin-bottom: 1.5rem;
}

.warning-icon {
  width: 2.25rem;
  height: 2.25rem;
  color: #d97706;
  flex-shrink: 0;
}

.warning-title {
  font-size: 1rem;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 0.25rem;
}

.warning-message {
  font-size: 0.875rem;
  color: #b45309;
}

/* Status Section */
.status-section {
  margin-bottom: 1.5rem;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

/* Sections */
.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 1rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.job-count {
  padding: 0.25rem 0.75rem;
  background: #00a86b;
  color: white;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.current-job-section,
.available-jobs-section {
  margin-bottom: 1.5rem;
}

/* Offline State */
.offline-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3rem 1.5rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.offline-icon {
  width: 4rem;
  height: 4rem;
  color: #999999;
  margin-bottom: 1rem;
}

.offline-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 0.5rem;
}

.offline-message {
  color: #666666;
  line-height: 1.5;
}

/* Responsive Design */
@media (max-width: 480px) {
  .dashboard-content {
    padding: 0.75rem;
  }
  
  .header-content {
    padding: 1rem;
  }
  
  .provider-name {
    font-size: 1.125rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}
</style>