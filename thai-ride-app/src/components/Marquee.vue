<script setup lang="ts">
/**
 * Feature: F366 - Marquee
 * Scrolling marquee text
 */
withDefaults(defineProps<{
  speed?: number
  direction?: 'left' | 'right'
  pauseOnHover?: boolean
}>(), {
  speed: 30,
  direction: 'left',
  pauseOnHover: true
})
</script>

<template>
  <div class="marquee" :class="{ 'pause-hover': pauseOnHover }">
    <div class="marquee-content" :style="{ animationDuration: speed + 's', animationDirection: direction === 'right' ? 'reverse' : 'normal' }">
      <slot></slot>
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.marquee { overflow: hidden; white-space: nowrap; }
.marquee-content { display: inline-flex; animation: marquee linear infinite; }
.marquee.pause-hover:hover .marquee-content { animation-play-state: paused; }
@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
</style>
