<script setup lang="ts">
/**
 * Feature: F400 - Grid
 * Grid layout component
 */
withDefaults(defineProps<{
  columns?: number | string
  gap?: number | string
  rowGap?: number | string
  columnGap?: number | string
}>(), {
  columns: 12,
  gap: 16
})

const getColumns = (cols: number | string) => typeof cols === 'number' ? `repeat(${cols}, 1fr)` : cols
const getGap = (g: number | string) => typeof g === 'number' ? g + 'px' : g
</script>

<template>
  <div class="grid" :style="{ gridTemplateColumns: getColumns(columns), gap: getGap(gap), rowGap: rowGap ? getGap(rowGap) : undefined, columnGap: columnGap ? getGap(columnGap) : undefined }">
    <slot></slot>
  </div>
</template>

<style scoped>
.grid { display: grid; }
</style>
