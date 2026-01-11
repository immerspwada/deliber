<script setup lang="ts">
/**
 * Online Status Toggle V2 - Provider Online/Offline Toggle
 * MUNEEF Design System Compliant
 * Thai Ride App - Provider Status Toggle
 */

import { computed } from 'vue'
import { useProviderStore } from '../../../stores/providerStore'

interface Props {
  disabled?: boolean
  onlineHours?: number
  todayJobs?: number
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  onlineHours: 0,
  todayJobs: 0,
})

const providerStore = useProviderStore()

// Computed properties
const isOnline = computed(() => providerStore.isOnline)
const isToggling = computed(() => providerStore.loading)
const canToggle = computed(() => !props.disabled && !isToggling.value)

async function handleToggle(): Promise<void> {
  if (!canToggle.value) return

  try {
    await providerStore.toggleOnlineStatus()
  } catch (error) {
    console.error('Error toggling online status:', error)
  }
}
</script>

<template>
  <div class="online-toggle" :class="{ online: isOnline, disabled: !canToggle }">
    <div class="toggle-header">
      <div class="status-info">
        <div class="status-dot" :class="{ active: isOnline }" />
        <div class="status-text">
          <h3 class="status-label">{{ isOnline ? 'ออนไลน์' : 'ออฟไลน์' }}</h3>
          <p class="status-description">
            {{ isOnline ? 'พร้อมรับงาน' : 'เปิดเพื่อเริ่มรับงาน' }}
          </p>
        </div>
      </div>

      <button
        type="button"
        class="toggle-button"
        :class="{ active: isOnline }"
        :disabled="!canToggle"
        @click="handleToggle"
        :aria-label="isOnline ? 'เปลี่ยนเป็นออฟไลน์' : 'เปลี่ยนเป็นออนไลน์'"
      >
        <span class="toggle-thumb">
          <svg
            v-if="isToggling"
            class="loading-icon"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      </button>
    </div>

    <!-- Online Stats -->
    <div v-if="isOnline" class="online-stats">
      <div class="stat-item">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ onlineHours.toFixed(1) }}</span>
          <span class="stat-label">ชั่วโมง</span>
        </div>
      </div>

      <div class="stat-item">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ todayJobs }}</span>
          <span class="stat-label">งาน</span>
        </div>
      </div>
    </div>

    <!-- Offline Message -->
    <div v-else class="offline-message">
      <p>{{ disabled ? 'ไม่สามารถเปิดได้ในขณะนี้' : 'เปิดรับงานเพื่อเริ่มหารายได้' }}</p>
    </div>
  </div>
</template>

<style scoped>
.online-toggle {
  background: white;
  border-radius: 1rem;
  padding: 1.25rem;
  border: 2px solid #e8e8e8;
  transition: all 0.3s ease;
  font-family: "Sarabun", -apple-system, BlinkMacSystemFont, sans-serif;
}

.online-toggle.online {
  border-color: #00a86b;
  background: linear-gradient(135deg, #e8f5ef 0%, #ffffff 100%);
}

.online-toggle.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toggle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: #999999;
  transition: all 0.3s ease;
}

.status-dot.active {
  background: #00a86b;
  animation: pulse 2s infinite;
}

.status-label {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 0.125rem 0;
}

.status-description {
  font-size: 0.875rem;
  color: #666666;
  margin: 0;
}

.toggle-button {
  width: 4rem;
  height: 2.25rem;
  background: #e8e8e8;
  border: none;
  border-radius: 1.125rem;
  padding: 0.1875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  align-items: center;
}

.toggle-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px #00a86b, 0 0 0 4px rgba(0, 168, 107, 0.2);
}

.toggle-button.active {
  background: #00a86b;
}

.toggle-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.toggle-thumb {
  width: 1.875rem;
  height: 1.875rem;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-button.active .toggle-thumb {
  transform: translateX(1.75rem);
}

.loading-icon {
  width: 1rem;
  height: 1rem;
  color: #666666;
  animation: spin 1s linear infinite;
}

.online-stats {
  display: flex;
  gap: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 168, 107, 0.2);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #00a86b;
  flex-shrink: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: #00a86b;
  line-height: 1;
}

.stat-label {
  font-size: 0.75rem;
  color: #666666;
  line-height: 1;
}

.offline-message {
  padding-top: 0.5rem;
}

.offline-message p {
  font-size: 0.875rem;
  color: #666666;
  margin: 0;
  text-align: center;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(0, 168, 107, 0.4);
  }
  50% {
    opacity: 0.8;
    box-shadow: 0 0 0 4px rgba(0, 168, 107, 0);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Responsive Design */
@media (max-width: 480px) {
  .online-toggle {
    padding: 1rem;
  }
  
  .status-label {
    font-size: 1rem;
  }
  
  .online-stats {
    gap: 1rem;
  }
  
  .stat-value {
    font-size: 1rem;
  }
}
</style>