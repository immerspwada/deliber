<script setup lang="ts">
/**
 * Feature: F389 - Descriptions
 * Description list component
 */
interface Item { label: string; value: string | number; span?: number }

withDefaults(defineProps<{
  items: Item[]
  columns?: number
  bordered?: boolean
  layout?: 'horizontal' | 'vertical'
  size?: 'small' | 'medium' | 'large'
}>(), {
  columns: 3,
  bordered: false,
  layout: 'horizontal',
  size: 'medium'
})

const sizeStyles = { small: '10px 12px', medium: '12px 16px', large: '16px 20px' }
</script>

<template>
  <div class="descriptions" :class="[layout, size, { bordered }]">
    <div v-for="(item, i) in items" :key="i" class="desc-item" :style="{ gridColumn: `span ${item.span || 1}` }">
      <span class="desc-label">{{ item.label }}</span>
      <span class="desc-value">{{ item.value }}</span>
    </div>
  </div>
</template>

<style scoped>
.descriptions { display: grid; grid-template-columns: repeat(v-bind(columns), 1fr); gap: 1px; background: #e5e5e5; border-radius: 8px; overflow: hidden; }
.descriptions:not(.bordered) { background: transparent; gap: 0; }
.desc-item { display: flex; background: #fff; padding: v-bind('sizeStyles[size]'); }
.descriptions.vertical .desc-item { flex-direction: column; gap: 4px; }
.descriptions.horizontal .desc-item { gap: 12px; }
.desc-label { font-size: 13px; color: #6b6b6b; white-space: nowrap; }
.descriptions.horizontal .desc-label { min-width: 100px; }
.desc-value { font-size: 14px; color: #000; }
.descriptions.bordered .desc-item { border: 1px solid #e5e5e5; margin: -1px 0 0 -1px; }
</style>
