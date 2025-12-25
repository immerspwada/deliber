<script setup lang="ts">
/**
 * Feature: F153 - Provider Online Toggle
 * Toggle provider online/offline status
 * UI Design: MUNEEF Style - Green #00A86B
 */

interface Props {
  isOnline: boolean;
  loading?: boolean;
  onlineHours?: number;
  todayTrips?: number;
}

withDefaults(defineProps<Props>(), {
  loading: false,
  onlineHours: 0,
  todayTrips: 0,
});

const emit = defineEmits<{
  toggle: [isOnline: boolean];
}>();
</script>

<template>
  <div class="online-toggle" :class="{ online: isOnline }">
    <div class="toggle-header">
      <div class="status-indicator">
        <span class="status-dot" :class="{ active: isOnline }" />
        <span class="status-text">{{ isOnline ? "ออนไลน์" : "ออฟไลน์" }}</span>
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
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <span>{{ onlineHours.toFixed(1) }} ชม.</span>
      </div>
      <div class="stat-item">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12" />
        </svg>
        <span>{{ todayTrips }} เที่ยว</span>
      </div>
    </div>

    <p v-else class="offline-text">เปิดรับงานเพื่อเริ่มหารายได้</p>
  </div>
</template>

<style scoped>
.online-toggle {
  background: #ffffff;
  border-radius: 16px;
  padding: 20px;
  border: 2px solid #e8e8e8;
  transition: all 0.3s ease;
}

.online-toggle.online {
  border-color: #00a86b;
  background: linear-gradient(135deg, #e8f5ef 0%, #ffffff 100%);
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
  background: #999999;
  transition: all 0.3s ease;
}

.status-dot.active {
  background: #00a86b;
  animation: pulse 2s infinite;
}

.status-text {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  font-family: "Sarabun", -apple-system, BlinkMacSystemFont, sans-serif;
}

.toggle-btn {
  width: 64px;
  height: 36px;
  min-width: 64px;
  min-height: 36px;
  background: #e8e8e8;
  border: none;
  border-radius: 18px;
  padding: 3px;
  cursor: pointer;
  transition: all 0.3s ease;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

.toggle-btn.active {
  background: #00a86b;
}

.toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.toggle-thumb {
  display: block;
  width: 30px;
  height: 30px;
  background: #ffffff;
  border-radius: 50%;
  transition: transform 0.3s ease;
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
  border-top: 1px solid rgba(0, 168, 107, 0.2);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #00a86b;
  font-family: "Sarabun", -apple-system, BlinkMacSystemFont, sans-serif;
}

.stat-item svg {
  flex-shrink: 0;
}

.offline-text {
  font-size: 14px;
  color: #666666;
  margin: 12px 0 0;
  font-family: "Sarabun", -apple-system, BlinkMacSystemFont, sans-serif;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(0, 168, 107, 0.4);
  }
  50% {
    opacity: 0.8;
    box-shadow: 0 0 0 4px rgba(0, 168, 107, 0);
  }
}
</style>
