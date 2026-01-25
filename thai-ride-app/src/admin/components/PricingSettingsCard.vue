<script setup lang="ts">
import { ref, watch, onMounted, h, computed } from 'vue'
import { useFinancialSettings } from '@/admin/composables/useFinancialSettings'
import { useErrorHandler } from '@/composables/useErrorHandler'
import ChangeReasonModal from '@/admin/components/settings/ChangeReasonModal.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import type { DistanceRates, ServicePricing } from '@/types/financial-settings'

const { handle: handleError } = useErrorHandler()

// Active tab
const activeTab = ref<keyof DistanceRates>('ride')

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
  { key: 'ride', label: 'บริการเรียกรถ', sublabel: 'Ride Service', icon: CarIcon, color: '#3b82f6' },
  { key: 'delivery', label: 'บริการจัดส่ง', sublabel: 'Delivery Service', icon: PackageIcon, color: '#10b981' },
  { key: 'shopping', label: 'บริการช้อปปิ้ง', sublabel: 'Shopping Service', icon: CartIcon, color: '#f59e0b' },
  { key: 'moving', label: 'บริการขนย้าย', sublabel: 'Moving Service', icon: TruckIcon, color: '#8b5cf6' },
  { key: 'queue', label: 'บริการจองคิว', sublabel: 'Queue Service', icon: PeopleIcon, color: '#ec4899' },
  { key: 'laundry', label: 'บริการซักรีด', sublabel: 'Laundry Service', icon: LaundryIcon, color: '#06b6d4' }
] as const

// Get active service
const activeService = computed(() => services.find(s => s.key === activeTab.value)!)

// Count services with changes
const changedServicesCount = computed(() => {
  return services.filter(s => hasChange(s.key)).length
})

const { distanceRates, vehicleMultipliers: dbVehicleMultipliers, updateDistanceRates, updateVehicleMultipliers, loading, fetchSettings } = useFinancialSettings()

const localRates = ref<DistanceRates>({
  ride: { base_fare: 35, per_km: 8, min_fare: 35, max_fare: 1000 },
  delivery: { base_fare: 30, per_km: 10, min_fare: 30, max_fare: 500 },
  shopping: { base_fare: 40, per_km: 12, min_fare: 40, max_fare: 800 },
  moving: { base_fare: 200, per_km: 25, min_fare: 200, max_fare: 5000 },
  queue: { base_fare: 50, per_km: 0, min_fare: 50, max_fare: 500 },
  laundry: { base_fare: 60, per_km: 5, min_fare: 60, max_fare: 300 }
})

// Vehicle multipliers for ride service
const vehicleMultipliers = ref({
  bike: 0.7,      // มอเตอร์ไซค์ - ถูกกว่า 30%
  car: 1.0,       // รถยนต์ - ราคาปกติ
  premium: 1.5    // พรีเมียม - แพงกว่า 50%
})

const originalRates = ref<DistanceRates>({ ...localRates.value })
const originalMultipliers = ref({ ...vehicleMultipliers.value })
const changeReason = ref('')
const saving = ref(false)
const showReasonModal = ref(false)
const pendingServiceKey = ref<keyof DistanceRates | null>(null)
const validationErrors = ref<Record<string, string>>({})
const successMessage = ref('')

// Example distance for preview
const exampleDistance = ref(5)

function hasChange(key: keyof DistanceRates): boolean {
  const local = localRates.value[key]
  const original = originalRates.value[key]
  const ratesChanged = local.base_fare !== original.base_fare || 
         local.per_km !== original.per_km ||
         local.min_fare !== original.min_fare ||
         local.max_fare !== original.max_fare
  
  // For ride service, also check vehicle multipliers
  if (key === 'ride') {
    const multipliersChanged = 
      vehicleMultipliers.value.bike !== originalMultipliers.value.bike ||
      vehicleMultipliers.value.car !== originalMultipliers.value.car ||
      vehicleMultipliers.value.premium !== originalMultipliers.value.premium
    return ratesChanged || multipliersChanged
  }
  
  return ratesChanged
}

function validatePricing(pricing: ServicePricing, serviceKey: string): string | null {
  if (pricing.base_fare < 0) {
    return 'ค่าเริ่มต้นต้องไม่ต่ำกว่า 0 บาท'
  }
  if (pricing.per_km < 0) {
    return 'ค่าต่อกิโลเมตรต้องไม่ต่ำกว่า 0 บาท'
  }
  if (pricing.min_fare < 0) {
    return 'ค่าบริการขั้นต่ำต้องไม่ต่ำกว่า 0 บาท'
  }
  if (pricing.max_fare < pricing.min_fare) {
    return 'ค่าบริการสูงสุดต้องมากกว่าค่าบริการขั้นต่ำ'
  }
  if (pricing.base_fare > pricing.max_fare) {
    return 'ค่าเริ่มต้นต้องไม่เกินค่าบริการสูงสุด'
  }
  if (pricing.base_fare < pricing.min_fare) {
    return 'ค่าเริ่มต้นต้องไม่ต่ำกว่าค่าบริการขั้นต่ำ'
  }
  return null
}

function calculateExampleFare(pricing: ServicePricing, distance: number): number {
  const total = pricing.base_fare + (pricing.per_km * distance)
  return Math.max(pricing.min_fare, Math.min(pricing.max_fare, total))
}

function formatCurrency(value: number): string {
  return `${value.toFixed(0)} ฿`
}

function saveIndividualRate(serviceKey: keyof DistanceRates) {
  // Validate before showing modal
  const error = validatePricing(localRates.value[serviceKey], serviceKey)
  if (error) {
    validationErrors.value[serviceKey] = error
    return
  }
  
  validationErrors.value = {}
  pendingServiceKey.value = serviceKey
  showReasonModal.value = true
}

async function confirmSave() {
  if (!pendingServiceKey.value || !changeReason.value.trim()) return
  
  saving.value = true
  successMessage.value = ''
  
  try {
    // Save distance rates
    const ratesResult = await updateDistanceRates(localRates.value, changeReason.value)
    
    // For ride service, also save vehicle multipliers if changed
    if (pendingServiceKey.value === 'ride') {
      const multipliersChanged = 
        vehicleMultipliers.value.bike !== originalMultipliers.value.bike ||
        vehicleMultipliers.value.car !== originalMultipliers.value.car ||
        vehicleMultipliers.value.premium !== originalMultipliers.value.premium
      
      if (multipliersChanged) {
        await updateVehicleMultipliers(vehicleMultipliers.value, changeReason.value)
      }
    }
    
    if (ratesResult?.success) {
      originalRates.value = JSON.parse(JSON.stringify(localRates.value))
      originalMultipliers.value = JSON.parse(JSON.stringify(vehicleMultipliers.value))
      successMessage.value = 'บันทึกการเปลี่ยนแปลงสำเร็จ'
      showReasonModal.value = false
      changeReason.value = ''
      pendingServiceKey.value = null
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
    }
  } catch (error) {
    handleError(error, 'PricingSettings.confirmSave')
  } finally {
    saving.value = false
  }
}

async function loadSettings() {
  try {
    await fetchSettings('pricing')
  } catch (error) {
    handleError(error, 'PricingSettings.loadSettings')
  }
}

onMounted(() => {
  loadSettings()
  
  if (distanceRates.value) {
    localRates.value = JSON.parse(JSON.stringify(distanceRates.value))
    originalRates.value = JSON.parse(JSON.stringify(distanceRates.value))
  }
  
  if (dbVehicleMultipliers.value) {
    vehicleMultipliers.value = JSON.parse(JSON.stringify(dbVehicleMultipliers.value))
    originalMultipliers.value = JSON.parse(JSON.stringify(dbVehicleMultipliers.value))
  }
})

watch(distanceRates, (newRates) => {
  if (newRates) {
    localRates.value = JSON.parse(JSON.stringify(newRates))
    originalRates.value = JSON.parse(JSON.stringify(newRates))
  }
})

watch(dbVehicleMultipliers, (newMultipliers) => {
  if (newMultipliers) {
    vehicleMultipliers.value = JSON.parse(JSON.stringify(newMultipliers))
    originalMultipliers.value = JSON.parse(JSON.stringify(newMultipliers))
  }
})
</script>

<template>
  <div class="pricing-settings">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <LoadingSpinner size="lg" />
      <p class="loading-text">กำลังโหลดการตั้งค่าราคา...</p>
    </div>

    <template v-else>
      <!-- Success Message -->
      <div v-if="successMessage" class="success-banner">
        <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
        </svg>
        {{ successMessage }}
      </div>

      <!-- Service Tabs -->
      <div class="tabs-container">
        <div class="tabs-header">
          <button
            v-for="service in services"
            :key="service.key"
            type="button"
            class="tab-button"
            :class="{ active: activeTab === service.key, 'has-changes': hasChange(service.key) }"
            @click="activeTab = service.key"
          >
            <component :is="service.icon" />
            <span class="tab-label">{{ service.label }}</span>
            <span v-if="hasChange(service.key)" class="change-indicator">●</span>
          </button>
        </div>

        <!-- Changes Summary -->
        <div v-if="changedServicesCount > 0" class="changes-summary">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          มีการเปลี่ยนแปลง {{ changedServicesCount }} บริการ - อย่าลืมบันทึก
        </div>
      </div>

      <!-- Example Distance Slider -->
      <div class="example-section" :style="{ background: `linear-gradient(135deg, ${activeService.color} 0%, ${activeService.color}dd 100%)` }">
        <div class="example-header">
          <div>
            <div class="example-title">ตัวอย่างการคำนวณค่าบริการ</div>
            <div class="example-subtitle">{{ activeService.label }} - ระยะทาง {{ exampleDistance }} กิโลเมตร</div>
          </div>
          <div class="example-fare-large">
            {{ formatCurrency(calculateExampleFare(localRates[activeTab], exampleDistance)) }}
          </div>
        </div>
        <div class="slider-wrapper">
          <input 
            v-model.number="exampleDistance" 
            type="range" 
            min="1" 
            max="50" 
            step="1"
            class="distance-slider"
          />
          <div class="slider-labels">
            <span>1 กม.</span>
            <span>{{ exampleDistance }} กม.</span>
            <span>50 กม.</span>
          </div>
        </div>
      </div>

      <!-- Active Service Card -->
      <div class="service-card">
        <div class="service-header">
          <div class="service-info">
            <div class="service-icon-large" :style="{ background: `${activeService.color}15`, color: activeService.color }">
              <component :is="activeService.icon" />
            </div>
            <div>
              <div class="service-name">{{ activeService.label }}</div>
              <div class="service-sublabel">{{ activeService.sublabel }}</div>
            </div>
          </div>
        </div>

        <div class="pricing-grid">
          <!-- Base Fare -->
          <div class="pricing-field">
            <label :for="`base-${activeTab}`">
              <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ค่าเริ่มต้น (Base Fare)
            </label>
            <div class="input-wrapper">
              <input
                :id="`base-${activeTab}`"
                v-model.number="localRates[activeTab].base_fare"
                type="number"
                step="5"
                min="0"
                :class="{ changed: hasChange(activeTab) }"
                :disabled="loading || saving"
              />
              <span class="unit">฿</span>
            </div>
          </div>

          <!-- Per KM Rate -->
          <div class="pricing-field">
            <label :for="`perkm-${activeTab}`">
              <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              ค่าต่อกิโลเมตร (Per KM)
            </label>
            <div class="input-wrapper">
              <input
                :id="`perkm-${activeTab}`"
                v-model.number="localRates[activeTab].per_km"
                type="number"
                step="1"
                min="0"
                :class="{ changed: hasChange(activeTab) }"
                :disabled="loading || saving"
              />
              <span class="unit">฿/กม.</span>
            </div>
          </div>

          <!-- Min Fare -->
          <div class="pricing-field">
            <label :for="`min-${activeTab}`">
              <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
              ค่าบริการขั้นต่ำ (Min Fare)
            </label>
            <div class="input-wrapper">
              <input
                :id="`min-${activeTab}`"
                v-model.number="localRates[activeTab].min_fare"
                type="number"
                step="5"
                min="0"
                :class="{ changed: hasChange(activeTab) }"
                :disabled="loading || saving"
              />
              <span class="unit">฿</span>
            </div>
          </div>

          <!-- Max Fare -->
          <div class="pricing-field">
            <label :for="`max-${activeTab}`">
              <svg class="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              ค่าบริการสูงสุด (Max Fare)
            </label>
            <div class="input-wrapper">
              <input
                :id="`max-${activeTab}`"
                v-model.number="localRates[activeTab].max_fare"
                type="number"
                step="50"
                min="0"
                :class="{ changed: hasChange(activeTab) }"
                :disabled="loading || saving"
              />
              <span class="unit">฿</span>
            </div>
          </div>
        </div>

        <!-- Validation Error -->
        <div v-if="validationErrors[activeTab]" class="validation-error">
          <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ validationErrors[activeTab] }}
        </div>

        <!-- Vehicle Multipliers (Ride Service Only) -->
        <div v-if="activeTab === 'ride'" class="vehicle-multipliers">
          <div class="multipliers-header">
            <div class="multipliers-title">
              <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              ตัวคูณราคาตามประเภทรถ (Vehicle Multipliers)
            </div>
            <div class="multipliers-subtitle">
              กำหนดตัวคูณสำหรับแต่ละประเภทรถ - ราคาจะคำนวณจากราคาฐาน × ตัวคูณ
            </div>
          </div>

          <div class="multipliers-grid">
            <!-- Bike -->
            <div class="multiplier-card">
              <div class="multiplier-icon" style="background: #fef3c7; color: #f59e0b;">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div class="multiplier-info">
                <div class="multiplier-name">🏍️ มอเตอร์ไซค์</div>
                <div class="multiplier-desc">Motorcycle / Bike</div>
              </div>
              <div class="multiplier-input-wrapper">
                <input
                  v-model.number="vehicleMultipliers.bike"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="3"
                  class="multiplier-input"
                  :class="{ changed: vehicleMultipliers.bike !== 0.7 }"
                />
                <span class="multiplier-unit">×</span>
              </div>
              <div class="multiplier-example">
                ตัวอย่าง: {{ formatCurrency(calculateExampleFare(localRates.ride, exampleDistance) * vehicleMultipliers.bike) }}
              </div>
            </div>

            <!-- Car -->
            <div class="multiplier-card">
              <div class="multiplier-icon" style="background: #dbeafe; color: #3b82f6;">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div class="multiplier-info">
                <div class="multiplier-name">🚗 รถยนต์</div>
                <div class="multiplier-desc">Standard Car</div>
              </div>
              <div class="multiplier-input-wrapper">
                <input
                  v-model.number="vehicleMultipliers.car"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="3"
                  class="multiplier-input"
                  :class="{ changed: vehicleMultipliers.car !== 1.0 }"
                />
                <span class="multiplier-unit">×</span>
              </div>
              <div class="multiplier-example">
                ตัวอย่าง: {{ formatCurrency(calculateExampleFare(localRates.ride, exampleDistance) * vehicleMultipliers.car) }}
              </div>
            </div>

            <!-- Premium -->
            <div class="multiplier-card">
              <div class="multiplier-icon" style="background: #f3e8ff; color: #8b5cf6;">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div class="multiplier-info">
                <div class="multiplier-name">🚙 พรีเมียม</div>
                <div class="multiplier-desc">Premium / Luxury</div>
              </div>
              <div class="multiplier-input-wrapper">
                <input
                  v-model.number="vehicleMultipliers.premium"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="3"
                  class="multiplier-input"
                  :class="{ changed: vehicleMultipliers.premium !== 1.5 }"
                />
                <span class="multiplier-unit">×</span>
              </div>
              <div class="multiplier-example">
                ตัวอย่าง: {{ formatCurrency(calculateExampleFare(localRates.ride, exampleDistance) * vehicleMultipliers.premium) }}
              </div>
            </div>
          </div>

          <div class="multipliers-note">
            <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <strong>หมายเหตุ:</strong> ตัวคูณจะนำไปคูณกับราคาฐานที่คำนวณได้ เช่น ถ้าราคาฐาน 100฿ และตัวคูณมอเตอร์ไซค์ 0.7 จะได้ราคา 70฿
            </div>
          </div>
        </div>

        <!-- Calculation Formula -->
        <div class="formula">
          <div class="formula-label">สูตรคำนวณ:</div>
          <div class="formula-text">
            ค่าบริการ = {{ localRates[activeTab].base_fare }} ฿ + (ระยะทาง × {{ localRates[activeTab].per_km }} ฿/กม.)
            <span class="formula-note">
              (ขั้นต่ำ {{ localRates[activeTab].min_fare }} ฿, สูงสุด {{ localRates[activeTab].max_fare }} ฿)
            </span>
          </div>
        </div>

        <!-- Save Button -->
        <button
          v-if="hasChange(activeTab)"
          type="button"
          class="btn-save"
          @click="saveIndividualRate(activeTab)"
          :disabled="saving || loading"
        >
          <LoadingSpinner v-if="saving && pendingServiceKey === activeTab" size="sm" color="white" />
          <svg v-else class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          {{ saving && pendingServiceKey === activeTab ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง' }}
        </button>
      </div>
    </template>

    <ChangeReasonModal
      v-model="showReasonModal"
      v-model:reason="changeReason"
      placeholder="กรุณาระบุเหตุผลในการเปลี่ยนแปลงราคาบริการ (เช่น ปรับตามราคาน้ำมัน, โปรโมชั่นพิเศษ)"
      @confirm="confirmSave"
    />
  </div>
</template>

<style scoped>
.pricing-settings { display: flex; flex-direction: column; gap: 1.5rem; }

.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; gap: 1rem; }
.loading-text { font-size: 0.875rem; color: #666; }

.success-banner { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; background: #d1fae5; border: 1px solid #10b981; border-radius: 8px; color: #065f46; font-size: 0.875rem; font-weight: 500; animation: slideDown 0.3s ease-out; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

/* Tabs */
.tabs-container { background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; }
.tabs-header { display: flex; overflow-x: auto; border-bottom: 1px solid #e5e5e5; }
.tabs-header::-webkit-scrollbar { height: 4px; }
.tabs-header::-webkit-scrollbar-track { background: #f5f5f5; }
.tabs-header::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 2px; }

.tab-button { position: relative; flex: 1; min-width: 140px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem; background: transparent; border: none; border-bottom: 2px solid transparent; color: #666; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.tab-button:hover { background: #fafafa; color: #000; }
.tab-button.active { color: #000; border-bottom-color: currentColor; background: #fafafa; }
.tab-button .tab-label { display: none; }
@media (min-width: 640px) { .tab-button .tab-label { display: inline; } }

.change-indicator { position: absolute; top: 0.5rem; right: 0.5rem; width: 8px; height: 8px; background: #ef4444; border-radius: 50%; animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

.tab-button.has-changes { color: #3b82f6; }
.tab-button.has-changes.active { border-bottom-color: #3b82f6; }

.changes-summary { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: #fef3c7; border-top: 1px solid #fbbf24; color: #92400e; font-size: 0.875rem; font-weight: 500; }

.validation-error { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: #fee2e2; border: 1px solid #ef4444; border-radius: 6px; color: #991b1b; font-size: 0.875rem; margin-bottom: 1rem; }

.example-section { border-radius: 8px; padding: 1.5rem; color: white; transition: background 0.3s; }
.example-header { display: flex; align-items: center; justify-content: space-between; gap: 2rem; margin-bottom: 1rem; }
.example-title { font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem; }
.example-subtitle { font-size: 0.875rem; opacity: 0.9; }
.example-fare-large { font-size: 2.5rem; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }

.slider-wrapper { width: 100%; }
.distance-slider { width: 100%; height: 8px; border-radius: 4px; background: rgba(255,255,255,0.3); outline: none; -webkit-appearance: none; cursor: pointer; }
.distance-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 24px; height: 24px; border-radius: 50%; background: white; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2); transition: transform 0.2s; }
.distance-slider::-webkit-slider-thumb:hover { transform: scale(1.1); }
.distance-slider::-moz-range-thumb { width: 24px; height: 24px; border-radius: 50%; background: white; cursor: pointer; border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }

.slider-labels { display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.75rem; opacity: 0.9; }

.service-card { background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 1.5rem; transition: all 0.2s; }
.service-card:hover { border-color: #d4d4d4; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

.service-header { margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #f5f5f5; }
.service-info { display: flex; align-items: center; gap: 1rem; }
.service-icon-large { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.service-icon-large svg { width: 28px; height: 28px; }
.service-name { font-size: 1.25rem; font-weight: 600; color: #000; margin-bottom: 0.25rem; }
.service-sublabel { font-size: 0.875rem; color: #666; }

.pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem; }

.pricing-field label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; font-weight: 600; color: #666; margin-bottom: 0.625rem; text-transform: uppercase; letter-spacing: 0.025em; }
.input-wrapper { position: relative; }
.input-wrapper input { width: 100%; padding: 0.75rem 3.5rem 0.75rem 1rem; border: 2px solid #e5e5e5; border-radius: 8px; font-size: 1rem; font-weight: 600; transition: all 0.2s; }
.input-wrapper input:focus { outline: none; border-color: #000; box-shadow: 0 0 0 4px rgba(0,0,0,0.05); }
.input-wrapper input:disabled { background: #f5f5f5; cursor: not-allowed; opacity: 0.6; }
.input-wrapper input.changed { border-color: #3b82f6; background: #eff6ff; }
.input-wrapper .unit { position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); font-size: 0.875rem; color: #666; font-weight: 600; pointer-events: none; }

.formula { background: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem; }
.formula-label { font-size: 0.75rem; font-weight: 700; color: #666; margin-bottom: 0.625rem; text-transform: uppercase; letter-spacing: 0.05em; }
.formula-text { font-size: 0.9375rem; color: #000; font-family: 'Courier New', monospace; line-height: 1.6; }
.formula-note { display: block; font-size: 0.8125rem; color: #666; margin-top: 0.5rem; font-family: system-ui; }

.btn-save { display: inline-flex; align-items: center; gap: 0.625rem; padding: 0.875rem 1.5rem; background: #000; color: #fff; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-save:hover:not(:disabled) { background: #333; transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.15); }
.btn-save:active:not(:disabled) { transform: translateY(0); }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

.icon-xs { width: 0.875rem; height: 0.875rem; }
.icon-sm { width: 1rem; height: 1rem; }

/* Vehicle Multipliers */
.vehicle-multipliers { background: #fafafa; border: 1px solid #e5e5e5; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }

.multipliers-header { margin-bottom: 1.25rem; }
.multipliers-title { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; font-weight: 600; color: #000; margin-bottom: 0.5rem; }
.multipliers-subtitle { font-size: 0.875rem; color: #666; line-height: 1.5; }

.multipliers-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 1rem; }

.multiplier-card { background: #fff; border: 2px solid #e5e5e5; border-radius: 8px; padding: 1.25rem; transition: all 0.2s; }
.multiplier-card:hover { border-color: #d4d4d4; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

.multiplier-icon { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; }
.multiplier-icon svg { width: 24px; height: 24px; }

.multiplier-info { margin-bottom: 1rem; }
.multiplier-name { font-size: 1rem; font-weight: 600; color: #000; margin-bottom: 0.25rem; }
.multiplier-desc { font-size: 0.8125rem; color: #666; }

.multiplier-input-wrapper { position: relative; margin-bottom: 0.75rem; }
.multiplier-input { width: 100%; padding: 0.75rem 3rem 0.75rem 1rem; border: 2px solid #e5e5e5; border-radius: 8px; font-size: 1.125rem; font-weight: 600; transition: all 0.2s; }
.multiplier-input:focus { outline: none; border-color: #000; box-shadow: 0 0 0 4px rgba(0,0,0,0.05); }
.multiplier-input.changed { border-color: #3b82f6; background: #eff6ff; }
.multiplier-unit { position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); font-size: 1rem; color: #666; font-weight: 600; pointer-events: none; }

.multiplier-example { font-size: 0.875rem; color: #666; padding: 0.5rem 0.75rem; background: #f5f5f5; border-radius: 6px; text-align: center; font-weight: 500; }

.multipliers-note { display: flex; align-items: flex-start; gap: 0.75rem; padding: 1rem; background: #eff6ff; border: 1px solid #3b82f6; border-radius: 6px; font-size: 0.875rem; color: #1e40af; line-height: 1.6; }
.multipliers-note svg { flex-shrink: 0; margin-top: 0.125rem; }
</style>
