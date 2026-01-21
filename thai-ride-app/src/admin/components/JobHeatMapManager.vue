<template>
  <div class="heat-map-manager">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-medium text-gray-900">Job Heat Map Management</h3>
        <p class="text-sm text-gray-500">จัดการและวิเคราะห์ข้อมูล Heat Map ของงาน</p>
      </div>
      <div class="flex space-x-3">
        <button
          @click="refreshData"
          :disabled="isLoading"
          class="btn-secondary"
        >
          <ArrowPathIcon class="w-4 h-4 mr-2" />
          Refresh Data
        </button>
        <button
          @click="showSettingsModal = true"
          class="btn-primary"
        >
          <CogIcon class="w-4 h-4 mr-2" />
          Settings
        </button>
      </div>
    </div>

    <!-- Heat Map Statistics -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <div class="flex items-center">
          <div class="p-2 bg-red-100 rounded-lg">
            <FireIcon class="w-6 h-6 text-red-600" />
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Hot Zones</p>
            <p class="text-lg font-semibold text-gray-900">{{ hotZonesCount }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <div class="flex items-center">
          <div class="p-2 bg-blue-100 rounded-lg">
            <MapIcon class="w-6 h-6 text-blue-600" />
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Total Grid Points</p>
            <p class="text-lg font-semibold text-gray-900">{{ heatMapData.length }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <div class="flex items-center">
          <div class="p-2 bg-green-100 rounded-lg">
            <ChartBarIcon class="w-6 h-6 text-green-600" />
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Avg Heat Score</p>
            <p class="text-lg font-semibold text-gray-900">{{ averageHeatScore.toFixed(1) }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <div class="flex items-center">
          <div class="p-2 bg-purple-100 rounded-lg">
            <ClockIcon class="w-6 h-6 text-purple-600" />
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Last Updated</p>
            <p class="text-lg font-semibold text-gray-900">{{ lastUpdated }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Time Range Selector -->
    <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium text-gray-900">Time Range</h4>
        <div class="flex space-x-2">
          <button
            v-for="range in timeRanges"
            :key="range.value"
            @click="selectedTimeRange = range.value"
            :class="[
              'px-3 py-1 text-sm rounded-md',
              selectedTimeRange === range.value
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            {{ range.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Heat Map Visualization -->
    <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h4 class="text-sm font-medium text-gray-900 mb-4">Heat Map Visualization</h4>
      
      <!-- Simple Heat Map Grid -->
      <div class="grid grid-cols-10 gap-1 max-w-2xl">
        <div
          v-for="(point, index) in visualizationData"
          :key="index"
          :class="[
            'aspect-square rounded-sm cursor-pointer transition-all duration-200',
            getHeatColor(point.heat_score)
          ]"
          :title="`Lat: ${point.grid_lat}, Lng: ${point.grid_lng}, Score: ${point.heat_score}`"
          @click="showPointDetails(point)"
        ></div>
      </div>
      
      <!-- Legend -->
      <div class="flex items-center justify-between mt-4 text-xs text-gray-500">
        <span>Low Demand</span>
        <div class="flex space-x-1">
          <div class="w-4 h-4 bg-blue-100 rounded-sm"></div>
          <div class="w-4 h-4 bg-green-200 rounded-sm"></div>
          <div class="w-4 h-4 bg-yellow-300 rounded-sm"></div>
          <div class="w-4 h-4 bg-orange-400 rounded-sm"></div>
          <div class="w-4 h-4 bg-red-500 rounded-sm"></div>
        </div>
        <span>High Demand</span>
      </div>
    </div>

    <!-- Top Hot Zones Table -->
    <div class="bg-white border border-gray-200 rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <h4 class="text-sm font-medium text-gray-900 mb-4">Top Hot Zones</h4>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Heat Score
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Requests
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Fare
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="point in topHotZones"
                :key="`${point.grid_lat}-${point.grid_lng}`"
                class="hover:bg-gray-50"
              >
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ point.grid_lat.toFixed(4) }}, {{ point.grid_lng.toFixed(4) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div
                      :class="[
                        'w-3 h-3 rounded-full mr-2',
                        getHeatColor(point.heat_score)
                      ]"
                    ></div>
                    <span class="text-sm font-medium text-gray-900">
                      {{ point.heat_score.toFixed(1) }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ point.total_requests }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ point.completed_requests }} ({{ ((point.completed_requests / point.total_requests) * 100).toFixed(0) }}%)
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ฿{{ point.avg_fare?.toFixed(0) || 'N/A' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDateTime(point.updated_at) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div v-if="topHotZones.length === 0" class="text-center py-8">
          <MapIcon class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-2 text-sm font-medium text-gray-900">No heat map data</h3>
          <p class="mt-1 text-sm text-gray-500">Heat map data will appear here once jobs are processed.</p>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div
      v-if="showSettingsModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      @click="showSettingsModal = false"
    >
      <div
        class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white"
        @click.stop
      >
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Heat Map Settings</h3>
          
          <form @submit.prevent="saveSettings" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Grid Size (km)</label>
              <input
                v-model.number="settings.grid_size_km"
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <p class="text-xs text-gray-500 mt-1">Size of each grid cell in kilometers</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Update Interval (minutes)</label>
              <input
                v-model.number="settings.update_interval_minutes"
                type="number"
                min="5"
                max="120"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <p class="text-xs text-gray-500 mt-1">How often to update heat map data</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Data Retention (days)</label>
              <input
                v-model.number="settings.retention_days"
                type="number"
                min="1"
                max="365"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <p class="text-xs text-gray-500 mt-1">How long to keep heat map data</p>
            </div>
            
            <div class="flex items-center">
              <input
                v-model="settings.enabled"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label class="ml-2 block text-sm text-gray-900">
                Enable heat map system
              </label>
            </div>
            
            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="showSettingsModal = false"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isLoading"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Point Details Modal -->
    <div
      v-if="selectedPoint"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      @click="selectedPoint = null"
    >
      <div
        class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white"
        @click.stop
      >
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Grid Point Details</h3>
          
          <div class="space-y-3">
            <div>
              <span class="text-sm font-medium text-gray-500">Location:</span>
              <span class="text-sm text-gray-900 ml-2">
                {{ selectedPoint.grid_lat.toFixed(4) }}, {{ selectedPoint.grid_lng.toFixed(4) }}
              </span>
            </div>
            
            <div>
              <span class="text-sm font-medium text-gray-500">Heat Score:</span>
              <span class="text-sm text-gray-900 ml-2">{{ selectedPoint.heat_score.toFixed(1) }}</span>
            </div>
            
            <div>
              <span class="text-sm font-medium text-gray-500">Total Requests:</span>
              <span class="text-sm text-gray-900 ml-2">{{ selectedPoint.total_requests }}</span>
            </div>
            
            <div>
              <span class="text-sm font-medium text-gray-500">Completed:</span>
              <span class="text-sm text-gray-900 ml-2">
                {{ selectedPoint.completed_requests }} ({{ ((selectedPoint.completed_requests / selectedPoint.total_requests) * 100).toFixed(0) }}%)
              </span>
            </div>
            
            <div v-if="selectedPoint.avg_fare">
              <span class="text-sm font-medium text-gray-500">Average Fare:</span>
              <span class="text-sm text-gray-900 ml-2">฿{{ selectedPoint.avg_fare.toFixed(0) }}</span>
            </div>
            
            <div v-if="selectedPoint.avg_wait_time_minutes">
              <span class="text-sm font-medium text-gray-500">Average Wait Time:</span>
              <span class="text-sm text-gray-900 ml-2">{{ selectedPoint.avg_wait_time_minutes }} minutes</span>
            </div>
          </div>
          
          <div class="flex justify-end pt-4">
            <button
              @click="selectedPoint = null"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  FireIcon,
  MapIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowPathIcon,
  CogIcon
} from '@heroicons/vue/24/outline'

// Types
interface HeatMapData {
  id: string
  grid_lat: number
  grid_lng: number
  grid_size_km: number
  date_hour: string
  total_requests: number
  completed_requests: number
  cancelled_requests: number
  avg_fare?: number
  avg_wait_time_minutes?: number
  heat_score: number
  created_at: string
  updated_at: string
}

// Props & Emits
const props = defineProps<{
  heatMapData: HeatMapData[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  updateSettings: [settings: any]
  refreshData: []
}>()

// State
const showSettingsModal = ref(false)
const selectedPoint = ref<HeatMapData | null>(null)
const selectedTimeRange = ref('24h')

const settings = ref({
  enabled: true,
  grid_size_km: 1.0,
  update_interval_minutes: 15,
  retention_days: 30
})

const timeRanges = [
  { label: '1 Hour', value: '1h' },
  { label: '6 Hours', value: '6h' },
  { label: '24 Hours', value: '24h' },
  { label: '7 Days', value: '7d' }
]

// Computed
const hotZonesCount = computed(() => 
  props.heatMapData.filter(point => point.heat_score > 5).length
)

const averageHeatScore = computed(() => {
  if (props.heatMapData.length === 0) return 0
  const total = props.heatMapData.reduce((sum, point) => sum + point.heat_score, 0)
  return total / props.heatMapData.length
})

const lastUpdated = computed(() => {
  if (props.heatMapData.length === 0) return 'Never'
  const latest = props.heatMapData.reduce((latest, point) => 
    new Date(point.updated_at) > new Date(latest.updated_at) ? point : latest
  )
  return formatDateTime(latest.updated_at)
})

const topHotZones = computed(() => 
  [...props.heatMapData]
    .sort((a, b) => b.heat_score - a.heat_score)
    .slice(0, 10)
)

const visualizationData = computed(() => {
  // Create a simplified grid for visualization (10x10)
  const maxPoints = 100
  return props.heatMapData.slice(0, maxPoints)
})

// Methods
function getHeatColor(score: number): string {
  if (score <= 1) return 'bg-blue-100'
  if (score <= 3) return 'bg-green-200'
  if (score <= 5) return 'bg-yellow-300'
  if (score <= 8) return 'bg-orange-400'
  return 'bg-red-500'
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function showPointDetails(point: HeatMapData) {
  selectedPoint.value = point
}

function refreshData() {
  emit('refreshData')
}

function saveSettings() {
  emit('updateSettings', settings.value)
  showSettingsModal.value = false
}
</script>

<style scoped>
.btn-primary {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border: 1px solid transparent;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  color: white;
  background-color: #2563eb;
  cursor: pointer;
}

.btn-primary:hover {
  background-color: #1d4ed8;
}

.btn-primary:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.5);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  background-color: white;
  cursor: pointer;
}

.btn-secondary:hover {
  background-color: #f9fafb;
}

.btn-secondary:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.5);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>