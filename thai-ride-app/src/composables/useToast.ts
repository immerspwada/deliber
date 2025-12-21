/**
 * useToast - Simple Toast Notification System
 * Feature: F67 - Toast Notifications
 * 
 * Usage:
 * const { showToast, showSuccess, showError, showWarning } = useToast()
 * showSuccess('เปิดรับงานแล้ว')
 * showError('ไม่สามารถเปลี่ยนสถานะได้')
 */

import { ref, readonly } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration: number
}

// Global state (singleton)
const toasts = ref<Toast[]>([])
let toastId = 0

export function useToast() {
  const showToast = (message: string, type: Toast['type'] = 'info', duration = 3000) => {
    const id = ++toastId
    const toast: Toast = { id, message, type, duration }
    
    toasts.value.push(toast)
    
    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    
    return id
  }
  
  const removeToast = (id: number) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }
  
  const showSuccess = (message: string, duration = 3000) => {
    return showToast(message, 'success', duration)
  }
  
  const showError = (message: string, duration = 4000) => {
    return showToast(message, 'error', duration)
  }
  
  const showWarning = (message: string, duration = 3500) => {
    return showToast(message, 'warning', duration)
  }
  
  const showInfo = (message: string, duration = 3000) => {
    return showToast(message, 'info', duration)
  }
  
  const clearAll = () => {
    toasts.value = []
  }
  
  return {
    toasts: readonly(toasts),
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast,
    clearAll
  }
}
