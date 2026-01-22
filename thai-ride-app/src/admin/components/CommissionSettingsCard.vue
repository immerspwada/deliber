<template>
  <div class="commission-settings-card bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <section class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">อัตราคอมมิชชั่นตามประเภทบริการ</h2>
          <p class="text-sm text-gray-600 mt-1">กำหนดเปอร์เซ็นต์คอมมิชชั่นที่แพลตฟอร์มจะหักจากรายได้ของ Provider</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="service in services"
          :key="service.key"
          class="rate-item bg-gray-50 rounded-lg p-4 border border-gray-200"
        >
          <label class="block text-sm font-medium text-gray-700 mb-2">
            {{ service.label }}
          </label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="localRates[service.key]"
              type="number"
              min="0"
              max="50"
              step="0.1"
              @input="handleRateChange"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <span class="text-gray-600 font-medium">%</span>
          </div>
        </div>
      </div>
    </section>

    <section class="mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        เหตุผลในการเปลี่ยนแปลง
      </label>
      <textarea
        v-model="changeReason"
        rows="3"
        placeholder="ระบุเหตุผล..."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg"
      ></textarea>
    </section>

    <div class="flex items-center justify-end gap-3 pt-4 border-t">
      <button
        @click="reset"
        :disabled="!hasChanges"
        class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg"
      >
        รีเซ็ต
      </button>
      <button
        @click="save"
        :disabled="!hasChanges || saving"
        class="px-6 py-2 bg-primary-600 text-white rounded-lg"
      >
        {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useFinancialSettings } from '@/admin/composables/useFinancialSettings'
import type { CommissionRates } from '@/types/financial-settings'

const services = [
  { key: 'ride', label: '🚗 Ride' },
  { key: 'delivery', label: '📦 Delivery' },
  { key: 'shopping', label: '🛒 Shopping' },
  { key: 'moving', label: '🚚 Moving' },
  { key: 'queue', label: '👥 Queue' },
  { key: 'laundry', label: '👔 Laundry' }
]

const { commissionRates, updateCommissionRates } = useFinancialSettings()

const localRates = ref<CommissionRates>({
  ride: 0.20,
  delivery: 0.25,
  shopping: 0.15,
  moving: 0.18,
  queue: 0.15,
  laundry: 0.20
})

const originalRates = ref<CommissionRates>({ ...localRates.value })
const changeReason = ref('')
const saving = ref(false)

const hasChanges = computed(() => {
  return JSON.stringify(localRates.value) !== JSON.stringify(originalRates.value)
})

function handleRateChange() {
  // Validation happens on save
  // This function is kept for future validation logic if needed
}

async function save() {
  if (!hasChanges.value) return
  saving.value = true
  try {
    await updateCommissionRates(localRates.value, changeReason.value)
    originalRates.value = { ...localRates.value }
    changeReason.value = ''
  } finally {
    saving.value = false
  }
}

function reset() {
  localRates.value = { ...originalRates.value }
  changeReason.value = ''
}

onMounted(() => {
  if (commissionRates.value) {
    localRates.value = { ...commissionRates.value }
    originalRates.value = { ...commissionRates.value }
  }
})

watch(commissionRates, (newRates) => {
  if (newRates && !hasChanges.value) {
    localRates.value = { ...newRates }
    originalRates.value = { ...newRates }
  }
})
</script>
