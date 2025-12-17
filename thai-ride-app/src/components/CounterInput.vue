<script setup lang="ts">
/**
 * Feature: F99 - Counter Input
 * Number input with increment/decrement buttons
 */
import { computed } from 'vue'

interface Props {
  modelValue: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 999,
  step: 1,
  disabled: false,
  size: 'md'
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const canDecrement = computed(() => props.modelValue > props.min)
const canIncrement = computed(() => props.modelValue < props.max)

const decrement = () => {
  if (props.disabled || !canDecrement.value) return
  const newValue = Math.max(props.min, props.modelValue - props.step)
  emit('update:modelValue', newValue)
}

const increment = () => {
  if (props.disabled || !canIncrement.value) return
  const newValue = Math.min(props.max, props.modelValue + props.step)
  emit('update:modelValue', newValue)
}

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  let value = parseInt(target.value, 10)
  if (isNaN(value)) value = props.min
  value = Math.max(props.min, Math.min(props.max, value))
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="counter-input" :class="[`size-${size}`, { disabled }]">
    <button
      type="button"
      class="counter-btn decrement"
      :disabled="disabled || !canDecrement"
      @click="decrement"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
    
    <input
      type="number"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      class="counter-value"
      @input="handleInput"
    />
    
    <button
      type="button"
      class="counter-btn increment"
      :disabled="disabled || !canIncrement"
      @click="increment"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.counter-input {
  display: inline-flex;
  align-items: center;
  background: #f6f6f6;
  border-radius: 8px;
}

.counter-input.disabled {
  opacity: 0.5;
}

.counter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #000;
  cursor: pointer;
  transition: all 0.2s;
}

.counter-btn:hover:not(:disabled) {
  background: #e5e5e5;
}

.counter-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.counter-value {
  text-align: center;
  background: none;
  border: none;
  font-weight: 600;
  color: #000;
  -moz-appearance: textfield;
}

.counter-value::-webkit-outer-spin-button,
.counter-value::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.counter-value:focus {
  outline: none;
}

/* Size variants */
.size-sm .counter-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
}

.size-sm .counter-value {
  width: 40px;
  font-size: 14px;
}

.size-md .counter-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.size-md .counter-value {
  width: 50px;
  font-size: 16px;
}

.size-lg .counter-btn {
  width: 48px;
  height: 48px;
  border-radius: 10px;
}

.size-lg .counter-value {
  width: 60px;
  font-size: 18px;
}
</style>
