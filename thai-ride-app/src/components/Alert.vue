<script setup lang="ts">
/**
 * Feature: F105 - Alert Component
 * Inline alert/notification message
 */
interface Props {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  dismissible?: boolean
  icon?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'info',
  title: '',
  dismissible: false,
  icon: true
})

const emit = defineEmits<{
  dismiss: []
}>()
</script>

<template>
  <div class="alert" :class="`variant-${variant}`" role="alert">
    <!-- Info icon -->
    <svg v-if="icon && variant === 'info'" class="alert-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
    <!-- Success icon -->
    <svg v-else-if="icon && variant === 'success'" class="alert-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
    <!-- Warning icon -->
    <svg v-else-if="icon && variant === 'warning'" class="alert-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
    <!-- Error icon -->
    <svg v-else-if="icon && variant === 'error'" class="alert-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
    
    <div class="alert-content">
      <p v-if="title" class="alert-title">{{ title }}</p>
      <div class="alert-message">
        <slot />
      </div>
    </div>
    
    <button v-if="dismissible" class="dismiss-btn" @click="emit('dismiss')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
}

.variant-info {
  background: rgba(39, 110, 241, 0.1);
  color: #276ef1;
}

.variant-success {
  background: rgba(0, 200, 83, 0.1);
  color: #00c853;
}

.variant-warning {
  background: rgba(255, 170, 0, 0.1);
  color: #b37700;
}

.variant-error {
  background: rgba(225, 25, 0, 0.1);
  color: #e11900;
}

.alert-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.alert-content {
  flex: 1;
  min-width: 0;
}

.alert-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 4px;
}

.alert-message {
  font-size: 14px;
  line-height: 1.5;
}

.alert-message :deep(p) {
  margin: 0;
}

.dismiss-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
  margin: -4px -4px -4px 0;
}

.dismiss-btn:hover {
  opacity: 1;
}
</style>
