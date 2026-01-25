<template>
  <div class="topup-settings-card bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <section class="mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">การตั้งค่าการเติมเงิน</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">จำนวนเงินขั้นต่ำ (บาท)</label>
          <input v-model.number="localSettings.min_amount" type="number" min="10" max="500" class="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">จำนวนเงินสูงสุด (บาท)</label>
          <input v-model.number="localSettings.max_amount" type="number" min="500" max="100000" class="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">วงเงินเติมต่อวัน (บาท)</label>
          <input v-model.number="localSettings.daily_limit" type="number" class="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">ระยะเวลาหมดอายุ (ชั่วโมง)</label>
          <input v-model.number="localSettings.expiry_hours" type="number" class="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>
    </section>

    <section class="mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">เหตุผล</label>
      <textarea v-model="changeReason" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea>
    </section>

    <div class="flex items-center justify-end gap-3 pt-4 border-t">
      <button :disabled="!hasChanges" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg" @click="reset">รีเซ็ต</button>
      <button :disabled="!hasChanges || saving" class="px-6 py-2 bg-primary-600 text-white rounded-lg" @click="save">{{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useFinancialSettings } from '@/admin/composables/useFinancialSettings'
import type { TopupSettings } from '@/types/financial-settings'

const { topupSettings, updateTopupSettings } = useFinancialSettings()

const localSettings = ref<TopupSettings>({
  min_amount: 50,
  max_amount: 50000,
  daily_limit: 100000,
  credit_card_fee: 0.025,
  bank_transfer_fee: 0,
  promptpay_fee: 0.01,
  truemoney_fee: 0.02,
  auto_approval_threshold: 10000,
  expiry_hours: 24,
  require_slip_threshold: 1000
})

const originalSettings = ref<TopupSettings>({ ...localSettings.value })
const changeReason = ref('')
const saving = ref(false)

const hasChanges = computed(() => JSON.stringify(localSettings.value) !== JSON.stringify(originalSettings.value))

async function save() {
  if (!hasChanges.value) return
  saving.value = true
  try {
    await updateTopupSettings(localSettings.value, changeReason.value)
    originalSettings.value = { ...localSettings.value }
    changeReason.value = ''
  } finally {
    saving.value = false
  }
}

function reset() {
  localSettings.value = { ...originalSettings.value }
  changeReason.value = ''
}

onMounted(() => {
  if (topupSettings.value) {
    localSettings.value = { ...topupSettings.value }
    originalSettings.value = { ...topupSettings.value }
  }
})

watch(topupSettings, (newSettings) => {
  if (newSettings && !hasChanges.value) {
    localSettings.value = { ...newSettings }
    originalSettings.value = { ...newSettings }
  }
})
</script>
