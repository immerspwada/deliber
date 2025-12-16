<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProvider } from '../../composables/useProvider'
import { useAuthStore } from '../../stores/auth'
import ProviderLayout from '../../components/ProviderLayout.vue'

const router = useRouter()
const authStore = useAuthStore()
const { profile, fetchProfile } = useProvider()

const isLoading = ref(true)

// Check if demo mode
const isDemoMode = computed(() => localStorage.getItem('demo_mode') === 'true')

// Get user info
const userInfo = computed(() => {
  if (isDemoMode.value) {
    const demoUser = localStorage.getItem('demo_user')
    if (demoUser) {
      try {
        return JSON.parse(demoUser)
      } catch {
        return null
      }
    }
  }
  return authStore.user
})

const userName = computed(() => userInfo.value?.name || 'ผู้ให้บริการ')
const userEmail = computed(() => userInfo.value?.email || '')
const userPhone = computed(() => userInfo.value?.phone || '0812345678')
const userRole = computed(() => {
  const role = userInfo.value?.role
  return role === 'driver' ? 'คนขับรถ' : 'ไรเดอร์'
})

// Menu items - Provider specific routes only
const menuItems = [
  { icon: 'car', label: 'ข้อมูลยานพาหนะ', path: '/provider/vehicle' },
  { icon: 'document', label: 'เอกสาร', path: '/provider/documents' },
  { icon: 'wallet', label: 'บัญชีธนาคาร', path: '/provider/bank' },
  { icon: 'bell', label: 'การแจ้งเตือน', path: '/provider/notifications' },
  { icon: 'help', label: 'ช่วยเหลือ', path: '/provider/help' },
  { icon: 'settings', label: 'ตั้งค่า', path: '/provider/settings' }
]

// Logout
const logout = () => {
  localStorage.removeItem('demo_mode')
  localStorage.removeItem('demo_user')
  authStore.logout()
  router.push('/login')
}

onMounted(async () => {
  await fetchProfile()
  isLoading.value = false
})
</script>

<template>
  <ProviderLayout>
    <div class="profile-page">
      <div class="page-content">
        <!-- Profile Header -->
        <div class="profile-header">
          <div class="avatar">
            <span class="avatar-text">{{ userName.charAt(0) }}</span>
          </div>
          <div class="profile-info">
            <h1 class="profile-name">{{ userName }}</h1>
            <span class="profile-role">{{ userRole }}</span>
          </div>
          <div class="rating-badge">
            <svg class="star-icon" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span>{{ profile?.rating || 4.8 }}</span>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="stats-row">
          <div class="stat-card">
            <span class="stat-value">{{ profile?.total_trips || 156 }}</span>
            <span class="stat-label">เที่ยวทั้งหมด</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ profile?.is_verified ? 'ยืนยันแล้ว' : 'รอยืนยัน' }}</span>
            <span class="stat-label">สถานะบัญชี</span>
          </div>
        </div>

        <!-- Contact Info -->
        <div class="info-card">
          <h3 class="card-title">ข้อมูลติดต่อ</h3>
          <div class="info-item">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            <span>{{ userEmail }}</span>
          </div>
          <div class="info-item">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
            <span>{{ userPhone }}</span>
          </div>
        </div>

        <!-- Vehicle Info -->
        <div v-if="profile" class="info-card">
          <h3 class="card-title">ข้อมูลยานพาหนะ</h3>
          <div class="vehicle-info">
            <div class="vehicle-row">
              <span class="vehicle-label">ยี่ห้อ/รุ่น</span>
              <span class="vehicle-value">{{ (profile as any).vehicle_brand || 'Toyota' }} {{ (profile as any).vehicle_model || 'Vios' }}</span>
            </div>
            <div class="vehicle-row">
              <span class="vehicle-label">ประเภท</span>
              <span class="vehicle-value">{{ profile.vehicle_type || 'รถยนต์' }}</span>
            </div>
            <div class="vehicle-row">
              <span class="vehicle-label">ทะเบียน</span>
              <span class="vehicle-value">{{ profile.vehicle_plate || 'กข 1234 กรุงเทพ' }}</span>
            </div>
            <div class="vehicle-row">
              <span class="vehicle-label">สี</span>
              <span class="vehicle-value">{{ profile.vehicle_color || 'สีดำ' }}</span>
            </div>
            <div v-if="(profile as any).vehicle_year" class="vehicle-row">
              <span class="vehicle-label">ปี</span>
              <span class="vehicle-value">{{ (profile as any).vehicle_year }}</span>
            </div>
          </div>
        </div>

        <!-- Menu Items -->
        <div class="menu-list">
          <button 
            v-for="item in menuItems" 
            :key="item.path"
            @click="router.push(item.path)"
            class="menu-item"
          >
            <div class="menu-icon">
              <!-- Car Icon -->
              <svg v-if="item.icon === 'car'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
              </svg>
              <!-- Document Icon -->
              <svg v-else-if="item.icon === 'document'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <!-- Wallet Icon -->
              <svg v-else-if="item.icon === 'wallet'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
              <!-- Bell Icon -->
              <svg v-else-if="item.icon === 'bell'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              <!-- Help Icon -->
              <svg v-else-if="item.icon === 'help'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <!-- Settings Icon -->
              <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <span class="menu-label">{{ item.label }}</span>
            <svg class="menu-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        <!-- Logout Button -->
        <button @click="logout" class="logout-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          ออกจากระบบ
        </button>
      </div>
    </div>
  </ProviderLayout>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
}

.page-content {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
}

/* Profile Header */
.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background-color: #FFFFFF;
  border-radius: 16px;
  margin-bottom: 16px;
}

.avatar {
  width: 64px;
  height: 64px;
  background-color: #000000;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 24px;
  font-weight: 700;
  color: #FFFFFF;
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 4px;
}

.profile-role {
  font-size: 14px;
  color: #6B6B6B;
}

.rating-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background-color: #FEF3C7;
  border-radius: 20px;
}

.star-icon {
  width: 16px;
  height: 16px;
  color: #F59E0B;
}

.rating-badge span {
  font-size: 14px;
  font-weight: 600;
  color: #92400E;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background-color: #FFFFFF;
  border-radius: 12px;
  text-align: center;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #6B6B6B;
}

/* Info Card */
.info-card {
  background-color: #FFFFFF;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #F0F0F0;
}

.info-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.info-item svg {
  width: 20px;
  height: 20px;
  color: #6B6B6B;
}

.info-item span {
  font-size: 14px;
}

/* Vehicle Info */
.vehicle-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vehicle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.vehicle-label {
  font-size: 14px;
  color: #6B6B6B;
}

.vehicle-value {
  font-size: 14px;
  font-weight: 500;
}

/* Menu List */
.menu-list {
  background-color: #FFFFFF;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 16px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px 20px;
  background: none;
  border: none;
  border-bottom: 1px solid #F0F0F0;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background-color: #F6F6F6;
}

.menu-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F6F6F6;
  border-radius: 10px;
}

.menu-icon svg {
  width: 20px;
  height: 20px;
}

.menu-label {
  flex: 1;
  font-size: 15px;
}

.menu-arrow {
  width: 20px;
  height: 20px;
  color: #CCC;
}

/* Logout Button */
.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 16px;
  background-color: #FFFFFF;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  color: #E11900;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:active {
  background-color: #FEE2E2;
}

.logout-btn svg {
  width: 20px;
  height: 20px;
}
</style>
