<script setup lang="ts">
/**
 * Feature: F263 - Toggle Group
 * Group of toggle buttons
 */
interface Option {
  value: string
  label: string
  icon?: string
}

defineProps<{
  modelValue: string
  options: Option[]
  fullWidth?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="toggle-group" :class="{ 'full-width': fullWidth }">
    <button v-for="opt in options" :key="opt.value" type="button" class="toggle-btn"
      :class="{ active: modelValue === opt.value }" @click="emit('update:modelValue', opt.value)">
      <span v-if="opt.icon" class="btn-icon" v-html="opt.icon" />
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.toggle-group { display: inline-flex; background: #f6f6f6; border-radius: 10px; padding: 4px; }
.toggle-group.full-width { display: flex; width: 100%; }
.toggle-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 16px; background: transparent; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; color: #6b6b6b; cursor: pointer; transition: all 0.2s; }
.toggle-btn:hover { color: #000; }
.toggle-btn.active { background: #fff; color: #000; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.btn-icon { display: flex; }
</style>
