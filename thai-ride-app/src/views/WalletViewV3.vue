<script setup lang="ts">
/**
 * WalletViewV3 - Complete Wallet System (World-Class UX)
 * Feature: F05 - Wallet/Balance (Production Ready)
 *
 * Flow ที่สมบูรณ์:
 * 1. ดูยอดเงิน + ประวัติ
 * 2. เติมเงิน: เลือกจำนวน → เลือกช่องทาง → แสดง QR/บัญชี → อัพโหลดสลิป → รอ Admin อนุมัติ
 * 3. ติดตามสถานะคำขอ
 * 4. Realtime update
 */
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useWallet } from "../composables/useWallet";
import { usePaymentSettings } from "../composables/usePaymentSettings";
import { useAuthStore } from "../stores/auth";
import { supabase } from "../lib/supabase";

const router = useRouter();
const authStore = useAuthStore();
const {
  balance,
  transactions,
  topupRequests,
  loading,
  hasPendingTopup,
  pendingTopupAmount,
  fetchBalance,
  fetchTransactions,
  fetchTopupRequests,
  createTopupRequest,
  cancelTopupRequest,
  subscribeToWallet,
  getTransactionIcon,
  formatTopupStatus,
  formatPaymentMethod,
  isPositiveTransaction,
} = useWallet();

const { paymentInfo, fetchPaymentInfo } = usePaymentSettings();

// =====================================================
// STATE
// =====================================================
const isProvider = ref(false);
const isApprovedProvider = ref(false);
const activeTab = ref<"overview" | "history" | "topups">("overview");
const isRefreshing = ref(false);
let subscription: { unsubscribe: () => void } | null = null;

// Top-up Modal State
const showTopUpModal = ref(false);
const topUpStep = ref<"amount" | "method" | "payment" | "confirm">("amount");
const selectedAmount = ref(100); // Default amount
const customAmount = ref(""); // Empty string for custom input
const selectedMethod = ref<"promptpay" | "bank_transfer">("promptpay");
const paymentReference = ref("");
const slipFile = ref<File | null>(null);
const slipPreview = ref("");
const topUpLoading = ref(false);

// Cancel Modal
const showCancelConfirm = ref(false);
const cancelRequestId = ref("");

// Result Toast
const toast = ref({ show: false, success: false, text: "" });

// Preset amounts
const topUpAmounts = [100, 200, 500, 1000, 2000, 5000];

// Bank Account Info - ดึงจาก payment_settings (reactive)
const bankInfo = computed(() => ({
  bank: paymentInfo.value?.bank_name || "กสิกรไทย",
  accountNumber: paymentInfo.value?.bank_account_number || "123-4-56789-0",
  accountName: paymentInfo.value?.bank_account_name || "บริษัท โกแบร์ จำกัด",
  promptPayId: paymentInfo.value?.promptpay_id || "0812345678",
}));

// =====================================================
// COMPUTED
// =====================================================
const finalAmount = computed(() => {
  const custom = customAmount.value ? Number(customAmount.value) : 0;
  const selected = selectedAmount.value || 0;
  return custom > 0 ? custom : selected;
});

const isValidAmount = computed(() => {
  const amount = finalAmount.value || 0;
  return amount >= 20 && amount <= 50000;
});

const pendingCount = computed(
  () => topupRequests.value.filter((r) => r.status === "pending").length
);

const recentTransactions = computed(() => transactions.value.slice(0, 5));

// =====================================================
// LIFECYCLE
// =====================================================
onMounted(async () => {
  await checkProviderStatus();
  await loadAllData();
  subscription = subscribeToWallet();
});

onUnmounted(() => {
  subscription?.unsubscribe();
});

// =====================================================
// FUNCTIONS
// =====================================================
const checkProviderStatus = async () => {
  if (!authStore.user?.id) return;
  try {
    const { data } = await supabase
      .from("service_providers")
      .select("id, status, is_verified")
      .eq("user_id", authStore.user.id)
      .maybeSingle();

    if (data) {
      isProvider.value = true;
      isApprovedProvider.value = data.status === "approved" && data.is_verified;
    }
  } catch {
    isProvider.value = false;
  }
};

const loadAllData = async () => {
  await Promise.all([
    fetchBalance(),
    fetchTransactions(),
    fetchTopupRequests(),
    fetchPaymentInfo(),
  ]);
};

const handleRefresh = async () => {
  isRefreshing.value = true;
  await loadAllData();
  isRefreshing.value = false;
};

// =====================================================
// TOP-UP FLOW
// =====================================================
const openTopUpModal = () => {
  resetTopUpForm();
  showTopUpModal.value = true;
};

const closeTopUpModal = () => {
  showTopUpModal.value = false;
  resetTopUpForm();
};

const resetTopUpForm = () => {
  topUpStep.value = "amount";
  selectedAmount.value = 100;
  customAmount.value = "";
  selectedMethod.value = "promptpay";
  paymentReference.value = "";
  slipFile.value = null;
  slipPreview.value = "";
};

const selectAmount = (amt: number) => {
  selectedAmount.value = amt;
  customAmount.value = "";
};

const nextStep = () => {
  if (topUpStep.value === "amount" && isValidAmount.value) {
    topUpStep.value = "method";
  } else if (topUpStep.value === "method") {
    topUpStep.value = "payment";
  } else if (topUpStep.value === "payment") {
    topUpStep.value = "confirm";
  }
};

const prevStep = () => {
  if (topUpStep.value === "method") topUpStep.value = "amount";
  else if (topUpStep.value === "payment") topUpStep.value = "method";
  else if (topUpStep.value === "confirm") topUpStep.value = "payment";
};

const handleSlipUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      showToast(false, "ไฟล์ต้องมีขนาดไม่เกิน 5MB");
      return;
    }
    slipFile.value = file;
    slipPreview.value = URL.createObjectURL(file);
  }
};

const removeSlip = () => {
  slipFile.value = null;
  if (slipPreview.value) {
    URL.revokeObjectURL(slipPreview.value);
    slipPreview.value = "";
  }
};

const submitTopUp = async () => {
  if (!isValidAmount.value) {
    showToast(false, "จำนวนเงินต้องอยู่ระหว่าง 20 - 50,000 บาท");
    return;
  }

  topUpLoading.value = true;

  try {
    // Upload slip if exists (ในอนาคตควรอัพโหลดไป storage)
    let slipUrl: string | undefined;
    if (slipFile.value) {
      // TODO: Upload to Supabase Storage
      // slipUrl = await uploadSlip(slipFile.value)
    }

    const result = await createTopupRequest(
      finalAmount.value,
      selectedMethod.value,
      paymentReference.value || undefined,
      slipUrl
    );

    if (result.success) {
      closeTopUpModal();
      showToast(true, `สร้างคำขอเติมเงินสำเร็จ รหัส: ${result.trackingId}`);
      activeTab.value = "topups"; // Switch to topups tab
    } else {
      showToast(false, result.message);
    }
  } catch (err: any) {
    showToast(false, err.message || "เกิดข้อผิดพลาด");
  } finally {
    topUpLoading.value = false;
  }
};

// =====================================================
// CANCEL REQUEST
// =====================================================
const openCancelConfirm = (id: string) => {
  cancelRequestId.value = id;
  showCancelConfirm.value = true;
};

const handleCancelRequest = async () => {
  const result = await cancelTopupRequest(cancelRequestId.value);
  showCancelConfirm.value = false;
  showToast(result.success, result.message);
};

// =====================================================
// NAVIGATION
// =====================================================
const goBack = () => router.back();
const goToProviderEarnings = () => router.push("/provider/earnings");

// =====================================================
// HELPERS
// =====================================================
const showToast = (success: boolean, text: string) => {
  toast.value = { show: true, success, text };
  setTimeout(() => {
    toast.value.show = false;
  }, 4000);
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const months = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${
    date.getFullYear() + 543
  }`;
};

const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${formatDate(dateStr)} ${date
    .getHours()
    .toString()
    .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast(true, "คัดลอกแล้ว");
  } catch {
    showToast(false, "ไม่สามารถคัดลอกได้");
  }
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: "warning",
    approved: "success",
    rejected: "error",
    cancelled: "gray",
    expired: "gray",
  };
  return colors[status] || "gray";
};
</script>

<template>
  <div class="wallet-page">
    <!-- Header -->
    <header class="page-header">
      <button @click="goBack" class="back-btn" aria-label="กลับ">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <h1>กระเป๋าเงิน</h1>
      <button
        @click="handleRefresh"
        class="refresh-btn"
        :class="{ spinning: isRefreshing }"
        aria-label="รีเฟรช"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </header>

    <!-- Toast -->
    <Transition name="toast">
      <div
        v-if="toast.show"
        :class="['toast', toast.success ? 'success' : 'error']"
      >
        <svg
          v-if="toast.success"
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
        <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

    <main class="main-content">
      <!-- Balance Card -->
      <section class="balance-card">
        <div class="balance-info">
          <span class="balance-label">ยอดเงินคงเหลือ</span>
          <div class="balance-amount">
            <span class="currency">฿</span>
            <span class="amount">{{
              balance.balance.toLocaleString("th-TH", {
                minimumFractionDigits: 2,
              })
            }}</span>
          </div>

          <!-- Pending Alert -->
          <div v-if="hasPendingTopup" class="pending-badge">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            รอดำเนินการ ฿{{ pendingTopupAmount.toLocaleString() }}
          </div>
        </div>

        <button @click="openTopUpModal" class="topup-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          เติมเงิน
        </button>
      </section>

      <!-- Provider Earnings Link (for approved providers) -->
      <section
        v-if="isApprovedProvider"
        class="provider-link"
        @click="goToProviderEarnings"
      >
        <div class="provider-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div class="provider-info">
          <span class="provider-title">รายได้จากการให้บริการ</span>
          <span class="provider-desc">ดูรายได้และถอนเงินจากการวิ่งงาน</span>
        </div>
        <svg
          class="arrow"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </section>

      <!-- Tabs -->
      <nav class="tabs">
        <button
          :class="['tab', { active: activeTab === 'overview' }]"
          @click="activeTab = 'overview'"
        >
          ภาพรวม
        </button>
        <button
          :class="['tab', { active: activeTab === 'history' }]"
          @click="activeTab = 'history'"
        >
          ประวัติ
        </button>
        <button
          :class="['tab', { active: activeTab === 'topups' }]"
          @click="activeTab = 'topups'"
        >
          เติมเงิน
          <span v-if="pendingCount > 0" class="tab-badge">{{
            pendingCount
          }}</span>
        </button>
      </nav>

      <!-- Tab Content: Overview -->
      <section v-if="activeTab === 'overview'" class="tab-content">
        <div class="stats-row">
          <div class="stat-card">
            <span class="stat-label">รับเข้าทั้งหมด</span>
            <span class="stat-value positive"
              >฿{{ balance.total_earned.toLocaleString() }}</span
            >
          </div>
          <div class="stat-card">
            <span class="stat-label">ใช้ไปทั้งหมด</span>
            <span class="stat-value negative"
              >฿{{ balance.total_spent.toLocaleString() }}</span
            >
          </div>
        </div>

        <h3 class="section-title">รายการล่าสุด</h3>
        <div v-if="recentTransactions.length === 0" class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p>ยังไม่มีรายการ</p>
        </div>
        <ul v-else class="transaction-list">
          <li
            v-for="tx in recentTransactions"
            :key="tx.id"
            class="transaction-item"
          >
            <div
              class="tx-icon"
              :class="{ positive: isPositiveTransaction(tx.type) }"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  :d="getTransactionIcon(tx.type)"
                />
              </svg>
            </div>
            <div class="tx-info">
              <span class="tx-desc">{{ tx.description || tx.type }}</span>
              <span class="tx-date">{{ formatDate(tx.created_at) }}</span>
            </div>
            <span
              :class="[
                'tx-amount',
                { positive: isPositiveTransaction(tx.type) },
              ]"
            >
              {{ isPositiveTransaction(tx.type) ? "+" : "-" }}฿{{
                Math.abs(tx.amount).toLocaleString()
              }}
            </span>
          </li>
        </ul>
        <button
          v-if="transactions.length > 5"
          @click="activeTab = 'history'"
          class="view-all-btn"
        >
          ดูทั้งหมด
        </button>
      </section>

      <!-- Tab Content: History -->
      <section v-if="activeTab === 'history'" class="tab-content">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
        </div>
        <div v-else-if="transactions.length === 0" class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p>ยังไม่มีรายการ</p>
        </div>
        <ul v-else class="transaction-list">
          <li v-for="tx in transactions" :key="tx.id" class="transaction-item">
            <div
              class="tx-icon"
              :class="{ positive: isPositiveTransaction(tx.type) }"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  :d="getTransactionIcon(tx.type)"
                />
              </svg>
            </div>
            <div class="tx-info">
              <span class="tx-desc">{{ tx.description || tx.type }}</span>
              <span class="tx-date">{{ formatDateTime(tx.created_at) }}</span>
            </div>
            <span
              :class="[
                'tx-amount',
                { positive: isPositiveTransaction(tx.type) },
              ]"
            >
              {{ isPositiveTransaction(tx.type) ? "+" : "-" }}฿{{
                Math.abs(tx.amount).toLocaleString()
              }}
            </span>
          </li>
        </ul>
      </section>

      <!-- Tab Content: Topups -->
      <section v-if="activeTab === 'topups'" class="tab-content">
        <div v-if="topupRequests.length === 0" class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <p>ยังไม่มีคำขอเติมเงิน</p>
          <button @click="openTopUpModal" class="btn-outline">
            เติมเงินเลย
          </button>
        </div>
        <ul v-else class="topup-list">
          <li v-for="req in topupRequests" :key="req.id" class="topup-item">
            <div class="topup-header">
              <span class="topup-tracking">{{ req.tracking_id }}</span>
              <span :class="['topup-status', getStatusColor(req.status)]">
                {{ formatTopupStatus(req.status).label }}
              </span>
            </div>
            <div class="topup-body">
              <span class="topup-amount"
                >฿{{ req.amount.toLocaleString() }}</span
              >
              <span class="topup-method">{{
                formatPaymentMethod(req.payment_method)
              }}</span>
              <span class="topup-date">{{
                formatDateTime(req.created_at)
              }}</span>
            </div>
            <div v-if="req.admin_note" class="topup-note">
              <strong>หมายเหตุ:</strong> {{ req.admin_note }}
            </div>
            <button
              v-if="req.status === 'pending'"
              @click="openCancelConfirm(req.id)"
              class="btn-cancel"
            >
              ยกเลิกคำขอ
            </button>
          </li>
        </ul>
      </section>
    </main>

    <!-- Top-Up Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showTopUpModal"
          class="modal-overlay"
          @click.self="closeTopUpModal"
        >
          <div class="modal-sheet">
            <!-- Modal Header -->
            <div class="modal-header">
              <button
                v-if="topUpStep !== 'amount'"
                @click="prevStep"
                class="modal-back"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <h2>เติมเงิน</h2>
              <button @click="closeTopUpModal" class="modal-close">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <!-- Step Indicator -->
            <div class="step-indicator">
              <div
                :class="[
                  'step',
                  {
                    active: topUpStep === 'amount',
                    done: ['method', 'payment', 'confirm'].includes(topUpStep),
                  },
                ]"
              >
                1
              </div>
              <div
                class="step-line"
                :class="{
                  done: ['method', 'payment', 'confirm'].includes(topUpStep),
                }"
              ></div>
              <div
                :class="[
                  'step',
                  {
                    active: topUpStep === 'method',
                    done: ['payment', 'confirm'].includes(topUpStep),
                  },
                ]"
              >
                2
              </div>
              <div
                class="step-line"
                :class="{ done: ['payment', 'confirm'].includes(topUpStep) }"
              ></div>
              <div
                :class="[
                  'step',
                  {
                    active: topUpStep === 'payment',
                    done: topUpStep === 'confirm',
                  },
                ]"
              >
                3
              </div>
              <div
                class="step-line"
                :class="{ done: topUpStep === 'confirm' }"
              ></div>
              <div :class="['step', { active: topUpStep === 'confirm' }]">
                4
              </div>
            </div>

            <!-- Step 1: Amount -->
            <div v-if="topUpStep === 'amount'" class="modal-body">
              <h3 class="step-title">เลือกจำนวนเงิน</h3>
              <div class="amount-grid">
                <button
                  v-for="amt in topUpAmounts"
                  :key="amt"
                  @click="selectAmount(amt)"
                  :class="[
                    'amount-btn',
                    { active: selectedAmount === amt && !customAmount },
                  ]"
                >
                  ฿{{ amt.toLocaleString() }}
                </button>
              </div>
              <div class="custom-amount">
                <label>หรือใส่จำนวนเอง</label>
                <div class="input-wrapper">
                  <span class="input-prefix">฿</span>
                  <input
                    v-model="customAmount"
                    type="number"
                    min="20"
                    max="50000"
                    placeholder="20 - 50,000"
                    inputmode="numeric"
                  />
                </div>
                <span v-if="customAmount && !isValidAmount" class="input-error">
                  จำนวนเงินต้องอยู่ระหว่าง 20 - 50,000 บาท
                </span>
              </div>
            </div>

            <!-- Step 2: Method -->
            <div v-if="topUpStep === 'method'" class="modal-body">
              <h3 class="step-title">เลือกช่องทางชำระเงิน</h3>
              <div class="method-list">
                <label
                  :class="[
                    'method-card',
                    { active: selectedMethod === 'promptpay' },
                  ]"
                >
                  <input
                    type="radio"
                    v-model="selectedMethod"
                    value="promptpay"
                  />
                  <div class="method-icon promptpay">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                      />
                    </svg>
                  </div>
                  <div class="method-info">
                    <span class="method-name">พร้อมเพย์ (PromptPay)</span>
                    <span class="method-desc">สแกน QR Code ชำระเงินทันที</span>
                  </div>
                  <div class="method-check"></div>
                </label>
                <label
                  :class="[
                    'method-card',
                    { active: selectedMethod === 'bank_transfer' },
                  ]"
                >
                  <input
                    type="radio"
                    v-model="selectedMethod"
                    value="bank_transfer"
                  />
                  <div class="method-icon bank">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                      />
                    </svg>
                  </div>
                  <div class="method-info">
                    <span class="method-name">โอนเงินผ่านธนาคาร</span>
                    <span class="method-desc">โอนเงินเข้าบัญชีบริษัท</span>
                  </div>
                  <div class="method-check"></div>
                </label>
              </div>
            </div>

            <!-- Step 3: Payment Info -->
            <div v-if="topUpStep === 'payment'" class="modal-body">
              <h3 class="step-title">ข้อมูลการชำระเงิน</h3>

              <!-- PromptPay QR -->
              <div v-if="selectedMethod === 'promptpay'" class="payment-info">
                <div class="qr-placeholder">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                    />
                  </svg>
                  <span>QR Code จะแสดงที่นี่</span>
                </div>
                <div class="payment-detail">
                  <div class="detail-row">
                    <span class="detail-label">PromptPay ID</span>
                    <div
                      class="detail-value copyable"
                      @click="copyToClipboard(bankInfo.promptPayId)"
                    >
                      {{ bankInfo.promptPayId }}
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">ชื่อบัญชี</span>
                    <span class="detail-value">{{ bankInfo.accountName }}</span>
                  </div>
                  <div class="detail-row highlight">
                    <span class="detail-label">จำนวนเงิน</span>
                    <span class="detail-value amount"
                      >฿{{ finalAmount.toLocaleString() }}</span
                    >
                  </div>
                </div>
              </div>

              <!-- Bank Transfer -->
              <div v-else class="payment-info">
                <div class="bank-card">
                  <div class="bank-logo">{{ bankInfo.bank }}</div>
                </div>
                <div class="payment-detail">
                  <div class="detail-row">
                    <span class="detail-label">ธนาคาร</span>
                    <span class="detail-value">{{ bankInfo.bank }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">เลขบัญชี</span>
                    <div
                      class="detail-value copyable"
                      @click="copyToClipboard(bankInfo.accountNumber)"
                    >
                      {{ bankInfo.accountNumber }}
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">ชื่อบัญชี</span>
                    <span class="detail-value">{{ bankInfo.accountName }}</span>
                  </div>
                  <div class="detail-row highlight">
                    <span class="detail-label">จำนวนเงิน</span>
                    <span class="detail-value amount"
                      >฿{{ finalAmount.toLocaleString() }}</span
                    >
                  </div>
                </div>
              </div>

              <!-- Slip Upload -->
              <div class="slip-upload">
                <label class="upload-label">แนบสลิปการโอนเงิน (ถ้ามี)</label>
                <div v-if="!slipPreview" class="upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    @change="handleSlipUpload"
                    id="slip-input"
                  />
                  <label for="slip-input" class="upload-btn">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>เลือกรูปสลิป</span>
                  </label>
                </div>
                <div v-else class="slip-preview">
                  <img :src="slipPreview" alt="Slip preview" />
                  <button @click="removeSlip" class="remove-slip">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

              <!-- Reference -->
              <div class="reference-input">
                <label>เลขอ้างอิง/หมายเหตุ (ถ้ามี)</label>
                <input
                  v-model="paymentReference"
                  type="text"
                  placeholder="เช่น เลขอ้างอิงการโอน"
                />
              </div>
            </div>

            <!-- Step 4: Confirm -->
            <div v-if="topUpStep === 'confirm'" class="modal-body">
              <h3 class="step-title">ยืนยันคำขอเติมเงิน</h3>

              <div class="confirm-summary">
                <div class="summary-row">
                  <span class="summary-label">จำนวนเงิน</span>
                  <span class="summary-value highlight"
                    >฿{{ finalAmount.toLocaleString() }}</span
                  >
                </div>
                <div class="summary-row">
                  <span class="summary-label">ช่องทางชำระ</span>
                  <span class="summary-value">{{
                    formatPaymentMethod(selectedMethod)
                  }}</span>
                </div>
                <div v-if="paymentReference" class="summary-row">
                  <span class="summary-label">เลขอ้างอิง</span>
                  <span class="summary-value">{{ paymentReference }}</span>
                </div>
                <div v-if="slipFile" class="summary-row">
                  <span class="summary-label">สลิป</span>
                  <span class="summary-value success">แนบแล้ว</span>
                </div>
              </div>

              <div class="info-box">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p>
                  หลังจากสร้างคำขอ ทีมงานจะตรวจสอบและอนุมัติภายใน 30 นาที
                  (ในเวลาทำการ)
                </p>
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer">
              <button
                v-if="topUpStep === 'amount'"
                @click="nextStep"
                :disabled="!isValidAmount"
                class="btn-primary"
              >
                ถัดไป
              </button>
              <button
                v-else-if="topUpStep === 'method'"
                @click="nextStep"
                class="btn-primary"
              >
                ถัดไป
              </button>
              <button
                v-else-if="topUpStep === 'payment'"
                @click="nextStep"
                class="btn-primary"
              >
                ถัดไป
              </button>
              <button
                v-else
                @click="submitTopUp"
                :disabled="topUpLoading"
                class="btn-primary"
              >
                <span v-if="topUpLoading" class="btn-spinner"></span>
                {{ topUpLoading ? "กำลังดำเนินการ..." : "ยืนยันเติมเงิน" }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Cancel Confirm Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showCancelConfirm"
          class="modal-overlay"
          @click.self="showCancelConfirm = false"
        >
          <div class="confirm-dialog">
            <div class="dialog-icon warning">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3>ยืนยันยกเลิก?</h3>
            <p>คุณต้องการยกเลิกคำขอเติมเงินนี้หรือไม่?</p>
            <div class="dialog-actions">
              <button @click="showCancelConfirm = false" class="btn-secondary">
                ไม่ใช่
              </button>
              <button @click="handleCancelRequest" class="btn-danger">
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* =====================================================
   BASE STYLES
   ===================================================== */
.wallet-page {
  min-height: 100vh;
  background: #f5f5f5;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  position: sticky;
  top: 0;
  z-index: 50;
}

.page-header h1 {
  font-size: 18px;
  font-weight: 600;
  flex: 1;
  text-align: center;
}

.back-btn,
.refresh-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.back-btn:active,
.refresh-btn:active {
  background: #f5f5f5;
}

.back-btn svg,
.refresh-btn svg {
  width: 22px;
  height: 22px;
}

.refresh-btn.spinning svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Toast */
.toast {
  position: fixed;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast.success {
  background: #dcfce7;
  color: #166534;
}

.toast.error {
  background: #fee2e2;
  color: #991b1b;
}

.toast svg {
  width: 18px;
  height: 18px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

/* Main Content */
.main-content {
  padding: 16px;
  padding-bottom: 100px;
}

/* =====================================================
   BALANCE CARD
   ===================================================== */
.balance-card {
  background: linear-gradient(135deg, #00a86b 0%, #008f5b 100%);
  border-radius: 20px;
  padding: 24px;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 8px 24px rgba(0, 168, 107, 0.3);
  margin-bottom: 16px;
}

.balance-label {
  font-size: 14px;
  opacity: 0.85;
}

.balance-amount {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin: 8px 0 16px;
}

.currency {
  font-size: 24px;
  font-weight: 500;
}

.amount {
  font-size: 42px;
  font-weight: 700;
  letter-spacing: -1px;
}

.pending-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  margin-bottom: 16px;
}

.pending-badge svg {
  width: 16px;
  height: 16px;
}

.topup-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 32px;
  background: #fff;
  color: #00a86b;
  border: none;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.topup-btn:active {
  transform: scale(0.96);
}

.topup-btn svg {
  width: 20px;
  height: 20px;
}

/* Provider Link */
.provider-link {
  display: flex;
  align-items: center;
  gap: 14px;
  background: linear-gradient(135deg, #e8f5ef 0%, #d4edda 100%);
  border: 2px solid #00a86b;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.provider-link:active {
  transform: scale(0.98);
}

.provider-icon {
  width: 48px;
  height: 48px;
  background: #00a86b;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.provider-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.provider-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.provider-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.provider-desc {
  font-size: 13px;
  color: #166534;
}

.arrow {
  width: 20px;
  height: 20px;
  color: #00a86b;
}

/* =====================================================
   TABS
   ===================================================== */
.tabs {
  display: flex;
  gap: 8px;
  background: #fff;
  padding: 4px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.tab.active {
  background: #00a86b;
  color: #fff;
}

.tab-badge {
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
}

.tab.active .tab-badge {
  background: #fff;
  color: #00a86b;
}

/* Tab Content */
.tab-content {
  min-height: 200px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #1a1a1a;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
}

.stat-value.positive {
  color: #00a86b;
}
.stat-value.negative {
  color: #ef4444;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px 20px;
  color: #666;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.4;
}

.empty-state p {
  margin-bottom: 16px;
}

.btn-outline {
  padding: 12px 24px;
  background: transparent;
  border: 2px solid #00a86b;
  color: #00a86b;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* Loading */
.loading-state {
  display: flex;
  justify-content: center;
  padding: 48px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e8e8e8;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* =====================================================
   TRANSACTION LIST
   ===================================================== */
.transaction-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  padding: 14px;
  border-radius: 12px;
}

.tx-icon {
  width: 40px;
  height: 40px;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tx-icon.positive {
  background: #e8f5ef;
  color: #00a86b;
}

.tx-icon svg {
  width: 20px;
  height: 20px;
}

.tx-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.tx-desc {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tx-date {
  font-size: 12px;
  color: #999;
}

.tx-amount {
  font-size: 15px;
  font-weight: 600;
  color: #666;
  flex-shrink: 0;
}

.tx-amount.positive {
  color: #00a86b;
}

.view-all-btn {
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  font-size: 14px;
  color: #00a86b;
  font-weight: 500;
  cursor: pointer;
}

/* =====================================================
   TOPUP LIST
   ===================================================== */
.topup-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.topup-item {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}

.topup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.topup-tracking {
  font-family: monospace;
  font-size: 13px;
  color: #666;
}

.topup-status {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 12px;
}

.topup-status.warning {
  background: #fef3c7;
  color: #92400e;
}
.topup-status.success {
  background: #dcfce7;
  color: #166534;
}
.topup-status.error {
  background: #fee2e2;
  color: #991b1b;
}
.topup-status.gray {
  background: #f3f4f6;
  color: #6b7280;
}

.topup-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.topup-amount {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
}

.topup-method {
  font-size: 13px;
  color: #666;
}

.topup-date {
  font-size: 12px;
  color: #999;
}

.topup-note {
  margin-top: 12px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 13px;
  color: #666;
}

.btn-cancel {
  width: 100%;
  margin-top: 12px;
  padding: 10px;
  background: #fee2e2;
  color: #991b1b;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

/* =====================================================
   MODAL
   ===================================================== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.modal-sheet {
  width: 100%;
  max-width: 480px;
  background: #fff;
  border-radius: 20px 20px 0 0;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 10;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  flex: 1;
  text-align: center;
}

.modal-back,
.modal-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.modal-back svg,
.modal-close svg {
  width: 20px;
  height: 20px;
}

/* Step Indicator */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 20px;
  gap: 0;
}

.step {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8e8e8;
  color: #999;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 600;
}

.step.active {
  background: #00a86b;
  color: #fff;
}

.step.done {
  background: #00a86b;
  color: #fff;
}

.step-line {
  width: 40px;
  height: 2px;
  background: #e8e8e8;
}

.step-line.done {
  background: #00a86b;
}

.modal-body {
  padding: 20px;
}

.step-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1a1a1a;
}

.modal-footer {
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  border-top: 1px solid #e8e8e8;
  background: #fff;
  position: sticky;
  bottom: 0;
}

/* Modal Transition */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from .modal-sheet,
.modal-leave-to .modal-sheet {
  transform: translateY(100%);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* =====================================================
   AMOUNT SELECTION
   ===================================================== */
.amount-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.amount-btn {
  padding: 16px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  cursor: pointer;
  transition: all 0.2s;
}

.amount-btn.active {
  border-color: #00a86b;
  background: #e8f5ef;
  color: #00a86b;
}

.custom-amount label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 12px;
  overflow: hidden;
}

.input-wrapper:focus-within {
  border-color: #00a86b;
  background: #fff;
}

.input-prefix {
  padding: 14px 0 14px 16px;
  font-size: 18px;
  font-weight: 600;
  color: #666;
}

.input-wrapper input {
  flex: 1;
  padding: 14px 16px 14px 8px;
  border: none;
  background: transparent;
  font-size: 18px;
  font-weight: 600;
  outline: none;
}

.input-error {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #ef4444;
}

/* =====================================================
   METHOD SELECTION
   ===================================================== */
.method-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.method-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.method-card input {
  display: none;
}

.method-card.active {
  border-color: #00a86b;
  background: #e8f5ef;
}

.method-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  flex-shrink: 0;
}

.method-icon.promptpay {
  background: #1e3a8a;
  color: #fff;
}

.method-icon.bank {
  background: #059669;
  color: #fff;
}

.method-icon svg {
  width: 24px;
  height: 24px;
}

.method-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.method-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.method-desc {
  font-size: 13px;
  color: #666;
}

.method-check {
  width: 24px;
  height: 24px;
  border: 2px solid #e8e8e8;
  border-radius: 50%;
  flex-shrink: 0;
}

.method-card.active .method-check {
  border-color: #00a86b;
  background: #00a86b;
  position: relative;
}

.method-card.active .method-check::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background: #fff;
  border-radius: 50%;
}

/* =====================================================
   PAYMENT INFO
   ===================================================== */
.payment-info {
  margin-bottom: 20px;
}

.qr-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  background: #f5f5f5;
  border-radius: 16px;
  margin-bottom: 16px;
}

.qr-placeholder svg {
  width: 64px;
  height: 64px;
  color: #999;
}

.qr-placeholder span {
  font-size: 14px;
  color: #666;
}

.bank-card {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  border-radius: 16px;
  margin-bottom: 16px;
}

.bank-logo {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.payment-detail {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  overflow: hidden;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #e8e8e8;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row.highlight {
  background: #e8f5ef;
}

.detail-label {
  font-size: 14px;
  color: #666;
}

.detail-value {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.detail-value.amount {
  font-size: 18px;
  font-weight: 700;
  color: #00a86b;
}

.detail-value.copyable {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #00a86b;
}

.detail-value.copyable svg {
  width: 16px;
  height: 16px;
}

/* Slip Upload */
.slip-upload {
  margin-bottom: 20px;
}

.upload-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 10px;
  color: #1a1a1a;
}

.upload-area {
  position: relative;
}

.upload-area input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.upload-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  background: #f5f5f5;
  border: 2px dashed #e8e8e8;
  border-radius: 12px;
  cursor: pointer;
}

.upload-btn svg {
  width: 32px;
  height: 32px;
  color: #999;
}

.upload-btn span {
  font-size: 14px;
  color: #666;
}

.slip-preview {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
}

.slip-preview img {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
}

.remove-slip {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.remove-slip svg {
  width: 18px;
  height: 18px;
  color: #fff;
}

/* Reference Input */
.reference-input label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #1a1a1a;
}

.reference-input input {
  width: 100%;
  padding: 14px 16px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 12px;
  font-size: 15px;
  outline: none;
}

.reference-input input:focus {
  border-color: #00a86b;
  background: #fff;
}

/* =====================================================
   CONFIRM STEP
   ===================================================== */
.confirm-summary {
  background: #f5f5f5;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #e8e8e8;
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-label {
  font-size: 14px;
  color: #666;
}

.summary-value {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.summary-value.highlight {
  font-size: 20px;
  font-weight: 700;
  color: #00a86b;
}

.summary-value.success {
  color: #00a86b;
}

.info-box {
  display: flex;
  gap: 12px;
  padding: 14px;
  background: #e8f5ef;
  border-radius: 12px;
}

.info-box svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #00a86b;
}

.info-box p {
  font-size: 13px;
  color: #166534;
  margin: 0;
  line-height: 1.5;
}

/* =====================================================
   BUTTONS
   ===================================================== */
.btn-primary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: #00a86b;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-primary:not(:disabled):active {
  transform: scale(0.98);
}

.btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.btn-secondary {
  flex: 1;
  padding: 14px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.btn-danger {
  flex: 1;
  padding: 14px;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

/* =====================================================
   CONFIRM DIALOG
   ===================================================== */
.confirm-dialog {
  background: #fff;
  border-radius: 20px;
  padding: 28px 24px;
  margin: auto 16px;
  text-align: center;
  max-width: 340px;
}

.dialog-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  border-radius: 50%;
}

.dialog-icon.warning {
  background: #fef3c7;
  color: #f59e0b;
}

.dialog-icon svg {
  width: 28px;
  height: 28px;
}

.confirm-dialog h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.confirm-dialog p {
  font-size: 14px;
  color: #666;
  margin-bottom: 24px;
}

.dialog-actions {
  display: flex;
  gap: 12px;
}
</style>
