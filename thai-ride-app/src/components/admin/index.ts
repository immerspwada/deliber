/**
 * Admin Components - MUNEEF Style
 * 
 * Centralized exports for all admin dashboard components
 * Features: consistent styling, modern design, responsive layout
 */

// Core Admin Components
export { default as AdminCard } from './AdminCard.vue'
export { default as AdminStatCard } from './AdminStatCard.vue'
export { default as AdminButton } from './AdminButton.vue'
export { default as AdminModal } from './AdminModal.vue'
export { default as AdminTable } from './AdminTable.vue'
export { default as AdminStatusBadge } from './AdminStatusBadge.vue'

// Layout Components
export { default as EnhancedAdminLayout } from './EnhancedAdminLayout.vue'

// Security & RBAC Components
export { default as PermissionGuard } from './PermissionGuard.vue'
export { default as DoubleConfirmModal } from './DoubleConfirmModal.vue'

// Type definitions for better TypeScript support
export interface AdminCardProps {
  title?: string
  subtitle?: string
  icon?: any
  iconColor?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  loading?: boolean
  clickable?: boolean
  elevated?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export interface AdminStatCardProps extends AdminCardProps {
  label: string
  value: number
  unit?: string
  format?: string
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  trend?: number
  trendUnit?: string
  comparison?: {
    label: string
    value: number
    format?: string
  }
  progress?: number
  progressTarget?: string
  chartData?: number[]
  chartColor?: string
  animationDuration?: number
}

export interface AdminButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  icon?: any
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  rounded?: boolean
}

export interface AdminModalProps {
  modelValue: boolean
  title?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closable?: boolean
  closeOnOverlay?: boolean
  preventClose?: boolean
  persistent?: boolean
}

export interface AdminTableColumn {
  key: string
  label: string
  sortable?: boolean
  format?: 'date' | 'currency' | 'number' | 'status' | 'custom'
}

export interface AdminTableProps {
  columns: AdminTableColumn[]
  data: any[]
  selectable?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  paginated?: boolean
  pageSize?: number
  emptyText?: string
}

export interface AdminStatusBadgeProps {
  status?: 'active' | 'inactive' | 'pending' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
  variant?: 'filled' | 'outline' | 'soft' | 'minimal'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  text?: string
  icon?: any
  showDot?: boolean
  animated?: boolean
  rounded?: boolean
}

// Utility functions for admin components
export const adminUtils = {
  /**
   * Format currency for Thai Baht
   */
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount)
  },

  /**
   * Format number with Thai locale
   */
  formatNumber: (num: number): string => {
    return new Intl.NumberFormat('th-TH').format(num)
  },

  /**
   * Format date for Thai locale
   */
  formatDate: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  },

  /**
   * Format relative time
   */
  formatRelativeTime: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'เมื่อสักครู่'
    if (diffInMinutes < 60) return `${diffInMinutes} นาทีที่แล้ว`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} ชั่วโมงที่แล้ว`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} วันที่แล้ว`
  },

  /**
   * Get status color based on status type
   */
  getStatusColor: (status: string): string => {
    const colorMap: Record<string, string> = {
      active: '#00A86B',
      success: '#00A86B',
      pending: '#F5A623',
      warning: '#F5A623',
      error: '#E53935',
      danger: '#E53935',
      inactive: '#666666',
      neutral: '#999999',
      info: '#1976D2'
    }
    return colorMap[status] || '#999999'
  },

  /**
   * Generate random ID for components
   */
  generateId: (prefix = 'admin'): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
  },

  /**
   * Debounce function for search inputs
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: ReturnType<typeof setTimeout>
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  },

  /**
   * Validate Thai phone number
   */
  validateThaiPhone: (phone: string): boolean => {
    const phoneRegex = /^(\+66|66|0)[0-9]{8,9}$/
    return phoneRegex.test(phone.replace(/[-\s]/g, ''))
  },

  /**
   * Validate Thai National ID
   */
  validateThaiNationalId: (id: string): boolean => {
    if (!/^\d{13}$/.test(id)) return false
    
    let sum = 0
    for (let i = 0; i < 12; i++) {
      sum += parseInt(id[i] || '0') * (13 - i)
    }
    
    const checkDigit = (11 - (sum % 11)) % 10
    return checkDigit === parseInt(id[12] || '0')
  },

  /**
   * Calculate percentage change
   */
  calculatePercentageChange: (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  },

  /**
   * Truncate text with ellipsis
   */
  truncateText: (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }
}

// Color constants for consistent theming
export const adminColors = {
  primary: '#00A86B',
  primaryHover: '#008F5B',
  primaryLight: '#E8F5EF',
  
  success: '#00A86B',
  warning: '#F5A623',
  error: '#E53935',
  info: '#1976D2',
  
  text: {
    primary: '#1A1A1A',
    secondary: '#666666',
    muted: '#999999'
  },
  
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    muted: '#FAFAFA'
  },
  
  border: {
    light: '#F0F0F0',
    default: '#E8E8E8',
    dark: '#CCCCCC'
  }
} as const

// Breakpoints for responsive design
export const adminBreakpoints = {
  xs: '480px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const

// Animation durations
export const adminAnimations = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms'
} as const