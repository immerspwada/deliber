<script setup lang="ts">
/**
 * Feature: F90 - Button Component
 * Reusable button with variants
 */
interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  fullWidth: false,
  loading: false,
  disabled: false,
  type: 'button'
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
    :type="type"
    class="btn"
    :class="[`variant-${variant}`, `size-${size}`, { 'full-width': fullWidth, loading, disabled }]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="spinner" />
    <span class="btn-content" :class="{ invisible: loading }">
      <slot />
    </span>
  </button>
</template>

<style scoped>
.btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  white-space: nowrap;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Size variants */
.size-sm {
  padding: 8px 16px;
  font-size: 13px;
}

.size-md {
  padding: 12px 24px;
  font-size: 15px;
}

.size-lg {
  padding: 16px 32px;
  font-size: 16px;
}

/* Color variants */
.variant-primary {
  background: #00A86B;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.variant-primary:hover:not(:disabled) {
  background: #008F5B;
}

.variant-secondary {
  background: #f6f6f6;
  color: #000;
}

.variant-secondary:hover:not(:disabled) {
  background: #e5e5e5;
}

.variant-outline {
  background: transparent;
  color: #000;
  border: 1px solid #e5e5e5;
}

.variant-outline:hover:not(:disabled) {
  background: #f6f6f6;
  border-color: #000;
}

.variant-ghost {
  background: transparent;
  color: #000;
}

.variant-ghost:hover:not(:disabled) {
  background: #f6f6f6;
}

.variant-danger {
  background: #e11900;
  color: #fff;
}

.variant-danger:hover:not(:disabled) {
  background: #c41600;
}

.full-width {
  width: 100%;
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-content.invisible {
  visibility: hidden;
}

.spinner {
  position: absolute;
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
