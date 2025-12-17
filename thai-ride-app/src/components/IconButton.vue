<script setup lang="ts">
/**
 * Feature: F91 - Icon Button
 * Circular icon-only button
 */
interface Props {
  variant?: 'default' | 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  ariaLabel: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  disabled: false,
  loading: false
})

const emit = defineEmits<{
  click: [e: MouseEvent]
}>()

const handleClick = (e: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', e)
  }
}
</script>

<template>
  <button
    type="button"
    class="icon-btn"
    :class="[`variant-${variant}`, `size-${size}`, { loading, disabled }]"
    :disabled="disabled || loading"
    :aria-label="ariaLabel"
    @click="handleClick"
  >
    <span v-if="loading" class="spinner" />
    <span v-else class="icon-content">
      <slot />
    </span>
  </button>
</template>

<style scoped>
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Size variants */
.size-sm {
  width: 32px;
  height: 32px;
}

.size-md {
  width: 44px;
  height: 44px;
}

.size-lg {
  width: 56px;
  height: 56px;
}

/* Color variants */
.variant-default {
  background: #f6f6f6;
  color: #000;
}

.variant-default:hover:not(:disabled) {
  background: #e5e5e5;
}

.variant-primary {
  background: #000;
  color: #fff;
}

.variant-primary:hover:not(:disabled) {
  background: #333;
}

.variant-ghost {
  background: transparent;
  color: #6b6b6b;
}

.variant-ghost:hover:not(:disabled) {
  background: #f6f6f6;
  color: #000;
}

.variant-danger {
  background: rgba(225, 25, 0, 0.1);
  color: #e11900;
}

.variant-danger:hover:not(:disabled) {
  background: rgba(225, 25, 0, 0.2);
}

.icon-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
