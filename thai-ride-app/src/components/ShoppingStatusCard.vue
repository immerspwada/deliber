<script setup lang="ts">
/**
 * Feature: F161 - Shopping Status Card
 * Display shopping order status with progress
 */

interface Props {
  status: 'pending' | 'confirmed' | 'shopping' | 'checkout' | 'delivering' | 'delivered' | 'cancelled'
  shopperName?: string
  shopperPhone?: string
  storeName: string
  itemCount: number
  foundCount?: number
  estimatedTotal?: number
  actualTotal?: number
}

defineProps<Props>()

const emit = defineEmits<{
  call: []
  chat: []
  track: []
}>()

const statusSteps = [
  { key: 'pending', label: 'รอรับออเดอร์' },
  { key: 'confirmed', label: 'รับออเดอร์แล้ว' },
  { key: 'shopping', label: 'กำลังซื้อของ' },
  { key: 'checkout', label: 'ชำระเงิน' },
  { key: 'delivering', label: 'กำลังจัดส่ง' },
  { key: 'delivered', label: 'ส่งสำเร็จ' }
]

// Helper for step status - used in template
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getStepStatus = (stepKey: string, currentStatus: string) => {
  const stepIndex = statusSteps.findIndex(s => s.key === stepKey)
  const currentIndex = statusSteps.findIndex(s => s.key === currentStatus)
  if (currentStatus === 'cancelled') return 'cancelled'
  if (stepIndex < currentIndex) return 'completed'
  if (stepIndex === currentIndex) return 'active'
  return 'pending'
}
void getStepStatus
</script>

<template>
  <div class="shopping-status-card">
    <div class="status-header">
      <h3 class="status-title">สถานะการซื้อของ</h3>
      <span class="store-badge">{{ storeName }}</span>
    </div>
</template>

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
      <span>ออเดอร์ถูกยกเลิก</span>
    </div>
    
    <div v-if="status === 'shopping'" class="progress-info">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${(foundCount || 0) / itemCount * 100}%` }"></div>
      </div>
      <span class="progress-text">พบแล้ว {{ foundCount || 0 }}/{{ itemCount }} รายการ</span>
    </div>
    
    <div class="price-info">
      <div class="price-row">
        <span>จำนวนสินค้า</span>
        <span>{{ itemCount }} รายการ</span>
      </div>
      <div v-if="estimatedTotal" class="price-row">
        <span>ราคาประมาณ</span>
        <span>~฿{{ estimatedTotal.toLocaleString() }}</span>
      </div>
      <div v-if="actualTotal" class="price-row total">
        <span>ราคาจริง</span>
        <span>฿{{ actualTotal.toLocaleString() }}</span>
      </div>
    </div>
    
    <div v-if="shopperName && status !== 'pending' && status !== 'cancelled'" class="shopper-info">
      <div class="shopper-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <div class="shopper-details">
        <span class="shopper-name">{{ shopperName }}</span>
        <span v-if="shopperPhone" class="shopper-phone">{{ shopperPhone }}</span>
      </div>
      <div class="shopper-actions">
        <button type="button" class="action-btn" @click="emit('call')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
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
      v-if="status === 'delivering'" 
      type="button" 
      class="track-btn"
      @click="emit('track')"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
      ติดตามการจัดส่ง
    </button>
  </div>
</template>

<style scoped>
.shopping-status-card {
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

.store-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  background: #f6f6f6;
  border-radius: 12px;
  color: #6b6b6b;
}

.timeline {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  position: relative;
  overflow-x: auto;
  padding-bottom: 4px;
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
  flex-shrink: 0;
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
  font-size: 9px;
  color: #6b6b6b;
  text-align: center;
  max-width: 50px;
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

.progress-info {
  margin-bottom: 16px;
}

.progress-bar {
  height: 6px;
  background: #e5e5e5;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-fill {
  height: 100%;
  background: #276ef1;
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  color: #6b6b6b;
}

.price-info {
  background: #f6f6f6;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 14px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #6b6b6b;
}

.price-row + .price-row {
  margin-top: 6px;
}

.price-row.total {
  font-size: 15px;
  font-weight: 600;
  color: #000;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e5e5e5;
}

.shopper-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 10px;
  margin-bottom: 14px;
}

.shopper-avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 50%;
  color: #6b6b6b;
}

.shopper-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shopper-name {
  font-size: 14px;
  font-weight: 600;
  color: #000;
}

.shopper-phone {
  font-size: 12px;
  color: #6b6b6b;
}

.shopper-actions {
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
}

.track-btn:hover {
  background: #333;
}
</style>