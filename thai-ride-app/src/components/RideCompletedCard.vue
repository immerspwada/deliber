<script setup lang="ts">
/**
 * Feature: F178 - Ride Completed Card
 * Display ride completion summary
 */

interface Props {
  destination: string
  fare: number
  distance: string
  duration: string
  driverName: string
  driverPhoto?: string
  paymentMethod: string
}

defineProps<Props>()

const emit = defineEmits<{
  rate: []
  tip: []
  receipt: []
  done: []
}>()
</script>

<template>
  <div class="ride-completed-card">
    <div class="completed-header">
      <div class="check-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </div>
      <h2 class="completed-title">ถึงที่หมายแล้ว!</h2>
      <p class="completed-dest">{{ destination }}</p>
    </div>
    
    <div class="fare-section">
      <span class="fare-label">ค่าโดยสาร</span>
      <span class="fare-amount">฿{{ fare.toLocaleString() }}</span>
    </div>
    
    <div class="trip-stats">
      <div class="stat-item">
        <span class="stat-value">{{ distance }}</span>
        <span class="stat-label">ระยะทาง</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value">{{ duration }}</span>
        <span class="stat-label">เวลา</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-value">{{ paymentMethod }}</span>
        <span class="stat-label">ชำระเงิน</span>
      </div>
    </div>
    
    <div class="driver-section">
      <div class="driver-avatar">
        <img v-if="driverPhoto" :src="driverPhoto" :alt="driverName" />
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <span class="driver-name">{{ driverName }}</span>
      <button type="button" class="rate-btn" @click="emit('rate')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        ให้คะแนน
      </button>
    </div>
  </div>
</template>

    <div class="action-buttons">
      <button type="button" class="secondary-btn" @click="emit('tip')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
        </svg>
        ให้ทิป
      </button>
      <button type="button" class="secondary-btn" @click="emit('receipt')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
        </svg>
        ใบเสร็จ
      </button>
    </div>
    
    <button type="button" class="done-btn" @click="emit('done')">เสร็จสิ้น</button>
  </div>
</template>

<style scoped>
.ride-completed-card {
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 24px 16px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
}

.completed-header {
  text-align: center;
  margin-bottom: 20px;
}

.check-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f5e9;
  border-radius: 50%;
  color: #2e7d32;
  margin: 0 auto 12px;
}

.completed-title {
  font-size: 22px;
  font-weight: 700;
  color: #000;
  margin: 0 0 4px;
}

.completed-dest {
  font-size: 14px;
  color: #6b6b6b;
  margin: 0;
}

.fare-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f6f6f6;
  border-radius: 12px;
  margin-bottom: 16px;
}

.fare-label {
  font-size: 14px;
  color: #6b6b6b;
}

.fare-amount {
  font-size: 24px;
  font-weight: 700;
  color: #000;
}

.trip-stats {
  display: flex;
  justify-content: space-around;
  padding: 16px 0;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.stat-label {
  font-size: 11px;
  color: #6b6b6b;
}

.stat-divider {
  width: 1px;
  background: #e5e5e5;
}

.driver-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #f6f6f6;
  border-radius: 12px;
  margin-bottom: 16px;
}

.driver-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #6b6b6b;
}

.driver-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.driver-name {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.rate-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #000;
  cursor: pointer;
}

.rate-btn svg {
  color: #ffc107;
}

.rate-btn:hover {
  background: #000;
  color: #fff;
  border-color: #000;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.secondary-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  background: #f6f6f6;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  color: #000;
  cursor: pointer;
}

.secondary-btn:hover {
  background: #e5e5e5;
}

.done-btn {
  width: 100%;
  padding: 14px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.done-btn:hover {
  background: #333;
}
</style>