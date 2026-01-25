<script setup lang="ts">
/**
 * Admin Refunds View - Production Ready
 * =====================================
 * Refund management with real database integration
 * Includes: Regular Refunds + Cancellation Refunds (requires approval)
 */
import { ref, computed, onMounted, watch } from "vue";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const isLoading = ref(true);
const refunds = ref<any[]>([]);
const totalRefunds = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const statusFilter = ref("");
const selectedRefund = ref<any>(null);
const showModal = ref(false);
const showActionModal = ref(false);
const actionType = ref<"approve" | "reject">("approve");
const actionNotes = ref("");
const processing = ref(false);

// Tab management: 'regular' or 'cancellation'
const activeTab = ref<"regular" | "cancellation">("cancellation");

// Cancellation refunds state
const cancellationRefunds = ref<any[]>([]);
const cancellationStats = ref({
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  total_amount: 0,
  pending_amount: 0,
});

const stats = ref({
  total_refunds: 0,
  pending_refunds: 0,
  approved_refunds: 0,
  rejected_refunds: 0,
  total_amount_refunded: 0,
  total_amount_pending: 0,
  today_refunds: 0,
  today_amount: 0,
  avg_refund_amount: 0,
  avg_processing_hours: 0,
});

const totalPages = computed(() =>
  Math.ceil(totalRefunds.value / pageSize.value)
);

// Load cancellation refunds
async function loadCancellationRefunds() {
  isLoading.value = true;
  try {
    const { data, error } = await (supabase.rpc as any)(
      "get_all_cancellation_refunds",
      {
        p_status: statusFilter.value || null,
        p_limit: 100,
        p_offset: 0,
      }
    );
    if (error) throw error;
    cancellationRefunds.value = data || [];
  } catch (e) {
    console.error("Failed to load cancellation refunds:", e);
    cancellationRefunds.value = [];
  } finally {
    isLoading.value = false;
  }
}

// Load cancellation stats
async function loadCancellationStats() {
  try {
    const { data, error } = await (supabase.rpc as any)(
      "get_cancellation_refund_stats"
    );
    if (error) throw error;
    if (data) {
      cancellationStats.value = {
        total: data.total || 0,
        pending: data.pending || 0,
        approved: data.approved || 0,
        rejected: data.rejected || 0,
        total_amount: data.total_amount || 0,
        pending_amount: data.pending_amount || 0,
      };
    }
  } catch (e) {
    console.error("Failed to load cancellation stats:", e);
  }
}

// Approve cancellation refund
async function approveCancellationRefund() {
  if (!selectedRefund.value) return;
  processing.value = true;
  try {
    const { data, error } = await (supabase.rpc as any)(
      "admin_approve_cancellation_refund",
      {
        p_refund_id: selectedRefund.value.id,
        p_admin_id: authStore.user?.id,
        p_admin_notes: actionNotes.value || null,
      }
    );
    if (error) throw error;
    showActionModal.value = false;
    showModal.value = false;
    loadCancellationRefunds();
    loadCancellationStats();
  } catch (e: any) {
    console.error("Failed to approve cancellation refund:", e);
    alert(e.message || "เกิดข้อผิดพลาดในการอนุมัติ");
  } finally {
    processing.value = false;
  }
}

// Reject cancellation refund
async function rejectCancellationRefund() {
  if (!selectedRefund.value) return;
  if (!actionNotes.value.trim()) {
    alert("กรุณาระบุเหตุผลที่ปฏิเสธ");
    return;
  }
  processing.value = true;
  try {
    const { data, error } = await (supabase.rpc as any)(
      "admin_reject_cancellation_refund",
      {
        p_refund_id: selectedRefund.value.id,
        p_admin_id: authStore.user?.id,
        p_rejection_reason: actionNotes.value,
      }
    );
    if (error) throw error;
    showActionModal.value = false;
    showModal.value = false;
    loadCancellationRefunds();
    loadCancellationStats();
  } catch (e: any) {
    console.error("Failed to reject cancellation refund:", e);
    alert(e.message || "เกิดข้อผิดพลาดในการปฏิเสธ");
  } finally {
    processing.value = false;
  }
}

// Process cancellation action
async function processCancellationAction() {
  if (actionType.value === "approve") {
    await approveCancellationRefund();
  } else {
    await rejectCancellationRefund();
  }
}

async function loadRefunds() {
  isLoading.value = true;
  try {
    const offset = (currentPage.value - 1) * pageSize.value;
    const { data, error } = await (supabase.rpc as any)("admin_get_refunds", {
      p_status: statusFilter.value || null,
      p_limit: pageSize.value,
      p_offset: offset,
    });
    if (error) throw error;
    refunds.value = data || [];

    const { data: countData } = await (supabase.rpc as any)(
      "admin_count_refunds",
      {
        p_status: statusFilter.value || null,
      }
    );
    totalRefunds.value = countData || 0;
  } catch (e) {
    console.error("Failed to load refunds:", e);
  } finally {
    isLoading.value = false;
  }
}

async function loadStats() {
  try {
    const { data, error } = await (supabase.rpc as any)(
      "admin_get_refund_stats"
    );
    if (error) throw error;
    if (data && data.length > 0) stats.value = data[0];
  } catch (e) {
    console.error("Failed to load stats:", e);
  }
}

function viewRefund(r: any) {
  selectedRefund.value = r;
  showModal.value = true;
}

function openAction(r: any, type: "approve" | "reject") {
  selectedRefund.value = r;
  actionType.value = type;
  actionNotes.value = "";
  showActionModal.value = true;
}

async function processRefund() {
  if (!selectedRefund.value) return;
  processing.value = true;
  try {
    const { data, error } = await (supabase.rpc as any)(
      "admin_process_refund",
      {
        p_refund_id: selectedRefund.value.id,
        p_action: actionType.value,
        p_admin_id: authStore.user?.id,
        p_notes: actionNotes.value || null,
      }
    );
    if (error) throw error;
    showActionModal.value = false;
    showModal.value = false;
    loadRefunds();
    loadStats();
  } catch (e) {
    console.error("Failed to process refund:", e);
  } finally {
    processing.value = false;
  }
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(n || 0);
}

function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColor(s: string) {
  return (
    ({ pending: "#F59E0B", approved: "#10B981", rejected: "#EF4444" } as any)[
      s
    ] || "#6B7280"
  );
}

function getStatusLabel(s: string) {
  return (
    (
      {
        pending: "รอดำเนินการ",
        approved: "อนุมัติแล้ว",
        rejected: "ปฏิเสธ",
      } as any
    )[s] || s
  );
}

function getServiceLabel(t: string) {
  return (
    (
      {
        ride: "เรียกรถ",
        delivery: "ส่งของ",
        shopping: "ซื้อของ",
        queue: "จองคิว",
        moving: "ขนย้าย",
        laundry: "ซักผ้า",
      } as any
    )[t] || t
  );
}

watch([statusFilter], () => {
  currentPage.value = 1;
  if (activeTab.value === "regular") {
    loadRefunds();
  } else {
    loadCancellationRefunds();
  }
});
watch(currentPage, loadRefunds);
watch(activeTab, () => {
  statusFilter.value = "";
  if (activeTab.value === "regular") {
    loadRefunds();
    loadStats();
  } else {
    loadCancellationRefunds();
    loadCancellationStats();
  }
});
onMounted(() => {
  // Default to cancellation tab
  loadCancellationRefunds();
  loadCancellationStats();
});
</script>

<template>
  <div class="refunds-view">
    <div class="page-header">
      <div class="header-left">
        <h1>Refunds</h1>
        <span class="count">{{
          activeTab === "cancellation"
            ? cancellationStats.pending
            : stats.pending_refunds
        }}
          รอดำเนินการ</span>
      </div>
      <button
        class="refresh-btn"
        @click="
          activeTab === 'cancellation'
            ? (loadCancellationRefunds(), loadCancellationStats())
            : (loadRefunds(), loadStats())
        "
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M23 4v6h-6M1 20v-6h6" />
          <path
            d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"
          />
        </svg>
      </button>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        :class="['tab', { active: activeTab === 'cancellation' }]"
        @click="activeTab = 'cancellation'"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
        คืนเงินจากการยกเลิก
        <span v-if="cancellationStats.pending > 0" class="badge-count">{{
          cancellationStats.pending
        }}</span>
      </button>
      <button
        :class="['tab', { active: activeTab === 'regular' }]"
        @click="activeTab = 'regular'"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
        คืนเงินทั่วไป
        <span v-if="stats.pending_refunds > 0" class="badge-count">{{
          stats.pending_refunds
        }}</span>
      </button>
    </div>

    <!-- Cancellation Refunds Tab -->
    <template v-if="activeTab === 'cancellation'">
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon orange">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ cancellationStats.pending }}</span>
            <span class="stat-label">รอดำเนินการ</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ cancellationStats.approved }}</span>
            <span class="stat-label">อนุมัติแล้ว</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{
              formatCurrency(cancellationStats.pending_amount)
            }}</span>
            <span class="stat-label">รอคืนเงิน</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ cancellationStats.rejected }}</span>
            <span class="stat-label">ปฏิเสธ</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <select v-model="statusFilter" class="filter-select">
          <option value="">ทุกสถานะ</option>
          <option value="pending">รอดำเนินการ</option>
          <option value="approved">อนุมัติแล้ว</option>
          <option value="rejected">ปฏิเสธ</option>
        </select>
      </div>

      <!-- Cancellation Refunds Table -->
      <div class="table-container">
        <div v-if="isLoading" class="loading">
          <div v-for="i in 8" :key="i" class="skeleton" />
        </div>
        <table v-else-if="cancellationRefunds.length" class="data-table">
          <thead>
            <tr>
              <th>Tracking ID</th>
              <th>ลูกค้า</th>
              <th>บริการ</th>
              <th>จำนวนเงิน</th>
              <th>เหตุผล</th>
              <th>สถานะ</th>
              <th>วันที่ยกเลิก</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in cancellationRefunds"
              :key="r.id"
              @click="viewRefund(r)"
            >
              <td>
                <code class="tracking">{{
                  r.request_tracking_id || r.id.slice(0, 8)
                }}</code>
              </td>
              <td>
                <div class="user-info">
                  <span class="name">{{ r.user_name || "ไม่ระบุ" }}</span>
                  <span class="uid">{{ r.user_member_uid || "-" }}</span>
                </div>
              </td>
              <td>
                <span class="service-badge">{{
                  getServiceLabel(r.request_type)
                }}</span>
              </td>
              <td class="amount">{{ formatCurrency(r.refund_amount) }}</td>
              <td class="reason-cell">{{ r.cancel_reason || "-" }}</td>
              <td>
                <span
                  class="badge"
                  :style="{
                    color: getStatusColor(r.status),
                    background: getStatusColor(r.status) + '20',
                  }"
                >{{ getStatusLabel(r.status) }}</span>
              </td>
              <td class="date">{{ formatDate(r.created_at) }}</td>
              <td>
                <div v-if="r.status === 'pending'" class="action-btns">
                  <button
                    class="btn-approve"
                    @click.stop="openAction(r, 'approve')"
                  >
                    อนุมัติ
                  </button>
                  <button
                    class="btn-reject"
                    @click.stop="openAction(r, 'reject')"
                  >
                    ปฏิเสธ
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            stroke-width="1.5"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8M12 8v8" />
          </svg>
          <p>ไม่พบคำขอคืนเงินจากการยกเลิก</p>
        </div>
      </div>
    </template>

    <!-- Regular Refunds Tab -->
    <template v-if="activeTab === 'regular'">
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon orange">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.pending_refunds }}</span>
            <span class="stat-label">รอดำเนินการ</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.approved_refunds }}</span>
            <span class="stat-label">อนุมัติแล้ว</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{
              formatCurrency(stats.total_amount_refunded)
            }}</span>
            <span class="stat-label">คืนเงินแล้ว</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{
              formatCurrency(stats.total_amount_pending)
            }}</span>
            <span class="stat-label">รอคืนเงิน</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <select v-model="statusFilter" class="filter-select">
          <option value="">ทุกสถานะ</option>
          <option value="pending">รอดำเนินการ</option>
          <option value="approved">อนุมัติแล้ว</option>
          <option value="rejected">ปฏิเสธ</option>
        </select>
      </div>

      <!-- Table -->
      <div class="table-container">
        <div v-if="isLoading" class="loading">
          <div v-for="i in 8" :key="i" class="skeleton" />
        </div>
        <table v-else-if="refunds.length" class="data-table">
          <thead>
            <tr>
              <th>Tracking ID</th>
              <th>ลูกค้า</th>
              <th>บริการ</th>
              <th>จำนวนเงิน</th>
              <th>สถานะ</th>
              <th>วันที่</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in refunds" :key="r.id" @click="viewRefund(r)">
              <td>
                <code class="tracking">{{
                  r.tracking_id || r.id.slice(0, 8)
                }}</code>
              </td>
              <td>
                <div class="user-info">
                  <span class="name">{{ r.user_name }}</span>
                  <span class="uid">{{ r.member_uid }}</span>
                </div>
              </td>
              <td>
                <span class="service-badge">{{
                  getServiceLabel(r.service_type)
                }}</span>
              </td>
              <td class="amount">{{ formatCurrency(r.amount) }}</td>
              <td>
                <span
                  class="badge"
                  :style="{
                    color: getStatusColor(r.status),
                    background: getStatusColor(r.status) + '20',
                  }"
                >{{ getStatusLabel(r.status) }}</span>
              </td>
              <td class="date">{{ formatDate(r.created_at) }}</td>
              <td>
                <div v-if="r.status === 'pending'" class="action-btns">
                  <button
                    class="btn-approve"
                    @click.stop="openAction(r, 'approve')"
                  >
                    อนุมัติ
                  </button>
                  <button
                    class="btn-reject"
                    @click.stop="openAction(r, 'reject')"
                  >
                    ปฏิเสธ
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty"><p>ไม่พบคำขอคืนเงิน</p></div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button :disabled="currentPage === 1" @click="currentPage--">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span>{{ currentPage }}/{{ totalPages }}</span>
        <button :disabled="currentPage === totalPages" @click="currentPage++">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </template>

    <!-- Detail Modal -->
    <div
      v-if="showModal && selectedRefund"
      class="modal-overlay"
      @click.self="showModal = false"
    >
      <div class="modal">
        <div class="modal-header">
          <h2>รายละเอียดคำขอคืนเงิน</h2>
          <button @click="showModal = false">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="info-row">
            <span class="label">Tracking ID</span>
            <code>{{
              selectedRefund.request_tracking_id ||
                selectedRefund.tracking_id ||
                selectedRefund.id.slice(0, 8)
            }}</code>
          </div>
          <div class="info-row">
            <span class="label">ลูกค้า</span>
            <span>{{ selectedRefund.user_name }}</span>
          </div>
          <div class="info-row">
            <span class="label">Member UID</span>
            <code>{{
              selectedRefund.user_member_uid || selectedRefund.member_uid
            }}</code>
          </div>
          <div class="info-row">
            <span class="label">บริการ</span>
            <span>{{
              getServiceLabel(
                selectedRefund.request_type || selectedRefund.service_type
              )
            }}</span>
          </div>
          <div class="info-row">
            <span class="label">จำนวนเงิน</span>
            <span class="amount">{{
              formatCurrency(
                selectedRefund.refund_amount || selectedRefund.amount
              )
            }}</span>
          </div>
          <div class="info-row">
            <span class="label">สถานะ</span>
            <span
              class="badge"
              :style="{
                color: getStatusColor(selectedRefund.status),
                background: getStatusColor(selectedRefund.status) + '20',
              }"
            >{{ getStatusLabel(selectedRefund.status) }}</span>
          </div>
          <div class="reason-box">
            <h4>เหตุผลการยกเลิก</h4>
            <p>
              {{ selectedRefund.cancel_reason || selectedRefund.reason || "-" }}
            </p>
          </div>
          <div
            v-if="selectedRefund.admin_notes || selectedRefund.rejection_reason"
            class="reason-box"
          >
            <h4>หมายเหตุ Admin</h4>
            <p>
              {{
                selectedRefund.admin_notes || selectedRefund.rejection_reason
              }}
            </p>
          </div>
          <div v-if="selectedRefund.status === 'pending'" class="modal-actions">
            <button
              class="btn-approve"
              @click="openAction(selectedRefund, 'approve')"
            >
              อนุมัติ
            </button>
            <button
              class="btn-reject"
              @click="openAction(selectedRefund, 'reject')"
            >
              ปฏิเสธ
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Modal -->
    <div
      v-if="showActionModal"
      class="modal-overlay"
      @click.self="showActionModal = false"
    >
      <div class="modal">
        <div class="modal-header">
          <h2>
            {{ actionType === "approve" ? "อนุมัติคืนเงิน" : "ปฏิเสธคืนเงิน" }}
          </h2>
          <button @click="showActionModal = false">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="confirm-amount">
            จำนวนเงิน:
            <strong>{{
              formatCurrency(
                selectedRefund?.refund_amount || selectedRefund?.amount
              )
            }}</strong>
          </div>
          <div v-if="actionType === 'approve'" class="approve-info">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              stroke-width="2"
            >
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>เงินจะถูกคืนเข้า Wallet ของลูกค้าทันที</span>
          </div>
          <div class="form-row">
            <label>{{
              actionType === "approve"
                ? "หมายเหตุ (ถ้ามี)"
                : "เหตุผลที่ปฏิเสธ *"
            }}</label>
            <textarea
              v-model="actionNotes"
              :placeholder="
                actionType === 'approve'
                  ? 'หมายเหตุ (ถ้ามี)'
                  : 'ระบุเหตุผลที่ปฏิเสธ'
              "
              :required="actionType === 'reject'"
            ></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showActionModal = false">
              ยกเลิก
            </button>
            <button
              :class="actionType === 'approve' ? 'btn-approve' : 'btn-reject'"
              :disabled="
                processing || (actionType === 'reject' && !actionNotes.trim())
              "
              @click="
                activeTab === 'cancellation'
                  ? processCancellationAction()
                  : processRefund()
              "
            >
              {{
                processing
                  ? "กำลังดำเนินการ..."
                  : actionType === "approve"
                    ? "อนุมัติ"
                    : "ปฏิเสธ"
              }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.refunds-view {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}
.count {
  padding: 4px 12px;
  background: #fef3c7;
  color: #d97706;
  font-size: 13px;
  font-weight: 500;
  border-radius: 16px;
}
.refresh-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  color: #6b7280;
}
/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 12px;
}
.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}
.tab:hover {
  color: #374151;
}
.tab.active {
  background: #fff;
  color: #00a86b;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.badge-count {
  padding: 2px 8px;
  background: #fef3c7;
  color: #d97706;
  font-size: 12px;
  font-weight: 600;
  border-radius: 10px;
}
.tab.active .badge-count {
  background: #d1fae5;
  color: #059669;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #f3f4f6;
}
.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}
.stat-icon.green {
  background: #d1fae5;
  color: #059669;
}
.stat-icon.blue {
  background: #dbeafe;
  color: #2563eb;
}
.stat-icon.orange {
  background: #fef3c7;
  color: #d97706;
}
.stat-icon.purple {
  background: #ede9fe;
  color: #7c3aed;
}
.stat-icon.red {
  background: #fee2e2;
  color: #dc2626;
}
.stat-content {
  display: flex;
  flex-direction: column;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}
.stat-label {
  font-size: 13px;
  color: #6b7280;
}
.filters {
  margin-bottom: 20px;
}
.filter-select {
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
}
.table-container {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
}
.loading {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.skeleton {
  height: 56px;
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}
@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th {
  padding: 14px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}
.data-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f3f4f6;
}
.data-table tbody tr {
  cursor: pointer;
  transition: background 0.15s;
}
.data-table tbody tr:hover {
  background: #f9fafb;
}
.tracking {
  font-family: monospace;
  font-size: 12px;
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 4px;
}
.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.user-info .name {
  font-weight: 500;
  color: #1f2937;
}
.user-info .uid {
  font-size: 12px;
  color: #6b7280;
  font-family: monospace;
}
.service-badge {
  padding: 4px 10px;
  background: #ede9fe;
  color: #7c3aed;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}
.amount {
  font-weight: 600;
  color: #059669;
}
.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}
.date {
  font-size: 13px;
  color: #6b7280;
}
.reason-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #6b7280;
}
.action-btns {
  display: flex;
  gap: 8px;
}
.btn-approve {
  padding: 6px 12px;
  background: #d1fae5;
  color: #059669;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.btn-approve:hover {
  background: #a7f3d0;
}
.btn-approve:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-reject {
  padding: 6px 12px;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.btn-reject:hover {
  background: #fecaca;
}
.btn-reject:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #9ca3af;
  gap: 16px;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}
.pagination button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
}
.pagination button:disabled {
  opacity: 0.5;
}
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
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
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
}
.modal-header button {
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
}
.modal-body {
  padding: 24px;
}
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}
.info-row .label {
  font-size: 13px;
  color: #6b7280;
}
.reason-box {
  margin-top: 16px;
}
.reason-box h4 {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
}
.reason-box p {
  padding: 16px;
  background: #f9fafb;
  border-radius: 10px;
  font-size: 14px;
  margin: 0;
}
.confirm-amount {
  padding: 12px 16px;
  background: #f9fafb;
  border-radius: 10px;
  margin-bottom: 20px;
  font-size: 14px;
}
.approve-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #d1fae5;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #059669;
}
.form-row {
  margin-bottom: 16px;
}
.form-row label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}
.form-row textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  min-height: 80px;
  resize: vertical;
}
.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}
.btn-cancel {
  flex: 1;
  padding: 12px;
  background: #f3f4f6;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
</style>
