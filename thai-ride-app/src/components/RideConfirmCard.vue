<script setup lang="ts">
/**
 * Feature: F162 - Ride Confirm Card
 * Display ride confirmation before booking
 */

interface Props {
  pickupAddress: string
  dropoffAddress: string
  vehicleType: string
  vehicleIcon?: string
  estimatedFare: number
  estimatedTime: string
  distance: string
  paymentMethod?: string
  promoApplied?: string
  discount?: number
}

withDefaults(defineProps<Props>(), {
  paymentMethod: 'เงินสด'
})

const emit = defineEmits<{
  confirm: []
  cancel: []
  changePayment: []
  addPromo: []
}>()
</script>

<template>
  <div class="ride-confirm-card">
    <div class="route-section">
      <div class="route-point pickup">
        <div class="point-dot"></div>
        <div class="point-info">
          <span class="point-label">จุดรับ</span>
          <span class="point-address">{{ pickupAddress }}</span>
        </div>
      </div>
      <div class="route-line"></div>
      <div class="route-point dropoff">
        <div class="point-dot"></div>
        <div class="point-info">
          <span class="point-label">จุดส่ง</span>
          <span class="point-address">{{ dropoffAddress }}</span>
        </div>
      </div>
    </div>
    
    <div class="vehicle-section">
      <div class="vehicle-info">
        <div class="vehicle-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
          </svg>
        </div>
        <div class="vehicle-details">
          <span class="vehicle-type">{{ vehicleType }}</span>
          <span class="vehicle-meta">{{ distance }} • {{ estimatedTime }}</span>
        </div>
      </div>
      <span class="fare-amount">฿{{ estimatedFare.toLocaleString() }}</span>
    </div>
  </div>
</template>

    <div class="options-section">
      <button type="button" class="option-row" @click="emit('changePayment')">
        <div class="option-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><path d="M1 10h22"/>
          </svg>
        </div>
        <span class="option-label">{{ paymentMethod }}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
      
      <button type="button" class="option-row" @click="emit('addPromo')">
        <div class="option-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
            <circle cx="7" cy="7" r="1"/>
          </svg>
        </div>
        <span v-if="promoApplied" class="option-label promo-applied">
          {{ promoApplied }}
          <span v-if="discount" class="discount-amount">-฿{{ discount }}</span>
        </span>
        <span v-else class="option-label">เพิ่มโค้ดส่วนลด</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </div>
    
    <div class="action-buttons">
      <button type="button" class="cancel-btn" @click="emit('cancel')">ยกเลิก</button>
      <button type="button" class="confirm-btn" @click="emit('confirm')">ยืนยันการจอง</button>
    </div>
  </div>
</template>

<style scoped>
.ride-confirm-card {
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 20px 16px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
}

.route-section {
  margin-bottom: 20px;
}

.route-point {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.point-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.route-point.pickup .point-dot {
  background: #276ef1;
}

.route-point.dropoff .point-dot {
  background: #e11900;
}

.point-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.point-label {
  font-size: 11px;
  color: #6b6b6b;
  text-transform: uppercase;
}

.point-address {
  font-size: 14px;
  color: #000;
  font-weight: 500;
}

.route-line {
  width: 2px;
  height: 24px;
  background: #e5e5e5;
  margin: 4px 0 4px 5px;
}

.vehicle-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  background: #f6f6f6;
  border-radius: 12px;
  margin-bottom: 16px;
}

.vehicle-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.vehicle-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 10px;
  color: #000;
}

.vehicle-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.vehicle-type {
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.vehicle-meta {
  font-size: 12px;
  color: #6b6b6b;
}

.fare-amount {
  font-size: 18px;
  font-weight: 700;
  color: #000;
}

.options-section {
  margin-bottom: 20px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  background: transparent;
  border: none;
  border-bottom: 1px solid #e5e5e5;
  cursor: pointer;
  text-align: left;
}

.option-row:last-child {
  border-bottom: none;
}

.option-icon {
  color: #6b6b6b;
}

.option-label {
  flex: 1;
  font-size: 14px;
  color: #000;
}

.option-label.promo-applied {
  color: #276ef1;
  font-weight: 500;
}

.discount-amount {
  margin-left: 8px;
  color: #276ef1;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.cancel-btn {
  flex: 1;
  padding: 14px;
  background: #f6f6f6;
  color: #000;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.cancel-btn:hover {
  background: #e5e5e5;
}

.confirm-btn {
  flex: 2;
  padding: 14px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.confirm-btn:hover {
  background: #333;
}
</style>