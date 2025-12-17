<script setup lang="ts">
/**
 * Feature: F73 - Badge Component
 * Status badges and labels
 */
interface Props {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
  dot?: boolean
  pulse?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  dot: false,
  pulse: false
})
</script>

<template>
  <span class="badge" :class="[`variant-${variant}`, `size-${size}`, { dot, pulse }]">
    <span v-if="dot" class="badge-dot" />
    <slot />
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  border-radius: 100px;
  white-space: nowrap;
}

/* Size variants */
.size-sm {
  padding: 2px 8px;
  font-size: 11px;
}

.size-md {
  padding: 4px 12px;
  font-size: 13px;
}

/* Color variants */
.variant-default {
  background: #f6f6f6;
  color: #000;
}

.variant-success {
  background: rgba(39, 110, 241, 0.1);
  color: #276ef1;
}

.variant-warning {
  background: rgba(255, 170, 0, 0.1);
  color: #b37700;
}

.variant-error {
  background: rgba(225, 25, 0, 0.1);
  color: #e11900;
}

.variant-info {
  background: rgba(0, 0, 0, 0.05);
  color: #6b6b6b;
}

/* Dot indicator */
.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.pulse .badge-dot {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Dot-only badge */
.dot:empty {
  padding: 0;
  width: 8px;
  height: 8px;
}

.dot:empty .badge-dot {
  width: 100%;
  height: 100%;
}
</style>
