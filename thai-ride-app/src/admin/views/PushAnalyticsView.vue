<script setup lang="ts">
/**
 * Push Analytics Dashboard - Clean Modern UI
 * Admin view for push notification analytics
 */
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { supabase } from '../../lib/supabase'

// Types
interface AnalyticsSummary {
  total_sent: number
  total_delivered: number
  total_failed: number
  delivery_rate: number
  avg_latency_ms: number | null
  by_type: Record<string, number>
  by_status: Record<string, number>
  failure_reasons: Record<string, number>
}

interface PushLog {
  id: string
  user_id: string | null
  notification_type: string
  title: string | null
  body: string | null
  status: string
  error_message: string | null
  latency_ms: number | null
  sent_at: string
  delivered_at: string | null
}

// State
const loading = ref(false)
const error = ref<string | null>(null)
const timeRange = ref<'24h' | '7d' | '30d'>('7d')

const summary = ref<AnalyticsSummary>({
  total_sent: 0,
  total_delivered: 0,
  total_failed: 0,
  delivery_rate: 0,
  avg_latency_ms: null,
  by_type: {},
  by_status: {},
  failure_reasons: {}
})

const recentLogs = ref<PushLog[]>([])
let refreshInterval: number | null = null

// Computed
const topNotificationTypes = computed(() => {
  return Object.entries(summary.value.by_type)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
})

const topFailureReasons = computed(() => {
  return Object.entries(summary.value.failure_reasons)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
})

// Load analytics
async function loadAnalytics() {
  loading.value = true
  error.value = null
  
  try {
    const now = new Date()
    const hoursAgo = timeRange.value === '24h' ? 24 : timeRange.value === '7d' ? 168 : 720
    const startTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)
    
    const { data: analyticsData, error: analyticsError } = await supabase
      .rpc('get_push_analytics', {
        p_start_date: startTime.toISOString(),
        p_end_date: now.toISOString()
      })
    
    if (analyticsError) throw analyticsError
    
    if (analyticsData && analyticsData.length > 0) {
      const data = analyticsData[0]
      summary.value = {
        total_sent: Number(data.total_sent) || 0,
        total_delivered: Number(data.total_delivered) || 0,
        total_failed: Number(data.total_failed) || 0,
        delivery_rate: Number(data.delivery_rate) || 0,
        avg_latency_ms: data.avg_latency_ms ? Number(data.avg_latency_ms) : null,
        by_type: data.by_type || {},
        by_status: data.by_status || {},
        failure_reasons: data.failure_reasons || {}
      }
    }
    
    const { data: logs, error: logsError } = await supabase
      .from('push_notification_logs')
      .select('*')
      .gte('sent_at', startTime.toISOString())
      .order('sent_at', { ascending: false })
      .limit(50)
    
    if (!logsError) {
      recentLogs.value = logs || []
    }
    
  } catch (err: any) {
    console.error('[PushAnalytics] Error:', err)
    error.value = err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
  } finally {
    loading.value = false
  }
}

// Format helpers
function formatNumber(num: number): string {
  return num?.toLocaleString('th-TH') || '0'
}

function formatPercent(num: number): string {
  return `${num?.toFixed(1) || '0'}%`
}

function formatLatency(ms: number | null): string {
  if (!ms) return '-'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    sent: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'รอส่ง',
    sent: 'ส่งแล้ว',
    delivered: 'ส่งถึง',
    failed: 'ล้มเหลว'
  }
  return labels[status] || status
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    new_job: 'งานใหม่',
    job_update: 'อัพเดทงาน',
    earnings: 'รายได้',
    promotions: 'โปรโมชั่น',
    system: 'ระบบ'
  }
  return labels[type] || type
}

async function handleTimeRangeChange(range: '24h' | '7d' | '30d') {
  timeRange.value = range
  await loadAnalytics()
}

// Lifecycle
onMounted(() => {
  loadAnalytics()
  refreshInterval = window.setInterval(() => {
    if (!loading.value) loadAnalytics()
  }, 60000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-semibold text-gray-900">Push Analytics</h1>
            <p class="mt-1 text-sm text-gray-500">สถิติการส่ง Push Notification</p>
          </div>
          
          <!-- Time Range Selector -->
          <div class="flex items-center gap-2">
            <div class="inline-flex rounded-lg border border-gray-300 bg-white p-1">
              <button
                v-for="range in ['24h', '7d', '30d']"
                :key="range"
                type="button"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                  timeRange === range
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                ]"
                @click="handleTimeRangeChange(range as any)"
              >
                {{ range === '24h' ? '24h' : range === '7d' ? '7d' : '30d' }}
              </button>
            </div>
            <button
              type="button"
              :disabled="loading"
              class="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
              @click="loadAnalytics"
              aria-label="รีเฟรช"
            >
              <svg class="w-5 h-5" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading State -->
      <div v-if="loading && summary.total_sent === 0" class="flex justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p class="mt-4 text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p class="text-sm text-red-700">{{ error }}</p>
        <button
          type="button"
          class="mt-4 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          @click="loadAnalytics"
        >
          ลองใหม่
        </button>
      </div>

      <template v-else>
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <!-- Total Sent -->
          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-600">ส่งทั้งหมด</p>
                <p class="mt-2 text-3xl font-semibold text-gray-900">
                  {{ formatNumber(summary.total_sent) }}
                </p>
              </div>
              <div class="flex-shrink-0">
                <div class="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Total Delivered -->
          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-600">ส่งถึง</p>
                <p class="mt-2 text-3xl font-semibold text-green-600">
                  {{ formatNumber(summary.total_delivered) }}
                </p>
              </div>
              <div class="flex-shrink-0">
                <div class="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Total Failed -->
          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-600">ล้มเหลว</p>
                <p class="mt-2 text-3xl font-semibold text-red-600">
                  {{ formatNumber(summary.total_failed) }}
                </p>
              </div>
              <div class="flex-shrink-0">
                <div class="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Delivery Rate -->
          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-600">อัตราส่งถึง</p>
                <p class="mt-2 text-3xl font-semibold text-gray-900">
                  {{ formatPercent(summary.delivery_rate) }}
                </p>
                <p class="mt-1 text-xs text-gray-500">
                  เฉลี่ย {{ formatLatency(summary.avg_latency_ms) }}
                </p>
              </div>
              <div class="flex-shrink-0">
                <div class="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Analytics Breakdown -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <!-- Top Notification Types -->
          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <h3 class="text-base font-semibold text-gray-900 mb-4">ประเภทการแจ้งเตือน</h3>
            <div v-if="topNotificationTypes.length > 0" class="space-y-4">
              <div v-for="item in topNotificationTypes" :key="item.type">
                <div class="flex items-center justify-between text-sm mb-1">
                  <span class="font-medium text-gray-700">{{ getTypeLabel(item.type) }}</span>
                  <span class="text-gray-500">{{ formatNumber(item.count) }}</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    :style="{ width: `${(item.count / summary.total_sent) * 100}%` }"
                  ></div>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8 text-sm text-gray-500">
              ไม่มีข้อมูล
            </div>
          </div>

          <!-- Top Failure Reasons -->
          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <h3 class="text-base font-semibold text-gray-900 mb-4">สาเหตุการล้มเหลว</h3>
            <div v-if="topFailureReasons.length > 0" class="space-y-4">
              <div v-for="item in topFailureReasons" :key="item.reason">
                <div class="flex items-center justify-between text-sm mb-1">
                  <span class="font-medium text-gray-700 truncate flex-1">{{ item.reason }}</span>
                  <span class="text-gray-500 ml-2">{{ formatNumber(item.count) }}</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2">
                  <div 
                    class="bg-red-600 h-2 rounded-full transition-all duration-300" 
                    :style="{ width: `${(item.count / summary.total_failed) * 100}%` }"
                  ></div>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8 text-sm text-gray-500">
              ไม่มีข้อผิดพลาด 🎉
            </div>
          </div>
        </div>

        <!-- Recent Logs -->
        <div class="bg-white rounded-lg border border-gray-200">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-base font-semibold text-gray-900">
              ประวัติล่าสุด
              <span class="ml-2 text-sm font-normal text-gray-500">({{ recentLogs.length }} รายการ)</span>
            </h3>
          </div>
          
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-200">
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เวลา</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ประเภท</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หัวข้อ</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latency</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="log in recentLogs.slice(0, 20)" :key="log.id" class="hover:bg-gray-50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ formatDate(log.sent_at) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ getTypeLabel(log.notification_type) }}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {{ log.title || '-' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', getStatusColor(log.status)]">
                      {{ getStatusLabel(log.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ formatLatency(log.latency_ms) }}
                  </td>
                  <td class="px-6 py-4 text-sm text-red-600 max-w-xs truncate">
                    {{ log.error_message || '-' }}
                  </td>
                </tr>
                
                <tr v-if="recentLogs.length === 0">
                  <td colspan="6" class="px-6 py-12 text-center text-sm text-gray-500">
                    ไม่มีประวัติการส่ง Push Notification ในช่วงเวลานี้
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
