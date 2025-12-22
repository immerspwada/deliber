<!--
  Admin Header Component
  =====================
  Top header with page title, notifications, and user menu
-->

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAdminAuthStore } from '../../stores/adminAuth.store'
import { useAdminUIStore } from '../../stores/adminUI.store'

const emit = defineEmits<{
  logout: []
}>()

const route = useRoute()
const authStore = useAdminAuthStore()
const uiStore = useAdminUIStore()

const showUserMenu = ref(false)
const showNotifications = ref(false)

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/admin/dashboard': 'Dashboard',
    '/admin/customers': 'ลูกค้า',
    '/admin/providers': 'ผู้ให้บริการ',
    '/admin/orders': 'ออเดอร์',
    '/admin/revenue': 'รายได้',
    '/admin/settings': 'ตั้งค่า'
  }
  return titles[route.path] || 'Admin'
})

const handleLogout = () => {
  showUserMenu.value = false
  emit('logout')
}
</script>

<template>
  <header class="admin-header">
    <!-- Mobile Menu Button -->
    <button class="menu-btn mobile-only" @click="uiStore.openSidebar">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12h18M3 6h18M3 18h18"/>
      </svg>
    </button>

    <!-- Page Title -->
    <h1 class="page-title">{{ pageTitle }}</h1>

    <div class="spacer" />

    <!-- Demo Badge -->
    <div v-if="authStore.isDemoMode" class="demo-badge">
      Demo Mode
    </div>

    <!-- Notifications -->
    <div class="header-action">
      <button class="action-btn" @click="showNotifications = !showNotifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <span v-if="uiStore.unreadNotifications > 0" class="badge">
          {{ uiStore.unreadNotifications > 9 ? '9+' : uiStore.unreadNotifications }}
        </span>
      </button>
    </div>

    <!-- User Menu -->
    <div class="header-action">
      <button class="user-btn" @click="showUserMenu = !showUserMenu">
        <div class="user-avatar">
          {{ authStore.user?.name?.charAt(0) || 'A' }}
        </div>
        <span class="user-name desktop-only">
          {{ authStore.user?.name || 'Admin' }}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      <!-- User Dropdown -->
      <div v-if="showUserMenu" class="dropdown user-dropdown">
        <div class="dropdown-header">
          <div class="user-info">
            <div class="user-avatar lg">
              {{ authStore.user?.name?.charAt(0) || 'A' }}
            </div>
            <div>
              <div class="user-name">{{ authStore.user?.name || 'Admin' }}</div>
              <div class="user-email">{{ authStore.user?.email }}</div>
            </div>
          </div>
        </div>
        <div class="dropdown-body">
          <button class="dropdown-item danger" @click="handleLogout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- Backdrop -->
  <div 
    v-if="showUserMenu || showNotifications" 
    class="backdrop" 
    @click="showUserMenu = false; showNotifications = false"
  />
</template>

<style scoped>
.admin-header {
  position: fixed;
  top: 0;
  right: 0;
  left: 260px;
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #E5E7EB;
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 16px;
  z-index: 100;
  transition: left 0.3s ease;
}

.menu-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #4B5563;
}

.menu-btn:hover {
  background: #F3F4F6;
}

.mobile-only {
  display: none;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #1F2937;
  margin: 0;
}

.spacer {
  flex: 1;
}

.demo-badge {
  padding: 4px 12px;
  background: #FEF3C7;
  color: #92400E;
  font-size: 12px;
  font-weight: 500;
  border-radius: 16px;
}

.header-action {
  position: relative;
}

.action-btn {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #4B5563;
}

.action-btn:hover {
  background: #F3F4F6;
}

.action-btn .badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #EF4444;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 4px;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #4B5563;
}

.user-btn:hover {
  background: #F3F4F6;
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: #00A86B;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
}

.user-avatar.lg {
  width: 40px;
  height: 40px;
  font-size: 16px;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #1F2937;
}

.user-email {
  font-size: 12px;
  color: #6B7280;
}

.dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
  min-width: 280px;
  z-index: 1000;
  overflow: hidden;
}

.dropdown-header {
  padding: 16px;
  border-bottom: 1px solid #E5E7EB;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dropdown-body {
  padding: 8px;
}

.dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #4B5563;
  font-size: 14px;
  text-align: left;
}

.dropdown-item:hover {
  background: #F3F4F6;
}

.dropdown-item.danger {
  color: #EF4444;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
}

.desktop-only {
  display: block;
}

/* Mobile Responsive */
@media (max-width: 1024px) {
  .admin-header {
    left: 0;
  }
  
  .mobile-only {
    display: flex;
  }
  
  .desktop-only {
    display: none;
  }
}
</style>
