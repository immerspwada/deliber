<!--
  Admin Input Component
  ====================
  Form input field
-->

<template>
  <div class="admin-input">
    <label v-if="label" :for="id" class="admin-input__label">
      {{ label }}
      <span v-if="required" class="admin-input__required">*</span>
    </label>
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      class="admin-input__field"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p v-if="error" class="admin-input__error">{{ error }}</p>
    <p v-else-if="hint" class="admin-input__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  id?: string
  modelValue: string | number
  label?: string
  type?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  hint?: string
}

withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  required: false
})

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.admin-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.admin-input__label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.admin-input__required {
  color: #EF4444;
}

.admin-input__field {
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.15s;
}

.admin-input__field:focus {
  outline: none;
  border-color: #00A86B;
  box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1);
}

.admin-input__field:disabled {
  background: #F9FAFB;
  cursor: not-allowed;
}

.admin-input__error {
  font-size: 13px;
  color: #EF4444;
  margin: 0;
}

.admin-input__hint {
  font-size: 13px;
  color: #6B7280;
  margin: 0;
}
</style>
