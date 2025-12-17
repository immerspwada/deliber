<script setup lang="ts">
/**
 * Feature: F377 - Splitview
 * Split view panel component
 */
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  direction?: 'horizontal' | 'vertical'
  initialSplit?: number
  minSize?: number
}>(), {
  direction: 'horizontal',
  initialSplit: 50,
  minSize: 20
})

const splitPercent = ref(props.initialSplit)
const isDragging = ref(false)

const onMouseDown = () => {
  isDragging.value = true
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const onMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  const container = document.querySelector('.splitview') as HTMLElement
  if (!container) return
  const rect = container.getBoundingClientRect()
  const percent = props.direction === 'horizontal'
    ? ((e.clientX - rect.left) / rect.width) * 100
    : ((e.clientY - rect.top) / rect.height) * 100
  splitPercent.value = Math.min(100 - props.minSize, Math.max(props.minSize, percent))
}

const onMouseUp = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}
</script>

<template>
  <div class="splitview" :class="[direction]">
    <div class="split-pane first" :style="{ [direction === 'horizontal' ? 'width' : 'height']: splitPercent + '%' }">
      <slot name="first"></slot>
    </div>
    <div class="split-divider" @mousedown="onMouseDown"></div>
    <div class="split-pane second">
      <slot name="second"></slot>
    </div>
  </div>
</template>

<style scoped>
.splitview { display: flex; width: 100%; height: 100%; }
.splitview.vertical { flex-direction: column; }
.split-pane { overflow: auto; }
.split-pane.second { flex: 1; }
.split-divider { background: #e5e5e5; flex-shrink: 0; }
.splitview.horizontal .split-divider { width: 4px; cursor: col-resize; }
.splitview.vertical .split-divider { height: 4px; cursor: row-resize; }
.split-divider:hover { background: #ccc; }
</style>
