<script setup lang="ts">
/**
 * Feature: F370 - Masonry
 * Masonry grid layout component
 */
withDefaults(defineProps<{
  columns?: number
  gap?: number
}>(), {
  columns: 2,
  gap: 16
})
</script>

<template>
  <div class="masonry" :style="{ columnCount: columns, columnGap: gap + 'px' }">
    <slot></slot>
  </div>
</template>

<style scoped>
.masonry { width: 100%; }
.masonry :deep(> *) { break-inside: avoid; margin-bottom: v-bind('gap + "px"'); }
</style>
