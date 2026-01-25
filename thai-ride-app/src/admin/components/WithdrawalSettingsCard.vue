<template>
  <div class="withdrawal-settings">
    <div class="settings-row">
      <div class="setting-item">
        <div class="label">ยอดถอนขั้นต่ำ</div>
        <div class="current-value">ปัจจุบัน: {{ originalSettings.min_amount.toLocaleString() }} ฿</div>
        <div class="input-wrapper">
          <input
            v-model.number="localSettings.min_amount"
            type="number"
            min="100"
            max="1000"
            step="50"
            :class="{ changed: localSettings.min_amount !== originalSettings.min_amount }"
          />
          <span class="unit">฿</span>
        </div>
        <div class="hint">แนะนำ: 100-500 บาท</div>
      </div>

      <div class="setting-item">
        <div class="label">ยอดถอนสูงสุด</div>
        <div class="current-value">ปัจจุบัน: {{ originalSettings.max_amount.toLocaleString() }} ฿</div>
        <div class="input-wrapper">
          <input
            v-model.number="localSettings.max_amount"
            type="number"
            min="1000"
            max="100000"
            step="1000"
            :class="{ changed: localSettings.max_amount !== originalSettings.max_amount }"
          />
          <span class="unit">฿</span>
        </div>
        <div class="hint">แนะนำ: 10,000-50,000 บาท</div>
      </div>
    </div>

    <div v-if="hasChanges" class="actions">
      <button type="button" class="btn-cancel" @click="reset" :disabled="saving">ยกเลิก</button>
      <button type="button" class="btn-save" @click="showReasonModal = true" :disabled="saving">
        <LoadingSpinner v-if="saving" size="sm" color="white" />
        {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
      </button>
    </div>

    <ChangeReasonModal
      v-model="showReasonModal"
      v-model:reason="changeReason"
      placeholder="กรุณาระบุเหตุผลในการเปลี่ยนแปลง (เช่น ปรับนโยบาย, เพิ่มความยืดหยุ่น)"
      @confirm="confirmSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useFinancialSettings } from '@/admin/composables/useFinancialSettings'
import ChangeReasonModal from '@/admin/components/settings/ChangeReasonModal.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import type { WithdrawalSettings } from '@/types/financial-settings'

const { withdrawalSettings, updateWithdrawalSettings } = useFinancialSettings()

const localSettings = ref<WithdrawalSettings>({
  min_amount: 100,
  max_amount: 50000,
  bank_transfer_fee: 10,
  promptpay_fee: 5,
  daily_limit: 100000,
  auto_approval_threshold: 10000,
  max_pending: 3,
  processing_days: '1-3',
  min_account_age_days: 7,
  min_completed_trips: 5,
  min_rating: 4.0
})

const originalSettings = ref<WithdrawalSettings>({ ...localSettings.value })
const changeReason = ref('')
const saving = ref(false)
const showReasonModal = ref(false)

const hasChanges = computed(() => 
  JSON.stringify(localSettings.value) !== JSON.stringify(originalSettings.value)
)

async function confirmSave() {
  if (!changeReason.value.trim()) return
  
  saving.value = true
  try {
    await updateWithdrawalSettings(localSettings.value, changeReason.value)
    originalSettings.value = { ...localSettings.value }
    showReasonModal.value = false
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

<style scoped>
.withdrawal-settings { display: flex; flex-direction: column; gap: 1.5rem; }

.settings-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }

.setting-item { display: flex; flex-direction: column; gap: 0.5rem; }
.label { font-size: 0.875rem; font-weight: 500; color: #000; }
.current-value { font-size: 0.75rem; color: #666; }

.input-wrapper { position: relative; }
.input-wrapper input { width: 100%; padding: 0.5rem 2rem 0.5rem 0.75rem; border: 1px solid #e5e5e5; border-radius: 6px; font-size: 0.875rem; }
.input-wrapper input:focus { outline: none; border-color: #000; }
.input-wrapper input.changed { border-color: #3b82f6; background: #eff6ff; }
.input-wrapper .unit { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); font-size: 0.875rem; color: #666; }

.hint { font-size: 0.75rem; color: #666; }

.actions { display: flex; gap: 0.75rem; justify-content: flex-end; padding-top: 1rem; border-top: 1px solid #f5f5f5; }
.btn-cancel, .btn-save { padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.875rem; font-weight: 500; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 0.5rem; }
.btn-cancel { background: #fff; color: #000; border: 1px solid #e5e5e5; }
.btn-cancel:hover:not(:disabled) { background: #fafafa; }
.btn-save { background: #000; color: #fff; }
.btn-save:hover:not(:disabled) { background: #333; }
.btn-cancel:disabled, .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
