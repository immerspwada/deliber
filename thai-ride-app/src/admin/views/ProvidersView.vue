<script setup lang="ts">
/**
 * Admin Providers View
 * ====================
 * จัดการผู้ให้บริการทั้งหมด
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useAdminAPI } from '../composables/useAdminAPI'
import { useAdminUIStore } from '../stores/adminUI.store'
import type { Provider, UserFilters, ProviderStatus } from '../types'

const api = useAdminAPI()
const uiStore = useAdminUIStore()

const providers = ref<Provider[]>([])
const totalProviders = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const totalPages = ref(0)
const searchQuery = ref('')
const statusFilter = ref('')
const sortBy = ref('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
const selectedProvider = ref<Provider | null>(null)
const showDetailModal = ref(false)
const showActionModal = ref(false)
const actionType = ref<'approve' | 'reject' | 'suspend'>('approve')
const actionReason = ref('')

const filters = computed<UserFilters>(() => ({
  search: searchQuery.value || undefined,
  status: statusFilter.value || undefined,
  sortBy: sortBy.value,
  sortOrder: sortOrder.value
}))

async function loadProviders() {
  const result = await api.getProviders(filters.value, { page: currentPage.value, limit: pageSize.value })
  providers.value = result.data
  totalProviders.value = result.total
  totalPages.value = result.totalPages
}

function viewProvider(provider: Provider) {
  selectedProvider.value = provider
  showDetailModal.value = true
}

function openActionModal(provider: Provider, action: 'approve' | 'reject' | 'suspend') {
  selectedProvider.value = provider
  actionType.value = action
  actionReason.value = ''
  showActionModal.value = true
}

async function executeAction() {
  if (!selectedProvider.value) return
  const statusMap: Record<string, ProviderStatus> = { approve: 'approved', reject: 'rejected', suspend: 'suspended' }
  const success = await api.updateProviderStatus(selectedProvider.value.id, statusMap[actionType.value], actionReason.value)
  if (success) {
    uiStore.showSuccess(`${actionType.value === 'approve' ? 'อนุมัติ' : actionType.value === 'reject' ? 'ปฏิเสธ' : 'ระงับ'}เรียบร้อย`)
    showActionModal.value = false
    showDetailModal.value = false
    loadProviders()
  } else {
    uiStore.showError('เกิดข้อผิดพลาด')
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(amount)
}

function getStatusColor(status: string) {
  return { approved: '#10B981', active: '#10B981', pending: '#F59E0B', rejected: '#EF4444', suspended: '#EF4444' }[status] || '#6B7280'
}

function getStatusLabel(status: string) {
  return { approved: 'อนุมัติแล้ว', active: 'ใช้งาน', pending: 'รอตรวจสอบ', rejected: 'ปฏิเสธ', suspended: 'ระงับ' }[status] || status
}

function getTypeLabel(type: string) {
  return { driver: 'คนขับรถ', rider: 'ไรเดอร์', shopper: 'นักช้อป', mover: 'ขนย้าย', laundry: 'ซักผ้า' }[type] || type
}

watch([searchQuery, statusFilter, sortBy, sortOrder], () => { currentPage.value = 1; loadProviders() })
watch(currentPage, loadProviders)

onMounted(() => {
  uiStore.setBreadcrumbs([{ label: 'Users', path: '/admin/providers' }, { label: 'ผู้ให้บริการ' }])
  loadProviders()
})
</script>

<template>
  <div class="providers-view">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">ผู้ให้บริการ</h1>
        <span class="total-count">{{ totalProviders.toLocaleString() }} คน</span>
      </div>
      <button class="refresh-btn" @click="loadProviders" :disabled="api.isLoading.value">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
      </button>
    </div>

    <div class="filters-bar">
      <div class="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input v-model="searchQuery" type="text" placeholder="ค้นหาชื่อ, Provider UID, เบอร์โทร..." class="search-input" />
      </div>
      <select v-model="statusFilter" class="filter-select">
        <option value="">ทุกสถานะ</option>
        <option value="pending">รอตรวจสอบ</option>
        <option value="approved">อนุมัติแล้ว</option>
        <option value="suspended">ระงับ</option>
      </select>
    </div>

    <div class="table-container">
      <div v-if="api.isLoading.value" class="loading-state"><div class="skeleton" v-for="i in 10" :key="i" /></div>
      <table v-else-if="providers.length > 0" class="data-table">
        <thead><tr><th>ผู้ให้บริการ</th><th>Provider UID</th><th>ประเภท</th><th>สถานะ</th><th>ออนไลน์</th><th>คะแนน</th><th>รายได้</th><th></th></tr></thead>
        <tbody>
          <tr v-for="provider in providers" :key="provider.id" @click="viewProvider(provider)">
            <td><div class="provider-cell"><div class="avatar">{{ (provider.first_name || 'P').charAt(0) }}</div><div class="info"><div class="name">{{ provider.first_name }} {{ provider.last_name }}</div><div class="phone">{{ provider.phone_number || '-' }}</div></div></div></td>
            <td><code class="uid">{{ provider.provider_uid || '-' }}</code></td>
            <td><span class="type-badge">{{ getTypeLabel(provider.provider_type) }}</span></td>
            <td><span class="status-badge" :style="{ color: getStatusColor(provider.status), background: getStatusColor(provider.status) + '20' }">{{ getStatusLabel(provider.status) }}</span></td>
            <td><span class="online-status" :class="{ online: provider.is_online }">{{ provider.is_online ? 'ออนไลน์' : 'ออฟไลน์' }}</span></td>
            <td><div class="rating"><svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>{{ provider.rating?.toFixed(1) || '-' }}</div></td>
            <td class="earnings">{{ formatCurrency(provider.total_earnings || 0) }}</td>
            <td><button class="action-btn" @click.stop="viewProvider(provider)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state"><p>ไม่พบผู้ให้บริการ</p></div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal && selectedProvider" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal">
        <div class="modal-header"><h2>รายละเอียดผู้ให้บริการ</h2><button class="close-btn" @click="showDetailModal = false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
        <div class="modal-body">
          <div class="provider-header"><div class="avatar lg">{{ (selectedProvider.first_name || 'P').charAt(0) }}</div><div><h3>{{ selectedProvider.first_name }} {{ selectedProvider.last_name }}</h3><code class="uid">{{ selectedProvider.provider_uid }}</code></div></div>
          <div class="detail-grid">
            <div class="detail-item"><label>ประเภท</label><span>{{ getTypeLabel(selectedProvider.provider_type) }}</span></div>
            <div class="detail-item"><label>สถานะ</label><span class="status-badge" :style="{ color: getStatusColor(selectedProvider.status), background: getStatusColor(selectedProvider.status) + '20' }">{{ getStatusLabel(selectedProvider.status) }}</span></div>
            <div class="detail-item"><label>เบอร์โทร</label><span>{{ selectedProvider.phone_number || '-' }}</span></div>
            <div class="detail-item"><label>อีเมล</label><span>{{ selectedProvider.email || '-' }}</span></div>
            <div class="detail-item"><label>ยานพาหนะ</label><span>{{ selectedProvider.vehicle_type || '-' }} {{ selectedProvider.vehicle_plate || '' }}</span></div>
            <div class="detail-item"><label>คะแนน</label><span>{{ selectedProvider.rating?.toFixed(1) || '-' }} / 5.0</span></div>
            <div class="detail-item"><label>จำนวนเที่ยว</label><span>{{ selectedProvider.total_trips || 0 }} เที่ยว</span></div>
            <div class="detail-item"><label>รายได้รวม</label><span>{{ formatCurrency(selectedProvider.total_earnings || 0) }}</span></div>
          </div>
          <div class="modal-actions">
            <button v-if="selectedProvider.status === 'pending'" class="btn btn-success" @click="openActionModal(selectedProvider, 'approve')">อนุมัติ</button>
            <button v-if="selectedProvider.status === 'pending'" class="btn btn-danger" @click="openActionModal(selectedProvider, 'reject')">ปฏิเสธ</button>
            <button v-if="selectedProvider.status === 'approved' || selectedProvider.status === 'active'" class="btn btn-warning" @click="openActionModal(selectedProvider, 'suspend')">ระงับ</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Modal -->
    <div v-if="showActionModal" class="modal-overlay" @click.self="showActionModal = false">
      <div class="modal modal-sm">
        <div class="modal-header"><h2>{{ actionType === 'approve' ? 'อนุมัติผู้ให้บริการ' : actionType === 'reject' ? 'ปฏิเสธผู้ให้บริการ' : 'ระงับผู้ให้บริการ' }}</h2><button class="close-btn" @click="showActionModal = false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
        <div class="modal-body">
          <p v-if="actionType === 'approve'">ยืนยันอนุมัติ {{ selectedProvider?.first_name }} {{ selectedProvider?.last_name }}?</p>
          <div v-else class="form-group">
            <label>เหตุผล</label>
            <textarea v-model="actionReason" rows="3" placeholder="ระบุเหตุผล..."></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showActionModal = false">ยกเลิก</button>
            <button :class="['btn', actionType === 'approve' ? 'btn-success' : 'btn-danger']" @click="executeAction">ยืนยัน</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.providers-view { max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 24px; font-weight: 700; color: #1F2937; margin: 0; }
.total-count { padding: 4px 12px; background: #E8F5EF; color: #00A86B; font-size: 13px; font-weight: 500; border-radius: 16px; }
.refresh-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; color: #6B7280; }
.filters-bar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.search-box { flex: 1; min-width: 280px; display: flex; align-items: center; gap: 10px; padding: 0 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; }
.search-box svg { color: #9CA3AF; }
.search-input { flex: 1; padding: 12px 0; border: none; outline: none; font-size: 14px; }
.filter-select { padding: 12px 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 14px; }
.table-container { background: #fff; border-radius: 16px; overflow: hidden; }
.loading-state { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.skeleton { height: 56px; background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; background: #F9FAFB; border-bottom: 1px solid #E5E7EB; }
.data-table td { padding: 14px 16px; border-bottom: 1px solid #F3F4F6; }
.data-table tbody tr { cursor: pointer; transition: background 0.15s; }
.data-table tbody tr:hover { background: #F9FAFB; }
.provider-cell { display: flex; align-items: center; gap: 12px; }
.avatar { width: 40px; height: 40px; background: #F59E0B; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; }
.avatar.lg { width: 56px; height: 56px; font-size: 20px; }
.info .name { font-size: 14px; font-weight: 500; color: #1F2937; }
.info .phone { font-size: 12px; color: #6B7280; }
.uid { font-family: monospace; font-size: 12px; padding: 4px 8px; background: #F3F4F6; border-radius: 4px; }
.type-badge { padding: 4px 10px; background: #EEF2FF; color: #4F46E5; border-radius: 16px; font-size: 12px; font-weight: 500; }
.status-badge { display: inline-block; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; }
.online-status { font-size: 13px; color: #6B7280; }
.online-status.online { color: #10B981; }
.rating { display: flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 500; }
.earnings { font-weight: 500; color: #059669; }
.action-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6B7280; }
.action-btn:hover { background: #F3F4F6; }
.empty-state { display: flex; align-items: center; justify-content: center; padding: 60px; color: #9CA3AF; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
.page-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 14px; color: #6B7280; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 560px; }
.modal.modal-sm { max-width: 400px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #E5E7EB; }
.modal-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.close-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6B7280; }
.modal-body { padding: 24px; }
.provider-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.provider-header h3 { font-size: 18px; font-weight: 600; margin: 0 0 4px 0; }
.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item label { font-size: 12px; font-weight: 500; color: #6B7280; text-transform: uppercase; }
.detail-item span { font-size: 14px; color: #1F2937; }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
.btn { padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-success { background: #10B981; color: #fff; }
.btn-danger { background: #EF4444; color: #fff; }
.btn-warning { background: #F59E0B; color: #fff; }
.btn-secondary { background: #F3F4F6; color: #374151; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px; }
.form-group textarea { width: 100%; padding: 12px; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 14px; resize: vertical; }
</style>
