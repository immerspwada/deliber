/**
 * useAdminRBAC - Role-Based Access Control for Admin
 * 
 * Feature: F23 - Admin Dashboard Security
 * 
 * Security Features:
 * - Permission-based access control
 * - Action audit logging
 * - Session management
 * - Privilege escalation prevention
 * 
 * @syncs-with
 * - useAdmin.ts (admin operations)
 * - AdminLayout.vue (UI guards)
 * - Router guards (route protection)
 */

import { ref, computed, readonly } from 'vue'
import { useRouter } from 'vue-router'

// =====================================================
// TYPES & INTERFACES
// =====================================================

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'support' | 'viewer'

export type AdminPermission = 
  // User Management
  | 'users.view' | 'users.edit' | 'users.delete' | 'users.verify'
  // Provider Management
  | 'providers.view' | 'providers.edit' | 'providers.approve' | 'providers.suspend'
  // Order Management
  | 'orders.view' | 'orders.edit' | 'orders.cancel' | 'orders.refund'
  // Payment Management
  | 'payments.view' | 'payments.process' | 'payments.refund'
  // Support Management
  | 'support.view' | 'support.respond' | 'support.escalate' | 'support.close'
  // Promo Management
  | 'promos.view' | 'promos.create' | 'promos.edit' | 'promos.delete'
  // Settings Management
  | 'settings.view' | 'settings.edit' | 'settings.maintenance'
  // System Management
  | 'system.audit_log' | 'system.feature_flags' | 'system.analytics'
  // Destructive Actions
  | 'destructive.delete_user' | 'destructive.reset_system' | 'destructive.bulk_operations'

export interface AdminUser {
  id: string
  email: string
  name: string
  role: AdminRole
  permissions: AdminPermission[]
  lastLogin: string
  sessionExpiry: number
  mfaEnabled?: boolean
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  adminId: string
  adminEmail: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  status: 'success' | 'failed' | 'pending'
  rollbackData?: any
}

export interface ConfirmationRequest {
  id: string
  action: string
  title: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  requiresDoubleConfirm: boolean
  countdown?: number
  onConfirm: () => Promise<void>
  onCancel?: () => void
}

// =====================================================
// ROLE PERMISSION MATRIX
// =====================================================

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: [
    // All permissions
    'users.view', 'users.edit', 'users.delete', 'users.verify',
    'providers.view', 'providers.edit', 'providers.approve', 'providers.suspend',
    'orders.view', 'orders.edit', 'orders.cancel', 'orders.refund',
    'payments.view', 'payments.process', 'payments.refund',
    'support.view', 'support.respond', 'support.escalate', 'support.close',
    'promos.view', 'promos.create', 'promos.edit', 'promos.delete',
    'settings.view', 'settings.edit', 'settings.maintenance',
    'system.audit_log', 'system.feature_flags', 'system.analytics',
    'destructive.delete_user', 'destructive.reset_system', 'destructive.bulk_operations'
  ],
  admin: [
    'users.view', 'users.edit', 'users.verify',
    'providers.view', 'providers.edit', 'providers.approve', 'providers.suspend',
    'orders.view', 'orders.edit', 'orders.cancel', 'orders.refund',
    'payments.view', 'payments.process', 'payments.refund',
    'support.view', 'support.respond', 'support.escalate', 'support.close',
    'promos.view', 'promos.create', 'promos.edit', 'promos.delete',
    'settings.view', 'settings.edit',
    'system.audit_log', 'system.analytics'
  ],
  moderator: [
    'users.view', 'users.edit',
    'providers.view', 'providers.edit',
    'orders.view', 'orders.edit', 'orders.cancel',
    'support.view', 'support.respond', 'support.close',
    'promos.view'
  ],
  support: [
    'users.view',
    'providers.view',
    'orders.view',
    'support.view', 'support.respond', 'support.close'
  ],
  viewer: [
    'users.view',
    'providers.view',
    'orders.view',
    'payments.view',
    'support.view',
    'promos.view',
    'settings.view'
  ]
}

// Actions requiring double confirmation
const CRITICAL_ACTIONS: AdminPermission[] = [
  'destructive.delete_user',
  'destructive.reset_system',
  'destructive.bulk_operations',
  'settings.maintenance',
  'users.delete',
  'providers.suspend'
]

// =====================================================
// COMPOSABLE
// =====================================================

// Singleton state
const currentAdmin = ref<AdminUser | null>(null)
const auditLog = ref<AuditLogEntry[]>([])
const pendingConfirmation = ref<ConfirmationRequest | null>(null)
const isSessionValid = ref(true)
const sessionCheckInterval = ref<number | null>(null)

// Debounce tracking for rapid toggle protection
const actionTimestamps = ref<Map<string, number[]>>(new Map())
const RAPID_ACTION_THRESHOLD = 5 // Max actions
const RAPID_ACTION_WINDOW = 5000 // 5 seconds

export function useAdminRBAC() {
  const router = useRouter()

  // =====================================================
  // COMPUTED
  // =====================================================

  const isAuthenticated = computed(() => !!currentAdmin.value && isSessionValid.value)
  
  const adminRole = computed(() => currentAdmin.value?.role || null)
  
  const adminPermissions = computed(() => {
    if (!currentAdmin.value) return []
    return ROLE_PERMISSIONS[currentAdmin.value.role] || []
  })

  const recentAuditLogs = computed(() => auditLog.value.slice(0, 50))

  // =====================================================
  // PERMISSION CHECKS
  // =====================================================

  /**
   * Check if current admin has a specific permission
   */
  const hasPermission = (permission: AdminPermission): boolean => {
    if (!currentAdmin.value) return false
    return adminPermissions.value.includes(permission)
  }

  /**
   * Check if current admin can perform an action
   * Wrapper for template usage
   */
  const can = (action: AdminPermission): boolean => hasPermission(action)

  /**
   * Check multiple permissions (AND logic)
   */
  const hasAllPermissions = (permissions: AdminPermission[]): boolean => {
    return permissions.every(p => hasPermission(p))
  }

  /**
   * Check multiple permissions (OR logic)
   */
  const hasAnyPermission = (permissions: AdminPermission[]): boolean => {
    return permissions.some(p => hasPermission(p))
  }

  /**
   * Check if action requires double confirmation
   */
  const requiresDoubleConfirm = (action: AdminPermission): boolean => {
    return CRITICAL_ACTIONS.includes(action)
  }

  // =====================================================
  // RAPID TOGGLE PROTECTION
  // =====================================================

  /**
   * Check if action is being performed too rapidly
   * Prevents database sync issues from rapid clicking
   */
  const isRapidAction = (actionKey: string): boolean => {
    const now = Date.now()
    const timestamps = actionTimestamps.value.get(actionKey) || []
    
    // Filter timestamps within the window
    const recentTimestamps = timestamps.filter(t => now - t < RAPID_ACTION_WINDOW)
    
    // Update timestamps
    recentTimestamps.push(now)
    actionTimestamps.value.set(actionKey, recentTimestamps)
    
    return recentTimestamps.length > RAPID_ACTION_THRESHOLD
  }

  /**
   * Debounced action executor
   * Prevents rapid toggle issues
   */
  const executeWithDebounce = async <T>(
    actionKey: string,
    action: () => Promise<T>,
    debounceMs: number = 300
  ): Promise<T | null> => {
    if (isRapidAction(actionKey)) {
      console.warn(`[RBAC] Rapid action detected for: ${actionKey}`)
      throw new Error('กรุณารอสักครู่ก่อนดำเนินการอีกครั้ง')
    }

    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const result = await action()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }, debounceMs)
    })
  }

  // =====================================================
  // AUDIT LOGGING
  // =====================================================

  /**
   * Log admin action to audit trail
   */
  const logAction = (
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, any>,
    status: 'success' | 'failed' | 'pending' = 'success',
    rollbackData?: any
  ): string => {
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      adminId: currentAdmin.value?.id || 'unknown',
      adminEmail: currentAdmin.value?.email || 'unknown',
      action,
      resource,
      resourceId,
      details,
      ipAddress: 'client', // Would be set server-side
      userAgent: navigator.userAgent,
      status,
      rollbackData
    }

    // Add to local log
    auditLog.value.unshift(entry)
    
    // Keep only last 1000 entries in memory
    if (auditLog.value.length > 1000) {
      auditLog.value = auditLog.value.slice(0, 1000)
    }

    // Persist to localStorage for demo
    try {
      const logs = JSON.parse(localStorage.getItem('admin_audit_log') || '[]')
      logs.unshift(entry)
      if (logs.length > 500) logs.length = 500
      localStorage.setItem('admin_audit_log', JSON.stringify(logs))
    } catch (e) {
      console.error('[RBAC] Failed to persist audit log:', e)
    }

    return entry.id
  }

  /**
   * Update audit log entry status
   */
  const updateAuditStatus = (
    logId: string, 
    status: 'success' | 'failed',
    details?: Record<string, any>
  ) => {
    const entry = auditLog.value.find(e => e.id === logId)
    if (entry) {
      entry.status = status
      if (details) {
        entry.details = { ...entry.details, ...details }
      }
    }
  }

  // =====================================================
  // DOUBLE CONFIRMATION SYSTEM
  // =====================================================

  /**
   * Request confirmation for critical action
   */
  const requestConfirmation = (request: Omit<ConfirmationRequest, 'id'>): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = `confirm_${Date.now()}`
      
      pendingConfirmation.value = {
        ...request,
        id,
        onConfirm: async () => {
          try {
            await request.onConfirm()
            resolve(true)
          } catch (error) {
            resolve(false)
            throw error
          } finally {
            pendingConfirmation.value = null
          }
        },
        onCancel: () => {
          request.onCancel?.()
          pendingConfirmation.value = null
          resolve(false)
        }
      }
    })
  }

  /**
   * Cancel pending confirmation
   */
  const cancelConfirmation = () => {
    if (pendingConfirmation.value?.onCancel) {
      pendingConfirmation.value.onCancel()
    }
    pendingConfirmation.value = null
  }

  // =====================================================
  // SESSION MANAGEMENT
  // =====================================================

  /**
   * Initialize admin session
   */
  const initSession = (admin: AdminUser) => {
    currentAdmin.value = admin
    isSessionValid.value = true
    
    // Start session check interval
    if (sessionCheckInterval.value) {
      clearInterval(sessionCheckInterval.value)
    }
    
    sessionCheckInterval.value = window.setInterval(() => {
      checkSessionValidity()
    }, 60000) // Check every minute

    logAction('session_start', 'auth', admin.id, { email: admin.email })
  }

  /**
   * Check if session is still valid
   */
  const checkSessionValidity = () => {
    const loginTime = localStorage.getItem('admin_login_time')
    if (!loginTime) {
      invalidateSession()
      return false
    }

    const elapsed = Date.now() - parseInt(loginTime)
    const maxSession = 8 * 60 * 60 * 1000 // 8 hours

    if (elapsed > maxSession) {
      invalidateSession()
      return false
    }

    return true
  }

  /**
   * Invalidate current session
   */
  const invalidateSession = () => {
    if (currentAdmin.value) {
      logAction('session_end', 'auth', currentAdmin.value.id, { reason: 'expired' })
    }
    
    currentAdmin.value = null
    isSessionValid.value = false
    
    if (sessionCheckInterval.value) {
      clearInterval(sessionCheckInterval.value)
      sessionCheckInterval.value = null
    }

    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    localStorage.removeItem('admin_login_time')
    
    router.push('/admin/login')
  }

  /**
   * Logout admin
   */
  const logout = () => {
    if (currentAdmin.value) {
      logAction('logout', 'auth', currentAdmin.value.id)
    }
    invalidateSession()
  }

  // =====================================================
  // PRIVILEGE ESCALATION PREVENTION
  // =====================================================

  /**
   * Validate that admin cannot escalate their own privileges
   */
  const canModifyUser = (targetUserId: string, targetRole?: AdminRole): boolean => {
    if (!currentAdmin.value) return false
    
    // Cannot modify self
    if (targetUserId === currentAdmin.value.id) return false
    
    // Role hierarchy check
    const roleHierarchy: AdminRole[] = ['viewer', 'support', 'moderator', 'admin', 'super_admin']
    const currentRoleIndex = roleHierarchy.indexOf(currentAdmin.value.role)
    
    if (targetRole) {
      const targetRoleIndex = roleHierarchy.indexOf(targetRole)
      // Cannot assign role equal or higher than own
      if (targetRoleIndex >= currentRoleIndex) return false
    }
    
    return true
  }

  // =====================================================
  // OPTIMISTIC UPDATE WITH ROLLBACK
  // =====================================================

  /**
   * Execute action with optimistic update and rollback capability
   */
  const executeWithRollback = async <T>(
    action: string,
    resource: string,
    resourceId: string,
    optimisticUpdate: () => void,
    serverAction: () => Promise<T>,
    rollback: () => void
  ): Promise<T> => {
    // Log pending action
    const logId = logAction(action, resource, resourceId, {}, 'pending')
    
    // Apply optimistic update
    optimisticUpdate()
    
    try {
      // Execute server action
      const result = await serverAction()
      
      // Update log to success
      updateAuditStatus(logId, 'success')
      
      return result
    } catch (error: any) {
      // Rollback on failure
      rollback()
      
      // Update log to failed
      updateAuditStatus(logId, 'failed', { error: error.message })
      
      throw error
    }
  }

  // =====================================================
  // INITIALIZATION
  // =====================================================

  /**
   * Initialize RBAC from stored session
   */
  const initialize = () => {
    try {
      const storedUser = localStorage.getItem('admin_user')
      const storedToken = localStorage.getItem('admin_token')
      
      if (storedUser && storedToken) {
        const user = JSON.parse(storedUser)
        
        // Determine role from stored data or default to admin for demo
        const role: AdminRole = user.role === 'super_admin' ? 'super_admin' : 
                                user.role === 'moderator' ? 'moderator' :
                                user.role === 'support' ? 'support' :
                                user.role === 'viewer' ? 'viewer' : 'admin'
        
        const adminUser: AdminUser = {
          id: user.id,
          email: user.email,
          name: user.name || 'Admin',
          role,
          permissions: ROLE_PERMISSIONS[role],
          lastLogin: new Date().toISOString(),
          sessionExpiry: Date.now() + (8 * 60 * 60 * 1000)
        }
        
        if (checkSessionValidity()) {
          initSession(adminUser)
        }
      }
      
      // Load audit log from storage
      const storedLogs = localStorage.getItem('admin_audit_log')
      if (storedLogs) {
        auditLog.value = JSON.parse(storedLogs)
      }
    } catch (e) {
      console.error('[RBAC] Failed to initialize:', e)
    }
  }

  // =====================================================
  // RETURN
  // =====================================================

  return {
    // State (readonly)
    currentAdmin: readonly(currentAdmin),
    isAuthenticated,
    adminRole,
    adminPermissions,
    recentAuditLogs,
    pendingConfirmation: readonly(pendingConfirmation),
    isSessionValid: readonly(isSessionValid),
    
    // Permission checks
    hasPermission,
    can,
    hasAllPermissions,
    hasAnyPermission,
    requiresDoubleConfirm,
    canModifyUser,
    
    // Rapid toggle protection
    isRapidAction,
    executeWithDebounce,
    
    // Audit logging
    logAction,
    updateAuditStatus,
    
    // Confirmation system
    requestConfirmation,
    cancelConfirmation,
    
    // Session management
    initSession,
    checkSessionValidity,
    invalidateSession,
    logout,
    
    // Optimistic updates
    executeWithRollback,
    
    // Initialization
    initialize,
    
    // Constants
    ROLE_PERMISSIONS,
    CRITICAL_ACTIONS
  }
}
