<script setup lang="ts">
/**
 * Feature: F255 - Loading Overlay
 * Full screen loading overlay
 */
defineProps<{
  show: boolean
  message?: string
  transparent?: boolean
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="loading-overlay" :class="{ transparent }">
        <div class="loading-content">
          <div class="spinner" />
          <span v-if="message" class="loading-message">{{ message }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.loading-overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.95); z-index: 9999; }
.loading-overlay.transparent { background: rgba(255,255,255,0.8); }
.loading-content { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.spinner { width: 40px; height: 40px; border: 3px solid #e5e5e5; border-top-color: #000; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-message { font-size: 14px; color: #6b6b6b; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
