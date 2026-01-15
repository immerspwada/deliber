<script setup lang="ts">
/**
 * Component: HeatmapFilterPanel
 * Filter panel สำหรับ provider heatmap
 * 
 * Features:
 * - Filter by provider type
 * - Filter by online status
 * - Time range selection
 */

import { ref, watch } from 'vue'
import type { HeatmapFilters } from '../../composables/useProviderHeatmap'

interface Props {
  filters: HeatmapFilters
  hasActiveFilters: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  apply: [filters: Partial<HeatmapFilters>]
  clear: []
}>()

// Local filter state
const providerType = ref<string>(props.filters.provider_type || '')
const onlineStatus = ref<string>(
  props.filters.is_online === null ? '' : 
  props.filters.is_online ? 'online' : 'offline'
)
const useTimeRange = ref(false)
const startDate = ref('')
const endDate = ref('')

// Provider type options
const providerTypes = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'driver', label: 'Driver' },
  { value: 'rider', label: 'Rider' },
  { value: 'shopper', label: 'Shopper' }
]

// Online status options
const onlineStatusOptions = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' }
]

// Apply filters
function applyFilters(): void {
  const newFilters: Partial<HeatmapFilters> = {
    provider_type: providerType.value || null,
    is_online: onlineStatus.value === '' ? null : 
               onlineStatus.value === 'online' ? true : false,
    time_range: useTimeRange.value && startDate.value && endDate.value ? {
      start: new Date(startDate.value),
      end: new Date(endDate.value)
    } : null
  }
  
  emit('apply', newFilters)
}

// Clear filters
function clearFilters(): void {
  providerType.value = ''
  onlineStatus.value = ''
  useTimeRange.value = false
  startDate.value = ''
  endDate.value = ''
  
  emit('clear')
}

// Watch for external filter changes
watch(() => props.filters, (newFilters) => {
  providerType.value = newFilters.provider_type || ''
  onlineStatus.value = newFilters.is_online === null ? '' :
                       newFilters.is_online ? 'online' : 'offline'
  useTimeRange.value = newFilters.time_range !== null
  
  if (newFilters.time_range) {
    startDate.value = newFilters.time_range.start.toISOString().slice(0, 16)
    endDate.value = newFilters.time_range.end.toISOString().slice(0, 16)
  }
}, { deep: true })
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-900">🔍 ตัวกรอง</h2>
      <button
        v-if="hasActiveFilters"
        type="button"
        @click="clearFilters"
        class="text-sm text-blue-600 hover:text-blue-700"
      >
        ล้างทั้งหมด
      </button>
    </div>

    <!-- Provider Type Filter -->
    <div>
      <label for="provider-type" class="block text-sm font-medium text-gray-700 mb-2">
        ประเภท Provider
      </label>
      <select
        id="provider-type"
        v-model="providerType"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option v-for="type in providerTypes" :key="type.value" :value="type.value">
          {{ type.label }}
        </option>
      </select>
    </div>

    <!-- Online Status Filter -->
    <div>
      <label for="online-status" class="block text-sm font-medium text-gray-700 mb-2">
        สถานะ Online
      </label>
      <select
        id="online-status"
        v-model="onlineStatus"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option v-for="status in onlineStatusOptions" :key="status.value" :value="status.value">
          {{ status.label }}
        </option>
      </select>
    </div>

    <!-- Time Range Filter -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="block text-sm font-medium text-gray-700">
          ช่วงเวลา
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            v-model="useTimeRange"
            type="checkbox"
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="text-sm text-gray-600">เปิดใช้งาน</span>
        </label>
      </div>

      <div v-if="useTimeRange" class="space-y-3">
        <div>
          <label for="start-date" class="block text-xs text-gray-600 mb-1">
            เริ่มต้น
          </label>
          <input
            id="start-date"
            v-model="startDate"
            type="datetime-local"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label for="end-date" class="block text-xs text-gray-600 mb-1">
            สิ้นสุด
          </label>
          <input
            id="end-date"
            v-model="endDate"
            type="datetime-local"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>

    <!-- Apply Button -->
    <button
      type="button"
      @click="applyFilters"
      class="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 
             focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
    >
      ค้นหา
    </button>

    <!-- Filter Info -->
    <div v-if="hasActiveFilters" class="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <p class="text-sm text-blue-800 font-medium mb-2">ตัวกรองที่ใช้งาน:</p>
      <ul class="text-sm text-blue-700 space-y-1">
        <li v-if="providerType">
          • ประเภท: {{ providerTypes.find(t => t.value === providerType)?.label }}
        </li>
        <li v-if="onlineStatus">
          • สถานะ: {{ onlineStatusOptions.find(s => s.value === onlineStatus)?.label }}
        </li>
        <li v-if="useTimeRange && startDate && endDate">
          • ช่วงเวลา: {{ new Date(startDate).toLocaleDateString('th-TH') }} - {{ new Date(endDate).toLocaleDateString('th-TH') }}
        </li>
      </ul>
    </div>

    <!-- Legend -->
    <div class="border-t border-gray-200 pt-6">
      <h3 class="text-sm font-medium text-gray-900 mb-3">🎨 สีความหนาแน่น</h3>
      <div class="space-y-2">
        <div class="flex items-center gap-3">
          <div class="w-6 h-6 rounded bg-green-500"></div>
          <span class="text-sm text-gray-700">ต่ำ (1 provider)</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-6 h-6 rounded bg-yellow-500"></div>
          <span class="text-sm text-gray-700">ปานกลาง (2-4 providers)</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-6 h-6 rounded bg-orange-500"></div>
          <span class="text-sm text-gray-700">สูง (5-7 providers)</span>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-6 h-6 rounded bg-red-500"></div>
          <span class="text-sm text-gray-700">สูงมาก (8+ providers)</span>
        </div>
      </div>
    </div>
  </div>
</template>
