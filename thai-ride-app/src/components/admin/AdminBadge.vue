<!--
  Admin Badge Component - MUNEEF Style
-->

<template>
  <span :class="badgeClasses" @click="clickable && $emit('click')">
    <component :is="icon" v-if="icon" class="badge-icon" />
    <span class="badge-text"><slot /></span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'pending' | 'active'
  size?: 'sm' | 'md' | 'lg'
  rounded?: boolean
  clickable?: boolean
  icon?: any
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md'
})

defineEmits<{ click: [] }>()

const badgeClasses = computed(() => [
  'admin-badge',
  `variant-${props.variant}`,
  `size-${props.size}`,
  { 'rounded': props.rounded, 'clickable': props.clickable }
])
</script>

<style scoped>
.admin-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.size-sm { padding: 2px 8px; font-size: 11px; border-radius: 6px; }
.size-md { padding: 4px 12px; font-size: 12px; border-radius: 8px; }
.size-lg { padding: 6px 16px; font-size: 14px; border-radius: 10px; }

.variant-default { background: #F5F5F5; color: #666666; }
.variant-primary { background: #E8F5EF; color: #00A86B; }
.variant-success { background: #E8F5EF; color: #00A86B; }
.variant-warning { background: #FFF3E0; color: #F57C00; }
.variant-error { background: #FFEBEE; color: #E53935; }
.variant-pending { background: #FFF3E0; color: #F57C00; }
.variant-active { background: #E8F5EF; color: #00A86B; }

.rounded { border-radius: 999px !important; }
.clickable { cursor: pointer; }
.clickable:hover { opacity: 0.8; }

.badge-icon { width: 12px; height: 12px; }
.badge-text { line-height: 1; }
</style>
