<!--
  Admin Header Component
  =====================
  Top navigation bar for admin dashboard
-->

<script setup lang="ts">
import { computed } from 'vue'
import { useAdminAuthStore } from '../../stores/adminAuth.store'
import { useAdminUIStore } from '../../stores/adminUI.store'

const emit = defineEmits<{
  logout: []
}>()

const authStore = useAdminAuthStore()
const uiStore = useAdminUIStore()

const userName = computed(() => authStore.user?.name || authStore.user?.email || 'Admin')
const userRole = computed(() => {
  const role = authStore.user?.role
  if (role === 'super_admin') return 'Super Admin'
  if (role === 'admin') return 'Admin'
  return role
})

const toggleSidebar = () => {
  uiStore.toggleSidebar()
}

const handleLogout = () => {
  emit('logout')
}
</script>

<template>
  <header class="admin-header">
    <!-- Left: Menu Toggle -->
    <button 
      class="header-btn menu-toggle"
      aria-label="Toggle menu"
      @click="toggleSidebar"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12h18M3 6h18M3 18h18"/>
      </svg>
    </button>

    <!-- Right: User Menu -->
    <div class="header-right">
      <!-- User Info -->
      <div class="user-info">
        <div class="user-avatar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div class="user-details">
          <div class="user-name">{{ userName }}</div>
          <div class="user-role">{{ userRole }}</div>
        </div>
      </div>

      <!-- Logout Button -->
      <button 
        class="header-btn logout-btn"
        aria-label="Logout"
        @click="handleLogout"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.admin-header {
  position: fixed;
  top: 0;
  left: 260px;
  right: 0;
  height: 56px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 100;
  transition: left 0.3s ease;
}

.sidebar-collapsed + .admin-main-area .admin-header {
  left: 72px;
}

.header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: none;
  border: none;
  border-radius: 8px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.header-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.menu-toggle {
  display: none;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background 0.2s;
}

.user-info:hover {
  background: #f3f4f6;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e8f5ef;
  color: #00a86b;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.user-role {
  font-size: 12px;
  color: #6b7280;
}

.logout-btn {
  color: #dc2626;
}

.logout-btn:hover {
  background: #fef2f2;
  color: #dc2626;
}

/* Mobile */
@media (max-width: 1024px) {
  .admin-header {
    left: 0;
  }
  
  .menu-toggle {
    display: flex;
  }
  
  .user-details {
    display: none;
  }
}
</style>
