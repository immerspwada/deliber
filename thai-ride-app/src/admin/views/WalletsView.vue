<script setup lang="ts">
/**
 * Admin Wallets View
 * ==================
 * User wallet management + Topup request approval
 *
 * Features:
 * - View all user wallets
 * - View transaction history
 * - Manage topup requests (approve/reject)
 * - View slip images
 */
import { ref, onMounted, watch, computed } from "vue";
import { supabase } from "../../lib/supabase";
import { useAdminUIStore } from "../stores/adminUI.store";
import { useAuthStore } from "../../stores/auth";

const uiStore = useAdminUIStore();
const authStore = useAuthStore();

// Tabs
const activeTab = ref<"wallets" | "topup-requests">("wallets");

// Wallets tab
const isLoading = ref(true);
const wallets = ref<any[]>([]);
const totalWallets = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const totalPages = ref(0);
const searchQuery = ref("");
const selectedWallet = ref<any>(null);
const showDetailModal = ref(false);
const transactions = ref<any[]>([]);
const loadingTx = ref(false);

// Topup requests tab
const topupRequests = ref<any[]>([]);
const loadingTopup = ref(false);
const topupFilter = ref<"all" | "pending" | "approved" | "rejected">("pending");
const selectedTopup = ref<any>(null);
const showTopupModal = ref(false);
const showSlipModal = ref(false);
const processingTopup = ref(false);
const adminNote = ref("");

async function loadWallets() {
  isLoading.value = true;
  try {
    const offset = (currentPage.value - 1) * pageSize.value;
    const { data, count, error } = await supabase
      .from("user_wallets")
      .select(
        `id, user_id, balance, created_at, updated_at, users(first_name, last_name, phone_number, member_uid)`,
        { count: "exact" }
      )
      .order("balance", { ascending: false })
      .range(offset, offset + pageSize.value - 1);

    if (error) throw error;
    wallets.value = (data || []).map((w: any) => ({
      id: w.id,
      user_id: w.user_id,
      balance: w.balance || 0,
      name: w.users
        ? `${w.users.first_name || ""} ${w.users.last_name || ""}`.trim()
        : "-",
      phone: w.users?.phone_number,
      member_uid: w.users?.member_uid,
      created_at: w.created_at,
      updated_at: w.updated_at,
    }));
    totalWallets.value = count || 0;
    totalPages.value = Math.ceil((count || 0) / pageSize.value);
  } catch (e) {
    console.error(e);
  } finally {
    isLoading.value = false;
  }
}

async function viewWallet(wallet: any) {
  selectedWallet.value = wallet;
  showDetailModal.value = true;
  loadingTx.value = true;
  try {
    const { data } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", wallet.user_id)
      .order("created_at", { ascending: false })
      .limit(20);
    transactions.value = data || [];
  } catch (e) {
    console.error(e);
  } finally {
    loadingTx.value = false;
  }
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(n);
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function getTypeLabel(t: string) {
  return (
    (
      {
        topup: "เติมเงิน",
        payment: "ชำระเงิน",
        refund: "คืนเงิน",
        bonus: "โบนัส",
      } as any
    )[t] || t
  );
}
function getTypeColor(t: string) {
  return (
    (
      {
        topup: "#10B981",
        payment: "#EF4444",
        refund: "#3B82F6",
        bonus: "#8B5CF6",
      } as any
    )[t] || "#6B7280"
  );
}

// =====================================================
// TOPUP REQUESTS TAB
// =====================================================

async function loadTopupRequests() {
  loadingTopup.value = true;
  try {
    let query = supabase
      .from("topup_requests")
      .select(
        `
        *,
        users(first_name, last_name, phone_number, member_uid)
      `
      )
      .order("created_at", { ascending: false });

    if (topupFilter.value !== "all") {
      query = query.eq("status", topupFilter.value);
    }

    const { data, error } = await query;
    if (error) throw error;

    topupRequests.value = (data || []).map((r: any) => ({
      ...r,
      customer_name: r.users
        ? `${r.users.first_name || ""} ${r.users.last_name || ""}`.trim()
        : "-",
      customer_phone: r.users?.phone_number,
      customer_uid: r.users?.member_uid,
    }));
  } catch (e) {
    console.error("Error loading topup requests:", e);
    topupRequests.value = [];
  } finally {
    loadingTopup.value = false;
  }
}

function viewTopupRequest(request: any) {
  selectedTopup.value = request;
  adminNote.value = request.admin_note || "";
  showTopupModal.value = true;
}

function viewSlip(request: any) {
  selectedTopup.value = request;
  showSlipModal.value = true;
}

async function approveTopup() {
  if (!selectedTopup.value || !authStore.user?.id) return;

  processingTopup.value = true;
  try {
    // Update topup request status
    const { error: updateError } = await supabase
      .from("topup_requests")
      .update({
        status: "approved",
        admin_id: authStore.user.id,
        admin_note: adminNote.value || null,
        approved_at: new Date().toISOString(),
      })
      .eq("id", selectedTopup.value.id)
      .eq("status", "pending");

    if (updateError) throw updateError;

    // Add wallet transaction
    const { error: txError } = await supabase.rpc("add_wallet_transaction", {
      p_user_id: selectedTopup.value.user_id,
      p_type: "topup",
      p_amount: selectedTopup.value.amount,
      p_description: `เติมเงินผ่าน${formatPaymentMethod(
        selectedTopup.value.payment_method
      )} - ${selectedTopup.value.tracking_id}`,
      p_reference_type: "topup_request",
      p_reference_id: selectedTopup.value.id,
    });

    if (txError) throw txError;

    // Send notification to customer
    await supabase.from("user_notifications").insert({
      user_id: selectedTopup.value.user_id,
      type: "topup_approved",
      title: "เติมเงินสำเร็จ",
      message: `คำขอเติมเงิน ${formatCurrency(
        selectedTopup.value.amount
      )} ได้รับการอนุมัติแล้ว`,
      data: { topup_request_id: selectedTopup.value.id },
    });

    showTopupModal.value = false;
    await loadTopupRequests();
    uiStore.showToast("อนุมัติคำขอเติมเงินสำเร็จ", "success");
  } catch (e: any) {
    console.error("Error approving topup:", e);
    uiStore.showToast(e.message || "เกิดข้อผิดพลาด", "error");
  } finally {
    processingTopup.value = false;
  }
}

async function rejectTopup() {
  if (!selectedTopup.value || !authStore.user?.id) return;
  if (!adminNote.value.trim()) {
    uiStore.showToast("กรุณาระบุเหตุผลในการปฏิเสธ", "error");
    return;
  }

  processingTopup.value = true;
  try {
    const { error } = await supabase
      .from("topup_requests")
      .update({
        status: "rejected",
        admin_id: authStore.user.id,
        admin_note: adminNote.value,
        rejected_at: new Date().toISOString(),
      })
      .eq("id", selectedTopup.value.id)
      .eq("status", "pending");

    if (error) throw error;

    // Send notification to customer
    await supabase.from("user_notifications").insert({
      user_id: selectedTopup.value.user_id,
      type: "topup_rejected",
      title: "คำขอเติมเงินถูกปฏิเสธ",
      message: `คำขอเติมเงิน ${formatCurrency(
        selectedTopup.value.amount
      )} ถูกปฏิเสธ: ${adminNote.value}`,
      data: { topup_request_id: selectedTopup.value.id },
    });

    showTopupModal.value = false;
    await loadTopupRequests();
    uiStore.showToast("ปฏิเสธคำขอเติมเงินสำเร็จ", "success");
  } catch (e: any) {
    console.error("Error rejecting topup:", e);
    uiStore.showToast(e.message || "เกิดข้อผิดพลาด", "error");
  } finally {
    processingTopup.value = false;
  }
}

function formatPaymentMethod(method: string) {
  const methods: Record<string, string> = {
    promptpay: "พร้อมเพย์",
    bank_transfer: "โอนเงินผ่านธนาคาร",
    credit_card: "บัตรเครดิต",
  };
  return methods[method] || method;
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: "#F59E0B",
    approved: "#10B981",
    rejected: "#EF4444",
    cancelled: "#6B7280",
    expired: "#9CA3AF",
  };
  return colors[status] || "#6B7280";
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "รอดำเนินการ",
    approved: "อนุมัติแล้ว",
    rejected: "ปฏิเสธ",
    cancelled: "ยกเลิกแล้ว",
    expired: "หมดอายุ",
  };
  return labels[status] || status;
}

const pendingCount = computed(
  () => topupRequests.value.filter((r) => r.status === "pending").length
);

watch([searchQuery], () => {
  currentPage.value = 1;
  loadWallets();
});
watch(currentPage, loadWallets);
watch(topupFilter, loadTopupRequests);
watch(activeTab, (newTab) => {
  if (newTab === "topup-requests") {
    loadTopupRequests();
  }
});
onMounted(() => {
  uiStore.setBreadcrumbs([{ label: "Finance" }, { label: "Wallets" }]);
  loadWallets();
});
</script>

<template>
  <div class="wallets-view">
    <!-- Tabs -->
    <div class="tabs-container">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'wallets' }"
        @click="activeTab = 'wallets'"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
        Wallets
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'topup-requests' }"
        @click="activeTab = 'topup-requests'"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        Topup Requests
        <span v-if="pendingCount > 0" class="badge">{{ pendingCount }}</span>
      </button>
    </div>

    <!-- Wallets Tab -->
    <div v-show="activeTab === 'wallets'" class="tab-content">
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">Wallets</h1>
          <span class="total-count">{{ totalWallets }} บัญชี</span>
        </div>
        <button class="refresh-btn" @click="loadWallets" :disabled="isLoading">
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
            <path d="M21 21l-4.35-4.35" /></svg
          ><input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหา..."
            class="search-input"
          />
        </div>
      </div>
      <div class="table-container">
        <div v-if="isLoading" class="loading-state">
          <div class="skeleton" v-for="i in 10" :key="i" />
        </div>
        <table v-else-if="wallets.length" class="data-table">
          <thead>
            <tr>
              <th>ลูกค้า</th>
              <th>Member UID</th>
              <th>ยอดเงิน</th>
              <th>อัพเดท</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in wallets" :key="w.id" @click="viewWallet(w)">
              <td>
                <div class="cell">
                  <div class="avatar">{{ (w.name || "U").charAt(0) }}</div>
                  <div class="info">
                    <span class="name">{{ w.name }}</span
                    ><span class="phone">{{ w.phone || "-" }}</span>
                  </div>
                </div>
              </td>
              <td>
                <code class="uid">{{ w.member_uid || "-" }}</code>
              </td>
              <td class="balance">{{ formatCurrency(w.balance) }}</td>
              <td class="date">
                {{ formatDate(w.updated_at || w.created_at) }}
              </td>
              <td>
                <button class="action-btn" @click.stop="viewWallet(w)">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state"><p>ไม่พบ Wallet</p></div>
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
          </svg></button
        ><span class="page-info">{{ currentPage }} / {{ totalPages }}</span
        ><button
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
      <div
        v-if="showDetailModal && selectedWallet"
        class="modal-overlay"
        @click.self="showDetailModal = false"
      >
        <div class="modal">
          <div class="modal-header">
            <h2>Wallet Details</h2>
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
            <div class="wallet-header">
              <div class="avatar lg">
                {{ (selectedWallet.name || "U").charAt(0) }}
              </div>
              <div>
                <h3>{{ selectedWallet.name }}</h3>
                <code class="uid">{{ selectedWallet.member_uid }}</code>
              </div>
              <div class="balance-display">
                {{ formatCurrency(selectedWallet.balance) }}
              </div>
            </div>
            <h4 class="section-title">ประวัติธุรกรรม</h4>
            <div v-if="loadingTx" class="loading-tx">
              <div class="skeleton sm" v-for="i in 5" :key="i" />
            </div>
            <div v-else-if="transactions.length" class="tx-list">
              <div v-for="tx in transactions" :key="tx.id" class="tx-item">
                <div class="tx-info">
                  <span
                    class="tx-type"
                    :style="{ color: getTypeColor(tx.type) }"
                    >{{ getTypeLabel(tx.type) }}</span
                  ><span class="tx-desc">{{ tx.description || "-" }}</span>
                </div>
                <div class="tx-meta">
                  <span
                    class="tx-amount"
                    :class="{
                      positive: tx.amount > 0,
                      negative: tx.amount < 0,
                    }"
                    >{{ tx.amount > 0 ? "+" : ""
                    }}{{ formatCurrency(tx.amount) }}</span
                  ><span class="tx-date">{{ formatDate(tx.created_at) }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-tx"><p>ไม่มีประวัติ</p></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Topup Requests Tab -->
    <div v-show="activeTab === 'topup-requests'" class="tab-content">
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">Topup Requests</h1>
          <span v-if="pendingCount > 0" class="total-count pending"
            >{{ pendingCount }} รอดำเนินการ</span
          >
        </div>
        <button
          class="refresh-btn"
          @click="loadTopupRequests"
          :disabled="loadingTopup"
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

      <div class="filters-bar">
        <div class="filter-tabs">
          <button
            class="filter-tab"
            :class="{ active: topupFilter === 'pending' }"
            @click="topupFilter = 'pending'"
          >
            รอดำเนินการ
            <span v-if="pendingCount > 0" class="count">{{
              pendingCount
            }}</span>
          </button>
          <button
            class="filter-tab"
            :class="{ active: topupFilter === 'approved' }"
            @click="topupFilter = 'approved'"
          >
            อนุมัติแล้ว
          </button>
          <button
            class="filter-tab"
            :class="{ active: topupFilter === 'rejected' }"
            @click="topupFilter = 'rejected'"
          >
            ปฏิเสธ
          </button>
          <button
            class="filter-tab"
            :class="{ active: topupFilter === 'all' }"
            @click="topupFilter = 'all'"
          >
            ทั้งหมด
          </button>
        </div>
      </div>

      <div class="table-container">
        <div v-if="loadingTopup" class="loading-state">
          <div class="skeleton" v-for="i in 5" :key="i" />
        </div>
        <table v-else-if="topupRequests.length" class="data-table">
          <thead>
            <tr>
              <th>Tracking ID</th>
              <th>ลูกค้า</th>
              <th>จำนวนเงิน</th>
              <th>ช่องทาง</th>
              <th>สถานะ</th>
              <th>วันที่</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in topupRequests" :key="req.id">
              <td>
                <code class="tracking-id">{{ req.tracking_id }}</code>
              </td>
              <td>
                <div class="cell">
                  <div class="avatar">
                    {{ (req.customer_name || "U").charAt(0) }}
                  </div>
                  <div class="info">
                    <span class="name">{{ req.customer_name }}</span>
                    <span class="phone">{{ req.customer_phone || "-" }}</span>
                  </div>
                </div>
              </td>
              <td class="amount">{{ formatCurrency(req.amount) }}</td>
              <td>{{ formatPaymentMethod(req.payment_method) }}</td>
              <td>
                <span
                  class="status-badge"
                  :style="{
                    background: getStatusColor(req.status) + '20',
                    color: getStatusColor(req.status),
                  }"
                >
                  {{ getStatusLabel(req.status) }}
                </span>
              </td>
              <td class="date">{{ formatDate(req.created_at) }}</td>
              <td>
                <div class="action-btns">
                  <button
                    v-if="req.slip_url"
                    class="action-btn"
                    @click.stop="viewSlip(req)"
                    title="ดูสลิป"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </button>
                  <button
                    class="action-btn"
                    @click.stop="viewTopupRequest(req)"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                      />
                      <path
                        d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                      />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">
          <p>ไม่พบคำขอเติมเงิน</p>
        </div>
      </div>
    </div>

    <!-- Topup Detail Modal -->
    <div
      v-if="showTopupModal && selectedTopup"
      class="modal-overlay"
      @click.self="showTopupModal = false"
    >
      <div class="modal topup-modal">
        <div class="modal-header">
          <h2>รายละเอียดคำขอเติมเงิน</h2>
          <button class="close-btn" @click="showTopupModal = false">
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
          <div class="topup-info">
            <div class="info-row">
              <span class="label">Tracking ID:</span>
              <code class="tracking-id">{{ selectedTopup.tracking_id }}</code>
            </div>
            <div class="info-row">
              <span class="label">ลูกค้า:</span>
              <span
                >{{ selectedTopup.customer_name }} ({{
                  selectedTopup.customer_uid
                }})</span
              >
            </div>
            <div class="info-row">
              <span class="label">จำนวนเงิน:</span>
              <span class="amount-large">{{
                formatCurrency(selectedTopup.amount)
              }}</span>
            </div>
            <div class="info-row">
              <span class="label">ช่องทางชำระเงิน:</span>
              <span>{{
                formatPaymentMethod(selectedTopup.payment_method)
              }}</span>
            </div>
            <div class="info-row">
              <span class="label">สถานะ:</span>
              <span
                class="status-badge"
                :style="{
                  background: getStatusColor(selectedTopup.status) + '20',
                  color: getStatusColor(selectedTopup.status),
                }"
              >
                {{ getStatusLabel(selectedTopup.status) }}
              </span>
            </div>
            <div class="info-row">
              <span class="label">วันที่สร้าง:</span>
              <span>{{ formatDate(selectedTopup.created_at) }}</span>
            </div>
            <div v-if="selectedTopup.slip_url" class="info-row">
              <span class="label">สลิปโอนเงิน:</span>
              <button class="view-slip-btn" @click="viewSlip(selectedTopup)">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                ดูสลิป
              </button>
            </div>
          </div>

          <div v-if="selectedTopup.status === 'pending'" class="admin-actions">
            <div class="form-group">
              <label>หมายเหตุ (ถ้ามี):</label>
              <textarea
                v-model="adminNote"
                placeholder="ระบุหมายเหตุ..."
                rows="3"
                class="admin-note-input"
              ></textarea>
            </div>
            <div class="action-buttons">
              <button
                class="btn-approve"
                @click="approveTopup"
                :disabled="processingTopup"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {{ processingTopup ? "กำลังดำเนินการ..." : "อนุมัติ" }}
              </button>
              <button
                class="btn-reject"
                @click="rejectTopup"
                :disabled="processingTopup"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                ปฏิเสธ
              </button>
            </div>
          </div>

          <div v-else-if="selectedTopup.admin_note" class="admin-note-display">
            <h4>หมายเหตุจาก Admin:</h4>
            <p>{{ selectedTopup.admin_note }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Slip Image Modal -->
    <div
      v-if="showSlipModal && selectedTopup"
      class="modal-overlay"
      @click.self="showSlipModal = false"
    >
      <div class="modal slip-modal">
        <div class="modal-header">
          <h2>สลิปโอนเงิน</h2>
          <button class="close-btn" @click="showSlipModal = false">
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
        <div class="modal-body slip-body">
          <img
            :src="selectedTopup.slip_url"
            alt="Payment Slip"
            class="slip-image"
          />
          <div class="slip-info">
            <p><strong>Tracking ID:</strong> {{ selectedTopup.tracking_id }}</p>
            <p>
              <strong>จำนวนเงิน:</strong>
              {{ formatCurrency(selectedTopup.amount) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wallets-view {
  max-width: 1400px;
  margin: 0 auto;
}

/* Tabs */
.tabs-container {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid #e5e7eb;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.2s;
}
.tab-btn:hover {
  color: #00a86b;
}
.tab-btn.active {
  color: #00a86b;
  border-bottom-color: #00a86b;
}
.tab-btn .badge {
  padding: 2px 8px;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 12px;
}

.tab-content {
  animation: fadeIn 0.3s;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
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
}
.filters-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}
.search-box {
  flex: 1;
  max-width: 400px;
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
.table-container {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
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
.skeleton.sm {
  height: 48px;
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
.cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar {
  width: 40px;
  height: 40px;
  background: #00a86b;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}
.avatar.lg {
  width: 56px;
  height: 56px;
  font-size: 20px;
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
.info .phone {
  font-size: 12px;
  color: #6b7280;
}
.uid {
  font-family: monospace;
  font-size: 12px;
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 4px;
}
.balance {
  font-size: 16px;
  font-weight: 600;
  color: #059669;
}
.date {
  font-size: 13px;
  color: #6b7280;
}
.action-btn {
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
.action-btn:hover {
  background: #f3f4f6;
}
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #9ca3af;
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
}
.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.page-info {
  font-size: 14px;
  color: #6b7280;
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
  max-width: 560px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
}
.modal-body {
  padding: 24px;
  overflow-y: auto;
}
.wallet-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}
.wallet-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px 0;
}
.balance-display {
  margin-left: auto;
  font-size: 24px;
  font-weight: 700;
  color: #059669;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  margin: 0 0 12px 0;
}
.loading-tx {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tx-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tx-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f9fafb;
  border-radius: 10px;
}
.tx-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.tx-type {
  font-size: 13px;
  font-weight: 500;
}
.tx-desc {
  font-size: 12px;
  color: #6b7280;
}
.tx-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.tx-amount {
  font-size: 14px;
  font-weight: 600;
}
.tx-amount.positive {
  color: #10b981;
}
.tx-amount.negative {
  color: #ef4444;
}
.tx-date {
  font-size: 11px;
  color: #9ca3af;
}
.empty-tx {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #9ca3af;
}

/* Topup Requests Tab */
.filter-tabs {
  display: flex;
  gap: 8px;
}
.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.2s;
}
.filter-tab:hover {
  border-color: #00a86b;
  color: #00a86b;
}
.filter-tab.active {
  background: #00a86b;
  border-color: #00a86b;
  color: #fff;
}
.filter-tab .count {
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  font-size: 11px;
}
.filter-tab.active .count {
  background: rgba(255, 255, 255, 0.3);
}

.tracking-id {
  font-family: monospace;
  font-size: 12px;
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 4px;
  font-weight: 600;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.action-btns {
  display: flex;
  gap: 4px;
}

.total-count.pending {
  background: #fef3c7;
  color: #f59e0b;
}

/* Topup Modal */
.topup-modal {
  max-width: 600px;
}

.topup-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.info-row .label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.amount-large {
  font-size: 24px;
  font-weight: 700;
  color: #00a86b;
}

.view-slip-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f3f4f6;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #1f2937;
  transition: background 0.2s;
}

.view-slip-btn:hover {
  background: #e5e7eb;
}

.admin-actions {
  padding: 20px;
  background: #f9fafb;
  border-radius: 12px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.admin-note-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.btn-approve,
.btn-reject {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-approve {
  background: #00a86b;
  color: #fff;
}

.btn-approve:hover:not(:disabled) {
  background: #008f5b;
}

.btn-reject {
  background: #ef4444;
  color: #fff;
}

.btn-reject:hover:not(:disabled) {
  background: #dc2626;
}

.btn-approve:disabled,
.btn-reject:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.admin-note-display {
  padding: 16px;
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
  border-radius: 8px;
}

.admin-note-display h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #92400e;
}

.admin-note-display p {
  margin: 0;
  font-size: 14px;
  color: #78350f;
}

/* Slip Modal */
.slip-modal {
  max-width: 500px;
}

.slip-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.slip-image {
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.slip-info {
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.slip-info p {
  margin: 8px 0;
  font-size: 14px;
}
</style>
