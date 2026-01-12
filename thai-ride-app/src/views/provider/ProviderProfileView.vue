<script setup lang="ts">
/**
 * Provider Profile View - หน้าโปรไฟล์
 * Clean, Minimal Design
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'
import { usePushNotification } from '../../composables/usePushNotification'

const router = useRouter()
const { isSupported: pushSupported, isSubscribed: pushEnabled, permission: pushPermission, loading: pushLoading, requestPermission, unsubscribe } = usePushNotification()

// State
const loading = ref(true)
const provider = ref<Record<string, unknown> | null>(null)

// Computed
const displayName = computed(() => {
  if (!provider.value) return ''
  return `${provider.value.first_name || ''} ${provider.value.last_name || ''}`.trim()
})

const initials = computed(() => {
  const first = (provider.value?.first_name as string)?.charAt(0) || ''
  const last = (provider.value?.last_name as string)?.charAt(0) || ''
  return (first + last).toUpperCase() || 'P'
})

const statusInfo = computed(() => {
  const s = provider.value?.status as string
  const map: Record<string, { text: string; class: string }> = {
    pending: { text: 'รอการอนุมัติ', class: 'pending' },
    approved: { text: 'อนุมัติแล้ว', class: 'success' },
    active: { text: 'ใช้งานได้', class: 'success' },
    suspended: { text: 'ถูกระงับ', class: 'error' },
    rejected: { text: 'ถูกปฏิเสธ', class: 'error' }
  }
  return map[s] || { text: s || '', class: '' }
})

const stats = computed(() => ({
  rating: (provider.value?.rating as number) || 5.0,
  trips: (provider.value?.total_trips as number) || 0,
  earnings: (provider.value?.total_earnings as number) || 0
}))

// Menu items
const menuItems = [
  { id: 'personal', icon: 'user', label: 'ข้อมูลส่วนตัว' },
  { id: 'vehicle', icon: 'car', label: 'ข้อมูลยานพาหนะ' },
  { id: 'documents', icon: 'file', label: 'เอกสาร' },
  { id: 'bank', icon: 'bank', label: 'บัญชีธนาคาร' },
  { id: 'settings', icon: 'settings', label: 'ตั้งค่า' },
  { id: 'help', icon: 'help', label: 'ช่วยเหลือ' }
]

// Toggle push notification
async function togglePushNotification() {
  if (pushEnabled.value) {
    await unsubscribe()
  } else {
    await requestPermission()
  }
}

// Methods
async function loadData() {
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('providers_v2')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data) provider.value = data
  } catch (err) {
    console.error('Load error:', err)
  } finally {
    loading.value = false
  }
}

function goToCustomer() {
  router.push('/customer')
}

async function logout() {
  await supabase.auth.signOut()
  router.replace('/login')
}

onMounted(loadData)
</script>

<template>
  <div class="profile-page">
    <!-- Loading -->
    <div v-if="loading" class="center-state">
      <div class="loader"></div>
    </div>

    <template v-else>
      <!-- Profile Header -->
      <div class="profile-header">
        <div class="avatar">{{ initials }}</div>
        <div class="profile-info">
          <h1 class="profile-name">{{ displayName }}</h1>
          <span class="profile-status" :class="statusInfo.class">
            {{ statusInfo.text }}
          </span>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value">{{ stats.rating.toFixed(1) }}</span>
          <span class="stat-label">คะแนน</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">{{ stats.trips }}</span>
          <span class="stat-label">งาน</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-value">฿{{ stats.earnings.toLocaleString() }}</span>
          <span class="stat-label">รายได้</span>
        </div>
      </div>

      <!-- Push Notification Toggle -->
      <div v-if="pushSupported" class="notification-card">
        <div class="notification-info">
          <div class="notification-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
          </div>
          <div class="notification-text">
            <span class="notification-label">การแจ้งเตือนงานใหม่</span>
            <span class="notification-desc">
              {{ pushPermission === 'denied' ? 'ถูกบล็อก - เปิดในการตั้งค่าเบราว์เซอร์' : 
                 pushEnabled ? 'เปิดใช้งานอยู่' : 'ปิดอยู่' }}
            </span>
          </div>
        </div>
        <button 
          class="toggle-btn"
          :class="{ active: pushEnabled, disabled: pushPermission === 'denied' }"
          :disabled="pushLoading || pushPermission === 'denied'"
          @click="togglePushNotification"
          :aria-label="pushEnabled ? 'ปิดการแจ้งเตือน' : 'เปิดการแจ้งเตือน'"
        >
          <span class="toggle-track">
            <span class="toggle-thumb"></span>
          </span>
        </button>
      </div>

      <!-- Menu -->
      <div class="menu-card">
        <button 
          v-for="item in menuItems" 
          :key="item.id"
          class="menu-item"
        >
          <div class="menu-icon">
            <svg v-if="item.icon === 'user'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="8" r="4"/>
              <path d="M20 21a8 8 0 10-16 0"/>
            </svg>
            <svg v-else-if="item.icon === 'car'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M5 11l1.5-4.5a2 2 0 011.9-1.5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
              <circle cx="7.5" cy="14.5" r="1.5"/>
              <circle cx="16.5" cy="14.5" r="1.5"/>
            </svg>
            <svg v-else-if="item.icon === 'file'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
            </svg>
            <svg v-else-if="item.icon === 'bank'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
            </svg>
            <svg v-else-if="item.icon === 'settings'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/>
            </svg>
          </div>
          <span class="menu-label">{{ item.label }}</span>
          <svg class="menu-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      <!-- Switch Mode -->
      <button class="switch-btn" @click="goToCustomer">
        <div class="switch-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <path d="M9 22V12h6v10"/>
          </svg>
        </div>
        <div class="switch-text">
          <span class="switch-label">สลับไปโหมดลูกค้า</span>
          <span class="switch-desc">เรียกรถ สั่งของ ใช้บริการ</span>
        </div>
        <svg class="switch-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      <!-- Logout -->
      <button class="logout-btn" @click="logout">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        ออกจากระบบ
      </button>

      <!-- Version -->
      <p class="version">GOBEAR Provider v1.0.0</p>
    </template>
  </div>
</template>

<style scoped>
.profile-page {
  padding: 20px 16px;
  min-height: calc(100vh - 130px);
}

.center-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.loader {
  width: 28px;
  height: 28px;
  border: 2px solid #f3f4f6;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Profile Header */
.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 20px;
  border: 1px solid #f0f0f0;
  margin-bottom: 16px;
}

.avatar {
  width: 64px;
  height: 64px;
  background: #000;
  color: #fff;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.profile-name {
  font-size: 20px;
  font-weight: 700;
  color: #111;
  margin: 0;
}

.profile-status {
  display: inline-flex;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  width: fit-content;
}

.profile-status.success {
  background: #dcfce7;
  color: #15803d;
}

.profile-status.pending {
  background: #fef3c7;
  color: #b45309;
}

.profile-status.error {
  background: #fee2e2;
  color: #b91c1c;
}

/* Stats Row */
.stats-row {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #f0f0f0;
  margin-bottom: 16px;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #111;
}

.stat-label {
  font-size: 12px;
  color: #9ca3af;
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: #f0f0f0;
}

/* Notification Card */
.notification-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
  margin-bottom: 16px;
}

.notification-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notification-icon {
  width: 44px;
  height: 44px;
  background: #fef3c7;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f59e0b;
}

.notification-icon svg {
  width: 22px;
  height: 22px;
}

.notification-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notification-label {
  font-size: 15px;
  font-weight: 600;
  color: #111;
}

.notification-desc {
  font-size: 12px;
  color: #6b7280;
}

.toggle-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
}

.toggle-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-track {
  display: block;
  width: 52px;
  height: 32px;
  background: #e5e7eb;
  border-radius: 16px;
  position: relative;
  transition: background 0.2s;
}

.toggle-btn.active .toggle-track {
  background: #10b981;
}

.toggle-thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.toggle-btn.active .toggle-thumb {
  transform: translateX(20px);
}

/* Menu Card */
.menu-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
  overflow: hidden;
  margin-bottom: 16px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: transparent;
  border: none;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background: #fafafa;
}

.menu-icon {
  width: 40px;
  height: 40px;
  background: #f3f4f6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.menu-icon svg {
  width: 20px;
  height: 20px;
}

.menu-label {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: #111;
}

.menu-arrow {
  width: 20px;
  height: 20px;
  color: #d1d5db;
}

/* Switch Button */
.switch-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  margin-bottom: 16px;
  transition: all 0.2s;
}

.switch-btn:active {
  transform: scale(0.99);
}

.switch-icon {
  width: 44px;
  height: 44px;
  background: #10b981;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.switch-icon svg {
  width: 22px;
  height: 22px;
}

.switch-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.switch-label {
  font-size: 15px;
  font-weight: 600;
  color: #065f46;
}

.switch-desc {
  font-size: 13px;
  color: #047857;
}

.switch-arrow {
  width: 20px;
  height: 20px;
  color: #10b981;
}

/* Logout */
.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px;
  background: #fff;
  border: 1px solid #fee2e2;
  border-radius: 16px;
  color: #dc2626;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 20px;
}

.logout-btn:active {
  background: #fef2f2;
}

.logout-btn svg {
  width: 20px;
  height: 20px;
}

/* Version */
.version {
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
  margin: 0;
}
</style>
