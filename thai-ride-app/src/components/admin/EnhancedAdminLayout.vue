<!--
  Enhanced Admin Layout - MUNEEF Style
  
  Modern admin layout with improved navigation, search, and user experience
  Features: collapsible sidebar, breadcrumbs, notifications, user menu
-->

<template>
  <div class="enhanced-admin-layout">
    <!-- Top Navigation Bar -->
    <header class="top-nav">
      <div class="nav-left">
        <!-- Menu Toggle -->
        <AdminButton
          variant="ghost"
          size="sm"
          :icon="MenuIcon"
          @click="toggleSidebar"
          class="menu-toggle"
        />
        
        <!-- Logo -->
        <div class="logo">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <span class="logo-text">GOBEAR Admin</span>
        </div>

        <!-- Breadcrumbs -->
        <nav class="breadcrumbs">
          <ol class="breadcrumb-list">
            <li v-for="(crumb, index) in breadcrumbs" :key="index" class="breadcrumb-item">
              <router-link 
                v-if="crumb.to && index < breadcrumbs.length - 1"
                :to="crumb.to"
                class="breadcrumb-link"
              >
                {{ crumb.label }}
              </router-link>
              <span v-else class="breadcrumb-current">{{ crumb.label }}</span>
              <svg v-if="index < breadcrumbs.length - 1" class="breadcrumb-separator" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </li>
          </ol>
        </nav>
      </div>

      <div class="nav-right">
        <!-- Global Search -->
        <div class="global-search">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาทั่วระบบ..."
            class="search-input"
            @focus="showSearchResults = true"
            @blur="hideSearchResults"
          >
          
          <!-- Search Results Dropdown -->
          <div v-if="showSearchResults && searchResults.length" class="search-results">
            <div
              v-for="result in searchResults"
              :key="result.id"
              class="search-result-item"
              @click="navigateToResult(result)"
            >
              <component :is="result.icon" class="result-icon" />
              <div class="result-content">
                <div class="result-title">{{ result.title }}</div>
                <div class="result-description">{{ result.description }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Notifications -->
        <div class="notification-center">
          <AdminButton
            variant="ghost"
            size="sm"
            :icon="BellIcon"
            @click="showNotifications = !showNotifications"
            class="notification-button"
          >
            <AdminStatusBadge
              v-if="unreadNotifications > 0"
              :text="unreadNotifications.toString()"
              status="error"
              variant="filled"
              size="xs"
              class="notification-badge"
            />
          </AdminButton>

          <!-- Notifications Dropdown -->
          <div v-if="showNotifications" class="notifications-dropdown">
            <div class="notifications-header">
              <h3>การแจ้งเตือน</h3>
              <AdminButton
                variant="ghost"
                size="xs"
                @click="markAllAsRead"
              >
                อ่านทั้งหมด
              </AdminButton>
            </div>
            <div class="notifications-list">
              <div
                v-for="notification in notifications"
                :key="notification.id"
                class="notification-item"
                :class="{ unread: !notification.read }"
              >
                <div class="notification-content">
                  <div class="notification-title">{{ notification.title }}</div>
                  <div class="notification-message">{{ notification.message }}</div>
                  <div class="notification-time">{{ formatTime(notification.created_at) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- User Menu -->
        <div class="user-menu">
          <AdminButton
            variant="ghost"
            size="sm"
            @click="showUserMenu = !showUserMenu"
            class="user-button"
          >
            <div class="user-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <span class="user-name">{{ currentUser?.name || 'Admin' }}</span>
            <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </AdminButton>

          <!-- User Dropdown -->
          <div v-if="showUserMenu" class="user-dropdown">
            <div class="user-info">
              <div class="user-details">
                <div class="user-display-name">{{ currentUser?.name || 'Admin User' }}</div>
                <div class="user-email">{{ currentUser?.email || 'admin@demo.com' }}</div>
              </div>
            </div>
            <div class="user-actions">
              <AdminButton
                variant="ghost"
                size="sm"
                :icon="SettingsIcon"
                @click="navigateTo('/admin/settings')"
                full-width
              >
                ตั้งค่า
              </AdminButton>
              <AdminButton
                variant="ghost"
                size="sm"
                :icon="LogoutIcon"
                @click="handleLogout"
                full-width
              >
                ออกจากระบบ
              </AdminButton>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed, open: sidebarOpen }">
      <div class="sidebar-content">
        <!-- Navigation Menu -->
        <nav class="sidebar-nav">
          <div
            v-for="section in menuSections"
            :key="section.title"
            class="nav-section"
          >
            <div v-if="section.title && !sidebarCollapsed" class="section-title">
              {{ section.title }}
            </div>
            <div class="nav-items">
              <router-link
                v-for="item in section.items"
                :key="item.path"
                :to="item.path"
                class="nav-item"
                :class="{ active: isActive(item.path) }"
                @click="closeMobileSidebar"
              >
                <component :is="item.icon" class="nav-icon" />
                <span v-if="!sidebarCollapsed" class="nav-label">{{ item.label }}</span>
                <AdminStatusBadge
                  v-if="item.badge && !sidebarCollapsed"
                  :text="item.badge.text"
                  :status="item.badge.status"
                  variant="soft"
                  size="xs"
                  class="nav-badge"
                />
              </router-link>
            </div>
          </div>
        </nav>

        <!-- Sidebar Footer -->
        <div class="sidebar-footer">
          <AdminButton
            variant="ghost"
            size="sm"
            :icon="sidebarCollapsed ? ExpandIcon : CollapseIcon"
            @click="toggleSidebarCollapse"
            :full-width="!sidebarCollapsed"
            class="collapse-button"
          >
            <span v-if="!sidebarCollapsed">ย่อเมนู</span>
          </AdminButton>
        </div>
      </div>
    </aside>

    <!-- Mobile Sidebar Overlay -->
    <div
      v-if="sidebarOpen"
      class="sidebar-overlay"
      @click="closeMobileSidebar"
    ></div>

    <!-- Main Content Area -->
    <main class="main-content" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <div class="content-wrapper">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminButton from './AdminButton.vue'
import AdminStatusBadge from './AdminStatusBadge.vue'

// Icons
const MenuIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 12h18M3 6h18M3 18h18"/></svg>' }
const BellIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>' }
const SettingsIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>' }
const LogoutIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>' }
const ExpandIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg>' }
const CollapseIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg>' }

const route = useRoute()
const router = useRouter()

// State
const sidebarOpen = ref(false)
const sidebarCollapsed = ref(false)
const showNotifications = ref(false)
const showUserMenu = ref(false)
const showSearchResults = ref(false)
const searchQuery = ref('')

// Mock data
const currentUser = ref({
  name: 'Admin User',
  email: 'admin@demo.com'
})

const notifications = ref([
  {
    id: 1,
    title: 'ออเดอร์ใหม่',
    message: 'มีออเดอร์ใหม่ 5 รายการรอการอนุมัติ',
    created_at: new Date(),
    read: false
  }
])

const unreadNotifications = computed(() =>
  notifications.value.filter(n => !n.read).length
)

// Menu configuration
type BadgeStatus = 'success' | 'error' | 'warning' | 'info' | 'pending' | 'active' | 'neutral' | 'inactive'

interface MenuItem {
  path: string
  label: string
  icon: { template: string }
  badge?: { text: string; status: BadgeStatus }
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

const menuSections = ref<MenuSection[]>([
  {
    title: 'หลัก',
    items: [
      { path: '/admin/dashboard', label: 'แดชบอร์ด', icon: { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>' } },
      { path: '/admin/analytics', label: 'วิเคราะห์ข้อมูล', icon: { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>' } },
      { path: '/admin/live-map', label: 'แผนที่สด', icon: { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/></svg>' } }
    ]
  },
  {
    title: 'การจัดการ',
    items: [
      { path: '/admin/users', label: 'ผู้ใช้งาน', icon: { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' } },
      { path: '/admin/providers', label: 'ผู้ให้บริการ', icon: { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>' } },
      { path: '/admin/orders', label: 'ออเดอร์', icon: { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/></svg>' }, badge: { text: '12', status: 'warning' as BadgeStatus } }
    ]
  }
])

// Breadcrumbs
const breadcrumbs = computed(() => {
  const pathSegments = route.path.split('/').filter(Boolean)
  const crumbs = []
  
  if (pathSegments[0] === 'admin') {
    crumbs.push({ label: 'Admin', to: '/admin/dashboard' })
    
    if (pathSegments[1]) {
      const pageLabel = pathSegments[1].replace('-', ' ')
      crumbs.push({ 
        label: pageLabel.charAt(0).toUpperCase() + pageLabel.slice(1),
        to: route.path
      })
    }
  }
  
  return crumbs
})

// Search results
const searchResults = computed(() => {
  if (!searchQuery.value) return []
  
  // Mock search results
  return [
    {
      id: 1,
      title: 'ผู้ใช้งาน',
      description: 'จัดการข้อมูลผู้ใช้งาน',
      icon: { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' },
      path: '/admin/users'
    }
  ]
})

// Methods
const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const toggleSidebarCollapse = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
  localStorage.setItem('admin_sidebar_collapsed', sidebarCollapsed.value.toString())
}

const closeMobileSidebar = () => {
  sidebarOpen.value = false
}

const isActive = (path: string) => {
  if (path === '/admin/dashboard') return route.path === '/admin/dashboard'
  return route.path.startsWith(path)
}

const navigateTo = (path: string) => {
  router.push(path)
  showUserMenu.value = false
}

const navigateToResult = (result: any) => {
  router.push(result.path)
  showSearchResults.value = false
  searchQuery.value = ''
}

const hideSearchResults = () => {
  setTimeout(() => {
    showSearchResults.value = false
  }, 200)
}

const markAllAsRead = () => {
  notifications.value.forEach(n => n.read = true)
  showNotifications.value = false
}

const handleLogout = () => {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
  localStorage.removeItem('admin_login_time')
  router.push('/admin/login')
}

const formatTime = (date: Date) => {
  return new Intl.RelativeTimeFormat('th').format(
    Math.floor((date.getTime() - Date.now()) / (1000 * 60)),
    'minute'
  )
}

// Lifecycle
onMounted(() => {
  const collapsed = localStorage.getItem('admin_sidebar_collapsed')
  if (collapsed === 'true') {
    sidebarCollapsed.value = true
  }
})

// Close dropdowns when clicking outside
watch([showNotifications, showUserMenu], () => {
  if (showNotifications.value || showUserMenu.value) {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Element
      if (!target.closest('.notification-center') && !target.closest('.user-menu')) {
        showNotifications.value = false
        showUserMenu.value = false
        document.removeEventListener('click', handleClickOutside)
      }
    }
    
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)
  }
})
</script>

<style scoped>
.enhanced-admin-layout {
  min-height: 100vh;
  background: #F7F7F7;
  display: flex;
  flex-direction: column;
}

/* Top Navigation */
.top-nav {
  height: 64px;
  background: #FFFFFF;
  border-bottom: 1px solid #F0F0F0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 1;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  color: #00A86B;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
}

/* Breadcrumbs */
.breadcrumbs {
  flex: 1;
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.breadcrumb-link {
  color: #666666;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.breadcrumb-link:hover {
  color: #00A86B;
}

.breadcrumb-current {
  color: #1A1A1A;
  font-size: 14px;
  font-weight: 500;
}

.breadcrumb-separator {
  width: 16px;
  height: 16px;
  color: #CCCCCC;
}

/* Global Search */
.global-search {
  position: relative;
  width: 320px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: #999999;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 48px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
  background: #FFFFFF;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #00A86B;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  margin-top: 8px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 200;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-result-item:hover {
  background: #F5F5F5;
}

.result-icon {
  width: 20px;
  height: 20px;
  color: #666666;
  flex-shrink: 0;
}

.result-content {
  flex: 1;
}

.result-title {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.result-description {
  font-size: 12px;
  color: #666666;
}

/* Notifications */
.notification-center {
  position: relative;
}

.notification-button {
  position: relative;
}

.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
}

.notifications-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 320px;
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  margin-top: 8px;
  z-index: 200;
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #F0F0F0;
}

.notifications-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.notifications-list {
  max-height: 300px;
  overflow-y: auto;
}

.notification-item {
  padding: 16px 20px;
  border-bottom: 1px solid #F0F0F0;
  transition: background 0.2s;
}

.notification-item:hover {
  background: #F5F5F5;
}

.notification-item.unread {
  background: #F0FFF8;
}

.notification-title {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.notification-message {
  font-size: 13px;
  color: #666666;
  margin-bottom: 8px;
}

.notification-time {
  font-size: 12px;
  color: #999999;
}

/* User Menu */
.user-menu {
  position: relative;
}

.user-button {
  gap: 12px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #F0F0F0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar svg {
  width: 18px;
  height: 18px;
  color: #666666;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.dropdown-arrow {
  width: 16px;
  height: 16px;
  color: #666666;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 240px;
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  margin-top: 8px;
  z-index: 200;
}

.user-info {
  padding: 20px;
  border-bottom: 1px solid #F0F0F0;
}

.user-display-name {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.user-email {
  font-size: 14px;
  color: #666666;
}

.user-actions {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Sidebar */
.sidebar {
  position: fixed;
  top: 64px;
  left: 0;
  bottom: 0;
  width: 280px;
  background: #FFFFFF;
  border-right: 1px solid #F0F0F0;
  transform: translateX(-100%);
  transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  z-index: 90;
}

.sidebar.collapsed {
  width: 80px;
}

.sidebar-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px 0;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 24px;
  margin-bottom: 12px;
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  color: #666666;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  position: relative;
}

.nav-item:hover {
  background: #F5F5F5;
  color: #1A1A1A;
}

.nav-item.active {
  background: #E8F5EF;
  color: #00A86B;
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-label {
  flex: 1;
}

.nav-badge {
  margin-left: auto;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 12px;
}

.sidebar-footer {
  padding: 0 12px;
  border-top: 1px solid #F0F0F0;
  padding-top: 24px;
}

.collapse-button {
  justify-content: center;
}

.sidebar.collapsed .collapse-button {
  padding: 12px;
}

/* Main Content */
.main-content {
  margin-top: 64px;
  transition: margin-left 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.content-wrapper {
  padding: 24px;
  min-height: calc(100vh - 64px);
}

/* Sidebar Overlay */
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 80;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Desktop Layout */
@media (min-width: 1024px) {
  .menu-toggle {
    display: none;
  }

  .sidebar {
    transform: translateX(0);
  }

  .sidebar-overlay {
    display: none;
  }

  .main-content {
    margin-left: 280px;
  }

  .main-content.sidebar-collapsed {
    margin-left: 80px;
  }
}

/* Mobile Layout */
@media (max-width: 1023px) {
  .sidebar.open {
    transform: translateX(0);
  }

  .breadcrumbs {
    display: none;
  }

  .global-search {
    width: 200px;
  }

  .user-name {
    display: none;
  }
}

@media (max-width: 768px) {
  .top-nav {
    padding: 0 16px;
  }

  .nav-left {
    gap: 16px;
  }

  .nav-right {
    gap: 8px;
  }

  .global-search {
    width: 160px;
  }

  .content-wrapper {
    padding: 16px;
  }
}
</style>