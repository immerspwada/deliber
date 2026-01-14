<template>
  <div class="job-management">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Job Management System</h1>
        <p class="text-gray-600">จัดการระบบจัดลำดับงาน, กฎรับงานอัตโนมัติ และ Heat Map</p>
      </div>
      <div class="flex gap-3">
        <button
          @click="refreshData"
          :disabled="isLoading"
          class="btn-secondary"
        >
          <RefreshIcon class="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>
    </div>

    <!-- System Status Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center">
          <div class="p-2 bg-blue-100 rounded-lg">
            <ChartBarIcon class="w-6 h-6 text-blue-600" />
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Priority System</p>
            <p class="text-lg font-semibold text-gray-900">
              {{ systemStatus.priorityEnabled ? 'Active' : 'Inactive' }}
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center">
          <div class="p-2 bg-green-100 rounded-lg">
            <CogIcon class="w-6 h-6 text-green-600" />
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Auto-Accept Rules</p>
            <p class="text-lg font-semibold text-gray-900">{{ stats.totalAutoAcceptRules }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center">
          <div class="p-2 bg-purple-100 rounded-lg">
            <MapIcon class="w-6 h-6 text-purple-600" />
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Heat Map Data</p>
            <p class="text-lg font-semibold text-gray-900">{{ stats.heatMapPoints }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center">
          <div class="p-2 bg-orange-100 rounded-lg">
            <ClockIcon class="w-6 h-6 text-orange-600" />
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Active Providers</p>
            <p class="text-lg font-semibold text-gray-900">{{ stats.activeProviders }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="bg-white rounded-lg shadow">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8 px-6">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            <component :is="tab.icon" class="w-5 h-5 mr-2 inline" />
            {{ tab.name }}
          </button>
        </nav>
      </div>

      <div class="p-6">
        <!-- Job Priority Tab -->
        <div v-if="activeTab === 'priority'" class="space-y-6">
          <JobPriorityConfig
            :config="priorityConfig"
            :is-loading="isLoading"
            @update="updatePriorityConfig"
          />
        </div>

        <!-- Auto-Accept Rules Tab -->
        <div v-if="activeTab === 'auto-accept'" class="space-y-6">
          <AutoAcceptRulesManager
            :rules="autoAcceptRules"
            :providers="providers"
            :is-loading="isLoading"
            @create="createAutoAcceptRule"
            @update="updateAutoAcceptRule"
            @delete="deleteAutoAcceptRule"
          />
        </div>

        <!-- Heat Map Tab -->
        <div v-if="activeTab === 'heat-map'" class="space-y-6">
          <JobHeatMapManager
            :heat-map-data="heatMapData"
            :is-loading="isLoading"
            @update-settings="updateHeatMapSettings"
            @refresh-data="refreshHeatMapData"
          />
        </div>

        <!-- System Config Tab -->
        <div v-if="activeTab === 'config'" class="space-y-6">
          <div class="text-center py-12">
            <p class="text-gray-500">System Config Manager - Coming Soon</p>
            <p class="text-sm text-gray-400 mt-2">This feature is under development</p>
          </div>
          <!-- <SystemConfigManager
            :config="systemConfig"
            :is-loading="isLoading"
            @update="updateSystemConfig"
          /> -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useToast } from '@/composables/useToast'
import { useAdminAPI } from '@/admin/composables/useAdminAPI'
import {
  ChartBarIcon,
  CogIcon,
  MapIcon,
  ClockIcon,
  RefreshIcon,
  AdjustmentsHorizontalIcon,
  FireIcon,
  WrenchScrewdriverIcon
} from '@heroicons/vue/24/outline'

// Components
import JobPriorityConfig from '@/admin/components/JobPriorityConfig.vue'
import AutoAcceptRulesManager from '@/admin/components/AutoAcceptRulesManager.vue'
import JobHeatMapManager from '@/admin/components/JobHeatMapManager.vue'
// import SystemConfigManager from '@/admin/components/SystemConfigManager.vue' // TODO: Create this component

// Types
interface PriorityConfig {
  id: string
  name: string
  distance_weight: number
  fare_weight: number
  rating_weight: number
  time_weight: number
  is_active: boolean
}

interface AutoAcceptRule {
  id: string
  name: string
  description: string
  provider_id: string
  max_distance_km?: number
  min_fare?: number
  max_fare?: number
  min_customer_rating?: number
  allowed_service_types?: string[]
  is_active: boolean
}

interface HeatMapData {
  grid_lat: number
  grid_lng: number
  total_requests: number
  heat_score: number
  date_hour: string
}

interface SystemConfig {
  category: string
  key: string
  value: any
  description: string
  is_active: boolean
}

// Composables
const toast = useToast()
const adminAPI = useAdminAPI()

// State
const isLoading = ref(false)
const activeTab = ref('priority')

const priorityConfig = ref<PriorityConfig[]>([])
const autoAcceptRules = ref<AutoAcceptRule[]>([])
const heatMapData = ref<HeatMapData[]>([])
const systemConfig = ref<SystemConfig[]>([])
const providers = ref<any[]>([])

// Tabs configuration
const tabs = [
  { id: 'priority', name: 'Job Priority', icon: ChartBarIcon },
  { id: 'auto-accept', name: 'Auto-Accept Rules', icon: CogIcon },
  { id: 'heat-map', name: 'Heat Map', icon: FireIcon },
  { id: 'config', name: 'System Config', icon: WrenchScrewdriverIcon }
]

// Computed
const systemStatus = computed(() => {
  const priorityEnabled = systemConfig.value.find(
    c => c.category === 'job_priority' && c.key === 'enabled'
  )?.value === true

  const autoAcceptEnabled = systemConfig.value.find(
    c => c.category === 'auto_accept' && c.key === 'enabled'
  )?.value === true

  const heatMapEnabled = systemConfig.value.find(
    c => c.category === 'heat_map' && c.key === 'enabled'
  )?.value === true

  return {
    priorityEnabled,
    autoAcceptEnabled,
    heatMapEnabled
  }
})

const stats = computed(() => ({
  totalAutoAcceptRules: autoAcceptRules.value.filter(r => r.is_active).length,
  heatMapPoints: heatMapData.value.length,
  activeProviders: providers.value.filter(p => p.is_online && p.is_available).length
}))

// Methods
async function loadData() {
  isLoading.value = true
  try {
    await Promise.all([
      loadPriorityConfig(),
      loadAutoAcceptRules(),
      loadHeatMapData(),
      loadSystemConfig(),
      loadProviders()
    ])
  } catch (error: any) {
    toast.error(`Failed to load data: ${error.message}`)
  } finally {
    isLoading.value = false
  }
}

async function loadPriorityConfig() {
  const { data, error } = await adminAPI.supabase
    .from('job_priority_config')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  priorityConfig.value = data || []
}

async function loadAutoAcceptRules() {
  const { data, error } = await adminAPI.supabase
    .from('auto_accept_rules')
    .select(`
      *,
      provider:providers_v2!provider_id (
        id,
        user_id,
        first_name,
        last_name,
        phone_number
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  autoAcceptRules.value = data || []
}

async function loadHeatMapData() {
  const { data, error } = await adminAPI.supabase
    .from('job_heat_map_data')
    .select('*')
    .gte('date_hour', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
    .order('heat_score', { ascending: false })
    .limit(100)

  if (error) throw error
  heatMapData.value = data || []
}

async function loadSystemConfig() {
  const { data, error } = await adminAPI.supabase
    .from('system_config')
    .select('*')
    .order('category', { ascending: true })

  if (error) throw error
  systemConfig.value = data || []
}

async function loadProviders() {
  const { data, error } = await adminAPI.supabase
    .from('providers_v2')
    .select('id, user_id, first_name, last_name, phone_number, is_online, is_available, status')
    .eq('status', 'approved')

  if (error) throw error
  providers.value = data || []
}

async function updatePriorityConfig(config: Partial<PriorityConfig>) {
  isLoading.value = true
  try {
    const { error } = await adminAPI.supabase
      .from('job_priority_config')
      .update(config)
      .eq('id', config.id)

    if (error) throw error

    await loadPriorityConfig()
    toast.success('Priority configuration updated successfully')
  } catch (error: any) {
    toast.error(`Failed to update priority config: ${error.message}`)
  } finally {
    isLoading.value = false
  }
}

async function createAutoAcceptRule(rule: Omit<AutoAcceptRule, 'id'>) {
  isLoading.value = true
  try {
    const { error } = await adminAPI.supabase
      .from('auto_accept_rules')
      .insert(rule)

    if (error) throw error

    await loadAutoAcceptRules()
    toast.success('Auto-accept rule created successfully')
  } catch (error: any) {
    toast.error(`Failed to create auto-accept rule: ${error.message}`)
  } finally {
    isLoading.value = false
  }
}

async function updateAutoAcceptRule(rule: Partial<AutoAcceptRule>) {
  isLoading.value = true
  try {
    const { error } = await adminAPI.supabase
      .from('auto_accept_rules')
      .update(rule)
      .eq('id', rule.id)

    if (error) throw error

    await loadAutoAcceptRules()
    toast.success('Auto-accept rule updated successfully')
  } catch (error: any) {
    toast.error(`Failed to update auto-accept rule: ${error.message}`)
  } finally {
    isLoading.value = false
  }
}

async function deleteAutoAcceptRule(ruleId: string) {
  isLoading.value = true
  try {
    const { error } = await adminAPI.supabase
      .from('auto_accept_rules')
      .delete()
      .eq('id', ruleId)

    if (error) throw error

    await loadAutoAcceptRules()
    toast.success('Auto-accept rule deleted successfully')
  } catch (error: any) {
    toast.error(`Failed to delete auto-accept rule: ${error.message}`)
  } finally {
    isLoading.value = false
  }
}

async function updateHeatMapSettings(settings: any) {
  isLoading.value = true
  try {
    // Update heat map related system config
    for (const [key, value] of Object.entries(settings)) {
      const { error } = await adminAPI.supabase
        .from('system_config')
        .update({ value })
        .eq('category', 'heat_map')
        .eq('key', key)

      if (error) throw error
    }

    await loadSystemConfig()
    toast.success('Heat map settings updated successfully')
  } catch (error: any) {
    toast.error(`Failed to update heat map settings: ${error.message}`)
  } finally {
    isLoading.value = false
  }
}

async function refreshHeatMapData() {
  isLoading.value = true
  try {
    // Call the update function
    const { error } = await adminAPI.supabase.rpc('update_heat_map_data')
    if (error) throw error

    await loadHeatMapData()
    toast.success('Heat map data refreshed successfully')
  } catch (error: any) {
    toast.error(`Failed to refresh heat map data: ${error.message}`)
  } finally {
    isLoading.value = false
  }
}

async function updateSystemConfig(config: Partial<SystemConfig>) {
  isLoading.value = true
  try {
    const { error } = await adminAPI.supabase
      .from('system_config')
      .update({
        value: config.value,
        is_active: config.is_active,
        updated_at: new Date().toISOString(),
        updated_by: adminAPI.user?.id
      })
      .eq('category', config.category)
      .eq('key', config.key)

    if (error) throw error

    await loadSystemConfig()
    toast.success('System configuration updated successfully')
  } catch (error: any) {
    toast.error(`Failed to update system config: ${error.message}`)
  } finally {
    isLoading.value = false
  }
}

async function refreshData() {
  await loadData()
  toast.success('Data refreshed successfully')
}

// Lifecycle
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.job-management {
  max-width: 80rem;
  margin-left: auto;
  margin-right: auto;
  padding: 2rem 1rem;
}

@media (min-width: 640px) {
  .job-management {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .job-management {
    padding-left: 2rem;
    padding-right: 2rem;
  }
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
}

.btn-secondary:hover {
  background-color: #f9fafb;
}

.btn-secondary:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>