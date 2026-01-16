<script setup lang="ts">
/**
 * Push Analytics Dashboard
 * Admin view for push notification analytics
 * 
 * Role: Admin only
 */
import { onMounted, ref } from 'vue'
import { usePushAnalytics, type TimeRange } from '../../composables/usePushAnalytics'

const {
  summary,
  volumeData,
  recentLogs,
  loading,
  error,
  timeRange,
  topNotificationTypes,
  topFailureReasons,
  statusBreakdown,
  loadAnalytics,
  setTimeRange
} = usePushAnalytics()

const showLogsModal = ref(false)

// Format number with commas
function formatNumber(num: number): string {
  return num?.toLocaleString() || '0'
}

// Format percentage
function formatPercent(num: number): string {
  return `${num?.toFixed(1) || '0'}%`
}

// Format latency
function formatLatency(ms: number | null): string {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

// Format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Status color
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    sent: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

// Notification type icon
function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    new_job: '🔔',
    job_update: '📋',
    earnings: '💰',
    promotions: '🎁',
    system_announcements: '📢',
    silent_sync: '🔄'
  }
  return icons[type] || '📨'
}

// Handle time range change
async function handleTimeRangeChange(range: TimeRange) {
  await setTimeRange(range)
}

onMounted(() => {
  loadAnalytics()
})
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Header -->
    <div class="bg-white shadow">
      <div class="px-4 py-6 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Push Analytics</h1>
            <p class="mt-1 text-sm text-gray-500">สถิติการส่ง Push Notification</p>
          </div>
          
          <!-- Time Range Selector -->
          <div class="flex gap-2">
            <button
              v-for="range in (['24h', '7d', '30d'] as TimeRange[])"
              :key="range"
              @click="handleTimeRangeChange(range)"
              :class="[
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
            >
              {{ range === '24h' ? '24 ชั่วโมง' : range === '7d' ? '7 วัน' : '30 วัน' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="px-4 py-6 sm:px-6 lg:px-8">
      <!-- Loading State -->
      <div v-if="loading && !summary" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p class="text-red-700">{{ error }}</p>
        <button
          @click="loadAnalytics"
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          ลองใหม่
        </button>
      </div>

      <template v-else>
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <!-- Total Sent -->
          <div class="bg-white rounded-xl shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">ส่งทั้งหมด</p>
                <p class="text-3xl font-bold text-gray-900">
                  {{ formatNumber(summary?.total_sent || 0) }}
                </p>
              </div>
              <div class="p-3 bg-blue-100 rounded-full">
                <span class="text-2xl">📤</span>
              </div>
            </div>
          </div>

          <!-- Delivered -->
          <div class="bg-white rounded-xl shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">ส่งถึง</p>
                <p class="text-3xl font-bold text-green-600">
                  {{ formatNumber(summary?.total_delivered || 0) }}
                </p>
              </div>
              <div class="p-3 bg-green-100 rounded-full">
                <span class="text-2xl">✅</span>
              </div>
            </div>
          </div>

          <!-- Failed -->
          <div class="bg-white rounded-xl shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">ล้มเหลว</p>
                <p class="text-3xl font-bold text-red-600">
                  {{ formatNumber(summary?.total_failed || 0) }}
                </p>
              </div>
              <div class="p-3 bg-red-100 rounded-full">
                <span class="text-2xl">❌</span>
              </div>
            </div>
          </div>

          <!-- Delivery Rate -->
          <div class="bg-white rounded-xl shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">อัตราส่งถึง</p>
                <p class="text-3xl font-bold text-blue-600">
                  {{ formatPercent(summary?.delivery_rate || 0) }}
                </p>
              </div>
              <div class="p-3 bg-blue-100 rounded-full">
                <span class="text-2xl">📊</span>
              </div>
            </div>
            <p class="mt-2 text-sm text-gray-500">
              เฉลี่ย {{ formatLatency(summary?.avg_latency_ms || null) }}
            </p>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <!-- Volume Chart -->
          <div class="bg-white rounded-xl shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">ปริมาณการส่ง</h3>
            
            <div v-if="volumeData.length === 0" class="text-center py-8 text-gray-500">
              ไม่มีข้อมูล
            </div>
            
            <div v-else class="space-y-2">
              <div
                v-for="item in volumeData.slice(-10)"
                :key="item.time_bucket"
                class="flex items-center gap-3"
              >
                <span class="text-xs text-gray-500 w-20">
                  {{ formatDate(item.time_bucket) }}
                </span>
                <div class="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden flex">
                  <div
                    class="h-full bg-green-500"
                    :style="{ width: `${(item.delivered_count / Math.max(item.total_count, 1)) * 100}%` }"
                  ></div>
                  <div
                    class="h-full bg-red-500"
                    :style="{ width: `${(item.failed_count / Math.max(item.total_count, 1)) * 100}%` }"
                  ></div>
                </div>
                <span class="text-sm font-medium w-12 text-right">
                  {{ item.total_count }}
                </span>
              </div>
            </div>
            
            <div class="flex gap-4 mt-4 text-xs">
              <div class="flex items-center gap-1">
                <div class="w-3 h-3 bg-green-500 rounded"></div>
                <span>ส่งถึง</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="w-3 h-3 bg-red-500 rounded"></div>
                <span>ล้มเหลว</span>
              </div>
            </div>
          </div>

          <!-- Breakdown by Type -->
          <div class="bg-white rounded-xl shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">แยกตามประเภท</h3>
            
            <div v-if="topNotificationTypes.length === 0" class="text-center py-8 text-gray-500">
              ไม่มีข้อมูล
            </div>
            
            <div v-else class="space-y-3">
              <div
                v-for="item in topNotificationTypes"
                :key="item.type"
                class="flex items-center justify-between"
              >
                <div class="flex items-center gap-2">
                  <span class="text-xl">{{ getTypeIcon(item.type) }}</span>
                  <span class="text-sm text-gray-700">{{ item.type }}</span>
                </div>
                <span class="text-sm font-semibold text-gray-900">
                  {{ formatNumber(item.count) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Status Breakdown & Failure Reasons -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <!-- Status Breakdown -->
          <div class="bg-white rounded-xl shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">สถานะการส่ง</h3>
            
            <div v-if="statusBreakdown.length === 0" class="text-center py-8 text-gray-500">
              ไม่มีข้อมูล
            </div>
            
            <div v-else class="space-y-3">
              <div
                v-for="item in statusBreakdown"
                :key="item.status"
                class="flex items-center justify-between"
              >
                <span :class="['px-3 py-1 rounded-full text-xs font-medium', getStatusColor(item.status)]">
                  {{ item.label }}
                </span>
                <span class="text-sm font-semibold text-gray-900">
                  {{ formatNumber(item.count) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Failure Reasons -->
          <div class="bg-white rounded-xl shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">สาเหตุที่ล้มเหลว</h3>
            
            <div v-if="topFailureReasons.length === 0" class="text-center py-8 text-gray-500">
              ไม่มีข้อผิดพลาด 🎉
            </div>
            
            <div v-else class="space-y-3">
              <div
                v-for="item in topFailureReasons"
                :key="item.reason"
                class="flex items-center justify-between"
              >
                <span class="text-sm text-gray-700 truncate max-w-[200px]" :title="item.reason">
                  {{ item.reason }}
                </span>
                <span class="text-sm font-semibold text-red-600">
                  {{ formatNumber(item.count) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Logs -->
        <div class="bg-white rounded-xl shadow">
          <div class="px-6 py-4 border-b flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">ประวัติล่าสุด</h3>
            <button
              @click="showLogsModal = true"
              class="text-sm text-blue-600 hover:text-blue-700"
            >
              ดูทั้งหมด
            </button>
          </div>
          
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">เวลา</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ประเภท</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">หัวข้อ</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Latency</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="log in recentLogs.slice(0, 10)" :key="log.id" class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-sm text-gray-500">
                    {{ formatDate(log.sent_at) }}
                  </td>
                  <td class="px-4 py-3">
                    <span class="text-lg">{{ getTypeIcon(log.notification_type) }}</span>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate">
                    {{ log.title }}
                  </td>
                  <td class="px-4 py-3">
                    <span :class="['px-2 py-1 rounded-full text-xs font-medium', getStatusColor(log.status)]">
                      {{ log.status }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-500">
                    {{ formatLatency(log.latency_ms) }}
                  </td>
                </tr>
                
                <tr v-if="recentLogs.length === 0">
                  <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                    ไม่มีประวัติการส่ง
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
