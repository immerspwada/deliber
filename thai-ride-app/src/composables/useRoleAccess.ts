/**
 * useRoleAccess - Multi-role access management
 * Handles role-based permissions and feature access
 */
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { ROLE_CONFIGS } from '../types/role'
import type { UserRole, RolePermissions } from '../types/role'

export function useRoleAccess() {
  const authStore = useAuthStore()

  const currentRole = computed<UserRole>(() => {
    return (authStore.user?.role as UserRole) || 'customer'
  })

  const isCustomer = computed(() => currentRole.value === 'customer')
  const isDriver = computed(() => currentRole.value === 'driver')
  const isRider = computed(() => currentRole.value === 'rider')
  const isAdmin = computed(() => currentRole.value === 'admin')

  // Multi-role support: Drivers and riders can also use customer features
  const isProvider = computed(() => isDriver.value || isRider.value)

  const permissions = computed<RolePermissions>(() => {
    const role = currentRole.value
    const config = ROLE_CONFIGS[role]
    return config?.permissions || ROLE_CONFIGS.customer.permissions
  })

  /**
   * Check if user has specific permission
   */
  const hasPermission = (permission: keyof RolePermissions): boolean => {
    return permissions.value[permission]
  }

  /**
   * Get user display name with role badge
   */
  const getUserDisplayName = (): string => {
    const name = authStore.user?.name || 'ผู้ใช้'
    const roleBadge = getRoleBadge()
    return roleBadge ? `${name} (${roleBadge})` : name
  }

  /**
   * Get role badge text
   */
  const getRoleBadge = (): string => {
    const config = ROLE_CONFIGS[currentRole.value]
    return config?.displayName || ''
  }

  /**
   * Get role color for UI
   */
  const getRoleColor = (): string => {
    const config = ROLE_CONFIGS[currentRole.value]
    return config?.color || '#00A86B'
  }

  /**
   * Check if user can switch to provider mode
   */
  const canSwitchToProviderMode = computed(() => {
    return permissions.value.canAccessProviderFeatures
  })

  return {
    currentRole,
    isCustomer,
    isDriver,
    isRider,
    isAdmin,
    isProvider,
    permissions,
    hasPermission,
    getUserDisplayName,
    getRoleBadge,
    getRoleColor,
    canSwitchToProviderMode
  }
}
