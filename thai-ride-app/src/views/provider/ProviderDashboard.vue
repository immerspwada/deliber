<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProviderStore } from '../../stores/provider'
import { useTestData } from '../../composables/useTestData'
import { useNotifications } from '../../composables/useNotifications'
import { usePerformanceMetrics } from '../../composables/usePerformanceMetrics'
import OnlineStatusToggle from '../../components/provider/OnlineStatusToggle.vue'
import QuickStats from '../../components/provider/QuickStats.vue'
import EarningsChart from '../../components/provider/EarningsChart.vue'
import NotificationPanel from '../../components/provider/NotificationPanel.vue'

const router = useRouter()
const providerStore = useProviderStore()
const testData = useTestData()
const { 
  notifications, 
  unreadCount, 
  markAsRead, 
  clearAll,
  simulateEarningsNotification 
} = useNotifications()

const { measureInteractionTime } = usePerformanceMetrics()

const refreshInterval = ref<number | null>(null)
const isSettingUpTestData = ref(false)
const isRefreshing = ref(false)

// Computed properties from store
const loading = computed(() => providerStore.loading)
const error = computed(() => providerStore.error)
const profile = computed(() => providerStore.profile)
const isOnline = computed(() => providerStore.isOnline)
const todayEarnings = computed(() => providerStore.todayEarnings)
const todayTrips = computed(() => providerStore.todayTrips)
const currentJob = computed(() => providerStore.currentJob)
const availableJobs = computed(() => providerStore.availableJobs)
const canAcceptJobs = computed(() => providerStore.canAcceptJobs)
const isApproved = computed(() => providerStore.isApproved)
const currentRating = computed(() => providerStore.metrics.rating)

// Mock data for charts and stats
const mockDailyEarnings = ref([120, 250, 180, 320, 290, 150, 200])
const mockLabels = ref(['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'])
const mockWeeklyEarnings = ref(1500)
const mockMonthlyEarnings = ref(6800)
const mockCompletionRate = ref(94.5)

onMounted(async () => {
  await loadDashboardData()
  
  // Set up auto-refresh for available jobs every 30 seconds
  if (isOnline.value && canAcceptJobs.value) {
    refreshInterval.value = window.setInterval(() => {
      if (isOnline.value && canAcceptJobs.value) {
        providerStore.loadAvailableJobs()
      }
    }, 30000)
  }
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})

async function loadDashboardData(): Promise<void> {
  try {
    await providerStore.loadProfile()
    
    // Check if user needs to complete onboarding
    if (!profile.value) {
      router.replace('/provider/onboarding')
      return
    }

    // Check status
    if (profile.value.status === 'pending' || profile.value.status === 'rejected') {
      router.replace('/provider/onboarding')
      return
    }

    // If suspended, show message but allow viewing dashboard
    if (profile.value.status === 'suspended') {
      // User can see dashboard but cannot go online
    }

  } catch (err: any) {
    console.error('Error loading dashboard:', err)
  }
}

async function setupTestDataAndReload(): Promise<void> {
  isSettingUpTestData.value = true
  
  try {
    await testData.setupCompleteTestData()
    
    // Reload dashboard data
    await loadDashboardData()
    
    alert('✅ ข้อมูลทดสอบถูกสร้างเรียบร้อยแล้ว! กรุณารีเฟรชหน้าเว็บ')
    
    // Refresh the page to see new data
    window.location.reload()
  } catch (error) {
    console.error('Error setting up test data:', error)
    alert('❌ เกิดข้อผิดพลาดในการสร้างข้อมูลทดสอบ')
  } finally {
    isSettingUpTestData.value = false
  }
}

async function refreshJobs(): Promise<void> {
  if (isRefreshing.value) return
  
  isRefreshing.value = true
  try {
    await providerStore.loadAvailableJobs()
  } catch (error) {
    console.error('Error refreshing jobs:', error)
  } finally {
    isRefreshing.value = false
  }
}

async function acceptJob(jobId: string): Promise<void> {
  const startTime = performance.now()
  
  try {
    const success = await providerStore.acceptJob(jobId)
    if (success) {
      // Measure interaction time
      measureInteractionTime(startTime)
      
      // Simulate earnings notification
      simulateEarningsNotification(150)
      // Job accepted successfully, navigate to job details
      router.push(`/provider/job/${jobId}`)
    }
  } catch (err: any) {
    console.error('Error accepting job:', err)
    // Show error message to user
    alert(err.userMessage || 'ไม่สามารถรับงานได้ กรุณาลองใหม่')
  }
}

function handleNotificationAction(notification: any): void {
  if (notification.actionUrl) {
    router.push(notification.actionUrl)
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
  }).format(amount)
}

function getRatingColor(rating: number): string {
  if (rating >= 4.5) return 'text-green-600'
  if (rating >= 4.0) return 'text-yellow-600'
  return 'text-red-600'
}

function getServiceTypeLabel(serviceType: string): string {
  const labels: Record<string, string> = {
    ride: 'รถรับส่ง',
    delivery: 'จัดส่ง',
    shopping: 'ซื้อของ'
  }
  return labels[serviceType] || serviceType
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'รอการอนุมัติ',
    approved: 'อนุมัติแล้ว',
    active: 'ใช้งานได้',
    rejected: 'ถูกปฏิเสธ',
    suspended: 'ถูกระงับ'
  }
  return labels[status] || status
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'text-yellow-600 bg-yellow-100',
    approved: 'text-green-600 bg-green-100',
    active: 'text-green-600 bg-green-100',
    rejected: 'text-red-600 bg-red-100',
    suspended: 'text-red-600 bg-red-100'
  }
  return colors[status] || 'text-gray-600 bg-gray-100'
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <!-- Modern Header with Glass Effect -->
    <header class="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-gray-200/50 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div>
              <h1 class="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                แดชบอร์ด
              </h1>
              <div v-if="profile" class="flex items-center gap-3 mt-1">
                <p class="text-sm font-medium text-gray-600">
                  {{ profile.first_name }} {{ profile.last_name }}
                </p>
                <span 
                  class="px-2.5 py-1 text-xs font-semibold rounded-full transition-colors"
                  :class="getStatusColor(profile.status)"
                >
                  {{ getStatusLabel(profile.status) }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            <!-- Notification Badge -->
            <div class="relative">
              <button class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors duration-200">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM9 17H4l5 5v-5zM12 3v18" />
                </svg>
                <span v-if="unreadCount > 0" class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                  {{ unreadCount > 9 ? '9+' : unreadCount }}
                </span>
              </button>
            </div>
            
            <!-- Test Data Setup Button -->
            <button
              v-if="!profile || availableJobs.length === 0"
              @click="setupTestDataAndReload"
              :disabled="isSettingUpTestData"
              class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-medium rounded-xl hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              :aria-label="isSettingUpTestData ? 'กำลังสร้างข้อมูลทดสอบ' : 'สร้างข้อมูลทดสอบ'"
            >
              <svg v-if="isSettingUpTestData" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {{ isSettingUpTestData ? 'กำลังสร้าง...' : 'สร้างข้อมูลทดสอบ' }}
            </button>
            
            <OnlineStatusToggle v-if="isApproved" />
          </div>
        </div>
      </div>
    </header>

    <!-- Loading State with Modern Skeleton -->
    <div v-if="loading" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="animate-pulse">
        <!-- Skeleton for metrics cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div v-for="i in 3" :key="i" class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div class="flex items-center">
              <div class="w-12 h-12 bg-gray-200 rounded-xl"></div>
              <div class="ml-4 flex-1">
                <div class="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div class="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        </div>
        <!-- Skeleton for content -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div class="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div class="space-y-3">
            <div class="h-4 bg-gray-200 rounded"></div>
            <div class="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State with Better Design -->
    <div v-else-if="error" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-red-900 mb-2">เกิดข้อผิดพลาด</h3>
        <p class="text-red-700 mb-6">{{ error }}</p>
        <button
          @click="loadDashboardData"
          class="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          ลองใหม่
        </button>
      </div>
    </div>

    <!-- Suspended Status Warning with Modern Alert -->
    <div v-else-if="profile?.status === 'suspended'" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-8 mb-8">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <div class="ml-4">
            <h3 class="text-lg font-semibold text-red-900">บัญชีถูกระงับ</h3>
            <p class="text-red-800 mt-2 leading-relaxed">บัญชีของคุณถูกระงับชั่วคราว กรุณาติดต่อฝ่ายสนับสนุนเพื่อข้อมูลเพิ่มเติม</p>
            <button class="mt-4 inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors duration-200">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              ติดต่อฝ่ายสนับสนุน
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Dashboard Content with Enhanced Design -->
    <main v-else-if="profile && isApproved" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <!-- Enhanced Metrics Cards -->
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8" aria-label="สถิติประจำวัน">
        <!-- Today's Earnings -->
        <div class="group bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <svg class="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="ml-3 sm:ml-4 min-w-0 flex-1">
              <p class="text-xs sm:text-sm font-medium text-gray-600">รายได้วันนี้</p>
              <p class="text-lg sm:text-2xl font-bold text-gray-900 tabular-nums truncate">{{ formatCurrency(todayEarnings) }}</p>
              <p class="text-xs text-green-600 mt-1 hidden sm:block">+12% จากเมื่อวาน</p>
            </div>
          </div>
        </div>

        <!-- Today's Trips -->
        <div class="group bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <svg class="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div class="ml-3 sm:ml-4 min-w-0 flex-1">
              <p class="text-xs sm:text-sm font-medium text-gray-600">งานวันนี้</p>
              <p class="text-lg sm:text-2xl font-bold text-gray-900 tabular-nums">{{ todayTrips }}</p>
              <p class="text-xs text-blue-600 mt-1 hidden sm:block">{{ todayTrips > 0 ? 'เยี่ยมมาก!' : 'เริ่มรับงานเลย' }}</p>
            </div>
          </div>
        </div>

        <!-- Rating -->
        <div class="group bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 sm:col-span-2 lg:col-span-1">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <svg class="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
            <div class="ml-3 sm:ml-4 min-w-0 flex-1">
              <p class="text-xs sm:text-sm font-medium text-gray-600">คะแนนเฉลี่ย</p>
              <p class="text-lg sm:text-2xl font-bold tabular-nums" :class="getRatingColor(currentRating)">
                {{ currentRating > 0 ? currentRating.toFixed(2) : 'ยังไม่มี' }}
              </p>
              <div v-if="currentRating > 0" class="flex items-center mt-1">
                <div class="flex">
                  <svg v-for="i in 5" :key="i" class="w-3 h-3" :class="i <= Math.floor(currentRating) ? 'text-yellow-400' : 'text-gray-300'" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Enhanced Analytics Section -->
      <section class="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8" aria-label="สถิติและกราฟ">
        <!-- Earnings Chart -->
        <div class="xl:col-span-2 order-2 xl:order-1">
          <EarningsChart 
            :daily-earnings="mockDailyEarnings"
            :labels="mockLabels"
            :current-earnings="todayEarnings"
          />
        </div>
        
        <!-- Quick Stats -->
        <div class="order-1 xl:order-2">
          <QuickStats
            :today-earnings="todayEarnings"
            :today-trips="todayTrips"
            :weekly-earnings="mockWeeklyEarnings"
            :monthly-earnings="mockMonthlyEarnings"
            :rating="currentRating"
            :completion-rate="mockCompletionRate"
          />
        </div>
      </section>

      <!-- Notifications Panel -->
      <section class="mb-6 sm:mb-8" aria-label="การแจ้งเตือน">
        <NotificationPanel
          :notifications="notifications"
          @mark-as-read="markAsRead"
          @clear-all="clearAll"
          @action-click="handleNotificationAction"
        />
      </section>

      <!-- Current Job with Enhanced Design -->
      <section v-if="currentJob" class="mb-8" aria-label="งานปัจจุบัน">
        <h2 class="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <div class="w-2 h-6 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full mr-3"></div>
          งานปัจจุบัน
        </h2>
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-200 p-6 relative overflow-hidden">
          <!-- Background Pattern -->
          <div class="absolute inset-0 opacity-5">
            <svg class="w-full h-full" viewBox="0 0 100 100" fill="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" stroke-width="1"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>
          
          <div class="relative">
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center gap-3">
                <span class="px-4 py-2 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full border border-blue-200">
                  {{ getServiceTypeLabel(currentJob.service_type) }}
                </span>
                <span class="px-4 py-2 bg-green-100 text-green-800 text-sm font-semibold rounded-full border border-green-200 animate-pulse">
                  {{ currentJob.status === 'accepted' ? 'รับงานแล้ว' : 
                     currentJob.status === 'arrived' ? 'ถึงจุดรับแล้ว' : 
                     currentJob.status === 'in_progress' ? 'กำลังดำเนินการ' : currentJob.status }}
                </span>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-600 mb-1">รายได้ที่คาดหวัง</p>
                <span class="text-2xl font-bold text-green-600">
                  {{ formatCurrency(currentJob.estimated_earnings) }}
                </span>
              </div>
            </div>
            
            <div class="space-y-4 mb-6">
              <div class="flex items-start group">
                <div class="flex-shrink-0 w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                  <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="flex-1">
                  <p class="text-sm font-semibold text-gray-900 mb-1">จุดรับ</p>
                  <p class="text-gray-700 leading-relaxed">{{ currentJob.pickup_address }}</p>
                </div>
              </div>
              
              <div v-if="currentJob.dropoff_address" class="flex items-start group">
                <div class="flex-shrink-0 w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-200">
                  <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="flex-1">
                  <p class="text-sm font-semibold text-gray-900 mb-1">จุดส่ง</p>
                  <p class="text-gray-700 leading-relaxed">{{ currentJob.dropoff_address }}</p>
                </div>
              </div>
            </div>
            
            <button
              @click="$router.push(`/provider/job/${currentJob.id}`)"
              class="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <span class="flex items-center justify-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                ดูรายละเอียดงาน
              </span>
            </button>
          </div>
        </div>
      </section>

      <!-- Available Jobs with Modern Design -->
      <section v-if="isOnline && !currentJob && canAcceptJobs" aria-label="งานที่รับได้">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-gray-900 flex items-center">
            <div class="w-2 h-6 bg-gradient-to-b from-green-600 to-emerald-600 rounded-full mr-3"></div>
            งานที่รับได้
            <span v-if="availableJobs.length > 0" class="ml-3 px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
              {{ availableJobs.length }} งาน
            </span>
          </h2>
          <button
            @click="refreshJobs"
            :disabled="isRefreshing"
            class="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            :aria-label="isRefreshing ? 'กำลังรีเฟรช' : 'รีเฟรชงาน'"
          >
            <svg class="w-4 h-4 mr-2" :class="{ 'animate-spin': isRefreshing }" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ isRefreshing ? 'กำลังรีเฟรช...' : 'รีเฟรช' }}
          </button>
        </div>

        <!-- No Jobs Available -->
        <div v-if="availableJobs.length === 0" class="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-3">ยังไม่มีงานใหม่</h3>
          <p class="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">เราจะแจ้งเตือนคุณทันทีเมื่อมีงานใหม่ที่เหมาะสมกับคุณ</p>
          <div class="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>กำลังค้นหางานใหม่...</span>
          </div>
        </div>

        <!-- Jobs List with Enhanced Cards -->
        <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <article
            v-for="job in availableJobs"
            :key="job.id"
            class="group bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-blue-200 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
          >
            <!-- Gradient accent -->
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
            
            <div class="flex items-center justify-between mb-4">
              <span class="px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full border border-blue-200">
                {{ getServiceTypeLabel(job.service_type) }}
              </span>
              <div class="text-right">
                <p class="text-xs text-gray-500 mb-1">รายได้</p>
                <span class="text-xl font-bold text-green-600">
                  {{ formatCurrency(job.estimated_earnings) }}
                </span>
              </div>
            </div>
            
            <div class="space-y-3 mb-4">
              <div class="flex items-start">
                <div class="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-200">
                  <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">{{ job.pickup_address }}</p>
                </div>
              </div>
              
              <div v-if="job.dropoff_address" class="flex items-start">
                <div class="flex-shrink-0 w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-200">
                  <svg class="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-gray-700 truncate">{{ job.dropoff_address }}</p>
                </div>
              </div>
            </div>
            
            <div v-if="job.distance_km || job.duration_minutes" class="flex items-center justify-between text-sm text-gray-500 mb-4 bg-gray-50 rounded-lg p-3">
              <span v-if="job.distance_km" class="flex items-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {{ job.distance_km.toFixed(1) }} กม.
              </span>
              <span v-if="job.duration_minutes" class="flex items-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ job.duration_minutes }} นาที
              </span>
            </div>
            
            <button
              @click="acceptJob(job.id)"
              :disabled="loading"
              class="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <span class="flex items-center justify-center">
                <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ loading ? 'กำลังรับงาน...' : 'รับงาน' }}
              </span>
            </button>
          </article>
        </div>
      </section>

      <!-- Enhanced Status Messages -->
      <!-- Offline State -->
      <section v-if="!isOnline && !currentJob && canAcceptJobs" class="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-8 text-center" aria-label="สถานะออฟไลน์">
        <div class="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-yellow-900 mb-3">คุณออฟไลน์อยู่</h3>
        <p class="text-yellow-800 mb-6 max-w-md mx-auto leading-relaxed">เปิดสถานะออนไลน์เพื่อเริ่มรับงานและสร้างรายได้</p>
        <div class="flex items-center justify-center space-x-2 text-sm text-yellow-700">
          <div class="w-2 h-2 bg-yellow-400 rounded-full"></div>
          <span>พร้อมเปิดรับงานเมื่อไหร่ก็ได้</span>
        </div>
      </section>

      <!-- Cannot Accept Jobs State -->
      <section v-if="!canAcceptJobs && isApproved" class="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-2xl p-8 text-center" aria-label="ไม่สามารถรับงานได้">
        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-gray-900 mb-3">ไม่สามารถรับงานได้</h3>
        <p class="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
          {{ currentJob ? 'คุณมีงานที่กำลังดำเนินการอยู่ กรุณาทำงานปัจจุบันให้เสร็จก่อน' : 'กรุณาเปิดสถานะออนไลน์เพื่อรับงาน' }}
        </p>
      </section>
    </main>
  </div>
</template>
