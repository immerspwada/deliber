<script setup lang="ts">
/**
 * Feature: F342 - Provider Delivery Progress
 * Progress tracker for provider during delivery
 */
interface DeliveryStep {
  id: string
  label: string
  status: 'pending' | 'current' | 'completed'
  action?: string
}

const props = withDefaults(defineProps<{
  currentStep: string
  steps?: DeliveryStep[]
}>(), {
  steps: () => [
    { id: 'accepted', label: 'รับงาน', status: 'completed' },
    { id: 'pickup', label: 'รับพัสดุ', status: 'current', action: 'ยืนยันรับพัสดุ' },
    { id: 'transit', label: 'กำลังส่ง', status: 'pending' },
    { id: 'delivered', label: 'ส่งสำเร็จ', status: 'pending', action: 'ยืนยันส่งสำเร็จ' }
  ]
})

const emit = defineEmits<{
  'action': [stepId: string]
}>()

const getStepStatus = (_step: DeliveryStep, index: number) => {
  const currentIndex = props.steps.findIndex(s => s.id === props.currentStep)
  if (index < currentIndex) return 'completed'
  if (index === currentIndex) return 'current'
  return 'pending'
}
</script>

<template>
  <div class="delivery-progress">
    <div 
      v-for="(step, index) in steps" 
      :key="step.id"
      class="progress-step"
      :class="getStepStatus(step, index)"
    >
      <div class="step-indicator">
        <div class="step-dot">
          <svg v-if="getStepStatus(step, index) === 'completed'" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          <span v-else-if="getStepStatus(step, index) === 'current'" class="step-num">{{ index + 1 }}</span>
          <span v-else class="step-num">{{ index + 1 }}</span>
        </div>
        <div v-if="index < steps.length - 1" class="step-line" />
      </div>
      
      <div class="step-content">
        <span class="step-label">{{ step.label }}</span>
        <button 
          v-if="step.action && getStepStatus(step, index) === 'current'"
          type="button"
          class="step-action"
          @click="emit('action', step.id)"
        >
          {{ step.action }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.delivery-progress {
  display: flex;
  flex-direction: column;
}

.progress-step {
  display: flex;
  gap: 12px;
}

.step-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 28px;
}

.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e5e5e5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b6b6b;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.progress-step.completed .step-dot {
  background: #000;
  color: #fff;
}

.progress-step.current .step-dot {
  background: #276ef1;
  color: #fff;
}

.step-line {
  width: 2px;
  flex: 1;
  min-height: 20px;
  background: #e5e5e5;
  margin: 4px 0;
}

.progress-step.completed .step-line {
  background: #000;
}

.step-content {
  flex: 1;
  padding-bottom: 20px;
}

.progress-step:last-child .step-content {
  padding-bottom: 0;
}

.step-label {
  font-size: 14px;
  color: #6b6b6b;
  display: block;
}

.progress-step.completed .step-label,
.progress-step.current .step-label {
  color: #000;
  font-weight: 500;
}

.step-action {
  margin-top: 8px;
  padding: 10px 20px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.step-action:hover {
  background: #333;
}
</style>
