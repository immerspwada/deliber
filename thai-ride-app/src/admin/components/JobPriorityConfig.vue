<template>
  <div class="job-priority-config">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-medium text-gray-900">Job Priority Configuration</h3>
        <p class="text-sm text-gray-500">จัดการน้ำหนักการคำนวณลำดับความสำคัญของงาน</p>
      </div>
      <button
        @click="showCreateModal = true"
        class="btn-primary"
      >
        <PlusIcon class="w-4 h-4 mr-2" />
        Create Config
      </button>
    </div>

    <!-- Current Active Configuration -->
    <div v-if="activeConfig" class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-sm font-medium text-blue-900">Active Configuration</h4>
          <p class="text-sm text-blue-700">{{ activeConfig.name }}</p>
        </div>
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Active
        </span>
      </div>
      
      <!-- Weight Visualization -->
      <div class="mt-4 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-blue-700">Distance Weight</span>
          <div class="flex items-center">
            <div class="w-32 bg-blue-200 rounded-full h-2 mr-2">
              <div 
                class="bg-blue-600 h-2 rounded-full" 
                :style="{ width: `${activeConfig.distance_weight * 100}%` }"
              ></div>
            </div>
            <span class="text-sm font-medium text-blue-900">{{ (activeConfig.distance_weight * 100).toFixed(0) }}%</span>
          </div>
        </div>
        
        <div class="flex items-center justify-between">
          <span class="text-sm text-blue-700">Fare Weight</span>
          <div class="flex items-center">
            <div class="w-32 bg-blue-200 rounded-full h-2 mr-2">
              <div 
                class="bg-green-600 h-2 rounded-full" 
                :style="{ width: `${activeConfig.fare_weight * 100}%` }"
              ></div>
            </div>
            <span class="text-sm font-medium text-blue-900">{{ (activeConfig.fare_weight * 100).toFixed(0) }}%</span>
          </div>
        </div>
        
        <div class="flex items-center justify-between">
          <span class="text-sm text-blue-700">Rating Weight</span>
          <div class="flex items-center">
            <div class="w-32 bg-blue-200 rounded-full h-2 mr-2">
              <div 
                class="bg-yellow-600 h-2 rounded-full" 
                :style="{ width: `${activeConfig.rating_weight * 100}%` }"
              ></div>
            </div>
            <span class="text-sm font-medium text-blue-900">{{ (activeConfig.rating_weight * 100).toFixed(0) }}%</span>
          </div>
        </div>
        
        <div class="flex items-center justify-between">
          <span class="text-sm text-blue-700">Time Weight</span>
          <div class="flex items-center">
            <div class="w-32 bg-blue-200 rounded-full h-2 mr-2">
              <div 
                class="bg-purple-600 h-2 rounded-full" 
                :style="{ width: `${activeConfig.time_weight * 100}%` }"
              ></div>
            </div>
            <span class="text-sm font-medium text-blue-900">{{ (activeConfig.time_weight * 100).toFixed(0) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Configuration List -->
    <div class="bg-white border border-gray-200 rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <div class="space-y-4">
          <div
            v-for="config in sortedConfigs"
            :key="config.id"
            class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <div class="flex-1">
              <div class="flex items-center">
                <h4 class="text-sm font-medium text-gray-900">{{ config.name }}</h4>
                <span
                  v-if="config.is_active"
                  class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  Active
                </span>
              </div>
              <p class="text-sm text-gray-500 mt-1">{{ config.description }}</p>
              
              <!-- Weight Summary -->
              <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span>Distance: {{ (config.distance_weight * 100).toFixed(0) }}%</span>
                <span>Fare: {{ (config.fare_weight * 100).toFixed(0) }}%</span>
                <span>Rating: {{ (config.rating_weight * 100).toFixed(0) }}%</span>
                <span>Time: {{ (config.time_weight * 100).toFixed(0) }}%</span>
              </div>
            </div>
            
            <div class="flex items-center space-x-2">
              <button
                @click="editConfig(config)"
                class="text-blue-600 hover:text-blue-800"
              >
                <PencilIcon class="w-4 h-4" />
              </button>
              
              <button
                v-if="!config.is_active"
                @click="activateConfig(config.id)"
                class="text-green-600 hover:text-green-800"
                title="Activate"
              >
                <CheckIcon class="w-4 h-4" />
              </button>
              
              <button
                v-if="!config.is_active"
                @click="deleteConfig(config.id)"
                class="text-red-600 hover:text-red-800"
              >
                <TrashIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div
      v-if="showCreateModal || showEditModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      @click="closeModal"
    >
      <div
        class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white"
        @click.stop
      >
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            {{ showCreateModal ? 'Create Priority Configuration' : 'Edit Priority Configuration' }}
          </h3>
          
          <form @submit.prevent="saveConfig" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Name</label>
              <input
                v-model="formData.name"
                type="text"
                required
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                v-model="formData.description"
                rows="2"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              ></textarea>
            </div>
            
            <!-- Weight Sliders -->
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Distance Weight: {{ (formData.distance_weight * 100).toFixed(0) }}%
                </label>
                <input
                  v-model.number="formData.distance_weight"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  class="mt-1 block w-full"
                  @input="normalizeWeights('distance_weight')"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Fare Weight: {{ (formData.fare_weight * 100).toFixed(0) }}%
                </label>
                <input
                  v-model.number="formData.fare_weight"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  class="mt-1 block w-full"
                  @input="normalizeWeights('fare_weight')"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Rating Weight: {{ (formData.rating_weight * 100).toFixed(0) }}%
                </label>
                <input
                  v-model.number="formData.rating_weight"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  class="mt-1 block w-full"
                  @input="normalizeWeights('rating_weight')"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Time Weight: {{ (formData.time_weight * 100).toFixed(0) }}%
                </label>
                <input
                  v-model.number="formData.time_weight"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  class="mt-1 block w-full"
                  @input="normalizeWeights('time_weight')"
                />
              </div>
            </div>
            
            <!-- Total Weight Display -->
            <div class="bg-gray-50 p-3 rounded-md">
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-gray-700">Total Weight:</span>
                <span 
                  :class="[
                    'text-sm font-medium',
                    totalWeight === 1 ? 'text-green-600' : 'text-red-600'
                  ]"
                >
                  {{ (totalWeight * 100).toFixed(0) }}%
                </span>
              </div>
              <p v-if="totalWeight !== 1" class="text-xs text-red-600 mt-1">
                Total weight must equal 100%
              </p>
            </div>
            
            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="closeModal"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="totalWeight !== 1 || isLoading"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ showCreateModal ? 'Create' : 'Update' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'

// Props
interface PriorityConfig {
  id: string
  name: string
  description?: string
  distance_weight: number
  fare_weight: number
  rating_weight: number
  time_weight: number
  is_active: boolean
  created_at: string
}

const props = defineProps<{
  config: PriorityConfig[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  update: [config: Partial<PriorityConfig>]
  create: [config: Omit<PriorityConfig, 'id' | 'created_at'>]
  delete: [id: string]
  activate: [id: string]
}>()

// State
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingConfig = ref<PriorityConfig | null>(null)

const formData = ref({
  name: '',
  description: '',
  distance_weight: 0.4,
  fare_weight: 0.3,
  rating_weight: 0.2,
  time_weight: 0.1
})

// Computed
const activeConfig = computed(() => 
  props.config.find(c => c.is_active)
)

const sortedConfigs = computed(() => 
  [...props.config].sort((a, b) => {
    if (a.is_active && !b.is_active) return -1
    if (!a.is_active && b.is_active) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
)

const totalWeight = computed(() => 
  formData.value.distance_weight + 
  formData.value.fare_weight + 
  formData.value.rating_weight + 
  formData.value.time_weight
)

// Methods
function normalizeWeights(changedWeight: string) {
  // Auto-adjust other weights to maintain total = 1.0
  const weights = ['distance_weight', 'fare_weight', 'rating_weight', 'time_weight']
  const otherWeights = weights.filter(w => w !== changedWeight)
  
  const changedValue = formData.value[changedWeight as keyof typeof formData.value] as number
  const remainingWeight = 1.0 - changedValue
  
  if (remainingWeight >= 0) {
    const currentOtherTotal = otherWeights.reduce((sum, weight) => 
      sum + (formData.value[weight as keyof typeof formData.value] as number), 0
    )
    
    if (currentOtherTotal > 0) {
      otherWeights.forEach(weight => {
        const currentValue = formData.value[weight as keyof typeof formData.value] as number
        const proportion = currentValue / currentOtherTotal
        ;(formData.value as any)[weight] = Math.max(0, remainingWeight * proportion)
      })
    } else {
      // Distribute equally among other weights
      const equalWeight = remainingWeight / otherWeights.length
      otherWeights.forEach(weight => {
        ;(formData.value as any)[weight] = equalWeight
      })
    }
  }
}

function editConfig(config: PriorityConfig) {
  editingConfig.value = config
  formData.value = {
    name: config.name,
    description: config.description || '',
    distance_weight: config.distance_weight,
    fare_weight: config.fare_weight,
    rating_weight: config.rating_weight,
    time_weight: config.time_weight
  }
  showEditModal.value = true
}

function closeModal() {
  showCreateModal.value = false
  showEditModal.value = false
  editingConfig.value = null
  resetForm()
}

function resetForm() {
  formData.value = {
    name: '',
    description: '',
    distance_weight: 0.4,
    fare_weight: 0.3,
    rating_weight: 0.2,
    time_weight: 0.1
  }
}

function saveConfig() {
  if (totalWeight.value !== 1) return
  
  const configData = {
    name: formData.value.name,
    description: formData.value.description,
    distance_weight: formData.value.distance_weight,
    fare_weight: formData.value.fare_weight,
    rating_weight: formData.value.rating_weight,
    time_weight: formData.value.time_weight,
    is_active: false
  }
  
  if (showEditModal.value && editingConfig.value) {
    emit('update', { ...configData, id: editingConfig.value.id })
  } else {
    emit('create', configData)
  }
  
  closeModal()
}

function activateConfig(id: string) {
  emit('activate', id)
}

function deleteConfig(id: string) {
  if (confirm('Are you sure you want to delete this configuration?')) {
    emit('delete', id)
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