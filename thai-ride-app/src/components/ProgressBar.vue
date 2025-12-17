<script setup lang="ts">
/**
 * Feature: F83 - Progress Bar
 * Linear progress indicator
 */
import { computed } from 'vue'

interface Props {
  value: number
  max?: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: 'default' | 'success' | 'warning' | 'error'
  indeterminate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  max: 100,
  showLabel: false,
  size: 'md',
  color: 'default',
  indeterminate: false
})

const percentage = computed(() => {
  if (props.indeterminate) return 0
  return Math.min(100, Math.max(0, (props.value / props.max) * 100))
})

const formattedPercentage = computed(() => {
  return `${Math.round(percentage.value)}%`
})
</script>

<template>
  <div class="progress-container" :class="[`size-${size}`]">
    <div class="progress-bar" :class="[`color-${color}`, { indeterminate }]">
      <div
        class="progress-fill"
        :style="{ width: indeterminate ? '30%' : `${percentage}%` }"
      />
    </div>
    <span v-if="showLabel && !indeterminate" class="progress-label">
      {{ formattedPercentage }}
    </span>
  </div>
</template>

<style scoped>
.progress-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.progress-bar {
  flex: 1;
  background: #e5e5e5;
  border-radius: 100px;
  overflow: hidden;
}

.size-sm .progress-bar {
  height: 4px;
}

.size-md .progress-bar {
  height: 8px;
}

.size-lg .progress-bar {
  height: 12px;
}

.progress-fill {
  height: 100%;
  border-radius: 100px;
  transition: width 0.3s ease;
}

.color-default .progress-fill {
  background: #000;
}

.color-success .progress-fill {
  background: #276ef1;
}

.color-warning .progress-fill {
  background: #ffaa00;
}

.color-error .progress-fill {
  background: #e11900;
}

.indeterminate .progress-fill {
  animation: indeterminate 1.5s infinite ease-in-out;
}

@keyframes indeterminate {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
}

.progress-label {
  font-size: 13px;
  font-weight: 500;
  color: #6b6b6b;
  min-width: 40px;
  text-align: right;
}
</style>
