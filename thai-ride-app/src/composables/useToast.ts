/**
 * Feature: F67 - Toast Notification System
 * 
 * ระบบแจ้งเตือนแบบ Toast
 * - แสดงข้อความสั้นๆ
 * - หายไปอัตโนมัติ
 * - รองรับหลายประเภท
 */

import { ref, readonly } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration: number
  action?: {
    label: string
    callback: () => void
  }
}

const toasts = ref<Toast[]>([])
const MAX_TOASTS = 3

// Generate unique ID
const generateId = (): string => {
  return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Add toast
const addToast = (
  message: string,
  type: ToastType = 'info',
  duration: number = 3000,
  action?: Toast['action']
): string => {
  const id = generateId()

  const toast: Toast = {
    id,
    type,
    message,
    duration,
    action
  }

  // Limit number of toasts
  if (toasts.value.length >= MAX_TOASTS) {
    toasts.value.shift()
  }

  toasts.value.push(toast)

  // Auto remove after duration
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  return id
}

// Remove toast
const removeToast = (id: string) => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

// Clear all toasts
const clearToasts = () => {
  toasts.value = []
}

// Shorthand methods
const success = (message: string, duration?: number) => {
  return addToast(message, 'success', duration)
}

const error = (message: string, duration?: number) => {
  return addToast(message, 'error', duration || 5000)
}

const warning = (message: string, duration?: number) => {
  return addToast(message, 'warning', duration || 4000)
}

const info = (message: string, duration?: number) => {
  return addToast(message, 'info', duration)
}

export function useToast() {
  return {
    toasts: readonly(toasts),
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info
  }
}
