<script setup lang="ts">
/**
 * Feature: F102 - TextArea
 * Multi-line text input
 */
import { computed } from 'vue'

interface Props {
  modelValue: string
  label?: string
  placeholder?: string
  rows?: number
  maxLength?: number
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  error?: string
  hint?: string
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
  showCount?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: '',
  rows: 4,
  maxLength: 0,
  disabled: false,
  readonly: false,
  required: false,
  error: '',
  hint: '',
  resize: 'vertical',
  showCount: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: []
  blur: []
}>()

const charCount = computed(() => props.modelValue.length)

const handleInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="textarea-field" :class="{ error: !!error, disabled }">
    <label v-if="label" class="textarea-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    
    <div class="textarea-wrapper">
      <textarea
        :value="modelValue"
        :placeholder="placeholder"
        :rows="rows"
        :maxlength="maxLength || undefined"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        class="textarea"
        :style="{ resize }"
        @input="handleInput"
        @focus="emit('focus')"
        @blur="emit('blur')"
      />
    </div>
    
    <div class="textarea-footer">
      <p v-if="error" class="textarea-error">{{ error }}</p>
      <p v-else-if="hint" class="textarea-hint">{{ hint }}</p>
      <span v-else />
      
      <span v-if="showCount || maxLength" class="char-count">
        {{ charCount }}{{ maxLength ? `/${maxLength}` : '' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.textarea-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.textarea-label {
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.required {
  color: #e11900;
}

.textarea-wrapper {
  position: relative;
}

.textarea {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
  color: #000;
  background: #fff;
  transition: border-color 0.2s;
  line-height: 1.5;
}

.textarea::placeholder {
  color: #999;
}

.textarea:focus {
  outline: none;
  border-color: #000;
}

.textarea:disabled {
  background: #f6f6f6;
  color: #999;
  cursor: not-allowed;
}

.error .textarea {
  border-color: #e11900;
}

.textarea-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.textarea-error {
  font-size: 13px;
  color: #e11900;
  margin: 0;
}

.textarea-hint {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0;
}

.char-count {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

.disabled {
  opacity: 0.6;
}
</style>
