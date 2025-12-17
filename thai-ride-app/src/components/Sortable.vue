<script setup lang="ts">
/**
 * Feature: F374 - Sortable
 * Sortable list component
 */
import { ref } from 'vue'

const props = defineProps<{
  items: Array<{ id: string | number; [key: string]: unknown }>
}>()

const emit = defineEmits<{ (e: 'update', items: typeof props.items): void }>()

const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const onDragStart = (index: number) => { dragIndex.value = index }
const onDragOver = (e: DragEvent, index: number) => { e.preventDefault(); dragOverIndex.value = index }
const onDragEnd = () => {
  if (dragIndex.value !== null && dragOverIndex.value !== null && dragIndex.value !== dragOverIndex.value) {
    const newItems = [...props.items]
    const [removed] = newItems.splice(dragIndex.value, 1)
    if (removed) newItems.splice(dragOverIndex.value, 0, removed)
    emit('update', newItems)
  }
  dragIndex.value = null
  dragOverIndex.value = null
}
</script>

<template>
  <div class="sortable">
    <div v-for="(item, index) in items" :key="item.id" class="sortable-item" :class="{ dragging: dragIndex === index, 'drag-over': dragOverIndex === index }" draggable="true" @dragstart="onDragStart(index)" @dragover="(e) => onDragOver(e, index)" @dragend="onDragEnd">
      <div class="drag-handle">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
      </div>
      <slot :item="item" :index="index"></slot>
    </div>
  </div>
</template>

<style scoped>
.sortable { display: flex; flex-direction: column; gap: 8px; }
.sortable-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; cursor: grab; transition: all 0.2s; }
.sortable-item.dragging { opacity: 0.5; }
.sortable-item.drag-over { border-color: #000; }
.drag-handle { color: #ccc; }
</style>
