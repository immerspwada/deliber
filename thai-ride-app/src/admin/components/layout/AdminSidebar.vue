<!--
  Admin Sidebar Component
  ======================
  Navigation sidebar for admin dashboard
-->

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminUIStore } from '../../stores/adminUI.store'

const route = useRoute()
const router = useRouter()
const uiStore = useAdminUIStore()

// Navigation menu structure
const menuSections = [
  {
    title: '',
    items: [
      { path: '/admin/dashboard', label: 'แดชบอร์ด', icon: 'dashboard' }
    ]
  },
  {
    title: 'ผู้ใช้งาน',
    items: [
      { path: '/admin/customers', label: 'ลูกค้า', icon: 'users' },
      { path: '/admin/providers', label: 'ผู้ให้บริการ', icon: 'car' },
      { path: '/admin/verification-queue', label: 'คิวตรวจสอบ', icon: 'check' }
    ]
  },
  {
    title: 'ออเดอร์',
    items: [
      { path: '/admin/orders', label: 'ออเดอร์ทั้งหมด', icon: 'orders' },
      { path: '/admin/delivery', label: 'ส่งของ', icon: 'package' },
      { path: '/admin/shopping', label: 'ช้อปปิ้ง', icon: 'cart' },
      { path: '/admin/driver-tracking', label: 'ติดตามคนขับ', icon: 'map' },
      { path: '/admin/scheduled-rides', label: 'นัดหมาย', icon: 'calendar' }
    ]
  },
  {
    title: 'การเงิน',
    items: [
      { path: '/admin/revenue', label: 'รายได้', icon: 'dollar' },
      { path: '/admin/payments', label: 'การชำระเงิน', icon: 'credit-card' },
      { path: '/admin/withdrawals', label: 'ถอนเงิน', icon: 'arrow-down' },
      { path: '/admin/topup-requests', label: 'เติมเงิน', icon: 'plus' }
    ]
  },
  {
    title: 'การตลาด',
    items: [
      { path: '/admin/promos', label: 'โปรโมชั่น', icon: 'tag' }
    ]
  },
  {
    title: 'รายงาน',
    items: [
      { path: '/admin/analytics', label: 'วิเคราะห์', icon: 'chart' },
      { path: '/admin/push-analytics', label: 'Push Notifications', icon: 'bell' },
      { path: '/admin/cron-jobs', label: 'Cron Jobs', icon: 'clock' },
      { path: '/admin/provider-heatmap', label: 'Heatmap', icon: 'map' }
    ]
  },
  {
    title: 'ตั้งค่า',
    items: [
      { path: '/admin/settings', label: 'ตั้งค่าทั่วไป', icon: 'settings' },
      { path: '/admin/system-health', label: 'สุขภาพระบบ', icon: 'heart' }
    ]
  }
]

const isActive = (path: string) => {
  if (path === '/admin/dashboard') {
    return route.path === '/admin' || route.path === '/admin/dashboard'
  }
  return route.path.startsWith(path)
}

const navigate = (path: string) => {
  router.push(path)
  uiStore.closeSidebar()
}
</script>

<template>
  <aside 
    class="admin-sidebar"
    :class="{ 
      'collapsed': uiStore.sidebarCollapsed,
      'open': uiStore.sidebarOpen 
    }"
  >
    <!-- Logo -->
    <div class="sidebar-logo">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
      <span v-if="!uiStore.sidebarCollapsed" class="logo-text">GOBEAR Admin</span>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <div 
        v-for="section in menuSections" 
        :key="section.title" 
        class="nav-section"
      >
        <div 
          v-if="section.title && !uiStore.sidebarCollapsed" 
          class="section-title"
        >
          {{ section.title }}
        </div>
        
        <button
          v-for="item in section.items"
          :key="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
          :title="item.label"
          @click="navigate(item.path)"
        >
          <!-- Icons -->
          <svg v-if="item.icon === 'dashboard'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/>
            <rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
          </svg>
          <svg v-else-if="item.icon === 'users'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
          <svg v-else-if="item.icon === 'car'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <svg v-else-if="item.icon === 'check'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <svg v-else-if="item.icon === 'orders'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
          </svg>
          <svg v-else-if="item.icon === 'package'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          <svg v-else-if="item.icon === 'cart'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
          </svg>
          <svg v-else-if="item.icon === 'dollar'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
          <svg v-else-if="item.icon === 'credit-card'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
          </svg>
          <svg v-else-if="item.icon === 'arrow-down'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M19 12l-7 7-7-7"/>
          </svg>
          <svg v-else-if="item.icon === 'settings'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          <svg v-else-if="item.icon === 'map'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
          </svg>
          <svg v-else-if="item.icon === 'calendar'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <svg v-else-if="item.icon === 'plus'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v8M8 12h8"/>
          </svg>
          <svg v-else-if="item.icon === 'tag'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
            <circle cx="7" cy="7" r="1"/>
          </svg>
          <svg v-else-if="item.icon === 'chart'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 20V10M12 20V4M6 20v-6"/>
          </svg>
          <svg v-else-if="item.icon === 'bell'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <svg v-else-if="item.icon === 'clock'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <svg v-else-if="item.icon === 'heart'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
          
          <span v-if="!uiStore.sidebarCollapsed" class="nav-label">
            {{ item.label }}
          </span>
        </button>
      </div>
    </nav>
  </aside>
</template>

<style scoped>
.admin-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 260px;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease, transform 0.3s ease;
  z-index: 200;
}

.admin-sidebar.collapsed {
  width: 72px;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  color: #00a86b;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  white-space: nowrap;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 12px 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  background: none;
  border: none;
  border-radius: 8px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.nav-item:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.nav-item.active {
  background: #e8f5ef;
  color: #00a86b;
  font-weight: 500;
}

.nav-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collapsed .nav-item {
  justify-content: center;
  padding: 12px;
}

/* Mobile */
@media (max-width: 1024px) {
  .admin-sidebar {
    transform: translateX(-100%);
  }
  
  .admin-sidebar.open {
    transform: translateX(0);
  }
  
  .admin-sidebar.collapsed {
    width: 260px;
  }
}
</style>
