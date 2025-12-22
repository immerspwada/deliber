<script setup lang="ts">
/**
 * Admin Customers View
 * ====================
 * จัดการลูกค้าทั้งหมดในระบบ
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useAdminAPI } from '../composables/useAdminAPI'
import { useAdminUIStore } from '../stores/adminUI.store'
import type { Customer, UserFilters } from '../types'

const api = useAdminAPI()
const uiStore = useAdminUIStore()

const customers = ref<Customer[]>([])
const totalCustomers = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const totalPages = ref(0)
const searchQuery = ref('')
const statusFilter = ref('')
const sortBy = ref('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
const selectedCustomer = ref<Customer | null>(null)
const showDetailModal = ref(false)

const filters = computed<UserFilters>(() => ({
  search: searchQuery.value || undefined,
  status: statusFilter.value || undefined,
  sortBy: sortBy.value,
  sortOrder: sortOrder.value
}))

async function loadCustomers() {
  const result = await api.getCustomers(filters.value, { page: currentPage.value, limit: pageSize.value })
  customers.value = result.data
  totalCustomers.value = result.total
  totalPages.value = result.totalPages
}

function viewCustomer(customer: Customer) {
  selectedCustomer.value = customer
  showDetailModal.value = true
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(amount)
}

function getStatusColor(status: string) {
  return { verified: '#10B981', pending: '#F59E0B', rejected: '#EF4444' }[status] || '#6B7280'
}

function getStatusLabel(status: string) {
  return { verified: 'ยืนยันแล้ว', pending: 'รอยืนยัน', rejected: 'ปฏิเสธ' }[status] || status
}

watch([searchQuery, statusFilter, sortBy, sortOrder], () => { currentPage.value = 1; loadCustomers() })
watch(currentPage, loadCustomers)

onMounted(() => {
  uiStore.setBreadcrumbs([{ label: 'Users', path: '/admin/customers' }, { label: 'ลูกค้า' }])
  loadCustomers()
})
</script>

<template>
  <div class="customers-view">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">ลูกค้า</h1>
        <span class="total-count">{{ totalCustomers.toLocaleString() }} คน</span>
      </div>
      <button class="refresh-btn" @click="loadCustomers" :disabled="api.isLoading.value">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
      </button>
    </div>

    <div class="filters-bar">
      <div class="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input v-model="searchQuery" type="text" placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร..." class="search-input" />
      </div>
      <select v-model="statusFilter" class="filter-select">
        <option value="">ทุกสถานะ</option>
        <option value="verified">ยืนยันแล้ว</option>
        <option value="pending">รอยืนยัน</option>
      </select>
      <select v-model="sortBy" class="filter-select">
        <option value="created_at">วันที่สมัคร</option>
        <option value="first_name">ชื่อ</option>
      </select>
    </div>

    <div class="table-container">
      <div v-if="api.isLoading.value" class="loading-state"><div class="skeleton" v-for="i in 10" :key="i" /></div>
      <table v-else-if="customers.length > 0" class="data-table">
        <thead><tr><th>ลูกค้า</th><th>Member UID</th><th>ติดต่อ</th><th>สถานะ</th><th>Wallet</th><th>สมัครเมื่อ</th><th></th></tr></thead>
        <tbody>
          <tr v-for="customer in customers" :key="customer.id" @click="viewCustomer(customer)">
            <td><div class="customer-cell"><div class="avatar">{{ (customer.first_name || 'U').charAt(0) }}</div><div class="info"><div class="name">{{ customer.first_name }} {{ customer.last_name }}</div><div class="email">{{ customer.email || '-' }}</div></div></div></td>
            <td><code class="uid">{{ customer.member_uid || '-' }}</code></td>
            <td>{{ customer.phone_number || '-' }}</td>
            <td><span class="status-badge" :style="{ color: getStatusColor(customer.verification_status), background: getStatusColor(customer.verification_status) + '20' }">{{ getStatusLabel(customer.verification_status) }}</span></td>
            <td class="wallet">{{ formatCurrency(customer.wallet_balance) }}</td>
            <td class="date">{{ formatDate(customer.created_at) }}</td>
            <td><button class="action-btn" @click.stop="viewCustomer(customer)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state"><p>ไม่พบลูกค้า</p></div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button>
    </div>

    <div v-if="showDetailModal && selectedCustomer" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal">
        <div class="modal-header"><h2>รายละเอียดลูกค้า</h2><button class="close-btn" @click="showDetailModal = false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
        <div class="modal-body">
          <div class="customer-header"><div class="avatar lg">{{ (selectedCustomer.first_name || 'U').charAt(0) }}</div><div><h3>{{ selectedCustomer.first_name }} {{ selectedCustomer.last_name }}</h3><code class="uid">{{ selectedCustomer.member_uid }}</code></div></div>
          <div class="detail-grid">
            <div class="detail-item"><label>อีเมล</label><span>{{ selectedCustomer.email || '-' }}</span></div>
            <div class="detail-item"><label>เบอร์โทร</label><span>{{ selectedCustomer.phone_number || '-' }}</span></div>
            <div class="detail-item"><label>Wallet</label><span>{{ formatCurrency(selectedCustomer.wallet_balance) }}</span></div>
            <div class="detail-item"><label>แต้มสะสม</label><span>{{ selectedCustomer.loyalty_points.toLocaleString() }} แต้ม</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.customers-view { max-width: 1400px; margin: 0 auto; }
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
.customer-cell { display: flex; align-items: center; gap: 12px; }
.avatar { width: 40px; height: 40px; background: #00A86B; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; }
.avatar.lg { width: 56px; height: 56px; font-size: 20px; }
.info .name { font-size: 14px; font-weight: 500; color: #1F2937; }
.info .email { font-size: 12px; color: #6B7280; }
.uid { font-family: monospace; font-size: 12px; padding: 4px 8px; background: #F3F4F6; border-radius: 4px; }
.status-badge { display: inline-block; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; }
.wallet { font-weight: 500; color: #059669; }
.date { font-size: 13px; color: #6B7280; }
.action-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6B7280; }
.action-btn:hover { background: #F3F4F6; }
.empty-state { display: flex; align-items: center; justify-content: center; padding: 60px; color: #9CA3AF; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
.page-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 14px; color: #6B7280; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 500px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #E5E7EB; }
.modal-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.close-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6B7280; }
.modal-body { padding: 24px; }
.customer-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.customer-header h3 { font-size: 18px; font-weight: 600; margin: 0 0 4px 0; }
.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item label { font-size: 12px; font-weight: 500; color: #6B7280; text-transform: uppercase; }
.detail-item span { font-size: 14px; color: #1F2937; }
</style>
