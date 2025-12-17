<script setup lang="ts">
/**
 * Feature: F77 - Divider
 * Horizontal/vertical divider with optional text
 */
interface Props {
  orientation?: 'horizontal' | 'vertical'
  text?: string
  spacing?: 'sm' | 'md' | 'lg'
}

withDefaults(defineProps<Props>(), {
  orientation: 'horizontal',
  text: '',
  spacing: 'md'
})
</script>

<template>
  <div class="divider" :class="[orientation, `spacing-${spacing}`]">
    <template v-if="text && orientation === 'horizontal'">
      <span class="divider-line" />
      <span class="divider-text">{{ text }}</span>
      <span class="divider-line" />
    </template>
    <span v-else class="divider-line full" />
  </div>
</template>

<style scoped>
.divider {
  display: flex;
  align-items: center;
}

.divider.horizontal {
  width: 100%;
}

.divider.vertical {
  height: 100%;
  flex-direction: column;
}

/* Spacing */
.spacing-sm.horizontal {
  margin: 8px 0;
}

.spacing-md.horizontal {
  margin: 16px 0;
}

.spacing-lg.horizontal {
  margin: 24px 0;
}

.spacing-sm.vertical {
  margin: 0 8px;
}

.spacing-md.vertical {
  margin: 0 16px;
}

.spacing-lg.vertical {
  margin: 0 24px;
}

.divider-line {
  flex: 1;
  background: #e5e5e5;
}

.horizontal .divider-line {
  height: 1px;
}

.vertical .divider-line {
  width: 1px;
}

.divider-line.full {
  flex: none;
}

.horizontal .divider-line.full {
  width: 100%;
}

.vertical .divider-line.full {
  height: 100%;
}

.divider-text {
  padding: 0 16px;
  font-size: 13px;
  color: #6b6b6b;
  white-space: nowrap;
}
</style>
