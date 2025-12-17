<script setup lang="ts">
/**
 * Feature: F290 - Promo Code Input
 * Promo code input with validation
 */
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  loading?: boolean
  error?: string
  success?: string
  discount?: number
}>(), {
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'apply': [code: string]
  'clear': []
}>()

const inputRef = ref<HTMLInputElement>()
const focused = ref(false)

const hasValue = computed(() => props.modelValue.length > 0)
const isApplied = computed(() => !!props.success)

const handleInput = (e: Event) => {
  const value = (e.target as HTMLInputElement).value.toUpperCase()
  emit('update:modelValue', value)
}

const apply = () => {
  if (hasValue.value && !props.loading) {
    emit('apply', props.modelValue)
  }
}

const clear = () => {
  emit('update:modelValue', '')
  emit('clear')
  inputRef.value?.focus()
}
</script>

<template>
  <div class="promo-input" :class="{ focused, error: !!error, success: isApplied }">
    <div class="input-wrapper">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
        <line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
      
      <input
        ref="inputRef"
        type="text"
        :value="modelValue"
        placeholder="กรอกรหัสโปรโมชั่น"
        :disabled="isApplied"
        @input="handleInput"
        @focus="focused = true"
        @blur="focused = false"
        @keyup.enter="apply"
      />
      
      <button v-if="isApplied" type="button" class="clear-btn" @click="clear">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
      
      <button
        v-else
        type="button"
        class="apply-btn"
        :disabled="!hasValue || loading"
        @click="apply"
      >
        <span v-if="loading" class="spinner"></span>
        <span v-else>ใช้</span>
      </button>
    </div>
    
    <p v-if="error" class="message error-msg">{{ error }}</p>
    <p v-if="success" class="message success-msg">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20,6 9,17 4,12"/>
      </svg>
      {{ success }}
      <span v-if="discount" class="discount">-฿{{ discount }}</span>
    </p>
  </div>
</template>

<style scoped>
.promo-input {
  width: 100%;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  transition: border-color 0.2s;
}

.promo-input.focused .input-wrapper {
  border-color: #000;
}

.promo-input.error .input-wrapper {
  border-color: #e11900;
}

.promo-input.success .input-wrapper {
  border-color: #276ef1;
  background: #f0f6ff;
}

.input-wrapper svg {
  color: #6b6b6b;
  flex-shrink: 0;
}

.input-wrapper input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
  outline: none;
}

.input-wrapper input::placeholder {
  text-transform: none;
  letter-spacing: normal;
  font-weight: 400;
}

.apply-btn {
  padding: 6px 14px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.apply-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.clear-btn {
  padding: 4px;
  background: transparent;
  border: none;
  color: #6b6b6b;
  cursor: pointer;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.message {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 8px 0 0;
  font-size: 13px;
}

.error-msg {
  color: #e11900;
}

.success-msg {
  color: #276ef1;
}

.discount {
  margin-left: auto;
  font-weight: 600;
}
</style>
