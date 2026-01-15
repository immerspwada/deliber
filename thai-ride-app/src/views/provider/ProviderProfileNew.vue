<script setup lang="ts">
/**
 * ProviderProfileNew - หน้า Profile ใหม่
 * Design: Green theme
 * 
 * Features:
 * - Profile header with avatar
 * - Stats display
 * - Settings menu
 * - Role switcher
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'
import { useProviderMedia } from '../../composables/useProviderMedia'
import ProviderMediaUpload from '../../components/provider/ProviderMediaUpload.vue'

const router = useRouter()
const { avatarUrl, fetchProviderMedia } = useProviderMedia()

// State
const loading = ref(true)
const showMediaUpload = ref(false)
const showRoleSwitcher = ref(false)

const provider = ref<{
  first_name?: string
  last_name?: string
  phone?: string
  email?: string
  rating?: number
  total_trips?: number
  total_earnings?: number
  status?: string
} | null>(null)

// Computed
const displayName = computed(() => {
  if (!provider.value) return ''
  return `${provider.value.first_name || ''} ${provider.value.last_name || ''}`.trim()
})

const initials = computed(() => {
  const first = provider.value?.first_name?.charAt(0) || ''
  const last = provider.value?.last_name?.charAt(0) || ''
  return (first + last).toUpperCase() || 'P'
})

const statusInfo = computed(() => {
  const s = provider.value?.status
  const map: Record<string, { text: string; class: string }> = {
    pending: { text: 'รอการอนุมัติ', class: 'pending' },
    approved: { text: 'อนุมัติแล้ว', class: 'success' },
    active: { text: 'ใช้งานอยู่', class: 'success' },
    suspended: { text: 'ถูกระงับ', class: 'error' },
    rejected: { text: 'ถูกปฏิเสธ', class: 'error' }
  }
  return map[s || ''] || { text: s || '', class: '' }
})

// Menu items
const menuItems = [
  { id: 'personal', icon: 'user', label: 'ข้อมูลส่วนตัว' },
  { id: 'vehicle', icon: 'car', label: 'รายละเอียดยานพาหนะ' },
  { id: 'documents', icon: 'file', label: 'เอกสาร' },
  { id: 'bank', icon: 'bank', label: 'บัญชีธนาคาร' },
  { id: 'notifications', icon: 'bell', label: 'การแจ้งเตือน' },
  { id: 'settings', icon: 'settings', label: 'ตั้งค่า' },
  { id: 'help', icon: 'help', label: 'ช่วยเหลือและสนับสนุน' }
]

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

    if (data) {
      provider.value = data
      await fetchProviderMedia()
    }
  } catch (err) {
    console.error('[Profile] Error:', err)
  } finally {
    loading.value = false
  }
}

function openMediaUpload() {
  showMediaUpload.value = true
}

function closeMediaUpload() {
  showMediaUpload.value = false
  fetchProviderMedia()
}

function switchToCustomer() {
  showRoleSwitcher.value = false
  router.push('/customer')
}

async function logout() {
  await supabase.auth.signOut()
  router.replace('/login')
}

// Lifecycle
onMounted(loadData)
</script>

<template>
  <div class="profile-page">
    <!-- Header -->
    <header class="header">
      <h1 class="title">โปรไฟล์</h1>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <!-- Content -->
    <main v-else class="content">
      <!-- Profile Card -->
      <div class="profile-card">
        <button class="avatar-btn" @click="openMediaUpload" aria-label="แก้ไขรูปโปรไฟล์">
          <div class="avatar" :class="{ 'has-image': avatarUrl }">
            <img v-if="avatarUrl" :src="avatarUrl" alt="Profile" />
            <span v-else>{{ initials }}</span>
          </div>
          <div class="edit-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
        </button>
        
        <div class="profile-info">
          <h2 class="profile-name">{{ displayName }}</h2>
          <span class="profile-status" :class="statusInfo.class">
            {{ statusInfo.text }}
          </span>
        </div>

        <!-- Stats -->
        <div class="stats-row">
          <div class="stat-item">
            <span class="stat-value">{{ (provider?.rating || 5.0).toFixed(1) }}</span>
            <span class="stat-label">คะแนน</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ provider?.total_trips || 0 }}</span>
            <span class="stat-label">เที่ยว</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">฿{{ (provider?.total_earnings || 0).toLocaleString() }}</span>
            <span class="stat-label">รายได้</span>
          </div>
        </div>
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
            <svg v-else-if="item.icon === 'bell'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <svg v-else-if="item.icon === 'settings'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
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
      <button class="switch-btn" @click="switchToCustomer">
        <div class="switch-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
        <div class="switch-text">
          <span class="switch-label">สลับเป็นโหมดลูกค้า</span>
          <span class="switch-desc">จองรถ สั่งของ</span>
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
      <p class="version">GOBEAR Partner v2.0.0</p>
    </main>

    <!-- Media Upload Modal -->
    <Teleport to="body">
      <div v-if="showMediaUpload" class="modal-overlay" @click.self="closeMediaUpload">
        <div class="modal-content">
          <div class="modal-header">
            <h3>จัดการรูปภาพ</h3>
            <button class="close-btn" @click="closeMediaUpload" aria-label="ปิด">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <ProviderMediaUpload />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #F5F5F5;
}

/* Header */
.header {
  padding: 20px 16px;
  background: #FFFFFF;
  border-bottom: 1px solid #E5E5E5;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

/* Loading */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E5E7EB;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Content */
.content {
  padding: 16px;
}

/* Profile Card */
.profile-card {
  background: #FFFFFF;
  border-radius: 20px;
  padding: 24px;
  text-align: center;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.avatar-btn {
  position: relative;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  margin-bottom: 16px;
}

.avatar {
  width: 80px;
  height: 80px;
  background: #00A86B;
  color: #FFFFFF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  overflow: hidden;
  transition: transform 0.2s;
}

.avatar.has-image {
  border: 3px solid #00A86B;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-btn:active .avatar {
  transform: scale(0.95);
}

.edit-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 28px;
  height: 28px;
  background: #FFFFFF;
  border: 2px solid #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
}

.edit-badge svg {
  width: 14px;
  height: 14px;
}

.profile-info {
  margin-bottom: 20px;
}

.profile-name {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px 0;
}

.profile-status {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.profile-status.success {
  background: #DCFCE7;
  color: #15803D;
}

.profile-status.pending {
  background: #FEF3C7;
  color: #B45309;
}

.profile-status.error {
  background: #FEE2E2;
  color: #B91C1C;
}

/* Stats */
.stats-row {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 20px;
  border-top: 1px solid #F3F4F6;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.stat-label {
  font-size: 12px;
  color: #6B7280;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: #F3F4F6;
}

/* Menu Card */
.menu-card {
  background: #FFFFFF;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: transparent;
  border: none;
  border-bottom: 1px solid #F3F4F6;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background: #F9FAFB;
}

.menu-icon {
  width: 44px;
  height: 44px;
  background: #F3F4F6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6B7280;
}

.menu-icon svg {
  width: 22px;
  height: 22px;
}

.menu-label {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: #111827;
}

.menu-arrow {
  width: 20px;
  height: 20px;
  color: #D1D5DB;
}

/* Switch Button */
.switch-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: #E8F5EF;
  border: 1px solid #A7F3D0;
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
  width: 48px;
  height: 48px;
  background: #00A86B;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
}

.switch-icon svg {
  width: 24px;
  height: 24px;
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
  color: #065F46;
}

.switch-desc {
  font-size: 13px;
  color: #047857;
}

.switch-arrow {
  width: 20px;
  height: 20px;
  color: #00A86B;
}

/* Logout */
.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px;
  background: #FFFFFF;
  border: 1px solid #FEE2E2;
  border-radius: 16px;
  color: #DC2626;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 20px;
}

.logout-btn:active {
  background: #FEF2F2;
}

.logout-btn svg {
  width: 20px;
  height: 20px;
}

/* Version */
.version {
  text-align: center;
  font-size: 12px;
  color: #9CA3AF;
  margin: 0;
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
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 500px;
  max-height: 85vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #E5E5E5;
  position: sticky;
  top: 0;
  background: #FFFFFF;
  z-index: 1;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  background: #F3F4F6;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6B7280;
  cursor: pointer;
}

.close-btn:active {
  background: #E5E7EB;
}

.close-btn svg {
  width: 20px;
  height: 20px;
}
</style>
