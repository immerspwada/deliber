<script setup lang="ts">
/**
 * Feature: F387 - Color Input
 * Color input with presets
 */
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  presets?: string[]
  showInput?: boolean
}>(), {
  presets: () => ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'],
  showInput: true
})

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const isOpen = ref(false)
const inputValue = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const selectColor = (color: string) => {
  emit('update:modelValue', color)
  isOpen.value = false
}
</script>

<template>
  <div class="color-input">
    <div class="color-trigger" @click="isOpen = !isOpen">
      <div class="color-preview" :style="{ background: modelValue }"></div>
      <span class="color-value">{{ modelValue }}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
    </div>
    
    <div v-if="isOpen" class="color-dropdown">
      <div class="color-presets">
        <button v-for="color in presets" :key="color" type="button" class="preset-btn" :class="{ active: modelValue === color }" :style="{ background: color }" @click="selectColor(color)"></button>
      </div>
      
      <div v-if="showInput" class="color-custom">
        <input v-model="inputValue" type="color" class="native-picker" />
        <input v-model="inputValue" type="text" class="hex-input" placeholder="#000000" maxlength="7" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.color-input { position: relative; }
.color-trigger { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid #e5e5e5; border-radius: 8px; cursor: pointer; background: #fff; }
.color-preview { width: 24px; height: 24px; border-radius: 4px; border: 1px solid #e5e5e5; }
.color-value { flex: 1; font-size: 14px; font-family: monospace; }
.color-dropdown { position: absolute; top: 100%; left: 0; margin-top: 4px; padding: 12px; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 10; min-width: 200px; }
.color-presets { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 12px; }
.preset-btn { width: 32px; height: 32px; border: 2px solid transparent; border-radius: 6px; cursor: pointer; }
.preset-btn.active { border-color: #000; }
.color-custom { display: flex; gap: 8px; }
.native-picker { width: 40px; height: 36px; padding: 0; border: 1px solid #e5e5e5; border-radius: 6px; cursor: pointer; }
.hex-input { flex: 1; padding: 8px 12px; border: 1px solid #e5e5e5; border-radius: 6px; font-family: monospace; font-size: 14px; }
</style>
