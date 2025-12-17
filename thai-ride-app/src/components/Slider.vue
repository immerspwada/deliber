<script setup lang="ts">
/**
 * Feature: F118 - Slider
 * Range slider input
 */
import { computed } from 'vue'

interface Props {
  modelValue: number
  min?: number
  max?: number
  step?: number
  label?: string
  showValue?: boolean
  formatValue?: (value: number) => string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  label: '',
  showValue: true,
  formatValue: (v: number) => v.toString(),
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const percentage = computed(() => {
  return ((props.modelValue - props.min) / (props.max - props.min)) * 100
})

const displayValue = computed(() => {
  return props.formatValue(props.modelValue)
})

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', Number(target.value))
}
</script>

<template>
  <div class="slider-container" :class="{ disabled }">
    <div v-if="label || showValue" class="slider-header">
      <span v-if="label" class="slider-label">{{ label }}</span>
      <span v-if="showValue" class="slider-value">{{ displayValue }}</span>
    </div>
    
    <div class="slider-wrapper">
      <input
        type="range"
        :value="modelValue"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        class="slider"
        :style="{ '--percentage': `${percentage}%` }"
        @input="handleInput"
      />
    </div>
    
    <div v-if="$slots.default" class="slider-marks">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.slider-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.slider-container.disabled {
  opacity: 0.5;
}

.slider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.slider-label {
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.slider-value {
  font-size: 14px;
  font-weight: 600;
  color: #000;
}

.slider-wrapper {
  position: relative;
}

.slider {
  width: 100%;
  height: 6px;
  appearance: none;
  background: linear-gradient(
    to right,
    #000 0%,
    #000 var(--percentage),
    #e5e5e5 var(--percentage),
    #e5e5e5 100%
  );
  border-radius: 3px;
  cursor: pointer;
}

.slider:disabled {
  cursor: not-allowed;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  background: #000;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transition: transform 0.15s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.slider::-webkit-slider-thumb:active {
  transform: scale(0.95);
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #000;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.slider-marks {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6b6b6b;
}
</style>
