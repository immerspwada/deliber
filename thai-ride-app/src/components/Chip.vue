<script setup lang="ts">
/**
 * Feature: F94 - Chip/Tag Component
 * Selectable chip or tag
 */
interface Props {
  label: string
  selected?: boolean
  removable?: boolean
  disabled?: boolean
  size?: 'sm' | 'md'
  variant?: 'default' | 'outline'
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  removable: false,
  disabled: false,
  size: 'md',
  variant: 'default'
})

const emit = defineEmits<{
  click: []
  remove: []
}>()

const handleClick = () => {
  if (!props.disabled) {
    emit('click')
  }
}

const handleRemove = (e: Event) => {
  e.stopPropagation()
  if (!props.disabled) {
    emit('remove')
  }
}
</script>

<template>
  <button
    type="button"
    class="chip"
    :class="[`size-${size}`, `variant-${variant}`, { selected, disabled }]"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot name="icon" />
    <span class="chip-label">{{ label }}</span>
    <button
      v-if="removable"
      type="button"
      class="remove-btn"
      :disabled="disabled"
      @click="handleRemove"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  </button>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.chip:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Size variants */
.size-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.size-md {
  padding: 8px 16px;
  font-size: 14px;
}

/* Variant styles */
.variant-default {
  background: #f6f6f6;
  border: none;
  color: #6b6b6b;
}

.variant-default:hover:not(:disabled) {
  background: #e5e5e5;
}

.variant-default.selected {
  background: #000;
  color: #fff;
}

.variant-outline {
  background: transparent;
  border: 1px solid #e5e5e5;
  color: #6b6b6b;
}

.variant-outline:hover:not(:disabled) {
  border-color: #000;
  color: #000;
}

.variant-outline.selected {
  border-color: #000;
  background: #000;
  color: #fff;
}

.chip-label {
  font-weight: 500;
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  margin-left: 2px;
  margin-right: -4px;
  transition: background 0.2s;
}

.selected .remove-btn {
  background: rgba(255, 255, 255, 0.2);
}

.remove-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.2);
}

.selected .remove-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}
</style>
