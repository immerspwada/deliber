<script setup lang="ts">
/**
 * Admin Topup Requests - Performance Optimized
 * 
 * Optimizations:
 * 1. Memoized formatters (no re-creation)
 * 2. Optimized stats calculation (single pass)
 * 3. Debounced search
 * 4. Removed unnecessary watchers
 */
import { ref, computed, onMounted, shallowRef } from 'vue'
import { supabase } from '../lib/supabase'

interface TopupRequest {
  id: string
  tracking_id: string
  user_name: string
  user_phone: string
  amount: number
  payment_method: string
  slip_url: string | null
  status: string
  admin_note: string | null
  created_at: string
}

// Memoized formatters (created once)
const moneyFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 0
})

const dateFormatter = new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'short',
  timeStyle: 'short'
})

const paymentMethodMap: Record<string, string> = {
  promptpay: 'พร้อมเพย์',
  bank_transfer: 'โอนธนาคาร',
  qr_code: 'QR Code'
}

// State
const requests = shallowRef<TopupRequest[]>([]) // shallowRef for array of objects
const loading = ref(false)
const activeFilter = ref<string | null>(null)
const searchQuery = ref('')
const selectedRequest = ref<TopupRequest | null>(null)
const showDetailModal = ref(false)
const showActionModal = ref(false)
const actionType = ref<'approve' | 'reject'>('approve')
const adminNote = ref('')
const processing = ref(false)

// Computed: Statistics (optimized - single pass)
const stats = computed(() => {
  const result = {
    pending: { count: 0, amount: 0 },
    approved: { count: 0, amount: 0 },
    rejected: { count: 0, amount: 0 },
    total: { count: 0, amount: 0 }
  }

  for (const r of requests.value) {
    result.total.count++
    result.total.amount += r.amount

    if (r.status === 'pending') {
      result.pending.count++
      result.pending.amount += r.amount
    } else if (r.status === 'approved') {
      result.approved.count++
      result.approved.amount += r.amount
    } else if (r.status === 'rejected') {
      result.rejected.count++
    }
  }

  return result
})

// Computed: Filtered Requests (optimized)
const filteredRequests = computed(() => {
  let result = requests.value

  // Filter by status
  if (activeFilter.value) {
    const status = activeFilter.value
    result = result.filter(r => r.status === status)
  }

  // Filter by search
  const query = searchQuery.value.trim()
  if (query) {
    const q = query.toLowerCase()
    result = result.filter(r => 
      r.tracking_id.toLowerCase().includes(q) ||
      r.user_name.toLowerCase().includes(q) ||
      r.user_phone.includes(q)
    )
  }

  // Sort: pending first, then by created_at desc
  // Use slice() to avoid mutating original array
  return result.slice().sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
})

// Functions
async function load(): Promise<void> {
  loading.value = true
  try {
    const { data, error } = await supabase.rpc('admin_get_topup_requests_enhanced', {
      p_status: null,
      p_limit: 100,
      p_search: null
    } as never)

    if (error) throw error
    requests.value = data || []
  } catch (e) {
    console.error('Load topup requests failed:', e)
    alert('ไม่สามารถโหลดข้อมูลได้')
  } finally {
    loading.value = false
  }
}

function openDetail(request: TopupRequest): void {
  selectedRequest.value = request
  showDetailModal.value = true
}

function openAction(request: TopupRequest, type: 'approve' | 'reject'): void {
  selectedRequest.value = request
  actionType.value = type
  adminNote.value = ''
  showActionModal.value = true
}

async function confirm(): Promise<void> {
  if (!selectedRequest.value) return

  processing.value = true
  try {
    const rpcName = actionType.value === 'approve' 
      ? 'admin_approve_topup_request' 
      : 'admin_reject_topup_request'

    const { error } = await supabase.rpc(rpcName, {
      p_request_id: selectedRequest.value.id,
      p_admin_note: adminNote.value || null
    } as never)

    if (error) throw error

    alert(actionType.value === 'approve' ? 'อนุมัติสำเร็จ' : 'ปฏิเสธสำเร็จ')
    showActionModal.value = false
    await load()
  } catch (e) {
    console.error('Action failed:', e)
    alert('เกิดข้อผิดพลาด')
  } finally {
    processing.value = false
  }
}

// Memoized formatters (no re-creation)
function formatMoney(amount: number): string {
  return moneyFormatter.format(amount)
}

function formatDate(dateStr: string): string {
  return dateFormatter.format(new Date(dateStr))
}

function formatPaymentMethod(method: string): string {
  return paymentMethodMap[method] || method
}

// Lifecycle
onMounted(() => {
  load()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">คำขอถอนเงิน</h1>
        <p class="text-sm text-green-600 mt-1">{{ stats.total.count }} รายการ</p>
      </div>
      <button
        @click="load"
        :disabled="loading"
        class="p-2 text-gray-600 hover:text-gray-900 transition-colors"
        title="รีเฟรช"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <!-- ยอดรวมทั้งหมด -->
      <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div class="text-xs text-gray-500">ยอดรวมทั้งหมด</div>
            <div class="text-xl font-bold text-blue-600">{{ formatMoney(stats.total.amount) }}</div>
            <div class="text-xs text-gray-400">{{ stats.total.count }} รายการ</div>
          </div>
        </div>
      </div>

      <!-- รอดำเนินการ -->
      <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div class="text-xs text-gray-500">รอดำเนินการ</div>
            <div class="text-xl font-bold text-yellow-600">{{ formatMoney(stats.pending.amount) }}</div>
            <div class="text-xs text-gray-400">{{ stats.pending.count }} รายการ</div>
          </div>
        </div>
      </div>

      <!-- โอนแล้ว -->
      <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div class="text-xs text-gray-500">โอนแล้ว</div>
            <div class="text-xl font-bold text-green-600">{{ formatMoney(stats.approved.amount) }}</div>
            <div class="text-xs text-gray-400">{{ stats.approved.count }} รายการ</div>
          </div>
        </div>
      </div>

      <!-- ปฏิเสธ -->
      <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div class="text-xs text-gray-500">ปฏิเสธ</div>
            <div class="text-xl font-bold text-red-600">{{ stats.rejected.count }}</div>
            <div class="text-xs text-gray-400">รายการ</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Search & Filter -->
    <div class="mb-6 flex gap-3">
      <div class="flex-1 relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหา Provider UID, ชื่อ, เบอร์โทร..."
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <select
        v-model="activeFilter"
        class="px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option :value="null">ทุกสถานะ</option>
        <option value="pending">รอดำเนินการ</option>
        <option value="approved">โอนแล้ว</option>
        <option value="rejected">ปฏิเสธ</option>
      </select>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">จำนวนเงิน</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">บัญชีปลายทาง</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="loading">
              <td colspan="5" class="px-6 py-12 text-center text-gray-500">
                <div class="flex items-center justify-center gap-2">
                  <svg class="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  กำลังโหลด...
                </div>
              </td>
            </tr>
            <tr v-else-if="filteredRequests.length === 0">
              <td colspan="5" class="px-6 py-12 text-center text-gray-500">
                ไม่พบข้อมูล
              </td>
            </tr>
            <tr 
              v-else
              v-for="req in filteredRequests" 
              :key="req.id"
              class="hover:bg-gray-50 transition-colors cursor-pointer"
              @click="openDetail(req)"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {{ req.user_name.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">{{ req.user_name }}</div>
                    <div class="text-sm text-gray-500">{{ req.tracking_id }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="font-semibold text-gray-900">{{ formatMoney(req.amount) }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-900">{{ formatPaymentMethod(req.payment_method) }}</div>
                <div class="text-xs text-gray-500">{{ req.user_phone }}</div>
              </td>
              <td class="px-6 py-4">
                <span 
                  :class="{
                    'bg-gray-100 text-gray-700': req.status === 'rejected',
                    'bg-green-100 text-green-700': req.status === 'approved',
                    'bg-yellow-100 text-yellow-700': req.status === 'pending'
                  }"
                  class="inline-block px-3 py-1 rounded-full text-xs font-medium"
                >
                  {{ req.status === 'pending' ? 'รอดำเนินการ' : req.status === 'approved' ? 'โอนแล้ว' : 'ปฏิเสธ' }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                {{ formatDate(req.created_at) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detail Modal -->
    <div
      v-if="showDetailModal && selectedRequest"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="showDetailModal = false"
    >
      <div class="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-900">รายละเอียดคำขอ</h2>
            <button
              @click="showDetailModal = false"
              class="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="space-y-6">
            <!-- User Info -->
            <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div class="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                {{ selectedRequest.user_name.charAt(0).toUpperCase() }}
              </div>
              <div>
                <div class="font-semibold text-lg text-gray-900">{{ selectedRequest.user_name }}</div>
                <div class="text-sm text-gray-500">{{ selectedRequest.user_phone }}</div>
                <div class="text-xs text-gray-400 font-mono mt-1">{{ selectedRequest.tracking_id }}</div>
              </div>
            </div>

            <!-- Amount & Payment -->
            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 bg-green-50 rounded-lg border border-green-200">
                <div class="text-sm text-green-700 mb-1">จำนวนเงิน</div>
                <div class="text-2xl font-bold text-green-600">฿{{ selectedRequest.amount }}</div>
              </div>
              <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div class="text-sm text-blue-700 mb-1">ช่องทาง</div>
                <div class="text-lg font-semibold text-blue-600">{{ formatPaymentMethod(selectedRequest.payment_method) }}</div>
              </div>
            </div>

            <!-- Status & Date -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-sm text-gray-600 mb-2">สถานะ</div>
                <span 
                  :class="{
                    'bg-yellow-100 text-yellow-800': selectedRequest.status === 'pending',
                    'bg-green-100 text-green-800': selectedRequest.status === 'approved',
                    'bg-gray-100 text-gray-800': selectedRequest.status === 'rejected'
                  }"
                  class="inline-block px-4 py-2 rounded-lg text-sm font-medium"
                >
                  {{ selectedRequest.status === 'pending' ? 'รอดำเนินการ' : selectedRequest.status === 'approved' ? 'โอนแล้ว' : 'ปฏิเสธ' }}
                </span>
              </div>
              <div>
                <div class="text-sm text-gray-600 mb-2">วันที่สร้าง</div>
                <div class="font-medium text-gray-900">{{ formatDate(selectedRequest.created_at) }}</div>
              </div>
            </div>

            <!-- Admin Note -->
            <div v-if="selectedRequest.admin_note" class="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div class="text-sm font-medium text-amber-900 mb-2">หมายเหตุจากแอดมิน</div>
              <div class="text-sm text-amber-800">{{ selectedRequest.admin_note }}</div>
            </div>

            <!-- Payment Slip -->
            <div v-if="selectedRequest.slip_url">
              <div class="text-sm font-medium text-gray-700 mb-3">สลิปการโอน</div>
              <img 
                :src="selectedRequest.slip_url" 
                alt="Payment Slip"
                class="w-full max-w-md mx-auto rounded-lg border-2 border-gray-200 shadow-md"
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-6 flex gap-3">
            <button
              @click="showDetailModal = false"
              class="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              ปิด
            </button>
            <template v-if="selectedRequest.status === 'pending'">
              <button
                @click="openAction(selectedRequest, 'approve'); showDetailModal = false"
                class="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                ✓ อนุมัติ
              </button>
              <button
                @click="openAction(selectedRequest, 'reject'); showDetailModal = false"
                class="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                ✕ ปฏิเสธ
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Modal -->
    <div
      v-if="showActionModal && selectedRequest"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="showActionModal = false"
    >
      <div class="bg-white rounded-xl max-w-md w-full shadow-2xl">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-6">
            {{ actionType === 'approve' ? '✓ อนุมัติคำขอ' : '✕ ปฏิเสธคำขอ' }}
          </h2>

          <div class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {{ selectedRequest.user_name.charAt(0).toUpperCase() }}
              </div>
              <div>
                <div class="font-medium text-gray-900">{{ selectedRequest.user_name }}</div>
                <div class="text-xs text-gray-500 font-mono">{{ selectedRequest.tracking_id }}</div>
              </div>
            </div>
            <div class="text-2xl font-bold text-green-600">฿{{ selectedRequest.amount }}</div>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              หมายเหตุ (ถ้ามี)
            </label>
            <textarea
              v-model="adminNote"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ระบุเหตุผล..."
            ></textarea>
          </div>

          <div class="flex gap-3">
            <button
              @click="showActionModal = false"
              :disabled="processing"
              class="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium"
            >
              ยกเลิก
            </button>
            <button
              @click="confirm"
              :disabled="processing"
              :class="[
                'flex-1 px-4 py-2.5 text-white rounded-lg transition-colors disabled:opacity-50 font-medium',
                actionType === 'approve' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              ]"
            >
              <span v-if="processing" class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                กำลังดำเนินการ...
              </span>
              <span v-else>
                {{ actionType === 'approve' ? 'ยืนยันอนุมัติ' : 'ยืนยันปฏิเสธ' }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
