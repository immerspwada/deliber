<template>
  <div class="auto-accept-rules">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-medium text-gray-900">Auto-Accept Rules Management</h3>
        <p class="text-sm text-gray-500">จัดการกฎการรับงานอัตโนมัติของ Provider</p>
      </div>
      <button
        @click="showCreateModal = true"
        class="btn-primary"
      >
        <PlusIcon class="w-4 h-4 mr-2" />
        Create Rule
      </button>
    </div>

    <!-- Statistics -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <div class="flex items-center">
          <div class="p-2 bg-green-100 rounded-lg">
            <CheckCircleIcon class="w-6 h-6 text-green-600" />
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Active Rules</p>
            <p class="text-lg font-semibold text-gray-900">{{ activeRulesCount }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <div class="flex items-center">
          <div class="p-2 bg-blue-100 rounded-lg">
            <UsersIcon class="w-6 h-6 text-blue-600" />
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Providers with Rules</p>
            <p class="text-lg font-semibold text-gray-900">{{ providersWithRulesCount }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-lg p-4">
        <div class="flex items-center">
          <div class="p-2 bg-purple-100 rounded-lg">
            <CogIcon class="w-6 h-6 text-purple-600" />
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-500">Total Rules</p>
            <p class="text-lg font-semibold text-gray-900">{{ rules.length }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Provider</label>
          <select
            v-model="filters.providerId"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Providers</option>
            <option
              v-for="provider in providers"
              :key="provider.id"
              :value="provider.id"
            >
              {{ provider.first_name }} {{ provider.last_name }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Status</label>
          <select
            v-model="filters.status"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Service Type</label>
          <select
            v-model="filters.serviceType"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="ride">Ride</option>
            <option value="delivery">Delivery</option>
            <option value="shopping">Shopping</option>
          </select>
        </div>

        <div class="flex items-end">
          <button
            @click="clearFilters"
            class="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Rules List -->
    <div class="bg-white border border-gray-200 rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <div class="space-y-4">
          <div
            v-for="rule in filteredRules"
            :key="rule.id"
            class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center">
                  <h4 class="text-sm font-medium text-gray-900">{{ rule.name }}</h4>
                  <span
                    :class="[
                      'ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      rule.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    ]"
                  >
                    {{ rule.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </div>
                
                <p class="text-sm text-gray-500 mt-1">{{ rule.description }}</p>
                
                <!-- Provider Info -->
                <div class="flex items-center mt-2">
                  <UserIcon class="w-4 h-4 text-gray-400 mr-1" />
                  <span class="text-sm text-gray-600">
                    {{ getProviderName(rule.provider_id) }}
                  </span>
                </div>
                
                <!-- Rule Conditions -->
                <div class="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
                  <div v-if="rule.max_distance_km">
                    <span class="font-medium">Max Distance:</span>
                    {{ rule.max_distance_km }}km
                  </div>
                  
                  <div v-if="rule.min_fare || rule.max_fare">
                    <span class="font-medium">Fare Range:</span>
                    ฿{{ rule.min_fare || 0 }} - ฿{{ rule.max_fare || '∞' }}
                  </div>
                  
                  <div v-if="rule.min_customer_rating">
                    <span class="font-medium">Min Rating:</span>
                    {{ rule.min_customer_rating }}⭐
                  </div>
                  
                  <div v-if="rule.allowed_service_types?.length">
                    <span class="font-medium">Services:</span>
                    {{ rule.allowed_service_types.join(', ') }}
                  </div>
                  
                  <div v-if="rule.allowed_time_start && rule.allowed_time_end">
                    <span class="font-medium">Time:</span>
                    {{ rule.allowed_time_start }} - {{ rule.allowed_time_end }}
                  </div>
                  
                  <div v-if="rule.allowed_days?.length">
                    <span class="font-medium">Days:</span>
                    {{ formatDays(rule.allowed_days) }}
                  </div>
                </div>
              </div>
              
              <div class="flex items-center space-x-2 ml-4">
                <button
                  @click="editRule(rule)"
                  class="text-blue-600 hover:text-blue-800"
                  title="Edit"
                >
                  <PencilIcon class="w-4 h-4" />
                </button>
                
                <button
                  @click="toggleRuleStatus(rule)"
                  :class="[
                    rule.is_active
                      ? 'text-red-600 hover:text-red-800'
                      : 'text-green-600 hover:text-green-800'
                  ]"
                  :title="rule.is_active ? 'Deactivate' : 'Activate'"
                >
                  <component :is="rule.is_active ? XMarkIcon : CheckIcon" class="w-4 h-4" />
                </button>
                
                <button
                  @click="deleteRule(rule.id)"
                  class="text-red-600 hover:text-red-800"
                  title="Delete"
                >
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div v-if="filteredRules.length === 0" class="text-center py-8">
            <CogIcon class="mx-auto h-12 w-12 text-gray-400" />
            <h3 class="mt-2 text-sm font-medium text-gray-900">No rules found</h3>
            <p class="mt-1 text-sm text-gray-500">
              {{ rules.length === 0 ? 'Get started by creating a new auto-accept rule.' : 'Try adjusting your filters.' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <AutoAcceptRuleModal
      v-if="showCreateModal || showEditModal"
      :show="showCreateModal || showEditModal"
      :rule="editingRule"
      :providers="providers"
      :is-loading="isLoading"
      @close="closeModal"
      @save="saveRule"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  UserIcon,
  CheckCircleIcon,
  UsersIcon,
  CogIcon
} from '@heroicons/vue/24/outline'
import AutoAcceptRuleModal from './AutoAcceptRuleModal.vue'

// Types
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
  allowed_time_start?: string
  allowed_time_end?: string
  allowed_days?: number[]
  is_active: boolean
  priority_order: number
  created_at: string
}

interface Provider {
  id: string
  user_id: string
  first_name: string
  last_name: string
  phone_number: string
  is_online: boolean
  is_available: boolean
}

// Props & Emits
const props = defineProps<{
  rules: AutoAcceptRule[]
  providers: Provider[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  create: [rule: Omit<AutoAcceptRule, 'id' | 'created_at'>]
  update: [rule: Partial<AutoAcceptRule>]
  delete: [id: string]
}>()

// State
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingRule = ref<AutoAcceptRule | null>(null)

const filters = ref({
  providerId: '',
  status: '',
  serviceType: ''
})

// Computed
const activeRulesCount = computed(() => 
  props.rules.filter(r => r.is_active).length
)

const providersWithRulesCount = computed(() => {
  const providerIds = new Set(props.rules.map(r => r.provider_id))
  return providerIds.size
})

const filteredRules = computed(() => {
  let filtered = [...props.rules]
  
  if (filters.value.providerId) {
    filtered = filtered.filter(r => r.provider_id === filters.value.providerId)
  }
  
  if (filters.value.status) {
    const isActive = filters.value.status === 'active'
    filtered = filtered.filter(r => r.is_active === isActive)
  }
  
  if (filters.value.serviceType) {
    filtered = filtered.filter(r => 
      r.allowed_service_types?.includes(filters.value.serviceType)
    )
  }
  
  return filtered.sort((a, b) => {
    if (a.is_active && !b.is_active) return -1
    if (!a.is_active && b.is_active) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
})

// Methods
function getProviderName(providerId: string): string {
  const provider = props.providers.find(p => p.id === providerId)
  return provider ? `${provider.first_name} ${provider.last_name}` : 'Unknown Provider'
}

function formatDays(days: number[]): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days.map(d => dayNames[d === 7 ? 0 : d]).join(', ')
}

function editRule(rule: AutoAcceptRule) {
  editingRule.value = rule
  showEditModal.value = true
}

function closeModal() {
  showCreateModal.value = false
  showEditModal.value = false
  editingRule.value = null
}

function saveRule(ruleData: any) {
  if (showEditModal.value && editingRule.value) {
    emit('update', { ...ruleData, id: editingRule.value.id })
  } else {
    emit('create', ruleData)
  }
  closeModal()
}

function toggleRuleStatus(rule: AutoAcceptRule) {
  emit('update', { id: rule.id, is_active: !rule.is_active })
}

function deleteRule(ruleId: string) {
  if (confirm('Are you sure you want to delete this rule?')) {
    emit('delete', ruleId)
  }
}

function clearFilters() {
  filters.value = {
    providerId: '',
    status: '',
    serviceType: ''
  }
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
</style>