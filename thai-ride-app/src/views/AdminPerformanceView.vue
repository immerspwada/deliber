<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-gray-900">Performance Dashboard</h1>
          <p class="text-sm text-gray-500">ตรวจสอบประสิทธิภาพระบบ</p>
        </div>
        <button
          @click="refreshAll"
          class="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          รีเฟรช
        </button>
      </div>
    </div>

    <div class="p-6 space-y-6">
      <!-- Quick Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-2xl p-4 border border-gray-100">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-500">Memory Usage</p>
              <p class="text-lg font-bold text-gray-900">{{ formatBytes(stats.usedJSHeapSize) }}</p>
              <p class="text-xs" :class="stats.memoryUsagePercent > 80 ? 'text-red-500' : 'text-green-500'">
                {{ stats.memoryUsagePercent.toFixed(1) }}%
              </p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-4 border border-gray-100">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-500">Page Load</p>
              <p class="text-lg font-bold text-gray-900">{{ formatDuration(stats.pageLoadTime) }}</p>
              <p class="text-xs text-gray-400">DOM: {{ formatDuration(stats.domContentLoaded) }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-4 border border-gray-100">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-500">API Calls</p>
              <p class="text-lg font-bold text-gray-900">{{ stats.apiCallCount }}</p>
              <p class="text-xs text-gray-400">Avg: {{ formatDuration(getAverageApiTime) }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-4 border border-gray-100">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <div>
              <p class="text-xs text-gray-500">Cache Hit Rate</p>
              <p class="text-lg font-bold text-gray-900">{{ stats.cacheHitRate.toFixed(1) }}%</p>
              <p class="text-xs text-gray-400">{{ stats.requestCount }} requests</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Core Web Vitals -->
      <div class="bg-white rounded-2xl p-6 border border-gray-100">
        <h2 class="text-lg font-bold text-gray-900 mb-4">Core Web Vitals</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-4 bg-gray-50 rounded-xl">
            <p class="text-xs text-gray-500 mb-1">FCP</p>
            <p class="text-2xl font-bold" :class="getVitalColor(stats.firstContentfulPaint, 1800, 3000)">
              {{ formatDuration(stats.firstContentfulPaint) }}
            </p>
            <p class="text-xs text-gray-400">First Contentful Paint</p>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-xl">
            <p class="text-xs text-gray-500 mb-1">LCP</p>
            <p class="text-2xl font-bold" :class="getVitalColor(metrics.lcp || 0, 2500, 4000)">
              {{ formatDuration(metrics.lcp || 0) }}
            </p>
            <p class="text-xs text-gray-400">Largest Contentful Paint</p>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-xl">
            <p class="text-xs text-gray-500 mb-1">FID</p>
            <p class="text-2xl font-bold" :class="getVitalColor(metrics.fid || 0, 100, 300)">
              {{ formatDuration(metrics.fid || 0) }}
            </p>
            <p class="text-xs text-gray-400">First Input Delay</p>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-xl">
            <p class="text-xs text-gray-500 mb-1">CLS</p>
            <p class="text-2xl font-bold" :class="getVitalColor((metrics.cls || 0) * 1000, 100, 250)">
              {{ (metrics.cls || 0).toFixed(3) }}
            </p>
            <p class="text-xs text-gray-400">Cumulative Layout Shift</p>
          </div>
        </div>
      </div>

      <!-- Network & Storage -->
      <div class="grid md:grid-cols-2 gap-6">
        <!-- Network Status -->
        <div class="bg-white rounded-2xl p-6 border border-gray-100">
          <h2 class="text-lg font-bold text-gray-900 mb-4">Network Status</h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Connection</span>
              <span class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" :class="isOnline ? 'bg-green-500' : 'bg-red-500'"></span>
                {{ isOnline ? 'Online' : 'Offline' }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Effective Type</span>
              <span class="font-medium">{{ effectiveType }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Downlink</span>
              <span class="font-medium">{{ downlink }} Mbps</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600">RTT</span>
              <span class="font-medium">{{ rtt }} ms</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Data Saver</span>
              <span :class="saveData ? 'text-orange-500' : 'text-gray-500'">
                {{ saveData ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Storage Quota -->
        <div class="bg-white rounded-2xl p-6 border border-gray-100">
          <h2 class="text-lg font-bold text-gray-900 mb-4">Storage Quota</h2>
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-sm mb-2">
                <span class="text-gray-600">Used</span>
                <span class="font-medium">{{ formatBytes(storageUsage) }} / {{ formatBytes(storageQuota) }}</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-3">
                <div 
                  class="h-3 rounded-full transition-all"
                  :class="storagePercentage > 80 ? 'bg-red-500' : storagePercentage > 50 ? 'bg-yellow-500' : 'bg-green-500'"
                  :style="{ width: `${Math.min(storagePercentage, 100)}%` }"
                ></div>
              </div>
              <p class="text-xs text-gray-400 mt-1">{{ storagePercentage.toFixed(1) }}% used</p>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Persistence</span>
              <span :class="isPersisted ? 'text-green-500' : 'text-gray-500'">
                {{ isPersisted ? 'Granted' : 'Not Granted' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Slowest API Calls -->
      <div class="bg-white rounded-2xl p-6 border border-gray-100">
        <h2 class="text-lg font-bold text-gray-900 mb-4">Slowest API Calls</h2>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-left text-xs text-gray-500 border-b">
                <th class="pb-3 font-medium">URL</th>
                <th class="pb-3 font-medium">Method</th>
                <th class="pb-3 font-medium">Duration</th>
                <th class="pb-3 font-medium">Status</th>
                <th class="pb-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody class="text-sm">
              <tr v-for="call in getSlowestApiCalls" :key="call.timestamp" class="border-b border-gray-50">
                <td class="py-3 max-w-xs truncate">{{ call.url }}</td>
                <td class="py-3">
                  <span class="px-2 py-1 text-xs rounded-lg" :class="getMethodColor(call.method)">
                    {{ call.method }}
                  </span>
                </td>
                <td class="py-3 font-mono" :class="call.duration > 1000 ? 'text-red-500' : 'text-gray-900'">
                  {{ formatDuration(call.duration) }}
                </td>
                <td class="py-3">
                  <span :class="call.status >= 400 ? 'text-red-500' : 'text-green-500'">
                    {{ call.status }}
                  </span>
                </td>
                <td class="py-3 text-gray-400">{{ formatTime(call.timestamp) }}</td>
              </tr>
              <tr v-if="getSlowestApiCalls.length === 0">
                <td colspan="5" class="py-8 text-center text-gray-400">ยังไม่มีข้อมูล API calls</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Performance Tips -->
      <div class="bg-white rounded-2xl p-6 border border-gray-100">
        <h2 class="text-lg font-bold text-gray-900 mb-4">Performance Tips</h2>
        <div class="space-y-3">
          <div v-for="tip in performanceTips" :key="tip.id" class="flex items-start gap-3 p-3 rounded-xl" :class="tip.type === 'warning' ? 'bg-yellow-50' : tip.type === 'error' ? 'bg-red-50' : 'bg-green-50'">
            <div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" :class="tip.type === 'warning' ? 'bg-yellow-100' : tip.type === 'error' ? 'bg-red-100' : 'bg-green-100'">
              <svg v-if="tip.type === 'success'" class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else class="w-4 h-4" :class="tip.type === 'warning' ? 'text-yellow-600' : 'text-red-600'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">{{ tip.title }}</p>
              <p class="text-sm text-gray-600">{{ tip.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePerformanceDashboard, useNetworkStatus, useStorageQuota, usePerformanceMetrics } from '../composables/usePerformance'

const { 
  stats, 
  collectAll, 
  getAverageApiTime, 
  getSlowestApiCalls,
  formatBytes,
  formatDuration 
} = usePerformanceDashboard()

const { 
  isOnline, 
  effectiveType, 
  downlink, 
  rtt, 
  saveData 
} = useNetworkStatus()

const { 
  quota: storageQuota, 
  usage: storageUsage, 
  percentage: storagePercentage,
  isPersisted: _isPersistedRef
} = useStorageQuota()
void _isPersistedRef // Reserved for future use

const { metrics } = usePerformanceMetrics()

const isPersisted = ref(false)

onMounted(async () => {
  const { isPersisted: checkPersisted } = useStorageQuota()
  isPersisted.value = await checkPersisted()
})

const refreshAll = () => {
  collectAll()
}

const getVitalColor = (value: number, good: number, poor: number) => {
  if (value <= good) return 'text-green-500'
  if (value <= poor) return 'text-yellow-500'
  return 'text-red-500'
}

const getMethodColor = (method: string) => {
  const colors: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-700',
    POST: 'bg-green-100 text-green-700',
    PUT: 'bg-yellow-100 text-yellow-700',
    PATCH: 'bg-orange-100 text-orange-700',
    DELETE: 'bg-red-100 text-red-700'
  }
  return colors[method] || 'bg-gray-100 text-gray-700'
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('th-TH')
}

const performanceTips = computed(() => {
  const tips: Array<{ id: string; type: 'success' | 'warning' | 'error'; title: string; description: string }> = []

  // Memory check
  if (stats.value.memoryUsagePercent > 80) {
    tips.push({
      id: 'memory',
      type: 'error',
      title: 'Memory Usage สูง',
      description: 'ควรพิจารณา clear cache หรือ reload หน้า'
    })
  } else if (stats.value.memoryUsagePercent > 50) {
    tips.push({
      id: 'memory',
      type: 'warning',
      title: 'Memory Usage ปานกลาง',
      description: 'ยังอยู่ในเกณฑ์ปกติ แต่ควรติดตาม'
    })
  } else {
    tips.push({
      id: 'memory',
      type: 'success',
      title: 'Memory Usage ดี',
      description: 'การใช้หน่วยความจำอยู่ในเกณฑ์ดี'
    })
  }

  // Page load check
  if (stats.value.pageLoadTime > 3000) {
    tips.push({
      id: 'pageload',
      type: 'error',
      title: 'Page Load ช้า',
      description: 'ควรพิจารณา optimize assets และ lazy loading'
    })
  } else if (stats.value.pageLoadTime > 1500) {
    tips.push({
      id: 'pageload',
      type: 'warning',
      title: 'Page Load ปานกลาง',
      description: 'ยังมีโอกาสปรับปรุงได้'
    })
  }

  // Network check
  if (!isOnline.value) {
    tips.push({
      id: 'network',
      type: 'error',
      title: 'Offline',
      description: 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต'
    })
  } else if (effectiveType.value === '2g' || effectiveType.value === 'slow-2g') {
    tips.push({
      id: 'network',
      type: 'warning',
      title: 'Connection ช้า',
      description: 'ควรใช้ data saver mode'
    })
  }

  // Storage check
  if (storagePercentage.value > 80) {
    tips.push({
      id: 'storage',
      type: 'warning',
      title: 'Storage ใกล้เต็ม',
      description: 'ควรพิจารณา clear cache'
    })
  }

  return tips
})
</script>
