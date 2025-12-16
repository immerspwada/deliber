<script setup lang="ts">
import { computed, onMounted } from 'vue'
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

// Initialize auth and restore active ride on app mount
onMounted(async () => {
  await authStore.initialize()
  
  // If user is logged in, restore any active ride
  if (authStore.user?.id) {
    await rideStore.initialize(authStore.user.id)
  }
})
</script>

<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <AppShell v-if="!hideNavigation">
      <RouterView />
    </AppShell>
    <RouterView v-else />
    
    <!-- PWA Install Banner - only show on user app -->
    <PWAInstallBanner v-if="!isAdminRoute" />
    
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
</style>