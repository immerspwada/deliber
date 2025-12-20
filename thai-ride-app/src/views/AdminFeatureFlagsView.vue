<script setup lang="ts">
/**
 * Admin Feature Flags View (F202)
 * จัดการ Feature Flags สำหรับ Admin
 */
import { ref, onMounted, computed } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { fetchFeatureFlags, createFeatureFlag, updateFeatureFlag, deleteFeatureFlag, toggleFeatureFlag } from '../composables/useAdmin'
import { useAdminCleanup } from '../composables/useAdminCleanup'

// Initialize cleanup utility
const { addCleanup } = useAdminCleanup()

interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string | null
  is_enabled: boolean
  rollout_percentage: number
  target_users: string[] | null
  target_roles: string[] | null
  created_at: string
  updated_at?: string
}

const loading = ref(false)
const flags = ref<FeatureFlag[]>([])
const total = ref(0)
const page = ref(1)
const searchQuery = ref('')
const showModal = ref(false)
const editingFlag = ref<FeatureFlag | null>(null)

// Form state
const form = ref({
  key: '',
  name: '',
  description: '',
  isEnabled: false,
  rolloutPercentage: 100,
  targetRoles: [] as string[]
})

// Register cleanup for memory optimization
addCleanup(() => {
  flags.value = []
  total.value = 0
  page.value = 1
  searchQuery.value = ''
  showModal.value = false
  editingFlag.value = null
  form.value = {
    key: '',
    name: '',
    description: '',
    isEnabled: false,
    rolloutPercentage: 100,
    targetRoles: []
  }
  loading.value = false
  console.log('[AdminFeatureFlagsView] Cleanup complete')
})

const availableRoles = ['customer', 'provider', 'admin', 'premium', 'vip']

const filteredFlags = computed(() => {
  if (!searchQuery.value) return flags.value
  const q = searchQuery.value.toLowerCase()
  return flags.value.filter(f => 
    f.key.toLowerCase().includes(q) || 
    f.name.toLowerCase().includes(q) ||
    f.description?.toLowerCase().includes(q)
  )
})

const loadFlags = async () => {
  loading.value = true
  try {
    const result = await fetchFeatureFlags(page.value, 50)
    flags.value = result.data
    total.value = result.total
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  editingFlag.value = null
  form.value = {
    key: '',
    name: '',
    description: '',
    isEnabled: false,
    rolloutPercentage: 100,
    targetRoles: []
  }
  showModal.value = true
}

const openEditModal = (flag: FeatureFlag) => {
  editingFlag.value = flag
  form.value = {
    key: flag.key,
    name: flag.name,
    description: flag.description || '',
    isEnabled: flag.is_enabled,
    rolloutPercentage: flag.rollout_percentage,
    targetRoles: flag.target_roles || []
  }
  showModal.value = true
}

const saveFlag = async () => {
  loading.value = true
  try {
    if (editingFlag.value) {
      await updateFeatureFlag(editingFlag.value.id, {
        name: form.value.name,
        description: form.value.description,
        isEnabled: form.value.isEnabled,
        rolloutPercentage: form.value.rolloutPercentage,
        targetRoles: form.value.targetRoles.length > 0 ? form.value.targetRoles : undefined
      })
    } else {
      await createFeatureFlag({
        key: form.value.key,
        name: form.value.name,
        description: form.value.description,
        isEnabled: form.value.isEnabled,
        rolloutPercentage: form.value.rolloutPercentage,
        targetRoles: form.value.targetRoles.length > 0 ? form.value.targetRoles : undefined
      })
    }
    showModal.value = false
    await loadFlags()
  } finally {
    loading.value = false
  }
}

const handleToggle = async (flag: FeatureFlag) => {
  await toggleFeatureFlag(flag.id, !flag.is_enabled)
  flag.is_enabled = !flag.is_enabled
}

const handleDelete = async (flag: FeatureFlag) => {
  if (!confirm(`ยืนยันลบ Feature Flag "${flag.name}"?`)) return
  loading.value = true
  try {
    await deleteFeatureFlag(flag.id)
    await loadFlags()
  } finally {
    loading.value = false
  }
}

onMounted(loadFlags)
</script>

<template>
  <AdminLayout>
    <div class="admin-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Feature Flags</h1>
          <p class="page-subtitle">จัดการ Feature Flags สำหรับควบคุมฟีเจอร์</p>
        </div>
        <button class="btn-primary" @click="openCreateModal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          สร้าง Flag ใหม่
        </button>
      </div>

      <!-- Search -->
      <div class="search-bar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input v-model="searchQuery" type="text" placeholder="ค้นหา flag..." class="search-input">
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ flags.length }}</div>
          <div class="stat-label">ทั้งหมด</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-green">{{ flags.filter(f => f.is_enabled).length }}</div>
          <div class="stat-label">เปิดใช้งาน</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-gray">{{ flags.filter(f => !f.is_enabled).length }}</div>
          <div class="stat-label">ปิดใช้งาน</div>
        </div>
        <div class="stat-card">
          <div class="stat-value text-blue">{{ flags.filter(f => f.rollout_percentage < 100).length }}</div>
          <div class="stat-label">Gradual Rollout</div>
        </div>
      </div>

      <!-- Flags List -->
      <div class="flags-list">
        <div v-if="loading" class="loading-state">กำลังโหลด...</div>
        <div v-else-if="filteredFlags.length === 0" class="empty-state">ไม่พบ Feature Flags</div>
        <div v-else v-for="flag in filteredFlags" :key="flag.id" class="flag-card">
          <div class="flag-header">
            <div class="flag-info">
              <div class="flag-name">{{ flag.name }}</div>
              <code class="flag-key">{{ flag.key }}</code>
            </div>
            <label class="toggle">
              <input type="checkbox" :checked="flag.is_enabled" @change="handleToggle(flag)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          
          <p v-if="flag.description" class="flag-description">{{ flag.description }}</p>
          
          <div class="flag-meta">
            <div class="meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              {{ flag.rollout_percentage }}% rollout
            </div>
            <div v-if="flag.target_roles?.length" class="meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              </svg>
              {{ flag.target_roles.join(', ') }}
            </div>
          </div>
          
          <div class="flag-actions">
            <button class="btn-icon" @click="openEditModal(flag)" title="แก้ไข">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-icon btn-danger" @click="handleDelete(flag)" title="ลบ">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ editingFlag ? 'แก้ไข Feature Flag' : 'สร้าง Feature Flag ใหม่' }}</h2>
            <button class="btn-close" @click="showModal = false">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <div class="form-group" v-if="!editingFlag">
              <label>Key (ไม่สามารถแก้ไขได้)</label>
              <input v-model="form.key" type="text" placeholder="feature_key" class="form-input">
              <small>ใช้ snake_case เช่น new_booking_flow</small>
            </div>
            
            <div class="form-group">
              <label>ชื่อ</label>
              <input v-model="form.name" type="text" placeholder="Feature Name" class="form-input">
            </div>
            
            <div class="form-group">
              <label>คำอธิบาย</label>
              <textarea v-model="form.description" placeholder="รายละเอียด..." class="form-textarea" rows="3"></textarea>
            </div>
            
            <div class="form-group">
              <label>Rollout Percentage</label>
              <div class="range-input">
                <input v-model.number="form.rolloutPercentage" type="range" min="0" max="100" class="form-range">
                <span class="range-value">{{ form.rolloutPercentage }}%</span>
              </div>
            </div>
            
            <div class="form-group">
              <label>Target Roles (ถ้าไม่เลือก = ทุกคน)</label>
              <div class="checkbox-group">
                <label v-for="role in availableRoles" :key="role" class="checkbox-label">
                  <input type="checkbox" :value="role" v-model="form.targetRoles">
                  {{ role }}
                </label>
              </div>
            </div>
            
            <div class="form-group">
              <label class="toggle-label">
                <input type="checkbox" v-model="form.isEnabled">
                <span class="toggle-slider"></span>
                เปิดใช้งาน
              </label>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn-secondary" @click="showModal = false">ยกเลิก</button>
            <button class="btn-primary" @click="saveFlag" :disabled="loading">
              {{ loading ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.admin-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: #666;
  margin: 4px 0 0;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #008F5B;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 12px;
  margin-bottom: 24px;
}

.search-bar svg {
  color: #999;
}

.search-input {
  flex: 1;
  border: none;
  background: none;
  font-size: 15px;
  outline: none;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
}

.stat-value.text-green { color: #00A86B; }
.stat-value.text-gray { color: #999; }
.stat-value.text-blue { color: #3B82F6; }

.stat-label {
  font-size: 13px;
  color: #666;
  margin-top: 4px;
}

.flags-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.flag-card {
  background: white;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
}

.flag-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.flag-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.flag-key {
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
  margin-top: 4px;
  display: inline-block;
}

.flag-description {
  font-size: 14px;
  color: #666;
  margin: 0 0 12px;
}

.flag-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
}

.flag-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #e5e5e5;
  color: #1a1a1a;
}

.btn-icon.btn-danger:hover {
  background: #FEE2E2;
  color: #DC2626;
}

/* Toggle */
.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 28px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 28px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle input:checked + .toggle-slider {
  background-color: #00A86B;
}

.toggle input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.btn-close {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 8px;
  color: #666;
}

.btn-close:hover {
  background: #f5f5f5;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.form-group small {
  display: block;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.form-input, .form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  font-size: 15px;
  transition: border-color 0.2s;
}

.form-input:focus, .form-textarea:focus {
  outline: none;
  border-color: #00A86B;
}

.range-input {
  display: flex;
  align-items: center;
  gap: 16px;
}

.form-range {
  flex: 1;
  height: 8px;
  -webkit-appearance: none;
  background: #e8e8e8;
  border-radius: 4px;
}

.form-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  background: #00A86B;
  border-radius: 50%;
  cursor: pointer;
}

.range-value {
  font-size: 14px;
  font-weight: 600;
  color: #00A86B;
  min-width: 50px;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #f0f0f0;
}

.btn-secondary {
  padding: 12px 20px;
  background: #f5f5f5;
  color: #1a1a1a;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #e5e5e5;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
