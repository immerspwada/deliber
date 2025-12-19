<script setup lang="ts">
/**
 * AdminTopupRequestsView - Admin Topup Approval System
 * Feature: F05 - Wallet/Balance (Admin Side)
 * 
 * Admin สามารถ:
 * - ดูคำขอเติมเงินทั้งหมด
 * - อนุมัติ/ปฏิเสธคำขอ
 * - ดูสถิติการเติมเงิน
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useWalletV2, type TopupRequest } from '../composables/useWalletV2'
import AdminLayout from '../components/AdminLayout.vue'

const {
  pendingTopups, fetchPendingTopups, fetchAllTopupRequests, approveTopup, rejectTopup,
  getAdminStats, subscribeToPendingTopups, formatTopupStatus, formatPaymentMethod
} = useWalletV2()

const loading = ref(true)
const allRequests = ref<TopupRequest[]>([])
const stats = ref<any>(null)
const activeTab = ref<'pending' | 'all'>('pending')
const statusFilter = ref('all')
const processing = ref<string | null>(null)

// Modal state
const showApproveModal = ref(false)
const showRejectModal = ref(false)
const selectedRequest = ref<TopupRequest | null>(null)
const adminNote = ref('')
const resultMessage = ref({ show: false, success: false, text: '' })

let subscription: { unsubscribe: () => void } | null = null

onMounted(async () => {
  await loadData()
  subscription = subscribeToPendingTopups()
})

onUnmounted(() => subscription?.unsubscribe())

const loadData = async () => {
  loading.value = true
  await Promise.all([
    fetchPendingTopups(),
    loadAllRequests(),
    loadStats()
  ])
  loading.value = false
}

const loadAllRequests = async () => {
  allRequests.value = await fetchAllTopupRequests({ 
    status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
    limit: 200 
  })
}

const loadStats = async () => {
  stats.value = await getAdminStats()
}

const filteredRequests = computed(() => {
  if (activeTab.value === 'pending') return pendingTopups.value
  return allRequests.value
})

const openApproveModal = (req: TopupRequest) => {
  selectedRequest.value = req
  adminNote.value = ''
  showApproveModal.value = true
}

const openRejectModal = (req: TopupRequest) => {
  selectedRequest.value = req
  adminNote.value = ''
  showRejectModal.value = true
}

const handleApprove = async () => {
  if (!selectedRequest.value) return
  processing.value = selectedRequest.value.id
  const result = await approveTopup(selectedRequest.value.id, adminNote.value || undefined)
  processing.value = null
  showApproveModal.value = false
  showResult(result.success, result.message)
  if (result.success) {
    await loadData()
  }
}

const handleReject = async () => {
  if (!selectedRequest.value || !adminNote.value) return
  processing.value = selectedRequest.value.id
  const result = await rejectTopup(selectedRequest.value.id, adminNote.value)
  processing.value = null
  showRejectModal.value = false
  showResult(result.success, result.message)
  if (result.success) {
    await loadData()
  }
}

const showResult = (success: boolean, text: string) => {
  resultMessage.value = { show: true, success, text }
  setTimeout(() => { resultMessage.value.show = false }, 4000)
}

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('th-TH', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
})

const onFilterChange = async () => {
  await loadAllRequests()
}
</script>

<template>
  <AdminLayout>
    <div class="admin-page">
      <header class="page-header">
        <h1>จัดการคำขอเติมเงิน</h1>
        <button @click="loadData" class="btn-refresh">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          รีเฟรช
        </button>
      </header>

      <!-- Result Message -->
      <div v-if="resultMessage.show" :class="['result-toast', resultMessage.success ? 'success' : 'error']">
        {{ resultMessage.text }}
      </div>

      <!-- Stats -->
      <div v-if="stats" class="stats-grid">
        <div class="stat-card">
          <span class="stat-value warning">{{ stats.pending_topups || 0 }}</span>
          <span class="stat-label">รอดำเนินการ</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">฿{{ (stats.pending_topup_amount || 0).toLocaleString() }}</span>
          <span class="stat-label">ยอดรอดำเนินการ</span>
        </div>
        <div class="stat-card">
          <span class="stat-value success">{{ stats.today_topups || 0 }}</span>
          <span class="stat-label">อนุมัติวันนี้</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">฿{{ (stats.today_topup_amount || 0).toLocaleString() }}</span>
          <span class="stat-label">ยอดอนุมัติวันนี้</span>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-row">
        <div class="tabs">
          <button :class="['tab', { active: activeTab === 'pending' }]" @click="activeTab = 'pending'">
            รอดำเนินการ
            <span v-if="pendingTopups.length" class="badge">{{ pendingTopups.length }}</span>
          </button>
          <button :class="['tab', { active: activeTab === 'all' }]" @click="activeTab = 'all'">
            ทั้งหมด
          </button>
        </div>
        
        <select v-if="activeTab === 'all'" v-model="statusFilter" @change="onFilterChange" class="filter-select">
          <option value="all">ทุกสถานะ</option>
          <option value="pending">รอดำเนินการ</option>
          <option value="approved">อนุมัติแล้ว</option>
          <option value="rejected">ปฏิเสธ</option>
          <option value="cancelled">ยกเลิก</option>
          <option value="expired">หมดอายุ</option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading"><div class="spinner"></div></div>

      <!-- Empty State -->
      <div v-else-if="filteredRequests.length === 0" class="empty-state">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p>{{ activeTab === 'pending' ? 'ไม่มีคำขอที่รอดำเนินการ' : 'ไม่พบรายการ' }}</p>
      </div>

      <!-- Requests Table -->
      <div v-else class="table-container">
        <table>
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ผู้ใช้</th>
              <th>จำนวน</th>
              <th>ช่องทาง</th>
              <th>สถานะ</th>
              <th>วันที่</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in filteredRequests" :key="req.id">
              <td class="tracking">{{ req.tracking_id }}</td>
              <td>
                <div class="user-info">
                  <span class="user-name">{{ req.user?.name || '-' }}</span>
                  <span class="user-contact">{{ req.user?.phone || req.user?.email }}</span>
                </div>
              </td>
              <td class="amount">฿{{ req.amount.toLocaleString() }}</td>
              <td>{{ formatPaymentMethod(req.payment_method) }}</td>
              <td>
                <span :class="['status-badge', formatTopupStatus(req.status).color]">
                  {{ formatTopupStatus(req.status).label }}
                </span>
              </td>
              <td class="date">{{ formatDate(req.created_at) }}</td>
              <td>
                <div v-if="req.status === 'pending'" class="action-btns">
                  <button @click="openApproveModal(req)" class="btn-approve" :disabled="processing === req.id">
                    อนุมัติ
                  </button>
                  <button @click="openRejectModal(req)" class="btn-reject" :disabled="processing === req.id">
                    ปฏิเสธ
                  </button>
                </div>
                <span v-else class="no-action">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Approve Modal -->
      <div v-if="showApproveModal" class="modal-overlay" @click.self="showApproveModal = false">
        <div class="modal-content">
          <h3>อนุมัติคำขอเติมเงิน</h3>
          <div class="modal-info">
            <p><strong>รหัส:</strong> {{ selectedRequest?.tracking_id }}</p>
            <p><strong>ผู้ใช้:</strong> {{ selectedRequest?.user?.name }}</p>
            <p><strong>จำนวน:</strong> ฿{{ selectedRequest?.amount.toLocaleString() }}</p>
            <p><strong>ช่องทาง:</strong> {{ formatPaymentMethod(selectedRequest?.payment_method || '') }}</p>
          </div>
          <div class="form-group">
            <label>หมายเหตุ (ถ้ามี)</label>
            <textarea v-model="adminNote" placeholder="หมายเหตุสำหรับการอนุมัติ..."></textarea>
          </div>
          <div class="modal-actions">
            <button @click="showApproveModal = false" class="btn-secondary">ยกเลิก</button>
            <button @click="handleApprove" :disabled="!!processing" class="btn-approve-lg">
              {{ processing ? 'กำลังดำเนินการ...' : 'ยืนยันอนุมัติ' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Reject Modal -->
      <div v-if="showRejectModal" class="modal-overlay" @click.self="showRejectModal = false">
        <div class="modal-content">
          <h3>ปฏิเสธคำขอเติมเงิน</h3>
          <div class="modal-info">
            <p><strong>รหัส:</strong> {{ selectedRequest?.tracking_id }}</p>
            <p><strong>ผู้ใช้:</strong> {{ selectedRequest?.user?.name }}</p>
            <p><strong>จำนวน:</strong> ฿{{ selectedRequest?.amount.toLocaleString() }}</p>
          </div>
          <div class="form-group">
            <label>เหตุผลในการปฏิเสธ <span class="required">*</span></label>
            <textarea v-model="adminNote" placeholder="กรุณาระบุเหตุผล..." required></textarea>
          </div>
          <div class="modal-actions">
            <button @click="showRejectModal = false" class="btn-secondary">ยกเลิก</button>
            <button @click="handleReject" :disabled="!!processing || !adminNote" class="btn-reject-lg">
              {{ processing ? 'กำลังดำเนินการ...' : 'ยืนยันปฏิเสธ' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.admin-page { padding: 20px; max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h1 { font-size: 24px; font-weight: 600; }
.btn-refresh { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #f6f6f6; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
.btn-refresh svg { width: 18px; height: 18px; }
.btn-refresh:hover { background: #e5e5e5; }

.result-toast { position: fixed; top: 80px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; z-index: 1001; }
.result-toast.success { background: #dcfce7; color: #166534; }
.result-toast.error { background: #fee2e2; color: #991b1b; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.stat-value { display: block; font-size: 28px; font-weight: 700; margin-bottom: 4px; }
.stat-value.warning { color: #f59e0b; }
.stat-value.success { color: #22c55e; }
.stat-label { font-size: 13px; color: #6b6b6b; }

.tabs-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.tabs { display: flex; gap: 8px; }
.tab { padding: 10px 20px; border: none; background: #f6f6f6; border-radius: 8px; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.tab.active { background: #000; color: #fff; }
.badge { background: #ef4444; color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.tab.active .badge { background: #fff; color: #000; }
.filter-select { padding: 10px 16px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; outline: none; }

.loading { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid #e5e5e5; border-top-color: #000; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state { text-align: center; padding: 60px 20px; color: #6b6b6b; }
.empty-state svg { width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5; }

.table-container { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 14px 16px; text-align: left; border-bottom: 1px solid #e5e5e5; }
th { background: #f6f6f6; font-size: 12px; font-weight: 600; color: #6b6b6b; text-transform: uppercase; }
td { font-size: 14px; }
.tracking { font-family: monospace; font-size: 13px; color: #6b6b6b; }
.user-info { display: flex; flex-direction: column; }
.user-name { font-weight: 500; }
.user-contact { font-size: 12px; color: #6b6b6b; }
.amount { font-weight: 600; font-family: monospace; }
.date { font-size: 13px; color: #6b6b6b; }

.status-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.status-badge.warning { background: #fef3c7; color: #92400e; }
.status-badge.success { background: #dcfce7; color: #166534; }
.status-badge.error { background: #fee2e2; color: #991b1b; }
.status-badge.gray { background: #f3f4f6; color: #6b7280; }

.action-btns { display: flex; gap: 8px; }
.btn-approve { padding: 6px 14px; background: #dcfce7; color: #166534; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-approve:hover { background: #bbf7d0; }
.btn-approve:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-reject { padding: 6px 14px; background: #fee2e2; color: #991b1b; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-reject:hover { background: #fecaca; }
.btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }
.no-action { color: #999; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-content { background: #fff; border-radius: 16px; padding: 24px; width: 100%; max-width: 420px; }
.modal-content h3 { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
.modal-info { background: #f6f6f6; padding: 14px; border-radius: 10px; margin-bottom: 16px; }
.modal-info p { margin: 6px 0; font-size: 14px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; }
.form-group .required { color: #ef4444; }
.form-group textarea { width: 100%; padding: 12px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; height: 80px; resize: none; }
.modal-actions { display: flex; gap: 12px; margin-top: 20px; }
.btn-secondary { flex: 1; padding: 12px; border: 1px solid #e5e5e5; border-radius: 8px; background: #fff; font-size: 14px; cursor: pointer; }
.btn-approve-lg { flex: 1; padding: 12px; border: none; border-radius: 8px; background: #22c55e; color: #fff; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-approve-lg:disabled { opacity: 0.5; }
.btn-reject-lg { flex: 1; padding: 12px; border: none; border-radius: 8px; background: #ef4444; color: #fff; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-reject-lg:disabled { opacity: 0.5; }

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .tabs-row { flex-direction: column; gap: 12px; align-items: stretch; }
  .table-container { overflow-x: auto; }
}
</style>
