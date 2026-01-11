<script setup lang="ts">
/**
 * Loading Spinner V2 - Reusable Loading Component
 * MUNEEF Design System Compliant
 * Thai Ride App - Loading Spinner
 */

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'white'
  text?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'primary',
})

const sizeClasses = {
  sm: 'spinner-sm',
  md: 'spinner-md',
  lg: 'spinner-lg',
  xl: 'spinner-xl',
}

const colorClasses = {
  primary: 'spinner-primary',
  secondary: 'spinner-secondary',
  white: 'spinner-white',
}
</script>

<template>
  <div class="loading-spinner" :class="[sizeClasses[size], colorClasses[color]]">
    <svg
      class="spinner"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        class="spinner-track"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="2"
      />
      <path
        class="spinner-head"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    
    <p v-if="text" class="spinner-text">{{ text }}</p>
  </div>
</template>

<style scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-family: "Sarabun", -apple-system, BlinkMacSystemFont, sans-serif;
}

.spinner {
  animation: spin 1s linear infinite;
}

.spinner-track {
  opacity: 0.25;
}

.spinner-head {
  opacity: 0.75;
}

/* Size variants */
.spinner-sm .spinner {
  width: 1rem;
  height: 1rem;
}

.spinner-md .spinner {
  width: 1.5rem;
  height: 1.5rem;
}

.spinner-lg .spinner {
  width: 2rem;
  height: 2rem;
}

.spinner-xl .spinner {
  width: 3rem;
  height: 3rem;
}

/* Color variants */
.spinner-primary {
  color: #00a86b;
}

.spinner-secondary {
  color: #666666;
}

.spinner-white {
  color: #ffffff;
}

/* Text styling */
.spinner-text {
  font-size: 0.875rem;
  color: currentColor;
  margin: 0;
  text-align: center;
}

.spinner-sm .spinner-text {
  font-size: 0.75rem;
}

.spinner-lg .spinner-text {
  font-size: 1rem;
}

.spinner-xl .spinner-text {
  font-size: 1.125rem;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
  
  .spinner-head {
    opacity: 1;
  }
}
</style>