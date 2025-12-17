<script setup lang="ts">
/**
 * Feature: F364 - Ripple
 * Material design ripple effect
 */
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  color?: string
  duration?: number
}>(), {
  color: 'rgba(0, 0, 0, 0.1)',
  duration: 600
})

const ripples = ref<Array<{ id: number; x: number; y: number; size: number }>>([])
let rippleId = 0

const createRipple = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 2
  const x = e.clientX - rect.left - size / 2
  const y = e.clientY - rect.top - size / 2
  
  const id = rippleId++
  ripples.value.push({ id, x, y, size })
  
  setTimeout(() => {
    ripples.value = ripples.value.filter(r => r.id !== id)
  }, props.duration)
}
</script>

<template>
  <div class="ripple-container" @click="createRipple">
    <slot></slot>
    <span v-for="r in ripples" :key="r.id" class="ripple" :style="{
      left: r.x + 'px',
      top: r.y + 'px',
      width: r.size + 'px',
      height: r.size + 'px',
      background: color,
      animationDuration: duration + 'ms'
    }"></span>
  </div>
</template>

<style scoped>
.ripple-container { position: relative; overflow: hidden; }
.ripple { position: absolute; border-radius: 50%; transform: scale(0); animation: ripple-effect ease-out forwards; pointer-events: none; }
@keyframes ripple-effect { to { transform: scale(1); opacity: 0; } }
</style>
