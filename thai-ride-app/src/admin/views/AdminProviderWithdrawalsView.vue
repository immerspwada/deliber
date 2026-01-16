<script setup lang="ts">
/**
 * AdminProviderWithdrawalsView - Admin Panel for Provider Withdrawals
 * 
 * Role: Admin only
 * Features: View, Approve, Reject provider withdrawal requests
 */
import { ref, computed, onMounted } from 'vue'
import { useAdminProviderWithdrawals, type ProviderWithdrawal } from '../composables/useAdminProviderWithdrawals'

const admin = useAdminProviderWithdrawals()

// State
const statusFilter = ref<string | null>(null)
const selectedWithdrawal = ref<ProviderWithdrawal | null>(null)
const showApproveModal = ref(false)
const showRejectModal = ref(false)
const transactionRef = ref('')
const rejectReason = ref('')
const adminNotes = ref('')

// Computed
const filteredWithdrawals = computed(() => {
  let result = [...admin.withdrawals.value]
  if (statusFilter.value) {
    result = result.filter(w => w.status === statusFilter.value)
  }
  // Sort: pending first, then by date
  return result.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
})

// Load data
async function loadData() {
  await Promise.all([
    admin.fetchWithdrawals(statusFilter.value),
    admin.fetchStats()
  ])
}

// Open approve modal
function openApproveModal(w: ProviderWithdrawal) {
  selectedWithdrawal.value = w
  transactionRef.value = ''
  adminNotes.value = ''
  showApproveModal.value = true
}

// Open reject modal
function openRejectModal(w: ProviderWithdrawal) {
  selectedWithdrawal.value = w
  rejectReason.value = ''
  adminNotes.value = ''
  showRejectModal.value = true
}

// Handle approve
async function handleApprove() {
  if (!selectedWithdrawal.value || !transactionRef.value.trim()) return
  
  const result = await admin.approveWithdrawal(
    selectedWithdrawal.value.id,
    transactionRef.value.trim(),
    adminNotes.value.trim() || undefined
  )
  
  if (result.success) {
    showApproveModal.value = false
    selectedWithdrawal.value = null
    await admin.fetchStats()
  }
}

// Handle reject
async function handleReject() {
  if (!selectedWithdrawal.value || !rejectReason.value.trim()) return
  
  const result = await admin.rejectWithdrawal(
    selectedWithdrawal.value.id,
    rejectReason.value.trim(),
    adminNotes.value.trim() || undefined
  )
  
  if (result.success) {
    showRejectModal.value = false
    selectedWithdrawal.value = null
    await admin.fetchStats()
  }
}

// Filter change
function onFilterChange() {
  admin.fetchWithdrawals(statusFilter.value)
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
        <div class="text-2xl font-bold text-yellow-600">{{ admin.stats.value?.total_pending || 0 }}</div>
        <div class="text-xs text-gray-400">{{ admin.formatCurrency(admin.stats.value?.total_pending_amount || 0) }}</div>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
        <div class="text-sm text-gray-500">อนุมัติแล้ว</div>
        <div class="text-2xl font-bold text-green-600">{{ admin.stats.value?.total_completed || 0 }}</div>
        <div class="text-xs text-gray-400">{{ admin.formatCurrency(admin.stats.value?.total_completed_amount || 0) }}</div>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
        <div class="text-sm text-gray-500">ปฏิเสธ</div>
        <div class="text-2xl font-bold text-red-600">{{ admin.stats.value?.total_failed || 0 }}</div>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
        <div class="text-sm text-gray-500">วันนี้</div>
        <div class="text-2xl font-bold text-blue-600">{{ admin.stats.value?.today_completed || 0 }}</div>
        <div class="text-xs text-gray-400">{{ admin.formatCurrency(admin.stats.value?.today_completed_amount || 0) }}</div>
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
        <option value="processing">กำลังดำเนินการ</option>
        <option value="completed">อนุมัติแล้ว</option>
        <option value="failed">ปฏิเสธ</option>
        <option value="cancelled">ยกเลิก</option>
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
                <div class="text-xs text-gray-400 font-mono">{{ w.withdrawal_uid }}</div>
              </td>
              <td class="px-4 py-4">
                <div class="font-bold text-lg text-gray-900">{{ admin.formatCurrency(w.amount) }}</div>
                <div v-if="w.fee > 0" class="text-xs text-gray-500">ค่าธรรมเนียม: {{ admin.formatCurrency(w.fee) }}</div>
                <div v-if="w.fee > 0" class="text-xs text-green-600">สุทธิ: {{ admin.formatCurrency(w.net_amount) }}</div>
              </td>
              <td class="px-4 py-4">
                <div class="text-sm font-medium">{{ w.bank_name }}</div>
                <div class="text-sm text-gray-600 font-mono">{{ w.bank_account_number }}</div>
                <div class="text-xs text-gray-500">{{ w.bank_account_name }}</div>
              </td>
              <td class="px-4 py-4">
                <span :class="admin.getStatusColor(w.status)" class="px-3 py-1 rounded-full text-xs font-medium">
                  {{ admin.getStatusLabel(w.status) }}
                </span>
                <div v-if="w.transaction_ref" class="text-xs text-gray-500 mt-1">
                  Ref: {{ w.transaction_ref }}
                </div>
                <div v-if="w.failed_reason" class="text-xs text-red-500 mt-1">
                  {{ w.failed_reason }}
                </div>
              </td>
              <td class="px-4 py-4 text-sm text-gray-500">
                <div>{{ admin.formatDate(w.created_at) }}</div>
                <div v-if="w.processed_at" class="text-xs text-green-600">
                  ดำเนินการ: {{ admin.formatDate(w.processed_at) }}
                </div>
              </td>
              <td class="px-4 py-4 text-center">
                <div v-if="w.status === 'pending'" class="flex gap-2 justify-center">
                  <button 
                    @click="openApproveModal(w)"
                    class="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                  >
                    อนุมัติ
                  </button>
                  <button 
                    @click="openRejectModal(w)"
                    class="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
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
</template>

    <!-- Approve Modal -->
    <div v-if="showApproveModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-md">
        <div class="p-6 border-b">
          <h3 class="text-lg font-bold text-gray-900">อนุมัติการถอนเงิน</h3>
        </div>
        <div class="p-6 space-y-4">
          <div class="bg-green-50 p-4 rounded-lg">
            <div class="text-sm text-gray-600">ผู้ให้บริการ</div>
            <div class="font-medium">{{ selectedWithdrawal?.provider_name }}</div>
            <div class="text-2xl font-bold text-green-600 mt-2">
              {{ admin.formatCurrency(selectedWithdrawal?.amount || 0) }}
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              เลขอ้างอิงการโอน <span class="text-red-500">*</span>
            </label>
            <input 
              v-model="transactionRef"
              type="text"
              placeholder="เช่น TRX123456789"
              class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ (ถ้ามี)</label>
            <textarea 
              v-model="adminNotes"
              rows="2"
              placeholder="หมายเหตุสำหรับ admin"
              class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            ></textarea>
          </div>
        </div>
        <div class="p-6 border-t flex gap-3">
          <button 
            @click="showApproveModal = false"
            class="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            ยกเลิก
          </button>
          <button 
            @click="handleApprove"
            :disabled="!transactionRef.trim() || admin.loading.value"
            class="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {{ admin.loading.value ? 'กำลังดำเนินการ...' : 'ยืนยันอนุมัติ' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="showRejectModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-md">
        <div class="p-6 border-b">
          <h3 class="text-lg font-bold text-gray-900">ปฏิเสธการถอนเงิน</h3>
        </div>
        <div class="p-6 space-y-4">
          <div class="bg-red-50 p-4 rounded-lg">
            <div class="text-sm text-gray-600">ผู้ให้บริการ</div>
            <div class="font-medium">{{ selectedWithdrawal?.provider_name }}</div>
            <div class="text-2xl font-bold text-red-600 mt-2">
              {{ admin.formatCurrency(selectedWithdrawal?.amount || 0) }}
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              เหตุผลที่ปฏิเสธ <span class="text-red-500">*</span>
            </label>
            <select 
              v-model="rejectReason"
              class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">เลือกเหตุผล</option>
              <option value="ข้อมูลบัญชีธนาคารไม่ถูกต้อง">ข้อมูลบัญชีธนาคารไม่ถูกต้อง</option>
              <option value="ชื่อบัญชีไม่ตรงกับชื่อผู้ให้บริการ">ชื่อบัญชีไม่ตรงกับชื่อผู้ให้บริการ</option>
              <option value="ยอดเงินไม่ถูกต้อง">ยอดเงินไม่ถูกต้อง</option>
              <option value="บัญชีถูกระงับ">บัญชีถูกระงับ</option>
              <option value="เอกสารไม่ครบถ้วน">เอกสารไม่ครบถ้วน</option>
              <option value="อื่นๆ">อื่นๆ (ระบุในหมายเหตุ)</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">หมายเหตุเพิ่มเติม</label>
            <textarea 
              v-model="adminNotes"
              rows="2"
              placeholder="รายละเอียดเพิ่มเติม"
              class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            ></textarea>
          </div>
        </div>
        <div class="p-6 border-t flex gap-3">
          <button 
            @click="showRejectModal = false"
            class="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            ยกเลิก
          </button>
          <button 
            @click="handleReject"
            :disabled="!rejectReason.trim() || admin.loading.value"
            class="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {{ admin.loading.value ? 'กำลังดำเนินการ...' : 'ยืนยันปฏิเสธ' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
