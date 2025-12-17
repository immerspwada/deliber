<script setup lang="ts">
/**
 * Feature: F380 - Back Top
 * Back to top button
 */
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  visibilityHeight?: number
  duration?: number
}>(), {
  visibilityHeight: 400,
  duration: 300
})

const visible = ref(false)

const onScroll = () => {
  visible.value = window.scrollY > props.visibilityHeight
}

const scrollToTop = () => {
  const start = window.scrollY
  const startTime = performance.now()
  
  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / props.duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    window.scrollTo(0, start * (1 - eased))
    if (progress < 1) requestAnimationFrame(animate)
  }
  
  requestAnimationFrame(animate)
}

onMounted(() => window.addEventListener('scroll', onScroll))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <Transition name="fade">
    <button v-if="visible" type="button" class="back-top" @click="scrollToTop">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 15l-6-6-6 6"/>
      </svg>
    </button>
  </Transition>
</template>

<style scoped>
.back-top { position: fixed; bottom: 24px; right: 24px; width: 48px; height: 48px; background: #000; color: #fff; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 100; }
.back-top:hover { transform: scale(1.1); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
