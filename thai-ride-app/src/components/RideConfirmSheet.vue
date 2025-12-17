<script setup lang="ts">
/**
 * Feature: F310 - Ride Confirm Sheet
 * Final ride confirmation bottom sheet
 */
defineProps<{
  visible: boolean
  pickup: string
  destination: string
  rideType: string
  fare: number
  eta: number
  paymentMethod: string
}>()

const emit = defineEmits<{
  'close': []
  'confirm': []
  'change-payment': []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="slide">
      <div v-if="visible" class="sheet-overlay" @click="emit('close')">
        <div class="sheet-content" @click.stop>
          <div class="sheet-handle"></div>
          
          <div class="route-summary">
            <div class="point pickup">
              <div class="dot"></div>
              <span>{{ pickup }}</span>
            </div>
            <div class="point destination">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#000">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              </svg>
              <span>{{ destination }}</span>
            </div>
          </div>
          
          <div class="ride-details">
            <div class="detail-row">
              <span class="label">ประเภทรถ</span>
              <span class="value">{{ rideType }}</span>
            </div>
            <div class="detail-row">
              <span class="label">เวลาโดยประมาณ</span>
              <span class="value">{{ eta }} นาที</span>
            </div>
          </div>
          
          <button type="button" class="payment-row" @click="emit('change-payment')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <span class="method">{{ paymentMethod }}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
          </button>
          
          <div class="fare-row">
            <span class="label">ค่าโดยสาร</span>
            <span class="fare">฿{{ fare.toFixed(2) }}</span>
          </div>
          
          <button type="button" class="btn-confirm" @click="emit('confirm')">
            ยืนยันการเรียกรถ
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.sheet-content {
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 12px 20px 24px;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: #e5e5e5;
  border-radius: 2px;
  margin: 0 auto 16px;
}

.route-summary {
  padding: 16px;
  background: #f6f6f6;
  border-radius: 12px;
  margin-bottom: 16px;
}

.point {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.point.pickup {
  margin-bottom: 12px;
}

.dot {
  width: 10px;
  height: 10px;
  background: #276ef1;
  border-radius: 50%;
}

.ride-details {
  margin-bottom: 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-row .label {
  font-size: 14px;
  color: #6b6b6b;
}

.detail-row .value {
  font-size: 14px;
  font-weight: 500;
}

.payment-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 16px;
}

.payment-row .method {
  flex: 1;
  text-align: left;
  font-size: 14px;
}

.fare-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.fare-row .label {
  font-size: 16px;
  font-weight: 500;
}

.fare {
  font-size: 24px;
  font-weight: 700;
}

.btn-confirm {
  width: 100%;
  padding: 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.slide-enter-active, .slide-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.slide-enter-from, .slide-leave-to {
  opacity: 0;
}

.slide-enter-from .sheet-content,
.slide-leave-to .sheet-content {
  transform: translateY(100%);
}
</style>
