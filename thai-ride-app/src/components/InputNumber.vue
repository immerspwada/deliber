<script setup lang="ts">
/**
 * Feature: F388 - Input Number
 * Number input with controls
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
}>(), {
  min: -Infinity,
  max: Infinity,
  step: 1,
  disabled: false,
  size: 'medium'
})

const emit = defineEmits<{ (e: 'update:modelValue', value: number): void; (e: 'change', value: number): void }>()

const canDecrease = computed(() => props.modelValue > props.min)
const canIncrease = computed(() => props.modelValue < props.max)

const decrease = () => {
  if (!canDecrease.value || props.disabled) return
  const newVal = Math.max(props.min, props.modelValue - props.step)
  emit('update:modelValue', newVal)
  emit('change', newVal)
}

const increase = () => {
  if (!canIncrease.value || props.disabled) return
  const newVal = Math.min(props.max, props.modelValue + props.step)
  emit('update:modelValue', newVal)
  emit('change', newVal)
}

const onInput = (e: Event) => {
  const val = parseFloat((e.target as HTMLInputElement).value) || 0
  const clamped = Math.min(props.max, Math.max(props.min, val))
  emit('update:modelValue', clamped)
  emit('change', clamped)
}

const sizeStyles = { small: '32px', medium: '40px', large: '48px' }
</script>

<template>
  <div class="input-number" :class="[size, { disabled }]">
    <button type="button" class="control decrease" :disabled="!canDecrease || disabled" @click="decrease">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>
    </button>
    <input type="number" :value="modelValue" :min="min" :max="max" :step="step" :disabled="disabled" class="number-input" :style="{ height: sizeStyles[size] }" @input="onInput" />
    <button type="button" class="control increase" :disabled="!canIncrease || disabled" @click="increase">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
    </button>
  </div>
</template>

<style scoped>
.input-number { display: inline-flex; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; }
.input-number.disabled { opacity: 0.6; }
.control { width: 36px; background: #f6f6f6; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #000; }
.control:hover:not(:disabled) { background: #e5e5e5; }
.control:disabled { cursor: not-allowed; color: #ccc; }
.number-input { width: 60px; border: none; text-align: center; font-size: 14px; -moz-appearance: textfield; }
.number-input::-webkit-outer-spin-button, .number-input::-webkit-inner-spin-button { -webkit-appearance: none; }
.input-number.small .control { width: 28px; }
.input-number.small .number-input { width: 48px; font-size: 13px; }
.input-number.large .control { width: 44px; }
.input-number.large .number-input { width: 72px; font-size: 16px; }
</style>
