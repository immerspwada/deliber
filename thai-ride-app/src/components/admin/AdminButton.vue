<!--
  Admin Button Component - MUNEEF Style
  
  Consistent button styling for admin dashboard
  Features: multiple variants, sizes, loading states, icons
-->

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
    @click="handleClick"
  >
    <!-- Loading Spinner -->
    <div v-if="loading" class="loading-spinner"></div>
    
    <!-- Icon -->
    <component 
      v-else-if="icon && iconPosition === 'left'" 
      :is="icon" 
      class="button-icon icon-left" 
    />
    
    <!-- Content -->
    <span v-if="$slots.default" class="button-content">
      <slot />
    </span>
    
    <!-- Right Icon -->
    <component 
      v-if="icon && iconPosition === 'right' && !loading" 
      :is="icon" 
      class="button-icon icon-right" 
    />
  </button>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  icon?: any
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  rounded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  iconPosition: 'left'
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const slots = useSlots()

const buttonClasses = computed(() => [
  'admin-button',
  `variant-${props.variant}`,
  `size-${props.size}`,
  {
    'full-width': props.fullWidth,
    'rounded': props.rounded,
    'loading': props.loading,
    'icon-only': props.icon && !slots.default
  }
])

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<style scoped>
.admin-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  white-space: nowrap;
  position: relative;
  overflow: hidden;
}

.admin-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.admin-button.loading {
  cursor: wait;
}

/* Variants */
.variant-primary {
  background-color: #00A86B;
  color: #FFFFFF;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.variant-primary:hover:not(:disabled) {
  background-color: #008F5B;
  box-shadow: 0 6px 16px rgba(0, 168, 107, 0.4);
  transform: translateY(-1px);
}

.variant-secondary {
  background-color: #F5F5F5;
  color: #1A1A1A;
  border-radius: 14px;
}

.variant-secondary:hover:not(:disabled) {
  background-color: #E8E8E8;
}

.variant-outline {
  background-color: transparent;
  color: #00A86B;
  border: 2px solid #00A86B;
  border-radius: 14px;
}

.variant-outline:hover:not(:disabled) {
  background-color: #00A86B;
  color: #FFFFFF;
}

.variant-ghost {
  background-color: transparent;
  color: #666666;
  border-radius: 14px;
}

.variant-ghost:hover:not(:disabled) {
  background-color: #F5F5F5;
  color: #1A1A1A;
}

.variant-danger {
  background-color: #E53935;
  color: #FFFFFF;
  border-radius: 14px;
}

.variant-danger:hover:not(:disabled) {
  background-color: #C62828;
}

.variant-success {
  background-color: #00A86B;
  color: #FFFFFF;
  border-radius: 14px;
}

.variant-success:hover:not(:disabled) {
  background-color: #008F5B;
}

.variant-warning {
  background-color: #F5A623;
  color: #FFFFFF;
  border-radius: 14px;
}

.variant-warning:hover:not(:disabled) {
  background-color: #E09112;
}

/* Sizes */
.size-xs {
  padding: 6px 12px;
  font-size: 12px;
  min-height: 28px;
}

.size-sm {
  padding: 8px 16px;
  font-size: 14px;
  min-height: 32px;
}

.size-md {
  padding: 12px 20px;
  font-size: 14px;
  min-height: 40px;
}

.size-lg {
  padding: 16px 24px;
  font-size: 16px;
  min-height: 48px;
}

.size-xl {
  padding: 20px 32px;
  font-size: 18px;
  min-height: 56px;
}

/* Icon only buttons */
.icon-only.size-xs {
  padding: 6px;
  width: 28px;
}

.icon-only.size-sm {
  padding: 8px;
  width: 32px;
}

.icon-only.size-md {
  padding: 12px;
  width: 40px;
}

.icon-only.size-lg {
  padding: 16px;
  width: 48px;
}

.icon-only.size-xl {
  padding: 20px;
  width: 56px;
}

/* Modifiers */
.full-width {
  width: 100%;
}

.rounded {
  border-radius: 50px !important;
}

/* Loading Spinner */
.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Icons */
.button-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.size-xs .button-icon {
  width: 14px;
  height: 14px;
}

.size-lg .button-icon {
  width: 18px;
  height: 18px;
}

.size-xl .button-icon {
  width: 20px;
  height: 20px;
}

.button-content {
  flex: 1;
  text-align: center;
}

/* Focus States */
.admin-button:focus-visible {
  outline: 2px solid #00A86B;
  outline-offset: 2px;
}

/* Active States */
.admin-button:active:not(:disabled) {
  transform: translateY(0);
}

/* Responsive */
@media (max-width: 768px) {
  .admin-button {
    min-height: 44px; /* Touch-friendly minimum */
  }
  
  .size-xs {
    min-height: 36px;
  }
  
  .size-sm {
    min-height: 40px;
  }
}
</style>