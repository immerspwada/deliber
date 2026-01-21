<!-- 
  StatusProgressBar Component
  Professional step-by-step progress indicator
  Design: Black & White, Clean, Accessible
-->
<script setup lang="ts">
import { computed } from 'vue'

interface StatusStep {
  key: string
  label: string
  icon: string
}

interface Props {
  steps: StatusStep[]
  currentIndex: number
}

const props = defineProps<Props>()

const progressPercentage = computed(() => {
  if (props.steps.length === 0) return 0
  return (props.currentIndex / (props.steps.length - 1)) * 100
})
</script>

<template>
  <nav class="status-progress" aria-label="สถานะงาน" role="navigation">
    <!-- Progress Line Background -->
    <div class="progress-line-bg" aria-hidden="true">
      <div 
        class="progress-line-fill" 
        :style="{ width: `${progressPercentage}%` }"
      />
    </div>

    <!-- Steps -->
    <div 
      v-for="(step, index) in steps" 
      :key="step.key"
      class="step"
      :class="{ 
        active: index === currentIndex,
        completed: index < currentIndex,
        pending: index > currentIndex
      }"
      :aria-current="index === currentIndex ? 'step' : undefined"
    >
      <div class="step-circle">
        <!-- Checkmark for completed -->
        <svg 
          v-if="index < currentIndex" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="3"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <!-- Number for current/pending -->
        <span v-else>{{ index + 1 }}</span>
      </div>
      <span class="step-label">{{ step.label }}</span>
    </div>
  </nav>
</template>

<style scoped>
.status-progress {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 20px;
  position: relative;
  background: #FFFFFF;
  margin: 16px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* Progress Line */
.progress-line-bg {
  position: absolute;
  top: 44px;
  left: 8%;
  right: 8%;
  height: 3px;
  background: #E5E7EB;
  z-index: 0;
  overflow: hidden;
  border-radius: 2px;
}

.progress-line-fill {
  height: 100%;
  background: #00A86B;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Step */
.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  position: relative;
  z-index: 1;
}

.step-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #D1D5DB;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  color: #9CA3AF;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.step-circle svg {
  width: 20px;
  height: 20px;
}

/* Completed Step */
.step.completed .step-circle {
  background: #00A86B;
  border-color: #00A86B;
  color: #fff;
}

/* Active Step */
.step.active .step-circle {
  background: #00A86B;
  border-color: #00A86B;
  color: #fff;
  transform: scale(1.15);
  box-shadow: 0 0 0 4px rgba(0, 168, 107, 0.2);
}

/* Step Label */
.step-label {
  font-size: 11px;
  color: #6B7280;
  text-align: center;
  font-weight: 500;
  line-height: 1.3;
}

.step.active .step-label {
  color: #00A86B;
  font-weight: 700;
}

.step.completed .step-label {
  color: #059669;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 360px) {
  .status-progress {
    padding: 20px 16px;
    margin: 16px;
  }
  
  .step-circle {
    width: 36px;
    height: 36px;
    font-size: 13px;
  }
  
  .step-label {
    font-size: 10px;
  }
}
</style>
