<script setup lang="ts">
/**
 * Feature: F159 - Delivery Status Card
 * Display delivery tracking status with timeline
 */

interface Props {
  status: 'pending' | 'confirmed' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled'
  pickupAddress: string
  deliveryAddress: string
  estimatedTime?: string
  riderName?: string
  riderPhone?: string
}

defineProps<Props>()

const emit = defineEmits<{
  call: []
  chat: []
  track: []
}>()

const statusSteps = [
  { key: 'pending', label: 'รอรับออเดอร์' },
  { key: 'confirmed', label: 'ไรเดอร์รับงาน' },
  { key: 'picked_up', label: 'รับพัสดุแล้ว' },
  { key: 'in_transit', label: 'กำลังจัดส่ง' },
  { key: 'delivered', label: 'ส่งสำเร็จ' }
]

const getStepStatus = (stepKey: string, currentStatus: string) => {
  const stepIndex = statusSteps.findIndex(s => s.key === stepKey)
  const currentIndex = statusSteps.findIndex(s => s.key === currentStatus)
  if (currentStatus === 'cancelled') return 'cancelled'
  if (stepIndex < currentIndex) return 'completed'
  if (stepIndex === currentIndex) return 'active'
  return 'pending'
}
</script>

<template>
  <div class="delivery-status-card">
    <div class="status-header">
      <h3 class="status-title">สถานะการจัดส่ง</h3>
      <span v-if="estimatedTime" class="eta">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
        {{ estimatedTime }}
      </span>
    </div>
    
    <div v-if="status !== 'cancelled'" class="timeline">
      <div 
        v-for="step in statusSteps" 
        :key="step.key" 
        class="timeline-step"
        :class="getStepStatus(step.key, status)"
      >
        <div class="step-dot"></div>
        <span class="step-label">{{ step.label }}</span>
      </div>
    </div>
    
    <div v-else class="cancelled-status">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
      </svg>
      <span>การจัดส่งถูกยกเลิก</span>
    </div>
    
    <div class="addresses">
      <div class="address-item pickup">
        <div class="address-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="4"/>
          </svg>
        </div>
        <div class="address-info">
          <span class="address-label">รับพัสดุ</span>
          <span class="address-text">{{ pickupAddress }}</span>
        </div>
      </div>
      <div class="address-line"></div>
      <div class="address-item delivery">
        <div class="address-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="address-info">
          <span class="address-label">ส่งพัสดุ</span>
          <span class="address-text">{{ deliveryAddress }}</span>
        </div>
      </div>
    </div>
    
    <div v-if="riderName && status !== 'pending' && status !== 'cancelled'" class="rider-info">
      <div class="rider-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <div class="rider-details">
        <span class="rider-name">{{ riderName }}</span>
        <span v-if="riderPhone" class="rider-phone">{{ riderPhone }}</span>
      </div>
      <div class="rider-actions">
        <button type="button" class="action-btn" @click="emit('call')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
          </svg>
        </button>
        <button type="button" class="action-btn" @click="emit('chat')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </button>
      </div>
    </div>
    
    <button 
      v-if="status === 'in_transit'" 
      type="button" 
      class="track-btn"
      @click="emit('track')"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
      ติดตามพัสดุ
    </button>
  </div>
</template>

<style scoped>
.delivery-status-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  padding: 16px;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.status-title {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.eta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #276ef1;
  font-weight: 500;
}

.timeline {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  position: relative;
}

.timeline::before {
  content: '';
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  height: 2px;
  background: #e5e5e5;
}

.timeline-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
  z-index: 1;
}

.step-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #e5e5e5;
  border: 2px solid #fff;
}

.timeline-step.completed .step-dot {
  background: #000;
}

.timeline-step.active .step-dot {
  background: #276ef1;
  box-shadow: 0 0 0 4px rgba(39, 110, 241, 0.2);
}

.step-label {
  font-size: 10px;
  color: #6b6b6b;
  text-align: center;
  max-width: 60px;
}

.timeline-step.active .step-label {
  color: #276ef1;
  font-weight: 600;
}

.cancelled-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: #ffebee;
  border-radius: 8px;
  color: #e11900;
  font-weight: 500;
  margin-bottom: 16px;
}

.addresses {
  background: #f6f6f6;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 14px;
}

.address-item {
  display: flex;
  gap: 10px;
}

.address-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.address-item.pickup .address-icon {
  color: #276ef1;
}

.address-item.delivery .address-icon {
  color: #e11900;
}

.address-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.address-label {
  font-size: 11px;
  color: #6b6b6b;
  text-transform: uppercase;
}

.address-text {
  font-size: 13px;
  color: #000;
}

.address-line {
  width: 2px;
  height: 20px;
  background: #e5e5e5;
  margin: 4px 0 4px 11px;
}

.rider-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 10px;
  margin-bottom: 14px;
}

.rider-avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 50%;
  color: #6b6b6b;
}

.rider-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rider-name {
  font-size: 14px;
  font-weight: 600;
  color: #000;
}

.rider-phone {
  font-size: 12px;
  color: #6b6b6b;
}

.rider-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 50%;
  color: #000;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #000;
  color: #fff;
  border-color: #000;
}

.track-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.track-btn:hover {
  background: #333;
}
</style>
