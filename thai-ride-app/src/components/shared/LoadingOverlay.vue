<!--
  Loading Overlay Component
  Feature: F263 - Loading State Manager
  
  Global loading overlay with:
  - Smooth animations
  - Custom messages
  - MUNEEF Style design
  - Accessibility
-->

<script setup lang="ts">
import { useLoadingState } from '@/composables/useLoadingState'

const { isLoading, loadingMessage } = useLoadingState()
</script>

<template>
  <Teleport to="body">
    <Transition name="loading-overlay">
      <div
        v-if="isLoading"
        class="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        role="status"
        aria-live="polite"
        aria-label="กำลังโหลด"
      >
        <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center">
          <!-- Spinner -->
          <div class="relative w-16 h-16 mx-auto mb-4">
            <!-- Outer ring -->
            <div class="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <!-- Spinning ring -->
            <div class="absolute inset-0 border-4 border-[#00A86B] border-t-transparent rounded-full animate-spin"></div>
          </div>

          <!-- Message -->
          <p class="text-gray-700 font-medium">
            {{ loadingMessage }}
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.loading-overlay-enter-active,
.loading-overlay-leave-active {
  transition: opacity 200ms ease;
}

.loading-overlay-enter-from,
.loading-overlay-leave-to {
  opacity: 0;
}

.loading-overlay-enter-active > div,
.loading-overlay-leave-active > div {
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.loading-overlay-enter-from > div {
  transform: scale(0.95);
  opacity: 0;
}

.loading-overlay-leave-to > div {
  transform: scale(0.95);
  opacity: 0;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .loading-overlay-enter-active,
  .loading-overlay-leave-active,
  .loading-overlay-enter-active > div,
  .loading-overlay-leave-active > div {
    transition: none !important;
  }

  .loading-overlay-enter-from > div,
  .loading-overlay-leave-to > div {
    transform: none !important;
  }

  .animate-spin {
    animation: none !important;
  }
}
</style>
