<script setup lang="ts">
/**
 * Feature: F299 - Trip Progress
 * Trip progress timeline display
 */
import { computed } from 'vue'

const props = defineProps<{
  status: 'searching' | 'matched' | 'arriving' | 'picked_up' | 'in_transit' | 'completed'
}>()

const steps = [
  { key: 'searching', label: 'กำลังค้นหาคนขับ' },
  { key: 'matched', label: 'พบคนขับแล้ว' },
  { key: 'arriving', label: 'คนขับกำลังมา' },
  { key: 'picked_up', label: 'รับผู้โดยสารแล้ว' },
  { key: 'in_transit', label: 'กำลังเดินทาง' },
  { key: 'completed', label: 'ถึงจุดหมาย' }
]

const currentIndex = computed(() => steps.findIndex(s => s.key === props.status))
</script>

<template>
  <div class="trip-progress">
    <div
      v-for="(step, index) in steps"
      :key="step.key"
      class="step"
      :class="{
        completed: index < currentIndex,
        active: index === currentIndex,
        pending: index > currentIndex
      }"
    >
      <div class="indicator">
        <div class="dot">
          <svg v-if="index < currentIndex" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
        </div>
        <div v-if="index < steps.length - 1" class="line"></div>
      </div>
      <span class="label">{{ step.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.trip-progress {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step.completed .dot {
  background: #000;
  color: #fff;
}

.step.active .dot {
  background: #276ef1;
  box-shadow: 0 0 0 4px rgba(39, 110, 241, 0.2);
}

.step.pending .dot {
  background: #e5e5e5;
}

.line {
  width: 2px;
  height: 24px;
  margin: 4px 0;
}

.step.completed .line {
  background: #000;
}

.step.active .line,
.step.pending .line {
  background: #e5e5e5;
}

.label {
  font-size: 14px;
  padding-top: 2px;
}

.step.completed .label {
  color: #6b6b6b;
}

.step.active .label {
  font-weight: 600;
  color: #000;
}

.step.pending .label {
  color: #ccc;
}
</style>
