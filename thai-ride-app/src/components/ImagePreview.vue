<script setup lang="ts">
/**
 * Feature: F261 - Image Preview
 * Image preview with zoom capability
 */
import { ref } from 'vue'

defineProps<{
  src: string
  alt?: string
}>()

const isZoomed = ref(false)
</script>

<template>
  <div class="image-preview">
    <img :src="src" :alt="alt" class="preview-image" @click="isZoomed = true" />
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isZoomed" class="zoom-overlay" @click="isZoomed = false">
          <img :src="src" :alt="alt" class="zoomed-image" />
          <button type="button" class="close-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.image-preview { cursor: zoom-in; }
.preview-image { width: 100%; height: auto; border-radius: 8px; }
.zoom-overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.9); z-index: 9999; cursor: zoom-out; }
.zoomed-image { max-width: 90vw; max-height: 90vh; object-fit: contain; }
.close-btn { position: absolute; top: 20px; right: 20px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); border: none; border-radius: 50%; color: #fff; cursor: pointer; }
.close-btn:hover { background: rgba(255,255,255,0.2); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
