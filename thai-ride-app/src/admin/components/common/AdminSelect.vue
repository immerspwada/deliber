<!--
  Admin Select Component
  =====================
  Form select dropdown
-->

<template>
  <div class="admin-select">
    <label v-if="label" :for="id" class="admin-select__label">
      {{ label }}
      <span v-if="required" class="admin-select__required">*</span>
    </label>
    <select
      :id="id"
      :value="modelValue"
      :disabled="disabled"
      :required="required"
      class="admin-select__field"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <p v-if="error" class="admin-select__error">{{ error }}</p>
    <p v-else-if="hint" class="admin-select__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
interface Option {
  value: string | number
  label: string
}

interface Props {
  id?: string
  modelValue: string | number
  label?: string
  options: Option[]
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  hint?: string
}

withDefaults(defineProps<Props>(), {
  disabled: false,
  required: false
})

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.admin-select {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.admin-select__label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.admin-select__required {
  color: #EF4444;
}

.admin-select__field {
  padding: 10px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: all 0.15s;
}

.admin-select__field:focus {
  outline: none;
  border-color: #00A86B;
  box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1);
}

.admin-select__field:disabled {
  background: #F9FAFB;
  cursor: not-allowed;
}

.admin-select__error {
  font-size: 13px;
  color: #EF4444;
  margin: 0;
}

.admin-select__hint {
  font-size: 13px;
  color: #6B7280;
  margin: 0;
}
</style>
