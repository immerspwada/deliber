<script setup lang="ts">
/**
 * Feature: F291 - Ride Receipt
 * Complete ride receipt display
 */
defineProps<{
  rideId: string
  date: Date | string
  origin: string
  destination: string
  distance: number
  duration: number
  fare: number
  paymentMethod: string
  driverName: string
  vehiclePlate: string
}>()

const emit = defineEmits<{
  'download': []
  'share': []
}>()

const formatDate = (d: Date | string) => new Date(d).toLocaleDateString('th-TH', { 
  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
})
</script>

<template>
  <div class="ride-receipt">
    <div class="receipt-header">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12,6 12,12 16,14"/>
      </svg>
      <h2>ใบเสร็จการเดินทาง</h2>
      <p class="ride-id">#{{ rideId }}</p>
    </div>
    
    <div class="receipt-body">
      <div class="date">{{ formatDate(date) }}</div>
      
      <div class="route">
        <div class="point origin">
          <div class="dot"></div>
          <span>{{ origin }}</span>
        </div>
        <div class="point destination">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#000">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
          <span>{{ destination }}</span>
        </div>
      </div>
      
      <div class="stats">
        <div class="stat">
          <span class="label">ระยะทาง</span>
          <span class="value">{{ (distance / 1000).toFixed(1) }} กม.</span>
        </div>
        <div class="stat">
          <span class="label">เวลา</span>
          <span class="value">{{ duration }} นาที</span>
        </div>
      </div>
      
      <div class="driver-info">
        <span class="label">คนขับ</span>
        <span class="value">{{ driverName }} • {{ vehiclePlate }}</span>
      </div>
      
      <div class="payment-info">
        <span class="label">ชำระโดย</span>
        <span class="value">{{ paymentMethod }}</span>
      </div>
      
      <div class="total">
        <span class="label">ยอดรวม</span>
        <span class="value">฿{{ fare.toFixed(2) }}</span>
      </div>
    </div>
    
    <div class="receipt-actions">
      <button type="button" class="btn" @click="emit('download')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
        </svg>
        ดาวน์โหลด
      </button>
      <button type="button" class="btn" @click="emit('share')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        แชร์
      </button>
    </div>
  </div>
</template>

<style scoped>
.ride-receipt {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  overflow: hidden;
}

.receipt-header {
  text-align: center;
  padding: 24px;
  border-bottom: 1px dashed #e5e5e5;
}

.receipt-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 12px 0 4px;
}

.ride-id {
  font-size: 12px;
  color: #6b6b6b;
  margin: 0;
}

.receipt-body {
  padding: 20px;
}

.date {
  text-align: center;
  font-size: 13px;
  color: #6b6b6b;
  margin-bottom: 20px;
}

.route {
  padding: 16px;
  background: #f6f6f6;
  border-radius: 8px;
  margin-bottom: 16px;
}

.point {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.point.origin { margin-bottom: 12px; }

.dot {
  width: 10px;
  height: 10px;
  background: #276ef1;
  border-radius: 50%;
}

.stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 8px;
}

.stat .label,
.driver-info .label,
.payment-info .label {
  font-size: 11px;
  color: #6b6b6b;
  margin-bottom: 4px;
}

.stat .value {
  font-size: 16px;
  font-weight: 600;
}

.driver-info,
.payment-info {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.total {
  display: flex;
  justify-content: space-between;
  padding-top: 16px;
}

.total .label {
  font-size: 16px;
  font-weight: 500;
}

.total .value {
  font-size: 24px;
  font-weight: 700;
}

.receipt-actions {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px dashed #e5e5e5;
}

.btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
</style>
