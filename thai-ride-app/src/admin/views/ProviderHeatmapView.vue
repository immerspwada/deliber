<script setup lang="ts">
/**
 * Component: ProviderHeatmapView
 * Admin dashboard สำหรับดู provider location heatmap
 * 
 * Features:
 * - แสดง heatmap ของ provider locations
 * - Filter by provider type, online status
 * - Time-lapse playback
 * - Density area analysis
 */

import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import { useProviderHeatmap } from '../../composables/useProviderHeatmap'
import HeatmapFilterPanel from '../../admin/components/HeatmapFilterPanel.vue'
import DensityAreasPanel from '../../admin/components/DensityAreasPanel.vue'
import TimeLapseControls from '../../admin/components/TimeLapseControls.vue'

const {
  heatmapPoints,
  stats,
  highDensityAreas,
  lowDensityAreas,
  loading,
  error,
  filters,
  isTimeLapseMode,
  timeLapseDuration,
  timeLapseProgress,
  currentTimestamp,
  loadHeatmapData,
  loadDensityAreas,
  loadStats,
  applyFilters,
  clearFilters,
  startTimeLapse,
  pauseTimeLapse,
  stopTimeLapse,
  setTimeLapseSpeed,
  setTimeLapseDuration
} = useProviderHeatmap()

// Map state
const mapContainer = ref<HTMLElement | null>(null)
const map = ref<any>(null)
const heatLayer = ref<any>(null)
const showFilters = ref(true)
const showDensityPanel = ref(true)

// Initialize map
async function initMap(): Promise<void> {
  await nextTick()
  
  if (!mapContainer.value) {
    console.warn('[ProviderHeatmapView] Map container not ready')
    return
  }

  // Dynamic import Leaflet
  const L = await import('leaflet')
  
  // Import heatmap plugin
  // @ts-ignore
  await import('leaflet.heat')

  // Create map
  map.value = L.map(mapContainer.value, {
    center: [13.7563, 100.5018], // Bangkok
    zoom: 12,
    zoomControl: true,
    attributionControl: false
  })

  // Add tile layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(map.value)

  // Initialize heatmap layer
  // @ts-ignore
  heatLayer.value = L.heatLayer([], {
    radius: 25,
    blur: 35,
    maxZoom: 17,
    max: 1.0,
    gradient: {
      0.0: '#00ff00',
      0.3: '#ffff00',
      0.5: '#ff9900',
      0.7: '#ff6600',
      1.0: '#ff0000'
    }
  }).addTo(map.value)
}

// Update heatmap with new data
function updateHeatmap(): void {
  if (!heatLayer.value) return

  // Convert heatmap points to Leaflet format
  const heatData = heatmapPoints.value.map(point => [
    point.lat,
    point.lng,
    point.intensity
  ])

  heatLayer.value.setLatLngs(heatData)
}

// Watch for heatmap data changes
watch(heatmapPoints, () => {
  updateHeatmap()
})

// Handle filter changes
function handleFilterChange(newFilters: any): void {
  applyFilters(newFilters)
}

// Handle clear filters
function handleClearFilters(): void {
  clearFilters()
}

// Handle time-lapse controls
function handleTimeLapseStart(): void {
  startTimeLapse()
}

function handleTimeLapsePause(): void {
  pauseTimeLapse()
}

function handleTimeLapseStop(): void {
  stopTimeLapse()
}

function handleTimeLapseSpeedChange(speed: number): void {
  setTimeLapseSpeed(speed)
}

function handleTimeLapseDurationChange(duration: '1h' | '6h' | '24h'): void {
  setTimeLapseDuration(duration)
}

// Refresh data
async function refreshData(): Promise<void> {
  await Promise.all([
    loadHeatmapData(),
    loadDensityAreas(),
    loadStats()
  ])
}

// Computed
const hasActiveFilters = computed(() => 
  filters.value.provider_type !== null || 
  filters.value.is_online !== null ||
  filters.value.time_range !== null
)

onMounted(async () => {
  await initMap()
  await refreshData()
})

onUnmounted(() => {
  if (map.value) {
    map.value.remove()
    map.value = null
  }
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">🗺️ Provider Heatmap</h1>
          <p class="text-gray-600 mt-1">แสดงการกระจายตัวของ provider แบบ real-time</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="showFilters = !showFilters"
            class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            aria-label="Toggle filters"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
            </svg>
            ตัวกรอง
          </button>
          <button
            type="button"
            @click="showDensityPanel = !showDensityPanel"
            class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            aria-label="Toggle density panel"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            พื้นที่
          </button>
          <button
            type="button"
            @click="refreshData"
            :disabled="loading"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                   disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            aria-label="Refresh data"
          >
            <svg class="w-5 h-5" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            รีเฟรช
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-4 gap-4 mt-4">
        <div class="bg-blue-50 rounded-lg p-4">
          <p class="text-sm text-gray-600">Provider ทั้งหมด</p>
          <p class="text-3xl font-bold text-blue-600">{{ stats.total }}</p>
        </div>
        <div class="bg-green-50 rounded-lg p-4">
          <p class="text-sm text-gray-600">Online</p>
          <p class="text-3xl font-bold text-green-600">{{ stats.online }}</p>
        </div>
        <div class="bg-emerald-50 rounded-lg p-4">
          <p class="text-sm text-gray-600">Available</p>
          <p class="text-3xl font-bold text-emerald-600">{{ stats.available }}</p>
        </div>
        <div class="bg-purple-50 rounded-lg p-4">
          <p class="text-sm text-gray-600">เฉลี่ยต่อพื้นที่</p>
          <p class="text-3xl font-bold text-purple-600">{{ stats.avg_per_area.toFixed(1) }}</p>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Filters Sidebar -->
      <div
        v-if="showFilters"
        class="w-80 bg-white border-r border-gray-200 overflow-y-auto"
      >
        <HeatmapFilterPanel
          :filters="filters"
          :has-active-filters="hasActiveFilters"
          @apply="handleFilterChange"
          @clear="handleClearFilters"
        />
      </div>

      <!-- Map Container -->
      <div class="flex-1 relative">
        <!-- Loading Overlay -->
        <div
          v-if="loading"
          class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10"
        >
          <div class="text-center">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p class="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        </div>

        <!-- Error Message -->
        <div
          v-if="error"
          class="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-red-50 border border-red-200 rounded-lg p-4 max-w-md"
        >
          <p class="text-red-600">{{ error }}</p>
        </div>

        <!-- Time-lapse Controls -->
        <div
          v-if="isTimeLapseMode"
          class="absolute top-4 left-4 right-4 z-10"
        >
          <TimeLapseControls
            :is-playing="isTimeLapseMode"
            :progress="timeLapseProgress"
            :current-timestamp="currentTimestamp"
            :duration="timeLapseDuration"
            @start="handleTimeLapseStart"
            @pause="handleTimeLapsePause"
            @stop="handleTimeLapseStop"
            @speed-change="handleTimeLapseSpeedChange"
            @duration-change="handleTimeLapseDurationChange"
          />
        </div>

        <!-- Map -->
        <div ref="mapContainer" class="w-full h-full"></div>

        <!-- Time-lapse Toggle Button -->
        <button
          v-if="!isTimeLapseMode"
          type="button"
          @click="handleTimeLapseStart"
          class="absolute bottom-4 left-4 px-4 py-3 bg-white border border-gray-300 rounded-lg 
                 hover:bg-gray-50 shadow-lg flex items-center gap-2 z-10"
          aria-label="Start time-lapse"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          เปิด Time-lapse
        </button>
      </div>

      <!-- Density Areas Sidebar -->
      <div
        v-if="showDensityPanel"
        class="w-80 bg-white border-l border-gray-200 overflow-y-auto"
      >
        <DensityAreasPanel
          :high-density-areas="highDensityAreas"
          :low-density-areas="lowDensityAreas"
          @area-click="(area) => {
            if (map) {
              map.setView([area.center_lat, area.center_lng], 14)
            }
          }"
        />
      </div>
    </div>
  </div>
</template>
