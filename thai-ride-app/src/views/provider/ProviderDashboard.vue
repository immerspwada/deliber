<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProviderStore } from '@/stores/provider'
import OnlineStatusToggle from '@/components/provider/OnlineStatusToggle.vue'
import { supabase } from '@/lib/supabase'

const providerStore = useProviderStore()

const loading = ref(true)
const error = ref<string | null>(null)

const todayEarnings = computed(() => providerStore.todayEarnings)
const todayTrips = computed(() => providerStore.todayTrips)
const currentRating = computed(() => providerStore.profile?.rating || 0)
const isOnline = computed(() => providerStore.isOnline)
const currentJob = computed(() => providerStore.currentJob)
const availableJobs = computed(() => providerStore.availableJobs)

onMounted(async () => {
  await loadDashboardData()
  setupRealtimeSubscriptions()
})

async function loadDashboardData(): Promise<void> {
  loading.value = true
  error.value = null

  try {
    await providerStore.loadProfile()
    await providerStore.loadTodayMetrics()
    if (providerStore.isOnline) {
      await providerStore.loadAvailableJobs()
    }
  } catch (err: any) {
    console.error('Error loading dashboard:', err)
    error.value = err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
  } finally {
    loading.value = false
  }
}

function setupRealtimeSubscriptions(): void {
  // Subscribe to job updates
  supabase
    .channel('provider-jobs')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'jobs',
        filter: `provider_id=eq.${providerStore.profile?.id}`,
      },
      () => {
        providerStore.loadAvailableJobs()
      }
    )
    .subscribe()
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
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">แดชบอร์ด</h1>
            <p v-if="providerStore.profile" class="text-sm text-gray-600">
              {{ providerStore.profile.first_name }} {{ providerStore.profile.last_name }}
            </p>
          </div>
          <OnlineStatusToggle />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p class="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-red-50 border border-red-200 rounded-lg p-6">
        <p class="text-red-600">{{ error }}</p>
        <button
          @click="loadDashboardData"
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          ลองใหม่
        </button>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Metrics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <!-- Today's Earnings -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">รายได้วันนี้</p>
              <p class="text-2xl font-bold text-gray-900">{{ formatCurrency(todayEarnings) }}</p>
            </div>
          </div>
        </div>

        <!-- Today's Trips -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">งานวันนี้</p>
              <p class="text-2xl font-bold text-gray-900">{{ todayTrips }}</p>
            </div>
          </div>
        </div>

        <!-- Rating -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">คะแนนเฉลี่ย</p>
              <p class="text-2xl font-bold" :class="getRatingColor(currentRating)">
                {{ currentRating.toFixed(2) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Current Job -->
      <div v-if="currentJob" class="mb-8">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">งานปัจจุบัน</h2>
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <span class="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              {{ currentJob.status === 'accepted' ? 'รับงานแล้ว' : currentJob.status === 'arrived' ? 'ถึงจุดรับแล้ว' : 'กำลังดำเนินการ' }}
            </span>
            <span class="text-lg font-bold text-green-600">
              {{ formatCurrency(currentJob.estimated_earnings) }}
            </span>
          </div>
          <div class="space-y-2">
            <div class="flex items-start">
              <svg class="w-5 h-5 text-green-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clip-rule="evenodd"
                />
              </svg>
              <div>
                <p class="text-sm font-medium text-gray-900">จุดรับ</p>
                <p class="text-sm text-gray-600">{{ currentJob.pickup_address }}</p>
              </div>
            </div>
            <div v-if="currentJob.dropoff_address" class="flex items-start">
              <svg class="w-5 h-5 text-red-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clip-rule="evenodd"
                />
              </svg>
              <div>
                <p class="text-sm font-medium text-gray-900">จุดส่ง</p>
                <p class="text-sm text-gray-600">{{ currentJob.dropoff_address }}</p>
              </div>
            </div>
          </div>
          <button
            @click="$router.push(`/provider/job/${currentJob.id}`)"
            class="mt-4 w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
          >
            ดูรายละเอียดงาน
          </button>
        </div>
      </div>

      <!-- Available Jobs -->
      <div v-if="isOnline && !currentJob">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">งานที่รับได้</h2>
          <button
            @click="providerStore.loadAvailableJobs"
            class="text-sm text-blue-600 hover:text-blue-700"
          >
            รีเฟรช
          </button>
        </div>

        <!-- No Jobs Available -->
        <div v-if="availableJobs.length === 0" class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900">ยังไม่มีงานใหม่</h3>
          <p class="mt-2 text-gray-600">เราจะแจ้งเตือนคุณเมื่อมีงานใหม่</p>
        </div>

        <!-- Jobs List -->
        <div v-else class="space-y-4">
          <div
            v-for="job in availableJobs"
            :key="job.id"
            class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            @click="$router.push(`/provider/job/${job.id}`)"
          >
            <div class="flex items-center justify-between mb-4">
              <span class="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {{ job.service_type === 'ride' ? 'รถรับส่ง' : job.service_type === 'delivery' ? 'จัดส่ง' : job.service_type }}
              </span>
              <span class="text-xl font-bold text-green-600">
                {{ formatCurrency(job.estimated_earnings) }}
              </span>
            </div>
            <div class="space-y-2 mb-4">
              <div class="flex items-start">
                <svg class="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clip-rule="evenodd"
                  />
                </svg>
                <p class="text-sm text-gray-900">{{ job.pickup_address }}</p>
              </div>
              <div v-if="job.dropoff_address" class="flex items-start">
                <svg class="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clip-rule="evenodd"
                  />
                </svg>
                <p class="text-sm text-gray-900">{{ job.dropoff_address }}</p>
              </div>
            </div>
            <div class="flex items-center justify-between text-sm text-gray-600">
              <span v-if="job.distance_km">{{ job.distance_km.toFixed(1) }} กม.</span>
              <span v-if="job.duration_minutes">{{ job.duration_minutes }} นาที</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Offline State -->
      <div v-if="!isOnline && !currentJob" class="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
        <svg class="mx-auto h-12 w-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 class="mt-4 text-lg font-medium text-yellow-900">คุณออฟไลน์อยู่</h3>
        <p class="mt-2 text-yellow-700">เปิดสถานะออนไลน์เพื่อรับงานใหม่</p>
      </div>
    </div>
  </div>
</template>
