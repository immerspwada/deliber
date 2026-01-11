<script setup lang="ts">
/**
 * Notification Bell V2 - Provider Notification Indicator
 * MUNEEF Design System Compliant
 * Thai Ride App - Notification Bell Component
 */

interface Props {
  count: number
}

defineProps<Props>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button class="notification-bell" @click="emit('click')" :aria-label="`การแจ้งเตือน ${count} รายการ`">
    <div class="bell-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      
      <!-- Notification Badge -->
      <div v-if="count > 0" class="notification-badge" :class="{ pulse: count > 0 }">
        <span class="badge-text">{{ count > 99 ? '99+' : count }}</span>
      </div>
    </div>
  </button>
</template>

<style scoped>
.notification-bell {
  position: relative;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  background: #f6f6f6;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: "Sarabun", -apple-system, BlinkMacSystemFont, sans-serif;
}

.notification-bell:hover {
  background: #e8e8e8;
  transform: scale(1.05);
}

.notification-bell:active {
  transform: scale(0.95);
}

.notification-bell:focus {
  outline: none;
  box-shadow: 0 0 0 2px #00a86b, 0 0 0 4px rgba(0, 168, 107, 0.2);
}

.bell-icon {
  position: relative;
  width: 1.25rem;
  height: 1.25rem;
  color: #666666;
}

.bell-icon svg {
  width: 100%;
  height: 100%;
}

.notification-badge {
  position: absolute;
  top: -0.375rem;
  right: -0.375rem;
  min-width: 1.125rem;
  height: 1.125rem;
  background: #e11900;
  border-radius: 0.5625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.notification-badge.pulse {
  animation: pulse 2s infinite;
}

.badge-text {
  font-size: 0.625rem;
  font-weight: 700;
  color: white;
  line-height: 1;
  padding: 0 0.125rem;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(225, 25, 0, 0.7);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(225, 25, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(225, 25, 0, 0);
  }
}

/* Responsive Design */
@media (max-width: 480px) {
  .notification-bell {
    width: 2.25rem;
    height: 2.25rem;
  }
  
  .bell-icon {
    width: 1.125rem;
    height: 1.125rem;
  }
  
  .notification-badge {
    min-width: 1rem;
    height: 1rem;
    top: -0.25rem;
    right: -0.25rem;
  }
  
  .badge-text {
    font-size: 0.5625rem;
  }
}
</style>