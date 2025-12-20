<script setup lang="ts">
/**
 * Feature: F174 - Cross-Role Status Bar
 * แสดงสถานะ connection และ sync กับระบบ Cross-Role
 * 
 * Tables: -
 * Composables: useCrossRoleEvents, useProviderJobPool
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useCrossRoleEvents, type CrossRoleEvent } from '@/lib/crossRoleEventBus'
import { useProviderJobPool } from '@/composables/useProviderJobPool'

interface Props {
  showDetails?: boolean
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: false,
  compact: false
})

const emit = defineEmits<{
  statusClick: []
  reconnect: []
}>()

const { connected, role, history, subscribe } = useCrossRoleEvents()
const { jobCount, isLoading } = useProviderJobPool()

// Local state
const lastSyncTime = ref<Date | null>(null)
const syncStatus = ref<'synced' | 'syncing' | 'error'>('synced')
const recentEvents = ref<CrossRoleEvent[]>([])
const isExpanded = ref(false)

// Computed
const connectionStatus = computed(() => {
  if (!connected.value) return 'disconnected'
  if (syncStatus.value === 'syncing') return 'syncing'
  if (syncStatus.value === 'error') return 'error'
  return 'connected'
})

const statusColor = computed(() => {
  switch (connectionStatus.value) {
    case 'connected': return '#00A86B'
    case 'syncing': return '#F5A623'
    case 'error': return '#E53935'
    case 'disconnected': return '#999999'
    default: return '#999999'
  }
})

const statusText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected': return 'เชื่อมต่อแล้ว'
    case 'syncing': return 'กำลังซิงค์...'
    case 'error': return 'เกิดข้อผิดพลาด'
    case 'disconnected': return 'ไม่ได้เชื่อมต่อ'
    default: return 'ไม่ทราบสถานะ'
  }
})

const lastSyncText = computed(() => {
  if (!lastSyncTime.value) return 'ยังไม่ได้ซิงค์'
  const diff = Date.now() - lastSyncTime.value.getTime()
  if (diff < 60000) return 'เมื่อสักครู่'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} นาทีที่แล้ว`
  return `${Math.floor(diff / 3600000)} ชั่วโมงที่แล้ว`
})

// Methods
function handleStatusClick() {
  if (props.showDetails) {
    isExpanded.value = !isExpanded.value
  }
  emit('statusClick')
}

function handleReconnect() {
  syncStatus.value = 'syncing'
  emit('reconnect')
  // Simulate reconnection
  setTimeout(() => {
    syncStatus.value = 'synced'
    lastSyncTime.value = new Date()
  }, 1500)
}

// Subscribe to events
let unsubscribe: (() => void) | null = null

onMounted(() => {
  lastSyncTime.value = new Date()
  
  unsubscribe = subscribe('*', (event: CrossRoleEvent) => {
    // Update last sync time
    lastSyncTime.value = new Date()
    
    // Add to recent events (keep last 5)
    recentEvents.value = [event, ...recentEvents.value.slice(0, 4)]
    
    // Handle specific events
    if (event.type === 'system:realtime_disconnected') {
      syncStatus.value = 'error'
    } else if (event.type === 'system:realtime_connected') {
      syncStatus.value = 'synced'
    }
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

// Watch for loading state
watch(isLoading, (loading) => {
  if (loading) {
    syncStatus.value = 'syncing'
  } else {
    syncStatus.value = 'synced'
    lastSyncTime.value = new Date()
  }
})
</script>

<template>
  <div 
    :class="['cross-role-status-bar', { compact, expanded: isExpanded }]"
    @click="handleStatusClick"
  >
    <!-- Main Status Row -->
    <div class="status-row">
      <!-- Connection Indicator -->
      <div class="connection-indicator">
        <span class="status-dot" :style="{ backgroundColor: statusColor }">
          <span v-if="syncStatus === 'syncing'" class="pulse-ring" />
        </span>
        <span class="status-text">{{ statusText }}</span>
      </div>

      <!-- Job Count Badge -->
      <div v-if="jobCount > 0" class="job-badge">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>{{ jobCount }}</span>
      </div>

      <!-- Sync Info -->
      <div v-if="!compact" class="sync-info">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        <span>{{ lastSyncText }}</span>
      </div>

      <!-- Expand Arrow -->
      <div v-if="showDetails" class="expand-arrow">
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2"
          :class="{ rotated: isExpanded }"
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
    </div>

    <!-- Expanded Details -->
    <div v-if="isExpanded && showDetails" class="details-section">
      <div class="details-header">
        <span class="details-title">รายละเอียดการเชื่อมต่อ</span>
        <button 
          v-if="connectionStatus === 'disconnected' || connectionStatus === 'error'"
          type="button" 
          class="reconnect-btn"
          @click.stop="handleReconnect"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          เชื่อมต่อใหม่
        </button>
      </div>

      <div class="details-grid">
        <div class="detail-item">
          <span class="detail-label">บทบาท</span>
          <span class="detail-value">{{ role === 'provider' ? 'ผู้ให้บริการ' : role }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">งานที่รอ</span>
          <span class="detail-value">{{ jobCount }} งาน</span>
        </div>
      </div>

      <!-- Recent Events -->
      <div v-if="recentEvents.length > 0" class="recent-events">
        <span class="events-title">กิจกรรมล่าสุด</span>
        <div class="events-list">
          <div 
            v-for="event in recentEvents" 
            :key="event.metadata.correlationId"
            class="event-item"
          >
            <span class="event-type">{{ event.type }}</span>
            <span class="event-time">
              {{ new Date(event.metadata.timestamp).toLocaleTimeString('th-TH') }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cross-role-status-bar {
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cross-role-status-bar:hover {
  border-color: #00A86B;
}

.cross-role-status-bar.compact {
  padding: 8px 12px;
}

.cross-role-status-bar.expanded {
  border-color: #00A86B;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.connection-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  position: relative;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.pulse-ring {
  position: absolute;
  top: -3px;
  left: -3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid currentColor;
  opacity: 0.5;
  animation: pulse 1.5s ease-out infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.status-text {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.compact .status-text {
  font-size: 12px;
}

.job-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #E8F5EF;
  color: #00A86B;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}

.job-badge svg {
  stroke: #00A86B;
}

.sync-info {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  color: #999999;
  font-size: 12px;
}

.sync-info svg {
  stroke: #999999;
}

.expand-arrow {
  margin-left: auto;
}

.expand-arrow svg {
  stroke: #666666;
  transition: transform 0.2s ease;
}

.expand-arrow svg.rotated {
  transform: rotate(180deg);
}

/* Details Section */
.details-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #F0F0F0;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.details-title {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
}

.reconnect-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #00A86B;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #FFFFFF;
  cursor: pointer;
}

.reconnect-btn:hover {
  background: #008F5B;
}

.reconnect-btn svg {
  stroke: #FFFFFF;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.detail-item {
  background: #F5F5F5;
  border-radius: 8px;
  padding: 10px 12px;
}

.detail-label {
  display: block;
  font-size: 11px;
  color: #999999;
  margin-bottom: 2px;
}

.detail-value {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

/* Recent Events */
.recent-events {
  margin-top: 12px;
}

.events-title {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #666666;
  margin-bottom: 8px;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.event-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: #F5F5F5;
  border-radius: 6px;
}

.event-type {
  font-size: 11px;
  font-family: monospace;
  color: #666666;
}

.event-time {
  font-size: 11px;
  color: #999999;
}
</style>
