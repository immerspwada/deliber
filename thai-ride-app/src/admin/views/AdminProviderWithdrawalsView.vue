<script setup lang="ts">
/**
 * AdminProviderWithdrawalsView - Admin Panel for Provider Withdrawals
 * 
 * Role: Admin only
 * Features: View, Approve, Reject provider withdrawal requests
 * 
 * Updated to use useAdminWithdrawals composable with get_provider_withdrawals_admin RPC
 */
import { ref, computed, onMounted } from 'vue'
import { useAdminWithdrawals, type ProviderWithdrawal } from '../composables/useAdminWithdrawals'

const admin = useAdminWithdrawals()

// State
const statusFilter = ref<'pending' | 'approved' | 'rejected' | 'completed' | null>(null)
const selectedWithdrawal = ref<ProviderWithdrawal | null>(null)
const showApproveModal = ref(false)
const showRejectModal = ref(false)
const transactionId = ref('')
const rejectReason = ref('')

// Computed
const filteredWithdrawals = computed(() => {
  return admin.withdrawals.value
})

// Statistics computed from filtered data
const stats = computed(() => {
  const pending = admin.pendingWithdrawals.value
  const approved = admin.approvedWithdrawals.value
  const rejected = admin.rejectedWithdrawals.value
  const completed = admin.completedWithdrawals.value
  
  return {
    total_pending: pending.length,
    total_pending_amount: admin.totalPendingAmount.value,
    total_completed: completed.length,
    total_completed_amount: completed.reduce((sum, w) => sum + w.amount, 0),
    total_failed: rejected.length,
    today_completed: completed.filter(w => {
      const today = new Date().toDateString()
      return w.processed_at && new Date(w.processed_at).toDateString() === today
    }).length,
    today_completed_amount: completed.filter(w => {
      const today = new Date().toDateString()
      return w.processed_at && new Date(w.processed_at).toDateString() === today
    }).reduce((sum, w) => sum + w.amount, 0)
  }
})

// Load data
async function loadData() {
  await admin.fetchWithdrawals({ status: statusFilter.value })
}

// Open approve modal
function openApproveModal(w: ProviderWithdrawal) {
  selectedWithdrawal.value = w
  transactionId.value = ''
  showApproveModal.value = true
}

// Open reject modal
function openRejectModal(w: ProviderWithdrawal) {
  selectedWithdrawal.value = w
  rejectReason.value = ''
  showRejectModal.value = true
}

// Handle approve
async function handleApprove() {
  if (!selectedWithdrawal.value || !transactionId.value.trim()) return
  
  const result = await admin.approveWithdrawal(
    selectedWithdrawal.value.id,
    transactionId.value.trim()
  )
  
  if (result.success) {
    showApproveModal.value = false
    selectedWithdrawal.value = null
    await loadData()
  }
}

// Handle reject
async function handleReject() {
  if (!selectedWithdrawal.value || !rejectReason.value.trim()) return
  
  const result = await admin.rejectWithdrawal(
    selectedWithdrawal.value.id,
    rejectReason.value.trim()
  )
  
  if (result.success) {
    showRejectModal.value = false
    selectedWithdrawal.value = null
    await loadData()
  }
}

// Filter change
function onFilterChange() {
  loadData()
}

onMounted(() => loadData())
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">คำขอถอนเงิน (Provider)</h1>
        <p class="text-sm text-gray-600 mt-1">จัดการคำขอถอนเงินของผู้ให้บริการ</p>
      </div>
      <button 
        @click="loadData" 
        :disabled="admin.loading.value"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {{ admin.loading.value ? 'กำลังโหลด...' : 'รีเฟรช' }}
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-500">
        <div class="text-sm text-gray-500">รอดำเนินการ</div>
        <div class="text-2xl font-bold text-yellow-600">{{ stats.total_pending }}</div>
        <div class="text-xs text-gray-400">{{ admin.formatCurrency(stats.total_pending_amount) }}</div>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
        <div class="text-sm text-gray-500">อนุมัติแล้ว</div>
        <div class="text-2xl font-bold text-green-600">{{ stats.total_completed }}</div>
        <div class="text-xs text-gray-400">{{ admin.formatCurrency(stats.total_completed_amount) }}</div>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
        <div class="text-sm text-gray-500">ปฏิเสธ</div>
        <div class="text-2xl font-bold text-red-600">{{ stats.total_failed }}</div>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
        <div class="text-sm text-gray-500">วันนี้</div>
        <div class="text-2xl font-bold text-blue-600">{{ stats.today_completed }}</div>
        <div class="text-xs text-gray-400">{{ admin.formatCurrency(stats.today_completed_amount) }}</div>
      </div>
    </div>

    <!-- Filter -->
    <div class="mb-4 flex gap-4">
      <select 
        v-model="statusFilter" 
        @change="onFilterChange"
        class="px-4 py-2 border rounded-lg bg-white"
      >
        <option :value="null">ทุกสถานะ</option>
        <option value="pending">รอดำเนินการ</option>
        <option value="approved">อนุมัติแล้ว</option>
        <option value="rejected">ปฏิเสธ</option>
        <option value="completed">เสร็จสิ้น</option>
      </select>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ผู้ให้บริการ</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">จำนวนเงิน</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">บัญชีธนาคาร</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-if="admin.loading.value && filteredWithdrawals.length === 0">
              <td colspan="6" class="px-4 py-12 text-center text-gray-500">
                <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                กำลังโหลด...
              </td>
            </tr>
            <tr v-else-if="filteredWithdrawals.length === 0">
              <td colspan="6" class="px-4 py-12 text-center text-gray-500">ไม่พบข้อมูล</td>
            </tr>
            <tr 
              v-else 
              v-for="w in filteredWithdrawals" 
              :key="w.id" 
              class="hover:bg-gray-50"
              :class="{ 'bg-yellow-50': w.status === 'pending' }"
            >
              <td class="px-4 py-4">
                <div class="font-medium text-gray-900">{{ w.provider_name || 'ไม่ระบุชื่อ' }}</div>
                <div class="text-sm text-gray-500">{{ w.provider_phone }}</div>
                <div v-if="w.provider_email" class="text-xs text-gray-400">{{ w.provider_email }}</div>
              </td>
              <td class="px-4 py-4">
                <div class="font-bold text-lg text-gray-900">{{ admin.formatCurrency(w.amount) }}</div>
                <div class="text-xs text-gray-500">ยอดคงเหลือ: {{ admin.formatCurrency(w.wallet_balance) }}</div>
                <div class="text-xs text-gray-400">รายได้รวม: {{ admin.formatCurrency(w.total_earnings) }}</div>
              </td>
              <td class="px-4 py-4">
                <div class="text-sm font-medium">{{ w.bank_name }}</div>
                <div class="text-sm text-gray-600 font-mono">{{ admin.maskBankAccount(w.bank_account) }}</div>
                <div class="text-xs text-gray-500">{{ w.account_holder }}</div>
              </td>
              <td class="px-4 py-4">
                <span :class="admin.getStatusColor(w.status)" class="px-3 py-1 rounded-full text-xs font-medium">
                  {{ admin.getStatusLabel(w.status) }}
                </span>
                <div v-if="w.transaction_id" class="text-xs text-gray-500 mt-1">
                  Ref: {{ w.transaction_id }}
                </div>
                <div v-if="w.rejection_reason" class="text-xs text-red-500 mt-1">
                  {{ w.rejection_reason }}
                </div>
              </td>
              <td class="px-4 py-4 text-sm text-gray-500">
                <div>{{ admin.formatDate(w.requested_at) }}</div>
                <div v-if="w.processed_at" class="text-xs text-green-600">
                  ดำเนินการ: {{ admin.formatDate(w.processed_at) }}
                </div>
              </td>
              <td class="px-4 py-4 text-center">
                <div v-if="w.status === 'pending'" class="flex gap-2 justify-center">
                  <button 
                    @click="openApproveModal(w)"
                    class="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                    aria-label="อนุมัติคำขอถอนเงิน"
                  >
                    อนุมัติ
                  </button>
                  <button 
                    @click="openRejectModal(w)"
                    class="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                    aria-label="ปฏิเสธคำขอถอนเงิน"
                  >
                    ปฏิเสธ
                  </button>
                </div>
                <span v-else class="text-gray-400 text-sm">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Approve Modal -->
    <div v-if="showApproveModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-md" role="dialog" aria-labelledby="approve-modal-title" aria-modal="true">
        <div class="p-6 border-b">
          <h3 id="approve-modal-title" class="text-lg font-bold text-gray-900">อนุมัติการถอนเงิน</h3>
        </div>
        <div class="p-6 space-y-4">
          <div class="bg-green-50 p-4 rounded-lg">
            <div class="text-sm text-gray-600">ผู้ให้บริการ</div>
            <div class="font-medium">{{ selectedWithdrawal?.provider_name }}</div>
            <div class="text-sm text-gray-500">{{ selectedWithdrawal?.provider_phone }}</div>
            <div class="text-2xl font-bold text-green-600 mt-2">
              {{ admin.formatCurrency(selectedWithdrawal?.amount || 0) }}
            </div>
            <div class="text-sm text-gray-600 mt-2">
              <div>บัญชี: {{ selectedWithdrawal?.bank_name }}</div>
              <div class="font-mono">{{ selectedWithdrawal?.bank_account }}</div>
              <div>ชื่อบัญชี: {{ selectedWithdrawal?.account_holder }}</div>
            </div>
          </div>
          
          <div>
            <label for="transaction-id" class="block text-sm font-medium text-gray-700 mb-1">
              เลขอ้างอิงการโอน <span class="text-red-500">*</span>
            </label>
            <input 
              id="transaction-id"
              v-model="transactionId"
              type="text"
              placeholder="เช่น TRX123456789"
              class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              autocomplete="off"
            />
          </div>
        </div>
        <div class="p-6 border-t flex gap-3">
          <button 
            @click="showApproveModal = false"
            type="button"
            class="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ยกเลิก
          </button>
          <button 
            @click="handleApprove"
            type="button"
            :disabled="!transactionId.trim() || admin.loading.value"
            class="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ admin.loading.value ? 'กำลังดำเนินการ...' : 'ยืนยันอนุมัติ' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="showRejectModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-md" role="dialog" aria-labelledby="reject-modal-title" aria-modal="true">
        <div class="p-6 border-b">
          <h3 id="reject-modal-title" class="text-lg font-bold text-gray-900">ปฏิเสธการถอนเงิน</h3>
        </div>
        <div class="p-6 space-y-4">
          <div class="bg-red-50 p-4 rounded-lg">
            <div class="text-sm text-gray-600">ผู้ให้บริการ</div>
            <div class="font-medium">{{ selectedWithdrawal?.provider_name }}</div>
            <div class="text-sm text-gray-500">{{ selectedWithdrawal?.provider_phone }}</div>
            <div class="text-2xl font-bold text-red-600 mt-2">
              {{ admin.formatCurrency(selectedWithdrawal?.amount || 0) }}
            </div>
            <div class="text-sm text-gray-600 mt-2">
              <div>บัญชี: {{ selectedWithdrawal?.bank_name }}</div>
              <div class="font-mono">{{ selectedWithdrawal?.bank_account }}</div>
              <div>ชื่อบัญชี: {{ selectedWithdrawal?.account_holder }}</div>
            </div>
          </div>
          
          <div>
            <label for="reject-reason" class="block text-sm font-medium text-gray-700 mb-1">
              เหตุผลที่ปฏิเสธ <span class="text-red-500">*</span>
            </label>
            <textarea
              id="reject-reason"
              v-model="rejectReason"
              rows="3"
              placeholder="ระบุเหตุผลที่ปฏิเสธคำขอถอนเงิน"
              class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            ></textarea>
            <p class="text-xs text-gray-500 mt-1">เหตุผลนี้จะถูกส่งให้ผู้ให้บริการทราบ</p>
          </div>
        </div>
        <div class="p-6 border-t flex gap-3">
          <button 
            @click="showRejectModal = false"
            type="button"
            class="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ยกเลิก
          </button>
          <button 
            @click="handleReject"
            type="button"
            :disabled="!rejectReason.trim() || admin.loading.value"
            class="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ admin.loading.value ? 'กำลังดำเนินการ...' : 'ยืนยันปฏิเสธ' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
