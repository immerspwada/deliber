<script setup lang="ts">
/**
 * Admin Customer Withdrawals View - Production Ready
 * ===================================================
 * Customer withdrawal requests management
 * Uses RPC functions for proper admin access
 */
import { ref, computed, onMounted, watch } from "vue";
import { supabase } from "../../lib/supabase";
import { useAdminUIStore } from "../stores/adminUI.store";

const uiStore = useAdminUIStore();

// State
const isLoading = ref(true);
const withdrawals = ref<any[]>([]);
const totalWithdrawals = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const statusFilter = ref("");
const searchQuery = ref("");

// Stats
const stats = ref({
  total_count: 0,
  total_amount: 0,
  pending_count: 0,
  pending_amount: 0,
  completed_count: 0,
  completed_amount: 0,
  cancelled_count: 0,
  cancelled_amount: 0,
  today_count: 0,
  today_amount: 0,
});

// Modal state
const selectedWithdrawal = ref<any>(null);
const showDetailModal = ref(false);
const showActionModal = ref(false);
const actionType = ref<"approve" | "reject">("approve");
const actionNote = ref("");
const transactionRef = ref("");
const processing = ref(false);

const totalPages = computed(() =>
  Math.ceil(totalWithdrawals.value / pageSize.value)
);

async function loadWithdrawals() {
  isLoading.value = true;
  try {
    const offset = (currentPage.value - 1) * pageSize.value;

    const { data, error } = await (supabase.rpc as any)(
      "admin_get_customer_withdrawals",
      {
        p_status: statusFilter.value || null,
        p_limit: pageSize.value,
        p_offset: offset,
      }
    );

    if (error) throw error;

    let filteredData = data || [];

    if (searchQuery.value) {
      const search = searchQuery.value.toLowerCase();
      filteredData = filteredData.filter(
        (w: any) =>
          w.withdrawal_uid?.toLowerCase().includes(search) ||
          w.user_name?.toLowerCase().includes(search) ||
          w.user_phone?.includes(search) ||
          w.user_email?.toLowerCase().includes(search) ||
          w.bank_account_number?.includes(search)
      );
    }

    withdrawals.value = filteredData;

    const { data: countData, error: countError } = await (supabase.rpc as any)(
      "admin_count_customer_withdrawals",
      {
        p_status: statusFilter.value || null,
      }
    );

    if (countError) throw countError;
    totalWithdrawals.value = countData || 0;
  } catch (e) {
    console.error("Failed to load customer withdrawals:", e);
    uiStore.showToast("error", "ไม่สามารถโหลดข้อมูลได้");
  } finally {
    isLoading.value = false;
  }
}

async function loadStats() {
  try {
    const { data, error } = await (supabase.rpc as any)(
      "admin_get_customer_withdrawal_stats"
    );
    if (error) throw error;
    if (data && data.length > 0) {
      stats.value = data[0];
    }
  } catch (e) {
    console.error("Failed to load stats:", e);
  }
}

function openDetail(withdrawal: any) {
  selectedWithdrawal.value = withdrawal;
  showDetailModal.value = true;
}

function openAction(withdrawal: any, type: "approve" | "reject") {
  selectedWithdrawal.value = withdrawal;
  actionType.value = type;
  actionNote.value = "";
  transactionRef.value = "";
  showActionModal.value = true;
}

async function processAction() {
  if (!selectedWithdrawal.value) return;
  processing.value = true;
  try {
    if (actionType.value === "approve") {
      const { data, error } = await (supabase.rpc as any)(
        "admin_process_withdrawal",
        {
          p_withdrawal_id: selectedWithdrawal.value.id,
          p_action: "completed",
          p_reason: null,
          p_admin_notes: actionNote.value || null,
        }
      );
      if (error) throw error;
      const result = typeof data === 'object' ? data : JSON.parse(data);
      if (!result.success) {
        throw new Error(result.error || result.message);
      }
      uiStore.showToast("success", "อนุมัติการถอนเงินสำเร็จ");
    } else {
      const { data, error } = await (supabase.rpc as any)(
        "admin_process_withdrawal",
        {
          p_withdrawal_id: selectedWithdrawal.value.id,
          p_action: "rejected",
          p_reason: actionNote.value || "ไม่ระบุเหตุผล",
          p_admin_notes: actionNote.value || null,
        }
      );
      if (error) throw error;
      const result = typeof data === 'object' ? data : JSON.parse(data);
      if (!result.success) {
        throw new Error(result.error || result.message);
      }
      uiStore.showToast("success", "ปฏิเสธการถอนเงินสำเร็จ");
    }
    showActionModal.value = false;
    await loadWithdrawals();
    await loadStats();
  } catch (e: any) {
    console.error("Failed to process action:", e);
    uiStore.showToast("error", e.message || "ไม่สามารถดำเนินการได้");
  } finally {
    processing.value = false;
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(date: string) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: "#F59E0B",
    completed: "#10B981",
    rejected: "#EF4444",
  };
  return colors[status] || "#6B7280";
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "รอดำเนินการ",
    completed: "โอนแล้ว",
    rejected: "ปฏิเสธ",
    cancelled: "ยกเลิก",
  };
  return labels[status] || status;
}

watch([statusFilter], () => {
  currentPage.value = 1;
  loadWithdrawals();
});
watch(currentPage, loadWithdrawals);

let searchTimeout: any = null;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    loadWithdrawals();
  }, 300);
});

onMounted(() => {
  uiStore.setBreadcrumbs([
    { label: "Finance", path: "/admin/revenue" },
    { label: "ถอนเงินลูกค้า" },
  ]);
  loadWithdrawals();
  loadStats();
});
</script>

<template>
  <div class="withdrawals-view">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">คำขอถอนเงินลูกค้า</h1>
        <span class="total-count">{{ totalWithdrawals.toLocaleString() }} รายการ</span>
      </div>
      <button
        class="refresh-btn"
        :disabled="isLoading"
        @click="
          loadWithdrawals();
          loadStats();
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

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon total">
          <svg
            width="24"
            height="24"
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
          <span class="stat-label">ยอดรวมทั้งหมด</span><span class="stat-value">{{
            formatCurrency(stats.total_amount)
          }}</span><span class="stat-sub">{{ stats.total_count.toLocaleString() }} รายการ</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon pending">
          <svg
            width="24"
            height="24"
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
          <span class="stat-label">รอดำเนินการ</span><span class="stat-value warning">{{
            formatCurrency(stats.pending_amount)
          }}</span><span class="stat-sub">{{ stats.pending_count.toLocaleString() }} รายการ</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon completed">
          <svg
            width="24"
            height="24"
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
          <span class="stat-label">โอนแล้ว</span><span class="stat-value success">{{
            formatCurrency(stats.completed_amount)
          }}</span><span class="stat-sub">{{ stats.completed_count.toLocaleString() }} รายการ</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon rejected">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">ยกเลิก</span><span class="stat-value error">{{
            formatCurrency(stats.cancelled_amount || 0)
          }}</span><span class="stat-sub">{{ (stats.cancelled_count || 0).toLocaleString() }} รายการ</span>
        </div>
      </div>
    </div>

    <div class="filters-bar">
      <div class="search-box">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหา UID, ชื่อ, เบอร์โทร, อีเมล..."
          class="search-input"
        />
      </div>
      <select v-model="statusFilter" class="filter-select">
        <option value="">ทุกสถานะ</option>
        <option value="pending">รอดำเนินการ</option>
        <option value="completed">โอนแล้ว</option>
        <option value="rejected">ปฏิเสธ</option>
        <option value="cancelled">ยกเลิก</option>
      </select>
    </div>

    <div class="table-container">
      <div v-if="isLoading" class="loading-state">
        <div v-for="i in 10" :key="i" class="skeleton" />
      </div>
      <table v-else-if="withdrawals.length > 0" class="data-table">
        <thead>
          <tr>
            <th>ลูกค้า</th>
            <th>จำนวนเงิน</th>
            <th>บัญชีปลายทาง</th>
            <th>สถานะ</th>
            <th>วันที่</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="w in withdrawals"
            :key="w.id"
            class="clickable-row"
            @click="openDetail(w)"
          >
            <td>
              <div class="provider-cell">
                <div class="avatar">
                  {{ (w.user_name || "C").charAt(0) }}
                </div>
                <div class="info">
                  <span class="name">{{ w.user_name || "-" }}</span><code class="uid">{{ w.withdrawal_uid || "-" }}</code>
                </div>
              </div>
            </td>
            <td>
              <div class="amount-cell">
                <span class="amount">{{ formatCurrency(w.amount) }}</span>
              </div>
            </td>
            <td>
              <div class="bank-info">
                <span class="bank-name">{{ w.bank_name || "-" }}</span><span class="account">{{ w.bank_account_number || "-" }} -
                  {{ w.bank_account_name || "-" }}</span>
              </div>
            </td>
            <td>
              <span
                class="status-badge"
                :style="{
                  color: getStatusColor(w.status),
                  background: getStatusColor(w.status) + '20',
                }"
              >{{ getStatusLabel(w.status) }}</span>
            </td>
            <td class="date">{{ formatDate(w.created_at) }}</td>
            <td @click.stop>
              <div v-if="w.status === 'pending'" class="action-btns">
                <button
                  class="btn-approve"
                  title="อนุมัติ"
                  @click="openAction(w, 'approve')"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button
                  class="btn-reject"
                  title="ปฏิเสธ"
                  @click="openAction(w, 'reject')"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
        <p>ไม่พบคำขอถอนเงิน</p>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button
        class="page-btn"
        :disabled="currentPage === 1"
        @click="currentPage--"
      >
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
      </button><span class="page-info">{{ currentPage }} / {{ totalPages }}</span><button
        class="page-btn"
        :disabled="currentPage === totalPages"
        @click="currentPage++"
      >
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

    <!-- Detail Modal -->
    <div
      v-if="showDetailModal && selectedWithdrawal"
      class="modal-overlay"
      @click.self="showDetailModal = false"
    >
      <div class="modal detail-modal">
        <div class="modal-header">
          <h2>รายละเอียดคำขอถอนเงิน</h2>
          <button class="close-btn" @click="showDetailModal = false">
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
          <div class="detail-section">
            <h3>ข้อมูลลูกค้า</h3>
            <div class="detail-row">
              <span class="label">ชื่อ</span><span class="value">{{
                selectedWithdrawal.user_name || "-"
              }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Withdrawal UID</span><code class="value uid">{{
                selectedWithdrawal.withdrawal_uid || "-"
              }}</code>
            </div>
            <div class="detail-row">
              <span class="label">อีเมล</span><span class="value">{{
                selectedWithdrawal.user_email || "-"
              }}</span>
            </div>
            <div class="detail-row">
              <span class="label">เบอร์โทร</span><span class="value">{{
                selectedWithdrawal.user_phone || "-"
              }}</span>
            </div>
          </div>
          <div class="detail-section">
            <h3>ข้อมูลการถอนเงิน</h3>
            <div class="detail-row">
              <span class="label">จำนวนเงิน</span><span class="value amount">{{
                formatCurrency(selectedWithdrawal.amount)
              }}</span>
            </div>
            <div class="detail-row">
              <span class="label">สถานะ</span><span
                class="status-badge"
                :style="{
                  color: getStatusColor(selectedWithdrawal.status),
                  background: getStatusColor(selectedWithdrawal.status) + '20',
                }"
              >{{ getStatusLabel(selectedWithdrawal.status) }}</span>
            </div>
          </div>
          <div class="detail-section">
            <h3>บัญชีปลายทาง</h3>
            <div class="detail-row">
              <span class="label">ธนาคาร</span><span class="value">{{
                selectedWithdrawal.bank_name || "-"
              }}</span>
            </div>
            <div class="detail-row">
              <span class="label">เลขบัญชี</span><span class="value">{{
                selectedWithdrawal.bank_account_number || "-"
              }}</span>
            </div>
            <div class="detail-row">
              <span class="label">ชื่อบัญชี</span><span class="value">{{
                selectedWithdrawal.bank_account_name || "-"
              }}</span>
            </div>
          </div>
          <div class="detail-section">
            <h3>ข้อมูลเพิ่มเติม</h3>
            <div class="detail-row">
              <span class="label">วันที่ขอ</span><span class="value">{{
                formatDate(selectedWithdrawal.created_at)
              }}</span>
            </div>
            <div class="detail-row">
              <span class="label">วันที่ดำเนินการ</span><span class="value">{{
                selectedWithdrawal.processed_at
                  ? formatDate(selectedWithdrawal.processed_at)
                  : "-"
              }}</span>
            </div>
            <div v-if="selectedWithdrawal.processed_by_name" class="detail-row">
              <span class="label">ดำเนินการโดย</span><span class="value">{{
                selectedWithdrawal.processed_by_name
              }}</span>
            </div>
            <div v-if="selectedWithdrawal.admin_notes" class="detail-row">
              <span class="label">หมายเหตุ</span><span class="value">{{
                selectedWithdrawal.admin_notes
              }}</span>
            </div>
            <div v-if="selectedWithdrawal.reason" class="detail-row">
              <span class="label">เหตุผล</span><span class="value error">{{
                selectedWithdrawal.reason
              }}</span>
            </div>
          </div>
          <div
            v-if="selectedWithdrawal.status === 'pending'"
            class="modal-actions"
          >
            <button
              class="btn-approve-lg"
              @click="
                showDetailModal = false;
                openAction(selectedWithdrawal, 'approve');
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
                <polyline points="20 6 9 17 4 12" /></svg>อนุมัติ
            </button><button
              class="btn-reject-lg"
              @click="
                showDetailModal = false;
                openAction(selectedWithdrawal, 'reject');
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
                <path d="M18 6L6 18M6 6l12 12" /></svg>ปฏิเสธ
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Modal -->
    <div
      v-if="showActionModal && selectedWithdrawal"
      class="modal-overlay"
      @click.self="showActionModal = false"
    >
      <div class="modal action-modal">
        <div class="modal-header" :class="actionType">
          <h2>
            {{
              actionType === "approve"
                ? "อนุมัติการถอนเงิน"
                : "ปฏิเสธการถอนเงิน"
            }}
          </h2>
          <button class="close-btn" @click="showActionModal = false">
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
          <div class="summary-card">
            <div class="summary-row">
              <span class="label">ลูกค้า</span><span class="value">{{ selectedWithdrawal.user_name }}</span>
            </div>
            <div class="summary-row">
              <span class="label">จำนวนเงิน</span><span class="value amount">{{
                formatCurrency(selectedWithdrawal.amount)
              }}</span>
            </div>
            <div class="summary-row">
              <span class="label">บัญชี</span><span class="value">{{ selectedWithdrawal.bank_name }} -
                {{ selectedWithdrawal.bank_account_number }}</span>
            </div>
          </div>
          <div v-if="actionType === 'approve'" class="form-group">
            <label>เลขอ้างอิงการโอน (ถ้ามี)</label><input
              v-model="transactionRef"
              type="text"
              placeholder="เช่น REF123456789"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>{{
              actionType === "approve" ? "หมายเหตุ (ถ้ามี)" : "เหตุผลที่ปฏิเสธ"
            }}</label><textarea
              v-model="actionNote"
              rows="3"
              :placeholder="
                actionType === 'approve'
                  ? 'หมายเหตุเพิ่มเติม...'
                  : 'ระบุเหตุผลที่ปฏิเสธ...'
              "
              class="form-textarea"
            ></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showActionModal = false">
              ยกเลิก
            </button><button
              :class="actionType === 'approve' ? 'btn-primary' : 'btn-danger'"
              :disabled="processing"
              @click="processAction"
            >
              {{
                processing
                  ? "กำลังดำเนินการ..."
                  : actionType === "approve"
                    ? "ยืนยันอนุมัติ"
                    : "ยืนยันปฏิเสธ"
              }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.withdrawals-view {
  max-width: 1400px;
  margin: 0 auto;
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
.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}
.total-count {
  padding: 4px 12px;
  background: #e8f5ef;
  color: #00a86b;
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
  transition: all 0.2s;
}
.refresh-btn:hover {
  background: #f9fafb;
  color: #00a86b;
}
.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
}
.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}
.stat-icon.total {
  background: #eef2ff;
  color: #6366f1;
}
.stat-icon.pending {
  background: #fef3c7;
  color: #f59e0b;
}
.stat-icon.completed {
  background: #ecfdf5;
  color: #10b981;
}
.stat-icon.today {
  background: #e0f2fe;
  color: #0ea5e9;
}
.stat-icon.rejected {
  background: #fee2e2;
  color: #ef4444;
}
.stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat-label {
  font-size: 13px;
  color: #6b7280;
}
.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}
.stat-value.success {
  color: #10b981;
}
.stat-value.warning {
  color: #f59e0b;
}
.stat-sub {
  font-size: 12px;
  color: #9ca3af;
}

.filters-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.search-box {
  flex: 1;
  min-width: 280px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}
.search-box svg {
  color: #9ca3af;
}
.search-input {
  flex: 1;
  padding: 12px 0;
  border: none;
  outline: none;
  font-size: 14px;
}
.filter-select {
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
}

.table-container {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #f0f0f0;
}
.loading-state {
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
  vertical-align: middle;
}
.data-table tr:hover {
  background: #fafafa;
}
.clickable-row {
  cursor: pointer;
}

.provider-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar {
  width: 40px;
  height: 40px;
  background: #3b82f6;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}
.info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.info .name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}
.uid {
  font-family: monospace;
  font-size: 11px;
  padding: 2px 6px;
  background: #f3f4f6;
  border-radius: 4px;
  color: #6b7280;
}

.amount-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.amount {
  font-size: 16px;
  font-weight: 600;
  color: #059669;
}
.fee {
  font-size: 11px;
  color: #9ca3af;
}

.bank-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.bank-name {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
}
.account {
  font-size: 12px;
  color: #6b7280;
}

.status-badge {
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

.action-btns {
  display: flex;
  gap: 8px;
}
.btn-approve,
.btn-reject {
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
.btn-approve {
  background: #d1fae5;
  color: #059669;
}
.btn-approve:hover {
  background: #10b981;
  color: #fff;
}
.btn-reject {
  background: #fee2e2;
  color: #dc2626;
}
.btn-reject:hover {
  background: #ef4444;
  color: #fff;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #9ca3af;
  gap: 12px;
}
.empty-state p {
  margin: 0;
  font-size: 14px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}
.page-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.page-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #00a86b;
  color: #00a86b;
}
.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.page-info {
  font-size: 14px;
  color: #6b7280;
}

/* Modals */
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
  max-height: 90vh;
  overflow-y: auto;
}
.detail-modal {
  max-width: 560px;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}
.modal-header.approve {
  background: #ecfdf5;
}
.modal-header.reject {
  background: #fef2f2;
}
.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
}
.close-btn {
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
.close-btn:hover {
  background: #f3f4f6;
}
.modal-body {
  padding: 24px;
}

.detail-section {
  margin-bottom: 20px;
}
.detail-section h3 {
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  margin: 0 0 12px 0;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;
}
.detail-row:last-child {
  border-bottom: none;
}
.detail-row .label {
  font-size: 13px;
  color: #6b7280;
}
.detail-row .value {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}
.detail-row .value.amount {
  color: #059669;
  font-size: 16px;
}
.detail-row .value.error {
  color: #dc2626;
}

.summary-card {
  background: #f9fafb;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}
.summary-row .label {
  font-size: 13px;
  color: #6b7280;
}
.summary-row .value {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}
.summary-row .value.amount {
  color: #059669;
  font-weight: 600;
}

.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}
.form-input,
.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  transition: border-color 0.2s;
}
.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #00a86b;
}
.form-textarea {
  resize: none;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}
.btn-cancel {
  flex: 1;
  padding: 14px;
  background: #f3f4f6;
  border: none;
  border-radius: 12px;
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
  padding: 14px;
  background: #00a86b;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary:hover {
  background: #008f5b;
}
.btn-danger {
  flex: 1;
  padding: 14px;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-danger:hover {
  background: #dc2626;
}
.btn-primary:disabled,
.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-approve-lg,
.btn-reject-lg {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-approve-lg {
  background: #00a86b;
  color: #fff;
}
.btn-approve-lg:hover {
  background: #008f5b;
}
.btn-reject-lg {
  background: #ef4444;
  color: #fff;
}
.btn-reject-lg:hover {
  background: #dc2626;
}
</style>
