<script setup lang="ts">
/**
 * Feature: F264 - Color Picker
 * Simple color picker
 */
defineProps<{
  modelValue: string
  colors?: string[]
  label?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const defaultColors = ['#000000', '#ef4444', '#f59e0b', '#10b981', '#276ef1', '#8b5cf6', '#ec4899', '#6b6b6b']
</script>

<template>
  <div class="color-picker">
    <label v-if="label" class="picker-label">{{ label }}</label>
    <div class="color-options">
      <button
        v-for="color in (colors || defaultColors)" :key="color" type="button" class="color-btn"
        :class="{ active: modelValue === color }" :style="{ background: color }" @click="emit('update:modelValue', color)"
      />
    </div>
  </div>
</template>

<style scoped>
.color-picker { display: flex; flex-direction: column; gap: 8px; }
.picker-label { font-size: 13px; font-weight: 500; color: #000; }
.color-options { display: flex; gap: 8px; flex-wrap: wrap; }
.color-btn { width: 32px; height: 32px; border: 2px solid transparent; border-radius: 50%; cursor: pointer; transition: transform 0.2s; }
.color-btn:hover { transform: scale(1.1); }
.color-btn.active { border-color: #000; box-shadow: 0 0 0 2px #fff inset; }
</style>
