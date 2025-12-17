<script setup lang="ts">
/**
 * Feature: F97 - Time Picker
 * Simple time picker input
 */
import { computed } from 'vue'

interface Props {
  modelValue: string
  label?: string
  placeholder?: string
  min?: string
  max?: string
  disabled?: boolean
  error?: string
  required?: boolean
  step?: number
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: 'เลือกเวลา',
  min: '',
  max: '',
  disabled: false,
  error: '',
  required: false,
  step: 60
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const formattedTime = computed(() => {
  if (!props.modelValue) return ''
  const parts = props.modelValue.split(':')
  const hours = parts[0] || '0'
  const minutes = parts[1] || '00'
  const h = parseInt(hours, 10)
  const period = h >= 12 ? 'น.' : 'น.'
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${displayHour}:${minutes} ${period}`
})

const handleChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="time-picker" :class="{ error: !!error, disabled }">
    <label v-if="label" class="picker-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    
    <div class="picker-wrapper">
      <svg class="picker-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      
      <input
        type="time"
        :value="modelValue"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        :required="required"
        class="picker-input"
        @change="handleChange"
      />
      
      <span v-if="formattedTime" class="display-value">{{ formattedTime }}</span>
    </div>
    
    <p v-if="error" class="picker-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.time-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.picker-label {
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.required {
  color: #e11900;
}

.picker-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.picker-icon {
  position: absolute;
  left: 14px;
  color: #6b6b6b;
  pointer-events: none;
  z-index: 1;
}

.picker-input {
  width: 100%;
  padding: 14px 16px 14px 44px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 16px;
  color: transparent;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.2s;
}

.picker-input:focus {
  outline: none;
  border-color: #000;
}

.picker-input:disabled {
  background: #f6f6f6;
  cursor: not-allowed;
}

.error .picker-input {
  border-color: #e11900;
}

.display-value {
  position: absolute;
  left: 44px;
  right: 16px;
  font-size: 16px;
  color: #000;
  pointer-events: none;
}

.picker-input:not(:valid) + .display-value {
  color: #999;
}

.picker-error {
  font-size: 13px;
  color: #e11900;
  margin: 0;
}

.disabled {
  opacity: 0.6;
}

/* Hide native time picker icon on webkit */
.picker-input::-webkit-calendar-picker-indicator {
  position: absolute;
  right: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
</style>
