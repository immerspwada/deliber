<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAdmin } from '../composables/useAdmin'

const { fetchUsers, updateUserStatus, verifyUser } = useAdmin()

const users = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const search = ref('')
const statusFilter = ref('')
const roleFilter = ref('')
const verificationFilter = ref('')
const selectedUser = ref<any>(null)
const showDetailModal = ref(false)

// Stats
const stats = computed(() => {
  const all = users.value
  return {
    total: total.value,
    active: all.filter(u => u.is_active).length,
    pending: all.filter(u => u.verification_status === 'pending').length,
    verified: all.filter(u => u.verification_status === 'verified').length
  }
})

const loadUsers = async () => {
  loading.value = true
  const result = await fetchUsers(page.value, 50, { 
    status: statusFilter.value || undefined, 
    search: search.value || undefined,
    role: roleFilter.value || undefined,
    verification_status: verificationFilter.value || undefined
  })
  users.value = result.data
  total.value = result.total
  loading.value = false
}

onMounted(loadUsers)

const handleSearch = () => { page.value = 1; loadUsers() }
const handleFilter = () => { page.value = 1; loadUsers() }

const handleToggleActive = async (userId: string, isActive: boolean) => {
  await updateUserStatus(userId, isActive)
  loadUsers()
}

const handleVerify = async (userId: string, status: 'verified' | 'rejected') => {
  if (verifyUser) {
    await verifyUser(userId, status)
  } else {
    // Fallback if verifyUser not available
    await updateUserStatus(userId, status === 'verified')
  }
  loadUsers()
  showDetailModal.value = false
}

const openUserDetail = (user: any) => {
  selectedUser.value = user
  showDetailModal.value = true
}

const getStatusColor = (isActive: boolean) => isActive ? '#05944f' : '#e11900'
const getStatusText = (isActive: boolean) => isActive ? 'ใช้งาน' : 'ระงับ'

const getVerificationColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: '#f59e0b',
    verified: '#05944f',
    rejected: '#e11900',
    suspended: '#6b6b6b'
  }
  return colors[status] || '#6b6b6b'
}

const getVerificationText = (status: string) => {
  const texts: Record<string, string> = {
    pending: 'รอตรวจสอบ',
    verified: 'ยืนยันแล้ว',
    rejected: 'ปฏิเสธ',
    suspended: 'ระงับ'
  }
  return texts[status] || status
}

const getRoleText = (role: string) => {
  const roles: Record<string, string> = {
    admin: 'แอดมิน',
    customer: 'ลูกค้า',
    rider: 'ไรเดอร์',
    driver: 'คนขับ',
    restaurant: 'ร้านอาหาร'
  }
  return roles[role] || role
}



const formatDate = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('th-TH', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatNationalId = (id: string) => {
  if (!id || id.length !== 13) return id || '-'
  return `${id[0]}-${id.slice(1,5)}-${id.slice(5,10)}-${id.slice(10,12)}-${id[12]}`
}

const copyMemberUid = (uid: string) => {
  if (uid) {
    navigator.clipboard.writeText(uid)
    alert('คัดลอก Member ID แล้ว: ' + uid)
  }
}
</script>

<template>
  <AdminLayout>
    <div class="admin-page">
      <div class="page-header">
        <h1>จัดการผู้ใช้งาน</h1>
        <p class="subtitle">{{ total }} ผู้ใช้ทั้งหมด</p>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.total }}</span>
            <span class="stat-label">ผู้ใช้ทั้งหมด</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon active">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <path d="M22 4L12 14.01l-3-3"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.active }}</span>
            <span class="stat-label">ใช้งานอยู่</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon pending">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.pending }}</span>
            <span class="stat-label">รอตรวจสอบ</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon verified">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.verified }}</span>
            <span class="stat-label">ยืนยันแล้ว</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input v-model="search" @keyup.enter="handleSearch" placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร..." class="search-input"/>
        </div>
        <select v-model="roleFilter" @change="handleFilter" class="filter-select">
          <option value="">ทุกบทบาท</option>
          <option value="customer">ลูกค้า</option>
          <option value="driver">คนขับ</option>
          <option value="rider">ไรเดอร์</option>
          <option value="admin">แอดมิน</option>
        </select>
        <select v-model="verificationFilter" @change="handleFilter" class="filter-select">
          <option value="">ทุกสถานะยืนยัน</option>
          <option value="pending">รอตรวจสอบ</option>
          <option value="verified">ยืนยันแล้ว</option>
          <option value="rejected">ปฏิเสธ</option>
        </select>
        <select v-model="statusFilter" @change="handleFilter" class="filter-select">
          <option value="">ทุกสถานะ</option>
          <option value="active">ใช้งาน</option>
          <option value="inactive">ระงับ</option>
        </select>
        <button @click="loadUsers" class="refresh-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <!-- Users List -->
      <div v-else class="users-list">
        <div v-for="user in users" :key="user.id" class="user-card" @click="openUserDetail(user)">
          <div class="user-avatar">
            <span v-if="user.avatar_url">
              <img :src="user.avatar_url" :alt="user.name" />
            </span>
            <span v-else>{{ user.name?.charAt(0) || '?' }}</span>
          </div>
          <div class="user-info">
            <span class="user-name">{{ user.name || 'ไม่ระบุชื่อ' }}</span>
            <div class="user-badges">
              <span class="role-badge">{{ getRoleText(user.role) }}</span>
              <span 
                class="verification-badge" 
                :style="{ backgroundColor: getVerificationColor(user.verification_status) + '20', color: getVerificationColor(user.verification_status) }"
              >
                {{ getVerificationText(user.verification_status || 'pending') }}
              </span>
              <span v-if="user.member_uid" class="member-uid-badge">{{ user.member_uid }}</span>
            </div>
            <span class="user-contact">{{ user.phone || user.phone_number || '-' }} · {{ user.email }}</span>
          </div>
          <div class="user-meta">
            <span class="user-status" :style="{ color: getStatusColor(user.is_active) }">
              {{ getStatusText(user.is_active) }}
            </span>
            <span class="user-date">{{ formatDate(user.created_at) }}</span>
          </div>
          <div class="user-actions" @click.stop>
            <button 
              v-if="user.verification_status === 'pending'" 
              class="action-btn approve" 
              @click="handleVerify(user.id, 'verified')"
              title="ยืนยันตัวตน"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </button>
            <button 
              v-if="!user.is_active" 
              class="action-btn approve" 
              @click="handleToggleActive(user.id, true)"
              title="เปิดใช้งาน"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </button>
            <button 
              v-if="user.is_active && user.role !== 'admin'" 
              class="action-btn reject" 
              @click="handleToggleActive(user.id, false)"
              title="ระงับการใช้งาน"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <div v-if="users.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
          <p>ไม่พบผู้ใช้งาน</p>
        </div>
      </div>

      <!-- User Detail Modal -->
      <div v-if="showDetailModal && selectedUser" class="modal-overlay" @click="showDetailModal = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>รายละเอียดผู้ใช้</h2>
            <button class="close-btn" @click="showDetailModal = false">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <div class="user-profile-header">
              <div class="profile-avatar">
                {{ selectedUser.name?.charAt(0) || '?' }}
              </div>
              <div class="profile-info">
                <h3>{{ selectedUser.name || 'ไม่ระบุชื่อ' }}</h3>
                <span class="role-badge large">{{ getRoleText(selectedUser.role) }}</span>
              </div>
            </div>

            <!-- Member UID Section -->
            <div v-if="selectedUser.member_uid" class="member-uid-section">
              <div class="member-uid-card">
                <span class="member-uid-label">Member ID</span>
                <span class="member-uid-value">{{ selectedUser.member_uid }}</span>
                <button class="copy-uid-btn" @click="copyMemberUid(selectedUser.member_uid)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="detail-section">
              <h4>ข้อมูลส่วนตัว</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">ชื่อ</span>
                  <span class="detail-value">{{ selectedUser.first_name || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">นามสกุล</span>
                  <span class="detail-value">{{ selectedUser.last_name || '-' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">เลขบัตรประชาชน</span>
                  <span class="detail-value">{{ formatNationalId(selectedUser.national_id) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">เพศ</span>
                  <span class="detail-value">{{ selectedUser.gender || '-' }}</span>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <h4>ข้อมูลติดต่อ</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">อีเมล</span>
                  <span class="detail-value">{{ selectedUser.email }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">เบอร์โทร</span>
                  <span class="detail-value">{{ selectedUser.phone || selectedUser.phone_number || '-' }}</span>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <h4>สถานะ</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">สถานะบัญชี</span>
                  <span class="detail-value" :style="{ color: getStatusColor(selectedUser.is_active) }">
                    {{ getStatusText(selectedUser.is_active) }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">การยืนยันตัวตน</span>
                  <span class="detail-value" :style="{ color: getVerificationColor(selectedUser.verification_status) }">
                    {{ getVerificationText(selectedUser.verification_status || 'pending') }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">วันที่สมัคร</span>
                  <span class="detail-value">{{ formatDate(selectedUser.created_at) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">อัพเดทล่าสุด</span>
                  <span class="detail-value">{{ formatDate(selectedUser.updated_at) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button 
              v-if="selectedUser.verification_status === 'pending'"
              class="btn btn-reject"
              @click="handleVerify(selectedUser.id, 'rejected')"
            >
              ปฏิเสธ
            </button>
            <button 
              v-if="selectedUser.verification_status === 'pending'"
              class="btn btn-approve"
              @click="handleVerify(selectedUser.id, 'verified')"
            >
              ยืนยันตัวตน
            </button>
            <button 
              v-if="selectedUser.is_active && selectedUser.role !== 'admin'"
              class="btn btn-reject"
              @click="handleToggleActive(selectedUser.id, false); showDetailModal = false"
            >
              ระงับบัญชี
            </button>
            <button 
              v-if="!selectedUser.is_active"
              class="btn btn-approve"
              @click="handleToggleActive(selectedUser.id, true); showDetailModal = false"
            >
              เปิดใช้งาน
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>


<style scoped>
.admin-page { padding: 20px; max-width: 1200px; margin: 0 auto; }
.page-header { margin-bottom: 20px; }
.page-header h1 { font-size: 24px; font-weight: 700; }
.subtitle { color: #6b6b6b; font-size: 14px; }

/* Stats Grid */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 12px; }
.stat-icon { width: 48px; height: 48px; border-radius: 12px; background: #f6f6f6; display: flex; align-items: center; justify-content: center; color: #000; }
.stat-icon.active { background: #e6f7ed; color: #05944f; }
.stat-icon.pending { background: #fef3c7; color: #f59e0b; }
.stat-icon.verified { background: #dbeafe; color: #2563eb; }
.stat-info { flex: 1; }
.stat-value { display: block; font-size: 24px; font-weight: 700; }
.stat-label { font-size: 13px; color: #6b6b6b; }

/* Filters */
.filters { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.search-box { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 0 12px; }
.search-input { flex: 1; border: none; outline: none; padding: 12px 0; font-size: 14px; }
.filter-select { padding: 12px 16px; border: 1px solid #e5e5e5; border-radius: 8px; background: #fff; font-size: 14px; min-width: 140px; }
.refresh-btn { width: 44px; height: 44px; border: 1px solid #e5e5e5; border-radius: 8px; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.refresh-btn:hover { background: #f6f6f6; }

/* Loading & Empty */
.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid #e5e5e5; border-top-color: #000; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 60px 20px; color: #999; }
.empty-state p { margin-top: 12px; }

/* Users List */
.users-list { display: flex; flex-direction: column; gap: 12px; }
.user-card { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s; }
.user-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); transform: translateY(-1px); }

.user-avatar { width: 48px; height: 48px; border-radius: 50%; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 18px; flex-shrink: 0; overflow: hidden; }
.user-avatar img { width: 100%; height: 100%; object-fit: cover; }

.user-info { flex: 1; min-width: 0; }
.user-name { display: block; font-weight: 600; font-size: 15px; margin-bottom: 4px; }
.user-badges { display: flex; gap: 6px; margin-bottom: 4px; }
.role-badge { font-size: 11px; padding: 2px 8px; background: #f6f6f6; border-radius: 4px; font-weight: 500; }
.role-badge.large { font-size: 13px; padding: 4px 12px; }
.verification-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 500; }
.member-uid-badge { font-size: 10px; padding: 2px 8px; background: linear-gradient(135deg, #000 0%, #333 100%); color: #fff; border-radius: 4px; font-family: 'SF Mono', 'Monaco', monospace; letter-spacing: 0.3px; }
.user-contact { display: block; font-size: 12px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.user-meta { text-align: right; flex-shrink: 0; }
.user-status { display: block; font-size: 12px; font-weight: 500; }
.user-date { display: block; font-size: 11px; color: #999; }

.user-actions { display: flex; gap: 8px; flex-shrink: 0; }
.action-btn { width: 36px; height: 36px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.action-btn.approve { background: #e6f7ed; color: #05944f; }
.action-btn.approve:hover { background: #05944f; color: #fff; }
.action-btn.reject { background: #ffebee; color: #e11900; }
.action-btn.reject:hover { background: #e11900; color: #fff; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal-content { background: #fff; border-radius: 16px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px; border-bottom: 1px solid #e5e5e5; }
.modal-header h2 { font-size: 18px; font-weight: 600; }
.close-btn { width: 36px; height: 36px; border: none; background: #f6f6f6; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.close-btn:hover { background: #e5e5e5; }

.modal-body { padding: 20px; }
.user-profile-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.profile-avatar { width: 64px; height: 64px; border-radius: 50%; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 600; }
.profile-info h3 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }

.detail-section { margin-bottom: 20px; }
.detail-section h4 { font-size: 14px; font-weight: 600; color: #6b6b6b; margin-bottom: 12px; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.detail-item { background: #f6f6f6; padding: 12px; border-radius: 8px; }
.detail-label { display: block; font-size: 11px; color: #6b6b6b; margin-bottom: 4px; }
.detail-value { font-size: 14px; font-weight: 500; }

.modal-footer { display: flex; gap: 12px; padding: 20px; border-top: 1px solid #e5e5e5; }
.btn { flex: 1; padding: 14px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.btn-approve { background: #00A86B; color: #fff; box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3); }
.btn-approve:hover { background: #008F5B; }
.btn-reject { background: #f6f6f6; color: #e11900; }
.btn-reject:hover { background: #ffebee; }

/* Member UID Section */
.member-uid-section { margin-bottom: 20px; }
.member-uid-card { background: linear-gradient(135deg, #1A1A1A 0%, #333 100%); border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 12px; }
.member-uid-label { font-size: 11px; color: #999; }
.member-uid-value { flex: 1; font-size: 18px; font-weight: 700; color: #00A86B; font-family: 'SF Mono', 'Monaco', monospace; letter-spacing: 1px; }
.copy-uid-btn { width: 36px; height: 36px; border: none; background: rgba(255,255,255,0.1); border-radius: 8px; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.copy-uid-btn:hover { background: rgba(255,255,255,0.2); }

@media (max-width: 900px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .user-card { flex-wrap: wrap; }
  .user-meta { width: 100%; text-align: left; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0; display: flex; justify-content: space-between; }
  .user-actions { margin-left: auto; }
  .detail-grid { grid-template-columns: 1fr; }
}
</style>
