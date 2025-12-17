<script setup lang="ts">
/**
 * Feature: F398 - Tag
 * Tag/label component
 */
withDefaults(defineProps<{
  color?: 'default' | 'success' | 'warning' | 'error' | 'info' | string
  closable?: boolean
  bordered?: boolean
  size?: 'small' | 'medium' | 'large'
}>(), {
  color: 'default',
  closable: false,
  bordered: true,
  size: 'medium'
})

const emit = defineEmits<{ (e: 'close'): void }>()

const presetColors: Record<string, { bg: string; text: string; border: string }> = {
  default: { bg: '#f6f6f6', text: '#000', border: '#e5e5e5' },
  success: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  warning: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  error: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  info: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' }
}

const getStyle = (color: string) => {
  if (presetColors[color]) return presetColors[color]
  return { bg: color + '20', text: color, border: color }
}

const sizeStyles = { small: '4px 8px', medium: '6px 12px', large: '8px 16px' }
</script>

<template>
  <span class="tag" :class="[size, { bordered }]" :style="{ background: getStyle(color).bg, color: getStyle(color).text, borderColor: bordered ? getStyle(color).border : 'transparent', padding: sizeStyles[size] }">
    <slot></slot>
    <button v-if="closable" type="button" class="close-btn" @click="emit('close')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  </span>
</template>

<style scoped>
.tag { display: inline-flex; align-items: center; gap: 6px; border-radius: 4px; font-size: 12px; font-weight: 500; white-space: nowrap; }
.tag.bordered { border: 1px solid; }
.tag.small { font-size: 11px; }
.tag.large { font-size: 14px; }
.close-btn { background: none; border: none; padding: 0; cursor: pointer; opacity: 0.6; display: flex; }
.close-btn:hover { opacity: 1; }
</style>
