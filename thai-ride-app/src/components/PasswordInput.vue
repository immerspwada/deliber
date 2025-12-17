<script setup lang="ts">
/**
 * Feature: F258 - Password Input
 * Password input with visibility toggle
 */
import { ref } from 'vue'

defineProps<{
  modelValue: string
  placeholder?: string
  label?: string
  error?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showPassword = ref(false)
</script>

<template>
  <div class="password-input">
    <label v-if="label" class="input-label">{{ label }}</label>
    <div class="input-wrapper" :class="{ error }">
      <input :type="showPassword ? 'text' : 'password'" :value="modelValue" :placeholder="placeholder"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
      <button type="button" class="toggle-btn" @click="showPassword = !showPassword">
        <svg v-if="showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
    </div>
    <span v-if="error" class="error-text">{{ error }}</span>
  </div>
</template>

<style scoped>
.password-input { display: flex; flex-direction: column; gap: 6px; }
.input-label { font-size: 13px; font-weight: 500; color: #000; }
.input-wrapper { display: flex; align-items: center; border: 1px solid #e5e5e5; border-radius: 10px; overflow: hidden; }
.input-wrapper.error { border-color: #ef4444; }
.input-wrapper:focus-within { border-color: #000; }
.input-wrapper input { flex: 1; padding: 14px 16px; border: none; font-size: 15px; outline: none; }
.toggle-btn { padding: 14px; background: none; border: none; color: #6b6b6b; cursor: pointer; }
.toggle-btn:hover { color: #000; }
.error-text { font-size: 12px; color: #ef4444; }
</style>
