/**
 * Admin UI Store
 * ===============
 * Pinia store for admin UI state management
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Breadcrumb, Notification, ToastMessage } from '../types/common.types'

export const useAdminUIStore = defineStore('adminUI', () => {
  // State
  const sidebarCollapsed = ref(false)
  const sidebarOpen = ref(false) // For mobile
  const currentModule = ref('dashboard')
  const breadcrumbs = ref<Breadcrumb[]>([])
  const notifications = ref<Notification[]>([])
  const toasts = ref<ToastMessage[]>([])
  const isLoading = ref(false)
  const loadingMessage = ref('')

  // Computed
  const unreadNotifications = computed(() => 
    notifications.value.filter(n => !n.read).length
  )

  const hasNotifications = computed(() => notifications.value.length > 0)

  // Sidebar
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  const openSidebar = () => {
    sidebarOpen.value = true
  }

  const closeSidebar = () => {
    sidebarOpen.value = false
  }

  // Breadcrumbs
  const setBreadcrumbs = (items: Breadcrumb[]) => {
    breadcrumbs.value = items
  }

  const addBreadcrumb = (item: Breadcrumb) => {
    breadcrumbs.value.push(item)
  }

  const clearBreadcrumbs = () => {
    breadcrumbs.value = []
  }

  // Module
  const setCurrentModule = (module: string) => {
    currentModule.value = module
  }

  // Notifications
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    notifications.value.unshift({
      ...notification,
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false
    })
  }

  const markNotificationRead = (id: string) => {
    const notif = notifications.value.find(n => n.id === id)
    if (notif) {
      notif.read = true
    }
  }

  const markAllNotificationsRead = () => {
    notifications.value.forEach(n => {
      n.read = true
    })
  }

  const clearNotifications = () => {
    notifications.value = []
  }

  // Toasts
  const showToast = (type: ToastMessage['type'], message: string, duration = 3000) => {
    const id = `toast-${Date.now()}`
    toasts.value.push({ id, type, message, duration })
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    
    return id
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const showSuccess = (message: string) => showToast('success', message)
  const showError = (message: string) => showToast('error', message, 5000)
  const showWarning = (message: string) => showToast('warning', message, 4000)
  const showInfo = (message: string) => showToast('info', message)

  // Loading
  const setLoading = (loading: boolean, message = '') => {
    isLoading.value = loading
    loadingMessage.value = message
  }

  // Reset
  const reset = () => {
    sidebarCollapsed.value = false
    sidebarOpen.value = false
    currentModule.value = 'dashboard'
    breadcrumbs.value = []
    notifications.value = []
    toasts.value = []
    isLoading.value = false
    loadingMessage.value = ''
  }

  return {
    // State
    sidebarCollapsed,
    sidebarOpen,
    currentModule,
    breadcrumbs,
    notifications,
    toasts,
    isLoading,
    loadingMessage,
    
    // Computed
    unreadNotifications,
    hasNotifications,
    
    // Sidebar
    toggleSidebar,
    openSidebar,
    closeSidebar,
    
    // Breadcrumbs
    setBreadcrumbs,
    addBreadcrumb,
    clearBreadcrumbs,
    
    // Module
    setCurrentModule,
    
    // Notifications
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    
    // Toasts
    showToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    
    // Loading
    setLoading,
    
    // Reset
    reset
  }
})
