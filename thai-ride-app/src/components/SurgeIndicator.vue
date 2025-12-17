<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  multiplier: number
  reason?: string | null
  showDetails?: boolean
}>()

const isActive = computed(() => props.multiplier > 1)

const displayText = computed(() => `${props.multiplier}x`)

const levelClass = computed(() => {
  if (props.multiplier <= 1) return ''
  if (props.multiplier < 1.5) return 'low'
  if (props.multiplier < 2) return 'medium'
  return 'high'
})

const levelText = computed(() => {
  if (props.multiplier <= 1) return ''
  if (props.multiplier < 1.5) return 'เพิ่มเล็กน้อย'
  if (props.multiplier < 2) return 'เพิ่มปานกลาง'
  return 'เพิ่มสูง'
})
</script>

<template>
  <div v-if="isActive" class="surge-indicator" :class="levelClass">
    <div class="surge-badge">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      <span class="surge-multiplier">{{ displayText }}</span>
    </div>
    
    <div v-if="showDetails" class="surge-details">
      <span class="surge-level">{{ levelText }}</span>
      <span v-if="reason" class="surge-reason">{{ reason }}</span>
    </div>
  </div>
</template>

<style scoped>
.surge-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #fff8e1;
  border: 1px solid #ffc043;
}

.surge-indicator.low {
  background: #fff8e1;
  border-color: #ffc043;
}

.surge-indicator.medium {
  background: #fff3e0;
  border-color: #f57c00;
}

.surge-indicator.high {
  background: #ffebee;
  border-color: #e11900;
}

.surge-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
  font-size: 14px;
}

.surge-indicator.low .surge-badge {
  color: #f57c00;
}

.surge-indicator.medium .surge-badge {
  color: #e65100;
}

.surge-indicator.high .surge-badge {
  color: #e11900;
}

.surge-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.surge-level {
  font-size: 12px;
  font-weight: 500;
  color: #000;
}

.surge-reason {
  font-size: 11px;
  color: #6b6b6b;
}
</style>
