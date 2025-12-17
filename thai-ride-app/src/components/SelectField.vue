<script setup lang="ts">
/**
 * Feature: F79 - Select Field
 * Styled select dropdown with label
 */
interface Option {
  value: string | number
  label: string
  disabled?: boolean
}

interface Props {
  modelValue: string | number
  options: Option[]
  label?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: 'เลือก...',
  error: '',
  disabled: false,
  required: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const handleChange = (e: Event) => {
  const target = e.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="select-field" :class="{ error: !!error, disabled }">
    <label v-if="label" class="select-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    
    <div class="select-wrapper">
      <select
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        class="select"
        @change="handleChange"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>
      
      <svg class="select-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
    
    <p v-if="error" class="select-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.select-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.select-label {
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.required {
  color: #e11900;
}

.select-wrapper {
  position: relative;
}

.select {
  width: 100%;
  padding: 14px 44px 14px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 16px;
  color: #000;
  background: #fff;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.2s;
}

.select:focus {
  outline: none;
  border-color: #000;
}

.select:disabled {
  background: #f6f6f6;
  color: #999;
  cursor: not-allowed;
}

.error .select {
  border-color: #e11900;
}

.select-arrow {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b6b6b;
  pointer-events: none;
}

.select-error {
  font-size: 13px;
  color: #e11900;
  margin: 0;
}

.disabled {
  opacity: 0.6;
}
</style>
