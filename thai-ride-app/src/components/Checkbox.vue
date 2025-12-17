<script setup lang="ts">
/**
 * Feature: F81 - Checkbox
 * Styled checkbox with label
 */
interface Props {
  modelValue: boolean
  label?: string
  description?: string
  disabled?: boolean
  indeterminate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  description: '',
  disabled: false,
  indeterminate: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const toggle = () => {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <div class="checkbox-container" :class="{ disabled }" @click="toggle">
    <button
      type="button"
      class="checkbox"
      :class="{ checked: modelValue, indeterminate }"
      :disabled="disabled"
      role="checkbox"
      :aria-checked="indeterminate ? 'mixed' : modelValue"
    >
      <!-- Checkmark -->
      <svg v-if="modelValue && !indeterminate" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <!-- Indeterminate -->
      <svg v-else-if="indeterminate" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
    
    <div v-if="label || description" class="checkbox-content">
      <span v-if="label" class="checkbox-label">{{ label }}</span>
      <span v-if="description" class="checkbox-description">{{ description }}</span>
    </div>
  </div>
</template>

<style scoped>
.checkbox-container {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
}

.checkbox-container.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkbox {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 2px solid #e5e5e5;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  color: #fff;
  padding: 0;
}

.checkbox:hover:not(:disabled) {
  border-color: #000;
}

.checkbox.checked,
.checkbox.indeterminate {
  background: #000;
  border-color: #000;
}

.checkbox:disabled {
  cursor: not-allowed;
}

.checkbox-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 1px;
}

.checkbox-label {
  font-size: 15px;
  font-weight: 500;
  color: #000;
}

.checkbox-description {
  font-size: 13px;
  color: #6b6b6b;
}
</style>
