<script setup lang="ts">
/**
 * Feature: F381 - Segmented
 * Segmented control component
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  options: Array<{ value: string | number; label: string; disabled?: boolean }>
  modelValue: string | number
  size?: 'small' | 'medium' | 'large'
  block?: boolean
}>(), {
  size: 'medium',
  block: false
})

const emit = defineEmits<{ (e: 'update:modelValue', value: string | number): void }>()

const activeIndex = computed(() => props.options.findIndex(o => o.value === props.modelValue))

const sizeStyles = {
  small: { padding: '6px 12px', fontSize: '12px' },
  medium: { padding: '8px 16px', fontSize: '14px' },
  large: { padding: '12px 20px', fontSize: '16px' }
}
</script>

<template>
  <div class="segmented" :class="{ block }">
    <div class="segmented-track">
      <div class="segmented-indicator" :style="{ width: 100 / options.length + '%', transform: `translateX(${activeIndex * 100}%)` }"></div>
    </div>
    <button v-for="opt in options" :key="opt.value" type="button" class="segmented-option" :class="{ active: modelValue === opt.value, disabled: opt.disabled }" :style="sizeStyles[size]" :disabled="opt.disabled" @click="emit('update:modelValue', opt.value)">
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented { display: inline-flex; position: relative; background: #f6f6f6; border-radius: 8px; padding: 4px; }
.segmented.block { display: flex; width: 100%; }
.segmented-track { position: absolute; inset: 4px; pointer-events: none; }
.segmented-indicator { height: 100%; background: #fff; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: transform 0.2s ease; }
.segmented-option { flex: 1; background: none; border: none; font-weight: 500; color: #6b6b6b; cursor: pointer; position: relative; z-index: 1; transition: color 0.2s; white-space: nowrap; }
.segmented-option.active { color: #000; }
.segmented-option.disabled { opacity: 0.5; cursor: not-allowed; }
</style>
