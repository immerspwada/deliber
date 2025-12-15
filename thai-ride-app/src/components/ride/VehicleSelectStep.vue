<script setup lang="ts">
import { ref, computed } from 'vue'

interface VehicleOption {
  id: string
  name: string
  desc: string
  price: number
  time: number
}

const props = defineProps<{
  pickup: string
  destination: string
  routeInfo: { distance: number; duration: number } | null
  vehicleOptions: VehicleOption[]
  selectedVehicle: string
  estimatedPrice: number
  finalPrice: number
  promoApplied: boolean
  promoDiscount: number
}>()

const emit = defineEmits<{
  'update:selectedVehicle': [value: string]
  'request-ride': []
  'apply-promo': [code: string]
  'remove-promo': []
  'update:scheduledTime': [value: string]
  'open-fare-split': []
}>()

const showPromoInput = ref(false)
const showSchedule = ref(false)
const promoCode = ref('')
const scheduledTime = ref('')
const promoLoading = ref(false)

const scheduleOptions = [
  { label: 'ตอนนี้', value: '' },
  { label: '15 นาที', value: '15min' },
  { label: '30 นาที', value: '30min' },
  { label: '1 ชั่วโมง', value: '1hr' },
  { label: 'เลือกเวลา', value: 'custom' }
]

const selectedVehicleData = computed(() => 
  props.vehicleOptions.find(v => v.id === props.selectedVehicle)
)

const handleApplyPromo = async () => {
  if (!promoCode.value) return
  promoLoading.value = true
  emit('apply-promo', promoCode.value)
  promoLoading.value = false
  showPromoInput.value = false
}

const handleRemovePromo = () => {
  promoCode.value = ''
  emit('remove-promo')
}

const selectSchedule = (value: string) => {
  scheduledTime.value = value
  emit('update:scheduledTime', value)
  showSchedule.value = false
}
</script>

<template>
  <div class="route-info-bar">
    <div class="route-text">
      <span class="route-from">{{ pickup }}</span>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="route-arrow">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
      </svg>
      <span class="route-to">{{ destination }}</span>
    </div>
    <div v-if="routeInfo" class="route-meta">
      {{ routeInfo.distance.toFixed(1) }} กม. · {{ routeInfo.duration }} นาที
    </div>
  </div>

  <div class="vehicle-list">
    <button 
      v-for="vehicle in vehicleOptions"
      :key="vehicle.id"
      @click="$emit('update:selectedVehicle', vehicle.id)"
      :class="['vehicle-card', { selected: selectedVehicle === vehicle.id }]"
    >
      <div class="vehicle-icon-wrap">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
        </svg>
      </div>
      <div class="vehicle-details">
        <div class="vehicle-name-row">
          <span class="vehicle-name">{{ vehicle.name }}</span>
          <span class="vehicle-eta">{{ vehicle.time }} นาที</span>
        </div>
        <span class="vehicle-desc">{{ vehicle.desc }}</span>
      </div>
      <div class="vehicle-price">฿{{ vehicle.price }}+</div>
    </button>
  </div>

  <!-- Payment & Promo -->
  <div class="options-row">
    <button class="option-btn">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
      </svg>
      <span>เงินสด</span>
    </button>
    <button class="option-btn" @click="showPromoInput = !showPromoInput">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
      </svg>
      <span>{{ promoApplied ? `-฿${promoDiscount}` : 'โปรโมชั่น' }}</span>
    </button>
    <button class="option-btn" @click="showSchedule = !showSchedule">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <span>{{ scheduledTime ? 'นัดเวลา' : 'ตอนนี้' }}</span>
    </button>
  </div>

  <!-- Fare Split Option -->
  <div class="options-row">
    <button class="option-btn fare-split-btn" @click="$emit('open-fare-split')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
      </svg>
      <span>แบ่งค่าโดยสาร</span>
    </button>
  </div>

  <!-- Promo input -->
  <div v-if="showPromoInput" class="promo-section">
    <div v-if="!promoApplied" class="promo-input-row">
      <input v-model="promoCode" type="text" placeholder="ใส่โค้ดส่วนลด" class="promo-input" />
      <button @click="handleApplyPromo" :disabled="!promoCode || promoLoading" class="promo-apply">
        {{ promoLoading ? '...' : 'ใช้' }}
      </button>
    </div>
    <div v-else class="promo-applied">
      <span class="promo-badge">ลด ฿{{ promoDiscount }}</span>
      <button @click="handleRemovePromo" class="promo-remove">ลบ</button>
    </div>
  </div>

  <!-- Schedule options -->
  <div v-if="showSchedule" class="schedule-section">
    <div class="schedule-options">
      <button 
        v-for="opt in scheduleOptions" 
        :key="opt.value"
        @click="selectSchedule(opt.value)"
        :class="['schedule-opt', { active: scheduledTime === opt.value }]"
      >
        {{ opt.label }}
      </button>
    </div>
  </div>

  <div class="confirm-bar">
    <div class="price-display">
      <span class="price-label">{{ promoApplied ? 'หลังส่วนลด' : 'ราคาประมาณ' }}</span>
      <div class="price-row">
        <span v-if="promoApplied" class="price-original">฿{{ estimatedPrice }}</span>
        <span class="price-value">฿{{ finalPrice }}</span>
      </div>
    </div>
    <button @click="$emit('request-ride')" class="btn-confirm">
      เรียก {{ selectedVehicleData?.name }}
    </button>
  </div>
</template>

<style scoped>
/* Route Info Bar */
.route-info-bar {
  padding: 14px 0;
  margin-bottom: 16px;
  border-bottom: 1px solid #F0F0F0;
}

.route-text {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  margin-bottom: 6px;
}

.route-from {
  color: #666;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-arrow {
  width: 18px;
  height: 18px;
  color: #888;
  flex-shrink: 0;
}

.route-to {
  font-weight: 600;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-meta {
  font-size: 13px;
  color: #888;
  font-weight: 500;
}

/* Vehicle List */
.vehicle-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
  max-height: 220px;
  overflow-y: auto;
  padding: 2px;
}

.vehicle-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: white;
  border: 2px solid #E8E8E8;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 72px;
}

.vehicle-card:hover {
  border-color: #D0D0D0;
  background: #FAFAFA;
}

.vehicle-card:active {
  transform: scale(0.99);
}

.vehicle-card.selected {
  border-color: #000;
  background: #FAFAFA;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.vehicle-icon-wrap {
  width: 56px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F6F6F6;
  border-radius: 10px;
}

.vehicle-icon-wrap svg {
  width: 32px;
  height: 32px;
  stroke-width: 1.5;
}

.vehicle-details {
  flex: 1;
}

.vehicle-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 2px;
}

.vehicle-name {
  font-size: 16px;
  font-weight: 600;
}

.vehicle-eta {
  font-size: 12px;
  color: #666;
  background: #F0F0F0;
  padding: 2px 8px;
  border-radius: 10px;
}

.vehicle-desc {
  font-size: 13px;
  color: #888;
}

.vehicle-price {
  font-size: 16px;
  font-weight: 700;
}

/* Options Row */
.options-row {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.option-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 10px;
  background: #F6F6F6;
  border: none;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
}

.option-btn:hover {
  background: #EBEBEB;
}

.option-btn:active {
  transform: scale(0.97);
}

.option-btn svg {
  width: 18px;
  height: 18px;
  stroke-width: 1.5;
}

.fare-split-btn {
  flex: 1;
}

/* Promo Section */
.promo-section {
  margin-bottom: 12px;
}

.promo-input-row {
  display: flex;
  gap: 8px;
}

.promo-input {
  flex: 1;
  padding: 12px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}

.promo-input:focus {
  border-color: #000;
}

.promo-apply {
  padding: 12px 20px;
  background: #000;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
}

.promo-apply:disabled {
  background: #CCC;
}

.promo-applied {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #E8F5E9;
  border-radius: 8px;
}

.promo-badge {
  font-size: 14px;
  font-weight: 600;
  color: #2E7D32;
}

.promo-remove {
  padding: 6px 12px;
  background: none;
  border: none;
  color: #E11900;
  font-size: 13px;
  cursor: pointer;
}

/* Schedule Section */
.schedule-section {
  margin-bottom: 12px;
}

.schedule-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.schedule-opt {
  padding: 8px 16px;
  background: #F6F6F6;
  border: 2px solid transparent;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
}

.schedule-opt.active {
  border-color: #000;
  background: white;
}

/* Confirm Bar */
.confirm-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 8px;
  border-top: 1px solid #F0F0F0;
  margin-top: 8px;
}

.price-display {
  display: flex;
  flex-direction: column;
  min-width: 90px;
}

.price-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 2px;
}

.price-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.price-original {
  font-size: 14px;
  color: #999;
  text-decoration: line-through;
}

.price-value {
  font-size: 22px;
  font-weight: 700;
}

.btn-confirm {
  flex: 1;
  padding: 18px;
  background: #000;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-confirm:hover {
  opacity: 0.9;
}

.btn-confirm:active {
  transform: scale(0.98);
}
</style>
