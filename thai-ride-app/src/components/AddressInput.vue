<script setup lang="ts">
/**
 * Feature: F131 - Address Input
 * Location search input with autocomplete
 */
import { ref } from 'vue'

interface Props {
  modelValue: string
  placeholder?: string
  label?: string
  icon?: 'pickup' | 'destination' | 'search'
  disabled?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'ค้นหาสถานที่',
  icon: 'search',
  disabled: false,
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: []
  clear: []
}>()

const inputRef = ref<HTMLInputElement>()

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
  inputRef.value?.focus()
}

const focus = () => {
  inputRef.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="address-input" :class="{ disabled, focused: false }">
    <label v-if="label" class="input-label">{{ label }}</label>

    <div class="input-wrapper">
      <div class="input-icon">
        <svg v-if="icon === 'pickup'" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8"/>
        </svg>
        <svg v-else-if="icon === 'destination'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="4" y="4" width="16" height="16" rx="2"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
      </div>
      
      <input
        ref="i
nputRef"
        type="text"
        class="input-field"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        @input="handleInput"
        @focus="emit('focus')"
      />
      
      <div v-if="loading" class="input-loading">
        <div class="spinner" />
      </div>
      
      <button
        v-else-if="modelValue"
        type="button"
        class="clear-btn"
        @click="handleClear"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.address-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b6b6b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #f6f6f6;
  border: 2px solid transparent;
  border-radius: 12px;
  transition: all 0.2s;
}

.address-input:focus-within .input-wrapper {
  background: #fff;
  border-color: #000;
}

.address-input.disabled .input-wrapper {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-icon {
  color: #000;
  flex-shrink: 0;
}

.input-icon svg[fill="currentColor"] {
  color: #000;
}

.input-field {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 16px;
  color: #000;
  outline: none;
}

.input-field::placeholder {
  color: #999;
}

.input-field:disabled {
  cursor: not-allowed;
}

.input-loading {
  flex-shrink: 0;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #e5e5e5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.clear-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #999;
  flex-shrink: 0;
}

.clear-btn:hover {
  color: #000;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
