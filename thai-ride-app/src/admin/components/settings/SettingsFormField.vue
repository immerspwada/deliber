<template>
  <div 
    class="form-field"
    :class="{ 'has-error': error }"
  >
    <div class="field-header">
      <label 
        v-if="label"
        :for="id" 
        :class="typography.label"
        class="field-label"
      >
        {{ label }}
        <span v-if="required" class="required" aria-label="จำเป็น">*</span>
      </label>
      
      <button
        v-if="helpText"
        type="button"
        class="help-button"
        :aria-label="showHelp ? 'ซ่อนคำอธิบาย' : 'แสดงคำอธิบาย'"
        :aria-expanded="showHelp"
        @click="showHelp = !showHelp"
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
    
    <div class="field-input">
      <slot />
    </div>
    
    <transition name="fade">
      <p 
        v-if="showHelp && helpText" 
        :class="typography.caption"
        class="help-text"
        role="status"
      >
        {{ helpText }}
      </p>
    </transition>
    
    <p 
      v-if="error" 
      :class="typography.caption"
      class="error-text"
      role="alert"
      aria-live="polite"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { typography } from '@/admin/styles/design-tokens'

interface Props {
  id?: string
  label?: string
  helpText?: string
  error?: string
  required?: boolean
}

defineProps<Props>()

const showHelp = ref(false)
</script>

<style scoped>
.form-field {
  margin-bottom: 1rem;
}

.field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.required {
  color: #ef4444;
}

.help-button {
  color: #9ca3af;
  transition: color 0.2s;
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
}

.help-button:hover {
  color: #4b5563;
}

.help-button:focus {
  outline: none;
  ring: 2px;
  ring-color: #3b82f6;
  ring-offset: 2px;
}

.field-input {
  width: 100%;
}

.help-text {
  margin-top: 0.5rem;
  color: #4b5563;
  background-color: #f9fafb;
  padding: 0.75rem;
  border-radius: 0.5rem;
}

.error-text {
  margin-top: 0.5rem;
  color: #dc2626;
}

.has-error .field-input :deep(input),
.has-error .field-input :deep(textarea),
.has-error .field-input :deep(select) {
  border-color: #ef4444;
}

.has-error .field-input :deep(input):focus,
.has-error .field-input :deep(textarea):focus,
.has-error .field-input :deep(select):focus {
  ring-color: #ef4444;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
