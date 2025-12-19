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
            <!-- Section Title with Collapse Toggle -->
            <div 
              v-if="section.title && !sidebarCollapsed" 
              class="section-title"
              :class="{ collapsible: section.items.some(item => item.children) }"
              @click="toggleSection(section.title)"
            >
              {{ section.title }}
              <svg 
                v-if="section.items.some(item => item.children)"
                class="section-toggle"
                :class="{ collapsed: collapsedSections.has(section.title) }"
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor"
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
            
            <!-- Navigation Items -->
            <div 
              class="nav-items"
              :class="{ collapsed: collapsedSections.has(section.title) }"
            >
              <template v-for="item in section.items" :key="item.path">
                <!-- Parent Item (with or without children) -->
                <div class="nav-item-wrapper">
                  <router-link
                    v-if="!item.children"
                    :to="item.path"
                    class="nav-item"
                    :class="{ active: isActive(item.path) }"
                    :title="sidebarCollapsed ? item.label : ''"
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
                  
                  <!-- Parent Item with Children -->
                  <div
                    v-else
                    class="nav-item nav-parent"
                    :class="{ 
                      active: isActiveParent(item), 
                      expanded: !collapsedSections.has(item.path) 
                    }"
                    :title="sidebarCollapsed ? item.label : ''"
                    @click="toggleNavItem(item.path)"
                  >
                    <component :is="item.icon" class="nav-icon" />
                    <span v-if="!sidebarCollapsed" class="nav-label">{{ item.label }}</span>
                    <svg 
                      v-if="!sidebarCollapsed"
                      class="nav-toggle"
                      :class="{ collapsed: collapsedSections.has(item.path) }"
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor"
                    >
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </div>
                  
                  <!-- Children Items -->
                  <div 
                    v-if="item.children && !sidebarCollapsed"
                    class="nav-children"
                    :class="{ collapsed: collapsedSections.has(item.path) }"
                  >
                    <router-link
                      v-for="child in item.children"
                      :key="child.path"
                      :to="child.path"
                      class="nav-item nav-child"
                      :class="{ active: isActive(child.path) }"
                      @click="closeMobileSidebar"
                    >
                      <component :is="child.icon" class="nav-icon" />
                      <span class="nav-label">{{ child.label }}</span>
                      <AdminStatusBadge
                        v-if="child.badge"
                        :text="child.badge.text"
                        :status="child.badge.status"
                        variant="soft"
                        size="xs"
                        class="nav-badge"
                      />
                    </router-link>
                  </div>
                </div>
              </template>
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
  children?: MenuItem[]
}

interface MenuSection {
  title: string
  items: MenuItem[]
  collapsed?: boolean
}

// Icons
const DashboardIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>'
const ChartIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>'
const MapIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>'
const UsersIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>'
const UserIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
const CarIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>'
const OrderIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>'
const PackageIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/></svg>'
const ShoppingIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>'
const QueueIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>'
const TruckIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>'
const LaundryIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="12" cy="14" r="5"/><path d="M8 6h2M14 6h2"/></svg>'
const StarIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
const WalletIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>'
const CreditCardIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>'
const DollarIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>'
const GiftIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>'
const TagIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>'
const HeartIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>'
const CalendarIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
const RepeatIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>'
const BellIcon2 = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>'
const MessageIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>'
const HelpIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
const AlertIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
const ShieldIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
const BuildingIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="2" width="16" height="20"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/></svg>'
const TrendingIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>'
const ActivityIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>'
const PieChartIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/></svg>'
const TargetIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>'
const AwardIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>'
const ZapIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
const FlagIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>'
const ToggleIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="16" cy="12" r="3"/></svg>'
const TestIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>'
const ServerIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>'
const ClockIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
const FileIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>'
const SettingsIcon2 = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>'
const GridIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'
const XCircleIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
const CheckCircleIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
const BarChartIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>'
const MousePointerIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>'

// State for collapsible sections
const collapsedSections = ref<Set<string>>(new Set())

// Initialize some sections as collapsed by default for better UX
const defaultCollapsedSections = [
  '/admin/development-tools',
  '/admin/system-monitoring'
]

const menuSections = ref<MenuSection[]>([
  // ═══════════════════════════════════════════════════════════════
  // หลัก - Main Navigation (ไม่มี section title)
  // ═══════════════════════════════════════════════════════════════
  {
    title: '',
    items: [
      { path: '/admin/dashboard', label: 'แดชบอร์ด', icon: { template: DashboardIcon } },
      { path: '/admin/orders', label: 'ออเดอร์', icon: { template: OrderIcon }, badge: { text: 'New', status: 'info' } },
      { path: '/admin/live-map', label: 'แผนที่สด', icon: { template: MapIcon } }
    ]
  },
  
  // ═══════════════════════════════════════════════════════════════
  // 👥 ผู้ใช้ - Users Management
  // ═══════════════════════════════════════════════════════════════
  {
    title: 'ผู้ใช้',
    items: [
      { path: '/admin/customers', label: 'ลูกค้า', icon: { template: UserIcon } },
      { path: '/admin/providers', label: 'ผู้ให้บริการ', icon: { template: CarIcon } },
      { path: '/admin/verification-queue', label: 'คิวตรวจสอบ', icon: { template: CheckCircleIcon }, badge: { text: '3', status: 'warning' } }
    ]
  },
  
  // ═══════════════════════════════════════════════════════════════
  // 📦 บริการ - Services
  // ═══════════════════════════════════════════════════════════════
  {
    title: 'บริการ',
    items: [
      { 
        path: '/admin/ride-services', 
        label: 'เรียกรถ', 
        icon: { template: CarIcon },
        children: [
          { path: '/admin/driver-tracking', label: 'ติดตามคนขับ', icon: { template: MapIcon } },
          { path: '/admin/scheduled-rides', label: 'นัดหมาย', icon: { template: CalendarIcon } },
          { path: '/admin/recurring-rides', label: 'เดินทางประจำ', icon: { template: RepeatIcon } }
        ]
      },
      { 
        path: '/admin/delivery-services', 
        label: 'ส่งของ', 
        icon: { template: PackageIcon },
        children: [
          { path: '/admin/delivery', label: 'ส่งของทั่วไป', icon: { template: PackageIcon } },
          { path: '/admin/shopping', label: 'ช้อปปิ้ง', icon: { template: ShoppingIcon } }
        ]
      },
      { 
        path: '/admin/special-services', 
        label: 'บริการอื่นๆ', 
        icon: { template: ZapIcon },
        children: [
          { path: '/admin/queue-bookings', label: 'จองคิว', icon: { template: QueueIcon } },
          { path: '/admin/moving', label: 'ขนย้าย', icon: { template: TruckIcon } },
          { path: '/admin/laundry', label: 'ซักผ้า', icon: { template: LaundryIcon } }
        ]
      },
      { path: '/admin/cancellations', label: 'ยกเลิก', icon: { template: XCircleIcon } }
    ]
  },
  
  // ═══════════════════════════════════════════════════════════════
  // 💰 การเงิน - Finance
  // ═══════════════════════════════════════════════════════════════
  {
    title: 'การเงิน',
    items: [
      { path: '/admin/revenue', label: 'รายได้', icon: { template: TrendingIcon } },
      { path: '/admin/payments', label: 'การชำระเงิน', icon: { template: CreditCardIcon } },
      { path: '/admin/refunds', label: 'คืนเงิน', icon: { template: CheckCircleIcon } },
      { 
        path: '/admin/wallet-system', 
        label: 'กระเป๋าเงิน', 
        icon: { template: WalletIcon },
        children: [
          { path: '/admin/wallets', label: 'ยอดเงิน', icon: { template: WalletIcon } },
          { path: '/admin/topup-requests', label: 'คำขอเติมเงิน', icon: { template: DollarIcon } }
        ]
      },
      { 
        path: '/admin/provider-earnings', 
        label: 'รายได้คนขับ', 
        icon: { template: DollarIcon },
        children: [
          { path: '/admin/withdrawals', label: 'ถอนเงิน', icon: { template: DollarIcon } },
          { path: '/admin/tips', label: 'ทิป', icon: { template: HeartIcon } }
        ]
      }
    ]
  },
  
  // ═══════════════════════════════════════════════════════════════
  // 🎁 Marketing
  // ═══════════════════════════════════════════════════════════════
  {
    title: 'Marketing',
    items: [
      { path: '/admin/promos', label: 'โปรโมโค้ด', icon: { template: TagIcon } },
      { path: '/admin/referrals', label: 'แนะนำเพื่อน', icon: { template: GiftIcon } },
      { path: '/admin/loyalty', label: 'Loyalty', icon: { template: AwardIcon } },
      { path: '/admin/incentives', label: 'โบนัสคนขับ', icon: { template: ZapIcon } },
      { path: '/admin/subscriptions', label: 'แพ็กเกจ', icon: { template: RepeatIcon } }
    ]
  },
  
  // ═══════════════════════════════════════════════════════════════
  // ⭐ Support
  // ═══════════════════════════════════════════════════════════════
  {
    title: 'Support',
    items: [
      { path: '/admin/ratings', label: 'รีวิว', icon: { template: StarIcon } },
      { path: '/admin/feedback', label: 'Feedback', icon: { template: MessageIcon } },
      { path: '/admin/support', label: 'Tickets', icon: { template: HelpIcon } },
      { path: '/admin/fraud-alerts', label: 'ทุจริต', icon: { template: AlertIcon } },
      { path: '/admin/corporate', label: 'องค์กร', icon: { template: BuildingIcon } }
    ]
  },
  
  // ═══════════════════════════════════════════════════════════════
  // 📈 รายงาน
  // ═══════════════════════════════════════════════════════════════
  {
    title: 'รายงาน',
    items: [
      { path: '/admin/analytics', label: 'วิเคราะห์', icon: { template: ChartIcon } },
      { path: '/admin/reports', label: 'รายงาน', icon: { template: FileIcon } },
      { path: '/admin/ux-analytics', label: 'UX Analytics', icon: { template: MousePointerIcon } }
    ]
  },
  
  // ═══════════════════════════════════════════════════════════════
  // ⚙️ ตั้งค่า
  // ═══════════════════════════════════════════════════════════════
  {
    title: 'ตั้งค่า',
    items: [
      { path: '/admin/settings', label: 'ทั่วไป', icon: { template: SettingsIcon2 } },
      { path: '/admin/notifications', label: 'แจ้งเตือน', icon: { template: BellIcon2 } },
      { path: '/admin/service-areas', label: 'พื้นที่บริการ', icon: { template: MapIcon } },
      { 
        path: '/admin/advanced', 
        label: 'ขั้นสูง', 
        icon: { template: ServerIcon },
        children: [
          { path: '/admin/surge', label: 'Surge Pricing', icon: { template: TrendingIcon } },
          { path: '/admin/feature-flags', label: 'Feature Flags', icon: { template: ToggleIcon } },
          { path: '/admin/ab-tests', label: 'A/B Tests', icon: { template: TestIcon } }
        ]
      },
      { 
        path: '/admin/system-monitoring', 
        label: 'ระบบ', 
        icon: { template: ActivityIcon },
        children: [
          { path: '/admin/system-health', label: 'สุขภาพระบบ', icon: { template: ServerIcon } },
          { path: '/admin/performance', label: 'Performance', icon: { template: ActivityIcon } },
          { path: '/admin/audit-log', label: 'Audit Log', icon: { template: ClockIcon } },
          { path: '/admin/error-recovery', label: 'Error Recovery', icon: { template: AlertIcon } },
          { path: '/admin/components', label: 'Components', icon: { template: GridIcon } }
        ]
      }
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

const toggleSection = (sectionTitle: string) => {
  if (collapsedSections.value.has(sectionTitle)) {
    collapsedSections.value.delete(sectionTitle)
  } else {
    collapsedSections.value.add(sectionTitle)
  }
  // Save to localStorage
  localStorage.setItem('admin_collapsed_sections', JSON.stringify([...collapsedSections.value]))
}

const toggleNavItem = (itemPath: string) => {
  if (collapsedSections.value.has(itemPath)) {
    collapsedSections.value.delete(itemPath)
  } else {
    collapsedSections.value.add(itemPath)
  }
  // Save to localStorage
  localStorage.setItem('admin_collapsed_sections', JSON.stringify([...collapsedSections.value]))
}

const isActive = (path: string) => {
  if (path === '/admin/dashboard') return route.path === '/admin/dashboard'
  return route.path.startsWith(path)
}

const isActiveParent = (item: MenuItem) => {
  if (!item.children) return false
  return item.children.some(child => isActive(child.path)) || isActive(item.path)
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

// Auto-expand parent when child is active
const autoExpandActiveParents = () => {
  menuSections.value.forEach(section => {
    section.items.forEach(item => {
      if (item.children && isActiveParent(item)) {
        collapsedSections.value.delete(item.path)
      }
    })
  })
}

// Lifecycle
onMounted(() => {
  const collapsed = localStorage.getItem('admin_sidebar_collapsed')
  if (collapsed === 'true') {
    sidebarCollapsed.value = true
  }
  
  // Load collapsed sections
  const collapsedSectionsData = localStorage.getItem('admin_collapsed_sections')
  if (collapsedSectionsData) {
    try {
      const sections = JSON.parse(collapsedSectionsData)
      collapsedSections.value = new Set(sections)
    } catch (e) {
      console.warn('Failed to parse collapsed sections from localStorage')
    }
  } else {
    // Set default collapsed sections for first-time users
    collapsedSections.value = new Set(defaultCollapsedSections)
    localStorage.setItem('admin_collapsed_sections', JSON.stringify(defaultCollapsedSections))
  }
  
  // Auto-expand active parents
  autoExpandActiveParents()
})

// Watch route changes to auto-expand parents
watch(() => route.path, () => {
  autoExpandActiveParents()
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
  margin-bottom: 24px;
}

.nav-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 24px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title.collapsible {
  cursor: pointer;
  transition: color 0.2s;
  user-select: none;
}

.section-title.collapsible:hover {
  color: #666666;
}

.section-toggle {
  width: 16px;
  height: 16px;
  transition: transform 0.2s;
}

.section-toggle.collapsed {
  transform: rotate(-90deg);
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 12px;
  transition: all 0.3s ease;
  overflow: hidden;
}

.nav-items.collapsed {
  max-height: 0;
  padding: 0 12px;
  opacity: 0;
}

.nav-item-wrapper {
  display: flex;
  flex-direction: column;
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
  cursor: pointer;
}

.nav-item:hover {
  background: #F5F5F5;
  color: #1A1A1A;
}

.nav-item.active {
  background: #E8F5EF;
  color: #00A86B;
}

.nav-parent {
  cursor: pointer;
  user-select: none;
  position: relative;
}

.nav-parent.expanded {
  background: #F8F8F8;
}

.nav-parent:hover {
  background: #F5F5F5;
}

.nav-parent.active {
  background: #E8F5EF;
  color: #00A86B;
}

.nav-toggle {
  width: 16px;
  height: 16px;
  margin-left: auto;
  transition: transform 0.2s;
}

.nav-toggle.collapsed {
  transform: rotate(-90deg);
}

.nav-children {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-left: 16px;
  margin-top: 4px;
  padding-left: 16px;
  border-left: 2px solid #E8F5EF;
  transition: all 0.3s ease;
  overflow: hidden;
}

.nav-children.collapsed {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  margin-bottom: 0;
}

.nav-child {
  padding: 8px 12px;
  font-size: 13px;
  border-radius: 8px;
  margin: 0;
}

.nav-child .nav-icon {
  width: 16px;
  height: 16px;
}

.nav-child:hover {
  background: #F0F0F0;
}

.nav-child.active {
  background: #E8F5EF;
  color: #00A86B;
  font-weight: 600;
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

.sidebar.collapsed .nav-parent {
  justify-content: center;
  padding: 12px;
}

.sidebar.collapsed .nav-children {
  display: none;
}

.sidebar.collapsed .nav-toggle {
  display: none;
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