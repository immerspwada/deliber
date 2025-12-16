<script setup lang="ts">
import { computed, onMounted, ref, onErrorCaptured } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppShell from './components/AppShell.vue'
import PWAInstallBanner from './components/PWAInstallBanner.vue'
import ToastContainer from './components/ToastContainer.vue'
import { useAuthStore } from './stores/auth'
import { useRideStore } from './stores/ride'

const route = useRoute()
const authStore = useAuthStore()
const rideStore = useRideStore()

const hideNavigation = computed(() => route.meta?.hideNavigation === true)
const isAdminRoute = computed(() => route.path.startsWith('/admin'))
const appError = ref<string | null>(null)
const isReady = ref(false)

// Capture errors
onErrorCaptured((err) => {
  console.error('[App Error]', err)
  appError.value = err instanceof Error ? err.message : String(err)
  // Return true to prevent error from propagating and breaking the app
  return true
})

// Initialize auth and restore active ride on app mount
onMounted(async () => {
  // Set timeout to prevent infinite loading
  const timeout = setTimeout(() => {
    console.warn('[App] Init timeout - showing app anyway')
    isReady.value = true
  }, 3000)

  try {
    await authStore.initialize()

    // If user is logged in, restore any active ride (non-blocking)
    if (authStore.user?.id) {
      rideStore.initialize(authStore.user.id).catch((err) => {
        console.warn('[Ride Init]', err)
      })
    }
  } catch (err) {
    console.error('[App Init Error]', err)
    // Don't block app for init errors
  } finally {
    clearTimeout(timeout)
    isReady.value = true
  }
})
</script>

<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <!-- Error Display -->
    <div v-if="appError" class="error-banner">
      <p>เกิดข้อผิดพลาด: {{ appError }}</p>
      <button @click="appError = null">ปิด</button>
    </div>
    
    <!-- Loading State -->
    <div v-if="!isReady" class="app-loading">
      <div class="loading-spinner"></div>
    </div>
    
    <!-- Main App -->
    <template v-else>
      <AppShell v-if="!hideNavigation">
        <RouterView />
      </AppShell>
      <RouterView v-else />
    </template>
    
    <!-- PWA Install Banner - only show on user app -->
    <PWAInstallBanner v-if="!isAdminRoute && isReady" />
    
    <!-- Global Toast Notifications -->
    <ToastContainer />
  </div>
</template>

<style>
#app {
  font-family: 'Sarabun', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  z-index: 9998;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E5E5E5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #E11900;
  color: white;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 9999;
}

.error-banner button {
  background: white;
  color: #E11900;
  border: none;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
}
</style>