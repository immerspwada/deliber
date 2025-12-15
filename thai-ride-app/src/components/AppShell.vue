<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const navigationItems = [
  { name: 'หน้าหลัก', path: '/', icon: 'home' },
  { name: 'บริการ', path: '/services', icon: 'services' },
  { name: 'โปรไฟล์', path: '/profile', icon: 'user' }
]

const activeIndex = ref(0)

const navigateTo = (path: string, index: number) => {
  activeIndex.value = index
  router.push(path)
}

const isActive = (path: string) => {
  if (path === '/services') {
    return ['/services', '/ride', '/delivery', '/shopping'].includes(route.path)
  }
  return route.path === path
}

const showHeader = computed(() => {
  return !['/', '/login', '/register'].includes(route.path)
})

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/services': 'บริการ',
    '/ride': 'เรียกรถ',
    '/delivery': 'ส่งของ',
    '/shopping': 'ซื้อของ',
    '/profile': 'โปรไฟล์',
    '/provider': 'ผู้ให้บริการ',
    '/history': 'ประวัติการใช้งาน',
    '/payment-methods': 'วิธีการชำระเงิน',
    '/notifications': 'การแจ้งเตือน'
  }
  return titles[route.path] || 'ThaiRide'
})

const canGoBack = computed(() => {
  return route.path !== '/' && window.history.length > 1
})

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="app-shell">
    <header v-if="showHeader" class="header">
      <div class="header-content">
        <button v-if="canGoBack" @click="goBack" class="back-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div v-else class="logo">
          <span class="logo-text">ThaiRide</span>
        </div>
        <h1 v-if="canGoBack" class="header-title">{{ pageTitle }}</h1>
        <div class="header-spacer"></div>
      </div>
    </header>

    <main class="main-content" :class="{ 'no-header': !showHeader }">
      <slot />
    </main>

    <nav class="bottom-nav">
      <div class="nav-container">
        <button
          v-for="(item, index) in navigationItems"
          :key="item.path"
          @click="navigateTo(item.path, index)"
          :class="['nav-item', { 'nav-item-active': isActive(item.path) }]"
        >
          <div class="nav-icon-wrapper">
            <svg v-if="item.icon === 'home'" class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            <svg v-else-if="item.icon === 'services'" class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
            </svg>
            <svg v-else class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <span class="active-dot" v-if="isActive(item.path)"></span>
          </div>
          <span class="nav-label">{{ item.name }}</span>
        </button>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-background);
}

.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(12px);
  background-color: rgba(255, 255, 255, 0.9);
}

.header-content {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  max-width: 480px;
  margin: 0 auto;
  min-height: 56px;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 50%;
  margin-left: -8px;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background-color: var(--color-secondary);
}

.back-btn:active {
  transform: scale(0.95);
}

.back-btn svg {
  width: 24px;
  height: 24px;
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.header-title {
  flex: 1;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
}

.header-spacer {
  width: 40px;
}

.main-content {
  flex: 1;
  padding-bottom: 88px;
}

/* Bottom Navigation */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
  z-index: 100;
  backdrop-filter: blur(12px);
  background-color: rgba(255, 255, 255, 0.95);
}

.nav-container {
  display: flex;
  justify-content: space-around;
  max-width: 480px;
  margin: 0 auto;
  padding: 8px 0;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 20px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  transition: all 0.2s ease;
  position: relative;
}

.nav-item:active {
  transform: scale(0.95);
}

.nav-item-active {
  color: var(--color-text-primary);
}

.nav-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.nav-icon {
  width: 24px;
  height: 24px;
  transition: transform 0.2s ease;
}

.nav-item-active .nav-icon {
  transform: scale(1.1);
}

.active-dot {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  background-color: var(--color-primary);
  border-radius: 50%;
  animation: scaleIn 0.2s ease-out;
}

@keyframes scaleIn {
  from {
    transform: translateX(-50%) scale(0);
  }
  to {
    transform: translateX(-50%) scale(1);
  }
}

.nav-label {
  font-size: 10px;
  font-weight: 500;
  margin-top: 4px;
}
</style>
