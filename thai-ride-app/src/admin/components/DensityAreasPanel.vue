<script setup lang="ts">
/**
 * Component: DensityAreasPanel
 * แสดงรายการพื้นที่ความหนาแน่นสูงและต่ำ
 * 
 * Features:
 * - แสดง high-density areas
 * - แสดง low-density areas
 * - Click to navigate to area
 */

import type { AreaStats } from '../../composables/useProviderHeatmap'

interface Props {
  highDensityAreas: AreaStats[]
  lowDensityAreas: AreaStats[]
}

defineProps<Props>()

const emit = defineEmits<{
  areaClick: [area: AreaStats]
}>()

// Get coverage level badge class
function getCoverageBadgeClass(level: string): string {
  switch (level) {
    case 'high':
      return 'bg-red-100 text-red-700'
    case 'medium':
      return 'bg-yellow-100 text-yellow-700'
    case 'low':
      return 'bg-green-100 text-green-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

// Get coverage level label
function getCoverageLabel(level: string): string {
  switch (level) {
    case 'high':
      return 'สูง'
    case 'medium':
      return 'ปานกลาง'
    case 'low':
      return 'ต่ำ'
    default:
      return level
  }
}

// Handle area click
function handleAreaClick(area: AreaStats): void {
  emit('areaClick', area)
}
</script>

<template>
  <div class="p-6 space-y-6">
    <h2 class="text-lg font-semibold text-gray-900">📊 พื้นที่ความหนาแน่น</h2>

    <!-- High Density Areas -->
    <div>
      <div class="flex items-center gap-2 mb-3">
        <div class="w-3 h-3 rounded-full bg-red-500"></div>
        <h3 class="text-sm font-medium text-gray-900">พื้นที่ความหนาแน่นสูง</h3>
        <span class="text-xs text-gray-500">({{ highDensityAreas.length }})</span>
      </div>

      <div v-if="highDensityAreas.length === 0" class="text-sm text-gray-500 text-center py-4">
        ไม่พบพื้นที่ความหนาแน่นสูง
      </div>

      <div v-else class="space-y-2">
        <button
          v-for="area in highDensityAreas"
          :key="`high-${area.area_name}`"
          type="button"
          @click="handleAreaClick(area)"
          class="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-red-300 
                 hover:bg-red-50 transition-colors group"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 group-hover:text-red-700">
                {{ area.area_name }}
              </p>
              <p class="text-xs text-gray-500 mt-1">
                {{ area.center_lat.toFixed(4) }}, {{ area.center_lng.toFixed(4) }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-lg font-bold text-red-600">
                {{ area.provider_count }}
              </p>
              <span
                :class="['text-xs px-2 py-0.5 rounded-full', getCoverageBadgeClass(area.coverage_level)]"
              >
                {{ getCoverageLabel(area.coverage_level) }}
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Divider -->
    <div class="border-t border-gray-200"></div>

    <!-- Low Density Areas -->
    <div>
      <div class="flex items-center gap-2 mb-3">
        <div class="w-3 h-3 rounded-full bg-green-500"></div>
        <h3 class="text-sm font-medium text-gray-900">พื้นที่ความหนาแน่นต่ำ</h3>
        <span class="text-xs text-gray-500">({{ lowDensityAreas.length }})</span>
      </div>

      <div v-if="lowDensityAreas.length === 0" class="text-sm text-gray-500 text-center py-4">
        ไม่พบพื้นที่ความหนาแน่นต่ำ
      </div>

      <div v-else class="space-y-2">
        <button
          v-for="area in lowDensityAreas"
          :key="`low-${area.area_name}`"
          type="button"
          @click="handleAreaClick(area)"
          class="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-green-300 
                 hover:bg-green-50 transition-colors group"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 group-hover:text-green-700">
                {{ area.area_name }}
              </p>
              <p class="text-xs text-gray-500 mt-1">
                {{ area.center_lat.toFixed(4) }}, {{ area.center_lng.toFixed(4) }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-lg font-bold text-green-600">
                {{ area.provider_count }}
              </p>
              <span
                :class="['text-xs px-2 py-0.5 rounded-full', getCoverageBadgeClass(area.coverage_level)]"
              >
                {{ getCoverageLabel(area.coverage_level) }}
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Summary -->
    <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <h4 class="text-sm font-medium text-gray-900 mb-2">📈 สรุป</h4>
      <div class="space-y-1 text-sm text-gray-600">
        <p>• พื้นที่ความหนาแน่นสูง: {{ highDensityAreas.length }} พื้นที่</p>
        <p>• พื้นที่ความหนาแน่นต่ำ: {{ lowDensityAreas.length }} พื้นที่</p>
        <p class="text-xs text-gray-500 mt-2">
          คลิกที่พื้นที่เพื่อดูตำแหน่งบนแผนที่
        </p>
      </div>
    </div>

    <!-- Recommendations -->
    <div v-if="lowDensityAreas.length > 0" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div class="flex items-start gap-2">
        <svg class="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <div>
          <p class="text-sm font-medium text-yellow-800">คำแนะนำ</p>
          <p class="text-sm text-yellow-700 mt-1">
            พบพื้นที่ที่มี provider coverage ต่ำ {{ lowDensityAreas.length }} พื้นที่ 
            ควรพิจารณาเพิ่ม incentive หรือ promotion ในพื้นที่เหล่านี้
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
