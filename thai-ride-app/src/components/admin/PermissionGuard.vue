<!--
  PermissionGuard - RBAC Wrapper Component
  
  Wraps content that requires specific permissions.
  Prevents privilege escalation and unauthorized access.
  
  Usage:
  <PermissionGuard permission="users.delete">
    <button @click="deleteUser">Delete User</button>
  </PermissionGuard>
  
  <PermissionGuard :permissions="['orders.edit', 'orders.cancel']" mode="any">
    <OrderActions />
  </PermissionGuard>
-->

<template>
  <template v-if="hasAccess">
    <slot />
  </template>
  <template v-else-if="$slots.fallback">
    <slot name="fallback" />
  </template>
  <template v-else-if="showFallback">
    <div class="permission-denied">
      <svg class="denied-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M4.93 4.93l14.14 14.14"/>
      </svg>
      <span class="denied-text">{{ fallbackMessage }}</span>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAdminRBAC, type AdminPermission } from '../../composables/useAdminRBAC'

interface Props {
  // Single permission check
  permission?: AdminPermission
  // Multiple permissions check
  permissions?: AdminPermission[]
  // Mode for multiple permissions: 'all' (AND) or 'any' (OR)
  mode?: 'all' | 'any'
  // Show fallback UI when access denied
  showFallback?: boolean
  // Custom fallback message
  fallbackMessage?: string
  // Redirect to 403 page if denied
  redirectOnDeny?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'all',
  showFallback: false,
  fallbackMessage: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้',
  redirectOnDeny: false
})

const { hasPermission, hasAllPermissions, hasAnyPermission, isAuthenticated } = useAdminRBAC()

const hasAccess = computed(() => {
  // Must be authenticated
  if (!isAuthenticated.value) return false
  
  // Single permission check
  if (props.permission) {
    return hasPermission(props.permission)
  }
  
  // Multiple permissions check
  if (props.permissions && props.permissions.length > 0) {
    return props.mode === 'any' 
      ? hasAnyPermission(props.permissions)
      : hasAllPermissions(props.permissions)
  }
  
  // No permissions specified = allow access
  return true
})
</script>

<style scoped>
.permission-denied {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #FFF5F5;
  border: 1px solid #FED7D7;
  border-radius: 8px;
  color: #C53030;
}

.denied-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.denied-text {
  font-size: 14px;
}
</style>
