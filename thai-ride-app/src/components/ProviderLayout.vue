<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Get demo user info
const userName = computed(() => {
  const demoUser = localStorage.getItem('demo_user')
  if (demoUser) {
    try {
      return JSON.parse(demoUser).name || 'ผู้ให้บริการ'
    } catch {
      return 'ผู้ให้บริการ'
    }
  }
  return authStore.user?.name || 'ผู้ให้บริการ'
})

const userRole = computed(() => {
  const demoUser = localStorage.getItem('demo_user')
  if (demoUser) {
    try {
      const role = JSON.parse(demoUser).role
      return role === 'driver' ? 'คนขับรถ' : 'ไรเดอร์'
    } catch {
      return 'ผู้ให้บริการ'
    }
  }
  return authStore.user?.role === 'driver' ? 'คนขับรถ' : 'ไรเดอร์'
})

// Navigation items for provider
const navItems = [
  { name: 'งาน', path: '/provider', icon: 'work' },
  { name: 'รายได้', path: '/provider/earnings', icon: 'earnings' },
  { name: 'ประวัติ', path: '/provider/history', icon: 'history' },
  { name: 'โปรไฟล์', path: '/provider/profile', icon: 'user' }
]

const isActive = (path: string) => {
  if (path === '/provider') {
    return route.path === '/provider' || route.path === '/provider/requests' || route.path === '/provider/active'
  }
  return route.path === path
}

const navigateTo = (path: string) => {
  router.push(path)
}

const logout = () => {
  localStorage.removeItem('demo_mode')
  localStorage.removeItem('demo_user')
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="provider-layout">
    <!-- Header -->
    <header class="provider-header">
      <div class="header-content">
        <div class="header-left">
          <span class="logo">ThaiRide</span>
          <span class="role-badge">{{ userRole }}</span>
        </div>
        <div class="header-right">
          <button @click="logout" class="logout-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="provider-main">
      <slot />
    </main>

    <!-- Bottom Navigation -->
    <nav class="provider-nav">
      <div class="nav-container">
        <button
          v-for="item in navItems"
          :key="item.path"
          @click="navigateTo(item.path)"
          :class="['nav-item', { active: isActive(item.path) }]"
        >
          <div class="nav-icon-wrapper">
            <!-- Work Icon -->
            <svg v-if="item.icon === 'work'" class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
            <!-- Earnings Icon -->
            <svg v-else-if="item.icon === 'earnings'" class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <!-- History Icon -->
            <svg v-else-if="item.icon === 'history'" class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <!-- User Icon -->
            <svg v-else class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <span v-if="isActive(item.path)" class="active-dot"></span>
          </div>
          <span class="nav-label">{{ item.name }}</span>
        </button>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.provider-layout {
  min-height: 100vh;
  background-color: #F6F6F6;
  display: flex;
  flex-direction: column;
}

/* Header */
.provider-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: #000000;
  color: #FFFFFF;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  max-width: 480px;
  margin: 0 auto;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.role-badge {
  padding: 4px 10px;
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.logout-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #FFFFFF;
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.logout-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

/* Main Content */
.provider-main {
  flex: 1;
  padding-bottom: 90px;
}

/* Bottom Navigation */
.provider-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #FFFFFF;
  border-top: 1px solid #E5E5E5;
  z-index: 100;
}

.nav-container {
  display: flex;
  justify-content: space-around;
  max-width: 480px;
  margin: 0 auto;
  padding: 6px 8px;
  padding-bottom: max(6px, env(safe-area-inset-bottom));
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  background: none;
  border: none;
  cursor: pointer;
  color: #6B6B6B;
  transition: all 0.2s ease;
  min-height: 56px;
  min-width: 64px;
  border-radius: 12px;
}

.nav-item:active {
  transform: scale(0.95);
}

.nav-item.active {
  color: #000000;
}

.nav-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
}

.nav-item.active .nav-icon-wrapper {
  background-color: rgba(0, 0, 0, 0.08);
}

.nav-icon {
  width: 24px;
  height: 24px;
}

.nav-item.active .nav-icon {
  stroke-width: 2.5;
}

.active-dot {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 5px;
  height: 5px;
  background-color: #000000;
  border-radius: 50%;
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
  margin-top: 4px;
}
</style>
