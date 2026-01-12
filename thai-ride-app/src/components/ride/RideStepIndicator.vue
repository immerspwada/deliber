<script setup lang="ts">
/**
 * RideStepIndicator - Ultra Minimal Step Progress
 * Design: Clean, elegant, subtle
 */
import { computed } from 'vue'

export type RideStep = 'select' | 'searching' | 'tracking' | 'rating'

interface Props {
  currentStep: RideStep
}

const props = defineProps<Props>()

const steps = ['ปลายทาง', 'จับคู่', 'เดินทาง', 'รีวิว']

const currentIndex = computed(() => {
  const map: Record<RideStep, number> = { select: 0, searching: 1, tracking: 2, rating: 3 }
  return map[props.currentStep]
})
</script>

<template>
  <div class="step-indicator">
    <div class="steps">
      <template v-for="(label, index) in steps" :key="index">
        <div 
          v-if="index > 0" 
          class="line"
          :class="{ active: currentIndex >= index }"
        />
        <div 
          class="step"
          :class="{ 
            active: currentIndex === index,
            done: currentIndex > index 
          }"
        >
          <div class="dot">
            <svg v-if="currentIndex > index" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <span class="label">{{ label }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.step-indicator {
  background: #fff;
  padding: 10px 16px;
  flex-shrink: 0;
}

.steps {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 0;
}

.line {
  width: 28px;
  height: 2px;
  background: #e5e5e5;
  margin-top: 12px;
  border-radius: 1px;
  transition: background 0.3s;
}

.line.active {
  background: #00a86b;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 48px;
}

.dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #bbb;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s;
}

.step.active .dot {
  background: #00a86b;
  color: #fff;
  box-shadow: 0 2px 6px rgba(0,168,107,0.3);
}

.step.done .dot {
  background: #00a86b;
  color: #fff;
}

.dot svg {
  width: 14px;
  height: 14px;
}

.label {
  font-size: 10px;
  color: #bbb;
  font-weight: 500;
  transition: color 0.3s;
}

.step.active .label,
.step.done .label {
  color: #00a86b;
}

.step.active .label {
  font-weight: 600;
}
</style>
