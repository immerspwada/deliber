<template>
  <div class="theme-color-picker">
    <label :for="inputId" class="color-label">
      {{ label }}
    </label>
    <div class="color-input-wrapper">
      <div class="color-preview" :style="{ backgroundColor: modelValue }"></div>
      <input
        :id="inputId"
        type="text"
        :value="modelValue"
        @input="handleInput"
        class="color-input"
        placeholder="#000000"
        maxlength="7"
      />
      <input
        type="color"
        :value="modelValue"
        @input="handleColorInput"
        class="color-picker"
        :aria-label="`เลือกสี ${label}`"
      />
      <button
        v-if="modelValue !== defaultColor"
        type="button"
        class="reset-button"
        @click="resetColor"
        :aria-label="`รีเซ็ตสี ${label}`"
        title="รีเซ็ตเป็นค่าเริ่มต้น"
      >
        🔄
      </button>
    </div>
    <p v-if="error" class="error-message">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  label: string
  modelValue: string
  defaultColor: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const error = ref<string | null>(null)

const inputId = computed(() => {
  return `color-${props.label.toLowerCase().replace(/\s+/g, '-')}`
})

function validateColor(color: string): boolean {
  const hexPattern = /^#[0-9A-Fa-f]{6}$/
  return hexPattern.test(color)
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  let value = target.value.trim()
  
  if (value && !value.startsWith('#')) {
    value = '#' + value
  }
  
  if (value && !validateColor(value)) {
    error.value = 'รูปแบบสีไม่ถูกต้อง (ใช้ #RRGGBB)'
    return
  }
  
  error.value = null
  emit('update:modelValue', value)
}

function handleColorInput(event: Event) {
  const target = event.target as HTMLInputElement
  error.value = null
  emit('update:modelValue', target.value)
}

function resetColor() {
  error.value = null
  emit('update:modelValue', props.defaultColor)
}
</script>

<style scoped>
.theme-color-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.color-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.color-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
}

.color-preview {
  width: 44px;
  height: 44px;
  border-radius: 0.5rem;
  border: 2px solid #e5e7eb;
  flex-shrink: 0;
  cursor: pointer;
  transition: border-color 0.2s;
}

.color-preview:hover {
  border-color: #9ca3af;
}

.color-input {
  flex: 1;
  padding: 0.625rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-family: 'Monaco', 'Courier New', monospace;
  text-transform: uppercase;
  min-height: 44px;
  transition: all 0.2s;
}

.color-input:focus {
  outline: none;
  border-color: #3b82f6;
  ring: 2px;
  ring-color: #3b82f6;
  ring-opacity: 0.2;
}

.color-picker {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  flex-shrink: 0;
}

.reset-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  font-size: 1.125rem;
}

.reset-button:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.reset-button:active {
  transform: scale(0.95);
}

.error-message {
  font-size: 0.75rem;
  color: #dc2626;
  margin-top: -0.25rem;
}
</style>
