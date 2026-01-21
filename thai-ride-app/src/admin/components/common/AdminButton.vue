<!--
  Admin Button Component
  =====================
  Reusable button with variants
-->

<template>
  <button
    :class="[
      'admin-btn',
      `admin-btn--${variant}`,
      `admin-btn--${size}`,
      { 'admin-btn--loading': loading, 'admin-btn--block': block }
    ]"
    :disabled="disabled || loading"
    :type="type"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="admin-btn__spinner"></span>
    <slot />
  </button>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  loading?: boolean
  disabled?: boolean
  block?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  loading: false,
  disabled: false,
  block: false
})

defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<style scoped>
.admin-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}

.admin-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Sizes */
.admin-btn--sm {
  padding: 6px 12px;
  font-size: 13px;
}

.admin-btn--md {
  padding: 10px 16px;
  font-size: 14px;
}

.admin-btn--lg {
  padding: 12px 20px;
  font-size: 16px;
}

/* Variants */
.admin-btn--primary {
  background: #00A86B;
  color: white;
}

.admin-btn--primary:hover:not(:disabled) {
  background: #008F5B;
}

.admin-btn--secondary {
  background: #F3F4F6;
  color: #1F2937;
}

.admin-btn--secondary:hover:not(:disabled) {
  background: #E5E7EB;
}

.admin-btn--danger {
  background: #EF4444;
  color: white;
}

.admin-btn--danger:hover:not(:disabled) {
  background: #DC2626;
}

.admin-btn--ghost {
  background: transparent;
  color: #6B7280;
}

.admin-btn--ghost:hover:not(:disabled) {
  background: #F3F4F6;
  color: #1F2937;
}

/* Block */
.admin-btn--block {
  width: 100%;
}

/* Loading */
.admin-btn--loading {
  pointer-events: none;
}

.admin-btn__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
