<script setup lang="ts">
/**
 * Feature: F359 - Swipeable Card
 * Card with swipe actions
 */
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  leftAction?: { label: string; color: string; icon?: string }
  rightAction?: { label: string; color: string; icon?: string }
  threshold?: number
}>(), {
  threshold: 80
})

const emit = defineEmits<{ (e: 'swipeLeft'): void; (e: 'swipeRight'): void }>()

const translateX = ref(0)
const startX = ref(0)
const isSwiping = ref(false)

const onTouchStart = (e: TouchEvent) => {
  if (e.touches[0]) {
    startX.value = e.touches[0].clientX
    isSwiping.value = true
  }
}

const onTouchMove = (e: TouchEvent) => {
  if (!isSwiping.value || !e.touches[0]) return
  const diff = e.touches[0].clientX - startX.value
  const maxSwipe = props.threshold * 1.5
  translateX.value = Math.max(-maxSwipe, Math.min(maxSwipe, diff))
}

const onTouchEnd = () => {
  if (translateX.value >= props.threshold && props.rightAction) {
    emit('swipeRight')
  } else if (translateX.value <= -props.threshold && props.leftAction) {
    emit('swipeLeft')
  }
  translateX.value = 0
  isSwiping.value = false
}
</script>

<template>
  <div class="swipeable-card">
    <div v-if="leftAction" class="action-bg left" :style="{ background: leftAction.color }">
      <span v-if="leftAction.icon" v-html="leftAction.icon"></span>
      <span>{{ leftAction.label }}</span>
    </div>
    <div v-if="rightAction" class="action-bg right" :style="{ background: rightAction.color }">
      <span v-if="rightAction.icon" v-html="rightAction.icon"></span>
      <span>{{ rightAction.label }}</span>
    </div>
    <div class="card-content" :style="{ transform: `translateX(${translateX}px)` }" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.swipeable-card { position: relative; overflow: hidden; border-radius: 12px; }
.action-bg { position: absolute; top: 0; bottom: 0; width: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: #fff; font-size: 12px; }
.action-bg.left { right: 0; }
.action-bg.right { left: 0; }
.card-content { position: relative; background: #fff; transition: transform 0.2s; z-index: 1; }
</style>
