<template>
  <div class="withdrawal-settings-card bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <section class="mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">การตั้งค่าการถอนเงิน Provider</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Min/Max Amount -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            จำนวนเงินขั้นต่ำ (บาท)
          </label>
          <input
            v-model.number="localSettings.min_amount"
            type="number"
            min="50"
            max="1000"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            จำนวนเงินสูงสุด (บาท)
          </label>
          <input
            v-model.number="localSettings.max_amount"
            type="number"
            min="1000"
            max="100000"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <!-- Daily Limit -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            วงเงินถอนต่อวัน (บาท)
          </label>
          <input
            v-model.number="localSettings.daily_limit"
            type="number"
            min="1000"
            max="1000000"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <!-- Max Pending -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            จำนวนคำขอถอนที่รอได้สูงสุด
          </label>
          <input
            v-model.number="localSettings.max_pending"
            type="number"
            min="1"
            max="10"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <!-- Fees -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            ค่าธรรมเนียมโอนธนาคาร (บาท)
          </label>
          <input
            v-model.number="localSettings.bank_transfer_fee"
            type="number"
            min="0"
            max="100"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            ค่าธรรมเนียม PromptPay (บาท)
          </label>
          <input
            v-model.number="localSettings.promptpay_fee"
            type="number"
            min="0"
            max="100"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <!-- Auto Approval -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            อนุมัติอัตโนมัติสำหรับยอดไม่เกิน (บาท)
          </label>
          <input
            v-model.number="localSettings.auto_approval_threshold"
            type="number"
            min="0"
            max="50000"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <!-- Processing Days -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            ระยะเวลาดำเนินการ
          </label>
          <input
            v-model="localSettings.processing_days"
            type="text"
            placeholder="1-3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>
    </section>

    <!-- Requirements Section -->
    <section class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 class="text-sm font-semibold text-blue-900 mb-3">เงื่อนไขการถอนเงิน</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs text-blue-700 mb-1">อายุบัญชีขั้นต่ำ (วัน)</label>
          <input
            v-model.number="localSettings.min_account_age_days"
            type="number"
            min="0"
            max="365"
            class="w-full px-2 py-1 text-sm border border-blue-300 rounded"
          />
        </div>
        <div>
          <label class="block text-xs text-blue-700 mb-1">จำนวนงานที่ทำสำเร็จขั้นต่ำ</label>
          <input
            v-model.number="localSettings.min_completed_trips"
            type="number"
            min="0"
            max="100"
            class="w-full px-2 py-1 text-sm border border-blue-300 rounded"
          />
        </div>
        <div>
          <label class="block text-xs text-blue-700 mb-1">คะแนนขั้นต่ำ</label>
          <input
            v-model.number="localSettings.min_rating"
            type="number"
            min="0"
            max="5"
            step="0.1"
            class="w-full px-2 py-1 text-sm border border-blue-300 rounded"
          />
        </div>
      </div>
    </section>

    <!-- Change Reason -->
    <section class="mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        เหตุผลในการเปลี่ยนแปลง
      </label>
      <textarea
        v-model="changeReason"
        rows="2"
        placeholder="ระบุเหตุผล..."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg"
      ></textarea>
    </section>

    <!-- Actions -->
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
import type { WithdrawalSettings } from '@/types/financial-settings'

const { withdrawalSettings, updateWithdrawalSettings } = useFinancialSettings()

const localSettings = ref<WithdrawalSettings>({
  min_amount: 100,
  max_amount: 50000,
  daily_limit: 100000,
  bank_transfer_fee: 10,
  promptpay_fee: 5,
  auto_approval_threshold: 5000,
  max_pending: 3,
  processing_days: '1-3',
  min_account_age_days: 7,
  min_completed_trips: 5,
  min_rating: 4.0
})

const originalSettings = ref<WithdrawalSettings>({ ...localSettings.value })
const changeReason = ref('')
const saving = ref(false)

const hasChanges = computed(() => {
  return JSON.stringify(localSettings.value) !== JSON.stringify(originalSettings.value)
})

async function save() {
  if (!hasChanges.value) return
  saving.value = true
  try {
    await updateWithdrawalSettings(localSettings.value, changeReason.value)
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
  if (withdrawalSettings.value) {
    localSettings.value = { ...withdrawalSettings.value }
    originalSettings.value = { ...withdrawalSettings.value }
  }
})

watch(withdrawalSettings, (newSettings) => {
  if (newSettings && !hasChanges.value) {
    localSettings.value = { ...newSettings }
    originalSettings.value = { ...newSettings }
  }
})
</script>
