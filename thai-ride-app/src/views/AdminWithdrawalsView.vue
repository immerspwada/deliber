<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { supabase } from '../lib/supabase'
import { useToast } from '../composables/useToast'

interface Withdrawal {
  id: string
  provider_id: string
  bank_account_id: string
  amount: number
  fee: number
  net_amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  transaction_ref: string | null
  processed_at: string | null
  failed_reason: string | null
  created_at: string
  provider?: {
    id: string
    user_id: string
    users?: {
      name: string
      phone: string
    }
  }
  bank_account?: {
    bank_name: string
    account_number: string
    account_name: string
  }
}

const toast = useToast()
const loading = ref(true)
const withdrawals = ref<Withdrawal[]>([])
const selectedStatus = ref<string>('all')
const searchQuery = ref('')
const showDetailModal = ref(false)
const selectedWithdrawal = ref<Withdrawal | null>(null)
const processingId = ref<string | null>(null)

// Stats
const stats = ref({
  pending: 0,
  processing: 0,
  completed: 0,
  totalPending: 0,
  totalCompleted: 0
})

// Check if demo mode
const isDemoMode = () => localStorage.getItem('demo_mode') === 'true'

// Fetch withdrawals
const fetchWithdrawals = async () => {
  loading.value = true
  try {
    if (isDemoMode()) {
      withdrawals.value = [
        {
          id: 'wd-1',
          provider_id: 'prov-1',
          bank_account_id: 'bank-1',
          amount: 2500,
          fee: 0,
          net_amount: 2500,
          status: 'pending',
          transaction_ref: null,
          processed_at: null,
          failed_reason: null,
          created_at: new Date().toISOString(),
          provider: {
            id: 'prov-1',
            user_id: 'user-1',
            users: { name: 'สมชาย ใจดี', phone: '081-234-5678' }
          },
          bank_account: {
            bank_name: 'ธนาคารกสิกรไทย',
            account_number: '123-4-56789-0',
            account_name: 'นาย สมชาย ใจดี'
          }
        },
        {
          id: 'wd-2',
          provider_id: 'prov-2',
          bank_account_id: 'bank-2',
          amount: 1800,
          fee: 0,
          net_amount: 1800,
          status: 'processing',
          transaction_ref: null,
          processed_at: null,
          failed_reason: null,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          provider: {
            id: 'prov-2',
            user_id: 'user-2',
            users: { name: 'สมหญิง รักดี', phone: '082-345-6789' }
          },
          bank_account: {
            bank_name: 'ธนาคารไทยพาณิชย์',
            account_number: '234-5-67890-1',
            account_name: 'นาง สมหญิง รักดี'
          }
        },
        {
          id: 'wd-3',
          provider_id: 'prov-1',
          bank_account_id: 'bank-1',
          amount: 3200,
          fee: 0,
          net_amount: 3200,
          status: 'completed',
          transaction_ref: 'TXN20251216001',
          processed_at: new Date(Date.now() - 86400000).toISOString(),
          failed_reason: null,
          created_at: new Date(Date.now() - 172800000).toISOString(),
          provider: {
            id: 'prov-1',
            user_id: 'user-1',
            users: { name: 'สมชาย ใจดี', phone: '081-234-5678' }
          },
          bank_account: {
            bank_name: 'ธนาคารกสิกรไทย',
            account_number: '123-4-56789-0',
            account_name: 'นาย สมชาย ใจดี'
          }
        }
      ]
      calculateStats()
      return
    }

    const { data, error } = await (supabase
      .from('provider_withdrawals') as any)
      .select(`
        *,
        bank_account:provider_bank_accounts(*),
        provider:service_providers(
          id,
          user_id,
          users(name, phone)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    withdrawals.value = data || []
    calculateStats()
  } catch (e: any) {
    toast.error('ไม่สามารถโหลดข้อมูลได้')
    console.error(e)
  } finally {
    loading.value = false
  }
}

// Calculate stats
const calculateStats = () => {
  stats.value = {
    pending: withdrawals.value.filter(w => w.status === 'pending').length,
    processing: withdrawals.value.filter(w => w.status === 'processing').length,
    completed: withdrawals.value.filter(w => w.status === 'completed').length,
    totalPending: withdrawals.value
      .filter(w => w.status === 'pending' || w.status === 'processing')
      .reduce((sum, w) => sum + w.amount, 0),
    totalCompleted: withdrawals.value
      .filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + w.amount, 0)
  }
}

// Filtered withdrawals
const filteredWithdrawals = computed(() => {
  let result = withdrawals.value
  
  if (selectedStatus.value !== 'all') {
    result = result.filter(w => w.status === selectedStatus.value)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(w => 
      w.provider?.users?.name?.toLowerCase().includes(query) ||
      w.bank_account?.account_name?.toLowerCase().includes(query) ||
      w.transaction_ref?.toLowerCase().includes(query)
    )
  }
  
  return result
})

// Update withdrawal status
const updateStatus = async (id: string, status: 'processing' | 'completed' | 'failed', transactionRef?: string, failedReason?: string) => {
  processingId.value = id
  try {
    if (isDemoMode()) {
      const wd = withdrawals.value.find(w => w.id === id)
      if (wd) {
        wd.status = status
        if (status === 'completed') {
          wd.transaction_ref = transactionRef || `TXN${Date.now()}`
          wd.processed_at = new Date().toISOString()
        }
        if (status === 'failed') {
          wd.failed_reason = failedReason || 'ไม่สามารถโอนเงินได้'
        }
      }
      calculateStats()
      toast.success('อัพเดทสถานะสำเร็จ')
      return
    }

    const updates: any = { 
      status,
      updated_at: new Date().toISOString()
    }
    
    if (status === 'completed') {
      updates.transaction_ref = transactionRef || `TXN${Date.now()}`
      updates.processed_at = new Date().toISOString()
    }
    
    if (status === 'failed') {
      updates.failed_reason = failedReason || 'ไม่สามารถโอนเงินได้'
    }

    const { error } = await (supabase
      .from('provider_withdrawals') as any)
      .update(updates)
      .eq('id', id)

    if (error) throw error
    
    await fetchWithdrawals()
    toast.success('อัพเดทสถานะสำเร็จ')
  } catch (e: any) {
    toast.error('ไม่สามารถอัพเดทได้')
    console.error(e)
  } finally {
    processingId.value = null
  }
}

// View detail
const viewDetail = (wd: Withdrawal) => {
  selectedWithdrawal.value = wd
  showDetailModal.value = true
}

// Format date
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'short', 
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Get status color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return '#22C55E'
    case 'pending': return '#F59E0B'
    case 'processing': return '#3B82F6'
    case 'failed': return '#EF4444'
    case 'cancelled': return '#6B7280'
    default: return '#6B7280'
  }
}

// Get status text
const getStatusText = (status: string) => {
  switch (status) {
    case 'completed': return 'สำเร็จ'
    case 'pending': return 'รอดำเนินการ'
    case 'processing': return 'กำลังดำเนินการ'
    case 'failed': return 'ล้มเหลว'
    case 'cancelled': return 'ยกเลิก'
    default: return status
  }
}

onMounted(fetchWithdrawals)
</script>

<template>
  <AdminLayout>
    <div class="admin-page">
      <div class="page-header">
        <h1>จัดการการถอนเงิน</h1>
        <button class="refresh-btn" @click="fetchWithdrawals" :disabled="loading">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          รีเฟรช
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon pending">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.pending }}</span>
            <span class="stat-label">รอดำเนินการ</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon processing">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.processing }}</span>
            <span class="stat-label">กำลังดำเนินการ</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon completed">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.completed }}</span>
            <span class="stat-label">สำเร็จ</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amount">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">฿{{ stats.totalPending.toLocaleString() }}</span>
            <span class="stat-label">ยอดรอถอน</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-row">
        <div class="search-box">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาชื่อ, เลขอ้างอิง..."
          />
        </div>
        <select v-model="selectedStatus" class="filter-select">
          <option value="all">ทุกสถานะ</option>
          <option value="pending">รอดำเนินการ</option>
          <option value="processing">กำลังดำเนินการ</option>
          <option value="completed">สำเร็จ</option>
          <option value="failed">ล้มเหลว</option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
      </div>

      <!-- Withdrawals Table -->
      <div v-else class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>วันที่</th>
              <th>ผู้ให้บริการ</th>
              <th>บัญชีปลายทาง</th>
              <th>จำนวนเงิน</th>
              <th>สถานะ</th>
              <th>การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="wd in filteredWithdrawals" :key="wd.id">
              <td>{{ formatDate(wd.created_at) }}</td>
              <td>
                <div class="provider-cell">
                  <span class="provider-name">{{ wd.provider?.users?.name || '-' }}</span>
                  <span class="provider-phone">{{ wd.provider?.users?.phone || '' }}</span>
                </div>
              </td>
              <td>
                <div class="bank-cell">
                  <span class="bank-name">{{ wd.bank_account?.bank_name || '-' }}</span>
                  <span class="bank-number">{{ wd.bank_account?.account_number || '' }}</span>
                </div>
              </td>
              <td class="amount-cell">฿{{ wd.amount.toLocaleString() }}</td>
              <td>
                <span 
                  class="status-badge"
                  :style="{ backgroundColor: getStatusColor(wd.status) + '20', color: getStatusColor(wd.status) }"
                >
                  {{ getStatusText(wd.status) }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="action-btn view" @click="viewDetail(wd)">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  </button>
                  <template v-if="wd.status === 'pending'">
                    <button 
                      class="action-btn process"
                      @click="updateStatus(wd.id, 'processing')"
                      :disabled="processingId === wd.id"
                    >
                      ดำเนินการ
                    </button>
                  </template>
                  <template v-if="wd.status === 'processing'">
                    <button 
                      class="action-btn approve"
                      @click="updateStatus(wd.id, 'completed')"
                      :disabled="processingId === wd.id"
                    >
                      อนุมัติ
                    </button>
                    <button 
                      class="action-btn reject"
                      @click="updateStatus(wd.id, 'failed', undefined, 'ไม่สามารถโอนเงินได้')"
                      :disabled="processingId === wd.id"
                    >
                      ปฏิเสธ
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div v-if="filteredWithdrawals.length === 0" class="empty-state">
          <p>ไม่พบรายการถอนเงิน</p>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <Teleport to="body">
      <div v-if="showDetailModal && selectedWithdrawal" class="modal-overlay" @click.self="showDetailModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h2>รายละเอียดการถอนเงิน</h2>
            <button class="close-btn" @click="showDetailModal = false">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <div class="detail-section">
              <h3>ข้อมูลผู้ให้บริการ</h3>
              <div class="detail-row">
                <span class="detail-label">ชื่อ</span>
                <span class="detail-value">{{ selectedWithdrawal.provider?.users?.name || '-' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">เบอร์โทร</span>
                <span class="detail-value">{{ selectedWithdrawal.provider?.users?.phone || '-' }}</span>
              </div>
            </div>
            
            <div class="detail-section">
              <h3>ข้อมูลบัญชี</h3>
              <div class="detail-row">
                <span class="detail-label">ธนาคาร</span>
                <span class="detail-value">{{ selectedWithdrawal.bank_account?.bank_name || '-' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">เลขบัญชี</span>
                <span class="detail-value">{{ selectedWithdrawal.bank_account?.account_number || '-' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">ชื่อบัญชี</span>
                <span class="detail-value">{{ selectedWithdrawal.bank_account?.account_name || '-' }}</span>
              </div>
            </div>
            
            <div class="detail-section">
              <h3>ข้อมูลการถอน</h3>
              <div class="detail-row">
                <span class="detail-label">จำนวนเงิน</span>
                <span class="detail-value amount">฿{{ selectedWithdrawal.amount.toLocaleString() }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">ค่าธรรมเนียม</span>
                <span class="detail-value">฿{{ selectedWithdrawal.fee.toLocaleString() }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">ยอดสุทธิ</span>
                <span class="detail-value">฿{{ selectedWithdrawal.net_amount.toLocaleString() }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">สถานะ</span>
                <span 
                  class="status-badge"
                  :style="{ backgroundColor: getStatusColor(selectedWithdrawal.status) + '20', color: getStatusColor(selectedWithdrawal.status) }"
                >
                  {{ getStatusText(selectedWithdrawal.status) }}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">วันที่ขอถอน</span>
                <span class="detail-value">{{ formatDate(selectedWithdrawal.created_at) }}</span>
              </div>
              <div v-if="selectedWithdrawal.transaction_ref" class="detail-row">
                <span class="detail-label">เลขอ้างอิง</span>
                <span class="detail-value">{{ selectedWithdrawal.transaction_ref }}</span>
              </div>
              <div v-if="selectedWithdrawal.processed_at" class="detail-row">
                <span class="detail-label">วันที่ดำเนินการ</span>
                <span class="detail-value">{{ formatDate(selectedWithdrawal.processed_at) }}</span>
              </div>
              <div v-if="selectedWithdrawal.failed_reason" class="detail-row">
                <span class="detail-label">เหตุผล</span>
                <span class="detail-value error">{{ selectedWithdrawal.failed_reason }}</span>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn-secondary" @click="showDetailModal = false">ปิด</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>


<style scoped>
.admin-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: #F6F6F6;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.refresh-btn:disabled {
  opacity: 0.5;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background-color: #FFFFFF;
  border-radius: 12px;
  border: 1px solid #E5E5E5;
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
  background-color: #FEF3C7;
  color: #F59E0B;
}

.stat-icon.processing {
  background-color: #DBEAFE;
  color: #3B82F6;
}

.stat-icon.completed {
  background-color: #D1FAE5;
  color: #22C55E;
}

.stat-icon.amount {
  background-color: #F3F4F6;
  color: #000000;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
}

.stat-label {
  font-size: 13px;
  color: #6B6B6B;
}

/* Filters */
.filters-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  background-color: #FFFFFF;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
}

.search-box input {
  flex: 1;
  padding: 12px 0;
  border: none;
  font-size: 14px;
}

.search-box input:focus {
  outline: none;
}

.filter-select {
  padding: 12px 16px;
  background-color: #FFFFFF;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 14px;
  min-width: 150px;
}

/* Loading */
.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #000000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Table */
.table-container {
  background-color: #FFFFFF;
  border-radius: 12px;
  border: 1px solid #E5E5E5;
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid #E5E5E5;
}

.data-table th {
  background-color: #F6F6F6;
  font-size: 13px;
  font-weight: 600;
  color: #6B6B6B;
}

.data-table td {
  font-size: 14px;
}

.data-table tbody tr:hover {
  background-color: #F9F9F9;
}

.provider-cell,
.bank-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.provider-name,
.bank-name {
  font-weight: 500;
}

.provider-phone,
.bank-number {
  font-size: 12px;
  color: #6B6B6B;
}

.amount-cell {
  font-weight: 600;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.action-btn.view {
  padding: 6px;
  background-color: #F6F6F6;
}

.action-btn.process {
  background-color: #DBEAFE;
  color: #3B82F6;
}

.action-btn.approve {
  background-color: #D1FAE5;
  color: #22C55E;
}

.action-btn.reject {
  background-color: #FEE2E2;
  color: #EF4444;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #6B6B6B;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 100%;
  max-width: 500px;
  background-color: #FFFFFF;
  border-radius: 16px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #E5E5E5;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 20px;
  border-top: 1px solid #E5E5E5;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: #6B6B6B;
  margin-bottom: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #F0F0F0;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 14px;
  color: #6B6B6B;
}

.detail-value {
  font-size: 14px;
  font-weight: 500;
}

.detail-value.amount {
  font-size: 18px;
  font-weight: 700;
}

.detail-value.error {
  color: #EF4444;
}

.btn-secondary {
  padding: 12px 24px;
  background-color: #F6F6F6;
  color: #000000;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filters-row {
    flex-direction: column;
  }
  
  .table-container {
    overflow-x: auto;
  }
  
  .data-table {
    min-width: 700px;
  }
}
</style>
