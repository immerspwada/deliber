<script setup lang="ts">
/**
 * CustomerWithdrawalsView - Admin Customer Withdrawals Management
 * Feature: F05 - Customer Withdrawal System (Admin Side)
 */
import { ref, computed, onMounted } from 'vue'
import { useAdminWithdrawals } from '../composables/useAdminWithdrawals'

const {
  withdrawals,
  stats,
  loading,
  fetchWithdrawals,
  fetchStats,
  approveWithdrawal,
  rejectWithdrawal,
  completeWithdrawal,
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusLabel
} = useAdminWithdrawals()

// State
const statusFilter = ref<string>('')
const searchQuery = ref('')
const selectedWithdrawal = ref<any>(null)
const showProcessModal = ref(false)
const processAction = ref<'approve' | 'reject' | 'complete'>('approve')
const processReason = ref('')
const processNotes = ref('')
const processLoading = ref(false)

// Toast
const toast = ref({ show: false, success: false, text: '' })

// Computed
const filteredWithdrawals = computed(() => {
  let filtered = withdrawals.value

  if (statusFilter.value) {
    filtered = filtered.filter(w => w.status === statusFilter.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(w => 
      w.withdrawal_uid?.toLowerCase().includes(query) ||
      w.user_name?.toLowerCase().includes(query) ||
      w.user_email?.toLowerCase().includes(query) ||
      w.bank_name?.toLowerCase().includes(query)
    )
  }

  return filtered
})

// Lifecycle
onMounted(async () => {
  await loadAllData()
})

// Functions
const loadAllData = async () => {
  await Promise.all([
    fetchWithdrawals(),
    fetchStats()
  ])
}

const handleStatusFilter = async (status: string) => {
  statusFilter.value = status
  await fetchWithdrawals(status || undefined)
}

const openProcessModal = (withdrawal: any, action: 'approve' | 'reject' | 'complete') => {
  selectedWithdrawal.value = withdrawal
  processAction.value = action
  processReason.value = ''
  processNotes.value = ''
  showProcessModal.value = true
}

const handleProcess = async () => {
  if (!selectedWithdrawal.value) return

  processLoading.value = true
  try {
    let result

    switch (processAction.value) {
      case 'approve':
        result = await approveWithdrawal(selectedWithdrawal.value.id, processNotes.value)
        break
      case 'reject':
        if (!processReason.value.trim()) {
          showToast(false, 'กรุณาระบุเหตุผลการปฏิเสธ')
          return
        }
        result = await rejectWithdrawal(selectedWithdrawal.value.id, processReason.value, processNotes.value)
        break
      case 'complete':
        result = await completeWithdrawal(selectedWithdrawal.value.id, processNotes.value)
        break
    }

    if (result.success) {
      showProcessModal.value = false
      showToast(true, result.message)
      await loadAllData()
    } else {
      showToast(false, result.message)
    }
  } catch (err: any) {
    showToast(false, err.message || 'เกิดข้อผิดพลาด')
  } finally {
    processLoading.value = false
  }
}

const showToast = (success: boolean, text: string) => {
  toast.value = { show: true, success, text }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

const getActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    approve: 'อนุมัติ',
    reject: 'ปฏิเสธ',
    complete: 'เสร็จสิ้น'
  }
  return labels[action] || action
}

const canProcess = (withdrawal: any, action: string) => {
  switch (action) {
    case 'approve':
    case 'reject':
      return withdrawal.status === 'pending'
    case 'complete':
      return withdrawal.status === 'approved'
    default:
      return false
  }
}
</script>

<template>
  <div class="customer-withdrawals-view">
    <!-- Toast -->
    <Transition name="toast">
      <div
        v-if="toast.show"
        :class="['toast', toast.success ? 'success' : 'error']"
      >
        <svg
          v-if="toast.success"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        {{ toast.text }}
      </div>
    </Transition>

    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>การถอนเงินลูกค้า</h1>
        <p>จัดการคำขอถอนเงินของลูกค้า</p>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon pending">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.pending_count }}</span>
          <span class="stat-label">รอดำเนินการ</span>
          <span class="stat-amount">{{ formatCurrency(stats.pending_amount) }}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon approved">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.approved_count }}</span>
          <span class="stat-label">อนุมัติแล้ว</span>
          <span class="stat-amount">{{ formatCurrency(stats.approved_amount) }}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon completed">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.completed_count }}</span>
          <span class="stat-label">เสร็จสิ้น</span>
          <span class="stat-amount">{{ formatCurrency(stats.completed_amount) }}</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon today">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.today_count }}</span>
          <span class="stat-label">วันนี้</span>
          <span class="stat-amount">{{ formatCurrency(stats.today_amount) }}</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="filter-tabs">
        <button
          :class="['filter-tab', { active: statusFilter === '' }]"
          @click="handleStatusFilter('')"
        >
          ทั้งหมด ({{ stats.total_count }})
        </button>
        <button
          :class="['filter-tab', { active: statusFilter === 'pending' }]"
          @click="handleStatusFilter('pending')"
        >
          รอดำเนินการ ({{ stats.pending_count }})
        </button>
        <button
          :class="['filter-tab', { active: statusFilter === 'approved' }]"
          @click="handleStatusFilter('approved')"
        >
          อนุมัติแล้ว ({{ stats.approved_count }})
        </button>
        <button
          :class="['filter-tab', { active: statusFilter === 'completed' }]"
          @click="handleStatusFilter('completed')"
        >
          เสร็จสิ้น ({{ stats.completed_count }})
        </button>
        <button
          :class="['filter-tab', { active: statusFilter === 'rejected' }]"
          @click="handleStatusFilter('rejected')"
        >
          ปฏิเสธ ({{ stats.rejected_count }})
        </button>
      </div>

      <div class="search-box">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหาด้วยรหัส, ชื่อ, อีเมล, ธนาคาร..."
        />
      </div>
    </div>

    <!-- Withdrawals Table -->
    <div class="table-container">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>กำลังโหลดข้อมูล...</p>
      </div>

      <div v-else-if="filteredWithdrawals.length === 0" class="empty-state">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        <p>ไม่พบข้อมูลการถอนเงิน</p>
      </div>

      <div v-else class="withdrawals-table">
        <div class="table-header">
          <div class="header-cell">รหัส</div>
          <div class="header-cell">ลูกค้า</div>
          <div class="header-cell">จำนวน</div>
          <div class="header-cell">ธนาคาร</div>
          <div class="header-cell">สถานะ</div>
          <div class="header-cell">วันที่</div>
          <div class="header-cell">การดำเนินการ</div>
        </div>

        <div
          v-for="withdrawal in filteredWithdrawals"
          :key="withdrawal.id"
          class="table-row"
        >
          <div class="table-cell">
            <span class="withdrawal-uid">{{ withdrawal.withdrawal_uid }}</span>
          </div>
          <div class="table-cell">
            <div class="user-info">
              <span class="user-name">{{ withdrawal.user_name }}</span>
              <span class="user-email">{{ withdrawal.user_email }}</span>
            </div>
          </div>
          <div class="table-cell">
            <span class="amount">{{ formatCurrency(withdrawal.amount) }}</span>
          </div>
          <div class="table-cell">
            <div class="bank-info">
              <span class="bank-name">{{ withdrawal.bank_name }}</span>
              <span class="account-number">{{ withdrawal.bank_account_number }}</span>
            </div>
          </div>
          <div class="table-cell">
            <span
              class="status-badge"
              :style="{
                color: getStatusColor(withdrawal.status),
                background: getStatusColor(withdrawal.status) + '20',
              }"
            >
              {{ getStatusLabel(withdrawal.status) }}
            </span>
          </div>
          <div class="table-cell">
            <span class="date">{{ formatDate(withdrawal.created_at) }}</span>
          </div>
          <div class="table-cell">
            <div class="action-buttons">
              <button
                v-if="canProcess(withdrawal, 'approve')"
                @click="openProcessModal(withdrawal, 'approve')"
                class="action-btn approve"
                title="อนุมัติ"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
              <button
                v-if="canProcess(withdrawal, 'reject')"
                @click="openProcessModal(withdrawal, 'reject')"
                class="action-btn reject"
                title="ปฏิเสธ"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <button
                v-if="canProcess(withdrawal, 'complete')"
                @click="openProcessModal(withdrawal, 'complete')"
                class="action-btn complete"
                title="เสร็จสิ้น"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Process Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showProcessModal"
          class="modal-overlay"
          @click.self="showProcessModal = false"
        >
          <div class="modal">
            <div class="modal-header">
              <h2>{{ getActionLabel(processAction) }}การถอนเงิน</h2>
              <button @click="showProcessModal = false" class="modal-close">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div v-if="selectedWithdrawal" class="withdrawal-details">
                <div class="detail-row">
                  <span class="label">รหัส:</span>
                  <span class="value">{{ selectedWithdrawal.withdrawal_uid }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">ลูกค้า:</span>
                  <span class="value">{{ selectedWithdrawal.user_name }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">จำนวน:</span>
                  <span class="value amount">{{ formatCurrency(selectedWithdrawal.amount) }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">ธนาคาร:</span>
                  <span class="value">{{ selectedWithdrawal.bank_name }} - {{ selectedWithdrawal.bank_account_number }}</span>
                </div>
              </div>

              <div v-if="processAction === 'reject'" class="form-group">
                <label>เหตุผลการปฏิเสธ *</label>
                <textarea
                  v-model="processReason"
                  placeholder="ระบุเหตุผลการปฏิเสธ..."
                  rows="3"
                  class="form-textarea"
                ></textarea>
              </div>

              <div class="form-group">
                <label>หมายเหตุเพิ่มเติม</label>
                <textarea
                  v-model="processNotes"
                  placeholder="หมายเหตุสำหรับทีมงาน (ไม่บังคับ)..."
                  rows="2"
                  class="form-textarea"
                ></textarea>
              </div>

              <div class="modal-actions">
                <button @click="showProcessModal = false" class="btn-cancel">
                  ยกเลิก
                </button>
                <button
                  @click="handleProcess"
                  :disabled="processLoading"
                  :class="['btn-primary', processAction]"
                >
                  {{ processLoading ? 'กำลังดำเนินการ...' : getActionLabel(processAction) }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.customer-withdrawals-view {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Toast */
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.toast.success {
  background: #10b981;
  color: white;
}

.toast.error {
  background: #ef4444;
  color: white;
}

.toast svg {
  width: 18px;
  height: 18px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* Header */
.page-header {
  margin-bottom: 24px;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.header-content p {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: white;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.stat-icon.pending {
  background: #fef3c7;
  color: #f59e0b;
}

.stat-icon.approved {
  background: #dbeafe;
  color: #3b82f6;
}

.stat-icon.completed {
  background: #dcfce7;
  color: #10b981;
}

.stat-icon.today {
  background: #f3e8ff;
  color: #8b5cf6;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.stat-amount {
  font-size: 12px;
  color: #9ca3af;
}

/* Filters */
.filters-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-tab {
  padding: 8px 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tab.active {
  background: #00a86b;
  color: white;
  border-color: #00a86b;
}

.filter-tab:hover:not(.active) {
  background: #f3f4f6;
}

.search-box {
  position: relative;
  min-width: 300px;
}

.search-box svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: #9ca3af;
}

.search-box input {
  width: 100%;
  padding: 10px 12px 10px 40px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.search-box input:focus {
  border-color: #00a86b;
}

/* Table */
.table-container {
  background: white;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6b7280;
}

.loading-state .spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top: 3px solid #00a86b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.withdrawals-table {
  display: flex;
  flex-direction: column;
}

.table-header {
  display: grid;
  grid-template-columns: 120px 200px 120px 180px 120px 140px 120px;
  gap: 16px;
  padding: 16px 20px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.header-cell {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table-row {
  display: grid;
  grid-template-columns: 120px 200px 120px 180px 120px 140px 120px;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.table-row:hover {
  background: #f9fafb;
}

.table-cell {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.withdrawal-uid {
  font-family: monospace;
  font-size: 12px;
  color: #6b7280;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-weight: 500;
  color: #1f2937;
}

.user-email {
  font-size: 12px;
  color: #6b7280;
}

.amount {
  font-weight: 600;
  color: #1f2937;
}

.bank-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bank-name {
  font-weight: 500;
  color: #1f2937;
}

.account-number {
  font-size: 12px;
  color: #6b7280;
  font-family: monospace;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.date {
  font-size: 12px;
  color: #6b7280;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

.action-btn.approve {
  background: #dcfce7;
  color: #10b981;
}

.action-btn.approve:hover {
  background: #bbf7d0;
}

.action-btn.reject {
  background: #fee2e2;
  color: #ef4444;
}

.action-btn.reject:hover {
  background: #fecaca;
}

.action-btn.complete {
  background: #dbeafe;
  color: #3b82f6;
}

.action-btn.complete:hover {
  background: #bfdbfe;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
}

.modal-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f3f4f6;
}

.modal-close svg {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: 24px;
}

.withdrawal-details {
  background: #f9fafb;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  font-size: 14px;
  color: #6b7280;
}

.detail-row .value {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.detail-row .value.amount {
  color: #00a86b;
  font-weight: 600;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s;
}

.form-textarea:focus {
  outline: none;
  border-color: #00a86b;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-cancel {
  flex: 1;
  padding: 12px 16px;
  background: #f3f4f6;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-primary {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary.approve {
  background: #10b981;
  color: white;
}

.btn-primary.approve:hover:not(:disabled) {
  background: #059669;
}

.btn-primary.reject {
  background: #ef4444;
  color: white;
}

.btn-primary.reject:hover:not(:disabled) {
  background: #dc2626;
}

.btn-primary.complete {
  background: #3b82f6;
  color: white;
}

.btn-primary.complete:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

@media (max-width: 1200px) {
  .table-header,
  .table-row {
    grid-template-columns: 100px 180px 100px 160px 100px 120px 100px;
  }
}

@media (max-width: 768px) {
  .customer-withdrawals-view {
    padding: 16px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .filters-section {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: auto;
  }

  .table-container {
    overflow-x: auto;
  }

  .table-header,
  .table-row {
    min-width: 800px;
  }
}
</style>