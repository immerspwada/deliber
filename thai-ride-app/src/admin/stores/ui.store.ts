/**
 * Admin UI Store (Pinia)
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAdminUIStore = defineStore('adminUI', () => {
  const sidebarOpen = ref(true)
  const loading = ref(false)
  const toasts = ref<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>>([])

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = Date.now().toString()
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, 3000)
  }

  return {
    sidebarOpen,
    loading,
    toasts,
    toggleSidebar,
    showToast
  }
})
