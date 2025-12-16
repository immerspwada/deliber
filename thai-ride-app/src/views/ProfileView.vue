<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(true)

onMounted(async () => {
  await authStore.initialize()
  setTimeout(() => { loading.value = false }, 500)
})

const user = computed(() => {
  if (authStore.user) {
    const name = authStore.user.name || ''
    const nameParts = name.split(' ')
    return {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      fullName: name || 'ผู้ใช้',
      phone: authStore.user.phone || '',
      email: authStore.user.email || '',
      profileImage: authStore.user.avatar_url || null,
      verificationStatus: authStore.user.is_active ? 'verified' : 'pending'
    }
  }
  return {
    firstName: 'Demo', lastName: 'User', fullName: 'Demo User',
    phone: '081-234-5678', email: 'demo@thairide.app',
    profileImage: null, verificationStatus: 'verified'
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
  { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: 'ประวัติการใช้งาน', path: '/history' },
  { icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'การจองล่วงหน้า', path: '/scheduled-rides' },
  { icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z', label: 'สถานที่ของฉัน', path: '/saved-places' },
  { icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', label: 'คนขับที่ชอบ', path: '/favorite-drivers' },
  { icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', label: 'วิธีการชำระเงิน', path: '/payment-methods' },
  { icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', label: 'การแจ้งเตือน', path: '/notifications' },
  { icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'กระเป๋าเงิน', path: '/wallet' },
  { icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z', label: 'แพ็กเกจสมาชิก', path: '/subscription' },
  { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'ประกันการเดินทาง', path: '/insurance' },
  { icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', label: 'โปรโมชั่น', path: '/promotions' },
  { icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', label: 'ชวนเพื่อน', path: '/referral' },
  { icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', label: 'ตั้งค่า', path: '/settings' },
  { icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'ช่วยเหลือ', path: '/help' }
]

const navigateToMenu = (path: string) => router.push(path)
const goToLogin = () => router.push('/login')
const logout = async () => {
  // Clear demo mode first
  localStorage.removeItem('demo_mode')
  localStorage.removeItem('demo_user')
  
  await authStore.logout()
  // Always redirect to login regardless of success
  router.push('/login')
}
const getVerificationBadge = (status: string) => {
  switch (status) {
    case 'verified': return { text: 'ยืนยันแล้ว', class: 'badge-verified' }
    case 'pending': return { text: 'รอยืนยัน', class: 'badge-pending' }
    case 'rejected': return { text: 'ไม่ผ่าน', class: 'badge-rejected' }
    default: return { text: 'รอยืนยัน', class: 'badge-pending' }
  }
}
</script>

<template>
  <div class="page-container">
    <div class="content-container">
      <div class="page-header">
        <h1 class="page-title">โปรไฟล์</h1>
      </div>

      <!-- Profile Card Skeleton -->
      <SkeletonLoader v-if="loading" type="profile" />
      
      <div v-else class="profile-card">
        <div class="avatar">
          <img v-if="user.profileImage" :src="user.profileImage" alt="Profile" class="avatar-img" />
          <svg v-else class="avatar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
        <div class="profile-info">
          <div class="name-row">
            <h2 class="profile-name">{{ user.fullName }}</h2>
            <span :class="['verification-badge', getVerificationBadge(user.verificationStatus).class]">
              {{ getVerificationBadge(user.verificationStatus).text }}
            </span>
          </div>
          <p class="profile-phone">{{ user.phone || 'ไม่ได้ระบุเบอร์โทร' }}</p>
          <p class="profile-email">{{ user.email }}</p>
          <p v-if="isDemoMode" class="demo-badge">Demo Mode</p>
        </div>
        <button @click="openEditModal" class="edit-btn">
          <svg class="edit-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
          </svg>
        </button>
      </div>

      <!-- Edit Profile Modal -->
      <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
        <div class="edit-modal">
          <div class="modal-header">
            <h3>แก้ไขโปรไฟล์</h3>
            <button @click="showEditModal = false" class="modal-close">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="form-group"><label>ชื่อ</label><input v-model="editForm.firstName" type="text" placeholder="ชื่อ" /></div>
          <div class="form-group"><label>นามสกุล</label><input v-model="editForm.lastName" type="text" placeholder="นามสกุล" /></div>
          <div class="form-group"><label>เบอร์โทรศัพท์</label><input v-model="editForm.phone" type="tel" placeholder="081-234-5678" /></div>
          <div class="form-group"><label>อีเมล</label><input :value="user.email" type="email" disabled class="disabled-input" /><span class="input-hint">ไม่สามารถเปลี่ยนอีเมลได้</span></div>
          <p v-if="saveError" class="error-text">{{ saveError }}</p>
          <p v-if="saveSuccess" class="success-text">บันทึกสำเร็จ</p>
          <button @click="saveProfile" :disabled="saving" class="btn-primary">
            <span v-if="saving" class="btn-loading"><span class="spinner"></span>กำลังบันทึก...</span>
            <span v-else>บันทึก</span>
          </button>
        </div>
      </div>

      <!-- Menu Section Skeleton -->
      <SkeletonLoader v-if="loading" type="menu-list" :count="8" />
      
      <div v-else class="menu-section">
        <button v-for="item in menuItems" :key="item.label" class="menu-item" @click="navigateToMenu(item.path)">
          <div class="menu-item-left">
            <div class="menu-icon-wrapper">
              <svg class="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon"/>
              </svg>
            </div>
            <span class="menu-label">{{ item.label }}</span>
          </div>
          <svg class="menu-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      <div class="action-section">
        <button v-if="!isLoggedIn" @click="goToLogin" class="btn-secondary">เข้าสู่ระบบ</button>
        <button v-if="isLoggedIn" @click="logout" class="logout-btn" :disabled="authStore.loading">
          <svg class="logout-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          {{ authStore.loading ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ' }}
        </button>
      </div>
      <p class="version-text">ThaiRide v1.0.0</p>
    </div>
  </div>
</template>

<style scoped>
.page-header { padding: 24px 0 16px; }
.page-title { font-size: 28px; font-weight: 700; color: #000000; }

.profile-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background-color: #FFFFFF;
  border-radius: 16px;
  margin-bottom: 24px;
  position: relative;
}

.avatar {
  width: 72px;
  height: 72px;
  background-color: #F6F6F6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-icon { width: 36px; height: 36px; color: #6B6B6B; }
.profile-info { flex: 1; min-width: 0; }
.name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.profile-name { font-size: 18px; font-weight: 600; color: #000000; }

.verification-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.badge-verified { background-color: rgba(39, 110, 241, 0.1); color: #276EF1; }
.badge-pending { background-color: #F6F6F6; color: #6B6B6B; }
.badge-rejected { background-color: rgba(225, 25, 0, 0.1); color: #E11900; }
.profile-phone { font-size: 14px; color: #6B6B6B; margin-top: 4px; }
.profile-email { font-size: 13px; color: #6B6B6B; margin-top: 2px; }
.demo-badge { display: inline-block; font-size: 11px; padding: 2px 8px; background-color: #F6F6F6; color: #6B6B6B; border-radius: 4px; margin-top: 6px; }

.edit-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F6F6F6;
  border: none;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.edit-btn:hover { background-color: #E5E5E5; }
.edit-btn:active { transform: scale(0.92); background-color: #E0E0E0; }
.edit-icon { width: 18px; height: 18px; color: #000000; }

.menu-section {
  display: flex;
  flex-direction: column;
  background-color: #FFFFFF;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 24px;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: none;
  border: none;
  border-bottom: 1px solid #F6F6F6;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  min-height: 64px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.menu-item:last-child { border-bottom: none; }
.menu-item:hover { background-color: #FAFAFA; }
.menu-item:active { transform: scale(0.99); background-color: #F6F6F6; }
.menu-item-left { display: flex; align-items: center; gap: 12px; }

.menu-icon-wrapper {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F6F6F6;
  border-radius: 10px;
}

.menu-icon { width: 20px; height: 20px; color: #000000; }
.menu-label { font-size: 15px; color: #000000; }
.menu-arrow { width: 16px; height: 16px; color: #CCCCCC; transition: transform 0.2s ease; }
.menu-item:hover .menu-arrow { transform: translateX(4px); }

.action-section { display: flex; flex-direction: column; gap: 12px; }

.btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 24px;
  background-color: #F6F6F6;
  color: #000000;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover { background-color: #EBEBEB; }

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 24px;
  background-color: #FFFFFF;
  color: #E11900;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-btn:hover { background-color: rgba(225, 25, 0, 0.05); }
.logout-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.logout-icon { width: 20px; height: 20px; }
.version-text { text-align: center; font-size: 12px; color: #CCCCCC; margin-top: 24px; padding-bottom: 24px; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.edit-modal {
  background: #FFFFFF;
  width: 100%;
  max-width: 480px;
  border-radius: 20px 20px 0 0;
  padding: 24px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.modal-header h3 { font-size: 20px; font-weight: 600; color: #000000; }

.modal-close {
  width: 40px;
  height: 40px;
  background: #F6F6F6;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-close:hover { background: #E5E5E5; }
.modal-close svg { width: 20px; height: 20px; color: #000000; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; color: #000000; }

.form-group input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  transition: all 0.2s ease;
}

.form-group input:focus { border-color: #000000; box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06); }
.form-group input.disabled-input { background: #F6F6F6; color: #6B6B6B; }
.input-hint { font-size: 12px; color: #6B6B6B; margin-top: 4px; display: block; }
.error-text { color: #E11900; font-size: 14px; margin-bottom: 16px; }
.success-text { color: #276EF1; font-size: 14px; margin-bottom: 16px; }

.btn-primary {
  width: 100%;
  padding: 14px;
  background: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) { opacity: 0.9; }
.btn-primary:active:not(:disabled) { transform: scale(0.98); }
.btn-primary:disabled { background: #CCCCCC; cursor: not-allowed; }
.btn-loading { display: flex; align-items: center; justify-content: center; gap: 8px; }

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
