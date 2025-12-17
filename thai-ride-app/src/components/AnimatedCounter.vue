<script setup lang="ts">
/**
 * Feature: F361 - Animated Counter
 * Animated number counter component
 */
import { ref, watch, onMounted } from 'vue'

const props = withDefaults(defineProps<{
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
}>(), {
  duration: 1000,
  prefix: '',
  suffix: '',
  decimals: 0
})

const displayValue = ref(0)

const animate = (from: number, to: number) => {
  const startTime = performance.now()
  const diff = to - from
  
  const step = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / props.duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    displayValue.value = from + diff * eased
    
    if (progress < 1) requestAnimationFrame(step)
  }
  
  requestAnimationFrame(step)
}

watch(() => props.value, (newVal, oldVal) => {
  animate(oldVal || 0, newVal)
})

onMounted(() => {
  animate(0, props.value)
})

const formatted = () => displayValue.value.toFixed(props.decimals)
</script>

<template>
  <span class="animated-counter">{{ prefix }}{{ formatted() }}{{ suffix }}</span>
</template>

<style scoped>
.animated-counter { font-variant-numeric: tabular-nums; }
</style>
