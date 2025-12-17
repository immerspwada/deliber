<script setup lang="ts">
/**
 * Feature: F82 - Radio Group
 * Radio button group with options
 */
interface Option {
  value: string | number
  label: string
  description?: string
  disabled?: boolean
}

interface Props {
  modelValue: string | number
  options: Option[]
  name?: string
  disabled?: boolean
  direction?: 'vertical' | 'horizontal'
}

const props = withDefaults(defineProps<Props>(), {
  name: 'radio-group',
  disabled: false,
  direction: 'vertical'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const select = (option: Option) => {
  if (props.disabled || option.disabled) return
  emit('update:modelValue', option.value)
}
</script>

<template>
  <div class="radio-group" :class="direction" role="radiogroup">
    <div
      v-for="option in options"
      :key="option.value"
      class="radio-item"
      :class="{ selected: modelValue === option.value, disabled: disabled || option.disabled }"
      @click="select(option)"
    >
      <button
        type="button"
        class="radio"
        :class="{ checked: modelValue === option.value }"
        :disabled="disabled || option.disabled"
        role="radio"
        :aria-checked="modelValue === option.value"
      >
        <span class="radio-dot" />
      </button>
      
      <div class="radio-content">
        <span class="radio-label">{{ option.label }}</span>
        <span v-if="option.description" class="radio-description">{{ option.description }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.radio-group {
  display: flex;
  gap: 12px;
}

.radio-group.vertical {
  flex-direction: column;
}

.radio-group.horizontal {
  flex-direction: row;
  flex-wrap: wrap;
}

.radio-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  padding: 12px;
  border-radius: 12px;
  transition: background 0.2s;
}

.radio-item:hover:not(.disabled) {
  background: #f6f6f6;
}

.radio-item.selected {
  background: #f6f6f6;
}

.radio-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.radio {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 2px solid #e5e5e5;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  padding: 0;
}

.radio:hover:not(:disabled) {
  border-color: #000;
}

.radio.checked {
  border-color: #000;
}

.radio:disabled {
  cursor: not-allowed;
}

.radio-dot {
  width: 10px;
  height: 10px;
  background: #000;
  border-radius: 50%;
  transform: scale(0);
  transition: transform 0.2s;
}

.radio.checked .radio-dot {
  transform: scale(1);
}

.radio-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 1px;
}

.radio-label {
  font-size: 15px;
  font-weight: 500;
  color: #000;
}

.radio-description {
  font-size: 13px;
  color: #6b6b6b;
}
</style>
