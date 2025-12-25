/**
 * Admin Auth Store (Pinia)
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AdminUser } from '../types'

export const useAdminAuthStore = defineStore('adminAuth', () => {
  const user = ref<AdminUser | null>(null)
  const isAuthenticated = ref(false)
  const isDemoMode = ref(false)

  const userName = computed(() => user.value?.name || user.value?.email || '')
  const userEmail = computed(() => user.value?.email || '')

  function setUser(adminUser: AdminUser, demoMode = false) {
    user.value = adminUser
    isAuthenticated.value = true
    isDemoMode.value = demoMode
  }

  function clearUser() {
    user.value = null
    isAuthenticated.value = false
    isDemoMode.value = false
  }

  return {
    user,
    isAuthenticated,
    isDemoMode,
    userName,
    userEmail,
    setUser,
    clearUser
  }
})
