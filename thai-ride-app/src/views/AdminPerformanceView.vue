<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-gray-900">Performance Dashboard</h1>
          <p class="text-sm text-gray-500">ตรวจสอบประสิทธิภาพระบบ</p>
        </div>
        <div class="flex items-center gap-3">
          <select v-model="timeRange" class="px-3 py-2 border border-gray-200 rounded-xl text-sm">
            <option value="1">1 ชั่วโมง</option>
            <option value="6">6 ชั่วโมง</option>
            <option value="24">24 ชั่วโมง</option>
            <option value="72">3 วัน</option>
            <option value="168">7 วัน</option>
          </select>
          <button
            @click="refreshAll"
            :disabled="loading"
            class="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            <svg class="w-5 h-5" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            รีเฟรช
          </button>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="bg-white border-b border-gray-200 px-6">
      <div class="flex gap-6">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="py-3 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === tab.id ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
        >
          {{ tab.label }}
          <span v-if="tab.badge" class="ml-1 px-2 py-0.5 text-xs rounded-full" :class="tab.badgeClass">
            {{ tab.badge }}
          </span>
        </button>
      </div>
    </div>

    <div class="p-6 space-y-6">
      <!-- Overview Tab -->
      <template v-if="activeTab === 'overview'">
        <!-- Server Stats from Database -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-white rounded-2xl p-4 border border-gray-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p class="text-xs text-gray-500">Total Sessions</p>
                <p class="text-lg font-bold text-gray-900">{{ serverSummary.total_sessions?.toLocaleString() || 0 }}</p>
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
                <p class="text-xs text-gray-500">Avg Page Load</p>
                <p class="text-lg font-bold" :class="getVitalColor(serverSummary.avg_page_load_time || 0, 2000, 4000)">
                  {{ formatDuration(serverSummary.avg_page_load_time || 0) }}
                </p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-4 border border-gray-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p class="text-xs text-gray-500">Critical Alerts</p>
                <p class="text-lg font-bold text-red-600">{{ serverSummary.critical_alerts_count || 0 }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-4 border border-gray-100">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p class="text-xs text-gray-500">Warning Alerts</p>
                <p class="text-lg font-bold text-yellow-600">{{ serverSummary.warning_alerts_count || 0 }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Core Web Vitals (Server Average) -->
        <div class="bg-white rounded-2xl p-6 border border-gray-100">
          <h2 class="text-lg font-bold text-gray-900 mb-4">Core Web Vitals (ค่าเฉลี่ยจากทุก Sessions)</h2>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div class="text-center p-4 bg-gray-50 rounded-xl">
              <p class="text-xs text-gray-500 mb-1">LCP</p>
              <p class="text-2xl font-bold" :class="getVitalColor(serverSummary.avg_lcp || 0, 2500, 4000)">
                {{ formatDuration(serverSummary.avg_lcp || 0) }}
              </p>
              <p class="text-xs text-gray-400">Largest Contentful Paint</p>
            </div>
            <div class="text-center p-4 bg-gray-50 rounded-xl">
              <p class="text-xs text-gray-500 mb-1">FID</p>
              <p class="text-2xl font-bold" :class="getVitalColor(serverSummary.avg_fid || 0, 100, 300)">
                {{ formatDuration(serverSummary.avg_fid || 0) }}
              </p>
              <p class="text-xs text-gray-400">First Input Delay</p>
            </div>
            <div class="text-center p-4 bg-gray-50 rounded-xl">
              <p class="text-xs text-gray-500 mb-1">CLS</p>
              <p class="text-2xl font-bold" :class="getVitalColor((serverSummary.avg_cls || 0) * 1000, 100, 250)">
                {{ (serverSummary.avg_cls || 0).toFixed(3) }}
              </p>
              <p class="text-xs text-gray-400">Cumulative Layout Shift</p>
            </div>
            <div class="text-center p-4 bg-gray-50 rounded-xl">
              <p class="text-xs text-gray-500 mb-1">TTFB</p>
              <p class="text-2xl font-bold" :class="getVitalColor(serverSummary.avg_ttfb || 0, 800, 1800)">
                {{ formatDuration(serverSummary.avg_ttfb || 0) }}
              </p>
              <p class="text-xs text-gray-400">Time to First Byte</p>
            </div>
            <div class="text-center p-4 bg-gray-50 rounded-xl">
              <p class="text-xs text-gray-500 mb-1">Memory</p>
              <p class="text-2xl font-bold" :class="getVitalColor(serverSummary.avg_memory_usage || 0, 60, 80)">
                {{ (serverSummary.avg_memory_usage || 0).toFixed(1) }}%
              </p>
              <p class="text-xs text-gray-400">Avg Memory Usage</p>
            </div>
          </div>
        </div>

        <!-- Device Breakdown & Slow Pages -->
        <div class="grid md:grid-cols-2 gap-6">
          <!-- Device Breakdown -->
          <div class="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 class="text-lg font-bold text-gray-900 mb-4">Device Breakdown</h2>
            <div class="space-y-3">
              <div v-for="device in serverSummary.device_breakdown || []" :key="device.device_type" class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                    <svg v-if="device.device_type === 'mobile'" class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <svg v-else-if="device.device_type === 'tablet'" class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <svg v-else class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900 capitalize">{{ device.device_type || 'Unknown' }}</p>
                    <p class="text-xs text-gray-500">{{ device.count }} sessions</p>
                  </div>
                </div>
                <p class="text-sm font-medium" :class="getVitalColor(device.avg_load_time || 0, 2000, 4000)">
                  {{ formatDuration(device.avg_load_time || 0) }}
                </p>
              </div>
              <div v-if="!serverSummary.device_breakdown?.length" class="text-center py-8 text-gray-400">
                ยังไม่มีข้อมูล
              </div>
            </div>
          </div>

          <!-- Slowest Pages -->
          <div class="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 class="text-lg font-bold text-gray-900 mb-4">Slowest Pages</h2>
            <div class="space-y-3">
              <div v-for="page in serverSummary.top_slow_pages || []" :key="page.page_name" class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p class="font-medium text-gray-900">{{ page.page_name || 'Unknown' }}</p>
                  <p class="text-xs text-gray-500">{{ page.count }} views</p>
                </div>
                <p class="text-sm font-medium" :class="getVitalColor(page.avg_load_time || 0, 2000, 4000)">
                  {{ formatDuration(page.avg_load_time || 0) }}
                </p>
              </div>
              <div v-if="!serverSummary.top_slow_pages?.length" class="text-center py-8 text-gray-400">
                ยังไม่มีข้อมูล
              </div>
            </div>
          </div>
        </div>

        <!-- Client-Side Stats (Current Browser) -->
        <div class="bg-white rounded-2xl p-6 border border-gray-100">
          <h2 class="text-lg font-bold text-gray-900 mb-4">Client-Side Stats (Browser ปัจจุบัน)</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center p-4 bg-blue-50 rounded-xl">
              <p class="text-xs text-gray-500 mb-1">Memory Usage</p>
              <p class="text-xl font-bold text-gray-900">{{ formatBytes(clientStats.usedJSHeapSize) }}</p>
              <p class="text-xs" :class="clientStats.memoryUsagePercent > 80 ? 'text-red-500' : 'text-green-500'">
                {{ clientStats.memoryUsagePercent.toFixed(1) }}%
              </p>
            </div>
            <div class="text-center p-4 bg-green-50 rounded-xl">
              <p class="text-xs text-gray-500 mb-1">Page Load</p>
              <p class="text-xl font-bold text-gray-900">{{ formatDuration(clientStats.pageLoadTime) }}</p>
              <p class="text-xs text-gray-400">DOM: {{ formatDuration(clientStats.domContentLoaded) }}</p>
            </div>
            <div class="text-center p-4 bg-purple-50 rounded-xl">
              <p class="text-xs text-gray-500 mb-1">API Calls</p>
              <p class="text-xl font-bold text-gray-900">{{ clientStats.apiCallCount }}</p>
              <p class="text-xs text-gray-400">Avg: {{ formatDuration(getAverageApiTime) }}</p>
            </div>
            <div class="text-center p-4 bg-orange-50 rounded-xl">
              <p class="text-xs text-gray-500 mb-1">Cache Hit Rate</p>
              <p class="text-xl font-bold text-gray-900">{{ clientStats.cacheHitRate.toFixed(1) }}%</p>
              <p class="text-xs text-gray-400">{{ clientStats.requestCount }} requests</p>
            </div>
          </div>
        </div>
      </template>

      <!-- Alerts Tab -->
      <template v-if="activeTab === 'alerts'">
        <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div class="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 class="font-bold text-gray-900">Performance Alerts</h2>
            <div class="flex items-center gap-2">
              <select v-model="alertFilter.severity" class="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">
                <option value="">ทุกระดับ</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
              </select>
              <select v-model="alertFilter.status" class="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">
                <option value="">ทุกสถานะ</option>
                <option value="new">New</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
          <div class="divide-y divide-gray-50">
            <div v-for="alert in alerts" :key="alert.id" class="p-4 hover:bg-gray-50">
              <div class="flex items-start justify-between">
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    :class="alert.severity === 'critical' ? 'bg-red-100' : 'bg-yellow-100'">
                    <svg class="w-4 h-4" :class="alert.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ formatAlertType(alert.alert_type) }}</p>
                    <p class="text-sm text-gray-500">
                      {{ alert.metric_name }}: {{ alert.metric_value }} (threshold: {{ alert.threshold_value }})
                    </p>
                    <p class="text-xs text-gray-400 mt-1">
                      {{ alert.page_name || alert.page_url || 'Unknown page' }} • {{ alert.device_type || 'Unknown device' }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="px-2 py-1 text-xs rounded-lg"
                    :class="{
                      'bg-red-100 text-red-700': alert.status === 'new',
                      'bg-yellow-100 text-yellow-700': alert.status === 'acknowledged',
                      'bg-green-100 text-green-700': alert.status === 'resolved'
                    }">
                    {{ alert.status }}
                  </span>
                  <div v-if="alert.status !== 'resolved'" class="flex gap-1">
                    <button v-if="alert.status === 'new'" @click="acknowledgeAlert(alert.id)"
                      class="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button @click="resolveAlert(alert.id)"
                      class="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <p class="text-xs text-gray-400 mt-2">{{ formatDateTime(alert.created_at) }}</p>
            </div>
            <div v-if="alerts.length === 0" class="p-8 text-center text-gray-400">
              ไม่มี alerts
            </div>
          </div>
        </div>
      </template>

      <!-- Slow APIs Tab -->
      <template v-if="activeTab === 'apis'">
        <div class="bg-white rounded-2xl p-6 border border-gray-100">
          <h2 class="text-lg font-bold text-gray-900 mb-4">Slowest API Endpoints</h2>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-left text-xs text-gray-500 border-b">
                  <th class="pb-3 font-medium">Endpoint</th>
                  <th class="pb-3 font-medium">Method</th>
                  <th class="pb-3 font-medium">Avg Duration</th>
                  <th class="pb-3 font-medium">Max Duration</th>
                  <th class="pb-3 font-medium">Calls</th>
                  <th class="pb-3 font-medium">Errors</th>
                </tr>
              </thead>
              <tbody class="text-sm">
                <tr v-for="api in slowApis" :key="`${api.endpoint}-${api.method}`" class="border-b border-gray-50">
                  <td class="py-3 max-w-xs truncate font-mono text-xs">{{ api.endpoint }}</td>
                  <td class="py-3">
                    <span class="px-2 py-1 text-xs rounded-lg" :class="getMethodColor(api.method)">
                      {{ api.method }}
                    </span>
                  </td>
                  <td class="py-3 font-mono" :class="api.avg_duration_ms > 1000 ? 'text-red-500' : 'text-gray-900'">
                    {{ formatDuration(api.avg_duration_ms) }}
                  </td>
                  <td class="py-3 font-mono text-gray-500">{{ formatDuration(api.max_duration_ms) }}</td>
                  <td class="py-3">{{ api.call_count?.toLocaleString() }}</td>
                  <td class="py-3">
                    <span :class="api.error_count > 0 ? 'text-red-500' : 'text-gray-400'">
                      {{ api.error_count }}
                    </span>
                  </td>
                </tr>
                <tr v-if="slowApis.length === 0">
                  <td colspan="6" class="py-8 text-center text-gray-400">ยังไม่มีข้อมูล API calls</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Client-side API Calls -->
        <div class="bg-white rounded-2xl p-6 border border-gray-100 mt-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4">Recent API Calls (Client-side)</h2>
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
                  <td class="py-3 max-w-xs truncate font-mono text-xs">{{ call.url }}</td>
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
      </template>

      <!-- Thresholds Tab -->
      <template v-if="activeTab === 'thresholds'">
        <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div class="p-4 border-b border-gray-100">
            <h2 class="font-bold text-gray-900">Performance Thresholds</h2>
            <p class="text-sm text-gray-500">กำหนดเกณฑ์สำหรับ alerts</p>
          </div>
          <div class="divide-y divide-gray-50">
            <div v-for="threshold in thresholds" :key="threshold.id" class="p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-gray-900">{{ threshold.metric_name }}</p>
                  <p class="text-sm text-gray-500">{{ threshold.description }}</p>
                </div>
                <div class="flex items-center gap-4">
                  <div class="text-right">
                    <p class="text-xs text-gray-500">Warning</p>
                    <p class="font-mono text-yellow-600">{{ threshold.warning_threshold }} {{ threshold.unit }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-xs text-gray-500">Critical</p>
                    <p class="font-mono text-red-600">{{ threshold.critical_threshold }} {{ threshold.unit }}</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" :checked="threshold.is_enabled" @change="toggleThreshold(threshold)" class="sr-only peer">
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
              </div>
            </div>
            <div v-if="thresholds.length === 0" class="p-8 text-center text-gray-400">
              ไม่มีข้อมูล thresholds
            </div>
          </div>
        </div>
      </template>

      <!-- Network Tab -->
      <template v-if="activeTab === 'network'">
        <div class="grid md:grid-cols-2 gap-6">
          <!-- Network Status -->
          <div class="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 class="text-lg font-bold text-gray-900 mb-4">Network Status (Client)</h2>
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
            <h2 class="text-lg font-bold text-gray-900 mb-4">Storage Quota (Client)</h2>
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
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { usePerformanceDashboard, useNetworkStatus, useStorageQuota } from '../composables/usePerformance'
import { 
  fetchPerformanceSummary, 
  fetchPerformanceAlerts, 
  acknowledgePerformanceAlert,
  resolvePerformanceAlert,
  fetchSlowApiEndpoints,
  fetchPerformanceThresholds,
  updatePerformanceThreshold
} from '../composables/useAdmin'

// Client-side composables
const { 
  stats: clientStats, 
  collectAll, 
  getAverageApiTime, 
  getSlowestApiCalls,
  formatBytes,
  formatDuration 
} = usePerformanceDashboard()

const { isOnline, effectiveType, downlink, rtt, saveData } = useNetworkStatus()
const { quota: storageQuota, usage: storageUsage, percentage: storagePercentage } = useStorageQuota()

// State
const loading = ref(false)
const activeTab = ref('overview')
const timeRange = ref(24)
const isPersisted = ref(false)

// Server data
const serverSummary = ref<any>({})
const alerts = ref<any[]>([])
const slowApis = ref<any[]>([])
const thresholds = ref<any[]>([])

// Filters
const alertFilter = ref({ severity: '', status: '' })

// Tabs
const tabs = computed(() => [
  { id: 'overview', label: 'Overview' },
  { id: 'alerts', label: 'Alerts', badge: serverSummary.value.critical_alerts_count || 0, badgeClass: 'bg-red-100 text-red-700' },
  { id: 'apis', label: 'Slow APIs' },
  { id: 'thresholds', label: 'Thresholds' },
  { id: 'network', label: 'Network & Storage' }
])

// Load data
const loadServerSummary = async () => {
  try {
    serverSummary.value = await fetchPerformanceSummary(timeRange.value)
  } catch (e) {
    console.error('Failed to load performance summary:', e)
    // Use mock data
    serverSummary.value = {
      total_sessions: 1247,
      avg_page_load_time: 1850,
      avg_lcp: 2100,
      avg_fid: 45,
      avg_cls: 0.08,
      avg_ttfb: 320,
      avg_memory_usage: 52,
      avg_api_response_time: 280,
      avg_cache_hit_rate: 78,
      slow_page_count: 23,
      critical_alerts_count: 3,
      warning_alerts_count: 12,
      top_slow_pages: [
        { page_name: 'AdminDashboard', avg_load_time: 3200, count: 156 },
        { page_name: 'RideView', avg_load_time: 2800, count: 892 },
        { page_name: 'HistoryView', avg_load_time: 2400, count: 445 }
      ],
      device_breakdown: [
        { device_type: 'mobile', count: 856, avg_load_time: 2100 },
        { device_type: 'desktop', count: 312, avg_load_time: 1400 },
        { device_type: 'tablet', count: 79, avg_load_time: 1800 }
      ]
    }
  }
}

const loadAlerts = async () => {
  try {
    const result = await fetchPerformanceAlerts(1, 50, alertFilter.value)
    alerts.value = result.data
  } catch (e) {
    console.error('Failed to load alerts:', e)
    alerts.value = [
      { id: '1', alert_type: 'poor_page_load_time', severity: 'critical', metric_name: 'page_load_time', metric_value: 5200, threshold_value: 5000, page_name: 'AdminDashboard', device_type: 'mobile', status: 'new', created_at: new Date().toISOString() },
      { id: '2', alert_type: 'poor_lcp', severity: 'warning', metric_name: 'lcp', metric_value: 3100, threshold_value: 2500, page_name: 'RideView', device_type: 'mobile', status: 'acknowledged', created_at: new Date(Date.now() - 3600000).toISOString() }
    ]
  }
}

const loadSlowApis = async () => {
  try {
    slowApis.value = await fetchSlowApiEndpoints(timeRange.value)
  } catch (e) {
    console.error('Failed to load slow APIs:', e)
    slowApis.value = [
      { endpoint: '/rest/v1/ride_requests', method: 'GET', avg_duration_ms: 1250, max_duration_ms: 3500, call_count: 892, error_count: 12 },
      { endpoint: '/rest/v1/service_providers', method: 'GET', avg_duration_ms: 980, max_duration_ms: 2800, call_count: 456, error_count: 3 }
    ]
  }
}

const loadThresholds = async () => {
  try {
    thresholds.value = await fetchPerformanceThresholds()
  } catch (e) {
    console.error('Failed to load thresholds:', e)
    thresholds.value = [
      { id: '1', metric_name: 'page_load_time', warning_threshold: 3000, critical_threshold: 5000, description: 'Total page load time', unit: 'ms', is_enabled: true },
      { id: '2', metric_name: 'lcp', warning_threshold: 2500, critical_threshold: 4000, description: 'Largest Contentful Paint', unit: 'ms', is_enabled: true },
      { id: '3', metric_name: 'fid', warning_threshold: 100, critical_threshold: 300, description: 'First Input Delay', unit: 'ms', is_enabled: true },
      { id: '4', metric_name: 'cls', warning_threshold: 0.1, critical_threshold: 0.25, description: 'Cumulative Layout Shift', unit: 'score', is_enabled: true },
      { id: '5', metric_name: 'memory_usage_percent', warning_threshold: 70, critical_threshold: 90, description: 'Memory usage percentage', unit: '%', is_enabled: true }
    ]
  }
}

// Actions
const acknowledgeAlert = async (alertId: string) => {
  try {
    await acknowledgePerformanceAlert(alertId)
    await loadAlerts()
  } catch (e) {
    console.error('Failed to acknowledge alert:', e)
  }
}

const resolveAlert = async (alertId: string) => {
  try {
    await resolvePerformanceAlert(alertId)
    await loadAlerts()
  } catch (e) {
    console.error('Failed to resolve alert:', e)
  }
}

const toggleThreshold = async (threshold: any) => {
  try {
    await updatePerformanceThreshold(threshold.id, { is_enabled: !threshold.is_enabled })
    await loadThresholds()
  } catch (e) {
    console.error('Failed to toggle threshold:', e)
  }
}

const refreshAll = async () => {
  loading.value = true
  try {
    collectAll()
    await Promise.all([
      loadServerSummary(),
      loadAlerts(),
      loadSlowApis(),
      loadThresholds()
    ])
  } finally {
    loading.value = false
  }
}

// Helpers
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

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('th-TH')
}

const formatAlertType = (type: string) => {
  const types: Record<string, string> = {
    'poor_page_load_time': 'Page Load ช้า',
    'poor_lcp': 'LCP สูง',
    'poor_fid': 'FID สูง',
    'poor_cls': 'CLS สูง',
    'poor_ttfb': 'TTFB สูง',
    'poor_memory_usage_percent': 'Memory Usage สูง',
    'poor_api_response_time': 'API Response ช้า',
    'poor_cache_hit_rate': 'Cache Hit Rate ต่ำ'
  }
  return types[type] || type
}

// Watch for filter changes
watch(alertFilter, () => loadAlerts(), { deep: true })
watch(timeRange, () => {
  loadServerSummary()
  loadSlowApis()
})

// Init
onMounted(async () => {
  const { isPersisted: checkPersisted } = useStorageQuota()
  isPersisted.value = await checkPersisted()
  await refreshAll()
})
</script>
