<script setup lang="ts">
/**
 * Feature: F311 - Delivery Tracking
 * Real-time delivery tracking display
 */
import { computed } from 'vue'

const props = defineProps<{
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered'
  riderName?: string
  riderPhone?: string
  eta?: number
  currentLocation?: string
}>()

const emit = defineEmits<{
  'call': []
  'message': []
}>()

const steps = [
  { key: 'pending', label: 'รอรับพัสดุ' },
  { key: 'picked_up', label: 'รับพัสดุแล้ว' },
  { key: 'in_transit', label: 'กำลังจัดส่ง' },
  { key: 'delivered', label: 'ส่งสำเร็จ' }
]

const currentIndex = computed(() => steps.findIndex(s => s.key === props.status))
</script>

<template>
  <div class="delivery-tracking">
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: ((currentIndex + 1) / steps.length) * 100 + '%' }"></div>
    </div>
    
    <div class="steps">
      <div
        v-for="(step, index) in steps"
        :key="step.key"
        class="step"
        :class="{ completed: index <= currentIndex, active: index === currentIndex }"
      >
        <div class="dot"></div>
        <span class="label">{{ step.label }}</span>
      </div>
    </div>
    
    <div v-if="riderName && status !== 'delivered'" class="rider-info">
      <div class="rider-details">
        <div class="avatar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div class="info">
          <span class="name">{{ riderName }}</span>
          <span v-if="eta" class="eta">ถึงใน {{ eta }} นาที</span>
        </div>
      </div>
      <div class="actions">
        <button type="button" class="action-btn" @click="emit('message')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </button>
        <button type="button" class="action-btn" @click="emit('call')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
          </svg>
        </button>
      </div>
    </div>
    
    <div v-if="currentLocation" class="location">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      <span>{{ currentLocation }}</span>
    </div>
  </div>
</template>

<style scoped>
.delivery-tracking {
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
}

.progress-bar {
  height: 4px;
  background: #e5e5e5;
  border-radius: 2px;
  margin-bottom: 16px;
}

.progress-fill {
  height: 100%;
  background: #000;
  border-radius: 2px;
  transition: width 0.3s;
}

.steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e5e5e5;
}

.step.completed .dot { background: #000; }
.step.active .dot { box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.1); }

.label {
  font-size: 11px;
  color: #6b6b6b;
}

.step.active .label { color: #000; font-weight: 500; }

.rider-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 8px;
  margin-bottom: 12px;
}

.rider-details {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 40px;
  height: 40px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info {
  display: flex;
  flex-direction: column;
}

.name { font-size: 14px; font-weight: 500; }
.eta { font-size: 12px; color: #6b6b6b; }

.actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  background: #fff;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.location {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b6b6b;
}
</style>
