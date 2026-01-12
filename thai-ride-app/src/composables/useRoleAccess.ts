/**
 * useRoleAccess - Multi-role access management
 * Handles role-based permissions and feature access for all 3 roles
 */
import { computed, ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../lib/supabase'
import { ROLE_CONFIGS, canAccessProviderRoutes, canAccessAdminRoutes, hasPermission } from '../types/role'
import type { UserRole, RolePermissions, ProviderStatus } from '../types/role'

export function useRoleAccess() {
  const authStore = useAuthStore()
  const hasProviderAccount = ref(false)
  const providerStatus = ref<ProviderStatus | null>(null)
  const providerId = ref<string | null>(null)
  const checkingProvider = ref(false)
  const providerAccessResult = ref<any>(null)

  const currentRole = computed<UserRole>(() => {
    return (authStore.user?.role as UserRole) || 'customer'
  })

  // Role checks - supporting all roles
  const isCustomer = computed(() => currentRole.value === 'customer')
  const isProvider = computed(() => currentRole.value === 'provider')
  const isAdmin = computed(() => currentRole.value === 'admin')
  const isSuperAdmin = computed(() => currentRole.value === 'super_admin')
  const isManager = computed(() => currentRole.value === 'manager')
  const isWorker = computed(() => currentRole.value === 'worker')
  const isClient = computed(() => currentRole.value === 'client')
  const isViewer = computed(() => currentRole.value === 'viewer')

  // Legacy support
  const isDriver = computed(() => isProvider.value)
  const isRider = computed(() => isProvider.value)

  const permissions = computed<RolePermissions>(() => {
    const role = currentRole.value
    const config = ROLE_CONFIGS[role]
    return config?.permissions || ROLE_CONFIGS.customer.permissions
  })

  /**
   * Check if user can access provider routes using RPC function
   */
  const checkProviderRouteAccess = async (): Promise<boolean> => {
    if (!authStore.user?.id) return false
    
    checkingProvider.value = true
    try {
      const { data, error } = await supabase.rpc('can_access_provider_routes' as any, {
        p_user_id: authStore.user.id
      })
      
      if (error) {
        console.error('[useRoleAccess] Error checking provider route access:', error)
        return false
      }
      
      providerAccessResult.value = data
      
      // Handle different return types (boolean or object)
      const hasAccess = typeof data === 'boolean' 
        ? data 
        : data?.canAccess || data?.can_access
      
      if (hasAccess) {
        hasProviderAccount.value = true
        providerStatus.value = data?.status || 'approved'
        providerId.value = data?.providerId || data?.provider_id
        return true
      }
      
      return false
    } catch (err) {
      console.error('[useRoleAccess] Exception checking provider route access:', err)
      return false
    } finally {
      checkingProvider.value = false
    }
  }

  /**
   * Check if user has provider account in providers_v2 table
   */
  const checkProviderAccount = async (): Promise<boolean> => {
    if (!authStore.user?.id) return false
    
    checkingProvider.value = true
    try {
      const { data, error } = await supabase
        .from('providers_v2')
        .select('id, status, user_id')
        .eq('user_id', authStore.user.id)
        .maybeSingle()
      
      if (error) {
        console.error('[useRoleAccess] Error checking provider:', error)
        return false
      }
      
      if (data) {
        hasProviderAccount.value = true
        providerStatus.value = data.status as ProviderStatus
        providerId.value = data.id
        return data.status === 'approved' || data.status === 'active'
      }
      
      hasProviderAccount.value = false
      providerStatus.value = null
      providerId.value = null
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
  const checkPermission = (permission: keyof RolePermissions): boolean => {
    return hasPermission(currentRole.value, permission)
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
    return config?.displayNameTh || config?.displayName || ''
  }

  /**
   * Get role color for UI
   */
  const getRoleColor = (): string => {
    const config = ROLE_CONFIGS[currentRole.value]
    return config?.color || '#00A86B'
  }

  /**
   * Check if user can access provider routes
   */
  const canAccessProvider = computed(() => {
    // Check role-based access first
    if (canAccessProviderRoutes(currentRole.value)) {
      return true
    }
    
    // Check if they have approved/active provider account
    return hasProviderAccount.value && 
           (providerStatus.value === 'approved' || providerStatus.value === 'active')
  })

  /**
   * Check if user can access admin routes
   */
  const canAccessAdmin = computed(() => {
    return canAccessAdminRoutes(currentRole.value)
  })

  /**
   * Check if user can switch to provider mode
   */
  const canSwitchToProviderMode = computed(() => {
    return canAccessProvider.value
  })

  /**
   * Get provider access details
   */
  const getProviderAccessDetails = () => {
    return {
      canAccess: canAccessProvider.value,
      hasAccount: hasProviderAccount.value,
      status: providerStatus.value,
      providerId: providerId.value,
      reason: providerAccessResult.value?.reason,
      message: providerAccessResult.value?.message
    }
  }

  // Check provider account on mount
  onMounted(() => {
    if (authStore.isAuthenticated) {
      checkProviderRouteAccess()
      checkProviderAccount()
    }
  })

  return {
    // Role states
    currentRole,
    isCustomer,
    isProvider,
    isAdmin,
    isSuperAdmin,
    isManager,
    isWorker,
    isClient,
    isViewer,
    
    // Legacy support
    isDriver,
    isRider,
    
    // Permissions
    permissions,
    checkPermission,
    
    // UI helpers
    getUserDisplayName,
    getRoleBadge,
    getRoleColor,
    
    // Provider access
    canAccessProvider,
    canAccessAdmin,
    canSwitchToProviderMode,
    hasProviderAccount,
    providerStatus,
    providerId,
    checkingProvider,
    
    // Methods
    checkProviderAccount,
    checkProviderRouteAccess,
    getProviderAccessDetails
  }
}
