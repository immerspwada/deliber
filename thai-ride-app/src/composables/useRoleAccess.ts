/**
 * useRoleAccess - Multi-role access management
 * Handles role-based permissions and feature access
 */
import { computed, ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../lib/supabase'
import { ROLE_CONFIGS } from '../types/role'
import type { UserRole, RolePermissions } from '../types/role'

export function useRoleAccess() {
  const authStore = useAuthStore()
  const hasProviderAccount = ref(false)
  const providerStatus = ref<string | null>(null)
  const checkingProvider = ref(false)

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
   * Check if user has provider account in database
   */
  const checkProviderAccount = async (): Promise<boolean> => {
    if (!authStore.user?.id) return false
    
    checkingProvider.value = true
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('id, status')
        .eq('user_id', authStore.user.id)
        .maybeSingle()
      
      if (error) {
        console.error('[useRoleAccess] Error checking provider:', error)
        return false
      }
      
      if (data) {
        hasProviderAccount.value = true
        providerStatus.value = (data as any).status
        return (data as any).status === 'approved' || (data as any).status === 'active'
      }
      
      hasProviderAccount.value = false
      providerStatus.value = null
      return false
    } catch (err) {
      console.error('[useRoleAccess] Exception checking provider:', err)
      return false
    } finally {
      checkingProvider.value = false
    }
  }

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
   * Checks actual provider account in database
   */
  const canSwitchToProviderMode = computed(() => {
    // If user has provider role, they can access
    if (permissions.value.canAccessProviderFeatures) {
      return true
    }
    
    // Otherwise, check if they have approved/active provider account
    return hasProviderAccount.value && 
           (providerStatus.value === 'approved' || providerStatus.value === 'active')
  })

  // Check provider account on mount
  onMounted(() => {
    if (authStore.isAuthenticated) {
      checkProviderAccount()
    }
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
    canSwitchToProviderMode,
    hasProviderAccount,
    providerStatus,
    checkingProvider,
    checkProviderAccount
  }
}
