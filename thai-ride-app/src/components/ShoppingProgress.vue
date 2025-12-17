<script setup lang="ts">
/**
 * Feature: F328 - Shopping Progress
 * Component showing shopping order progress
 */
interface ProgressStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'completed'
  time?: string
}

const props = withDefaults(defineProps<{
  steps?: ProgressStep[]
  currentStep?: string
}>(), {
  steps: () => [
    { id: 'confirmed', label: 'ยืนยันคำสั่งซื้อ', status: 'completed', time: '10:30' },
    { id: 'shopping', label: 'กำลังซื้อสินค้า', status: 'active' },
    { id: 'delivering', label: 'กำลังจัดส่ง', status: 'pending' },
    { id: 'delivered', label: 'ส่งสำเร็จ', status: 'pending' }
  ]
})
</script>

<template>
  <div class="shopping-progress">
    <div 
      v-for="(step, index) in steps" 
      :key="step.id"
      class="progress-step"
      :class="step.status"
    >
      <div class="step-indicator">
        <div class="step-dot">
          <svg v-if="step.status === 'completed'" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          <div v-else-if="step.status === 'active'" class="pulse-dot" />
        </div>
        <div v-if="index < steps.length - 1" class="step-line" />
      </div>
      
      <div class="step-content">
        <span class="step-label">{{ step.label }}</span>
        <span v-if="step.time" class="step-time">{{ step.time }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shopping-progress {
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
}

.step-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e5e5;
  color: #fff;
  flex-shrink: 0;
}

.progress-step.completed .step-dot {
  background: #000;
}

.progress-step.active .step-dot {
  background: #000;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #fff;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
}

.step-line {
  width: 2px;
  flex: 1;
  min-height: 24px;
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
.progress-step.active .step-label {
  color: #000;
  font-weight: 500;
}

.step-time {
  font-size: 12px;
  color: #6b6b6b;
}
</style>
