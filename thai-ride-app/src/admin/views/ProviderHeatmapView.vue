<script setup lang="ts">
/**
 * Component: ProviderHeatmapView (Production Ready)
 * Admin dashboard สำหรับดู provider location heatmap
 */

import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

// Simple state
const mapContainer = ref<HTMLElement | null>(null)
const map = ref<any>(null)
const heatLayer = ref<any>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Stats
const stats = ref({
  total: 0,
  online: 0,
  available: 0
})

// Heatmap data
const heatmapPoints = ref<Array<{ lat: number; lng: number; intensity: number }>>([])

// Initialize map
async function initMap(): Promise<void> {
  await nextTick()
  
  if (!mapContainer.value) {
    console.warn('[ProviderHeatmapView] Map container not ready')
    return
  }

  try {
    // Dynamic import Leaflet
    const L = (await import('leaflet')).default
    
    // Load leaflet.heat from CDN if not available
    if (!(L as any).heatLayer) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/leaflet.heat@0.2.0/dist/leaflet-heat.js'
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })
    }
    
    await nextTick()

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
    heatLayer.value = (L as any).heatLayer([], {
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
    })
    
    // Wait for map to be ready
    map.value.whenReady(() => {
      setTimeout(() => {
        if (heatLayer.value && map.value) {
          heatLayer.value.addTo(map.value)
        }
      }, 200)
    })
  } catch (err) {
    console.error('[ProviderHeatmapView] Error initializing map:', err)
    error.value = 'ไม่สามารถโหลดแผนที่ได้'
  }
}

// Load data from Supabase
async function loadData(): Promise<void> {
  loading.value = true
  error.value = null
  
  try {
    const { supabase } = await import('../../lib/supabase')
    
    // Load stats
    const { data: statsData, error: statsError } = await supabase
      .rpc('get_provider_heatmap_stats')
    
    if (statsError) throw statsError
    
    if (statsData) {
      stats.value = {
        total: statsData.total_providers || 0,
        online: statsData.online_providers || 0,
        available: statsData.online_providers || 0
      }
    }
    
    // Load heatmap data
    const { data: heatmapData, error: heatmapError } = await supabase
      .rpc('get_provider_heatmap_data', { p_time_range: '1h' })
    
    if (heatmapError) throw heatmapError
    
    if (heatmapData && Array.isArray(heatmapData)) {
      heatmapPoints.value = heatmapData.map((point: any) => ({
        lat: point.lat,
        lng: point.lng,
        intensity: point.intensity || 1
      }))
    }
    
    updateHeatmap()
  } catch (err: any) {
    console.error('[ProviderHeatmapView] Error loading data:', err)
    error.value = err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
  } finally {
    loading.value = false
  }
}

// Update heatmap with new data
function updateHeatmap(): void {
  if (!heatLayer.value) return

  const heatData = heatmapPoints.value.map(point => [
    point.lat,
    point.lng,
    point.intensity
  ])

  heatLayer.value.setLatLngs(heatData)
}

// Watch for data changes
watch(heatmapPoints, () => {
  updateHeatmap()
})

// Refresh data
async function refreshData(): Promise<void> {
  await loadData()
}

onMounted(async () => {
  // Setup cleanup first (before any await)
  let refreshInterval: NodeJS.Timeout | null = null
  
  onUnmounted(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
    }
    if (map.value) {
      map.value.remove()
      map.value = null
    }
  })
  
  // Then do async operations
  await initMap()
  await loadData()
  
  // Setup auto-refresh
  refreshInterval = setInterval(() => {
    loadData()
  }, 30000)
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
        <button
          @click="refreshData"
          :disabled="loading"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg class="w-5 h-5" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          รีเฟรช
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-3 gap-4 mt-4">
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
      </div>
    </div>

    <!-- Main Content -->
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

      <!-- Map -->
      <div ref="mapContainer" class="w-full h-full"></div>
      
      <!-- Info Box -->
      <div class="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10 max-w-xs">
        <h3 class="font-bold text-gray-900 mb-2">คำอธิบาย</h3>
        <div class="space-y-2 text-sm">
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded" style="background: #00ff00"></div>
            <span>ความหนาแน่นต่ำ</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded" style="background: #ffff00"></div>
            <span>ความหนาแน่นปานกลาง</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded" style="background: #ff9900"></div>
            <span>ความหนาแน่นสูง</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded" style="background: #ff0000"></div>
            <span>ความหนาแน่นสูงมาก</span>
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-3">อัพเดทอัตโนมัติทุก 30 วินาที</p>
      </div>
    </div>
  </div>
</template>
