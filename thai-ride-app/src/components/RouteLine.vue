<script setup lang="ts">
/**
 * Feature: F124 - Route Line Component
 * Display route line between pickup and destination
 */

interface Props {
  steps?: Array<{
    label: string
    address: string
    time?: string
    status?: 'completed' | 'current' | 'pending'
  }>
  showDuration?: boolean
  duration?: number
  distance?: string
}

withDefaults(defineProps<Props>(), {
  steps: () => [],
  showDuration: false,
  duration: 0,
  distance: ''
})
</script>

<template>
  <div class="route-line">
    <div class="route-steps">
      <div
        v-for="(step, index) in steps"
        :key="index"
        class="route-step"
        :class="step.status"
      >
        <div class="step-indicator">
          <div class="step-dot">
            <svg v-if="step.status === 'completed'" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
            <span v-else-if="index === 0" class="dot-inner pickup" />
            <span v-else class="dot-inner destination" />
          </div>
          <div v-if="index < steps.length - 1" class="step-line" />
        </div>
        
        <div class="step-content">
          <span class="step-label">{{ step.label }}</span>
          <p class="step-address">{{ step.address }}</p>
          <span v-if="step.time" class="step-time">{{ step.time }}</span>
        </div>
      </div>
    </div>
    
    <div v-if="showDuration && (duration || distance)" class="route-info">
      <div v-if="duration" class="info-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
        <span>{{ duration }} นาที</span>
      </div>
      <div v-if="distance" class="info-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <span>{{ distance }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.route-line {
  padding: 16px;
  background: #fff;
  border-radius: 12px;
}

.route-steps {
  display: flex;
  flex-direction: column;
}

.route-step {
  display: flex;
  gap: 12px;
  position: relative;
}

.step-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 24px;
  flex-shrink: 0;
}

.step-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border: 2px solid #e5e5e5;
  z-index: 1;
}

.route-step.completed .step-dot {
  background: #000;
  border-color: #000;
  color: #fff;
}

.route-step.current .step-dot {
  border-color: #000;
  animation: pulse 2s infinite;
}

.dot-inner {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-inner.pickup {
  background: #000;
}

.dot-inner.destination {
  background: #6b6b6b;
}

.step-line {
  width: 2px;
  flex: 1;
  min-height: 32px;
  background: #e5e5e5;
  margin: 4px 0;
}

.route-step.completed .step-line {
  background: #000;
}

.step-content {
  flex: 1;
  padding-bottom: 16px;
}

.step-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b6b6b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.step-address {
  font-size: 15px;
  font-weight: 500;
  color: #000;
  margin: 4px 0 0;
  line-height: 1.4;
}

.step-time {
  font-size: 13px;
  color: #6b6b6b;
  margin-top: 4px;
  display: block;
}

.route-info {
  display: flex;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e5e5;
  margin-top: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #6b6b6b;
}

.info-item svg {
  color: #000;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
</style>
