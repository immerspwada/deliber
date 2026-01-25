<template>
  <div class="withdrawal-settings-table">
    <!-- Desktop: Table -->
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200">
            <th :class="tableHeaderCell">การตั้งค่า</th>
            <th :class="tableHeaderCell">ค่าปัจจุบัน</th>
            <th :class="tableHeaderCell">ค่าใหม่</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr :class="getTableRowColor('green')">
            <td class="px-6 py-4 text-sm font-medium text-gray-900">จำนวนเงินขั้นต่ำ</td>
            <td class="px-6 py-4 text-sm text-gray-600">
              <span id="withdrawal-min-current" aria-label="ค่าปัจจุบัน">
                {{ originalSettings.min_amount }} บาท
              </span>
            </td>
            <td class="px-6 py-4">
              <label for="withdrawal-min-amount" class="sr-only">จำนวนเงินขั้นต่ำ</label>
              <input
                id="withdrawal-min-amount"
                v-model.number="localSettings.min_amount"
                type="number"
                min="100"
                max="1000"
                aria-label="จำนวนเงินขั้นต่ำ"
                aria-describedby="withdrawal-min-current"
                :class="getFormInputColor('green')"
              />
            </td>
          </tr>
          <tr :class="getTableRowColor('green')">
            <td class="px-6 py-4 text-sm font-medium text-gray-900">จำนวนเงินสูงสุด</td>
            <td class="px-6 py-4 text-sm text-gray-600">
              <span id="withdrawal-max-current" aria-label="ค่าปัจจุบัน">
                {{ originalSettings.max_amount }} บาท
              </span>
            </td>
            <td class="px-6 py-4">
              <label for="withdrawal-max-amount" class="sr-only">จำนวนเงินสูงสุด</label>
              <input
                id="withdrawal-max-amount"
                v-model.number="localSettings.max_amount"
                type="number"
                min="1000"
                max="100000"
                aria-label="จำนวนเงินสูงสุด"
                aria-describedby="withdrawal-max-current"
                :class="getFormInputColor('green')"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Actions -->
    <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
      <button
        type="button"
        :disabled="!hasChanges"
        class="min-h-[44px] px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="reset"
      >
        รีเซ็ต
      </button>
      <button
        type="button"
        :disabled="!hasChanges || saving"
        :class="getBtnColor('green')"
        @click="showReasonModal = true"
      >
        <LoadingSpinner v-if="saving" size="sm" />
        <span>{{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}</span>
      </button>
    </div>

    <!-- Change Reason Modal -->
    <ChangeReasonModal
      v-model="showReasonModal"
      v-model:reason="changeReason"
      placeholder="กรุณาระบุเหตุผลในการเปลี่ยนแปลงการตั้งค่า"
      @confirm="confirmSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinancialSettingsStyles } from '@/admin/composables/useFinancialSettingsStyles'
import ChangeReasonModal from '@/admin/components/settings/ChangeReasonModal.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const { tableHeaderCell, getTableRowColor, getFormInputColor, getBtnColor } = useFinancialSettingsStyles()

interface WithdrawalSettings {
  min_amount: number
  max_amount: number
}

const localSettings = ref<WithdrawalSettings>({
  min_amount: 100,
  max_amount: 50000
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
    // TODO: Implement save logic
    await new Promise(resolve => setTimeout(resolve, 1000))
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
</script>
