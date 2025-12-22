<!--
  Admin Shell - Main Layout Wrapper
  =================================
  Main layout component for admin dashboard
-->

<script setup lang="ts">
import { onMounted, onUnmounted, provide } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminAuthStore } from '../../stores/adminAuth.store'
import { useAdminUIStore } from '../../stores/adminUI.store'
import AdminSidebar from './AdminSidebar.vue'
import AdminHeader from './AdminHeader.vue'
import AdminToasts from './AdminToasts.vue'

const router = useRouter()
const authStore = useAdminAuthStore()
const uiStore = useAdminUIStore()

provide('adminAuth', authStore)
provide('adminUI', uiStore)

let sessionCheckInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  const isValid = await authStore.initialize()
  if (!isValid) {
    router.push('/admin/login')
    return
  }
  
  // Check session every 5 minutes
  sessionCheckInterval = setInterval(() => {
    if (!authStore.isAuthenticated) {
      router.push('/admin/login')
    }
  }, 5 * 60 * 1000)
})

onUnmounted(() => {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval)
  }
})

const handleLogout = async () => {
  await authStore.logout()
  router.push('/admin/login')
}
</script>

<template>
  <div class="admin-shell" :class="{ 'sidebar-collapsed': uiStore.sidebarCollapsed }">
    <!-- Sidebar -->
    <AdminSidebar />
    
    <!-- Main Area -->
    <div class="admin-main-area">
      <!-- Header -->
      <AdminHeader @logout="handleLogout" />
      
      <!-- Content -->
      <main class="admin-content">
        <slot />
      </main>
    </div>
    
    <!-- Mobile Overlay -->
    <div 
      v-if="uiStore.sidebarOpen" 
      class="sidebar-overlay" 
      @click="uiStore.closeSidebar"
    />
    
    <!-- Toast Notifications -->
    <AdminToasts />
    
    <!-- Global Loading -->
    <div v-if="uiStore.isLoading" class="global-loading">
      <div class="loading-spinner" />
      <span v-if="uiStore.loadingMessage">{{ uiStore.loadingMessage }}</span>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  display: flex;
  min-height: 100vh;
  background: #F5F7FA;
}

.admin-main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 260px;
  transition: margin-left 0.3s ease;
}

.admin-shell.sidebar-collapsed .admin-main-area {
  margin-left: 72px;
}

.admin-content {
  flex: 1;
  padding: 24px;
  margin-top: 56px;
  overflow-y: auto;
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 199;
  display: none;
}

.global-loading {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 9999;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E5E7EB;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Mobile Responsive */
@media (max-width: 1024px) {
  .admin-main-area {
    margin-left: 0;
  }
  
  .admin-shell.sidebar-collapsed .admin-main-area {
    margin-left: 0;
  }
  
  .sidebar-overlay {
    display: block;
  }
  
  .admin-content {
    padding: 16px;
  }
}
</style>
