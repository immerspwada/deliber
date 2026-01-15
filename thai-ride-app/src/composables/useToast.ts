/**
 * useToast - Global toast notification system
 * 
 * Usage:
 * const { showSuccess, showError, showWarning, showInfo } = useToast()
 * showSuccess('บันทึกสำเร็จ')
 * showError('เกิดข้อผิดพลาด')
 */

import { ref, readonly } from 'vue'

export interface ToastItem {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration: number
}

// Global state (singleton)
const toasts = ref<ToastItem[]>([])
let toastId = 0

function generateId(): string {
  return `toast-${++toastId}-${Date.now()}`
}

function addToast(
  type: ToastItem['type'],
  message: string,
  duration = 4000
): string {
  const id = generateId()
  
  toasts.value.push({
    id,
    type,
    message,
    duration
  })
  
  // Limit to 5 toasts max
  if (toasts.value.length > 5) {
    toasts.value.shift()
  }
  
  return id
}

function removeToast(id: string): void {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

function clearAll(): void {
  toasts.value = []
}

export function useToast() {
  function showSuccess(message: string, duration?: number): string {
    return addToast('success', message, duration)
  }
  
  function showError(message: string, duration?: number): string {
    return addToast('error', message, duration ?? 6000) // Errors stay longer
  }
  
  function showWarning(message: string, duration?: number): string {
    return addToast('warning', message, duration ?? 5000)
  }
  
  function showInfo(message: string, duration?: number): string {
    return addToast('info', message, duration)
  }
  
  return {
    toasts: readonly(toasts),
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast,
    clearAll
  }
}
