<script setup lang="ts">
/**
 * Feature: F265 - Range Slider
 * Range slider with min/max values
 */
import { computed } from 'vue'

const props = defineProps<{
  modelValue: [number, number]
  min?: number
  max?: number
  step?: number
  label?: string
  formatValue?: (v: number) => string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: [number, number]]
}>()

const minVal = props.min ?? 0
const maxVal = props.max ?? 100

const leftPercent = computed(() => ((props.modelValue[0] - minVal) / (maxVal - minVal)) * 100)
const rightPercent = computed(() => ((props.modelValue[1] - minVal) / (maxVal - minVal)) * 100)

const updateMin = (e: Event) => {
  const val = Number((e.target as HTMLInputElement).value)
  if (val <= props.modelValue[1]) emit('update:modelValue', [val, props.modelValue[1]])
}

const updateMax = (e: Event) => {
  const val = Number((e.target as HTMLInputElement).value)
  if (val >= props.modelValue[0]) emit('update:modelValue', [props.modelValue[0], val])
}

const format = (v: number) => props.formatValue ? props.formatValue(v) : String(v)
</script>

<template>
  <div class="range-slider">
    <div v-if="label" class="slider-header">
      <span class="slider-label">{{ label }}</span>
      <span class="slider-values">{{ format(modelValue[0]) }} - {{ format(modelValue[1]) }}</span>
    </div>
    <div class="slider-track">
      <div class="track-fill" :style="{ left: `${leftPercent}%`, width: `${rightPercent - leftPercent}%` }" />
      <input type="range" :min="minVal" :max="maxVal" :step="step || 1" :value="modelValue[0]" @input="updateMin" />
      <input type="range" :min="minVal" :max="maxVal" :step="step || 1" :value="modelValue[1]" @input="updateMax" />
    </div>
  </div>
</template>

<style scoped>
.range-slider { padding: 8px 0; }
.slider-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
.slider-label { font-size: 13px; font-weight: 500; color: #000; }
.slider-values { font-size: 13px; color: #6b6b6b; }
.slider-track { position: relative; height: 6px; background: #e5e5e5; border-radius: 3px; }
.track-fill { position: absolute; height: 100%; background: #000; border-radius: 3px; }
.slider-track input { position: absolute; width: 100%; height: 100%; top: 0; left: 0; -webkit-appearance: none; background: transparent; pointer-events: none; }
.slider-track input::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; background: #000; border-radius: 50%; cursor: pointer; pointer-events: auto; margin-top: -7px; }
</style>
