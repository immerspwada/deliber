<!--
  Feature: F61 - Booking Confirmation Component
  
  แสดงหน้ายืนยันการจอง
  - สรุปข้อมูลการจอง
  - ราคาและรายละเอียด
  - ปุ่มยืนยัน/ยกเลิก
-->
<template>
  <div class="booking-confirmation">
    <!-- Header -->
    <div class="confirmation-header">
      <h2>ยืนยันการจอง</h2>
    </div>

    <!-- Route Summary -->
    <div class="route-summary">
      <div class="route-point">
        <div class="point-dot pickup"></div>
        <div class="point-content">
          <div class="point-label">จุดรับ</div>
          <div class="point-address">{{ pickupAddress }}</div>
        </div>
      </div>
      <div class="route-line"></div>
      <div class="route-point">
        <div class="point-dot destination"></div>
        <div class="point-content">
          <div class="point-label">จุดหมาย</div>
          <div class="point-address">{{ destinationAddress }}</div>
        </div>
      </div>
    </div>

    <!-- Trip Details -->
    <div class="trip-details">
      <div class="detail-item">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <span>{{ distance }} กม.</span>
      </div>
      <div class="detail-item">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
        <span>{{ duration }} นาที</span>
      </div>
    </div>

    <!-- Ride Type -->
    <div class="ride-type-section">
      <div class="ride-type-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 17h14v-5l-2-4H7l-2 4v5z"/>
          <circle cx="7.5" cy="17" r="1.5"/>
          <circle cx="16.5" cy="17" r="1.5"/>
        </svg>
      </div>
      <div class="ride-type-info">
        <div class="ride-type-name">{{ rideTypeLabel }}</div>
        <div class="ride-type-desc">{{ rideTypeDescription }}</div>
      </div>
    </div>

    <!-- Payment Method -->
    <div class="payment-section">
      <div class="section-label">วิธีชำระเงิน</div>
      <button class="payment-selector" @click="$emit('changePayment')">
        <div class="payment-icon">
          <svg v-if="paymentMethod === 'cash'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="6" width="20" height="12" rx="2"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="4" width="22" height="16" rx="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
        </div>
        <span>{{ paymentMethodLabel }}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
      </button>
    </div>

    <!-- Promo Code -->
    <div class="promo-section" v-if="showPromo">
      <button v-if="!promoCode" class="promo-btn" @click="$emit('addPromo')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
          <circle cx="7" cy="7" r="1"/>
        </svg>
        <span>เพิ่มโค้ดส่วนลด</span>
      </button>
      <div v-else class="promo-applied">
        <div class="promo-info">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          <span>{{ promoCode }}</span>
          <span class="promo-discount">-฿{{ promoDiscount }}</span>
        </div>
        <button class="remove-promo" @click="$emit('removePromo')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Price Summary -->
    <div class="price-summary">
      <div class="price-row">
        <span>ค่าโดยสาร</span>
        <span>฿{{ baseFare }}</span>
      </div>
      <div v-if="surgeFare > 0" class="price-row surge">
        <span>ค่าช่วงเร่งด่วน</span>
        <span>+฿{{ surgeFare }}</span>
      </div>
      <div v-if="promoDiscount > 0" class="price-row discount">
        <span>ส่วนลด</span>
        <span>-฿{{ promoDiscount }}</span>
      </div>
      <div class="price-row total">
        <span>รวมทั้งหมด</span>
        <span>฿{{ totalFare }}</span>
      </div>
    </div>

    <!-- Surge Warning -->
    <div v-if="isSurge" class="surge-warning">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      <span>ราคาสูงกว่าปกติเนื่องจากความต้องการสูง</span>
    </div>

    <!-- Actions -->
    <div class="confirmation-actions">
      <button class="btn-secondary" @click="$emit('cancel')">
        ยกเลิก
      </button>
      <button 
        class="btn-primary" 
        :disabled="loading"
        @click="$emit('confirm')"
      >
        <span v-if="loading">กำลังจอง...</span>
        <span v-else>ยืนยันการจอง</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  pickupAddress: string
  destinationAddress: string
  distance: number
  duration: number
  rideType: 'standard' | 'premium' | 'shared'
  paymentMethod: 'cash' | 'card' | 'wallet'
  baseFare: number
  surgeFare?: number
  promoCode?: string
  promoDiscount?: number
  loading?: boolean
  showPromo?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  surgeFare: 0,
  promoDiscount: 0,
  loading: false,
  showPromo: true
})

defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
  (e: 'changePayment'): void
  (e: 'addPromo'): void
  (e: 'removePromo'): void
}>()

const rideTypeLabel = computed(() => {
  switch (props.rideType) {
    case 'standard': return 'มาตรฐาน'
    case 'premium': return 'พรีเมียม'
    case 'shared': return 'แชร์'
  }
})

const rideTypeDescription = computed(() => {
  switch (props.rideType) {
    case 'standard': return 'รถยนต์ทั่วไป สะดวกสบาย'
    case 'premium': return 'รถหรู บริการพิเศษ'
    case 'shared': return 'แชร์กับผู้โดยสารอื่น'
  }
})

const paymentMethodLabel = computed(() => {
  switch (props.paymentMethod) {
    case 'cash': return 'เงินสด'
    case 'card': return 'บัตรเครดิต/เดบิต'
    case 'wallet': return 'กระเป๋าเงิน'
  }
})

const totalFare = computed(() => {
  return props.baseFare + props.surgeFare - props.promoDiscount
})

const isSurge = computed(() => props.surgeFare > 0)
</script>

<style scoped>
.booking-confirmation {
  background: #ffffff;
  border-radius: 16px 16px 0 0;
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}

.confirmation-header {
  text-align: center;
  margin-bottom: 20px;
}

.confirmation-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #000000;
}

/* Route Summary */
.route-summary {
  position: relative;
  padding: 16px;
  background: #f6f6f6;
  border-radius: 12px;
  margin-bottom: 16px;
}

.route-point {
  display: flex;
  gap: 12px;
  padding: 8px 0;
}

.point-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
}

.point-dot.pickup {
  background: #22c55e;
}

.point-dot.destination {
  background: #e11900;
}

.route-line {
  position: absolute;
  left: 21px;
  top: 40px;
  width: 2px;
  height: 32px;
  background: #e5e5e5;
}

.point-label {
  font-size: 12px;
  color: #6b6b6b;
}

.point-address {
  font-size: 14px;
  color: #000000;
  font-weight: 500;
}

/* Trip Details */
.trip-details {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 12px 0;
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #6b6b6b;
}

/* Ride Type */
.ride-type-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 8px;
  margin-bottom: 16px;
}

.ride-type-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000000;
  border-radius: 8px;
  color: #ffffff;
}

.ride-type-name {
  font-size: 15px;
  font-weight: 600;
  color: #000000;
}

.ride-type-desc {
  font-size: 13px;
  color: #6b6b6b;
}

/* Payment */
.payment-section {
  margin-bottom: 16px;
}

.section-label {
  font-size: 13px;
  color: #6b6b6b;
  margin-bottom: 8px;
}

.payment-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  color: #000000;
  cursor: pointer;
}

.payment-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 8px;
}

.payment-selector span {
  flex: 1;
  text-align: left;
}

/* Promo */
.promo-section {
  margin-bottom: 16px;
}

.promo-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: none;
  border: 1px dashed #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  color: #6b6b6b;
  cursor: pointer;
}

.promo-applied {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #dcfce7;
  border-radius: 8px;
}

.promo-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #22c55e;
  font-size: 14px;
}

.promo-discount {
  font-weight: 600;
}

.remove-promo {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #6b6b6b;
}

/* Price Summary */
.price-summary {
  padding: 16px;
  background: #f6f6f6;
  border-radius: 8px;
  margin-bottom: 16px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
  color: #6b6b6b;
}

.price-row.surge {
  color: #f57c00;
}

.price-row.discount {
  color: #22c55e;
}

.price-row.total {
  padding-top: 12px;
  margin-top: 8px;
  border-top: 1px solid #e5e5e5;
  font-size: 18px;
  font-weight: 600;
  color: #000000;
}

/* Surge Warning */
.surge-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #fef3c7;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #92400e;
}

/* Actions */
.confirmation-actions {
  display: flex;
  gap: 12px;
}

.btn-secondary,
.btn-primary {
  flex: 1;
  padding: 14px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-secondary {
  background: #f6f6f6;
  border: none;
  color: #000000;
}

.btn-primary {
  background: #000000;
  border: none;
  color: #ffffff;
}

.btn-primary:disabled {
  background: #cccccc;
  cursor: not-allowed;
}
</style>
