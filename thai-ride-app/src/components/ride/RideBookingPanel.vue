<script setup lang="ts">
/**
 * Component: RideBookingPanel
 * แสดงสรุปการเดินทางและเลือกประเภทรถ
 * Enhanced UX: Haptic feedback, smooth animations, better visual feedback
 */
import { ref, computed, watch } from 'vue'
import type { GeoLocation } from '../../composables/useLocation'
import type { VehicleOption } from '../../composables/useRideRequest'
import RidePromoInput from './RidePromoInput.vue'
import RidePaymentMethod, { type PaymentMethod } from './RidePaymentMethod.vue'
import RideSchedulePicker from './RideSchedulePicker.vue'
import RideMultiStop from './RideMultiStop.vue'
import NotesInput from './NotesInput.vue'
import SmartPromoSuggestion from '@/components/customer/SmartPromoSuggestion.vue'

const props = defineProps<{
  pickup: GeoLocation | null
  destination: GeoLocation | null
  vehicles: VehicleOption[]
  selectedVehicle: string
  estimatedFare: number
  estimatedDistance: number
  estimatedTime: number
  finalFare: number
  currentBalance: number
  hasEnoughBalance: boolean
  canBook: boolean
  isBooking: boolean
  isLoadingVehicles: boolean
  notes?: string
}>()

// Notes model
const notesValue = defineModel<string>('notes', { default: '' })

const emit = defineEmits<{
  'update:selectedVehicle': [value: string]
  book: [options: BookingOptions]
  topup: []
}>()

// Haptic feedback helper
function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 30 }
    navigator.vibrate(patterns[style])
  }
}

// Booking options interface
interface BookingOptions {
  paymentMethod: PaymentMethod
  scheduledTime: string | null
  promoCode: string | null
  promoDiscount: number
  finalAmount: number
  notes: string
}

// Enhanced state
const paymentMethod = ref<PaymentMethod>('wallet')
const scheduledTime = ref<string | null>(null)
const promoCode = ref<string | null>(null)
const promoDiscount = ref(0)
const isValidatingPromo = ref(false)

// UI state for visual feedback
const pressedVehicleId = ref<string | null>(null)
const isBookButtonPressed = ref(false)

// Multi-stop state
interface StopPoint {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  waitTime?: number
}
const multiStops = ref<StopPoint[]>([])
const multiStopFare = ref(0)

// Computed final fare with discount
const discountedFare = computed(() => {
  const baseFare = props.finalFare + multiStopFare.value
  return Math.max(0, baseFare - promoDiscount.value)
})

// Check if can book based on payment method
const canBookWithPayment = computed(() => {
  if (paymentMethod.value === 'cash') {
    return props.pickup && props.destination && !props.isBooking
  }
  // For wallet, check balance
  const hasBalance = props.currentBalance >= discountedFare.value
  return props.pickup && props.destination && !props.isBooking && hasBalance
})

// Check if has enough balance for wallet payment
const hasEnoughForWallet = computed(() => {
  return props.currentBalance >= discountedFare.value
})

// Handle vehicle selection with haptic
function handleSelectVehicle(vehicleId: string): void {
  triggerHaptic('light')
  pressedVehicleId.value = vehicleId
  setTimeout(() => {
    pressedVehicleId.value = null
    emit('update:selectedVehicle', vehicleId)
  }, 80)
}

// Handle promo code from manual input
async function handleApplyPromo(code: string): Promise<void> {
  isValidatingPromo.value = true
  
  // Simulate promo validation (replace with actual API call)
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Demo: Accept some promo codes
  const validPromos: Record<string, number> = {
    'FIRST50': 50,
    'RIDE20': 20,
    'VIP100': 100,
    'NEWUSER': 30
  }
  
  if (validPromos[code]) {
    triggerHaptic('medium')
    promoCode.value = code
    promoDiscount.value = Math.min(validPromos[code], props.finalFare * 0.5) // Max 50% discount
  } else {
    triggerHaptic('heavy')
    alert('โค้ดไม่ถูกต้องหรือหมดอายุ')
  }
  
  isValidatingPromo.value = false
}

// Handle promo from Smart Promo component
function handleSmartPromoApplied(result: { code: string; discount: number; finalFare: number }): void {
  triggerHaptic('medium')
  promoCode.value = result.code
  promoDiscount.value = result.discount
}

function handleRemovePromo(): void {
  triggerHaptic('light')
  promoCode.value = null
  promoDiscount.value = 0
}

// Multi-stop handlers
function handleStopsUpdate(stops: StopPoint[]): void {
  multiStops.value = stops
}

function handleMultiStopFareChange(additionalFare: number): void {
  multiStopFare.value = additionalFare
}

function handleBook(): void {
  triggerHaptic('heavy')
  isBookButtonPressed.value = true
  setTimeout(() => {
    isBookButtonPressed.value = false
    emit('book', {
      paymentMethod: paymentMethod.value,
      scheduledTime: scheduledTime.value,
      promoCode: promoCode.value,
      promoDiscount: promoDiscount.value,
      finalAmount: discountedFare.value,
      notes: notesValue.value
    })
  }, 100)
}

// Reset promo when fare changes significantly
watch(() => props.finalFare, (newFare, oldFare) => {
  if (Math.abs(newFare - oldFare) > 10 && promoCode.value) {
    // Recalculate discount
    promoDiscount.value = Math.min(promoDiscount.value, newFare * 0.5)
  }
})

function getVehicleIcon(icon: string): string {
  if (icon === 'bike') {
    return 'M5 17a3 3 0 100-6 3 3 0 000 6zM19 17a3 3 0 100-6 3 3 0 000 6zM12 17V5l4 4M8 8h4'
  }
  if (icon === 'premium') {
    return 'M5 17h14v-5l-2-5H7l-2 5v5zM7 17a2 2 0 100-4 2 2 0 000 4zM17 17a2 2 0 100-4 2 2 0 000 4zM9 7l1-3h4l1 3'
  }
  // Default car
  return 'M5 17h14v-5l-2-5H7l-2 5v5zM7 17a2 2 0 100-4 2 2 0 000 4zM17 17a2 2 0 100-4 2 2 0 000 4z'
}
</script>

<template>
  <div class="booking-panel">
    <!-- Trip Summary -->
    <div class="trip-summary">
      <div class="trip-route">
        <div class="route-line">
          <div class="dot green"></div>
          <div class="line"></div>
          <div class="dot red"></div>
        </div>
        <div class="route-info">
          <span class="route-from">{{ pickup?.address }}</span>
          <span class="route-to">{{ destination?.address }}</span>
        </div>
      </div>
      <div class="trip-meta">
        <span class="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          {{ estimatedDistance.toFixed(1) }} กม.
        </span>
        <span class="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
          ~{{ estimatedTime }} นาที
        </span>
      </div>
    </div>

    <!-- Vehicle Options -->
    <div class="vehicle-section">
      <h3 class="section-label">เลือกประเภทรถ</h3>
      
      <!-- Loading skeleton -->
      <div v-if="isLoadingVehicles" class="vehicles-loading">
        <div v-for="i in 3" :key="i" class="skeleton-card" :style="{ '--delay': `${i * 100}ms` }"></div>
      </div>
      
      <!-- Vehicle cards - optimized with v-memo -->
      <div v-else class="vehicle-options">
        <button
          v-for="(v, index) in vehicles"
          :key="v.id"
          v-memo="[selectedVehicle === v.id, estimatedFare, v.multiplier, pressedVehicleId === v.id]"
          class="vehicle-card"
          :class="{ 
            selected: selectedVehicle === v.id,
            pressed: pressedVehicleId === v.id
          }"
          :style="{ '--delay': `${index * 50}ms` }"
          @click="handleSelectVehicle(v.id)"
        >
          <div class="vehicle-icon-wrapper">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path :d="getVehicleIcon(v.icon)" />
            </svg>
            <Transition name="check">
              <div v-if="selectedVehicle === v.id" class="check-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            </Transition>
          </div>
          <span class="vehicle-name">{{ v.name }}</span>
          <span class="vehicle-price">฿{{ Math.round(estimatedFare * v.multiplier) }}</span>
          <span class="vehicle-eta">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
            {{ v.eta }}
          </span>
        </button>
      </div>
    </div>

    <!-- Schedule Picker -->
    <RideSchedulePicker
      v-model:scheduled-time="scheduledTime"
    />

    <!-- Multi-Stop -->
    <RideMultiStop
      :pickup="pickup"
      :destination="destination"
      :max-stops="3"
      @update:stops="handleStopsUpdate"
      @fare-change="handleMultiStopFareChange"
    />

    <!-- Notes Input -->
    <NotesInput
      v-model="notesValue"
      :max-length="500"
      placeholder="เพิ่มข้อความถึงคนขับ เช่น รอที่ล็อบบี้, โทรเมื่อถึง..."
    />

    <!-- Smart Promo Suggestion (AI-powered) -->
    <SmartPromoSuggestion
      v-if="!promoCode && estimatedFare > 0"
      service-type="ride"
      :estimated-fare="estimatedFare"
      :pickup="pickup"
      @applied="handleSmartPromoApplied"
    />

    <!-- Manual Promo Code Input (fallback) -->
    <RidePromoInput
      v-if="!promoCode"
      :applied-code="promoCode ?? undefined"
      :discount="promoDiscount"
      :is-validating="isValidatingPromo"
      @apply="handleApplyPromo"
      @remove="handleRemovePromo"
    />
    
    <!-- Applied Promo Display -->
    <div v-else class="applied-promo-badge">
      <div class="promo-info">
        <span class="promo-icon">🎁</span>
        <div class="promo-details">
          <span class="promo-code">{{ promoCode }}</span>
          <span class="promo-savings">ประหยัด ฿{{ promoDiscount.toLocaleString() }}</span>
        </div>
      </div>
      <button class="remove-promo-btn" @click="handleRemovePromo">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Payment Method -->
    <RidePaymentMethod
      v-model:selected-method="paymentMethod"
      :wallet-balance="currentBalance"
      :required-amount="discountedFare"
      @topup="emit('topup')"
    />

    <!-- Fare Summary -->
    <div v-if="promoDiscount > 0 || multiStopFare > 0" class="fare-summary">
      <div class="fare-row">
        <span>ค่าโดยสารพื้นฐาน</span>
        <span :class="{ 'original-fare': promoDiscount > 0 }">฿{{ finalFare.toLocaleString() }}</span>
      </div>
      <div v-if="multiStopFare > 0" class="fare-row">
        <span>ค่าจุดแวะ ({{ multiStops.length }} จุด)</span>
        <span>+฿{{ multiStopFare.toLocaleString() }}</span>
      </div>
      <div v-if="promoDiscount > 0" class="fare-row discount">
        <span>ส่วนลด ({{ promoCode }})</span>
        <span>-฿{{ promoDiscount.toLocaleString() }}</span>
      </div>
      <div class="fare-row total">
        <span>ยอดที่ต้องจ่าย</span>
        <span>฿{{ discountedFare.toLocaleString() }}</span>
      </div>
    </div>

    <!-- Book Button -->
    <button
      class="book-btn"
      :class="{ 
        'insufficient-balance': paymentMethod === 'wallet' && !hasEnoughForWallet,
        'scheduled': scheduledTime !== null,
        'pressed': isBookButtonPressed
      }"
      :disabled="!canBookWithPayment"
      @click="handleBook"
    >
      <span v-if="isBooking" class="btn-content">
        <svg class="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 11-6.219-8.56" />
        </svg>
        กำลังจอง...
      </span>
      <span v-else-if="paymentMethod === 'wallet' && !hasEnoughForWallet" class="btn-content">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
        เงินไม่พอ • ฿{{ discountedFare.toLocaleString() }}
      </span>
      <span v-else-if="scheduledTime" class="btn-content">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12,6 12,12 16,14" />
        </svg>
        จองล่วงหน้า • ฿{{ discountedFare.toLocaleString() }}
      </span>
      <span v-else class="btn-content">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 17h14v-5l-2-5H7l-2 5v5zM7 17a2 2 0 100-4 2 2 0 000 4zM17 17a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
        {{ paymentMethod === 'cash' ? 'จองเลย (เงินสด)' : 'จองเลย' }} • ฿{{ discountedFare.toLocaleString() }}
      </span>
    </button>

    <!-- Balance Warning (only for wallet payment) -->
    <Transition name="fade">
      <div v-if="paymentMethod === 'wallet' && !hasEnoughForWallet" class="balance-warning-box">
        <p class="balance-warning">
          ยอดเงินไม่พอ (คงเหลือ ฿{{ currentBalance.toLocaleString() }})
        </p>
        <button class="topup-link" @click="emit('topup')">
          เติมเงินเลย →
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.booking-panel {
  padding: 16px 16px 20px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

/* Trip Summary */
.trip-summary {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid #f0f0f0;
}

.trip-route {
  display: flex;
  gap: 14px;
  margin-bottom: 14px;
}

.route-line {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
}

.dot.green { background: #00a86b; }
.dot.red { background: #e53935; }

.line {
  width: 2px;
  flex: 1;
  min-height: 24px;
  background: linear-gradient(to bottom, #00a86b, #e53935);
  border-radius: 1px;
}

.route-info {
  display: flex;
  flex-direction: column;
  gap: 18px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.route-from,
.route-to {
  font-size: 14px;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
}

.trip-meta {
  display: flex;
  gap: 20px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
  background: #f5f5f5;
  padding: 6px 12px;
  border-radius: 20px;
}

.meta-item svg {
  color: #00a86b;
}

/* Vehicle Section */
.vehicle-section {
  margin-bottom: 14px;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.vehicles-loading {
  display: flex;
  gap: 12px;
}

.skeleton-card {
  flex: 1;
  height: 110px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  animation-delay: var(--delay, 0ms);
  border-radius: 14px;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.vehicle-options {
  display: flex;
  gap: 12px;
}

.vehicle-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: #f8f9fa;
  border: 2px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
  animation: card-appear 0.3s ease forwards;
  animation-delay: var(--delay, 0ms);
  opacity: 0;
}

@keyframes card-appear {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.vehicle-card:active,
.vehicle-card.pressed {
  transform: scale(0.96);
}

.vehicle-card.selected {
  background: #e8f5ef;
  border-color: #00a86b;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.15);
}

.vehicle-icon-wrapper {
  position: relative;
  color: #666;
  transition: all 0.2s ease;
}

.vehicle-card.selected .vehicle-icon-wrapper {
  color: #00a86b;
  transform: scale(1.1);
}

.check-badge {
  position: absolute;
  top: -4px;
  right: -8px;
  width: 20px;
  height: 20px;
  background: #00a86b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 2px 6px rgba(0, 168, 107, 0.4);
}

.check-enter-active,
.check-leave-active {
  transition: all 0.2s ease;
}

.check-enter-from,
.check-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

.vehicle-name {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
}

.vehicle-price {
  font-size: 17px;
  font-weight: 700;
  color: #00a86b;
}

.vehicle-eta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #999;
  background: rgba(0, 0, 0, 0.04);
  padding: 4px 8px;
  border-radius: 10px;
}

.vehicle-card.selected .vehicle-eta {
  background: rgba(0, 168, 107, 0.1);
  color: #00875a;
}

/* Book Button */
.book-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #00a86b 0%, #00875a 100%);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 168, 107, 0.3);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
  flex-shrink: 0;
}

.book-btn:disabled {
  background: #ccc;
  box-shadow: none;
  cursor: not-allowed;
}

.book-btn:active:not(:disabled),
.book-btn.pressed:not(:disabled) {
  transform: scale(0.97);
  box-shadow: 0 3px 10px rgba(0, 168, 107, 0.25);
}

.book-btn.insufficient-balance {
  background: linear-gradient(135deg, #999 0%, #777 100%);
  box-shadow: none;
}

.book-btn.scheduled {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  box-shadow: 0 6px 20px rgba(25, 118, 210, 0.35);
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

/* Fare Summary */
.fare-summary {
  background: #f8f9fa;
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 16px;
}

.fare-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #666;
  padding: 6px 0;
}

.fare-row .original-fare {
  text-decoration: line-through;
  color: #999;
}

.fare-row.discount {
  color: #00a86b;
}

.fare-row.total {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  border-top: 1px solid #e0e0e0;
  margin-top: 10px;
  padding-top: 12px;
}

.fare-row.total span:last-child {
  color: #00a86b;
  font-size: 18px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Balance Warning */
.balance-warning-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding: 14px;
  background: linear-gradient(135deg, #ffebee 0%, #fce4ec 100%);
  border-radius: 14px;
  border: 1px solid #ffcdd2;
}

.balance-warning {
  text-align: center;
  font-size: 13px;
  color: #c62828;
  margin: 0;
  font-weight: 500;
}

.topup-link {
  background: #e53935;
  border: none;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 10px 20px;
  border-radius: 20px;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.topup-link:active {
  transform: scale(0.96);
  background: #c62828;
}

/* Fade animation */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* Applied Promo Badge */
.applied-promo-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #e8f5ef 0%, #d4edda 100%);
  border: 2px solid #00a86b;
  border-radius: 14px;
  margin-bottom: 14px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.promo-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.promo-icon {
  font-size: 28px;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.promo-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.promo-code {
  font-size: 15px;
  font-weight: 700;
  color: #00875a;
  letter-spacing: 0.5px;
}

.promo-savings {
  font-size: 13px;
  color: #00a86b;
  font-weight: 600;
}

.remove-promo-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #666;
}

.remove-promo-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
}

.remove-promo-btn:active {
  transform: scale(0.9);
}
</style>
