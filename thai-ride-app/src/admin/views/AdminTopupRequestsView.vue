<script setup lang="ts">
/**
 * AdminTopupRequestsView - Admin Panel for Customer Topup Requests
 * 
 * Role: Admin only
 * Features: View, Approve, Reject customer topup requests with payment proof
 * 
 * Uses useAdminTopupRequests composable with get_topup_requests_admin RPC
 * Requirements: 10.6, 10.7
 */
import { ref, computed, onMounted } from 'vue'
import { useAdminTopupRequests, type TopupRequest } from '../composables/useAdminTopupRequests'

const admin = useAdminTopupRequests()

// State
const statusFilter = ref<'pending' | 'approved' | 'rejected' | null>(null)
const selectedTopup = ref<TopupRequest | null>(null)
const showApproveModal = ref(false)
const showRejectModal = ref(false)
const showImageModal = ref(false)
const rejectReason = ref('')
const selectedImageUrl = ref('')

// Computed
const filteredTopups = computed(() => {
  return admin.topupRequests.value
})

// Statistics computed from filtered data
const stats = computed(() => {
  const pending = admin.pendingRequests.value
  const approved = admin.approvedRequests.value
  const rejected = admin.rejectedRequests.value
  
  return {
    total_pending: pending.length,
    total_pending_amount: admin.totalPendingAmount.value,
    total_approved: approved.length,
    total_approved_amount: approved.reduce((sum, t) => sum + t.amount, 0),
    total_rejected: rejected.length,
    today_approved: approved.filter(t => {
      const today = new Date().toDateString()
      return t.processed_at && new Date(t.processed_at).toDateString() === today
    }).length,
    today_approved_amount: approved.filter(t => {
      const today = new Date().toDateString()
      return t.processed_at && new Date(t.processed_at).toDateString() === today
    }).reduce((sum, t) => sum + t.amount, 0)
  }
})

// Load data
async function loadData() {
  await admin.fetchTopupRequests({ status: statusFilter.value })
}

// Open approve modal
function openApproveModal(topup: TopupRequest) {
  selectedTopup.value = topup
  showApproveModal.value = true
}

// Open reject modal
function openRejectModal(topup: TopupRequest) {
  selectedTopup.value = topup
  rejectReason.value = ''
  showRejectModal.value = true
}

// Open image modal
function openImageModal(imageUrl: string) {
  selectedImageUrl.value = imageUrl
  showImageModal.value = true
}

// Handle approve
async function handleApprove() {
  if (!selectedTopup.value) return
  
  const result = await admin.approveTopup(selectedTopup.value.id)
  
  if (result.success) {
    showApproveModal.value = false
    selectedTopup.value = null
    await loadData()
  }
}

// Handle reject
async function handleReject() {
  if (!selectedTopup.value || !rejectReason.value.trim()) return
  
  const result = await admin.rejectTopup(
    selectedTopup.value.id,
    rejectReason.value.trim()
  )
  
  if (result.success) {
    showRejectModal.value = false
    selectedTopup.value = null
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
        <h1 class="text-2xl font-bold text-gray-900">คำขอเติมเงิน (Customer)</h1>
        <p class="text-sm text-gray-600 mt-1">จัดการคำขอเติมเงินของลูกค้า</p>
      </div>
      <button 
        @click="loadData" 
        :disabled="admin.loading.value"
        type="button"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        aria-label="รีเฟรชข้อมูล"
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
        <div class="text-2xl font-bold text-green-600">{{ stats.total_approved }}</div>
        <div class="text-xs text-gray-400">{{ admin.formatCurrency(stats.total_approved_amount) }}</div>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
        <div class="text-sm text-gray-500">ปฏิเสธ</div>
        <div class="text-2xl font-bold text-red-600">{{ stats.total_rejected }}</div>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
        <div class="text-sm text-gray-500">วันนี้</div>
        <div class="text-2xl font-bold text-blue-600">{{ stats.today_approved }}</div>
        <div class="text-xs text-gray-400">{{ admin.formatCurrency(stats.today_approved_amount) }}</div>
      </div>
    </div>

    <!-- Filter -->
    <div class="mb-4 flex gap-4">
      <select 
        v-model="statusFilter" 
        @change="onFilterChange"
        class="px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        aria-label="กรองตามสถานะ"
      >
        <option :value="null">ทุกสถานะ</option>
        <option value="pending">รอดำเนินการ</option>
        <option value="approved">อนุมัติแล้ว</option>
        <option value="rejected">ปฏิเสธ</option>
      </select>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ลูกค้า</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">จำนวนเงิน</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">การชำระเงิน</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">หลักฐาน</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-if="admin.loading.value && filteredTopups.length === 0">
              <td colspan="7" class="px-4 py-12 text-center text-gray-500">
                <div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                กำลังโหลด...
              </td>
            </tr>
            <tr v-else-if="filteredTopups.length === 0">
              <td colspan="7" class="px-4 py-12 text-center text-gray-500">ไม่พบข้อมูล</td>
            </tr>
            <tr 
              v-else 
              v-for="topup in filteredTopups" 
              :key="topup.id" 
              class="hover:bg-gray-50 transition-colors"
              :class="{ 'bg-yellow-50': topup.status === 'pending' }"
            >
              <td class="px-4 py-4">
                <div class="font-medium text-gray-900">{{ topup.user_name || 'ไม่ระบุชื่อ' }}</div>
                <div class="text-sm text-gray-500">{{ topup.user_phone }}</div>
                <div v-if="topup.user_email" class="text-xs text-gray-400">{{ topup.user_email }}</div>
              </td>
              <td class="px-4 py-4">
                <div class="font-bold text-lg text-gray-900">{{ admin.formatCurrency(topup.amount) }}</div>
                <div class="text-xs text-gray-500">ยอดคงเหลือ: {{ admin.formatCurrency(topup.wallet_balance) }}</div>
              </td>
              <td class="px-4 py-4">
                <div class="text-sm font-medium">{{ admin.getPaymentMethodLabel(topup.payment_method) }}</div>
                <div class="text-sm text-gray-600 font-mono">{{ topup.payment_reference }}</div>
              </td>
              <td class="px-4 py-4">
                <button
                  v-if="topup.payment_proof_url"
                  @click="openImageModal(topup.payment_proof_url)"
                  type="button"
                  class="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-colors"
                  aria-label="ดูหลักฐานการชำระเงิน"
                >
                  ดูรูปภาพ
                </button>
                <span v-else class="text-xs text-gray-400">ไม่มีหลักฐาน</span>
              </td>
              <td class="px-4 py-4">
                <span :class="admin.getStatusColor(topup.status)" class="px-3 py-1 rounded-full text-xs font-medium">
                  {{ admin.getStatusLabel(topup.status) }}
                </span>
                <div v-if="topup.rejection_reason" class="text-xs text-red-500 mt-1">
                  {{ topup.rejection_reason }}
                </div>
              </td>
              <td class="px-4 py-4 text-sm text-gray-500">
                <div>{{ admin.formatDate(topup.requested_at) }}</div>
                <div v-if="topup.processed_at" class="text-xs text-green-600">
                  ดำเนินการ: {{ admin.formatDate(topup.processed_at) }}
                </div>
              </td>
              <td class="px-4 py-4 text-center">
                <div v-if="topup.status === 'pending'" class="flex gap-2 justify-center">
                  <button 
                    @click="openApproveModal(topup)"
                    type="button"
                    class="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    aria-label="อนุมัติคำขอเติมเงิน"
                  >
                    อนุมัติ
                  </button>
                  <button 
                    @click="openRejectModal(topup)"
                    type="button"
                    class="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                    aria-label="ปฏิเสธคำขอเติมเงิน"
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
          <h3 id="approve-modal-title" class="text-lg font-bold text-gray-900">อนุมัติการเติมเงิน</h3>
        </div>
        <div class="p-6 space-y-4">
          <div class="bg-green-50 p-4 rounded-lg">
            <div class="text-sm text-gray-600">ลูกค้า</div>
            <div class="font-medium">{{ selectedTopup?.user_name }}</div>
            <div class="text-sm text-gray-500">{{ selectedTopup?.user_phone }}</div>
            <div class="text-2xl font-bold text-green-600 mt-2">
              {{ admin.formatCurrency(selectedTopup?.amount || 0) }}
            </div>
            <div class="text-sm text-gray-600 mt-2">
              <div>วิธีชำระ: {{ admin.getPaymentMethodLabel(selectedTopup?.payment_method || '') }}</div>
              <div class="font-mono">Ref: {{ selectedTopup?.payment_reference }}</div>
            </div>
            <div v-if="selectedTopup?.payment_proof_url" class="mt-3">
              <button
                @click="openImageModal(selectedTopup.payment_proof_url)"
                type="button"
                class="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                ดูหลักฐานการชำระเงิน
              </button>
            </div>
          </div>
          
          <div class="bg-blue-50 p-3 rounded-lg">
            <p class="text-sm text-blue-800">
              <strong>หมายเหตุ:</strong> เมื่ออนุมัติ ระบบจะเพิ่มเงินเข้ากระเป๋าของลูกค้าทันที
            </p>
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
            :disabled="admin.loading.value"
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
          <h3 id="reject-modal-title" class="text-lg font-bold text-gray-900">ปฏิเสธการเติมเงิน</h3>
        </div>
        <div class="p-6 space-y-4">
          <div class="bg-red-50 p-4 rounded-lg">
            <div class="text-sm text-gray-600">ลูกค้า</div>
            <div class="font-medium">{{ selectedTopup?.user_name }}</div>
            <div class="text-sm text-gray-500">{{ selectedTopup?.user_phone }}</div>
            <div class="text-2xl font-bold text-red-600 mt-2">
              {{ admin.formatCurrency(selectedTopup?.amount || 0) }}
            </div>
            <div class="text-sm text-gray-600 mt-2">
              <div>วิธีชำระ: {{ admin.getPaymentMethodLabel(selectedTopup?.payment_method || '') }}</div>
              <div class="font-mono">Ref: {{ selectedTopup?.payment_reference }}</div>
            </div>
            <div v-if="selectedTopup?.payment_proof_url" class="mt-3">
              <button
                @click="openImageModal(selectedTopup.payment_proof_url)"
                type="button"
                class="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                ดูหลักฐานการชำระเงิน
              </button>
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
              placeholder="ระบุเหตุผลที่ปฏิเสธคำขอเติมเงิน"
              class="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            ></textarea>
            <p class="text-xs text-gray-500 mt-1">เหตุผลนี้จะถูกส่งให้ลูกค้าทราบ</p>
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

    <!-- Image Modal -->
    <div v-if="showImageModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" @click="showImageModal = false">
      <div class="relative max-w-4xl w-full" @click.stop>
        <button
          @click="showImageModal = false"
          type="button"
          class="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
          aria-label="ปิดรูปภาพ"
        >
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img 
          :src="selectedImageUrl" 
          alt="หลักฐานการชำระเงิน"
          class="w-full h-auto rounded-lg shadow-2xl"
          loading="lazy"
        />
      </div>
    </div>
  </div>
</template>
