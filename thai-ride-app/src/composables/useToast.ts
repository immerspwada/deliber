/**
 * Toast Notification System - ระบบแจ้งเตือนแบบ Toast
 * 
 * Features:
 * - Multiple toast types (success, error, warning, info)
 * - Auto dismiss with customizable duration
 * - Manual dismiss
 * - Position control
 * - Animation support
 * - Queue management
 * - Accessibility support
 */

import { ref, computed, nextTick } from 'vue'
import { useAutoCleanup } from './useAutoCleanup'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
  persistent?: boolean
  actions?: Array<{
    label: string
    action: () => void
    style?: 'primary' | 'secondary'
  }>
  icon?: string
  timestamp: number
}

export interface ToastOptions {
  type?: Toast['type']
  title?: string
  duration?: number
  persistent?: boolean
  actions?: Toast['actions']
  icon?: string
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  maxToasts?: number
  defaultDuration?: number
}

const DEFAULT_OPTIONS: Required<Omit<ToastOptions, 'title' | 'actions' | 'icon'>> = {
  type: 'info',
  duration: 5000,
  persistent: false,
  position: 'top-right',
  maxToasts: 5,
  defaultDuration: 5000
}

// Global toast state
const toasts = ref<Toast[]>([])
const globalOptions = ref<ToastOptions>(DEFAULT_OPTIONS)

// Toast ID generator
let toastIdCounter = 0
const generateToastId = (): string => {
  return `toast-${++toastIdCounter}-${Date.now()}`
}

/**
 * Toast Composable
 */
export function useToast(options: ToastOptions = {}) {
  const { addTimerCleanup } = useAutoCleanup()
  
  const opts = { ...DEFAULT_OPTIONS, ...globalOptions.value, ...options }
  
  // Add toast
  const addToast = (message: string, toastOptions: Partial<ToastOptions> = {}): string => {
    const toastOpts = { ...opts, ...toastOptions }
    
    const toast: Toast = {
      id: generateToastId(),
      type: toastOpts.type!,
      title: toastOpts.title,
      message,
      duration: toastOpts.duration,
      persistent: toastOpts.persistent,
      actions: toastOpts.actions,
      icon: toastOpts.icon,
      timestamp: Date.now()
    }
    
    // Add to toasts array
    toasts.value.push(toast)
    
    // Limit number of toasts
    if (toasts.value.length > opts.maxToasts!) {
      const excess = toasts.value.length - opts.maxToasts!
      toasts.value.splice(0, excess)
    }
    
    // Auto dismiss if not persistent
    if (!toast.persistent && toast.duration && toast.duration > 0) {
      const timerId = setTimeout(() => {
        removeToast(toast.id)
      }, toast.duration)
      
      addTimerCleanup(timerId, 'timeout', `Toast auto-dismiss: ${toast.id}`)
    }
    
    return toast.id
  }
  
  // Remove toast
  const removeToast = (id: string): void => {
    const index = toasts.value.findIndex(toast => toast.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }
  
  // Clear all toasts
  const clearToasts = (): void => {
    toasts.value = []
  }
  
  // Update toast
  const updateToast = (id: string, updates: Partial<Omit<Toast, 'id' | 'timestamp'>>): void => {
    const toast = toasts.value.find(t => t.id === id)
    if (toast) {
      Object.assign(toast, updates)
    }
  }
  
  // Convenience methods
  const success = (message: string, options: Partial<ToastOptions> = {}): string => {
    return addToast(message, { ...options, type: 'success' })
  }
  
  const error = (message: string, options: Partial<ToastOptions> = {}): string => {
    return addToast(message, { ...options, type: 'error', persistent: options.persistent ?? true })
  }
  
  const warning = (message: string, options: Partial<ToastOptions> = {}): string => {
    return addToast(message, { ...options, type: 'warning' })
  }
  
  const info = (message: string, options: Partial<ToastOptions> = {}): string => {
    return addToast(message, { ...options, type: 'info' })
  }
  
  // Loading toast with promise
  const loading = async <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string
      error: string
    },
    options: Partial<ToastOptions> = {}
  ): Promise<T> => {
    const loadingId = addToast(messages.loading, {
      ...options,
      type: 'info',
      persistent: true,
      icon: 'loading'
    })
    
    try {
      const result = await promise
      removeToast(loadingId)
      success(messages.success, options)
      return result
    } catch (err) {
      removeToast(loadingId)
      error(messages.error, options)
      throw err
    }
  }
  
  // Promise toast (auto success/error)
  const promise = <T>(
    promiseOrFn: Promise<T> | (() => Promise<T>),
    messages: {
      loading?: string
      success?: string | ((result: T) => string)
      error?: string | ((error: Error) => string)
    },
    options: Partial<ToastOptions> = {}
  ): Promise<T> => {
    const actualPromise = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn
    
    let loadingId: string | null = null
    
    if (messages.loading) {
      loadingId = addToast(messages.loading, {
        ...options,
        type: 'info',
        persistent: true,
        icon: 'loading'
      })
    }
    
    return actualPromise
      .then((result) => {
        if (loadingId) removeToast(loadingId)
        
        if (messages.success) {
          const successMessage = typeof messages.success === 'function' 
            ? messages.success(result) 
            : messages.success
          success(successMessage, options)
        }
        
        return result
      })
      .catch((err) => {
        if (loadingId) removeToast(loadingId)
        
        if (messages.error) {
          const errorMessage = typeof messages.error === 'function' 
            ? messages.error(err) 
            : messages.error
          error(errorMessage, options)
        }
        
        throw err
      })
  }
  
  // Dismiss toast after delay
  const dismissAfter = (id: string, delay: number): void => {
    const timerId = setTimeout(() => {
      removeToast(id)
    }, delay)
    
    addTimerCleanup(timerId, 'timeout', `Toast delayed dismiss: ${id}`)
  }
  
  // Get toast by ID
  const getToast = (id: string): Toast | undefined => {
    return toasts.value.find(toast => toast.id === id)
  }
  
  // Check if toast exists
  const hasToast = (id: string): boolean => {
    return toasts.value.some(toast => toast.id === id)
  }
  
  // Get toasts by type
  const getToastsByType = (type: Toast['type']): Toast[] => {
    return toasts.value.filter(toast => toast.type === type)
  }
  
  return {
    // State
    toasts: computed(() => toasts.value),
    position: computed(() => opts.position),
    
    // Basic operations
    addToast,
    removeToast,
    clearToasts,
    updateToast,
    
    // Convenience methods
    success,
    error,
    warning,
    info,
    
    // Advanced methods
    loading,
    promise,
    dismissAfter,
    
    // Getters
    getToast,
    hasToast,
    getToastsByType,
    
    // Computed
    hasToasts: computed(() => toasts.value.length > 0),
    toastCount: computed(() => toasts.value.length),
    latestToast: computed(() => toasts.value[toasts.value.length - 1])
  }
}

/**
 * Global Toast Configuration
 */
export function configureToast(options: ToastOptions): void {
  Object.assign(globalOptions.value, options)
}

/**
 * Toast Preset Messages (Thai)
 */
export const TOAST_MESSAGES = {
  // Success messages
  SUCCESS: {
    SAVE: 'บันทึกข้อมูลเรียบร้อยแล้ว',
    UPDATE: 'อัพเดทข้อมูลเรียบร้อยแล้ว',
    DELETE: 'ลบข้อมูลเรียบร้อยแล้ว',
    CREATE: 'สร้างข้อมูลเรียบร้อยแล้ว',
    UPLOAD: 'อัพโหลดไฟล์เรียบร้อยแล้ว',
    SEND: 'ส่งข้อมูลเรียบร้อยแล้ว',
    LOGIN: 'เข้าสู่ระบบเรียบร้อยแล้ว',
    LOGOUT: 'ออกจากระบบเรียบร้อยแล้ว',
    REGISTER: 'สมัครสมาชิกเรียบร้อยแล้ว',
    VERIFY: 'ยืนยันตัวตนเรียบร้อยแล้ว',
    RESET_PASSWORD: 'รีเซ็ตรหัสผ่านเรียบร้อยแล้ว',
    COPY: 'คัดลอกข้อมูลเรียบร้อยแล้ว'
  },
  
  // Error messages
  ERROR: {
    NETWORK: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
    UNAUTHORIZED: 'ไม่มีสิทธิ์เข้าถึง กรุณาเข้าสู่ระบบใหม่',
    FORBIDDEN: 'ไม่มีสิทธิ์ในการดำเนินการนี้',
    NOT_FOUND: 'ไม่พบข้อมูลที่ต้องการ',
    TIMEOUT: 'การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง',
    VALIDATION: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
    UPLOAD: 'อัพโหลดไฟล์ไม่สำเร็จ',
    SAVE: 'บันทึกข้อมูลไม่สำเร็จ',
    DELETE: 'ลบข้อมูลไม่สำเร็จ',
    UPDATE: 'อัพเดทข้อมูลไม่สำเร็จ',
    LOGIN: 'เข้าสู่ระบบไม่สำเร็จ',
    REGISTER: 'สมัครสมาชิกไม่สำเร็จ',
    UNKNOWN: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
  },
  
  // Warning messages
  WARNING: {
    UNSAVED_CHANGES: 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก',
    SLOW_CONNECTION: 'การเชื่อมต่ออินเทอร์เน็ตช้า',
    OFFLINE: 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต',
    LOW_STORAGE: 'พื้นที่จัดเก็บข้อมูลเหลือน้อย',
    EXPIRED_SESSION: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
    MAINTENANCE: 'ระบบอยู่ในช่วงปรับปรุง',
    BETA_FEATURE: 'ฟีเจอร์นี้อยู่ในช่วงทดสอบ'
  },
  
  // Info messages
  INFO: {
    LOADING: 'กำลังโหลดข้อมูล...',
    SAVING: 'กำลังบันทึกข้อมูล...',
    UPLOADING: 'กำลังอัพโหลดไฟล์...',
    PROCESSING: 'กำลังประมวลผล...',
    CONNECTING: 'กำลังเชื่อมต่อ...',
    SYNCING: 'กำลังซิงค์ข้อมูล...',
    WELCOME: 'ยินดีต้อนรับ!',
    NEW_VERSION: 'มีเวอร์ชันใหม่พร้อมใช้งาน',
    BACKUP_COMPLETE: 'สำรองข้อมูลเสร็จสิ้น',
    CACHE_CLEARED: 'ล้างแคชเรียบร้อยแล้ว'
  }
} as const

// Export global toast instance
export const toast = useToast()

// Export types
export type { ToastOptions }