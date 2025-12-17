<script setup lang="ts">
/**
 * Feature: F378 - Watermark
 * Watermark overlay component
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  text: string
  fontSize?: number
  color?: string
  opacity?: number
  rotate?: number
  gap?: number
}>(), {
  fontSize: 14,
  color: '#000',
  opacity: 0.1,
  rotate: -20,
  gap: 100
})

const watermarkStyle = computed(() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${props.gap * 2}" height="${props.gap}"><text x="50%" y="50%" fill="${props.color}" fill-opacity="${props.opacity}" font-size="${props.fontSize}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${props.rotate}, ${props.gap}, ${props.gap / 2})">${props.text}</text></svg>`
  return { backgroundImage: `url('data:image/svg+xml,${encodeURIComponent(svg)}')` }
})
</script>

<template>
  <div class="watermark-container">
    <slot></slot>
    <div class="watermark" :style="watermarkStyle"></div>
  </div>
</template>

<style scoped>
.watermark-container { position: relative; }
.watermark { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
</style>
