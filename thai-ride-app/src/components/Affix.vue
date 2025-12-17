<script setup lang="ts">
/**
 * Feature: F379 - Affix
 * Sticky/affix component
 */
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  offsetTop?: number
  offsetBottom?: number
  target?: string
}>(), {
  offsetTop: 0
})

const isFixed = ref(false)
const placeholder = ref<HTMLElement>()
const content = ref<HTMLElement>()
const placeholderHeight = ref(0)

const onScroll = () => {
  if (!placeholder.value || !content.value) return
  const rect = placeholder.value.getBoundingClientRect()
  
  if (props.offsetBottom !== undefined) {
    isFixed.value = rect.bottom > window.innerHeight - props.offsetBottom
  } else {
    isFixed.value = rect.top <= props.offsetTop
  }
  
  if (isFixed.value) {
    placeholderHeight.value = content.value.offsetHeight
  }
}

onMounted(() => {
  window.addEventListener('scroll', onScroll)
  onScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div ref="placeholder" class="affix-placeholder" :style="{ height: isFixed ? placeholderHeight + 'px' : 'auto' }">
    <div ref="content" class="affix-content" :class="{ fixed: isFixed }" :style="isFixed ? { top: offsetTop + 'px' } : {}">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.affix-content.fixed { position: fixed; left: 0; right: 0; z-index: 100; }
</style>
