<script setup lang="ts">
/**
 * Feature: F368 - Spotlight
 * Spotlight/highlight overlay for onboarding
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  visible: boolean
  targetRect?: { top: number; left: number; width: number; height: number }
  padding?: number
  message?: string
}>(), {
  visible: false,
  padding: 8
})

const emit = defineEmits<{ (e: 'close'): void; (e: 'next'): void }>()

const spotlightStyle = computed(() => {
  if (!props.targetRect) return {}
  return {
    top: props.targetRect.top - props.padding + 'px',
    left: props.targetRect.left - props.padding + 'px',
    width: props.targetRect.width + props.padding * 2 + 'px',
    height: props.targetRect.height + props.padding * 2 + 'px'
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="spotlight-overlay" @click.self="emit('close')">
      <div v-if="targetRect" class="spotlight-hole" :style="spotlightStyle"></div>
      <div v-if="message" class="spotlight-message" :style="{ top: (targetRect?.top || 0) + (targetRect?.height || 0) + padding + 16 + 'px' }">
        <p>{{ message }}</p>
        <button type="button" class="next-btn" @click="emit('next')">ถัดไป</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.spotlight-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 9999; }
.spotlight-hole { position: absolute; box-shadow: 0 0 0 9999px rgba(0,0,0,0.75); border-radius: 8px; background: transparent; pointer-events: none; }
.spotlight-message { position: absolute; left: 50%; transform: translateX(-50%); background: #fff; padding: 16px 20px; border-radius: 12px; max-width: 280px; text-align: center; }
.spotlight-message p { margin: 0 0 12px; font-size: 14px; color: #000; }
.next-btn { background: #000; color: #fff; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; cursor: pointer; }
</style>
