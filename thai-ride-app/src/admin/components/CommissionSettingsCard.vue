<script setup lang="ts">
import { ref, watch, onMounted, h } from 'vue'
import { useFinancialSettings } from '@/admin/composables/useFinancialSettings'
import ChangeReasonModal from '@/admin/components/settings/ChangeReasonModal.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import type { CommissionRates } from '@/types/financial-settings'

const CarIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'icon-sm' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' })
])

const PackageIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'icon-sm' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' })
])

const CartIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'icon-sm' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' })
])

const TruckIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'icon-sm' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z' }),
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0' })
])

const PeopleIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'icon-sm' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' })
])

const LaundryIcon = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'icon-sm' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' })
])

const services = [
  { key: 'ride', label: 'บริการเรียกรถ', sublabel: 'Ride Service', icon: CarIcon },
  { key: 'delivery', label: 'บริการจัดส่ง', sublabel: 'Delivery Service', icon: PackageIcon },
  { key: 'shopping', label: 'บริการช้อปปิ้ง', sublabel: 'Shopping Service', icon: CartIcon },
  { key: 'moving', label: 'บริการขนย้าย', sublabel: 'Moving Service', icon: TruckIcon },
  { key: 'queue', label: 'บริการจองคิว', sublabel: 'Queue Service', icon: PeopleIcon },
  { key: 'laundry', label: 'บริการซักรีด', sublabel: 'Laundry Service', icon: LaundryIcon }
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

function getRecommendedRate(key: keyof CommissionRates): number {
  const recommended: Record<keyof CommissionRates, number> = {
    ride: 0.20,
    delivery: 0.25,
    shopping: 0.15,
    moving: 0.18,
    queue: 0.15,
    laundry: 0.20
  }
  return recommended[key]
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

<template>
  <div class="commission-settings">
    <div v-for="service in services" :key="service.key" class="service-row">
      <div class="service-info">
        <div class="service-icon">
          <component :is="service.icon" />
        </div>
        <div>
          <div class="service-name">{{ service.label }}</div>
          <div class="service-sublabel">{{ service.sublabel }}</div>
        </div>
      </div>

      <div class="rate-display">
        <div class="label">อัตราปัจจุบัน</div>
        <div class="value">{{ (originalRates[service.key] * 100).toFixed(1) }}%</div>
      </div>

      <div class="rate-input">
        <label :for="`rate-${service.key}`">ตั้งค่าอัตราใหม่</label>
        <div class="input-wrapper">
          <input
            :id="`rate-${service.key}`"
            v-model.number="localRates[service.key]"
            type="number"
            step="0.01"
            min="0"
            max="0.5"
            :class="{ changed: hasChange(service.key) }"
          />
          <span class="unit">%</span>
        </div>
        <div class="hint">แนะนำ: {{ formatPercentage(getRecommendedRate(service.key)) }}</div>
      </div>

      <button
        v-if="hasChange(service.key)"
        type="button"
        class="btn-save"
        @click="saveIndividualRate(service.key)"
        :disabled="saving"
      >
        <LoadingSpinner v-if="saving" size="sm" color="white" />
        <svg v-else class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
        </svg>
        {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
      </button>
    </div>

    <ChangeReasonModal
      v-model="showReasonModal"
      v-model:reason="changeReason"
      placeholder="กรุณาระบุเหตุผลในการเปลี่ยนแปลงอัตราคอมมิชชั่น (เช่น ปรับตามสภาวะตลาด, โปรโมชั่นพิเศษ)"
      @confirm="confirmSave"
    />
  </div>
</template>

<style scoped>
.commission-settings { display: flex; flex-direction: column; gap: 1rem; }

.service-row { display: flex; align-items: center; gap: 1.5rem; padding: 1rem; border: 1px solid #e5e5e5; border-radius: 6px; }
.service-row:hover { background: #fafafa; }

.service-info { display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 180px; }
.service-icon { width: 36px; height: 36px; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.service-name { font-size: 0.875rem; font-weight: 500; color: #000; }
.service-sublabel { font-size: 0.75rem; color: #666; }

.rate-display { text-align: right; min-width: 100px; }
.rate-display .label { font-size: 0.75rem; color: #666; margin-bottom: 0.25rem; }
.rate-display .value { font-size: 1.5rem; font-weight: 600; color: #000; }

.rate-input { flex: 1; max-width: 200px; }
.rate-input label { display: block; font-size: 0.75rem; font-weight: 500; color: #666; margin-bottom: 0.25rem; }
.input-wrapper { position: relative; }
.input-wrapper input { width: 100%; padding: 0.5rem 2rem 0.5rem 0.75rem; border: 1px solid #e5e5e5; border-radius: 6px; font-size: 0.875rem; }
.input-wrapper input:focus { outline: none; border-color: #000; }
.input-wrapper input.changed { border-color: #3b82f6; background: #eff6ff; }
.input-wrapper .unit { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); font-size: 0.875rem; color: #666; }
.hint { font-size: 0.75rem; color: #666; margin-top: 0.25rem; }

.btn-save { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #000; color: #fff; border: none; border-radius: 6px; font-size: 0.875rem; font-weight: 500; cursor: pointer; white-space: nowrap; }
.btn-save:hover:not(:disabled) { background: #333; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

.icon-sm { width: 1rem; height: 1rem; }
</style>
