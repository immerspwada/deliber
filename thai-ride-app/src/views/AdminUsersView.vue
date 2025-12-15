<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAdmin } from '../composables/useAdmin'

const { fetchUsers, updateUserStatus } = useAdmin()

const users = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const search = ref('')
const statusFilter = ref('')

const loadUsers = async () => {
  loading.value = true
  const result = await fetchUsers(page.value, 20, { status: statusFilter.value || undefined, search: search.value || undefined })
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

const getStatusColor = (isActive: boolean) => isActive ? '#05944f' : '#e11900'
const getStatusText = (isActive: boolean) => isActive ? 'ใช้งาน' : 'ระงับ'
const getRoleText = (role: string) => ({ admin: 'แอดมิน', customer: 'ลูกค้า', rider: 'ไรเดอร์', restaurant: 'ร้านอาหาร' }[role] || role)
const formatDate = (d: string) => new Date(d).toLocaleDateString('th-TH')
</script>

<template>
  <AdminLayout>
    <div class="admin-page">
      <div class="page-header">
        <h1>จัดการผู้ใช้งาน</h1>
        <p class="subtitle">{{ total }} ผู้ใช้ทั้งหมด</p>
      </div>

      <div class="filters">
        <div class="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input v-model="search" @keyup.enter="handleSearch" placeholder="ค้นหาชื่อ, อีเมล..." class="search-input"/>
        </div>
        <select v-model="statusFilter" @change="handleFilter" class="filter-select">
          <option value="">ทุกสถานะ</option>
          <option value="active">ใช้งาน</option>
          <option value="inactive">ระงับ</option>
        </select>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <div v-else class="users-list">
        <div v-for="user in users" :key="user.id" class="user-card">
          <div class="user-avatar">{{ user.name?.charAt(0) }}</div>
          <div class="user-info">
            <span class="user-name">{{ user.name }}</span>
            <span class="user-role">{{ getRoleText(user.role) }}</span>
            <span class="user-contact">{{ user.phone }} · {{ user.email }}</span>
          </div>
          <div class="user-meta">
            <span class="user-status" :style="{ color: getStatusColor(user.is_active) }">
              {{ getStatusText(user.is_active) }}
            </span>
            <span class="user-date">{{ formatDate(user.created_at) }}</span>
          </div>
          <div class="user-actions">
            <button v-if="!user.is_active" class="action-btn approve" @click="handleToggleActive(user.id, true)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </button>
            <button v-if="user.is_active && user.role !== 'admin'" class="action-btn reject" @click="handleToggleActive(user.id, false)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.admin-page { padding: 20px; max-width: 900px; margin: 0 auto; }
.page-header { margin-bottom: 20px; }
.page-header h1 { font-size: 24px; font-weight: 700; }
.subtitle { color: #6b6b6b; font-size: 14px; }

.filters { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.search-box { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 0 12px; }
.search-input { flex: 1; border: none; outline: none; padding: 12px 0; font-size: 14px; }
.filter-select { padding: 12px 16px; border: 1px solid #e5e5e5; border-radius: 8px; background: #fff; font-size: 14px; min-width: 140px; }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid #e5e5e5; border-top-color: #000; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.users-list { display: flex; flex-direction: column; gap: 12px; }
.user-card { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 12px; padding: 16px; transition: box-shadow 0.2s; }
.user-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }

.user-avatar { width: 44px; height: 44px; border-radius: 50%; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 18px; flex-shrink: 0; }
.user-info { flex: 1; min-width: 0; }
.user-name { display: block; font-weight: 600; font-size: 15px; }
.user-role { display: block; font-size: 12px; color: #6b6b6b; }
.user-contact { display: block; font-size: 12px; color: #999; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.user-meta { text-align: right; flex-shrink: 0; }
.user-status { display: block; font-size: 12px; font-weight: 500; }
.user-date { display: block; font-size: 11px; color: #999; }

.user-actions { display: flex; gap: 8px; flex-shrink: 0; }
.action-btn { width: 36px; height: 36px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.action-btn.approve { background: #e6f7ed; color: #05944f; }
.action-btn.approve:hover { background: #05944f; color: #fff; }
.action-btn.reject { background: #ffebee; color: #e11900; }
.action-btn.reject:hover { background: #e11900; color: #fff; }

@media (max-width: 640px) {
  .user-card { flex-wrap: wrap; }
  .user-meta { width: 100%; text-align: left; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0; display: flex; justify-content: space-between; }
  .user-actions { margin-left: auto; }
}
</style>
