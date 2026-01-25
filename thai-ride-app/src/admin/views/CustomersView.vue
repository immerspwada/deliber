<script setup lang="ts">
/**
 * Admin Customers View
 * ====================
 * จัดการลูกค้าทั้งหมดในระบบ + ระงับการใช้งาน
 * 
 * Updated to use new useAdminCustomers composable with RPC functions
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useAdminCustomers } from '@/admin/composables/useAdminCustomers'
import { useAdminUIStore } from '../stores/adminUI.store'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useToast } from '@/composables/useToast'

const uiStore = useAdminUIStore()
const errorHandler = useErrorHandler()
const toast = useToast()

// Use new composable
const {
  customers,
  totalCount,
  loading,
  error,
  fetchCustomers,
  fetchCount,
  suspendCustomer: suspendCustomerAction,
  unsuspendCustomer: unsuspendCustomerAction,
  formatCurrency,
  formatDate,
  getStatusLabel,
  getStatusColorHex,
  activeCustomers,
  suspendedCustomers
} = useAdminCustomers()

// Pagination state
const currentPage = ref(1)
const pageSize = ref(20)
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

// Filter state
const searchQuery = ref('')
const statusFilter = ref<'active' | 'suspended' | 'banned' | ''>('')

// UI state
const selectedCustomer = ref<any | null>(null)
const showDetailModal = ref(false)
const showSuspendModal = ref(false)
const suspendReason = ref('')
const suspendingCustomer = ref<any | null>(null)
const isSuspending = ref(false)

// Computed filters
const filters = computed(() => ({
  searchTerm: searchQuery.value || undefined,
  status: statusFilter.value || undefined,
  limit: pageSize.value,
  offset: (currentPage.value - 1) * pageSize.value
}))

// Load customers with error handling
async function loadCustomers() {
  try {
    await fetchCustomers(filters.value)
    await fetchCount({
      searchTerm: searchQuery.value || undefined,
      status: statusFilter.value || undefined
    })
  } catch (e) {
    errorHandler.handle(e, 'loadCustomers')
  }
}

function viewCustomer(customer: any) {
  selectedCustomer.value = customer
  showDetailModal.value = true
}

function openSuspendModal(customer: any) {
  suspendingCustomer.value = customer
  suspendReason.value = ''
  showSuspendModal.value = true
}

async function confirmSuspend() {
  if (!suspendingCustomer.value || !suspendReason.value.trim()) {
    return
  }
  
  isSuspending.value = true
  try {
    await suspendCustomerAction(suspendingCustomer.value.id, suspendReason.value.trim())
    showSuspendModal.value = false
    showDetailModal.value = false
    await loadCustomers()
  } catch (e) {
    errorHandler.handle(e, 'confirmSuspend')
  } finally {
    isSuspending.value = false
  }
}

async function unsuspendCustomer(customer: any) {
  if (!confirm(`ยืนยันการปลดระงับ ${customer.full_name}?`)) return
  
  try {
    await unsuspendCustomerAction(customer.id)
    showDetailModal.value = false
    await loadCustomers()
  } catch (e) {
    errorHandler.handle(e, 'unsuspendCustomer')
  }
}

// Watch for filter changes
watch([searchQuery, statusFilter], () => {
  currentPage.value = 1
  loadCustomers()
})

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
        <span class="total-count">{{ totalCount.toLocaleString() }} คน</span>
      </div>
      <div class="header-stats">
        <div class="stat-badge active">
          <span class="stat-label">ใช้งานปกติ</span>
          <span class="stat-value">{{ activeCustomers.length }}</span>
        </div>
        <div class="stat-badge suspended">
          <span class="stat-label">ระงับแล้ว</span>
          <span class="stat-value">{{ suspendedCustomers.length }}</span>
        </div>
      </div>
      <button class="refresh-btn" :disabled="loading" aria-label="รีเฟรช" @click="loadCustomers">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
      </button>
    </div>

    <div class="filters-bar">
      <div class="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร..." 
          class="search-input"
          aria-label="ค้นหาลูกค้า"
        />
      </div>
      <select v-model="statusFilter" class="filter-select" aria-label="กรองตามสถานะ">
        <option value="">ทุกสถานะ</option>
        <option value="active">ใช้งานปกติ</option>
        <option value="suspended">ระงับแล้ว</option>
        <option value="banned">แบนถาวร</option>
      </select>
    </div>

    <div class="table-container">
      <div v-if="loading" class="loading-state"><div v-for="i in 10" :key="i" class="skeleton" /></div>
      <div v-else-if="error" class="error-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
        <button class="btn btn-primary" @click="loadCustomers">ลองใหม่</button>
      </div>
      <table v-else-if="customers.length > 0" class="data-table">
        <thead><tr><th>ลูกค้า</th><th>ติดต่อ</th><th>สถานะ</th><th>Wallet</th><th>สมัครเมื่อ</th><th></th></tr></thead>
        <tbody>
          <tr v-for="customer in customers" :key="customer.id" :class="{ 'suspended-row': customer.status === 'suspended' }" @click="viewCustomer(customer)">
            <td>
              <div class="customer-cell">
                <div class="avatar" :class="{ suspended: customer.status === 'suspended' }">
                  {{ (customer.full_name || 'U').charAt(0) }}
                </div>
                <div class="info">
                  <div class="name">{{ customer.full_name || '-' }}</div>
                  <div class="email">{{ customer.email || '-' }}</div>
                </div>
              </div>
            </td>
            <td>{{ customer.phone_number || '-' }}</td>
            <td>
              <span class="status-badge" :style="{ color: getStatusColorHex(customer.status), background: getStatusColorHex(customer.status) + '20' }">
                {{ getStatusLabel(customer.status) }}
              </span>
            </td>
            <td class="wallet">{{ formatCurrency(customer.wallet_balance) }}</td>
            <td class="date">{{ formatDate(customer.created_at) }}</td>
            <td class="actions-cell">
              <button class="action-btn" aria-label="ดูรายละเอียด" @click.stop="viewCustomer(customer)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button v-if="customer.status !== 'suspended'" class="action-btn suspend-btn" aria-label="ระงับการใช้งาน" title="ระงับการใช้งาน" @click.stop="openSuspendModal(customer)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
              </button>
              <button v-else class="action-btn unsuspend-btn" aria-label="ปลดระงับ" title="ปลดระงับ" @click.stop="unsuspendCustomer(customer)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state"><p>ไม่พบลูกค้า</p></div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="currentPage === 1" aria-label="หน้าก่อน" @click="currentPage--"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="currentPage === totalPages" aria-label="หน้าถัดไป" @click="currentPage++"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal && selectedCustomer" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>รายละเอียดลูกค้า</h2>
          <button class="close-btn" aria-label="ปิด" @click="showDetailModal = false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div class="modal-body">
          <div class="customer-header">
            <div class="avatar lg" :class="{ suspended: selectedCustomer.status === 'suspended' }">
              {{ (selectedCustomer.full_name || 'U').charAt(0) }}
            </div>
            <div>
              <h3>{{ selectedCustomer.full_name }}</h3>
              <code class="uid">ID: {{ selectedCustomer.id }}</code>
            </div>
          </div>
          
          <!-- Suspension Alert -->
          <div v-if="selectedCustomer.status === 'suspended' && selectedCustomer.suspension_reason" class="suspension-alert">
            <div class="alert-icon">🚫</div>
            <div class="alert-content">
              <div class="alert-title">บัญชีถูกระงับ</div>
              <div class="alert-reason">{{ selectedCustomer.suspension_reason }}</div>
              <div v-if="selectedCustomer.suspended_at" class="alert-date">ระงับเมื่อ: {{ formatDate(selectedCustomer.suspended_at) }}</div>
            </div>
          </div>
          
          <div class="detail-grid">
            <div class="detail-item"><label>อีเมล</label><span>{{ selectedCustomer.email || '-' }}</span></div>
            <div class="detail-item"><label>เบอร์โทร</label><span>{{ selectedCustomer.phone_number || '-' }}</span></div>
            <div class="detail-item"><label>Wallet</label><span>{{ formatCurrency(selectedCustomer.wallet_balance) }}</span></div>
            <div class="detail-item"><label>จำนวนออเดอร์</label><span>{{ selectedCustomer.total_orders || 0 }} ครั้ง</span></div>
            <div class="detail-item"><label>ยอดใช้จ่ายรวม</label><span>{{ formatCurrency(selectedCustomer.total_spent || 0) }}</span></div>
            <div class="detail-item"><label>คะแนนเฉลี่ย</label><span>{{ selectedCustomer.average_rating ? selectedCustomer.average_rating.toFixed(1) : '-' }} ⭐</span></div>
            <div class="detail-item"><label>สถานะ</label><span :style="{ color: getStatusColorHex(selectedCustomer.status) }">{{ getStatusLabel(selectedCustomer.status) }}</span></div>
            <div class="detail-item"><label>สมัครเมื่อ</label><span>{{ formatDate(selectedCustomer.created_at) }}</span></div>
          </div>
          
          <!-- Action Buttons -->
          <div class="modal-actions">
            <button v-if="selectedCustomer.status !== 'suspended'" class="btn btn-danger" @click="openSuspendModal(selectedCustomer)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
              ระงับการใช้งาน
            </button>
            <button v-else class="btn btn-success" @click="unsuspendCustomer(selectedCustomer)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              ปลดระงับ
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Suspend Modal -->
    <div v-if="showSuspendModal && suspendingCustomer" class="modal-overlay" @click.self="showSuspendModal = false">
      <div class="modal suspend-modal">
        <div class="modal-header danger">
          <h2>🚫 ระงับการใช้งาน</h2>
          <button class="close-btn" aria-label="ปิด" @click="showSuspendModal = false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div class="modal-body">
          <div class="suspend-target">
            <div class="avatar">{{ (suspendingCustomer.full_name || 'U').charAt(0) }}</div>
            <div>
              <div class="name">{{ suspendingCustomer.full_name }}</div>
              <div class="email">{{ suspendingCustomer.email || suspendingCustomer.phone_number }}</div>
            </div>
          </div>
          
          <div class="form-group">
            <label for="suspend-reason">เหตุผลในการระงับ <span class="required">*</span></label>
            <textarea id="suspend-reason" v-model="suspendReason" placeholder="ระบุเหตุผลในการระงับบัญชี..." rows="3" class="reason-input"></textarea>
          </div>
          
          <div class="warning-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>ลูกค้าจะไม่สามารถใช้งานแอปได้จนกว่าจะปลดระงับ</span>
          </div>
          
          <div class="modal-actions">
            <button class="btn btn-secondary" :disabled="isSuspending" @click="showSuspendModal = false">ยกเลิก</button>
            <button class="btn btn-danger" :disabled="!suspendReason.trim() || isSuspending" @click="confirmSuspend">
              {{ isSuspending ? 'กำลังดำเนินการ...' : 'ยืนยันระงับ' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.customers-view { max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 24px; font-weight: 700; color: #1F2937; margin: 0; }
.total-count { padding: 4px 12px; background: #E8F5EF; color: #00A86B; font-size: 13px; font-weight: 500; border-radius: 16px; }
.header-stats { display: flex; gap: 8px; }
.stat-badge { display: flex; flex-direction: column; align-items: center; padding: 8px 16px; border-radius: 10px; min-width: 100px; }
.stat-badge.active { background: #D1FAE5; }
.stat-badge.suspended { background: #FEE2E2; }
.stat-label { font-size: 11px; color: #6B7280; font-weight: 500; text-transform: uppercase; }
.stat-value { font-size: 20px; font-weight: 700; margin-top: 2px; }
.stat-badge.active .stat-value { color: #059669; }
.stat-badge.suspended .stat-value { color: #DC2626; }
.refresh-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; color: #6B7280; transition: all 0.15s; }
.refresh-btn:hover:not(:disabled) { background: #F9FAFB; }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.filters-bar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.search-box { flex: 1; min-width: 280px; display: flex; align-items: center; gap: 10px; padding: 0 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; }
.search-box svg { color: #9CA3AF; }
.search-input { flex: 1; padding: 12px 0; border: none; outline: none; font-size: 14px; }
.filter-select { padding: 12px 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 14px; cursor: pointer; }
.table-container { background: #fff; border-radius: 16px; overflow: hidden; }
.loading-state { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.skeleton { height: 56px; background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #9CA3AF; gap: 16px; }
.error-state svg { color: #EF4444; }
.error-state p { font-size: 16px; color: #6B7280; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; background: #F9FAFB; border-bottom: 1px solid #E5E7EB; }
.data-table td { padding: 14px 16px; border-bottom: 1px solid #F3F4F6; }
.data-table tbody tr { cursor: pointer; transition: background 0.15s; }
.data-table tbody tr:hover { background: #F9FAFB; }
.data-table tbody tr.suspended-row { background: #FEF2F2; }
.data-table tbody tr.suspended-row:hover { background: #FEE2E2; }
.customer-cell { display: flex; align-items: center; gap: 12px; }
.avatar { width: 40px; height: 40px; background: #00A86B; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; flex-shrink: 0; }
.avatar.lg { width: 56px; height: 56px; font-size: 20px; }
.avatar.suspended { background: #EF4444; }
.info .name { font-size: 14px; font-weight: 500; color: #1F2937; }
.info .email { font-size: 12px; color: #6B7280; }
.uid { font-family: monospace; font-size: 12px; padding: 4px 8px; background: #F3F4F6; border-radius: 4px; }
.status-badge { display: inline-block; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; }
.wallet { font-weight: 500; color: #059669; }
.date { font-size: 13px; color: #6B7280; }
.actions-cell { display: flex; gap: 4px; }
.action-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6B7280; transition: all 0.15s; }
.action-btn:hover { background: #F3F4F6; }
.action-btn.suspend-btn:hover { background: #FEE2E2; color: #EF4444; }
.action-btn.unsuspend-btn:hover { background: #D1FAE5; color: #059669; }
.empty-state { display: flex; align-items: center; justify-content: center; padding: 60px; color: #9CA3AF; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
.page-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; transition: all 0.15s; }
.page-btn:hover:not(:disabled) { background: #F9FAFB; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 14px; color: #6B7280; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #E5E7EB; }
.modal-header.danger { background: #FEF2F2; border-bottom-color: #FECACA; }
.modal-header.danger h2 { color: #DC2626; }
.modal-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.close-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6B7280; transition: all 0.15s; }
.close-btn:hover { background: #F3F4F6; }
.modal-body { padding: 24px; }
.customer-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.customer-header h3 { font-size: 18px; font-weight: 600; margin: 0 0 4px 0; }
.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item label { font-size: 12px; font-weight: 500; color: #6B7280; text-transform: uppercase; }
.detail-item span { font-size: 14px; color: #1F2937; }
.suspension-alert { display: flex; gap: 12px; padding: 16px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; margin-bottom: 20px; }
.alert-icon { font-size: 24px; }
.alert-content { flex: 1; }
.alert-title { font-weight: 600; color: #DC2626; margin-bottom: 4px; }
.alert-reason { font-size: 14px; color: #7F1D1D; margin-bottom: 4px; }
.alert-date { font-size: 12px; color: #9CA3AF; }
.modal-actions { display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end; }
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: #00A86B; color: #fff; }
.btn-primary:hover:not(:disabled) { background: #008C5A; }
.btn-secondary { background: #F3F4F6; color: #374151; }
.btn-secondary:hover:not(:disabled) { background: #E5E7EB; }
.btn-danger { background: #EF4444; color: #fff; }
.btn-danger:hover:not(:disabled) { background: #DC2626; }
.btn-success { background: #10B981; color: #fff; }
.btn-success:hover:not(:disabled) { background: #059669; }
.suspend-modal { max-width: 450px; }
.suspend-target { display: flex; align-items: center; gap: 12px; padding: 16px; background: #F9FAFB; border-radius: 12px; margin-bottom: 20px; }
.suspend-target .name { font-weight: 500; color: #1F2937; }
.suspend-target .email { font-size: 13px; color: #6B7280; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px; }
.form-group .required { color: #EF4444; }
.reason-input { width: 100%; padding: 12px; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 14px; resize: vertical; font-family: inherit; box-sizing: border-box; }
.reason-input:focus { outline: none; border-color: #00A86B; box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1); }
.warning-box { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #FEF3C7; border-radius: 10px; font-size: 13px; color: #92400E; }
.warning-box svg { flex-shrink: 0; color: #F59E0B; }
</style>
