/**
 * Role Types - Type definitions for role-based access control
 */

export type UserRole = 'customer' | 'driver' | 'rider' | 'admin'

export interface RolePermissions {
  canAccessCustomerFeatures: boolean
  canAccessProviderFeatures: boolean
  canAccessAdminFeatures: boolean
  canBookRides: boolean
  canAcceptJobs: boolean
  canManageUsers: boolean
}

export interface RoleConfig {
  role: UserRole
  displayName: string
  color: string
  icon: string
  permissions: RolePermissions
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  customer: {
    role: 'customer',
    displayName: 'ลูกค้า',
    color: '#00A86B',
    icon: 'user',
    permissions: {
      canAccessCustomerFeatures: true,
      canAccessProviderFeatures: false,
      canAccessAdminFeatures: false,
      canBookRides: true,
      canAcceptJobs: false,
      canManageUsers: false
    }
  },
  driver: {
    role: 'driver',
    displayName: 'คนขับ',
    color: '#2196F3',
    icon: 'car',
    permissions: {
      canAccessCustomerFeatures: true,
      canAccessProviderFeatures: true,
      canAccessAdminFeatures: false,
      canBookRides: true,
      canAcceptJobs: true,
      canManageUsers: false
    }
  },
  rider: {
    role: 'rider',
    displayName: 'ไรเดอร์',
    color: '#F5A623',
    icon: 'bike',
    permissions: {
      canAccessCustomerFeatures: true,
      canAccessProviderFeatures: true,
      canAccessAdminFeatures: false,
      canBookRides: true,
      canAcceptJobs: true,
      canManageUsers: false
    }
  },
  admin: {
    role: 'admin',
    displayName: 'แอดมิน',
    color: '#E53935',
    icon: 'shield',
    permissions: {
      canAccessCustomerFeatures: true,
      canAccessProviderFeatures: true,
      canAccessAdminFeatures: true,
      canBookRides: true,
      canAcceptJobs: false,
      canManageUsers: true
    }
  }
}
