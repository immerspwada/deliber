<script setup lang="ts">
/**
 * Feature: F373 - Resizable
 * Resizable container component
 */
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
}>(), {
  minWidth: 100,
  minHeight: 100,
  maxWidth: 800,
  maxHeight: 600
})

const emit = defineEmits<{ (e: 'resize', size: { width: number; height: number }): void }>()

const size = ref({ width: 200, height: 150 })
const isResizing = ref(false)

const onMouseDown = (e: MouseEvent) => {
  e.preventDefault()
  isResizing.value = true
  const startX = e.clientX
  const startY = e.clientY
  const startW = size.value.width
  const startH = size.value.height

  const onMove = (ev: MouseEvent) => {
    const newW = Math.min(props.maxWidth, Math.max(props.minWidth, startW + ev.clientX - startX))
    const newH = Math.min(props.maxHeight, Math.max(props.minHeight, startH + ev.clientY - startY))
    size.value = { width: newW, height: newH }
    emit('resize', size.value)
  }

  const onUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}
</script>

<template>
  <div class="resizable" :style="{ width: size.width + 'px', height: size.height + 'px' }">
    <slot></slot>
    <div class="resize-handle" @mousedown="onMouseDown">
      <svg width="12" height="12" viewBox="0 0 12 12"><path d="M10 2L2 10M10 6L6 10M10 10L10 10" stroke="#ccc" stroke-width="1.5"/></svg>
    </div>
  </div>
</template>

<style scoped>
.resizable { position: relative; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; }
.resize-handle { position: absolute; bottom: 0; right: 0; width: 20px; height: 20px; cursor: se-resize; display: flex; align-items: center; justify-content: center; }
</style>
