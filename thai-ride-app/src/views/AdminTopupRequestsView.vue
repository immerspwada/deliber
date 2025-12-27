<script setup lang="ts">
/**
 * AdminTopupRequestsView - Admin Topup Request Management
 * Feature: F05 - Wallet/Balance (Admin Side)
 *
 * Admin สามารถ:
 * - ดูคำขอเติมเงินทั้งหมด
 * - อนุมัติ/ปฏิเสธคำขอ
 * - ดูสลิปการโอนเงิน
 * - เพิ่มหมายเหตุ
 */
import { ref, computed, onMounted } from "vue";
import { supabase } from "../lib/supabase";

interface TopupRequest {
  id: string;
  tracking_id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  amount: number;
  payment_method: string;
  payment_reference: string | null;
  slip_url: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  rejected_at: string | null;
}

// State
const requests = ref<TopupRequest[]>([]);
const loading = ref(false);
const statusFilter = ref<string | null>(null);
const selectedRequest = ref<TopupRequest | null>(null);
const showDetailModal = ref(false);
const showActionModal = ref(false);
const actionType = ref<"approve" | "reject">("approve");
const adminNote = ref("");
const actionLoading = ref(false);
const toast = ref({ show: false, success: false, text: "" });

// Stats
const stats = computed(() => {
  const pending = requests.value.filter((r) => r.status === "pending").length;
  const approved = requests.value.filter((r) => r.status === "approved").length;
  const rejected = requests.value.filter((r) => r.status === "rejected").length;
  const totalPending = requests.value
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.amount, 0);
  return { pending, approved, rejected, totalPending };
});

// Filtered requests
const filteredRequests = computed(() => {
  if (!statusFilter.value) return requests.value;
  return requests.value.filter((r) => r.status === statusFilter.value);
});

// Lifecycle
onMounted(() => {
  fetchRequests();
});

// Functions
const fetchRequests = async () => {
  loading.value = true;
  try {
    const { data, error } = await (supabase.rpc as any)(
      "admin_get_topup_requests",
      {
        p_status: statusFilter.value,
        p_limit: 100,
      }
    );

    if (error) throw error;
    requests.value = data || [];
  } catch (err) {
    console.error("Error fetching topup requests:", err);
    // Fallback to direct query
    try {
      const { data } = await supabase
        .from("topup_requests")
        .select(
          `
          *,
          users:user_id (first_name, last_name, phone_number)
        `
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (data) {
        requests.value = data.map((r: any) => ({
          ...r,
          user_name: r.users
            ? `${r.users.first_name || ""} ${r.users.last_name || ""}`.trim() ||
              "ไม่ระบุชื่อ"
            : "ไม่ระบุชื่อ",
          user_phone: r.users?.phone_number || "-",
        }));
      }
    } catch {
      requests.value = [];
    }
  } finally {
    loading.value = false;
  }
};

const openDetail = (request: TopupRequest) => {
  selectedRequest.value = request;
  showDetailModal.value = true;
};

const openAction = (request: TopupRequest, type: "approve" | "reject") => {
  selectedRequest.value = request;
  actionType.value = type;
  adminNote.value = "";
  showActionModal.value = true;
};

const handleAction = async () => {
  if (!selectedRequest.value) return;

  actionLoading.value = true;
  try {
    const funcName =
      actionType.value === "approve"
        ? "admin_approve_topup_request"
        : "admin_reject_topup_request";

    const { data, error } = await (supabase.rpc as any)(funcName, {
      p_request_id: selectedRequest.value.id,
      p_admin_note: adminNote.value || null,
    });

    if (error) throw error;

    const result = data?.[0];
    if (result?.success) {
      showToast(true, result.message);
      showActionModal.value = false;
      await fetchRequests();
    } else {
      showToast(false, result?.message || "เกิดข้อผิดพลาด");
    }
  } catch (err: any) {
    console.error("Error processing request:", err);
    showToast(false, err.message || "เกิดข้อผิดพลาด");
  } finally {
    actionLoading.value = false;
  }
};

const showToast = (success: boolean, text: string) => {
  toast.value = { show: true, success, text };
  setTimeout(() => {
    toast.value.show = false;
  }, 4000);
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatPaymentMethod = (method: string): string => {
  const methods: Record<string, string> = {
    promptpay: "พร้อมเพย์",
    bank_transfer: "โอนเงินผ่านธนาคาร",
    credit_card: "บัตรเครดิต",
  };
  return methods[method] || method;
};

const getStatusBadge = (status: string) => {
  const badges: Record<string, { label: string; class: string }> = {
    pending: { label: "รอดำเนินการ", class: "bg-yellow-100 text-yellow-800" },
    approved: { label: "อนุมัติแล้ว", class: "bg-green-100 text-green-800" },
    rejected: { label: "ปฏิเสธ", class: "bg-red-100 text-red-800" },
    cancelled: { label: "ยกเลิก", class: "bg-gray-100 text-gray-800" },
    expired: { label: "หมดอายุ", class: "bg-gray-100 text-gray-600" },
  };
  return (
    badges[status] || { label: status, class: "bg-gray-100 text-gray-800" }
  );
};
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Toast -->
    <Transition name="toast">
      <div
        v-if="toast.show"
        :class="[
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2',
          toast.success ? 'bg-green-500 text-white' : 'bg-red-500 text-white',
        ]"
      >
        <svg
          v-if="toast.success"
          class="w-5 h-5"
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
        <svg
          v-else
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
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
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">คำขอเติมเงิน</h1>
        <p class="text-gray-600 mt-1">จัดการคำขอเติมเงินจากลูกค้า</p>
      </div>
      <button
        @click="fetchRequests"
        :disabled="loading"
        class="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        <svg
          :class="['w-5 h-5', { 'animate-spin': loading }]"
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

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div class="text-yellow-600 text-sm font-medium">รอดำเนินการ</div>
        <div class="text-2xl font-bold text-yellow-700">
          {{ stats.pending }}
        </div>
        <div class="text-yellow-600 text-sm">
          ฿{{ stats.totalPending.toLocaleString() }}
        </div>
      </div>
      <div class="bg-green-50 border border-green-200 rounded-xl p-4">
        <div class="text-green-600 text-sm font-medium">อนุมัติแล้ว</div>
        <div class="text-2xl font-bold text-green-700">
          {{ stats.approved }}
        </div>
      </div>
      <div class="bg-red-50 border border-red-200 rounded-xl p-4">
        <div class="text-red-600 text-sm font-medium">ปฏิเสธ</div>
        <div class="text-2xl font-bold text-red-700">{{ stats.rejected }}</div>
      </div>
      <div class="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div class="text-gray-600 text-sm font-medium">ทั้งหมด</div>
        <div class="text-2xl font-bold text-gray-700">
          {{ requests.length }}
        </div>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="flex gap-2 mb-4 overflow-x-auto pb-2">
      <button
        @click="
          statusFilter = null;
          fetchRequests();
        "
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap',
          !statusFilter
            ? 'bg-[#00A86B] text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        ]"
      >
        ทั้งหมด
      </button>
      <button
        @click="
          statusFilter = 'pending';
          fetchRequests();
        "
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap',
          statusFilter === 'pending'
            ? 'bg-yellow-500 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        ]"
      >
        รอดำเนินการ
      </button>
      <button
        @click="
          statusFilter = 'approved';
          fetchRequests();
        "
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap',
          statusFilter === 'approved'
            ? 'bg-green-500 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        ]"
      >
        อนุมัติแล้ว
      </button>
      <button
        @click="
          statusFilter = 'rejected';
          fetchRequests();
        "
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap',
          statusFilter === 'rejected'
            ? 'bg-red-500 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        ]"
      >
        ปฏิเสธ
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div
        class="w-8 h-8 border-4 border-[#00A86B] border-t-transparent rounded-full animate-spin"
      ></div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredRequests.length === 0"
      class="text-center py-12 bg-gray-50 rounded-xl"
    >
      <svg
        class="w-16 h-16 mx-auto text-gray-400 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      <p class="text-gray-500">ไม่มีคำขอเติมเงิน</p>
    </div>

    <!-- Requests Table -->
    <div
      v-else
      class="bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                รหัส
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                ลูกค้า
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                จำนวน
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                ช่องทาง
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                สถานะ
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
              >
                วันที่
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"
              >
                จัดการ
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="req in filteredRequests"
              :key="req.id"
              class="hover:bg-gray-50"
            >
              <td class="px-4 py-3">
                <span class="font-mono text-sm text-gray-900">{{
                  req.tracking_id
                }}</span>
              </td>
              <td class="px-4 py-3">
                <div class="text-sm font-medium text-gray-900">
                  {{ req.user_name }}
                </div>
                <div class="text-xs text-gray-500">{{ req.user_phone }}</div>
              </td>
              <td class="px-4 py-3">
                <span class="text-sm font-semibold text-gray-900"
                  >฿{{ req.amount.toLocaleString() }}</span
                >
              </td>
              <td class="px-4 py-3">
                <span class="text-sm text-gray-600">{{
                  formatPaymentMethod(req.payment_method)
                }}</span>
              </td>
              <td class="px-4 py-3">
                <span
                  :class="[
                    'px-2 py-1 text-xs font-medium rounded-full',
                    getStatusBadge(req.status).class,
                  ]"
                >
                  {{ getStatusBadge(req.status).label }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="text-sm text-gray-600">{{
                  formatDate(req.created_at)
                }}</span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openDetail(req)"
                    class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                    title="ดูรายละเอียด"
                  >
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </button>
                  <template v-if="req.status === 'pending'">
                    <button
                      @click="openAction(req, 'approve')"
                      class="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg"
                      title="อนุมัติ"
                    >
                      <svg
                        class="w-5 h-5"
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
                    </button>
                    <button
                      @click="openAction(req, 'reject')"
                      class="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      title="ปฏิเสธ"
                    >
                      <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detail Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDetailModal && selectedRequest"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          @click.self="showDetailModal = false"
        >
          <div
            class="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div class="p-6 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-bold text-gray-900">รายละเอียดคำขอ</h2>
                <button
                  @click="showDetailModal = false"
                  class="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div class="p-6 space-y-4">
              <div class="flex justify-between">
                <span class="text-gray-500">รหัส</span>
                <span class="font-mono font-medium">{{
                  selectedRequest.tracking_id
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">ลูกค้า</span>
                <span class="font-medium">{{ selectedRequest.user_name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">เบอร์โทร</span>
                <span>{{ selectedRequest.user_phone }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">จำนวนเงิน</span>
                <span class="text-xl font-bold text-[#00A86B]"
                  >฿{{ selectedRequest.amount.toLocaleString() }}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">ช่องทาง</span>
                <span>{{
                  formatPaymentMethod(selectedRequest.payment_method)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">สถานะ</span>
                <span
                  :class="[
                    'px-2 py-1 text-xs font-medium rounded-full',
                    getStatusBadge(selectedRequest.status).class,
                  ]"
                >
                  {{ getStatusBadge(selectedRequest.status).label }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">วันที่สร้าง</span>
                <span>{{ formatDate(selectedRequest.created_at) }}</span>
              </div>
              <div
                v-if="selectedRequest.payment_reference"
                class="flex justify-between"
              >
                <span class="text-gray-500">อ้างอิง</span>
                <span>{{ selectedRequest.payment_reference }}</span>
              </div>
              <div v-if="selectedRequest.admin_note" class="pt-4 border-t">
                <span class="text-gray-500 block mb-1">หมายเหตุ Admin</span>
                <p class="text-gray-900">{{ selectedRequest.admin_note }}</p>
              </div>
              <div v-if="selectedRequest.slip_url" class="pt-4 border-t">
                <span class="text-gray-500 block mb-2">สลิปการโอนเงิน</span>
                <img
                  :src="selectedRequest.slip_url"
                  alt="Slip"
                  class="w-full rounded-lg border"
                />
              </div>
            </div>
            <div
              v-if="selectedRequest.status === 'pending'"
              class="p-6 border-t border-gray-200 flex gap-3"
            >
              <button
                @click="
                  showDetailModal = false;
                  openAction(selectedRequest, 'reject');
                "
                class="flex-1 py-3 px-4 bg-red-100 text-red-700 font-medium rounded-xl hover:bg-red-200"
              >
                ปฏิเสธ
              </button>
              <button
                @click="
                  showDetailModal = false;
                  openAction(selectedRequest, 'approve');
                "
                class="flex-1 py-3 px-4 bg-[#00A86B] text-white font-medium rounded-xl hover:bg-[#008F5B]"
              >
                อนุมัติ
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Action Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showActionModal && selectedRequest"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          @click.self="showActionModal = false"
        >
          <div class="bg-white rounded-2xl w-full max-w-md">
            <div class="p-6 border-b border-gray-200">
              <h2 class="text-xl font-bold text-gray-900">
                {{
                  actionType === "approve"
                    ? "อนุมัติคำขอเติมเงิน"
                    : "ปฏิเสธคำขอเติมเงิน"
                }}
              </h2>
            </div>
            <div class="p-6 space-y-4">
              <div class="bg-gray-50 rounded-xl p-4">
                <div class="flex justify-between mb-2">
                  <span class="text-gray-500">รหัส</span>
                  <span class="font-mono">{{
                    selectedRequest.tracking_id
                  }}</span>
                </div>
                <div class="flex justify-between mb-2">
                  <span class="text-gray-500">ลูกค้า</span>
                  <span>{{ selectedRequest.user_name }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">จำนวน</span>
                  <span class="font-bold text-[#00A86B]"
                    >฿{{ selectedRequest.amount.toLocaleString() }}</span
                  >
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  หมายเหตุ
                  {{
                    actionType === "reject"
                      ? "(เหตุผลที่ปฏิเสธ)"
                      : "(ไม่บังคับ)"
                  }}
                </label>
                <textarea
                  v-model="adminNote"
                  rows="3"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#00A86B] focus:border-[#00A86B] outline-none"
                  :placeholder="
                    actionType === 'reject'
                      ? 'กรุณาระบุเหตุผล...'
                      : 'เพิ่มหมายเหตุ...'
                  "
                ></textarea>
              </div>
            </div>
            <div class="p-6 border-t border-gray-200 flex gap-3">
              <button
                @click="showActionModal = false"
                :disabled="actionLoading"
                class="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                @click="handleAction"
                :disabled="actionLoading"
                :class="[
                  'flex-1 py-3 px-4 font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2',
                  actionType === 'approve'
                    ? 'bg-[#00A86B] text-white hover:bg-[#008F5B]'
                    : 'bg-red-500 text-white hover:bg-red-600',
                ]"
              >
                <svg
                  v-if="actionLoading"
                  class="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {{ actionType === "approve" ? "อนุมัติ" : "ปฏิเสธ" }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
}
</style>
