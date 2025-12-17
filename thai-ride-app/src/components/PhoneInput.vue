<script setup lang="ts">
/**
 * Feature: F115 - Phone Input
 * Thai phone number input with formatting
 */
import { computed } from 'vue'

interface Props {
  modelValue: string
  label?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: '0XX-XXX-XXXX',
  error: '',
  disabled: false,
  required: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const formattedValue = computed(() => {
  const digits = props.modelValue.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`
})

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  const digits = target.value.replace(/\D/g, '').slice(0, 10)
  emit('update:modelValue', digits)
}
</script>

<template>
  <div class="phone-input" :class="{ error: !!error, disabled }">
    <label v-if="label" class="input-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    
    <div class="input-wrapper">
      <span class="country-code">+66</span>
      <input
        type="tel"
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
.phone-input {
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

.country-code {
  padding: 14px 12px;
  background: #f6f6f6;
  font-size: 16px;
  font-weight: 500;
  color: #6b6b6b;
  border-right: 1px solid #e5e5e5;
}

.input {
  flex: 1;
  padding: 14px 16px;
  border: none;
  font-size: 16px;
  color: #000;
  background: #fff;
  outline: none;
}

.input::placeholder {
  color: #999;
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
