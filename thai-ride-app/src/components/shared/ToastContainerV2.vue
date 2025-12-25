<!--
  Toast Container V2
  Feature: F262 - Advanced Toast System with Queue Management
  
  Enhanced toast container with:
  - Multiple position support
  - Queue management
  - Smooth animations
  - Accessibility
  - MUNEEF Style design
-->

<script setup lang="ts">
import { computed } from 'vue'
import { useToastV2, getToastIcon, getToastColorClasses, type Toast, type ToastPosition } from '@/composables/useToastV2'

const { toasts, removeToast, pauseToast, resumeToast } = useToastV2()

// Group toasts by position
const toastsByPosition = computed(() => {
  const groups: Record<ToastPosition, Toast[]> = {
    'top-right': [],
    'top-center': [],
    'top-left': [],
    'bottom-right': [],
    'bottom-center': [],
    'bottom-left': []
  }

  toasts.value.forEach(toast => {
    const position = toast.position || 'top-right'
    groups[position].push(toast)
  })

  return groups
})

// Position classes
const positionClasses: Record<ToastPosition, string> = {
  'top-right': 'top-4 right-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  'bottom-left': 'bottom-4 left-4'
}

const handleDismiss = (id: string) => {
  removeToast(id)
}

const handleMouseEnter = (id: string) => {
  pauseToast(id)
}

const handleMouseLeave = (id: string) => {
  resumeToast(id)
}
</script>

<template>
  <!-- Toast containers for each position -->
  <div
    v-for="(position, key) in positionClasses"
    :key="key"
    :class="[
      'fixed z-[9999] flex flex-col gap-3 pointer-events-none',
      position
    ]"
    :style="{ maxWidth: key.includes('center') ? '90vw' : '400px' }"
  >
    <TransitionGroup
      name="toast"
      tag="div"
      class="flex flex-col gap-3"
    >
      <div
        v-for="toast in toastsByPosition[key as ToastPosition]"
        :key="toast.id"
        :class="[
          'toast-item pointer-events-auto',
          'bg-white rounded-2xl shadow-lg border-2',
          'p-4 min-w-[300px] max-w-full',
          'transition-all duration-300',
          getToastColorClasses(toast.type)
        ]"
        role="alert"
        :aria-live="toast.type === 'error' ? 'assertive' : 'polite'"
        @mouseenter="handleMouseEnter(toast.id)"
        @mouseleave="handleMouseLeave(toast.id)"
      >
        <!-- Toast Content -->
        <div class="flex items-start gap-3">
          <!-- Icon -->
          <div 
            class="flex-shrink-0 w-6 h-6"
            v-html="getToastIcon(toast.type)"
          />

          <!-- Message -->
          <div class="flex-1 min-w-0">
            <h4 v-if="toast.title" class="font-semibold text-sm mb-1">
              {{ toast.title }}
            </h4>
            <p class="text-sm">
              {{ toast.message }}
            </p>

            <!-- Action Button -->
            <button
              v-if="toast.action"
              :class="[
                'mt-2 px-3 py-1.5 rounded-lg text-xs font-medium',
                'transition-colors duration-200',
                toast.action.variant === 'primary'
                  ? 'bg-[#00A86B] text-white hover:bg-[#008F5B]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
              @click="toast.action.onClick"
            >
              {{ toast.action.label }}
            </button>
          </div>

          <!-- Dismiss Button -->
          <button
            v-if="toast.dismissible"
            class="flex-shrink-0 w-5 h-5 opacity-50 hover:opacity-100 transition-opacity"
            @click="handleDismiss(toast.id)"
            aria-label="ปิด"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Progress Bar -->
        <div
          v-if="toast.showProgress && toast.duration"
          class="mt-3 h-1 bg-black/10 rounded-full overflow-hidden"
        >
          <div
            class="h-full bg-current transition-all ease-linear"
            :style="{
              width: '100%',
              animation: `toast-progress ${toast.duration}ms linear forwards`,
              animationPlayState: toast.pausedAt ? 'paused' : 'running'
            }"
          />
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* Toast animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.95);
}

.toast-move {
  transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Progress bar animation */
@keyframes toast-progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active,
  .toast-move {
    transition: none !important;
    animation: none !important;
  }

  .toast-enter-from,
  .toast-leave-to {
    transform: none !important;
  }
}
</style>
