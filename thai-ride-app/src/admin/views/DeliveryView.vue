<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useAdminAPI } from "../composables/useAdminAPI";
import { useAdminUIStore } from "../stores/adminUI.store";
import { useAdminRealtime } from "../composables/useAdminRealtime";
import type { Order, OrderFilters, OrderStatus } from "../types";

const api = useAdminAPI();
const uiStore = useAdminUIStore();
const realtime = useAdminRealtime();

const deliveries = ref<Order[]>([]);
const totalDeliveries = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const totalPages = ref(0);
const searchQuery = ref("");
const statusFilter = ref("");
const selectedDelivery = ref<Order | null>(null);
const showDetailModal = ref(false);

const filters = computed<OrderFilters>(() => ({
  search: searchQuery.value || undefined,
  status: (statusFilter.value as OrderStatus) || undefined,
}));

async function loadDeliveries() {
  const result = await api.getDeliveries(filters.value, {
    page: currentPage.value,
    limit: pageSize.value,
  });
  deliveries.value = result.data;
  totalDeliveries.value = result.total;
  totalPages.value = result.totalPages;
}

function viewDelivery(delivery: Order) {
  selectedDelivery.value = delivery;
  showDetailModal.value = true;
}
function formatDate(date: string) {
  return new Date(date).toLocaleDateString("th-TH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function formatTime(date: Date) {
  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(amount);
}
function getStatusColor(s: string) {
  return (
    {
      pending: "#F59E0B",
      matched: "#3B82F6",
      in_progress: "#8B5CF6",
      completed: "#10B981",
      cancelled: "#EF4444",
    }[s] || "#6B7280"
  );
}
function getStatusLabel(s: string) {
  return (
    {
      pending: "รอรับ",
      matched: "จับคู่แล้ว",
      in_progress: "กำลังส่ง",
      completed: "ส่งแล้ว",
      cancelled: "ยกเลิก",
    }[s] || s
  );
}

watch([searchQuery, statusFilter], () => {
  currentPage.value = 1;
  loadDeliveries();
});
watch(currentPage, loadDeliveries);

onMounted(() => {
  uiStore.setBreadcrumbs([{ label: "Delivery" }]);
  loadDeliveries();

  // Setup realtime for delivery_requests
  realtime.subscribe({
    tables: ["delivery_requests"],
    onChange: (table, eventType) => {
      console.log(`[DeliveryView] Realtime: ${table} ${eventType}`);
      loadDeliveries();
      uiStore.showInfo(
        `${realtime.getEventLabel(eventType)} - ${realtime.getTableLabel(
          table
        )}`
      );
    },
    debounceMs: 300,
  });
});

onUnmounted(() => {
  realtime.unsubscribe();
});
</script>

<template>
  <div class="delivery-view">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">Delivery</h1>
        <span class="total-count">{{ totalDeliveries }} รายการ</span>
        <span
          class="realtime-indicator"
          :class="{ connected: realtime.isConnected.value }"
        >
          <span class="pulse-dot"></span>
          {{ realtime.isConnected.value ? "Live" : "..." }}
        </span>
      </div>
      <div class="header-right">
        <span v-if="realtime.lastUpdate.value" class="last-update">
          {{ formatTime(realtime.lastUpdate.value) }}
        </span>
        <button
          class="refresh-btn"
          @click="loadDeliveries"
          :disabled="api.isLoading.value"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            :class="{ spinning: api.isLoading.value }"
          >
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path
              d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"
            />
          </svg>
        </button>
      </div>
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
        :class="{ active: statusFilter === '' }"
        @click="statusFilter = ''"
      >
        ทั้งหมด
      </button>
      <button
        class="status-tab"
        :class="{ active: statusFilter === 'pending' }"
        @click="statusFilter = 'pending'"
      >
        รอรับ
      </button>
      <button
        class="status-tab"
        :class="{ active: statusFilter === 'matched' }"
        @click="statusFilter = 'matched'"
      >
        จับคู่แล้ว
      </button>
      <button
        class="status-tab"
        :class="{ active: statusFilter === 'in_progress' }"
        @click="statusFilter = 'in_progress'"
      >
        กำลังส่ง
      </button>
      <button
        class="status-tab"
        :class="{ active: statusFilter === 'completed' }"
        @click="statusFilter = 'completed'"
      >
        ส่งแล้ว
      </button>
      <button
        class="status-tab"
        :class="{ active: statusFilter === 'cancelled' }"
        @click="statusFilter = 'cancelled'"
      >
        ยกเลิก
      </button>
    </div>

    <div class="table-container">
      <table v-if="deliveries.length > 0" class="data-table">
        <thead>
          <tr>
            <th>Tracking ID</th>
            <th>ลูกค้า</th>
            <th>ผู้ส่ง</th>
            <th>จุดรับ</th>
            <th>จุดส่ง</th>
            <th>สถานะ</th>
            <th>ยอดเงิน</th>
            <th>วันที่</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="delivery in deliveries"
            :key="delivery.id"
            @click="viewDelivery(delivery)"
          >
            <td>
              <code class="tracking-id">{{ delivery.tracking_id }}</code>
            </td>
            <td>{{ delivery.customer_name || "-" }}</td>
            <td>{{ delivery.provider_name || "-" }}</td>
            <td class="address">{{ delivery.pickup_address || "-" }}</td>
            <td class="address">{{ delivery.dropoff_address || "-" }}</td>
            <td>
              <span
                class="status-badge"
                :style="{
                  color: getStatusColor(delivery.status),
                  background: getStatusColor(delivery.status) + '20',
                }"
                >{{ getStatusLabel(delivery.status) }}</span
              >
            </td>
            <td class="amount">{{ formatCurrency(delivery.total_amount) }}</td>
            <td class="date">{{ formatDate(delivery.created_at) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state"><p>ไม่พบรายการส่งของ</p></div>
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
.delivery-view {
  max-width: 1400px;
  margin: 0 auto;
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
.header-right {
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
.realtime-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #fef3c7;
  color: #92400e;
  font-size: 11px;
  font-weight: 500;
  border-radius: 12px;
}
.realtime-indicator.connected {
  background: #d1fae5;
  color: #065f46;
}
.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
  animation: pulse 2s infinite;
}
.realtime-indicator.connected .pulse-dot {
  background: #10b981;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
.last-update {
  font-size: 12px;
  color: #6b7280;
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
.refresh-btn:hover {
  border-color: #00a86b;
  color: #00a86b;
}
.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.refresh-btn svg.spinning {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
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
  background: #00a86b;
  color: #fff;
  border-color: #00a86b;
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
.data-table tbody tr {
  cursor: pointer;
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
.address {
  font-size: 13px;
  color: #6b7280;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}
.amount {
  font-weight: 600;
  color: #059669;
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
