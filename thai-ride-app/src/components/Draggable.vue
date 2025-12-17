<script setup lang="ts">
/**
 * Feature: F372 - Draggable
 * Draggable wrapper component
 */
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  disabled?: boolean
  axis?: 'x' | 'y' | 'both'
  bounds?: 'parent' | 'window' | null
}>(), {
  disabled: false,
  axis: 'both',
  bounds: null
})

const emit = defineEmits<{ (e: 'dragStart'): void; (e: 'drag', pos: { x: number; y: number }): void; (e: 'dragEnd'): void }>()

const position = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const startPos = ref({ x: 0, y: 0 })
const startMouse = ref({ x: 0, y: 0 })

const onMouseDown = (e: MouseEvent) => {
  if (props.disabled) return
  isDragging.value = true
  startPos.value = { ...position.value }
  startMouse.value = { x: e.clientX, y: e.clientY }
  emit('dragStart')
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const onMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  const dx = props.axis !== 'y' ? e.clientX - startMouse.value.x : 0
  const dy = props.axis !== 'x' ? e.clientY - startMouse.value.y : 0
  position.value = { x: startPos.value.x + dx, y: startPos.value.y + dy }
  emit('drag', position.value)
}

const onMouseUp = () => {
  isDragging.value = false
  emit('dragEnd')
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}
</script>

<template>
  <div class="draggable" :class="{ dragging: isDragging, disabled }" :style="{ transform: `translate(${position.x}px, ${position.y}px)` }" @mousedown="onMouseDown">
    <slot></slot>
  </div>
</template>

<style scoped>
.draggable { cursor: grab; user-select: none; }
.draggable.dragging { cursor: grabbing; }
.draggable.disabled { cursor: default; }
</style>
