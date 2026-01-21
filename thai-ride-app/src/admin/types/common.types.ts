/**
 * Common Types
 */

export interface MenuItem {
  id: string
  label: string
  labelTh?: string
  icon: string
  path?: string
  children?: MenuItem[]
  badge?: number | string
  permission?: string
}

export interface Breadcrumb {
  label: string
  path?: string
}

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
  read: boolean
  action?: {
    label: string
    path: string
  }
}

export interface StatCard {
  id: string
  label: string
  value: number | string
  change?: number
  changeType?: 'increase' | 'decrease'
  icon?: string
  color?: string
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    color?: string
  }[]
}

export interface TableColumn<T = unknown> {
  key: keyof T | string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (value: unknown, row: T) => string | number
}

export interface TableAction<T = unknown> {
  id: string
  label: string
  icon?: string
  variant?: 'primary' | 'secondary' | 'danger'
  onClick: (row: T) => void
  show?: (row: T) => boolean
}

export interface ModalProps {
  isOpen: boolean
  title: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closable?: boolean
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: number
}

export interface AuditLogEntry {
  id: string
  admin_id: string
  admin_email: string
  action: string
  module: string
  target_type?: string
  target_id?: string
  old_value?: Record<string, unknown>
  new_value?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at: string
}
