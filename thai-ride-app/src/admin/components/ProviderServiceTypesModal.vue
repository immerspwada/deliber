<script setup lang="ts">
/**
 * Provider Service Types Modal
 * ============================
 * Modal สำหรับ Admin จัดการประเภทงานที่ Provider สามารถรับได้
 * 
 * Features:
 * - เลือก/ยกเลิก service types แบบ checkbox
 * - แสดง icon และคำอธิบายของแต่ละประเภท
 * - Validation และ error handling
 * - Real-time update
 */
import { ref, computed, watch } from 'vue'
import { useToast } from '@/composables/useToast'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { supabase } from '@/lib/supabase'

interface Props {
  provider: {
    id: string
    first_name: string
    last_name: string
    service_types?: string[]  // Made optional to match actual data
  }
  show: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  updated: []
}>()

const toast = useToast()
const errorHandler = useErrorHandler()

// Service types configuration
const SERVICE_TYPES = [
  {
    value: 'ride',
    label: 'เรียกรถ',
    icon: '🚗',
    description: 'บริการรับ-ส่งผู้โดยสาร',
    color: 'blue'
  },
  {
    value: 'delivery',
    label: 'ส่งของ',
    icon: '📦',
    description: 'บริการจัดส่งพัสดุและเอกสาร',
    color: 'green'
  },
  {
    value: 'shopping',
    label: 'ซื้อของ',
    icon: '🛒',
    description: 'บริการซื้อของฝากจากร้านค้า',
    color: 'purple'
  },
  {
    value: 'moving',
    label: 'ขนของ',
    icon: '🚚',
    description: 'บริการขนย้ายสิ่งของ',
    color: 'orange'
  },
  {
    value: 'queue',
    label: 'จองคิว',
    icon: '🎫',
    description: 'บริการจองคิวแทน',
    color: 'pink'
  }
] as const

// State
const selectedTypes = ref<string[]>([])
const isProcessing = ref(false)

// Computed
const hasChanges = computed(() => {
  const current = [...selectedTypes.value].sort()
  const original = [...(props.provider.service_types || [])].sort()
  return JSON.stringify(current) !== JSON.stringify(original)
})

const canSave = computed(() => {
  return selectedTypes.value.length > 0 && hasChanges.value && !isProcessing.value
})

// Watch for provider changes
watch(() => props.provider.service_types, (newTypes) => {
  selectedTypes.value = [...(newTypes || [])]
}, { immediate: true })

// Methods
function toggleServiceType(type: string) {
  const index = selectedTypes.value.indexOf(type)
  if (index > -1) {
    selectedTypes.value.splice(index, 1)
  } else {
    selectedTypes.value.push(type)
  }
}

function isSelected(type: string): boolean {
  return selectedTypes.value.includes(type)
}

function getServiceTypeConfig(type: string) {
  return SERVICE_TYPES.find(st => st.value === type)
}

async function handleSave() {
  if (!canSave.value) return
  
  if (selectedTypes.value.length === 0) {
    toast.error('กรุณาเลือกประเภทงานอย่างน้อย 1 ประเภท')
    return
  }
  
  isProcessing.value = true
  
  try {
    const { error } = await supabase.rpc('admin_update_provider_service_types', {
      p_provider_id: props.provider.id,
      p_service_types: selectedTypes.value
    })
    
    if (error) throw error
    
    toast.success('อัพเดทประเภทงานเรียบร้อยแล้ว')
    emit('updated')
    emit('close')
  } catch (e) {
    errorHandler.handle(e, 'updateProviderServiceTypes')
  } finally {
    isProcessing.value = false
  }
}

function handleClose() {
  if (hasChanges.value && !isProcessing.value) {
    if (confirm('มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการปิดหน้าต่างนี้หรือไม่?')) {
      emit('close')
    }
  } else {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="handleClose"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <!-- Header -->
          <div class="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-100">
            <div class="flex items-center justify-between">
              <div>
                <h2 id="modal-title" class="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  จัดการประเภทงาน
                </h2>
                <p class="text-sm text-gray-600 mt-2">
                  {{ provider.first_name }} {{ provider.last_name }}
                </p>
              </div>
              <button
                type="button"
                class="min-h-[44px] min-w-[44px] p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-xl transition-all"
                aria-label="ปิด"
                @click="handleClose"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto p-6">
            <div class="mb-6">
              <p class="text-sm text-gray-600 flex items-center gap-2">
                <svg class="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                เลือกประเภทงานที่ผู้ให้บริการสามารถรับได้
              </p>
            </div>

            <!-- Service Types Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                v-for="serviceType in SERVICE_TYPES"
                :key="serviceType.value"
                type="button"
                class="relative p-5 border-2 rounded-xl transition-all duration-200 text-left group"
                :class="[
                  isSelected(serviceType.value)
                    ? `border-${serviceType.color}-500 bg-${serviceType.color}-50 shadow-lg scale-105`
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md hover:scale-102'
                ]"
                @click="toggleServiceType(serviceType.value)"
              >
                <!-- Checkbox -->
                <div class="absolute top-4 right-4">
                  <div
                    class="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all"
                    :class="[
                      isSelected(serviceType.value)
                        ? `border-${serviceType.color}-500 bg-${serviceType.color}-500`
                        : 'border-gray-300 bg-white group-hover:border-gray-400'
                    ]"
                  >
                    <svg
                      v-if="isSelected(serviceType.value)"
                      class="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                <!-- Content -->
                <div class="pr-10">
                  <div class="flex items-center gap-3 mb-2">
                    <span class="text-3xl">{{ serviceType.icon }}</span>
                    <div>
                      <h3 class="text-lg font-bold text-gray-900">
                        {{ serviceType.label }}
                      </h3>
                      <p class="text-xs text-gray-500 mt-0.5">
                        {{ serviceType.description }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Selected Badge -->
                <div
                  v-if="isSelected(serviceType.value)"
                  class="absolute bottom-4 right-4"
                >
                  <span
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                    :class="`bg-${serviceType.color}-100 text-${serviceType.color}-700`"
                  >
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    เลือกแล้ว
                  </span>
                </div>
              </button>
            </div>

            <!-- Selected Count -->
            <div class="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-sm text-gray-600">
                  <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  เลือกแล้ว:
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-2xl font-bold text-primary-600">
                    {{ selectedTypes.length }}
                  </span>
                  <span class="text-sm text-gray-500">
                    / {{ SERVICE_TYPES.length }} ประเภท
                  </span>
                </div>
              </div>
              
              <!-- Selected Types List -->
              <div v-if="selectedTypes.length > 0" class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="type in selectedTypes"
                  :key="type"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border-2 shadow-sm"
                  :class="`border-${getServiceTypeConfig(type)?.color}-300 text-${getServiceTypeConfig(type)?.color}-700`"
                >
                  <span>{{ getServiceTypeConfig(type)?.icon }}</span>
                  {{ getServiceTypeConfig(type)?.label }}
                </span>
              </div>
            </div>

            <!-- Warning -->
            <div v-if="selectedTypes.length === 0" class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div class="flex items-start gap-3">
                <svg class="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p class="text-sm font-semibold text-yellow-800">กรุณาเลือกอย่างน้อย 1 ประเภท</p>
                  <p class="text-xs text-yellow-700 mt-1">ผู้ให้บริการต้องสามารถรับงานได้อย่างน้อย 1 ประเภท</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-4">
            <button
              type="button"
              class="min-h-[44px] px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-white hover:border-gray-400 transition-all font-medium"
              :disabled="isProcessing"
              @click="handleClose"
            >
              ยกเลิก
            </button>
            
            <button
              type="button"
              class="min-h-[44px] px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg"
              :class="[
                canSave
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              ]"
              :disabled="!canSave"
              @click="handleSave"
            >
              <svg
                v-if="isProcessing"
                class="w-5 h-5 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <svg
                v-else
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              {{ isProcessing ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.3s ease;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.9);
}

/* Dynamic color classes */
.border-blue-500 { border-color: rgb(59 130 246); }
.bg-blue-50 { background-color: rgb(239 246 255); }
.bg-blue-100 { background-color: rgb(219 234 254); }
.text-blue-700 { color: rgb(29 78 216); }
.border-blue-300 { border-color: rgb(147 197 253); }

.border-green-500 { border-color: rgb(34 197 94); }
.bg-green-50 { background-color: rgb(240 253 244); }
.bg-green-100 { background-color: rgb(220 252 231); }
.text-green-700 { color: rgb(21 128 61); }
.border-green-300 { border-color: rgb(134 239 172); }

.border-purple-500 { border-color: rgb(168 85 247); }
.bg-purple-50 { background-color: rgb(250 245 255); }
.bg-purple-100 { background-color: rgb(243 232 255); }
.text-purple-700 { color: rgb(126 34 206); }
.border-purple-300 { border-color: rgb(216 180 254); }

.border-orange-500 { border-color: rgb(249 115 22); }
.bg-orange-50 { background-color: rgb(255 247 237); }
.bg-orange-100 { background-color: rgb(255 237 213); }
.text-orange-700 { color: rgb(194 65 12); }
.border-orange-300 { border-color: rgb(253 186 116); }

.border-pink-500 { border-color: rgb(236 72 153); }
.bg-pink-50 { background-color: rgb(253 242 248); }
.bg-pink-100 { background-color: rgb(252 231 243); }
.text-pink-700 { color: rgb(190 24 93); }
.border-pink-300 { border-color: rgb(249 168 212); }
</style>
