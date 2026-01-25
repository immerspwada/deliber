<script setup lang="ts">
/**
 * Feature: F259 - Number Input
 * Number input with increment/decrement buttons
 */
defineProps<{
  modelValue: number
  min?: number
  max?: number
  step?: number
  label?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const increment = (current: number, step: number, max?: number) => {
  const newVal = current + step
  emit('update:modelValue', max !== undefined ? Math.min(newVal, max) : newVal)
}

const decrement = (current: number, step: number, min?: number) => {
  const newVal = current - step
  emit('update:modelValue', min !== undefined ? Math.max(newVal, min) : newVal)
}
</script>

<template>
  <div class="number-input">
    <label v-if="label" class="input-label">{{ label }}</label>
    <div class="input-controls">
      <button type="button" class="control-btn" :disabled="min !== undefined && modelValue <= min" @click="decrement(modelValue, step || 1, min)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      <input
        type="number" :value="modelValue" :min="min" :max="max" :step="step"
        @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
      />
      <button type="button" class="control-btn" :disabled="max !== undefined && modelValue >= max" @click="increment(modelValue, step || 1, max)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.number-input { display: flex; flex-direction: column; gap: 6px; }
.input-label { font-size: 13px; font-weight: 500; color: #000; }
.input-controls { display: flex; align-items: center; border: 1px solid #e5e5e5; border-radius: 10px; overflow: hidden; }
.control-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: #f6f6f6; border: none; cursor: pointer; color: #000; }
.control-btn:hover:not(:disabled) { background: #e5e5e5; }
.control-btn:disabled { color: #ccc; cursor: not-allowed; }
.input-controls input { flex: 1; padding: 12px; border: none; text-align: center; font-size: 16px; font-weight: 600; outline: none; -moz-appearance: textfield; }
.input-controls input::-webkit-outer-spin-button, .input-controls input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
</style>
