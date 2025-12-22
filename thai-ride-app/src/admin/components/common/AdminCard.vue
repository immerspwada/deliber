<!--
  Admin Card Component
  ===================
  Reusable card wrapper
-->

<template>
  <div :class="['admin-card', `admin-card--${variant}`]">
    <div v-if="$slots.header || title" class="admin-card__header">
      <slot name="header">
        <h3 class="admin-card__title">{{ title }}</h3>
      </slot>
    </div>
    <div class="admin-card__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="admin-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  variant?: 'default' | 'bordered' | 'elevated'
}

withDefaults(defineProps<Props>(), {
  variant: 'default'
})
</script>

<style scoped>
.admin-card {
  background: white;
  border-radius: 8px;
}

.admin-card--default {
  border: 1px solid #E5E7EB;
}

.admin-card--bordered {
  border: 2px solid #E5E7EB;
}

.admin-card--elevated {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.admin-card__header {
  padding: 16px 20px;
  border-bottom: 1px solid #E5E7EB;
}

.admin-card__title {
  font-size: 16px;
  font-weight: 600;
  color: #1F2937;
  margin: 0;
}

.admin-card__body {
  padding: 20px;
}

.admin-card__footer {
  padding: 16px 20px;
  border-top: 1px solid #E5E7EB;
  background: #F9FAFB;
}
</style>
