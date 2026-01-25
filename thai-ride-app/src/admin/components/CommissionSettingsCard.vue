<template>
  <div class="commission-settings-table">
    <!-- Desktop: Table -->
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200">
            <th :class="tableHeaderCell">ประเภทบริการ</th>
            <th :class="tableHeaderCell">อัตราปัจจุบัน</th>
            <th :class="tableHeaderCell">อัตราใหม่</th>
            <th :class="tableHeaderCell + ' text-right'">การกระทำ</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <!-- Service Rows -->
          <tr 
            v-for="service in services" 
            :key="service.key"
            :class="getTableRowColor(service.color)"
          >
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div :class="getIconContainerColor(service.color)">
                  <component :is="service.icon" class="w-5 h-5" :class="`text-${service.color}-600`" aria-hidden="true" />
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ service.label }}</div>
                  <div class="text-xs text-gray-500">{{ service.sublabel }}</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-900">
              <span :id="`${service.key}-current-rate`" aria-label="อัตราปัจจุบัน">
                {{ formatPercentage(originalRates[service.key]) }}
              </span>
            </td>
            <td class="px-6 py-4">
              <label :for="`commission-rate-${service.key}`" class="sr-only">
                อัตราคอมมิชชั่น{{ service.label }}
              </label>
              <input
                :id="`commission-rate-${service.key}`"
                v-model.number="localRates[service.key]"
                type="number"
                step="0.01"
                min="0"
                max="0.5"
                :aria-label="`อัตราคอมมิชชั่น${service.label}`"
                :aria-describedby="`${service.key}-current-rate`"
                :class="getFormInputColor(service.color)"
              />
            </td>
            <td class="px-6 py-4 text-right">
              <button
                v-if="hasChange(service.key)"
                type="button"
                @click="saveIndividualRate(service.key)"
                :disabled="saving"
                :aria-label="`บันทึกอัตราคอมมิชชั่น${service.label}`"
                :class="getBtnColor(service.color) + ' min-w-[44px]'"
              >
                <LoadingSpinner v-if="saving" size="sm" />
                <span>{{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Change Reason Modal -->
    <ChangeReasonModal
      v-model="showReasonModal"
      v-model:reason="changeReason"
      placeholder="กรุณาระบุเหตุผลในการเปลี่ยนแปลงอัตราคอมมิชชั่น"
      @confirm="confirmSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, h } from 'vue'
import { useFinancialSettings } from '@/admin/composables/useFinancialSettings'
import { useFinancialSettingsStyles } from '@/admin/composables/useFinancialSettingsStyles'
import ChangeReasonModal from '@/admin/components/settings/ChangeReasonModal.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import type { CommissionRates } from '@/types/financial-settings'

const { tableHeaderCell, getTableRowColor, getFormInputColor, getBtnColor, getIconContainerColor } = useFinancialSettingsStyles()

// Service icons as functional components
const CarIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' })
])

const PackageIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' })
])

const CartIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' })
])

const TruckIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z' }),
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0' })
])

const PeopleIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' })
])

const LaundryIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' })
])

const services = [
  { key: 'ride', label: 'บริการเรียกรถ', sublabel: 'Ride Service', color: 'blue', icon: CarIcon },
  { key: 'delivery', label: 'บริการจัดส่ง', sublabel: 'Delivery Service', color: 'green', icon: PackageIcon },
  { key: 'shopping', label: 'บริการช้อปปิ้ง', sublabel: 'Shopping Service', color: 'purple', icon: CartIcon },
  { key: 'moving', label: 'บริการขนย้าย', sublabel: 'Moving Service', color: 'orange', icon: TruckIcon },
  { key: 'queue', label: 'บริการจองคิว', sublabel: 'Queue Service', color: 'yellow', icon: PeopleIcon },
  { key: 'laundry', label: 'บริการซักรีด', sublabel: 'Laundry Service', color: 'cyan', icon: LaundryIcon }
] as const

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
const showReasonModal = ref(false)
const pendingServiceKey = ref<keyof CommissionRates | null>(null)

function hasChange(key: keyof CommissionRates): boolean {
  return localRates.value[key] !== originalRates.value[key]
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function saveIndividualRate(serviceKey: keyof CommissionRates) {
  pendingServiceKey.value = serviceKey
  showReasonModal.value = true
}

async function confirmSave() {
  if (!pendingServiceKey.value || !changeReason.value.trim()) return
  
  saving.value = true
  try {
    await updateCommissionRates(localRates.value, changeReason.value)
    originalRates.value = { ...localRates.value }
    showReasonModal.value = false
    changeReason.value = ''
    pendingServiceKey.value = null
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (commissionRates.value) {
    localRates.value = { ...commissionRates.value }
    originalRates.value = { ...commissionRates.value }
  }
})

watch(commissionRates, (newRates) => {
  if (newRates) {
    localRates.value = { ...newRates }
    originalRates.value = { ...newRates }
  }
})
</script>
