<!--
  Admin Status Badge Component - MUNEEF Style
  
  Consistent status indicators for admin dashboard
  Features: multiple variants, sizes, with icons and animations
-->

<template>
  <span :class="badgeClasses">
    <!-- Status Dot -->
    <span v-if="showDot" class="status-dot" :class="{ pulse: animated }"></span>
    
    <!-- Icon -->
    <component 
      v-if="icon" 
      :is="icon" 
      class="status-icon" 
    />
    
    <!-- Text Content -->
    <span class="status-text">
      <slot>{{ text }}</slot>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  status?: 'active' | 'inactive' | 'pending' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
  variant?: 'filled' | 'outline' | 'soft' | 'minimal'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  text?: string
  icon?: any
  showDot?: boolean
  animated?: boolean
  rounded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  status: 'neutral',
  variant: 'soft',
  size: 'md',
  showDot: true
})

const badgeClasses = computed(() => [
  'admin-status-badge',
  `status-${props.status}`,
  `variant-${props.variant}`,
  `size-${props.size}`,
  {
    'rounded': props.rounded,
    'with-icon': props.icon,
    'with-dot': props.showDot
  }
])
</script>

<style scoped>
.admin-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 600;
  white-space: nowrap;
  border-radius: 12px;
  transition: all 0.2s ease;
}

/* Sizes */
.size-xs {
  padding: 2px 8px;
  font-size: 11px;
  min-height: 20px;
}

.size-sm {
  padding: 4px 10px;
  font-size: 12px;
  min-height: 24px;
}

.size-md {
  padding: 6px 12px;
  font-size: 13px;
  min-height: 28px;
}

.size-lg {
  padding: 8px 16px;
  font-size: 14px;
  min-height: 32px;
}

/* Status Colors - Active */
.status-active.variant-filled {
  background-color: #00A86B;
  color: #FFFFFF;
}

.status-active.variant-outline {
  background-color: transparent;
  color: #00A86B;
  border: 1px solid #00A86B;
}

.status-active.variant-soft {
  background-color: #E8F5EF;
  color: #00A86B;
}

.status-active.variant-minimal {
  background-color: transparent;
  color: #00A86B;
}

/* Status Colors - Inactive */
.status-inactive.variant-filled {
  background-color: #666666;
  color: #FFFFFF;
}

.status-inactive.variant-outline {
  background-color: transparent;
  color: #666666;
  border: 1px solid #666666;
}

.status-inactive.variant-soft {
  background-color: #F5F5F5;
  color: #666666;
}

.status-inactive.variant-minimal {
  background-color: transparent;
  color: #666666;
}

/* Status Colors - Pending */
.status-pending.variant-filled {
  background-color: #F5A623;
  color: #FFFFFF;
}

.status-pending.variant-outline {
  background-color: transparent;
  color: #F5A623;
  border: 1px solid #F5A623;
}

.status-pending.variant-soft {
  background-color: #FFF3E0;
  color: #F57C00;
}

.status-pending.variant-minimal {
  background-color: transparent;
  color: #F5A623;
}

/* Status Colors - Success */
.status-success.variant-filled {
  background-color: #00A86B;
  color: #FFFFFF;
}

.status-success.variant-outline {
  background-color: transparent;
  color: #00A86B;
  border: 1px solid #00A86B;
}

.status-success.variant-soft {
  background-color: #E8F5EF;
  color: #00A86B;
}

.status-success.variant-minimal {
  background-color: transparent;
  color: #00A86B;
}

/* Status Colors - Warning */
.status-warning.variant-filled {
  background-color: #F5A623;
  color: #FFFFFF;
}

.status-warning.variant-outline {
  background-color: transparent;
  color: #F5A623;
  border: 1px solid #F5A623;
}

.status-warning.variant-soft {
  background-color: #FFF3E0;
  color: #F57C00;
}

.status-warning.variant-minimal {
  background-color: transparent;
  color: #F5A623;
}

/* Status Colors - Error */
.status-error.variant-filled {
  background-color: #E53935;
  color: #FFFFFF;
}

.status-error.variant-outline {
  background-color: transparent;
  color: #E53935;
  border: 1px solid #E53935;
}

.status-error.variant-soft {
  background-color: #FFEBEE;
  color: #E53935;
}

.status-error.variant-minimal {
  background-color: transparent;
  color: #E53935;
}

/* Status Colors - Info */
.status-info.variant-filled {
  background-color: #1976D2;
  color: #FFFFFF;
}

.status-info.variant-outline {
  background-color: transparent;
  color: #1976D2;
  border: 1px solid #1976D2;
}

.status-info.variant-soft {
  background-color: #E3F2FD;
  color: #1976D2;
}

.status-info.variant-minimal {
  background-color: transparent;
  color: #1976D2;
}

/* Status Colors - Neutral */
.status-neutral.variant-filled {
  background-color: #999999;
  color: #FFFFFF;
}

.status-neutral.variant-outline {
  background-color: transparent;
  color: #999999;
  border: 1px solid #999999;
}

.status-neutral.variant-soft {
  background-color: #F5F5F5;
  color: #666666;
}

.status-neutral.variant-minimal {
  background-color: transparent;
  color: #999999;
}

/* Status Dot */
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
  flex-shrink: 0;
}

.size-xs .status-dot {
  width: 4px;
  height: 4px;
}

.size-lg .status-dot {
  width: 8px;
  height: 8px;
}

/* Pulse Animation */
.status-dot.pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 currentColor;
    opacity: 1;
  }
  70% {
    box-shadow: 0 0 0 6px transparent;
    opacity: 0.7;
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
    opacity: 1;
  }
}

/* Status Icon */
.status-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

.size-xs .status-icon {
  width: 10px;
  height: 10px;
}

.size-lg .status-icon {
  width: 14px;
  height: 14px;
}

/* Status Text */
.status-text {
  line-height: 1;
}

/* Rounded Variant */
.rounded {
  border-radius: 50px;
}

/* Hover Effects for Interactive Badges */
.admin-status-badge.interactive {
  cursor: pointer;
}

.admin-status-badge.interactive:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Focus States */
.admin-status-badge:focus-visible {
  outline: 2px solid #00A86B;
  outline-offset: 2px;
}

/* Responsive */
@media (max-width: 768px) {
  .size-xs {
    font-size: 10px;
  }
  
  .size-sm {
    font-size: 11px;
  }
  
  .size-md {
    font-size: 12px;
  }
  
  .size-lg {
    font-size: 13px;
  }
}
</style>