<script setup lang="ts">
/**
 * ProviderLayoutNew - Layout ใหม่สำหรับ Provider
 * Design: Green theme (#00A86B) ตาม reference UI
 * 
 * Features:
 * - Green gradient header with earnings
 * - Bottom navigation: Home, Wallet, Chat, Profile
 * - Role switcher modal
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../lib/supabase'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// State
const showRoleSwitcher = ref(false)
const providerData = ref<{
  first_name?: string
  last_name?: string
  service_types?: string[]
  rating?: number
  total_trips?: number
} | null>(null)

// Computed
const displayName = computed(() => {
  if (!providerData.value) return 'Partner'
  const first = providerData.value.first_name || ''
  const last = providerData.value.last_name || ''
  return `${first} ${last}`.trim() || 'Partner'
})

// Navigation items
const navItems = [
  { name: 'หน้าหลัก', path: '/provider', icon: 'home' },
  { name: 'กระเป๋าเงิน', path: '/provider/wallet', icon: 'wallet' },
  { name: 'แชท', path: '/provider/chat', icon: 'chat' },
  { name: 'โปรไฟล์', path: '/provider/profile', icon: 'profile' }
]

const isActive = (path: string) => {
  if (path === '/provider') {
    return route.path === '/provider' || route.path === '/provider/home'
  }
  return route.path.startsWith(path)
}

// Hide nav on detail pages
const hideNavBar = computed(() => {
  return route.path.includes('/job/') || route.path.includes('/order/')
})

// Methods
const navigateTo = (path: string) => router.push(path)

const switchToCustomer = () => {
  showRoleSwitcher.value = false
  router.push('/customer')
}

const logout = async () => {
  try {
    await authStore.logout()
    router.push('/login')
  } catch {
    router.push('/login')
  }
}

// Load provider data
onMounted(async () => {
  if (authStore.user?.id) {
    const { data } = await supabase
      .from('providers_v2')
      .select('first_name, last_name, service_types, rating, total_trips')
      .eq('user_id', authStore.user.id)
      .maybeSingle()
    
    if (data) providerData.value = data
  }
})
</script>

<template>
  <div class="provider-layout-new">
    <!-- Main Content -->
    <main class="provider-main">
      <router-view />
    </main>

    <!-- Bottom Navigation -->
    <nav v-if="!hideNavBar" class="bottom-nav">
      <button
        v-for="item in navItems"
        :key="item.path"
        @click="navigateTo(item.path)"
        :class="['nav-item', { active: isActive(item.path) }]"
        type="button"
        :aria-label="item.name"
      >
        <!-- Home Icon -->
        <svg v-if="item.icon === 'home'" class="nav-icon" viewBox="0 0 24 24" fill="none">
          <path 
            d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" 
            :stroke="isActive(item.path) ? '#00A86B' : '#9CA3AF'"
            :fill="isActive(item.path) ? '#00A86B' : 'none'"
            stroke-width="2"
          />
          <path 
            d="M9 22V12h6v10" 
            :stroke="isActive(item.path) ? '#fff' : '#9CA3AF'"
            stroke-width="2"
          />
        </svg>
        
        <!-- Wallet Icon -->
        <svg v-else-if="item.icon === 'wallet'" class="nav-icon" viewBox="0 0 24 24" fill="none">
          <rect 
            x="2" y="6" width="20" height="14" rx="2"
            :stroke="isActive(item.path) ? '#00A86B' : '#9CA3AF'"
            :fill="isActive(item.path) ? '#00A86B' : 'none'"
            stroke-width="2"
          />
          <path 
            d="M16 14a2 2 0 100-4 2 2 0 000 4z"
            :fill="isActive(item.path) ? '#fff' : '#9CA3AF'"
          />
          <path 
            d="M2 10h20"
            :stroke="isActive(item.path) ? '#fff' : '#9CA3AF'"
            stroke-width="2"
          />
        </svg>
        
        <!-- Chat Icon -->
        <svg v-else-if="item.icon === 'chat'" class="nav-icon" viewBox="0 0 24 24" fill="none">
          <path 
            d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
            :stroke="isActive(item.path) ? '#00A86B' : '#9CA3AF'"
            :fill="isActive(item.path) ? '#00A86B' : 'none'"
            stroke-width="2"
          />
          <path 
            d="M8 10h8M8 14h4"
            :stroke="isActive(item.path) ? '#fff' : '#9CA3AF'"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        
        <!-- Profile Icon -->
        <svg v-else-if="item.icon === 'profile'" class="nav-icon" viewBox="0 0 24 24" fill="none">
          <circle 
            cx="12" cy="8" r="4"
            :stroke="isActive(item.path) ? '#00A86B' : '#9CA3AF'"
            :fill="isActive(item.path) ? '#00A86B' : 'none'"
            stroke-width="2"
          />
          <path 
            d="M20 21a8 8 0 10-16 0"
            :stroke="isActive(item.path) ? '#00A86B' : '#9CA3AF'"
            :fill="isActive(item.path) ? '#00A86B' : 'none'"
            stroke-width="2"
          />
        </svg>
        
        <span class="nav-label">{{ item.name }}</span>
      </button>
    </nav>

    <!-- Role Switcher Modal -->
    <Teleport to="body">
      <div
        v-if="showRoleSwitcher"
        class="modal-overlay"
        @click.self="showRoleSwitcher = false"
      >
        <div class="modal-content">
          <div class="modal-header">
            <h3>สลับโหมด</h3>
            <button class="close-btn" @click="showRoleSwitcher = false" aria-label="ปิด">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div class="role-options">
            <button class="role-option active">
              <div class="role-icon provider">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
                </svg>
              </div>
              <div class="role-info">
                <span class="role-name">โหมดผู้ให้บริการ</span>
                <span class="role-desc">รับงาน เรียกรถ ส่งของ</span>
              </div>
              <svg class="check-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
            </button>
            
            <button class="role-option" @click="switchToCustomer">
              <div class="role-icon customer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <div class="role-info">
                <span class="role-name">โหมดลูกค้า</span>
                <span class="role-desc">เรียกรถ สั่งของ ใช้บริการ</span>
              </div>
              <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-footer">
            <button class="logout-btn" @click="logout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.provider-layout-new {
  min-height: 100vh;
  background: #F5F5F5;
  display: flex;
  flex-direction: column;
}

/* Main Content */
.provider-main {
  flex: 1;
  padding-bottom: 80px;
}

/* Bottom Navigation */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #FFFFFF;
  border-top: 1px solid #E5E5E5;
  display: flex;
  justify-content: space-around;
  padding: 8px 16px;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: none;
  border: none;
  cursor: pointer;
  min-width: 64px;
  min-height: 56px;
  border-radius: 12px;
  transition: all 0.2s;
}

.nav-item:active {
  transform: scale(0.95);
}

.nav-item.active {
  background: rgba(0, 168, 107, 0.08);
}

.nav-icon {
  width: 24px;
  height: 24px;
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
  color: #9CA3AF;
}

.nav-item.active .nav-label {
  color: #00A86B;
  font-weight: 600;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 100%;
  max-width: 480px;
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #E5E5E5;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.close-btn svg {
  width: 20px;
  height: 20px;
  color: #6B7280;
}

.role-options {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #F5F5F5;
  border: 2px solid transparent;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: all 0.2s;
}

.role-option.active {
  border-color: #00A86B;
  background: #E8F5EF;
}

.role-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.role-icon svg {
  width: 24px;
  height: 24px;
}

.role-icon.provider {
  background: #00A86B;
  color: #FFFFFF;
}

.role-icon.customer {
  background: #3B82F6;
  color: #FFFFFF;
}

.role-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.role-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.role-desc {
  font-size: 13px;
  color: #6B7280;
}

.check-icon {
  width: 24px;
  height: 24px;
  color: #00A86B;
}

.arrow-icon {
  width: 20px;
  height: 20px;
  color: #9CA3AF;
}

.modal-footer {
  padding: 16px 20px 24px;
  border-top: 1px solid #E5E5E5;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: none;
  border: 1px solid #FEE2E2;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  color: #EF4444;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:active {
  background: #FEF2F2;
}

.logout-btn svg {
  width: 20px;
  height: 20px;
}
</style>
