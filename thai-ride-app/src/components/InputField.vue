<script setup lang="ts">
/**
 * Feature: F78 - Input Field
 * Styled input field with label and error state
 */
import { computed } from 'vue'

interface Props {
  modelValue: string | number
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'search'
  label?: string
  placeholder?: string
  error?: string
  hint?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  icon?: string
  clearable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  label: '',
  placeholder: '',
  error: '',
  hint: '',
  disabled: false,
  readonly: false,
  required: false,
  icon: '',
  clearable: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  focus: []
  blur: []
  clear: []
}>()

const hasValue = computed(() => {
  return props.modelValue !== '' && props.modelValue !== null && props.modelValue !== undefined
})

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', props.type === 'number' ? Number(target.value) : target.value)
}

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<template>
  <div class="input-field" :class="{ error: !!error, disabled }">
    <label v-if="label" class="input-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    
    <div class="input-wrapper">
      <!-- Search icon -->
      <svg v-if="icon === 'search'" class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <!-- Email icon -->
      <svg v-else-if="icon === 'email'" class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
      </svg>
      <!-- Phone icon -->
      <svg v-else-if="icon === 'phone'" class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
      </svg>
      <!-- Lock icon -->
      <svg v-else-if="icon === 'lock'" class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
      <!-- User icon -->
      <svg v-else-if="icon === 'user'" class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      
      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        class="input"
        :class="{ 'has-icon': !!icon, 'has-clear': clearable && hasValue }"
        @input="handleInput"
        @focus="emit('focus')"
        @blur="emit('blur')"
      />
      
      <button
        v-if="clearable && hasValue && !disabled && !readonly"
        type="button"
        class="clear-btn"
        @click="handleClear"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </button>
    </div>
    
    <p v-if="error" class="input-error">{{ error }}</p>
    <p v-else-if="hint" class="input-hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.input-field {
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
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  color: #6b6b6b;
  pointer-events: none;
}

.input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 16px;
  color: #000;
  background: #fff;
  transition: border-color 0.2s;
}

.input.has-icon {
  padding-left: 44px;
}

.input.has-clear {
  padding-right: 44px;
}

.input::placeholder {
  color: #999;
}

.input:focus {
  outline: none;
  border-color: #000;
}

.input:disabled {
  background: #f6f6f6;
  color: #999;
  cursor: not-allowed;
}

.error .input {
  border-color: #e11900;
}

.error .input:focus {
  border-color: #e11900;
}

.clear-btn {
  position: absolute;
  right: 12px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 0;
}

.clear-btn:hover {
  color: #6b6b6b;
}

.input-error {
  font-size: 13px;
  color: #e11900;
  margin: 0;
}

.input-hint {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0;
}

.disabled {
  opacity: 0.6;
}
</style>
