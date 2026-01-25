<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 overflow-y-auto" @click.self="close">
    <div class="flex items-center justify-center min-h-screen px-4">
      <div class="fixed inset-0 bg-black opacity-50"></div>
      
      <div class="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b">
          <h2 class="text-xl font-semibold text-gray-900">ประวัติการเปลี่ยนแปลงการตั้งค่า</h2>
          <button class="text-gray-400 hover:text-gray-600" @click="close">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Filters -->
        <div class="p-4 bg-gray-50 border-b">
          <div class="flex items-center gap-4">
            <select v-model="selectedCategory" class="px-3 py-2 border border-gray-300 rounded-lg" @change="loadAuditLog">
              <option value="">ทุกประเภท</option>
              <option value="commission">คอมมิชชั่น</option>
              <option value="withdrawal">การถอนเงิน</option>
              <option value="topup">การเติมเงิน</option>
            </select>
            <button class="px-4 py-2 bg-primary-600 text-white rounded-lg" @click="loadAuditLog">รีเฟรช</button>
          </div>
        </div>

        <!-- Content -->
        <div class="p-6 overflow-y-auto max-h-[60vh]">
          <div v-if="loading" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>

          <div v-else-if="auditLog.length === 0" class="text-center py-8 text-gray-500">
            ไม่มีประวัติการเปลี่ยนแปลง
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="log in auditLog"
              :key="log.id"
              class="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div class="flex items-start justify-between mb-2">
                <div>
                  <span class="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                    {{ getCategoryLabel(log.category) }}
                  </span>
                  <span class="ml-2 text-sm font-medium text-gray-900">{{ log.key }}</span>
                </div>
                <span class="text-xs text-gray-500">{{ formatDate(log.created_at) }}</span>
              </div>

              <div class="text-sm text-gray-600 mb-2">
                <span class="font-medium">{{ log.changed_by_name }}</span>
                <span class="text-gray-400"> ({{ log.changed_by_email }})</span>
              </div>

              <div v-if="log.change_reason" class="text-sm text-gray-700 mb-3 italic">
                "{{ log.change_reason }}"
              </div>

              <div class="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div class="font-medium text-gray-700 mb-1">ค่าเดิม:</div>
                  <pre class="bg-red-50 p-2 rounded overflow-x-auto">{{ formatValue(log.old_value) }}</pre>
                </div>
                <div>
                  <div class="font-medium text-gray-700 mb-1">ค่าใหม่:</div>
                  <pre class="bg-green-50 p-2 rounded overflow-x-auto">{{ formatValue(log.new_value) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end p-4 border-t bg-gray-50">
          <button class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300" @click="close">
            ปิด
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useFinancialSettings } from '@/admin/composables/useFinancialSettings'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { auditLog, fetchAuditLog } = useFinancialSettings()
const loading = ref(false)
const selectedCategory = ref('')

const categoryLabels: Record<string, string> = {
  commission: 'คอมมิชชั่น',
  withdrawal: 'การถอนเงิน',
  topup: 'การเติมเงิน',
  surge: 'Surge Pricing',
  subscription: 'Subscription'
}

function getCategoryLabel(category: string): string {
  return categoryLabels[category] || category
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function formatValue(value: any): string {
  if (!value) return 'N/A'
  return JSON.stringify(value, null, 2)
}

async function loadAuditLog() {
  loading.value = true
  try {
    await fetchAuditLog(selectedCategory.value || undefined, 50)
  } finally {
    loading.value = false
  }
}

function close() {
  emit('update:modelValue', false)
}

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    loadAuditLog()
  }
})
</script>
