/**
 * Role Types - Type definitions for role-based access control
 */

export type UserRole = 'customer' | 'provider' | 'driver' | 'rider' | 'admin' | 'super_admin' | 'manager' | 'worker' | 'client' | 'viewer'

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
  displayNameTh: string
  color: string
  icon: string
  permissions: RolePermissions
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  customer: {
    role: 'customer',
    displayName: 'ลูกค้า',
    displayNameTh: 'ลูกค้า',
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
  provider: {
    role: 'provider',
    displayName: 'ผู้ให้บริการ',
    displayNameTh: 'ผู้ให้บริการ',
    color: '#2196F3',
    icon: 'briefcase',
    permissions: {
      canAccessCustomerFeatures: true,
      canAccessProviderFeatures: true,
      canAccessAdminFeatures: false,
      canBookRides: true,
      canAcceptJobs: true,
      canManageUsers: false
    }
  },
  driver: {
    role: 'driver',
    displayName: 'คนขับ',
    displayNameTh: 'คนขับ',
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
    displayNameTh: 'ไรเดอร์',
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
    displayNameTh: 'แอดมิน',
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
  },
  super_admin: {
    role: 'super_admin',
    displayName: 'ซุปเปอร์แอดมิน',
    displayNameTh: 'ซุปเปอร์แอดมิน',
    color: '#7C3AED',
    icon: 'crown',
    permissions: {
      canAccessCustomerFeatures: true,
      canAccessProviderFeatures: true,
      canAccessAdminFeatures: true,
      canBookRides: true,
      canAcceptJobs: false,
      canManageUsers: true
    }
  },
  manager: {
    role: 'manager',
    displayName: 'ผู้จัดการ',
    displayNameTh: 'ผู้จัดการ',
    color: '#DC2626',
    icon: 'users',
    permissions: {
      canAccessCustomerFeatures: true,
      canAccessProviderFeatures: true,
      canAccessAdminFeatures: true,
      canBookRides: true,
      canAcceptJobs: false,
      canManageUsers: true
    }
  },
  worker: {
    role: 'worker',
    displayName: 'พนักงาน',
    displayNameTh: 'พนักงาน',
    color: '#059669',
    icon: 'wrench',
    permissions: {
      canAccessCustomerFeatures: true,
      canAccessProviderFeatures: true,
      canAccessAdminFeatures: false,
      canBookRides: true,
      canAcceptJobs: true,
      canManageUsers: false
    }
  },
  client: {
    role: 'client',
    displayName: 'ลูกค้าองค์กร',
    displayNameTh: 'ลูกค้าองค์กร',
    color: '#0891B2',
    icon: 'building',
    permissions: {
      canAccessCustomerFeatures: true,
      canAccessProviderFeatures: false,
      canAccessAdminFeatures: false,
      canBookRides: true,
      canAcceptJobs: false,
      canManageUsers: false
    }
  },
  viewer: {
    role: 'viewer',
    displayName: 'ผู้ดู',
    displayNameTh: 'ผู้ดู',
    color: '#6B7280',
    icon: 'eye',
    permissions: {
      canAccessCustomerFeatures: true,
      canAccessProviderFeatures: false,
      canAccessAdminFeatures: false,
      canBookRides: false,
      canAcceptJobs: false,
      canManageUsers: false
    }
  }
}

// Provider Status Configurations
export type ProviderStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'active'

export interface ProviderStatusConfig {
  status: ProviderStatus
  displayNameTh: string
  displayNameEn: string
  color: string
  description: string
}

export const PROVIDER_STATUS_CONFIGS: Record<ProviderStatus, ProviderStatusConfig> = {
  pending: {
    status: 'pending',
    displayNameTh: 'รอการอนุมัติ',
    displayNameEn: 'Pending',
    color: '#F59E0B',
    description: 'รอการตรวจสอบและอนุมัติจากแอดมิน'
  },
  approved: {
    status: 'approved',
    displayNameTh: 'อนุมัติแล้ว',
    displayNameEn: 'Approved',
    color: '#10B981',
    description: 'ได้รับการอนุมัติแล้ว สามารถเริ่มให้บริการได้'
  },
  active: {
    status: 'active',
    displayNameTh: 'ใช้งานอยู่',
    displayNameEn: 'Active',
    color: '#3B82F6',
    description: 'กำลังให้บริการอยู่'
  },
  suspended: {
    status: 'suspended',
    displayNameTh: 'ถูกระงับ',
    displayNameEn: 'Suspended',
    color: '#EF4444',
    description: 'ถูกระงับการให้บริการชั่วคราว'
  },
  rejected: {
    status: 'rejected',
    displayNameTh: 'ถูกปฏิเสธ',
    displayNameEn: 'Rejected',
    color: '#6B7280',
    description: 'ไม่ผ่านการตรวจสอบ'
  }
}

// Utility functions for role-based access control
export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  const config = ROLE_CONFIGS[role]
  return config?.permissions[permission] ?? false
}

export function canAccessProviderRoutes(role: UserRole): boolean {
  return hasPermission(role, 'canAccessProviderFeatures')
}

export function canAccessAdminRoutes(role: UserRole): boolean {
  return ['admin', 'super_admin', 'manager'].includes(role)
}
