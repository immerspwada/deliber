<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useAdminAPI } from "../composables/useAdminAPI";
import { useAdminUIStore } from "../stores/adminUI.store";
import type { Order, OrderFilters, OrderStatus } from "../types";

const api = useAdminAPI();
const uiStore = useAdminUIStore();

const orders = ref<Order[]>([]);
const totalOrders = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const totalPages = ref(0);
const searchQuery = ref("");
const statusFilter = ref("");
const selectedOrder = ref<Order | null>(null);
const showDetailModal = ref(false);
const showStatusModal = ref(false);
const newStatus = ref<OrderStatus>("pending");

const filters = computed<OrderFilters>(() => ({
  search: searchQuery.value || undefined,
  status: (statusFilter.value as OrderStatus) || undefined,
  sortBy: "created_at",
  sortOrder: "desc",
}));

async function loadOrders() {
  console.log("[OrdersView] loadOrders called with filters:", filters.value);
  console.log("[OrdersView] pagination:", {
    page: currentPage.value,
    limit: pageSize.value,
  });

  const result = await api.getOrders(filters.value, {
    page: currentPage.value,
    limit: pageSize.value,
  });

  console.log("[OrdersView] API result:", {
    dataLength: result.data.length,
    total: result.total,
    totalPages: result.totalPages,
    firstItem: result.data[0],
  });

  orders.value = result.data;
  totalOrders.value = result.total;
  totalPages.value = result.totalPages;
}

function viewOrder(order: Order) {
  selectedOrder.value = order;
  showDetailModal.value = true;
}
function openStatusModal(order: Order) {
  selectedOrder.value = order;
  newStatus.value = order.status;
  showStatusModal.value = true;
}

async function updateStatus() {
  if (!selectedOrder.value) return;
  const success = await api.updateOrderStatus(
    selectedOrder.value.id,
    newStatus.value
  );
  if (success) {
    uiStore.showSuccess("อัพเดทสถานะเรียบร้อย");
    showStatusModal.value = false;
    loadOrders();
  } else {
    uiStore.showError("เกิดข้อผิดพลาด");
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
      in_progress: "กำลังดำเนินการ",
      completed: "เสร็จสิ้น",
      cancelled: "ยกเลิก",
    }[s] || s
  );
}
function getPaymentLabel(m: string) {
  return { cash: "เงินสด", wallet: "Wallet", card: "บัตร" }[m] || m;
}

watch([searchQuery, statusFilter], () => {
  currentPage.value = 1;
  loadOrders();
});
watch(currentPage, loadOrders);
onMounted(() => {
  uiStore.setBreadcrumbs([{ label: "Orders" }, { label: "ออเดอร์ทั้งหมด" }]);
  loadOrders();
});
</script>

<template>
  <div class="orders-view">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">ออเดอร์</h1>
        <span class="total-count"
          >{{ totalOrders.toLocaleString() }} รายการ</span
        >
      </div>
      <button
        class="refresh-btn"
        @click="loadOrders"
        :disabled="api.isLoading.value"
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
          placeholder="ค้นหา Tracking ID..."
          class="search-input"
        />
      </div>
      <select v-model="statusFilter" class="filter-select">
        <option value="">ทุกสถานะ</option>
        <option value="pending">รอรับ</option>
        <option value="matched">จับคู่แล้ว</option>
        <option value="in_progress">กำลังดำเนินการ</option>
        <option value="completed">เสร็จสิ้น</option>
        <option value="cancelled">ยกเลิก</option>
      </select>
    </div>

    <div class="table-container">
      <div v-if="api.isLoading.value" class="loading-state">
        <div class="skeleton" v-for="i in 10" :key="i" />
      </div>
      <table v-else-if="orders.length > 0" class="data-table">
        <thead>
          <tr>
            <th>Tracking ID</th>
            <th>ลูกค้า</th>
            <th>ผู้ให้บริการ</th>
            <th>สถานะ</th>
            <th>ยอดเงิน</th>
            <th>ชำระ</th>
            <th>วันที่</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id" @click="viewOrder(order)">
            <td>
              <code class="tracking-id">{{ order.tracking_id }}</code>
            </td>
            <td>
              <div class="name">{{ order.customer_name || "-" }}</div>
            </td>
            <td>
              <div class="name">{{ order.provider_name || "-" }}</div>
            </td>
            <td>
              <span
                class="status-badge"
                :style="{
                  color: getStatusColor(order.status),
                  background: getStatusColor(order.status) + '20',
                }"
                >{{ getStatusLabel(order.status) }}</span
              >
            </td>
            <td class="amount">{{ formatCurrency(order.total_amount) }}</td>
            <td>
              <span class="payment-badge">{{
                getPaymentLabel(order.payment_method)
              }}</span>
            </td>
            <td class="date">{{ formatDate(order.created_at) }}</td>
            <td>
              <button class="action-btn" @click.stop="viewOrder(order)">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state"><p>ไม่พบออเดอร์</p></div>
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

    <div
      v-if="showDetailModal && selectedOrder"
      class="modal-overlay"
      @click.self="showDetailModal = false"
    >
      <div class="modal">
        <div class="modal-header">
          <h2>รายละเอียดออเดอร์</h2>
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
          <div class="order-header">
            <code class="tracking-id lg">{{ selectedOrder.tracking_id }}</code
            ><span
              class="status-badge lg"
              :style="{
                color: getStatusColor(selectedOrder.status),
                background: getStatusColor(selectedOrder.status) + '20',
              }"
              >{{ getStatusLabel(selectedOrder.status) }}</span
            >
          </div>
          <div class="detail-grid">
            <div class="detail-item">
              <label>จุดรับ</label
              ><span>{{ selectedOrder.pickup_address || "-" }}</span>
            </div>
            <div class="detail-item">
              <label>จุดส่ง</label
              ><span>{{ selectedOrder.dropoff_address || "-" }}</span>
            </div>
            <div class="detail-item">
              <label>ลูกค้า</label
              ><span>{{ selectedOrder.customer_name || "-" }}</span>
            </div>
            <div class="detail-item">
              <label>ผู้ให้บริการ</label
              ><span>{{ selectedOrder.provider_name || "-" }}</span>
            </div>
            <div class="detail-item">
              <label>ยอดเงิน</label
              ><span class="amount">{{
                formatCurrency(selectedOrder.total_amount)
              }}</span>
            </div>
            <div class="detail-item">
              <label>วิธีชำระ</label
              ><span>{{ getPaymentLabel(selectedOrder.payment_method) }}</span>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showDetailModal = false">
              ปิด</button
            ><button
              class="btn btn-primary"
              @click="openStatusModal(selectedOrder)"
            >
              เปลี่ยนสถานะ
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showStatusModal"
      class="modal-overlay"
      @click.self="showStatusModal = false"
    >
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2>เปลี่ยนสถานะ</h2>
          <button class="close-btn" @click="showStatusModal = false">
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
          <div class="form-group">
            <label>สถานะใหม่</label
            ><select v-model="newStatus" class="form-select">
              <option value="pending">รอรับ</option>
              <option value="matched">จับคู่แล้ว</option>
              <option value="in_progress">กำลังดำเนินการ</option>
              <option value="completed">เสร็จสิ้น</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showStatusModal = false">
              ยกเลิก</button
            ><button class="btn btn-primary" @click="updateStatus">
              บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.orders-view {
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
.tracking-id {
  font-family: monospace;
  font-size: 13px;
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 4px;
  font-weight: 600;
}
.tracking-id.lg {
  font-size: 16px;
  padding: 6px 12px;
}
.name {
  font-size: 14px;
  color: #1f2937;
}
.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}
.status-badge.lg {
  font-size: 14px;
  padding: 6px 14px;
}
.amount {
  font-weight: 600;
  color: #059669;
}
.payment-badge {
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 12px;
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
}
.modal.modal-sm {
  max-width: 400px;
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
}
.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-item label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
}
.detail-item span {
  font-size: 14px;
  color: #1f2937;
}
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.btn-primary {
  background: #00a86b;
  color: #fff;
}
.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}
.form-select {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
}
</style>
