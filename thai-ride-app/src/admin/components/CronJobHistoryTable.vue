<script setup lang="ts">
/**
 * Component: CronJobHistoryTable
 * แสดงประวัติการทำงานของ cron job พร้อม filters
 * 
 * Features:
 * - แสดงรายการ execution history
 * - Filter by date range และ status
 * - แสดง error messages สำหรับงานที่ล้มเหลว
 * - แสดง duration ของแต่ละ execution
 */

import { ref, computed } from 'vue'
import { useCronJobMonitoring } from '../../composables/useCronJobMonitoring'

const {
  runHistory,
  historyLoading,
  historyFilters,
  setHistoryFilters,
  clearHistoryFilters
} = useCronJobMonitoring()

// Local state for filter inputs
const startDateInput = ref('')
const endDateInput = ref('')
const statusFilter = ref<string>('')

// Status options
const statusOptions = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'succeeded', label: 'สำเร็จ' },
  { value: 'failed', label: 'ล้มเหลว' },
  { value: 'running', label: 'กำลังทำงาน' },
  { value: 'starting', label: 'กำลังเริ่ม' }
]

// Format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Format duration
function formatDuration(seconds: number | null): string {
  if (seconds === null) return '-'
  
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)}ms`
  }
  
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}m ${remainingSeconds}s`
}

// Get status badge class
function getStatusClass(status: string): string {
  switch (status) {
    case 'succeeded':
      return 'bg-green-100 text-green-700'
    case 'failed':
      return 'bg-red-100 text-red-700'
    case 'running':
      return 'bg-blue-100 text-blue-700'
    case 'starting':
      return 'bg-yellow-100 text-yellow-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

// Get status label
function getStatusLabel(status: string): string {
  switch (status) {
    case 'succeeded':
      return 'สำเร็จ'
    case 'failed':
      return 'ล้มเหลว'
    case 'running':
      return 'กำลังทำงาน'
    case 'starting':
      return 'กำลังเริ่ม'
    case 'sending':
      return 'กำลังส่ง'
    case 'connecting':
      return 'กำลังเชื่อมต่อ'
    default:
      return status
  }
}

// Apply filters
function applyFilters(): void {
  setHistoryFilters({
    startDate: startDateInput.value ? new Date(startDateInput.value) : null,
    endDate: endDateInput.value ? new Date(endDateInput.value) : null,
    status: statusFilter.value || null
  })
}

// Clear filters
function handleClearFilters(): void {
  startDateInput.value = ''
  endDateInput.value = ''
  statusFilter.value = ''
  clearHistoryFilters()
}

// Computed
const hasActiveFilters = computed(() => 
  startDateInput.value || endDateInput.value || statusFilter.value
)

const failedExecutions = computed(() => 
  runHistory.value.filter(h => h.status === 'failed')
)

const successRate = computed(() => {
  if (runHistory.value.length === 0) return 0
  const succeeded = runHistory.value.filter(h => h.status === 'succeeded').length
  return Math.round((succeeded / runHistory.value.length) * 100)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Filters -->
    <div class="bg-gray-50 rounded-lg p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="font-medium text-gray-900">🔍 กรองข้อมูล</h3>
        <button
          v-if="hasActiveFilters"
          type="button"
          class="text-sm text-blue-600 hover:text-blue-700"
          @click="handleClearFilters"
        >
          ล้างตัวกรอง
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <!-- Start Date -->
        <div>
          <label for="start-date" class="block text-sm font-medium text-gray-700 mb-1">
            วันที่เริ่มต้น
          </label>
          <input
            id="start-date"
            v-model="startDateInput"
            type="datetime-local"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <!-- End Date -->
        <div>
          <label for="end-date" class="block text-sm font-medium text-gray-700 mb-1">
            วันที่สิ้นสุด
          </label>
          <input
            id="end-date"
            v-model="endDateInput"
            type="datetime-local"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <!-- Status -->
        <div>
          <label for="status-filter" class="block text-sm font-medium text-gray-700 mb-1">
            สถานะ
          </label>
          <select
            id="status-filter"
            v-model="statusFilter"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <button
        type="button"
        class="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
               focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        @click="applyFilters"
      >
        ค้นหา
      </button>
    </div>

    <!-- Stats Summary -->
    <div class="grid grid-cols-3 gap-3">
      <div class="bg-blue-50 rounded-lg p-3 text-center">
        <p class="text-sm text-gray-600">ทั้งหมด</p>
        <p class="text-2xl font-bold text-blue-600">{{ runHistory.length }}</p>
      </div>
      <div class="bg-green-50 rounded-lg p-3 text-center">
        <p class="text-sm text-gray-600">อัตราสำเร็จ</p>
        <p class="text-2xl font-bold text-green-600">{{ successRate }}%</p>
      </div>
      <div class="bg-red-50 rounded-lg p-3 text-center">
        <p class="text-sm text-gray-600">ล้มเหลว</p>
        <p class="text-2xl font-bold text-red-600">{{ failedExecutions.length }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="historyLoading" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2 text-sm text-gray-600">กำลังโหลดประวัติ...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="runHistory.length === 0" class="text-center py-8">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      <p class="mt-2 text-gray-600">ไม่พบประวัติการทำงาน</p>
      <p v-if="hasActiveFilters" class="mt-1 text-sm text-gray-500">
        ลองปรับเงื่อนไขการค้นหา
      </p>
    </div>

    <!-- History Table -->
    <div v-else class="overflow-x-auto border border-gray-200 rounded-lg">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              เวลาเริ่ม
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              เวลาสิ้นสุด
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ระยะเวลา
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              สถานะ
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ข้อความ
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="record in runHistory" :key="record.runid" class="hover:bg-gray-50">
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              {{ formatDate(record.start_time) }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
              {{ record.end_time ? formatDate(record.end_time) : '-' }}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              <span class="font-mono">{{ formatDuration(record.duration_seconds) }}</span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap">
              <span
                :class="['px-2 py-1 text-xs font-medium rounded-full', getStatusClass(record.status)]"
              >
                {{ getStatusLabel(record.status) }}
              </span>
            </td>
            <td class="px-4 py-3 text-sm">
              <div v-if="record.return_message" class="max-w-md">
                <p
                  :class="[
                    'truncate',
                    record.status === 'failed' ? 'text-red-600' : 'text-gray-600'
                  ]"
                  :title="record.return_message"
                >
                  {{ record.return_message }}
                </p>
              </div>
              <span v-else class="text-gray-400">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Failed Executions Details -->
    <div v-if="failedExecutions.length > 0" class="bg-red-50 border border-red-200 rounded-lg p-4">
      <h4 class="font-medium text-red-900 mb-2">⚠️ การทำงานที่ล้มเหลว ({{ failedExecutions.length }})</h4>
      <div class="space-y-2">
        <div
          v-for="failed in failedExecutions.slice(0, 3)"
          :key="failed.runid"
          class="bg-white rounded p-3 text-sm"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <p class="text-gray-600">{{ formatDate(failed.start_time) }}</p>
              <p class="text-red-600 mt-1">{{ failed.return_message || 'ไม่มีข้อความ error' }}</p>
            </div>
            <span class="text-xs text-gray-500 ml-2">
              {{ formatDuration(failed.duration_seconds) }}
            </span>
          </div>
        </div>
        <p v-if="failedExecutions.length > 3" class="text-sm text-gray-600 text-center">
          และอีก {{ failedExecutions.length - 3 }} รายการ
        </p>
      </div>
    </div>
  </div>
</template>
