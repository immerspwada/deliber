/**
 * Toast Notification System V2
 * Feature: F262 - Advanced Toast System with Queue Management
 * 
 * Enhanced toast system with:
 * - Queue management (max 3 visible at once)
 * - Auto-dismiss with pause on hover
 * - Action buttons
 * - Progress bar
 * - Accessibility (ARIA live regions)
 * - Sound + Haptic feedback
 * - Position control
 * - Animation support
 */

import { ref, computed, watch } from 'vue'
import { useHapticFeedback } from './useHapticFeedback'
import { useSoundNotification } from './useSoundNotification'

export type ToastType = 'success' | 'error' | 'warning' | 'info'
export type ToastPosition = 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left'

export interface ToastAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export interface Toast {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
  action?: ToastAction
  dismissible?: boolean
  position?: ToastPosition
  showProgress?: boolean
  sound?: boolean
  haptic?: boolean
  createdAt: number
  pausedAt?: number
  remainingTime?: number
}

interface ToastOptions {
  title?: string
  duration?: number
  action?: ToastAction
  dismissible?: boolean
  position?: ToastPosition
  showProgress?: boolean
  sound?: boolean
  haptic?: boolean
}

// Global state
const toasts = ref<Toast[]>([])
const maxVisible = ref(3)
const defaultDuration = ref(5000)
const defaultPosition = ref<ToastPosition>('top-right')

// Haptic and sound
const { triggerHaptic } = useHapticFeedback()
const { playSound } = useSoundNotification()

// ID generator
let toastIdCounter = 0
const generateId = () => `toast-${Date.now()}-${toastIdCounter++}`

export function useToastV2() {
  /**
   * Visible toasts (limited by maxVisible)
   */
  const visibleToasts = computed(() => {
    return toasts.value.slice(0, maxVisible.value)
  })

  /**
   * Queued toasts (waiting to be shown)
   */
  const queuedToasts = computed(() => {
    return toasts.value.slice(maxVisible.value)
  })

  /**
   * Add toast to queue
   */
  const addToast = (
    type: ToastType,
    message: string,
    options: ToastOptions = {}
  ): string => {
    const id = generateId()
    
    const toast: Toast = {
      id,
      type,
      message,
      title: options.title,
      duration: options.duration ?? defaultDuration.value,
      action: options.action,
      dismissible: options.dismissible ?? true,
      position: options.position ?? defaultPosition.value,
      showProgress: options.showProgress ?? true,
      sound: options.sound ?? true,
      haptic: options.haptic ?? true,
      createdAt: Date.now()
    }

    toasts.value.push(toast)

    // Trigger feedback if enabled
    if (toast.haptic) {
      triggerToastHaptic(type)
    }
    if (toast.sound) {
      triggerToastSound(type)
    }

    // Auto-dismiss if duration is set
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration)
    }

    return id
  }

  /**
   * Remove toast by ID
   */
  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  /**
   * Clear all toasts
   */
  const clearAll = () => {
    toasts.value = []
  }

  /**
   * Clear toasts by type
   */
  const clearByType = (type: ToastType) => {
    toasts.value = toasts.value.filter(t => t.type !== type)
  }

  /**
   * Pause toast auto-dismiss (on hover)
   */
  const pauseToast = (id: string) => {
    const toast = toasts.value.find(t => t.id === id)
    if (toast && !toast.pausedAt) {
      toast.pausedAt = Date.now()
      const elapsed = toast.pausedAt - toast.createdAt
      toast.remainingTime = (toast.duration || 0) - elapsed
    }
  }

  /**
   * Resume toast auto-dismiss
   */
  const resumeToast = (id: string) => {
    const toast = toasts.value.find(t => t.id === id)
    if (toast && toast.pausedAt && toast.remainingTime) {
      toast.pausedAt = undefined
      toast.createdAt = Date.now()
      
      setTimeout(() => {
        removeToast(id)
      }, toast.remainingTime)
    }
  }

  /**
   * Convenience methods
   */
  const success = (message: string, options?: ToastOptions) => {
    return addToast('success', message, options)
  }

  const error = (message: string, options?: ToastOptions) => {
    return addToast('error', message, options)
  }

  const warning = (message: string, options?: ToastOptions) => {
    return addToast('warning', message, options)
  }

  const info = (message: string, options?: ToastOptions) => {
    return addToast('info', message, options)
  }

  /**
   * Promise-based toast (show loading, then success/error)
   */
  const promise = async <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ): Promise<T> => {
    const loadingId = info(messages.loading, { 
      duration: 0, 
      dismissible: false,
      showProgress: false 
    })

    try {
      const result = await promise
      removeToast(loadingId)
      
      const successMsg = typeof messages.success === 'function' 
        ? messages.success(result) 
        : messages.success
      
      success(successMsg)
      return result
    } catch (err) {
      removeToast(loadingId)
      
      const errorMsg = typeof messages.error === 'function' 
        ? messages.error(err) 
        : messages.error
      
      error(errorMsg)
      throw err
    }
  }

  /**
   * Configuration
   */
  const setMaxVisible = (max: number) => {
    maxVisible.value = max
  }

  const setDefaultDuration = (duration: number) => {
    defaultDuration.value = duration
  }

  const setDefaultPosition = (position: ToastPosition) => {
    defaultPosition.value = position
  }

  return {
    // State
    toasts: visibleToasts,
    queuedToasts,
    
    // Methods
    addToast,
    removeToast,
    clearAll,
    clearByType,
    pauseToast,
    resumeToast,
    
    // Convenience
    success,
    error,
    warning,
    info,
    promise,
    
    // Config
    setMaxVisible,
    setDefaultDuration,
    setDefaultPosition
  }
}

/**
 * Trigger haptic feedback based on toast type
 */
function triggerToastHaptic(type: ToastType) {
  const { triggerHaptic } = useHapticFeedback()
  
  switch (type) {
    case 'success':
      triggerHaptic('success')
      break
    case 'error':
      triggerHaptic('error')
      break
    case 'warning':
      triggerHaptic('warning')
      break
    case 'info':
      triggerHaptic('light')
      break
  }
}

/**
 * Trigger sound notification based on toast type
 */
function triggerToastSound(type: ToastType) {
  const { playSound } = useSoundNotification()
  
  switch (type) {
    case 'success':
      playSound('success')
      break
    case 'error':
      playSound('error')
      break
    case 'warning':
      playSound('warning')
      break
    case 'info':
      playSound('notification')
      break
  }
}

/**
 * Get icon for toast type
 */
export function getToastIcon(type: ToastType): string {
  const icons = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    error: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    info: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
  }
  return icons[type]
}

/**
 * Get color classes for toast type (MUNEEF Style)
 */
export function getToastColorClasses(type: ToastType): string {
  const classes = {
    success: 'bg-[#E8F5EF] text-[#00A86B] border-[#00A86B]',
    error: 'bg-red-50 text-red-600 border-red-500',
    warning: 'bg-orange-50 text-orange-600 border-orange-500',
    info: 'bg-blue-50 text-blue-600 border-blue-500'
  }
  return classes[type]
}
