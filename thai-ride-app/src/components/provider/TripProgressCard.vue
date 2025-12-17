<script setup lang="ts">
/**
 * Feature: F155 - Provider Trip Progress Card
 * Display current trip progress for provider
 */

interface Props {
  status: 'arriving' | 'waiting' | 'in_progress' | 'arriving_destination'
  customerName: string
  pickup: string
  destination: string
  estimatedTime?: number
  fare: number
  paymentMethod: string
}

defineProps<Props>()

const emit = defineEmits<{
  arrived: []
  startTrip: []
  complete: []
  navigate: [type: 'pickup' | 'destination']
  call: []
  message: []
  cancel: []
}>()

const statusConfig = {
  arriving: { label: 'กำลังไปรับ', action: 'ถึงจุดรับแล้ว', event: 'arrived' },
  waiting: { label: 'รอผู้โดยสาร', action: 'เริ่มเดินทาง', event: 'startTrip' },
  in_progress: { label: 'กำลังเดินทาง', action: 'ถึงจุดหมายแล้ว', event: 'complete' },
  arriving_destination: { label: 'ใกล้ถึงแล้ว', action: 'จบการเดินทาง', event: 'complete' }
}
</script>

<template>
  <div class="trip-progress-card">
    <div class="card-header">
      <span class="status-badge" :class="status">{{ statusConfig[status].label }}</span>
      <span v-if="estimatedTime" class="eta">{{ estimatedTime }} นาที</span>
    </div>
    
    <div class="customer-section">
      <div class="customer-avatar">{{ customerName[0] }}</div>
      <span class="customer-name">{{ customerName }}</span>
      <div class="customer-actions">
        <button type="button" class="action-btn" @click="emit('call')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
          </svg>
        </button>
        <button type="button" class="action-btn" @click="emit('message')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="route-section">
      <button 
        type="button" 
        class="route-btn"
        :class="{ active: status === 'arriving' }"
        @click="emit('navigate', 'pickup')"
      >
        <div class="route-dot pickup" />
        <div class="route-info">
          <span class="route-label">จุดรับ</span>
          <span class="route-address">{{ pickup }}</span>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      </button>
      
      <button 
        type="button" 
        class="route-btn"
        :class="{ active: status === 'in_progress' || status === 'arriving_destination' }"
        @click="emit('navigate', 'destination')"
      >
        <div class="route-dot destination" />
        <div class="route-info">
          <span class="route-label">จุดหมาย</span>
          <span class="route-address">{{ destination }}</span>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      </button>
    </div>
    
    <div class="fare-section">
      <div class="fare-info">
        <span class="fare-label">ค่าโดยสาร</span>
        <span class="fare-amount">฿{{ fare.toLocaleString() }}</span>
      </div>
      <span class="payment-method">{{ paymentMethod }}</span>
    </div>
    
    <div class="card-actions">
      <button type="button" class="cancel-btn" @click="emit('cancel')">
        ยกเลิก
      </button>
      <button 
        type="button" 
        class="main-action-btn"
        @click="emit(statusConfig[status].event as any)"
      >
        {{ statusConfig[status].action }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.trip-progress-card {
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.status-badge {
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 20px;
}

.status-badge.arriving { background: #e3f2fd; color: #1565c0; }
.status-badge.waiting { background: #fff3e0; color: #ef6c00; }
.status-badge.in_progress { background: #e8f5e9; color: #2e7d32; }
.status-badge.arriving_destination { background: #f3e5f5; color: #7b1fa2; }

.eta {
  font-size: 14px;
  font-weight: 600;
  color: #000;
}

.customer-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
}

.customer-avatar {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 50%;
  font-size: 20px;
  font-weight: 600;
  color: #000;
}

.customer-name {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  color: #000;
}

.customer-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border: none;
  border-radius: 12px;
  color: #000;
  cursor: pointer;
}

.action-btn:hover {
  background: #e5e5e5;
}

.route-section {
  padding: 0 20px 16px;
}

.route-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  background: #f6f6f6;
  border: 2px solid transparent;
  border-radius: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.route-btn:last-child {
  margin-bottom: 0;
}

.route-btn.active {
  border-color: #000;
  background: #fff;
}

.route-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.route-dot.pickup { background: #2e7d32; }
.route-dot.destination { border: 3px solid #000; }

.route-info {
  flex: 1;
}

.route-label {
  font-size: 11px;
  color: #6b6b6b;
  text-transform: uppercase;
  display: block;
}

.route-address {
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.route-btn svg {
  color: #6b6b6b;
}

.route-btn.active svg {
  color: #000;
}

.fare-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #f6f6f6;
}

.fare-label {
  font-size: 13px;
  color: #6b6b6b;
  display: block;
}

.fare-amount {
  font-size: 20px;
  font-weight: 700;
  color: #000;
}

.payment-method {
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  background: #fff;
  border-radius: 8px;
  color: #6b6b6b;
}

.card-actions {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
}

.cancel-btn {
  padding: 16px 24px;
  background: #f6f6f6;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  color: #6b6b6b;
  cursor: pointer;
}

.main-action-btn {
  flex: 1;
  padding: 16px;
  background: #000;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
}

.main-action-btn:hover {
  background: #333;
}
</style>
