<script setup lang="ts">
/**
 * Push Analytics Dashboard (Production Ready)
 * Admin view for push notification analytics
 */
import { onMounted, ref } from 'vue'

// State
const loading = ref(false)
const error = ref<string | null>(null)
const timeRange = ref<'24h' | '7d' | '30d'>('24h')

// Summary data
const summary = ref({
  total_sent: 0,
  total_delivered: 0,
  total_failed: 0,
  delivery_rate: 0,
  avg_latency_ms: 0
})

// Recent logs
const recentLogs = ref<any[]>([])

// Load analytics data
async function loadAnalytics() {
  loading.value = true
  error.value = null
  
  try {
    const { supabase } = await import('../../lib/supabase')
    
    // Calculate time range
    const now = new Date()
    const hoursAgo = timeRange.value === '24h' ? 24 : timeRange.value === '7d' ? 168 : 720
    const startTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)
    
    // Load push notification logs
    const { data: logs, error: logsError } = await supabase
      .from('push_notification_logs')
      .select('*')
      .gte('sent_at', startTime.toISOString())
      .order('sent_at', { ascending: false })
      .limit(100)
    
    if (logsError) throw logsError
    
    // Calculate summary
    const totalSent = logs?.length || 0
    const totalDelivered = logs?.filter(l => l.status === 'delivered').length || 0
    const totalFailed = logs?.filter(l => l.status === 'failed').length || 0
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0
    
    // Calculate average latency
    const latencies = logs?.filter(l => l.latency_ms).map(l => l.latency_ms) || []
    const avgLatency = latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
      : 0
    
    summary.value = {
      total_sent: totalSent,
      total_delivered: totalDelivered,
      total_failed: totalFailed,
      delivery_rate: deliveryRate,
      avg_latency_ms: avgLatency
    }
    
    recentLogs.value = logs || []
    
  } catch (err: any) {
    console.error('[PushAnalytics] Error loading data:', err)
    error.value = err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
  } finally {
    loading.value = false
  }
}

// Format helpers
function formatNumber(num: number): string {
  return num?.toLocaleString() || '0'
}

function formatPercent(num: number): string {
  return `${num?.toFixed(1) || '0'}%`
}

function formatLatency(ms: number | null): string {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
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

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    new_job: '🔔',
    job_update: '📋',
    earnings: '💰',
    promotions: '🎁',
    system: '📢'
  }
  return icons[type] || '📨'
}

async function handleTimeRangeChange(range: '24h' | '7d' | '30d') {
  timeRange.value = range
  await loadAnalytics()
}

onMounted(() => {
  loadAnalytics()
  
  // Auto-refresh every 60 seconds
  const interval = setInterval(() => {
    loadAnalytics()
  }, 60000)
  
  return () => clearInterval(interval)
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b">
      <div class="px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">📊 Push Analytics</h1>
            <p class="text-gray-600 mt-1">สถิติการส่ง Push Notification</p>
          </div>
          
          <!-- Time Range Selector -->
          <div class="flex gap-2">
            <button
              v-for="range in ['24h', '7d', '30d']"
              :key="range"
              :class="[
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
              @click="handleTimeRangeChange(range as any)"
            >
              {{ range === '24h' ? '24 ชั่วโมง' : range === '7d' ? '7 วัน' : '30 วัน' }}
            </button>
            <button
              :disabled="loading"
              class="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              @click="loadAnalytics"
            >
              <svg class="w-5 h-5" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="px-6 py-6">
      <!-- Loading State -->
      <div v-if="loading && summary.total_sent === 0" class="flex justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p class="text-red-700">{{ error }}</p>
        <button
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          @click="loadAnalytics"
        >
          ลองใหม่
        </button>
      </div>

      <template v-else>
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="bg-white rounded-xl shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">ส่งทั้งหมด</p>
                <p class="text-3xl font-bold text-gray-900">
                  {{ formatNumber(summary.total_sent) }}
                </p>
              </div>
              <div class="p-3 bg-blue-100 rounded-full">
                <span class="text-2xl">📤</span>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">ส่งถึง</p>
                <p class="text-3xl font-bold text-green-600">
                  {{ formatNumber(summary.total_delivered) }}
                </p>
              </div>
              <div class="p-3 bg-green-100 rounded-full">
                <span class="text-2xl">✅</span>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">ล้มเหลว</p>
                <p class="text-3xl font-bold text-red-600">
                  {{ formatNumber(summary.total_failed) }}
                </p>
              </div>
              <div class="p-3 bg-red-100 rounded-full">
                <span class="text-2xl">❌</span>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">อัตราส่งถึง</p>
                <p class="text-3xl font-bold text-blue-600">
                  {{ formatPercent(summary.delivery_rate) }}
                </p>
              </div>
              <div class="p-3 bg-blue-100 rounded-full">
                <span class="text-2xl">📊</span>
              </div>
            </div>
            <p class="mt-2 text-sm text-gray-500">
              เฉลี่ย {{ formatLatency(summary.avg_latency_ms) }}
            </p>
          </div>
        </div>

        <!-- Recent Logs -->
        <div class="bg-white rounded-xl shadow">
          <div class="px-6 py-4 border-b">
            <h3 class="text-lg font-semibold text-gray-900">ประวัติล่าสุด</h3>
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
                <tr v-for="log in recentLogs.slice(0, 20)" :key="log.id" class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-sm text-gray-500">
                    {{ formatDate(log.sent_at) }}
                  </td>
                  <td class="px-4 py-3">
                    <span class="text-lg">{{ getTypeIcon(log.notification_type) }}</span>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                    {{ log.title || '-' }}
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
                    ไม่มีประวัติการส่ง Push Notification
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Info Box -->
        <div class="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p class="text-sm text-blue-800">
            💡 <strong>หมายเหตุ:</strong> ข้อมูลอัพเดทอัตโนมัติทุก 60 วินาที
          </p>
        </div>
      </template>
    </div>
  </div>
</template>
