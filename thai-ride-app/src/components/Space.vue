<script setup lang="ts">
/**
 * Feature: F399 - Space
 * Spacing layout component
 */
withDefaults(defineProps<{
  direction?: 'horizontal' | 'vertical'
  size?: 'small' | 'medium' | 'large' | number
  align?: 'start' | 'center' | 'end' | 'baseline'
  wrap?: boolean
}>(), {
  direction: 'horizontal',
  size: 'medium',
  align: 'center',
  wrap: false
})

const sizeMap = { small: '8px', medium: '16px', large: '24px' }
const getGap = (size: 'small' | 'medium' | 'large' | number) => typeof size === 'number' ? size + 'px' : sizeMap[size]
</script>

<template>
  <div class="space" :class="[direction, { wrap }]" :style="{ gap: getGap(size), alignItems: align }">
    <slot></slot>
  </div>
</template>

<style scoped>
.space { display: flex; }
.space.vertical { flex-direction: column; }
.space.wrap { flex-wrap: wrap; }
</style>
