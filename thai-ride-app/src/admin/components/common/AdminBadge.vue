<!--
  Admin Badge Component
  ====================
  Status badges
-->

<template>
  <span :class="['admin-badge', `admin-badge--${variant}`]">
    <slot />
  </span>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral'
}

withDefaults(defineProps<Props>(), {
  variant: 'neutral'
})
</script>

<style scoped>
.admin-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.admin-badge--success {
  background: #D1FAE5;
  color: #065F46;
}

.admin-badge--warning {
  background: #FEF3C7;
  color: #92400E;
}

.admin-badge--error {
  background: #FEE2E2;
  color: #991B1B;
}

.admin-badge--info {
  background: #DBEAFE;
  color: #1E40AF;
}

.admin-badge--neutral {
  background: #F3F4F6;
  color: #374151;
}
</style>
