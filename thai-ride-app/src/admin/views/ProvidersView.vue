<script setup lang="ts">
/**
 * Admin Providers View
 * ====================
 * จัดการผู้ให้บริการทั้งหมด
 * 
 * Updated to use new useAdminProviders composable with RPC functions
 * Added real-time subscriptions for provider status changes
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAdminProviders } from '@/admin/composables/useAdminProviders'
import { useAdminUIStore } from '../stores/adminUI.store'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useToast } from '@/composables/useToast'
import { useAdminRealtime } from '@/admin/composables/useAdminRealtime'

const uiStore = useAdminUIStore()
const errorHandler = useErrorHandler()
const toast = useToast()
const realtime = useAdminRealtime()

// Use new composable
const {
  providers,
  totalCount,
  loading,
  error,
  fetchProviders,
  fetchCount,
  approveProvider: approveProviderAction,
  rejectProvider: rejectProviderAction,
  suspendProvider: suspendProviderAction,
  formatCurrency,
  formatDate,
  getStatusLabel,
  getStatusColor,
  getProviderTypeLabel,
  pendingProviders,
  approvedProviders,
  rejectedProviders,
  suspendedProviders,
  onlineProviders
} = useAdminProviders()

// Pagination state
const currentPage = ref(1)
const pageSize = ref(20)
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

// Filter state
const searchQuery = ref('')
const statusFilter = ref<'pending' | 'approved' | 'rejected' | 'suspended' | ''>('')
const typeFilter = ref<'ride' | 'delivery' | 'shopping' | 'all' | ''>('')

// UI state
const selectedProvider = ref<any | null>(null)
const showDetailModal = ref(false)
const showActionModal = ref(false)
const actionType = ref<'approve' | 'reject' | 'suspend'>('approve')
const actionReason = ref('')
const isProcessing = ref(false)

// Computed filters
const filters = computed(() => ({
  status: statusFilter.value || undefined,
  provider_type: typeFilter.value || undefined,
  limit: pageSize.value,
  offset: (currentPage.value - 1) * pageSize.value
}))

// Load providers with error handling
async function loadProviders() {
  try {
    await fetchProviders(filters.value)
    await fetchCount({
      status: statusFilter.value || undefined,
      provider_type: typeFilter.value || undefined
    })
  } catch (e) {
    errorHandler.handle(e, 'loadProviders')
  }
}

function viewProvider(provider: any) {
  selectedProvider.value = provider
  showDetailModal.value = true
}

function openActionModal(provider: any, action: 'approve' | 'reject' | 'suspend') {
  selectedProvider.value = provider
  actionType.value = action
  actionReason.value = ''
  showActionModal.value = true
}

async function executeAction() {
  if (!selectedProvider.value) return
  
  if ((actionType.value === 'reject' || actionType.value === 'suspend') && !actionReason.value.trim()) {
    toast.error('กรุณาระบุเหตุผล')
    return
  }
  
  isProcessing.value = true
  try {
    if (actionType.value === 'approve') {
      await approveProviderAction(selectedProvider.value.id, actionReason.value || 'อนุมัติโดยแอดมิน')
      toast.success('อนุมัติผู้ให้บริการเรียบร้อยแล้ว')
    } else if (actionType.value === 'reject') {
      await rejectProviderAction(selectedProvider.value.id, actionReason.value)
      toast.success('ปฏิเสธผู้ให้บริการเรียบร้อยแล้ว')
    } else if (actionType.value === 'suspend') {
      await suspendProviderAction(selectedProvider.value.id, actionReason.value)
      toast.success('ระงับผู้ให้บริการเรียบร้อยแล้ว')
    }
    
    showActionModal.value = false
    showDetailModal.value = false
    await loadProviders()
  } catch (e) {
    errorHandler.handle(e, 'executeAction')
  } finally {
    isProcessing.value = false
  }
}

// Setup real-time subscriptions
const setupRealtime = () => {
  realtime.subscribeToProviders((table, eventType) => {
    console.log(`[ProvidersView] Realtime update: ${table} ${eventType}`)
    // Reload providers when changes occur
    loadProviders()
  })
}

// Watch for filter changes
watch([searchQuery, statusFilter, typeFilter], () => {
  currentPage.value = 1
  loadProviders()
})

watch(currentPage, loadProviders)

onMounted(() => {
  uiStore.setBreadcrumbs([{ label: 'Users', path: '/admin/providers' }, { label: 'ผู้ให้บริการ' }])
  loadProviders()
  setupRealtime()
})

onUnmounted(() => {
  realtime.unsubscribe()
})
</script>

<template>
  <div class="providers-view">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">ผู้ให้บริการ</h1>
        <span class="total-count">{{ totalCount.toLocaleString() }} คน</span>
        <span
          class="realtime-indicator"
          :class="{ connected: realtime.isConnected.value }"
          :title="realtime.isConnected.value ? 'Real-time connected' : 'Connecting...'"
        >
          <span class="pulse-dot"></span>
          {{ realtime.isConnected.value ? 'Live' : '...' }}
        </span>
      </div>
      <div class="header-stats">
        <div class="stat-badge pending">
          <span class="stat-label">รอตรวจสอบ</span>
          <span class="stat-value">{{ pendingProviders.length }}</span>
        </div>
        <div class="stat-badge approved">
          <span class="stat-label">อนุมัติแล้ว</span>
          <span class="stat-value">{{ approvedProviders.length }}</span>
        </div>
        <div class="stat-badge online">
          <span class="stat-label">ออนไลน์</span>
          <span class="stat-value">{{ onlineProviders.length }}</span>
        </div>
      </div>
      <button class="refresh-btn" @click="loadProviders" :disabled="loading" aria-label="รีเฟรช">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
      </button>
    </div>

    <div class="filters-bar">
      <div class="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="ค้นหาชื่อ, เบอร์โทร..." 
          class="search-input"
          aria-label="ค้นหาผู้ให้บริการ"
        />
      </div>
      <select v-model="statusFilter" class="filter-select" aria-label="กรองตามสถานะ">
        <option value="">ทุกสถานะ</option>
        <option value="pending">รอตรวจสอบ</option>
        <option value="approved">อนุมัติแล้ว</option>
        <option value="rejected">ปฏิเสธ</option>
        <option value="suspended">ระงับ</option>
      </select>
      <select v-model="typeFilter" class="filter-select" aria-label="กรองตามประเภท">
        <option value="">ทุกประเภท</option>
        <option value="ride">Ride</option>
        <option value="delivery">Delivery</option>
        <option value="shopping">Shopping</option>
        <option value="all">All Services</option>
      </select>
    </div>

    <div class="table-container">
      <div v-if="loading" class="loading-state"><div class="skeleton" v-for="i in 10" :key="i" /></div>
      <div v-else-if="error" class="error-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
        <button class="btn btn-primary" @click="loadProviders">ลองใหม่</button>
      </div>
      <table v-else-if="providers.length > 0" class="data-table">
        <thead><tr><th>ผู้ให้บริการ</th><th>ประเภท</th><th>สถานะ</th><th>ออนไลน์</th><th>คะแนน</th><th>รายได้</th><th></th></tr></thead>
        <tbody>
          <tr v-for="provider in providers" :key="provider.id" @click="viewProvider(provider)">
            <td>
              <div class="provider-cell">
                <div class="avatar">{{ (provider.first_name || 'P').charAt(0) }}</div>
                <div class="info">
                  <div class="name">{{ provider.first_name }} {{ provider.last_name }}</div>
                  <div class="phone">{{ provider.phone_number || '-' }}</div>
                </div>
              </div>
            </td>
            <td><span class="type-badge">{{ getProviderTypeLabel(provider.provider_type) }}</span></td>
            <td>
              <span class="status-badge" :style="{ color: getStatusColor(provider.status), background: getStatusColor(provider.status) + '20' }">
                {{ getStatusLabel(provider.status) }}
              </span>
            </td>
            <td><span class="online-status" :class="{ online: provider.is_online }">{{ provider.is_online ? 'ออนไลน์' : 'ออฟไลน์' }}</span></td>
            <td>
              <div class="rating">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                {{ provider.rating?.toFixed(1) || '-' }}
              </div>
            </td>
            <td class="earnings">{{ formatCurrency(provider.total_earnings || 0) }}</td>
            <td>
              <button class="action-btn" @click.stop="viewProvider(provider)" aria-label="ดูรายละเอียด">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </td>
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
          <div class="provider-header">
            <div class="avatar lg">{{ (selectedProvider.first_name || 'P').charAt(0) }}</div>
            <div>
              <h3>{{ selectedProvider.first_name }} {{ selectedProvider.last_name }}</h3>
              <code class="uid">ID: {{ selectedProvider.id }}</code>
            </div>
          </div>
          <div class="detail-grid">
            <div class="detail-item"><label>ประเภท</label><span>{{ getProviderTypeLabel(selectedProvider.provider_type) }}</span></div>
            <div class="detail-item">
              <label>สถานะ</label>
              <span class="status-badge" :style="{ color: getStatusColor(selectedProvider.status), background: getStatusColor(selectedProvider.status) + '20' }">
                {{ getStatusLabel(selectedProvider.status) }}
              </span>
            </div>
            <div class="detail-item"><label>เบอร์โทร</label><span>{{ selectedProvider.phone_number || '-' }}</span></div>
            <div class="detail-item"><label>อีเมล</label><span>{{ selectedProvider.email || '-' }}</span></div>
            <div class="detail-item"><label>คะแนน</label><span>{{ selectedProvider.rating?.toFixed(1) || '-' }} / 5.0</span></div>
            <div class="detail-item"><label>จำนวนเที่ยว</label><span>{{ selectedProvider.total_trips || 0 }} เที่ยว</span></div>
            <div class="detail-item"><label>รายได้รวม</label><span>{{ formatCurrency(selectedProvider.total_earnings || 0) }}</span></div>
            <div class="detail-item"><label>Wallet</label><span>{{ formatCurrency(selectedProvider.wallet_balance || 0) }}</span></div>
            <div class="detail-item"><label>เอกสาร</label><span>{{ selectedProvider.documents_verified ? '✅ ตรวจสอบแล้ว' : '⏳ รอตรวจสอบ' }}</span></div>
            <div class="detail-item"><label>สมัครเมื่อ</label><span>{{ formatDate(selectedProvider.created_at) }}</span></div>
          </div>
          <div class="modal-actions">
            <button v-if="selectedProvider.status === 'pending'" class="btn btn-success" @click="openActionModal(selectedProvider, 'approve')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              อนุมัติ
            </button>
            <button v-if="selectedProvider.status === 'pending'" class="btn btn-danger" @click="openActionModal(selectedProvider, 'reject')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              ปฏิเสธ
            </button>
            <button v-if="selectedProvider.status === 'approved'" class="btn btn-warning" @click="openActionModal(selectedProvider, 'suspend')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
              ระงับ
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Modal -->
    <div v-if="showActionModal" class="modal-overlay" @click.self="showActionModal = false">
      <div class="modal modal-sm">
        <div class="modal-header" :class="{ danger: actionType !== 'approve' }">
          <h2>
            {{ actionType === 'approve' ? '✅ อนุมัติผู้ให้บริการ' : actionType === 'reject' ? '❌ ปฏิเสธผู้ให้บริการ' : '🚫 ระงับผู้ให้บริการ' }}
          </h2>
          <button class="close-btn" @click="showActionModal = false" aria-label="ปิด">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="provider-target">
            <div class="avatar">{{ (selectedProvider?.first_name || 'P').charAt(0) }}</div>
            <div>
              <div class="name">{{ selectedProvider?.first_name }} {{ selectedProvider?.last_name }}</div>
              <div class="email">{{ selectedProvider?.email || selectedProvider?.phone_number }}</div>
            </div>
          </div>
          
          <div v-if="actionType === 'approve'" class="info-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
            </svg>
            <span>ผู้ให้บริการจะสามารถเริ่มรับงานได้ทันที</span>
          </div>
          
          <div v-else class="form-group">
            <label for="action-reason">เหตุผล <span class="required">*</span></label>
            <textarea 
              id="action-reason"
              v-model="actionReason" 
              rows="3" 
              placeholder="ระบุเหตุผล..."
              class="reason-input"
            ></textarea>
          </div>
          
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showActionModal = false" :disabled="isProcessing">ยกเลิก</button>
            <button 
              :class="['btn', actionType === 'approve' ? 'btn-success' : 'btn-danger']" 
              @click="executeAction"
              :disabled="isProcessing || (actionType !== 'approve' && !actionReason.trim())"
            >
              {{ isProcessing ? 'กำลังดำเนินการ...' : 'ยืนยัน' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.providers-view { max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 24px; font-weight: 700; color: #1F2937; margin: 0; }
.total-count { padding: 4px 12px; background: #E8F5EF; color: #00A86B; font-size: 13px; font-weight: 500; border-radius: 16px; }
.realtime-indicator { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: #F3F4F6; color: #6B7280; font-size: 12px; font-weight: 500; border-radius: 16px; transition: all 0.3s; }
.realtime-indicator.connected { background: #D1FAE5; color: #059669; }
.pulse-dot { width: 6px; height: 6px; background: #9CA3AF; border-radius: 50%; }
.realtime-indicator.connected .pulse-dot { background: #10B981; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.header-stats { display: flex; gap: 8px; }
.stat-badge { display: flex; flex-direction: column; align-items: center; padding: 8px 16px; border-radius: 10px; min-width: 100px; }
.stat-badge.pending { background: #FEF3C7; }
.stat-badge.approved { background: #D1FAE5; }
.stat-badge.online { background: #DBEAFE; }
.stat-label { font-size: 11px; color: #6B7280; font-weight: 500; text-transform: uppercase; }
.stat-value { font-size: 20px; font-weight: 700; margin-top: 2px; }
.stat-badge.pending .stat-value { color: #D97706; }
.stat-badge.approved .stat-value { color: #059669; }
.stat-badge.online .stat-value { color: #2563EB; }
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
.provider-cell { display: flex; align-items: center; gap: 12px; }
.avatar { width: 40px; height: 40px; background: #F59E0B; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; flex-shrink: 0; }
.avatar.lg { width: 56px; height: 56px; font-size: 20px; }
.info .name { font-size: 14px; font-weight: 500; color: #1F2937; }
.info .phone { font-size: 12px; color: #6B7280; }
.uid { font-family: monospace; font-size: 12px; padding: 4px 8px; background: #F3F4F6; border-radius: 4px; }
.type-badge { padding: 4px 10px; background: #EEF2FF; color: #4F46E5; border-radius: 16px; font-size: 12px; font-weight: 500; }
.status-badge { display: inline-block; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; }
.online-status { font-size: 13px; color: #6B7280; }
.online-status.online { color: #10B981; font-weight: 500; }
.rating { display: flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 500; }
.earnings { font-weight: 500; color: #059669; }
.action-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6B7280; transition: all 0.15s; }
.action-btn:hover { background: #F3F4F6; }
.empty-state { display: flex; align-items: center; justify-content: center; padding: 60px; color: #9CA3AF; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
.page-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; transition: all 0.15s; }
.page-btn:hover:not(:disabled) { background: #F9FAFB; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 14px; color: #6B7280; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; }
.modal.modal-sm { max-width: 450px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #E5E7EB; }
.modal-header.danger { background: #FEF2F2; border-bottom-color: #FECACA; }
.modal-header.danger h2 { color: #DC2626; }
.modal-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.close-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6B7280; transition: all 0.15s; }
.close-btn:hover { background: #F3F4F6; }
.modal-body { padding: 24px; }
.provider-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.provider-header h3 { font-size: 18px; font-weight: 600; margin: 0 0 4px 0; }
.provider-target { display: flex; align-items: center; gap: 12px; padding: 16px; background: #F9FAFB; border-radius: 12px; margin-bottom: 20px; }
.provider-target .name { font-weight: 500; color: #1F2937; }
.provider-target .email { font-size: 13px; color: #6B7280; }
.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item label { font-size: 12px; font-weight: 500; color: #6B7280; text-transform: uppercase; }
.detail-item span { font-size: 14px; color: #1F2937; }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: #00A86B; color: #fff; }
.btn-primary:hover:not(:disabled) { background: #008C5A; }
.btn-success { background: #10B981; color: #fff; }
.btn-success:hover:not(:disabled) { background: #059669; }
.btn-danger { background: #EF4444; color: #fff; }
.btn-danger:hover:not(:disabled) { background: #DC2626; }
.btn-warning { background: #F59E0B; color: #fff; }
.btn-warning:hover:not(:disabled) { background: #D97706; }
.btn-secondary { background: #F3F4F6; color: #374151; }
.btn-secondary:hover:not(:disabled) { background: #E5E7EB; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px; }
.form-group .required { color: #EF4444; }
.reason-input { width: 100%; padding: 12px; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 14px; resize: vertical; font-family: inherit; box-sizing: border-box; }
.reason-input:focus { outline: none; border-color: #00A86B; box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1); }
.info-box { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #DBEAFE; border-radius: 10px; font-size: 13px; color: #1E40AF; margin-bottom: 20px; }
.info-box svg { flex-shrink: 0; color: #3B82F6; }
</style>
