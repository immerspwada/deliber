<script setup lang="ts">
/**
 * Feature: F117 - Currency Input
 * Thai Baht currency input with formatting
 */
import { computed } from 'vue'

interface Props {
  modelValue: number
  label?: string
  placeholder?: string
  min?: number
  max?: number
  error?: string
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: '0',
  min: 0,
  max: 999999999,
  error: '',
  disabled: false,
  required: false
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const formattedValue = computed(() => {
  if (!props.modelValue) return ''
  return props.modelValue.toLocaleString('th-TH')
})

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  const digits = target.value.replace(/\D/g, '')
  let value = parseInt(digits, 10) || 0
  value = Math.max(props.min, Math.min(props.max, value))
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="currency-input" :class="{ error: !!error, disabled }">
    <label v-if="label" class="input-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    
    <div class="input-wrapper">
      <span class="currency-symbol">฿</span>
      <input
        type="text"
        :value="formattedValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        class="input"
        inputmode="numeric"
        @input="handleInput"
      />
    </div>
    
    <p v-if="error" class="input-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.currency-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.required {
  color: #e11900;
}

.input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.input-wrapper:focus-within {
  border-color: #000;
}

.error .input-wrapper {
  border-color: #e11900;
}

.currency-symbol {
  padding: 14px 12px;
  background: #f6f6f6;
  font-size: 16px;
  font-weight: 600;
  color: #6b6b6b;
  border-right: 1px solid #e5e5e5;
}

.input {
  flex: 1;
  padding: 14px 16px;
  border: none;
  font-size: 16px;
  font-weight: 500;
  color: #000;
  background: #fff;
  outline: none;
  text-align: right;
}

.input::placeholder {
  color: #999;
  font-weight: 400;
}

.input:disabled {
  background: #f6f6f6;
  color: #999;
  cursor: not-allowed;
}

.input-error {
  font-size: 13px;
  color: #e11900;
  margin: 0;
}

.disabled {
  opacity: 0.6;
}
</style>
