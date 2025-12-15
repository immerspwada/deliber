<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAdmin } from '../composables/useAdmin'

const { fetchProviders, updateProviderStatus } = useAdmin()

const providers = ref<any[]>([])
const total = ref(0)
const loading = ref(true)
const typeFilter = ref('')
const statusFilter = ref('')

const loadProviders = async () => {
  loading.value = true
  const result = await fetchProviders(1, 50, { type: typeFilter.value || undefined, status: statusFilter.value || undefined })
  providers.value = result.data
  total.value = result.total
  loading.value = false
}

onMounted(loadProviders)

const handleToggleVerified = async (id: string, isVerified: boolean) => {
  await updateProviderStatus(id, isVerified)
  loadProviders()
}

const getStatusColor = (isVerified: boolean) => isVerified ? '#05944f' : '#ffc043'
const getStatusText = (isVerified: boolean) => isVerified ? 'ยืนยันแล้ว' : 'รอยืนยัน'
const getTypeText = (t: string) => ({ driver: 'คนขับ', delivery: 'ส่งของ', both: 'ทั้งสอง' }[t] || t)
</script>

<template>
  <AdminLayout>
    <div class="admin-page">
      <div class="page-header">
        <h1>จัดการผู้ให้บริการ</h1>
        <p class="subtitle">{{ total }} ผู้ให้บริการทั้งหมด</p>
      </div>

      <div class="filters">
        <select v-model="typeFilter" @change="loadProviders" class="filter-select">
          <option value="">ทุกประเภท</option>
          <option value="driver">คนขับ</option>
          <option value="delivery">ส่งของ</option>
          <option value="shopper">ซื้อของ</option>
        </select>
        <select v-model="statusFilter" @change="loadProviders" class="filter-select">
          <option value="">ทุกสถานะ</option>
          <option value="pending">รอยืนยัน</option>
          <option value="verified">ยืนยันแล้ว</option>
        </select>
      </div>

      <div v-if="loading" class="loading-state"><div class="spinner"></div></div>

      <div v-else class="providers-list">
        <div v-for="p in providers" :key="p.id" class="provider-card">
          <div class="provider-header">
            <div class="provider-avatar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
              </svg>
            </div>
            <div class="provider-info">
              <span class="provider-name">{{ p.users?.name }}</span>
              <span class="provider-email">{{ p.users?.email }}</span>
            </div>
            <span class="provider-type">{{ getTypeText(p.provider_type) }}</span>
          </div>

          <div class="provider-details">
            <div class="detail-item">
              <span class="detail-label">ยานพาหนะ</span>
              <span class="detail-value">{{ p.vehicle_type || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">ทะเบียน</span>
              <span class="detail-value">{{ p.vehicle_plate || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">คะแนน</span>
              <span class="detail-value">{{ p.rating?.toFixed(1) || '0.0' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">เที่ยว</span>
              <span class="detail-value">{{ p.total_trips || 0 }}</span>
            </div>
          </div>

          <div class="provider-footer">
            <div class="status-badge" :style="{ color: getStatusColor(p.is_verified) }">
              <span class="status-dot" :style="{ background: getStatusColor(p.is_verified) }"></span>
              {{ getStatusText(p.is_verified) }}
            </div>
            <div class="online-status" :class="{ online: p.is_available }">
              {{ p.is_available ? 'พร้อมรับงาน' : 'ไม่พร้อม' }}
            </div>
            <div class="provider-actions">
              <button v-if="!p.is_verified" class="action-btn approve" @click="handleToggleVerified(p.id, true)">ยืนยัน</button>
              <button v-if="p.is_verified" class="action-btn reject" @click="handleToggleVerified(p.id, false)">ระงับ</button>
            </div>
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

.filters { display: flex; gap: 12px; margin-bottom: 20px; }
.filter-select { padding: 12px 16px; border: 1px solid #e5e5e5; border-radius: 8px; background: #fff; font-size: 14px; }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid #e5e5e5; border-top-color: #000; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.providers-list { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }

.provider-card { background: #fff; border-radius: 12px; padding: 16px; transition: box-shadow 0.2s; }
.provider-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }

.provider-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.provider-avatar { width: 48px; height: 48px; border-radius: 12px; background: #f6f6f6; display: flex; align-items: center; justify-content: center; color: #000; }
.provider-info { flex: 1; }
.provider-name { display: block; font-weight: 600; font-size: 15px; }
.provider-email { display: block; font-size: 11px; color: #999; }
.provider-type { font-size: 12px; padding: 4px 10px; background: #f6f6f6; border-radius: 20px; font-weight: 500; }

.provider-details { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 12px 0; border-top: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0; }
.detail-item { }
.detail-label { display: block; font-size: 11px; color: #999; }
.detail-value { font-size: 14px; font-weight: 500; }

.provider-footer { display: flex; align-items: center; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
.status-badge { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.online-status { font-size: 12px; color: #999; }
.online-status.online { color: #05944f; }

.provider-actions { display: flex; gap: 8px; margin-left: auto; }
.action-btn { padding: 8px 16px; border-radius: 6px; border: none; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.action-btn.approve { background: #000; color: #fff; }
.action-btn.approve:hover { background: #333; }
.action-btn.reject { background: #f6f6f6; color: #e11900; }
.action-btn.reject:hover { background: #ffebee; }
</style>
