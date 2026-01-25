<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useAdminAPI } from "../composables/useAdminAPI";
import { useAdminUIStore } from "../stores/adminUI.store";
import { useAdminAuthStore } from "../stores/adminAuth.store";
import type { ServiceType } from "../types";

const api = useAdminAPI();
const uiStore = useAdminUIStore();
const authStore = useAdminAuthStore();

const cancellations = ref<any[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const totalPages = ref(0);
const searchQuery = ref("");
const serviceTypeFilter = ref<ServiceType | "">("");
const isLoading = ref(false);
const isInitialized = ref(false);

async function loadData() {
  // Wait for auth to be ready
  if (!authStore.isAuthenticated) {
    console.log("[CancellationsView] Auth not ready, waiting...");
    return;
  }

  isLoading.value = true;
  try {
    console.log("[CancellationsView] Loading cancellations data...");
    const result = await api.getCancellations(
      serviceTypeFilter.value || undefined,
      { page: currentPage.value, limit: pageSize.value }
    );
    cancellations.value = result.data;
    total.value = result.total;
    totalPages.value = result.totalPages;
    console.log(
      "[CancellationsView] Loaded",
      result.data.length,
      "cancellations"
    );
  } catch (err) {
    console.error("[CancellationsView] Error loading data:", err);
  } finally {
    isLoading.value = false;
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("th-TH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(amount);
}
function getServiceTypeColor(s: string) {
  return (
    {
      ride: "#3B82F6",
      delivery: "#8B5CF6",
      shopping: "#F59E0B",
      queue: "#10B981",
      moving: "#EF4444",
      laundry: "#6366F1",
    }[s] || "#6B7280"
  );
}
function getServiceTypeLabel(s: string) {
  return (
    {
      ride: "Ride",
      delivery: "Delivery",
      shopping: "Shopping",
      queue: "Queue",
      moving: "Moving",
      laundry: "Laundry",
    }[s] || s
  );
}
function getCancelledByLabel(by: string) {
  return (
    {
      customer: "ลูกค้า",
      provider: "ผู้ให้บริการ",
      admin: "Admin",
      system: "ระบบ",
    }[by] || by
  );
}
function getRefundStatusColor(s: string) {
  return (
    {
      pending: "#F59E0B",
      processing: "#3B82F6",
      completed: "#10B981",
      failed: "#EF4444",
    }[s] || "#6B7280"
  );
}
function getRefundStatusLabel(s: string) {
  return (
    {
      pending: "รอคืนเงิน",
      processing: "กำลังคืนเงิน",
      completed: "คืนเงินแล้ว",
      failed: "ล้มเหลว",
    }[s] || s
  );
}

// Watch for auth state changes - load data when authenticated
watch(
  () => authStore.isAuthenticated,
  (authenticated) => {
    if (
      authenticated &&
      isInitialized.value &&
      cancellations.value.length === 0
    ) {
      console.log(
        "[CancellationsView] Auth state changed to authenticated, loading data..."
      );
      loadData();
    }
  },
  { immediate: true }
);

watch([searchQuery, serviceTypeFilter], () => {
  currentPage.value = 1;
  if (authStore.isAuthenticated) {
    loadData();
  }
});
watch(currentPage, () => {
  if (authStore.isAuthenticated) {
    loadData();
  }
});

onMounted(async () => {
  uiStore.setBreadcrumbs([{ label: "Cancellations" }]);
  isInitialized.value = true;

  // If already authenticated, load immediately
  if (authStore.isAuthenticated) {
    console.log("[CancellationsView] Already authenticated, loading data...");
    loadData();
  } else {
    console.log("[CancellationsView] Waiting for auth to be ready...");
    // The watch will trigger loadData when auth becomes ready
  }
});
</script>

<template>
  <div class="cancellations-view">
    <div class="page-header">
      <h1 class="page-title">Cancellations</h1>
      <span class="total-count">{{ total }} รายการ</span>
    </div>

    <div class="filters-bar">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหา..."
          class="search-input"
        />
      </div>
      <select v-model="pageSize" class="filter-select">
        <option :value="20">20 รายการ</option>
        <option :value="50">50 รายการ</option>
      </select>
    </div>

    <div class="status-tabs">
      <button
        class="status-tab"
        :class="{ active: serviceTypeFilter === '' }"
        @click="serviceTypeFilter = ''"
      >
        ทั้งหมด
      </button>
      <button
        class="status-tab"
        :class="{ active: serviceTypeFilter === 'ride' }"
        @click="serviceTypeFilter = 'ride'"
      >
        Ride
      </button>
      <button
        class="status-tab"
        :class="{ active: serviceTypeFilter === 'delivery' }"
        @click="serviceTypeFilter = 'delivery'"
      >
        Delivery
      </button>
      <button
        class="status-tab"
        :class="{ active: serviceTypeFilter === 'shopping' }"
        @click="serviceTypeFilter = 'shopping'"
      >
        Shopping
      </button>
      <button
        class="status-tab"
        :class="{ active: serviceTypeFilter === 'queue' }"
        @click="serviceTypeFilter = 'queue'"
      >
        Queue
      </button>
      <button
        class="status-tab"
        :class="{ active: serviceTypeFilter === 'moving' }"
        @click="serviceTypeFilter = 'moving'"
      >
        Moving
      </button>
      <button
        class="status-tab"
        :class="{ active: serviceTypeFilter === 'laundry' }"
        @click="serviceTypeFilter = 'laundry'"
      >
        Laundry
      </button>
    </div>

    <div class="table-container">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>กำลังโหลดข้อมูล...</p>
      </div>
      <table v-else-if="cancellations.length > 0" class="data-table">
        <thead>
          <tr>
            <th>Tracking ID</th>
            <th>บริการ</th>
            <th>ลูกค้า</th>
            <th>ผู้ให้บริการ</th>
            <th>ยกเลิกโดย</th>
            <th>เหตุผล</th>
            <th>ยอดเงิน</th>
            <th>คืนเงิน</th>
            <th>วันที่</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in cancellations" :key="item.id">
            <td>
              <code class="tracking-id">{{ item.tracking_id }}</code>
            </td>
            <td>
              <span
                class="service-badge"
                :style="{
                  color: getServiceTypeColor(item.service_type),
                  background: getServiceTypeColor(item.service_type) + '20',
                }"
              >{{ getServiceTypeLabel(item.service_type) }}</span>
            </td>
            <td>{{ item.user_name || "-" }}</td>
            <td>{{ item.provider_name || "-" }}</td>
            <td>
              <span class="cancelled-by">{{
                getCancelledByLabel(item.cancelled_by)
              }}</span>
            </td>
            <td class="reason">{{ item.cancel_reason || "-" }}</td>
            <td class="amount">{{ formatCurrency(item.amount) }}</td>
            <td>
              <div class="refund-info">
                <div class="refund-amount">
                  {{ formatCurrency(item.refund_amount || 0) }}
                </div>
                <span
                  v-if="item.refund_status"
                  class="refund-status"
                  :style="{
                    color: getRefundStatusColor(item.refund_status),
                    background: getRefundStatusColor(item.refund_status) + '20',
                  }"
                >{{ getRefundStatusLabel(item.refund_status) }}</span>
              </div>
            </td>
            <td class="date">{{ formatDate(item.cancelled_at) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state"><p>ไม่พบรายการยกเลิก</p></div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button
        class="page-btn"
        :disabled="currentPage === 1"
        @click="currentPage--"
      >
        ←
      </button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button
        class="page-btn"
        :disabled="currentPage === totalPages"
        @click="currentPage++"
      >
        →
      </button>
    </div>
  </div>
</template>

<style scoped>
.cancellations-view {
  max-width: 1600px;
  margin: 0 auto;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}
.total-count {
  padding: 4px 12px;
  background: #fee2e2;
  color: #ef4444;
  font-size: 13px;
  font-weight: 500;
  border-radius: 16px;
}
.filters-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}
.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
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
}
.status-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.status-tab {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
}
.status-tab.active {
  background: #ef4444;
  color: #fff;
  border-color: #ef4444;
}
.table-container {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
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
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}
.data-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f3f4f6;
}
.data-table tbody tr:hover {
  background: #f9fafb;
}
.tracking-id {
  font-family: monospace;
  font-size: 13px;
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 4px;
  font-weight: 600;
}
.service-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}
.cancelled-by {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}
.reason {
  font-size: 13px;
  color: #6b7280;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.amount {
  font-weight: 600;
  color: #6b7280;
}
.refund-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.refund-amount {
  font-weight: 600;
  color: #059669;
  font-size: 14px;
}
.refund-status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}
.date {
  font-size: 13px;
  color: #6b7280;
}
.empty-state {
  padding: 60px;
  text-align: center;
  color: #9ca3af;
}
.loading-state {
  padding: 60px;
  text-align: center;
  color: #6b7280;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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
</style>
