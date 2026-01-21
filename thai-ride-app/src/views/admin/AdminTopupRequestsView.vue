<template>
  <div class="min-h-screen bg-gray-50 p-4 md:p-6">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">จัดการคำขอเติมเงิน</h1>
      <p class="text-sm text-gray-600 mt-1">อนุมัติ/ปฏิเสธคำขอเติมเงินจากลูกค้า</p>
    </div>

    <!-- Stats Cards -->
    <div v-if="stats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg p-4 shadow-sm">
        <div class="text-sm text-gray-600">รอดำเนินการ</div>
        <div class="text-2xl font-bold text-orange-600 mt-1">{{ pendingCount }}</div>
        <div class="text-xs text-gray-500 mt-1">฿{{ formatNumber(stats.pending_amount) }}</div>
      </div>

      <div class="bg-white rounded-lg p-4 shadow-sm">
        <div class="text-sm text-gray-600">อนุมัติแล้ว</div>
        <div class="text-2xl font-bold text-green-600 mt-1">{{ approvedCount }}</div>
        <div class="text-xs text-gray-500 mt-1">฿{{ formatNumber(stats.approved_amount) }}</div>
      </div>

      <div class="bg-white rounded-lg p-4 shadow-sm">
        <div class="text-sm text-gray-600">ปฏิเสธ</div>
        <div class="text-2xl font-bold text-red-600 mt-1">{{ rejectedCount }}</div>
      </div>

      <div class="bg-white rounded-lg p-4 shadow-sm">
        <div class="text-sm text-gray-600">เวลาเฉลี่ย</div>
        <div class="text-2xl font-bold text-blue-600 mt-1">
          {{ Math.round(stats.avg_processing_time_minutes) }}
        </div>
        <div class="text-xs text-gray-500 mt-1">นาที</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div class="flex flex-col md:flex-row gap-4">
        <!-- Search -->
        <div class="flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหา (รหัส, ชื่อ, เบอร์โทร, Member UID)"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- Status Filter -->
        <select
          v-model="statusFilter"
          class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">ทั้งหมด</option>
          <option value="pending">รอดำเนินการ</option>
          <option value="approved">อนุมัติแล้ว</option>
          <option value="rejected">ปฏิเสธแล้ว</option>
          <option value="cancelled">ยกเลิก</option>
          <option value="expired">หมดอายุ</option>
        </select>

        <!-- Refresh Button -->
        <button
          @click="refresh"
          :disabled="loading"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg
            class="w-5 h-5"
            :class="{ 'animate-spin': loading }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          รีเฟรช
        </button>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
      {{ error }}
    </div>

    <!-- Loading -->
    <div v-if="loading && !requests.length" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="text-gray-600 mt-2">กำลังโหลด...</p>
    </div>

    <!-- Requests List -->
    <div v-else-if="filteredRequests.length" class="space-y-4">
      <div
        v-for="request in filteredRequests"
        :key="request.id"
        class="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
      >
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <!-- Request Info -->
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <span class="font-mono text-sm font-semibold text-gray-900">
                {{ request.tracking_id }}
              </span>
              <span
                class="px-2 py-1 text-xs font-medium rounded-full"
                :class="getStatusClass(request.status)"
              >
                {{ getStatusText(request.status) }}
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span class="text-gray-600">ลูกค้า:</span>
                <span class="font-medium ml-1">{{ request.user_name || 'ไม่ระบุ' }}</span>
              </div>
              <div>
                <span class="text-gray-600">เบอร์:</span>
                <span class="font-medium ml-1">{{ request.user_phone || '-' }}</span>
              </div>
              <div>
                <span class="text-gray-600">Member UID:</span>
                <span class="font-medium ml-1">{{ request.user_member_uid || '-' }}</span>
              </div>
              <div>
                <span class="text-gray-600">จำนวน:</span>
                <span class="font-bold text-lg text-green-600 ml-1">
                  ฿{{ formatNumber(request.amount) }}
                </span>
              </div>
              <div>
                <span class="text-gray-600">ช่องทาง:</span>
                <span class="ml-1">{{ request.payment_method }}</span>
              </div>
              <div>
                <span class="text-gray-600">เวลา:</span>
                <span class="ml-1">{{ formatDateTime(request.created_at) }}</span>
              </div>
            </div>

            <!-- Slip Image -->
            <div v-if="request.slip_url || request.slip_image_url" class="mt-3">
              <button
                @click="viewSlip(request.slip_url || request.slip_image_url)"
                class="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                ดูสลิปการโอน
              </button>
            </div>

            <!-- Admin Note -->
            <div v-if="request.admin_note" class="mt-2 text-sm">
              <span class="text-gray-600">หมายเหตุ:</span>
              <span class="ml-1 text-gray-800">{{ request.admin_note }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div v-if="request.status === 'pending'" class="flex gap-2">
            <button
              @click="handleApprove(request)"
              :disabled="loading"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              อนุมัติ
            </button>
            <button
              @click="handleReject(request)"
              :disabled="loading"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ปฏิเสธ
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <svg
        class="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p class="text-gray-600 mt-2">ไม่พบคำขอเติมเงิน</p>
    </div>

    <!-- Slip Modal -->
    <div
      v-if="slipModalUrl"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click="slipModalUrl = null"
    >
      <div class="bg-white rounded-lg max-w-2xl w-full p-4" @click.stop>
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">สลิปการโอน</h3>
          <button
            @click="slipModalUrl = null"
            class="text-gray-500 hover:text-gray-700"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <img :src="slipModalUrl" alt="สลิปการโอน" class="w-full rounded-lg" />
      </div>
    </div>

    <!-- Reject Modal -->
    <div
      v-if="rejectModal.show"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click="closeRejectModal"
    >
      <div class="bg-white rounded-lg max-w-md w-full p-6" @click.stop>
        <h3 class="text-lg font-semibold mb-4">ปฏิเสธคำขอเติมเงิน</h3>
        <p class="text-sm text-gray-600 mb-4">
          รหัส: <span class="font-mono font-semibold">{{ rejectModal.request?.tracking_id }}</span>
        </p>
        <textarea
          v-model="rejectModal.note"
          placeholder="ระบุเหตุผลในการปฏิเสธ (จำเป็น)"
          rows="4"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        ></textarea>
        <div class="flex gap-2 mt-4">
          <button
            @click="confirmReject"
            :disabled="!rejectModal.note.trim() || loading"
            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ยืนยันปฏิเสธ
          </button>
          <button
            @click="closeRejectModal"
            :disabled="loading"
            class="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useAdminTopup } from '@/composables/useAdminTopup';
import { useAuthStore } from '@/stores/auth';
import type { TopupRequest } from '@/types/topup';

const authStore = useAuthStore();

const {
  requests,
  filteredRequests,
  stats,
  loading,
  error,
  searchQuery,
  statusFilter,
  pendingCount,
  approvedCount,
  rejectedCount,
  fetchRequests,
  fetchStats,
  approveRequest,
  rejectRequest,
  subscribeToUpdates
} = useAdminTopup();

const slipModalUrl = ref<string | null>(null);
const rejectModal = ref({
  show: false,
  request: null as TopupRequest | null,
  note: ''
});

let unsubscribe: (() => void) | null = null;

onMounted(async () => {
  await refresh();
  unsubscribe = subscribeToUpdates();
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});

async function refresh() {
  await Promise.all([
    fetchRequests(),
    fetchStats()
  ]);
}

function viewSlip(url?: string) {
  if (url) {
    slipModalUrl.value = url;
  }
}

async function handleApprove(request: TopupRequest) {
  if (!confirm(`ยืนยันการอนุมัติคำขอเติมเงิน ${request.tracking_id} จำนวน ฿${request.amount}?`)) {
    return;
  }

  const result = await approveRequest(
    request.id,
    undefined,
    authStore.user?.id || undefined
  );

  if (result.success) {
    alert('อนุมัติคำขอเติมเงินสำเร็จ');
  } else {
    alert(`เกิดข้อผิดพลาด: ${result.message}`);
  }
}

function handleReject(request: TopupRequest) {
  rejectModal.value = {
    show: true,
    request,
    note: ''
  };
}

function closeRejectModal() {
  rejectModal.value = {
    show: false,
    request: null,
    note: ''
  };
}

async function confirmReject() {
  if (!rejectModal.value.request || !rejectModal.value.note.trim()) {
    return;
  }

  const result = await rejectRequest(
    rejectModal.value.request.id,
    rejectModal.value.note,
    authStore.user?.id || undefined
  );

  if (result.success) {
    alert('ปฏิเสธคำขอเติมเงินสำเร็จ');
    closeRejectModal();
  } else {
    alert(`เกิดข้อผิดพลาด: ${result.message}`);
  }
}

function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    pending: 'bg-orange-100 text-orange-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700',
    expired: 'bg-gray-100 text-gray-700'
  };
  return classes[status] || 'bg-gray-100 text-gray-700';
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    pending: 'รอดำเนินการ',
    approved: 'อนุมัติแล้ว',
    rejected: 'ปฏิเสธแล้ว',
    cancelled: 'ยกเลิก',
    expired: 'หมดอายุ'
  };
  return texts[status] || status;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}
</script>
