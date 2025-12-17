<script setup lang="ts">
/**
 * Feature: F98 - Stepper Component
 * Step indicator for multi-step processes
 */
interface Step {
  id: string
  label: string
  description?: string
}

interface Props {
  steps: Step[]
  currentStep: number
  orientation?: 'horizontal' | 'vertical'
}

const props = withDefaults(defineProps<Props>(), {
  orientation: 'horizontal'
})

const getStepStatus = (index: number) => {
  if (index < props.currentStep) return 'completed'
  if (index === props.currentStep) return 'current'
  return 'upcoming'
}
</script>

<template>
  <div class="stepper" :class="orientation">
    <div
      v-for="(step, index) in steps"
      :key="step.id"
      class="step"
      :class="getStepStatus(index)"
    >
      <div class="step-indicator">
        <div class="step-circle">
          <svg v-if="getStepStatus(index) === 'completed'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div v-if="index < steps.length - 1" class="step-line" />
      </div>
      
      <div class="step-content">
        <span class="step-label">{{ step.label }}</span>
        <span v-if="step.description" class="step-description">{{ step.description }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stepper {
  display: flex;
}

.stepper.horizontal {
  flex-direction: row;
}

.stepper.vertical {
  flex-direction: column;
}

.step {
  display: flex;
  flex: 1;
}

.horizontal .step {
  flex-direction: column;
  align-items: center;
}

.vertical .step {
  flex-direction: row;
  align-items: flex-start;
}

.step-indicator {
  display: flex;
  align-items: center;
}

.horizontal .step-indicator {
  flex-direction: row;
  width: 100%;
}

.vertical .step-indicator {
  flex-direction: column;
  height: 100%;
  min-height: 60px;
}

.step-circle {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
  transition: all 0.2s;
}

.upcoming .step-circle {
  background: #f6f6f6;
  color: #6b6b6b;
}

.current .step-circle {
  background: #000;
  color: #fff;
}

.completed .step-circle {
  background: #000;
  color: #fff;
}

.step-line {
  flex: 1;
  background: #e5e5e5;
  transition: background 0.2s;
}

.horizontal .step-line {
  height: 2px;
  margin: 0 8px;
}

.vertical .step-line {
  width: 2px;
  margin: 8px 0;
  margin-left: 15px;
}

.completed .step-line {
  background: #000;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.horizontal .step-content {
  align-items: center;
  text-align: center;
  margin-top: 12px;
}

.vertical .step-content {
  margin-left: 16px;
  padding-bottom: 24px;
}

.step-label {
  font-size: 14px;
  font-weight: 500;
  color: #6b6b6b;
  transition: color 0.2s;
}

.current .step-label,
.completed .step-label {
  color: #000;
}

.step-description {
  font-size: 12px;
  color: #999;
}
</style>
