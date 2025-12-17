<script setup lang="ts">
/**
 * Feature: F153 - Provider Online Toggle
 * Toggle provider online/offline status
 */

interface Props {
  isOnline: boolean
  loading?: boolean
  onlineHours?: number
  todayTrips?: number
}

withDefaults(defineProps<Props>(), {
  loading: false,
  onlineHours: 0,
  todayTrips: 0
})

const emit = defineEmits<{
  toggle: [isOnline: boolean]
}>()
</script>

<template>
  <div class="online-toggle" :class="{ online: isOnline }">
    <div class="toggle-header">
      <div class="status-indicator">
        <span class="status-dot" :class="{ active: isOnline }" />
        <span class="status-text">{{ isOnline ? 'ออนไลน์' : 'ออฟไลน์' }}</span>
      </div>
      
      <button
        type="button"
        class="toggle-btn"
        :class="{ active: isOnline }"
        :disabled="loading"
        @click="emit('toggle', !isOnline)"
      >
        <span class="toggle-thumb" />
      </button>
    </div>
    
    <div v-if="isOnline" class="online-stats">
      <div class="stat-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
        <span>{{ onlineHours.toFixed(1) }} ชม.</span>
      </div>
      <div class="stat-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/>
        </svg>
        <span>{{ todayTrips }} เที่ยว</span>
      </div>
    </div>

    
    <p v-else class="offline-text">เปิดรับงานเพื่อเริ่มหารายได้</p>
  </div>
</template>

<style scoped>
.online-toggle {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  border: 2px solid #e5e5e5;
  transition: all 0.3s;
}

.online-toggle.online {
  border-color: #2e7d32;
  background: linear-gradient(135deg, #e8f5e9 0%, #fff 100%);
}

.toggle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ccc;
}

.status-dot.active {
  background: #2e7d32;
  animation: pulse 2s infinite;
}

.status-text {
  font-size: 18px;
  font-weight: 600;
  color: #000;
}

.toggle-btn {
  width: 64px;
  height: 36px;
  background: #e5e5e5;
  border: none;
  border-radius: 18px;
  padding: 3px;
  cursor: pointer;
  transition: background 0.3s;
}

.toggle-btn.active {
  background: #2e7d32;
}

.toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-thumb {
  display: block;
  width: 30px;
  height: 30px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-btn.active .toggle-thumb {
  transform: translateX(28px);
}

.online-stats {
  display: flex;
  gap: 20px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(46, 125, 50, 0.2);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #2e7d32;
}

.offline-text {
  font-size: 14px;
  color: #6b6b6b;
  margin: 12px 0 0;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
