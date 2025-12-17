<script setup lang="ts">
/**
 * Feature: F93 - Notification Badge
 * Badge indicator for notifications
 */
import { computed } from 'vue'

interface Props {
  count?: number
  max?: number
  dot?: boolean
  show?: boolean
  color?: 'default' | 'success' | 'warning' | 'error'
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
  max: 99,
  dot: false,
  show: true,
  color: 'default',
  position: 'top-right'
})

const displayCount = computed(() => {
  if (props.dot) return ''
  if (props.count > props.max) return `${props.max}+`
  return props.count.toString()
})

const shouldShow = computed(() => {
  if (!props.show) return false
  if (props.dot) return true
  return props.count > 0
})
</script>

<template>
  <div class="badge-wrapper">
    <slot />
    <Transition name="badge">
      <span
        v-if="shouldShow"
        class="badge"
        :class="[`color-${color}`, position, { dot }]"
      >
        {{ displayCount }}
      </span>
    </Transition>
  </div>
</template>

<style scoped>
.badge-wrapper {
  position: relative;
  display: inline-flex;
}

.badge {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  border-radius: 100px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border: 2px solid #fff;
}

/* Position variants */
.top-right {
  top: -6px;
  right: -6px;
}

.top-left {
  top: -6px;
  left: -6px;
}

.bottom-right {
  bottom: -6px;
  right: -6px;
}

.bottom-left {
  bottom: -6px;
  left: -6px;
}

/* Color variants */
.color-default {
  background: #e11900;
  color: #fff;
}

.color-success {
  background: #276ef1;
  color: #fff;
}

.color-warning {
  background: #ffaa00;
  color: #000;
}

.color-error {
  background: #e11900;
  color: #fff;
}

/* Dot variant */
.dot {
  min-width: 10px;
  width: 10px;
  height: 10px;
  padding: 0;
}

/* Animation */
.badge-enter-active,
.badge-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.badge-enter-from,
.badge-leave-to {
  transform: scale(0);
  opacity: 0;
}
</style>
