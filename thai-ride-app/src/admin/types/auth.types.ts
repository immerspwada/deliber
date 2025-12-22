/**
 * Admin Authentication Types
 */

export type AdminRole = 'super_admin' | 'admin' | 'manager' | 'support' | 'viewer'

export interface AdminUser {
  id: string
  email: string
  name: string
  avatar?: string
  role: AdminRole
  permissions: Permission[]
  created_at: string
  last_login?: string
}

export interface AdminSession {
  token: string
  user: AdminUser
  loginTime: number
  expiresAt: number
  isDemoMode: boolean
}

export interface Permission {
  module: string
  actions: ('view' | 'create' | 'edit' | 'delete')[]
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResult {
  success: boolean
  user?: AdminUser
  error?: string
}

export interface AuthState {
  user: AdminUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  session: AdminSession | null
}

// Role hierarchy (higher number = more permissions)
export const ROLE_LEVELS = {
  super_admin: 100,
  admin: 80,
  manager: 60,
  support: 40,
  viewer: 20
} as const

// Default permissions by role
export const DEFAULT_PERMISSIONS = {
  super_admin: [
    { module: '*', actions: ['view', 'create', 'edit', 'delete'] as const }
  ],
  admin: [
    { module: 'dashboard', actions: ['view'] as const },
    { module: 'users', actions: ['view', 'create', 'edit', 'delete'] as const },
    { module: 'orders', actions: ['view', 'create', 'edit', 'delete'] as const },
    { module: 'finance', actions: ['view', 'create', 'edit'] as const },
    { module: 'marketing', actions: ['view', 'create', 'edit', 'delete'] as const },
    { module: 'support', actions: ['view', 'create', 'edit', 'delete'] as const },
    { module: 'analytics', actions: ['view'] as const },
    { module: 'settings', actions: ['view', 'edit'] as const }
  ],
  manager: [
    { module: 'dashboard', actions: ['view'] as const },
    { module: 'users', actions: ['view', 'edit'] as const },
    { module: 'orders', actions: ['view', 'edit'] as const },
    { module: 'finance', actions: ['view'] as const },
    { module: 'marketing', actions: ['view', 'edit'] as const },
    { module: 'support', actions: ['view', 'edit'] as const },
    { module: 'analytics', actions: ['view'] as const }
  ],
  support: [
    { module: 'dashboard', actions: ['view'] as const },
    { module: 'users', actions: ['view'] as const },
    { module: 'orders', actions: ['view', 'edit'] as const },
    { module: 'support', actions: ['view', 'create', 'edit'] as const },
    { module: 'analytics', actions: ['view'] as const }
  ],
  viewer: [
    { module: 'dashboard', actions: ['view'] as const },
    { module: 'users', actions: ['view'] as const },
    { module: 'orders', actions: ['view'] as const },
    { module: 'analytics', actions: ['view'] as const }
  ]
} as const
