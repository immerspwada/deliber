<script setup lang="ts">
/**
 * Feature: F174 - Live Customer Info
 * แสดงข้อมูลลูกค้าแบบ real-time สำหรับ Provider
 * 
 * Tables: users
 * Composables: useCrossRoleEvents, useProviderJobPool
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useCrossRoleEvents, type CrossRoleEvent, type StatusChangedPayload } from '@/lib/crossRoleEventBus'
import { useProviderJobPool, type JobRequest, type CustomerInfo } from '@/composables/useProviderJobPool'

interface Props {
  job?: JobRequest | null
  showActions?: boolean
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  job: null,
  showActions: true,
  compact: false
})

const emit = defineEmits<{
  call: [phone: string]
  chat: [customerId: string]
  navigate: [lat: number, lng: number]
  cancel: []
}>()

const { subscribe } = useCrossRoleEvents()
const { currentJob } = useProviderJobPool()

// Local state
const isLoading = ref(false)
const lastUpdate = ref<Date | null>(null)
const customerStatus = ref<'waiting' | 'notified' | 'ready'>('waiting')

// Computed
const activeJob = computed(() => props.job || currentJob.value)

const customer = computed((): CustomerInfo | null => {
  if (!activeJob.value) return null
  return activeJob.value.customer || null
})

const customerName = computed(() => {
  if (!customer.value) return 'ลูกค้า'
  return `${customer.value.first_name} ${customer.value.last_name}`.trim() || 'ลูกค้า'
})

const customerInitials = computed(() => {
  if (!customer.value) return '?'
  const first = customer.value.first_name?.[0] || ''
  const last = customer.value.last_name?.[0] || ''
  return (first + last).toUpperCase() || '?'
})

const pickupAddress = computed(() => {
  if (!activeJob.value) return 'ไม่ระบุ'
  return activeJob.value.pickup_address || 'ไม่ระบุที่อยู่'
})

const destinationAddress = computed(() => {
  if (!activeJob.value) return 'ไม่ระบุ'
  return activeJob.value.destination_address || 'ไม่ระบุที่อยู่'
})

const estimatedFare = computed(() => {
  if (!activeJob.value) return 0
  return activeJob.value.estimated_fare || 0
})

const jobStatus = computed(() => {
  if (!activeJob.value) return 'unknown'
  return activeJob.value.status
})

// Subscribe to status changes
let unsubscribe: (() => void) | null = null

onMounted(() => {
  lastUpdate.value = new Date()
  
  unsubscribe = subscribe('request:status_changed', (event: CrossRoleEvent<StatusChangedPayload>) => {
    if (activeJob.value && event.payload.requestId === activeJob.value.id) {
      lastUpdate.value = new Date()
      // Update customer status based on request status
      if (event.payload.newStatus === 'pickup') {
        customerStatus.value = 'notified'
      } else if (event.payload.newStatus === 'in_progress') {
        customerStatus.value = 'ready'
      }
    }
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})
</script>

<template>
  <div :class="['live-customer-info', { compact, loading: isLoading }]">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner" />
    </div>

    <!-- No Job State -->
    <div v-if="!activeJob" class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <span class="empty-text">ยังไม่มีงานปัจจุบัน</span>
    </div>

    <!-- Customer Info -->
    <template v-else>
      <!-- Header -->
      <div class="info-header">
        <div class="customer-avatar">
          <span class="avatar-text">{{ customerInitials }}</span>
          <span class="status-indicator" :class="customerStatus" />
        </div>
        <div class="customer-details">
          <h3 class="customer-name">{{ customerName }}</h3>
          <span class="customer-status-text">
            {{ customerStatus === 'waiting' ? 'รอรับบริการ' : 
               customerStatus === 'notified' ? 'ได้รับแจ้งแล้ว' : 'พร้อมแล้ว' }}
          </span>
        </div>
        <div v-if="lastUpdate" class="update-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <span>Live</span>
        </div>
      </div>

      <!-- Location Info -->
      <div class="location-section">
        <div class="location-item pickup">
          <div class="location-marker pickup-marker" />
          <div class="location-content">
            <span class="location-label">จุดรับ</span>
            <span class="location-address">{{ pickupAddress }}</span>
          </div>
          <button 
            v-if="activeJob.pickup_lat && activeJob.pickup_lng"
            type="button" 
            class="navigate-btn"
            @click="emit('navigate', activeJob.pickup_lat!, activeJob.pickup_lng!)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </button>
        </div>
        <div class="location-connector">
          <div class="connector-line" />
        </div>
        <div class="location-item destination">
          <div class="location-marker destination-marker" />
          <div class="location-content">
            <span class="location-label">จุดหมาย</span>
            <span class="location-address">{{ destinationAddress }}</span>
          </div>
        </div>
      </div>

      <!-- Fare Info -->
      <div class="fare-section">
        <div class="fare-item">
          <span class="fare-label">ค่าโดยสารโดยประมาณ</span>
          <span class="fare-amount">฿{{ estimatedFare.toLocaleString() }}</span>
        </div>
        <div class="fare-item">
          <span class="fare-label">สถานะ</span>
          <span :class="['status-badge', jobStatus]">
            {{ jobStatus === 'matched' ? 'จับคู่แล้ว' :
               jobStatus === 'pickup' ? 'กำลังไปรับ' :
               jobStatus === 'in_progress' ? 'กำลังเดินทาง' :
               jobStatus === 'completed' ? 'เสร็จสิ้น' : jobStatus }}
          </span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div v-if="showActions && customer" class="actions-section">
        <button type="button" class="action-btn call" @click="emit('call', customer.phone_number)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          <span>โทร</span>
        </button>
        <button type="button" class="action-btn chat" @click="emit('chat', customer.id)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>แชท</span>
        </button>
        <button type="button" class="action-btn cancel" @click="emit('cancel')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M15 9l-6 6M9 9l6 6"/>
          </svg>
          <span>ยกเลิก</span>
        </button>
      </div>
    </template>
  </div>
</template>


<style scoped>
.live-customer-info {
  background: #FFFFFF;
  border-radius: 16px;
  border: 1px solid #E8E8E8;
  overflow: hidden;
  position: relative;
}

.live-customer-info.compact {
  border-radius: 12px;
}

.live-customer-info.loading {
  pointer-events: none;
}

/* Loading Overlay */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  margin-bottom: 12px;
}

.empty-icon svg {
  stroke: #999999;
}

.empty-text {
  font-size: 14px;
  color: #999999;
}

/* Header */
.info-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #F0F0F0;
}

.customer-avatar {
  position: relative;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.compact .customer-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
}

.avatar-text {
  font-size: 18px;
  font-weight: 700;
  color: #FFFFFF;
}

.compact .avatar-text {
  font-size: 14px;
}

.status-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #FFFFFF;
}

.status-indicator.waiting {
  background: #F5A623;
}

.status-indicator.notified {
  background: #2196F3;
}

.status-indicator.ready {
  background: #00A86B;
}

.customer-details {
  flex: 1;
}

.customer-name {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 2px 0;
}

.compact .customer-name {
  font-size: 14px;
}

.customer-status-text {
  font-size: 12px;
  color: #666666;
}

.update-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #E8F5EF;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #00A86B;
}

.update-badge svg {
  stroke: #00A86B;
}

/* Location Section */
.location-section {
  padding: 16px;
}

.location-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.location-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.pickup-marker {
  background: #00A86B;
}

.destination-marker {
  background: #E53935;
}

.location-content {
  flex: 1;
  min-width: 0;
}

.location-label {
  display: block;
  font-size: 11px;
  color: #999999;
  margin-bottom: 2px;
}

.location-address {
  font-size: 14px;
  color: #1A1A1A;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.navigate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #00A86B;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  flex-shrink: 0;
}

.navigate-btn:hover {
  background: #008F5B;
}

.navigate-btn svg {
  stroke: #FFFFFF;
}

.location-connector {
  padding-left: 5px;
  height: 24px;
}

.connector-line {
  width: 2px;
  height: 100%;
  background: repeating-linear-gradient(
    to bottom,
    #E8E8E8 0px,
    #E8E8E8 4px,
    transparent 4px,
    transparent 8px
  );
}

/* Fare Section */
.fare-section {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #F5F5F5;
}

.fare-item {
  flex: 1;
}

.fare-label {
  display: block;
  font-size: 11px;
  color: #999999;
  margin-bottom: 4px;
}

.fare-amount {
  font-size: 20px;
  font-weight: 700;
  color: #00A86B;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.matched {
  background: #E3F2FD;
  color: #1976D2;
}

.status-badge.pickup {
  background: #FFF3E0;
  color: #F57C00;
}

.status-badge.in_progress {
  background: #E8F5EF;
  color: #00A86B;
}

.status-badge.completed {
  background: #E8F5E9;
  color: #388E3C;
}

/* Actions Section */
.actions-section {
  display: flex;
  gap: 10px;
  padding: 16px;
  border-top: 1px solid #F0F0F0;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border: none;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.call {
  background: #E8F5EF;
  color: #00A86B;
}

.action-btn.call:hover {
  background: #D0EBE1;
}

.action-btn.call svg {
  stroke: #00A86B;
}

.action-btn.chat {
  background: #E3F2FD;
  color: #1976D2;
}

.action-btn.chat:hover {
  background: #BBDEFB;
}

.action-btn.chat svg {
  stroke: #1976D2;
}

.action-btn.cancel {
  background: #FFEBEE;
  color: #E53935;
}

.action-btn.cancel:hover {
  background: #FFCDD2;
}

.action-btn.cancel svg {
  stroke: #E53935;
}
</style>
