<template>
  <div class="loading-state" role="status" aria-live="polite">
    <div class="loading-content">
      <div class="spinner" aria-hidden="true">
        <svg class="animate-spin h-12 w-12 text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      
      <p :class="typography.body" class="loading-message">
        {{ message }}
      </p>
    </div>
    
    <div v-if="showSkeleton" class="skeleton-wrapper">
      <div v-for="i in skeletonCount" :key="i" class="skeleton-card">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-text"></div>
        <div class="skeleton-line skeleton-text short"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { typography } from '@/admin/styles/design-tokens'

interface Props {
  message?: string
  showSkeleton?: boolean
  skeletonCount?: number
}

withDefaults(defineProps<Props>(), {
  message: 'กำลังโหลด...',
  showSkeleton: false,
  skeletonCount: 3
})
</script>

<style scoped>
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-message {
  color: #4b5563;
}

.skeleton-wrapper {
  width: 100%;
  max-width: 42rem;
  margin-top: 2rem;
}

.skeleton-wrapper > * + * {
  margin-top: 1rem;
}

.skeleton-card {
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.skeleton-card > * + * {
  margin-top: 0.75rem;
}

.skeleton-line {
  background-color: #e5e7eb;
  border-radius: 0.25rem;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.skeleton-title {
  height: 1.5rem;
  width: 33.333333%;
}

.skeleton-text {
  height: 1rem;
  width: 100%;
}

.skeleton-text.short {
  width: 66.666667%;
}
</style>
