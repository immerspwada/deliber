<script setup lang="ts">
/**
 * Feature: F197 - Provider Card
 * Display provider info card for admin
 */

interface Props {
  id: string
  name: string
  phone: string
  vehicleType: string
  licensePlate: string
  avatar?: string
  status: 'online' | 'offline' | 'busy' | 'suspended' | 'pending'
  rating?: number
  totalTrips?: number
  earnings?: number
}

defineProps<Props>()

const emit = defineEmits<{
  view: [id: string]
  approve: [id: string]
  suspend: [id: string]
}>()

const statusConfig = {
  online: { label: 'ออนไลน์', color: '#2e7d32', bg: '#e8f5e9' },
  offline: { label: 'ออฟไลน์', color: '#6b6b6b', bg: '#f6f6f6' },
  busy: { label: 'กำลังให้บริการ', color: '#276ef1', bg: '#e3f2fd' },
  suspended: { label: 'ระงับ', color: '#e11900', bg: '#ffebee' },
  pending: { label: 'รออนุมัติ', color: '#ef6c00', bg: '#fff3e0' }
}
</script>

<template>
  <div class="provider-card" :class="status">
    <div class="provider-avatar">
      <img v-if="avatar" :src="avatar" :alt="name" />
      <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      <span v-if="status === 'online'" class="online-indicator"></span>
    </div>
    
    <div class="provider-info">
      <div class="provider-header">
        <h4 class="provider-name">{{ name }}</h4>
        <span class="provider-status" :style="{ color: statusConfig[status].color, background: statusConfig[status].bg }">
          {{ statusConfig[status].label }}
        </span>
      </div>
      <p class="provider-phone">{{ phone }}</p>
      <div class="provider-vehicle">
        <span>{{ vehicleType }}</span>
        <span class="license-plate">{{ licensePlate }}</span>
      </div>
      <div class="provider-stats">
        <span v-if="rating" class="stat-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          {{ rating.toFixed(1) }}
        </span>
        <span v-if="totalTrips !== undefined">{{ totalTrips }} เที่ยว</span>
        <span v-if="earnings !== undefined">฿{{ earnings.toLocaleString() }}</span>
      </div>
    </div>
    
    <div class="provider-actions">
      <button type="button" class="action-btn" @click="emit('view', id)">ดู</button>
      <button v-if="status === 'pending'" type="button" class="action-btn primary" @click="emit('approve', id)">อนุมัติ</button>
    </div>
  </div>
</template>

<style scoped>
.provider-card {
  display: flex;
  gap: 14px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  transition: border-color 0.2s;
}

.provider-card:hover {
  border-color: #000;
}

.provider-card.pending {
  border-color: #ef6c00;
  background: #fffaf5;
}

.provider-avatar {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #f6f6f6;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #6b6b6b;
  flex-shrink: 0;
}

.provider-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background: #2e7d32;
  border: 2px solid #fff;
  border-radius: 50%;
}

.provider-info {
  flex: 1;
  min-width: 0;
}

.provider-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.provider-name {
  font-size: 15px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.provider-status {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
}

.provider-phone {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0 0 6px;
}

.provider-vehicle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6b6b6b;
}

.license-plate {
  font-weight: 600;
  color: #000;
  padding: 2px 6px;
  background: #f6f6f6;
  border-radius: 4px;
}

.provider-stats {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  font-size: 11px;
  color: #999;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 2px;
}

.stat-item svg {
  color: #ffc107;
}

.provider-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.action-btn {
  padding: 8px 14px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #000;
  cursor: pointer;
}

.action-btn:hover {
  background: #e5e5e5;
}

.action-btn.primary {
  background: #000;
  color: #fff;
}

.action-btn.primary:hover {
  background: #333;
}
</style>