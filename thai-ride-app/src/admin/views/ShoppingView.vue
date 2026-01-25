<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useAdminAPI } from "../composables/useAdminAPI";
import { useAdminUIStore } from "../stores/adminUI.store";
import { useAdminRealtime } from "../composables/useAdminRealtime";
import { useServiceActions } from "../composables/useServiceActions";
import ServiceDetailModal from "../components/common/ServiceDetailModal.vue";
import StatusUpdateModal from "../components/common/StatusUpdateModal.vue";
import type { Order, OrderFilters, OrderStatus, ServiceType } from "../types";

const api = useAdminAPI();
const uiStore = useAdminUIStore();
const realtime = useAdminRealtime();
const {
  isUpdating,
  updateStatus,
  exportToCSV,
  getStatusOptions,
  formatDate,
  formatCurrency,
  getStatusColor,
  getStatusLabel,
} = useServiceActions();

const serviceType: ServiceType = "shopping";

const items = ref<Order[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const totalPages = ref(0);
const searchQuery = ref("");
const statusFilter = ref("");

// Modal states
const selectedItem = ref<Order | null>(null);
const showDetailModal = ref(false);
const showStatusModal = ref(false);

const filters = computed<OrderFilters>(() => ({
  search: searchQuery.value || undefined,
  status: (statusFilter.value as OrderStatus) || undefined,
}));

async function loadData() {
  const result = await api.getShopping(filters.value, {
    page: currentPage.value,
    limit: pageSize.value,
  });
  items.value = result.data;
  total.value = result.total;
  totalPages.value = result.totalPages;
}

function viewDetail(item: Order) {
  selectedItem.value = item;
  showDetailModal.value = true;
}

function openStatusModal(item: Order) {
  selectedItem.value = item;
  showStatusModal.value = true;
}

async function handleStatusUpdate(orderId: string, newStatus: string) {
  const success = await updateStatus(serviceType, orderId, newStatus);
  if (success) {
    uiStore.showSuccess("อัพเดทสถานะเรียบร้อย");
    showStatusModal.value = false;
    loadData();
  } else {
    uiStore.showError("เกิดข้อผิดพลาด");
  }
}

function handleExport() {
  exportToCSV(items.value, "shopping_report");
  uiStore.showSuccess("ดาวน์โหลดรายงานเรียบร้อย");
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

watch([searchQuery, statusFilter], () => {
  currentPage.value = 1;
  loadData();
});
watch(currentPage, loadData);

onMounted(() => {
  uiStore.setBreadcrumbs([{ label: "Shopping" }]);
  loadData();

  // Setup realtime for shopping_requests
  realtime.subscribe({
    tables: ["shopping_requests"],
    onChange: (table, eventType) => {
      console.log(`[ShoppingView] Realtime: ${table} ${eventType}`);
      loadData();
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
  <div class="shopping-view">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">Shopping</h1>
        <span class="total-count">{{ total }} รายการ</span>
        <span
          class="realtime-indicator"
          :class="{ connected: realtime.isConnected.value }"
        >
          <span class="pulse-dot"></span>
          {{ realtime.isConnected.value ? "Live" : "..." }}
        </span>
      </div>
      <div class="header-right">
        <span v-if="realtime.lastUpdate.value" class="last-update">{{
          formatTime(realtime.lastUpdate.value)
        }}</span>
        <button
          class="refresh-btn"
          :disabled="api.isLoading.value"
          @click="loadData"
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
        <button class="btn-export" @click="handleExport">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
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
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหา Tracking ID, ชื่อลูกค้า..."
          class="search-input"
        />
      </div>
      <select v-model="pageSize" class="filter-select">
        <option :value="20">20 รายการ</option>
        <option :value="50">50 รายการ</option>
        <option :value="100">100 รายการ</option>
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
        :class="{ active: statusFilter === 'shopping' }"
        @click="statusFilter = 'shopping'"
      >
        กำลังซื้อ
      </button>
      <button
        class="status-tab"
        :class="{ active: statusFilter === 'delivering' }"
        @click="statusFilter = 'delivering'"
      >
        กำลังส่ง
      </button>
      <button
        class="status-tab"
        :class="{ active: statusFilter === 'completed' }"
        @click="statusFilter = 'completed'"
      >
        เสร็จสิ้น
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
      <!-- Loading Skeleton -->
      <div v-if="api.isLoading.value" class="loading-state">
        <div v-for="i in 5" :key="i" class="skeleton-row">
          <div class="skeleton" style="width: 120px"></div>
          <div class="skeleton" style="width: 100px"></div>
          <div class="skeleton" style="width: 100px"></div>
          <div class="skeleton" style="width: 150px"></div>
          <div class="skeleton" style="width: 80px"></div>
          <div class="skeleton" style="width: 80px"></div>
        </div>
      </div>

      <!-- Data Table -->
      <table v-else-if="items.length > 0" class="data-table">
        <thead>
          <tr>
            <th>Tracking ID</th>
            <th>ลูกค้า</th>
            <th>ผู้ซื้อ</th>
            <th>ร้านค้า</th>
            <th>ที่อยู่จัดส่ง</th>
            <th>สถานะ</th>
            <th>ยอดเงิน</th>
            <th>วันที่</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.id"
            class="clickable-row"
            @click="viewDetail(item)"
          >
            <td>
              <code class="tracking-id">{{ item.tracking_id }}</code>
            </td>
            <td>
              <div class="name">{{ item.customer_name || "-" }}</div>
            </td>
            <td>
              <div class="name">{{ item.provider_name || "-" }}</div>
            </td>
            <td>
              <div class="address">{{ item.pickup_address || "-" }}</div>
            </td>
            <td>
              <div class="address">{{ item.dropoff_address || "-" }}</div>
            </td>
            <td>
              <span
                class="status-badge"
                :style="{
                  color: getStatusColor(item.status),
                  background: getStatusColor(item.status) + '20',
                }"
              >
                {{ getStatusLabel(item.status, serviceType) }}
              </span>
            </td>
            <td class="amount">{{ formatCurrency(item.total_amount) }}</td>
            <td class="date">{{ formatDate(item.created_at) }}</td>
            <td @click.stop>
              <button
                class="action-btn"
                title="เปลี่ยนสถานะ"
                @click="openStatusModal(item)"
              >
                <svg
                  width="16"
                  height="16"
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
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9CA3AF"
          stroke-width="1.5"
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path
            d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"
          />
        </svg>
        <p>ไม่พบรายการซื้อของ</p>
      </div>
    </div>

    <!-- Pagination -->
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
      </button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button
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
    <ServiceDetailModal
      :order="selectedItem"
      :service-type="serviceType"
      :show="showDetailModal"
      @close="showDetailModal = false"
    />

    <!-- Status Update Modal -->
    <StatusUpdateModal
      :order="selectedItem"
      :service-type="serviceType"
      :show="showStatusModal"
      :status-options="getStatusOptions(serviceType)"
      :is-updating="isUpdating"
      @close="showStatusModal = false"
      @update="handleStatusUpdate"
    />
  </div>
</template>

<style scoped>
.shopping-view {
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

.btn-export {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-export:hover {
  background: #f9fafb;
  border-color: #00a86b;
  color: #00a86b;
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
  transition: all 0.2s;
}
.status-tab:hover {
  background: #f9fafb;
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

.loading-state {
  padding: 20px;
}
.skeleton-row {
  display: flex;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid #f3f4f6;
}
.skeleton {
  height: 20px;
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
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
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  text-transform: uppercase;
}
.data-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f3f4f6;
}
.data-table tbody tr {
  transition: background 0.15s;
}
.data-table tbody tr:hover {
  background: #f9fafb;
}
.clickable-row {
  cursor: pointer;
}

.tracking-id {
  font-family: monospace;
  font-size: 13px;
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 4px;
  font-weight: 600;
}
.name {
  font-size: 14px;
  color: #1f2937;
}
.address {
  font-size: 13px;
  color: #6b7280;
  max-width: 180px;
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

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}
.action-btn:hover {
  background: #f3f4f6;
  color: #00a86b;
  border-color: #00a86b;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #9ca3af;
}
.empty-state p {
  margin-top: 12px;
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
}
.page-btn:hover:not(:disabled) {
  background: #f9fafb;
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
