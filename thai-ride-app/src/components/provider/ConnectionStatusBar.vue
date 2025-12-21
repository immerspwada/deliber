<script setup lang="ts">
/**
 * ConnectionStatusBar - Realtime Connection Status Indicator
 * Shows Provider the current connection state and latency
 */
import { computed } from 'vue'

interface ConnectionStatus {
  state: 'connected' | 'connecting' | 'disconnected' | 'error'
  lastPing: Date | null
  latency: number
  reconnectAttempts: number
}

const props = defineProps<{
  status: ConnectionStatus
}>()

const emit = defineEmits<{
  (e: 'retry'): void
}>()

const statusConfig = computed(() => {
  switch (props.status.state) {
    case 'connected':
      return {
        label: 'เชื่อมต่อแล้ว',
        color: '#22C55E',
        bgColor: '#DCFCE7',
        icon: 'check',
        showLatency: true
      }
    case 'connecting':
      return {
        label: 'กำลังเชื่อมต่อ...',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        icon: 'loading',
        showLatency: false
      }
    case 'disconnected':
      return {
        label: 'ไม่ได้เชื่อมต่อ',
        color: '#6B7280',
        bgColor: '#F3F4F6',
        icon: 'offline',
        showLatency: false
      }
    case 'error':
      return {
        label: 'เชื่อมต่อล้มเหลว',
        color: '#EF4444',
        bgColor: '#FEE2E2',
        icon: 'error',
        showLatency: false
      }
    default:
      return {
        label: 'ไม่ทราบสถานะ',
        color: '#6B7280',
        bgColor: '#F3F4F6',
        icon: 'offline',
        showLatency: false
      }
  }
})

const latencyLabel = computed(() => {
  if (props.status.latency < 100) return 'เร็วมาก'
  if (props.status.latency < 300) return 'ปกติ'
  if (props.status.latency < 500) return 'ช้า'
  return 'ช้ามาก'
})

const latencyColor = computed(() => {
  if (props.status.latency < 100) return '#22C55E'
  if (props.status.latency < 300) return '#F59E0B'
  return '#EF4444'
})

const timeSinceLastPing = computed(() => {
  if (!props.status.lastPing) return null
  const seconds = Math.floor((Date.now() - new Date(props.status.lastPing).getTime()) / 1000)
  if (seconds < 60) return `${seconds} วินาทีที่แล้ว`
  const minutes = Math.floor(seconds / 60)
  return `${minutes} นาทีที่แล้ว`
})
</script>

<template>
  <div 
    class="connection-bar"
    :style="{ backgroundColor: statusConfig.bgColor }"
  >
    <div class="status-left">
      <!-- Status Icon -->
      <div class="status-icon" :style="{ color: statusConfig.color }">
        <!-- Connected -->
        <svg v-if="statusConfig.icon === 'check'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        <!-- Loading -->
        <svg v-else-if="statusConfig.icon === 'loading'" class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
        <!-- Offline -->
        <svg v-else-if="statusConfig.icon === 'offline'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/>
        </svg>
        <!-- Error -->
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      
      <!-- Status Text -->
      <span class="status-label" :style="{ color: statusConfig.color }">
        {{ statusConfig.label }}
      </span>
      
      <!-- Latency Badge -->
      <div v-if="statusConfig.showLatency && status.latency > 0" class="latency-badge">
        <span class="latency-dot" :style="{ backgroundColor: latencyColor }"></span>
        <span class="latency-value">{{ status.latency }}ms</span>
      </div>
    </div>
    
    <div class="status-right">
      <!-- Retry Button -->
      <button 
        v-if="status.state === 'error' || status.state === 'disconnected'"
        class="retry-btn"
        @click="emit('retry')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
        </svg>
        ลองใหม่
      </button>
      
      <!-- Reconnect Attempts -->
      <span v-if="status.reconnectAttempts > 0 && status.state === 'connecting'" class="reconnect-count">
        ครั้งที่ {{ status.reconnectAttempts }}
      </span>
      
      <!-- Last Ping -->
      <span v-if="timeSinceLastPing && status.state === 'connected'" class="last-ping">
        {{ timeSinceLastPing }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.connection-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 10px;
  margin-bottom: 12px;
  font-size: 13px;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-label {
  font-weight: 600;
}

.latency-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 10px;
}

.latency-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.latency-value {
  font-size: 11px;
  font-weight: 500;
  color: #666666;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.retry-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #1A1A1A;
  cursor: pointer;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: #F5F5F5;
}

.reconnect-count {
  font-size: 11px;
  color: #F59E0B;
  font-weight: 500;
}

.last-ping {
  font-size: 11px;
  color: #999999;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
