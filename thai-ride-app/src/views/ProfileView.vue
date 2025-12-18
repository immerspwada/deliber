<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useLoyalty } from '../composables/useLoyalty'
import { useRideHistory } from '../composables/useRideHistory'
import { useWallet } from '../composables/useWallet'

const router = useRouter()
const authStore = useAuthStore()
const { loyaltySummary, fetchLoyaltySummary } = useLoyalty()
const { history, fetchHistory } = useRideHistory()
const { balance, fetchBalance } = useWallet()

const loading = ref(true)

onMounted(async () => {
  // Fetch user stats
  await Promise.all([
    fetchLoyaltySummary(),
    fetchHistory('all'),
    fetchBalance()
  ])
  loading.value = false
})

const user = computed(() => {
  if (authStore.user) {
    const name = authStore.user.name || ''
    const nameParts = name.split(' ')
    return {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      fullName: name || 'User',
      phone: authStore.user.phone || '',
      email: authStore.user.email || '',
      memberUid: (authStore.user as any).member_uid || null,
      profileImage: authStore.user.avatar_url || null,
      verificationStatus: authStore.user.is_active ? 'verified' : 'pending'
    }
  }
  return {
    firstName: 'Demo', lastName: 'User', fullName: 'Demo User',
    phone: '081-234-5678', email: 'demo@gobear.app',
    memberUid: null, profileImage: null, verificationStatus: 'verified'
  }
})

const isLoggedIn = computed(() => authStore.isAuthenticated)
const isDemoMode = computed(() => authStore.isDemoMode)

const showEditModal = ref(false)
const editForm = ref({ firstName: '', lastName: '', phone: '' })
const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

const openEditModal = () => {
  editForm.value = { firstName: user.value.firstName, lastName: user.value.lastName, phone: user.value.phone }
  saveError.value = ''
  saveSuccess.value = false
  showEditModal.value = true
}

const saveProfile = async () => {
  if (!editForm.value.firstName.trim()) { saveError.value = 'กรุณากรอกชื่อ'; return }
  if (!editForm.value.lastName.trim()) { saveError.value = 'กรุณากรอกนามสกุล'; return }
  saving.value = true
  saveError.value = ''
  try {
    const fullName = `${editForm.value.firstName} ${editForm.value.lastName}`.trim()
    if (isDemoMode.value) {
      const demoUser = { ...authStore.user, name: fullName, phone: editForm.value.phone }
      localStorage.setItem('demo_user', JSON.stringify(demoUser))
      if (authStore.user) {
        (authStore.user as any).name = fullName;
        (authStore.user as any).phone = editForm.value.phone
      }
      saveSuccess.value = true
      setTimeout(() => showEditModal.value = false, 1000)
      return
    }
    const success = await authStore.updateProfile({ name: fullName, phone: editForm.value.phone })
    if (success) { saveSuccess.value = true; setTimeout(() => showEditModal.value = false, 1000) }
    else { saveError.value = authStore.error || 'เกิดข้อผิดพลาด' }
  } catch (err: any) { saveError.value = err.message || 'เกิดข้อผิดพลาด' }
  finally { saving.value = false }
}

const menuItems = [
  { icon: 'history', label: 'กิจกรรม', path: '/customer/history' },
  { icon: 'calendar', label: 'นัดล่วงหน้า', path: '/customer/scheduled-rides' },
  { icon: 'location', label: 'สถานที่บันทึกไว้', path: '/customer/saved-places' },
  { icon: 'heart', label: 'คนขับที่ชอบ', path: '/customer/favorite-drivers' },
  { icon: 'wallet', label: 'กระเป๋าเงิน', path: '/customer/wallet' },
  { icon: 'card', label: 'วิธีชำระเงิน', path: '/customer/payment-methods' },
  { icon: 'star', label: 'แต้มสะสม', path: '/customer/loyalty' },
  { icon: 'tag', label: 'โปรโมชั่น', path: '/customer/promotions' },
  { icon: 'users', label: 'ชวนเพื่อน', path: '/customer/referral' },
  { icon: 'bell', label: 'การแจ้งเตือน', path: '/customer/notifications' },
  { icon: 'shield', label: 'ความปลอดภัย', path: '/customer/safety' },
  { icon: 'settings', label: 'ตั้งค่า', path: '/customer/settings' },
  { icon: 'help', label: 'ช่วยเหลือ', path: '/customer/help' }
]

const navigateToMenu = (path: string) => router.push(path)
const goToLogin = () => router.push('/login')
const goBack = () => router.back()

const loggingOut = ref(false)
const logout = async () => {
  if (loggingOut.value) return
  loggingOut.value = true
  localStorage.removeItem('demo_mode')
  localStorage.removeItem('demo_user')
  router.push('/login')
  try {
    await authStore.logout()
  } catch (e) {
    console.error('Logout error:', e)
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="profile-page">
    <!-- Header -->
    <header class="page-header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <h1>โปรไฟล์</h1>
      <div class="header-spacer"></div>
    </header>

    <main class="page-content">
      <!-- Profile Card -->
      <div class="profile-card">
        <div class="avatar">
          <img v-if="user.profileImage" :src="user.profileImage" alt="Profile" />
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="8" r="4"/>
            <path d="M20 21a8 8 0 10-16 0"/>
          </svg>
        </div>
        <div class="profile-info">
          <h2>{{ user.fullName }}</h2>
          <p class="profile-phone">{{ user.phone || 'ไม่มีเบอร์โทรศัพท์' }}</p>
          <p v-if="user.email" class="profile-email">{{ user.email }}</p>
          <div v-if="user.memberUid" class="member-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="16" rx="2"/>
              <path d="M7 8h4M7 12h10M7 16h6"/>
            </svg>
            <span>{{ user.memberUid }}</span>
          </div>
        </div>
        <button class="edit-btn" @click="openEditModal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>

      <!-- Quick Stats -->
      <div class="stats-row">
        <div class="stat-item" @click="navigateToMenu('/customer/history')">
          <span class="stat-value">{{ history.length || 0 }}</span>
          <span class="stat-label">เที่ยว</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item" @click="navigateToMenu('/customer/wallet')">
          <span class="stat-value">฿{{ (balance?.balance || 0).toLocaleString() }}</span>
          <span class="stat-label">กระเป๋าเงิน</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item" @click="navigateToMenu('/customer/loyalty')">
          <span class="stat-value">{{ (loyaltySummary?.total_points || 0).toLocaleString() }}</span>
          <span class="stat-label">แต้ม</span>
        </div>
      </div>

      <!-- Loyalty Tier Card -->
      <div v-if="loyaltySummary?.tier_name" class="loyalty-tier-card" @click="navigateToMenu('/customer/loyalty')">
        <div class="tier-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#FFD700"/>
          </svg>
        </div>
        <div class="tier-info">
          <span class="tier-label">ระดับสมาชิก</span>
          <span class="tier-name">{{ loyaltySummary.tier_name }}</span>
        </div>
        <div class="tier-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${Math.min((loyaltySummary.total_points / (loyaltySummary.next_tier_points || 1000)) * 100, 100)}%` }"></div>
          </div>
          <span class="progress-text">{{ loyaltySummary.total_points }}/{{ loyaltySummary.next_tier_points || 1000 }}</span>
        </div>
        <svg class="tier-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 5l7 7-7 7"/>
        </svg>
      </div>

      <!-- Menu List -->
      <div class="menu-section">
        <button 
          v-for="item in menuItems" 
          :key="item.label" 
          class="menu-item"
          @click="navigateToMenu(item.path)"
        >
          <div class="menu-icon">
            <!-- History -->
            <svg v-if="item.icon === 'history'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
            <!-- Calendar -->
            <svg v-else-if="item.icon === 'calendar'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            <!-- Location -->
            <svg v-else-if="item.icon === 'location'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <!-- Heart -->
            <svg v-else-if="item.icon === 'heart'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
            <!-- Wallet -->
            <svg v-else-if="item.icon === 'wallet'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <path d="M2 10h20"/>
            </svg>
            <!-- Card -->
            <svg v-else-if="item.icon === 'card'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="4" width="22" height="16" rx="2"/>
              <path d="M1 10h22"/>
            </svg>
            <!-- Star -->
            <svg v-else-if="item.icon === 'star'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
            <!-- Tag -->
            <svg v-else-if="item.icon === 'tag'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
              <circle cx="7" cy="7" r="1"/>
            </svg>
            <!-- Users -->
            <svg v-else-if="item.icon === 'users'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <!-- Bell -->
            <svg v-else-if="item.icon === 'bell'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <!-- Shield -->
            <svg v-else-if="item.icon === 'shield'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            <!-- Settings -->
            <svg v-else-if="item.icon === 'settings'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            <!-- Help -->
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
              <circle cx="12" cy="17" r="1"/>
            </svg>
          </div>
          <span class="menu-label">{{ item.label }}</span>
          <svg class="menu-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      <!-- Logout -->
      <button v-if="isLoggedIn" @click="logout" class="logout-btn" :disabled="loggingOut">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16,17 21,12 16,7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        <span>{{ loggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ' }}</span>
      </button>
      <button v-else @click="goToLogin" class="login-btn">
        <span>เข้าสู่ระบบ</span>
      </button>

      <p class="version">GOBEAR v1.0.0</p>
    </main>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="edit-modal">
        <div class="modal-header">
          <h3>แก้ไขโปรไฟล์</h3>
          <button @click="showEditModal = false" class="close-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="form-group">
          <label>ชื่อ</label>
          <input v-model="editForm.firstName" type="text" placeholder="ชื่อ" />
        </div>
        <div class="form-group">
          <label>นามสกุล</label>
          <input v-model="editForm.lastName" type="text" placeholder="นามสกุล" />
        </div>
        <div class="form-group">
          <label>เบอร์โทรศัพท์</label>
          <input v-model="editForm.phone" type="tel" placeholder="081-234-5678" />
        </div>
        <p v-if="saveError" class="error-text">{{ saveError }}</p>
        <p v-if="saveSuccess" class="success-text">บันทึกสำเร็จ!</p>
        <button @click="saveProfile" :disabled="saving" class="save-btn">
          <span v-if="saving" class="spinner"></span>
          <span>{{ saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #FFFFFF;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top));
  background: #FFFFFF;
  border-bottom: 1px solid #F0F0F0;
}

.back-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  color: #1A1A1A;
}

.page-header h1 {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
}

.header-spacer {
  width: 44px;
}

/* Content */
.page-content {
  padding: 20px;
  padding-bottom: calc(100px + env(safe-area-inset-bottom));
}

/* Profile Card */
.profile-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #F5F5F5;
  border-radius: 20px;
  margin-bottom: 20px;
  position: relative;
}

.avatar {
  width: 72px;
  height: 72px;
  background: #FFFFFF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar svg {
  width: 36px;
  height: 36px;
  color: #999999;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-info h2 {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 4px;
}

.profile-phone {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

.profile-email {
  font-size: 13px;
  color: #999999;
  margin: 4px 0 0;
}

.member-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #1A1A1A;
  border-radius: 8px;
  margin-top: 10px;
}

.member-badge svg {
  width: 14px;
  height: 14px;
  color: #FFFFFF;
}

.member-badge span {
  font-size: 11px;
  font-family: monospace;
  color: #FFFFFF;
  letter-spacing: 0.5px;
}

.edit-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.edit-btn svg {
  width: 18px;
  height: 18px;
  color: #1A1A1A;
}

.edit-btn:active {
  transform: scale(0.95);
}

/* Stats Row */
.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 20px;
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 16px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.stat-item:active {
  background: #F5F5F5;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #00A86B;
}

.stat-label {
  font-size: 12px;
  color: #999999;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: #F0F0F0;
}

/* Loyalty Tier Card */
.loyalty-tier-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #FFF9E6 0%, #FFF3CC 100%);
  border-radius: 16px;
  margin-bottom: 24px;
  cursor: pointer;
}

.loyalty-tier-card:active {
  opacity: 0.9;
}

.tier-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}

.tier-icon svg {
  width: 100%;
  height: 100%;
}

.tier-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tier-label {
  font-size: 12px;
  color: #996600;
}

.tier-name {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
}

.tier-progress {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.progress-bar {
  width: 80px;
  height: 6px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #FFD700;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 10px;
  color: #996600;
}

.tier-arrow {
  width: 20px;
  height: 20px;
  color: #996600;
}

/* Menu Section */
.menu-section {
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 24px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: none;
  border: none;
  border-bottom: 1px solid #F0F0F0;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background: #F5F5F5;
}

.menu-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border-radius: 12px;
  flex-shrink: 0;
}

.menu-icon svg {
  width: 20px;
  height: 20px;
  color: #1A1A1A;
}

.menu-label {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: #1A1A1A;
}

.menu-arrow {
  width: 20px;
  height: 20px;
  color: #CCCCCC;
}

/* Logout Button */
.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px;
  background: #FFFFFF;
  border: 1px solid #E53935;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  color: #E53935;
  cursor: pointer;
  margin-bottom: 16px;
}

.logout-btn svg {
  width: 20px;
  height: 20px;
}

.logout-btn:active {
  background: #FFF5F5;
}

.logout-btn:disabled {
  opacity: 0.6;
}

.login-btn {
  width: 100%;
  padding: 18px;
  background: #00A86B;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
  cursor: pointer;
  margin-bottom: 16px;
}

.login-btn:active {
  opacity: 0.9;
}

.version {
  text-align: center;
  font-size: 12px;
  color: #CCCCCC;
  margin-top: 24px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.edit-modal {
  background: #FFFFFF;
  width: 100%;
  max-width: 480px;
  border-radius: 24px 24px 0 0;
  padding: 24px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
}

.close-btn {
  width: 40px;
  height: 40px;
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
  color: #1A1A1A;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  padding: 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 16px;
}

.form-group input:focus {
  outline: none;
  border-color: #00A86B;
}

.error-text {
  color: #E53935;
  font-size: 14px;
  margin-bottom: 16px;
}

.success-text {
  color: #00A86B;
  font-size: 14px;
  margin-bottom: 16px;
}

.save-btn {
  width: 100%;
  padding: 18px;
  background: #00A86B;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.save-btn:disabled {
  opacity: 0.6;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
