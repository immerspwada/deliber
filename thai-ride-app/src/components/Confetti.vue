<script setup lang="ts">
/**
 * Feature: F362 - Confetti
 * Celebration confetti animation
 */
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  active?: boolean
  particleCount?: number
  duration?: number
}>(), {
  active: false,
  particleCount: 50,
  duration: 3000
})

const particles = ref<Array<{ id: number; x: number; y: number; color: string; rotation: number; scale: number }>>([])
const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']

let animationFrame: number = 0
let timeout: ReturnType<typeof setTimeout>

const createParticles = () => {
  particles.value = Array.from({ length: props.particleCount }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    color: colors[Math.floor(Math.random() * colors.length)] || '#FFD700',
    rotation: Math.random() * 360,
    scale: 0.5 + Math.random() * 0.5
  }))
  
  timeout = setTimeout(() => { particles.value = [] }, props.duration)
}

onMounted(() => {
  if (props.active) createParticles()
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrame)
  clearTimeout(timeout)
})
</script>

<template>
  <div v-if="active && particles.length" class="confetti-container">
    <div
      v-for="p in particles" :key="p.id" class="confetti-particle" :style="{
        left: p.x + '%',
        '--start-y': p.y + '%',
        '--color': p.color,
        '--rotation': p.rotation + 'deg',
        '--scale': p.scale,
        '--duration': duration + 'ms'
      }"
    ></div>
  </div>
</template>

<style scoped>
.confetti-container { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 9999; }
.confetti-particle { position: absolute; width: 10px; height: 10px; background: var(--color); transform: rotate(var(--rotation)) scale(var(--scale)); animation: fall var(--duration) ease-out forwards; }
@keyframes fall { 0% { top: var(--start-y); opacity: 1; } 100% { top: 110%; opacity: 0; transform: rotate(calc(var(--rotation) + 720deg)) scale(var(--scale)); } }
</style>
