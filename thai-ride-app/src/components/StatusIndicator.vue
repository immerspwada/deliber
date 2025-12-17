<script setup lang="ts">
/**
 * Feature: F114 - Status Indicator
 * Status dot with label
 */
interface Props {
  status: 'online' | 'offline' | 'busy' | 'away' | 'pending' | 'success' | 'error' | 'warning'
  label?: string
  size?: 'sm' | 'md'
  pulse?: boolean
}

withDefaults(defineProps<Props>(), {
  label: '',
  size: 'md',
  pulse: false
})
</script>

<template>
  <div class="status-indicator" :class="[`size-${size}`]">
    <span class="status-dot" :class="[status, { pulse }]" />
    <span v-if="label" class="status-label">{{ label }}</span>
  </div>
</template>

<style scoped>
.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  border-radius: 50%;
  flex-shrink: 0;
}

/* Size variants */
.size-sm .status-dot {
  width: 8px;
  height: 8px;
}

.size-md .status-dot {
  width: 10px;
  height: 10px;
}

.size-sm .status-label {
  font-size: 12px;
}

.size-md .status-label {
  font-size: 14px;
}

/* Status colors */
.status-dot.online {
  background: #00c853;
}

.status-dot.offline {
  background: #ccc;
}

.status-dot.busy {
  background: #e11900;
}

.status-dot.away {
  background: #ffaa00;
}

.status-dot.pending {
  background: #276ef1;
}

.status-dot.success {
  background: #00c853;
}

.status-dot.error {
  background: #e11900;
}

.status-dot.warning {
  background: #ffaa00;
}

.status-label {
  font-weight: 500;
  color: #000;
}

/* Pulse animation */
.status-dot.pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}
</style>
