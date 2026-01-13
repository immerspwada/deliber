<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useAdminAPI } from "../composables/useAdminAPI";
import { useAdminUIStore } from "../stores/adminUI.store";
import { useAdminRealtime } from "../composables/useAdminRealtime";
import { useDebounceFn } from "@vueuse/core";
import type { Order, OrderFilters, OrderStatus } from "../types";

const api = useAdminAPI();
const uiStore = useAdminUIStore();
const realtime = useAdminRealtime();

// Enhanced state management
const orders = ref<Order[]>([]);
const totalOrders = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const totalPages = ref(0);
const searchQuery = ref("");
const statusFilter = ref("");
const serviceTypeFilter = ref("");
const dateFromFilter = ref("");
const dateToFilter = ref("");
const sortBy = ref("created_at");
const sortOrder = ref("desc");
const selectedOrder = ref<Order | null>(null);
const selectedOrders = ref<Set<string>>(new Set());
const showDetailModal = ref(false);
const showStatusModal = ref(false);
const showBulkModal = ref(false);
const showAnalyticsModal = ref(false);
const newStatus = ref<OrderStatus>("pending");
const bulkStatus = ref<OrderStatus>("pending");
const bulkReason = ref("");
const loadError = ref<string | null>(null);
const analytics = ref<any>(null);
const isLoadingAnalytics = ref(false);

// Performance optimizations
const isVirtualScrollEnabled = ref(false);
const viewMode = ref<'table' | 'cards'>('table');
const autoRefresh = ref(false);
const refreshInterval = ref<NodeJS.Timeout | null>(null);

// Enhanced computed properties
const filters = computed<OrderFilters>(() => ({
  search: searchQuery.value || undefined,
  status: (statusFilter.value as OrderStatus) || undefined,
  service_type: serviceTypeFilter.value || undefined,
  date_from: dateFromFilter.value || undefined,
  date_to: dateToFilter.value || undefined,
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
}));

const hasActiveFilters = computed(() => 
  searchQuery.value || statusFilter.value || serviceTypeFilter.value || 
  dateFromFilter.value || dateToFilter.value
);

const selectedOrdersCount = computed(() => selectedOrders.value.size);

const canBulkUpdate = computed(() => selectedOrdersCount.value > 0);

const priorityOrders = computed(() => 
  orders.value.filter(order => 
    order.priority === 'urgent' || order.priority === 'high_value'
  )
);

const statusOptions = [
  { value: '', label: 'ทุกสถานะ' },
  { value: 'pending', label: 'รอรับ' },
  { value: 'matched', label: 'จับคู่แล้ว' },
  { value: 'in_progress', label: 'กำลังดำเนินการ' },
  { value: 'completed', label: 'เสร็จสิ้น' },
  { value: 'cancelled', label: 'ยกเลิก' },
];

const serviceTypeOptions = [
  { value: '', label: 'ทุกบริการ' },
  { value: 'ride', label: 'เรียกรถ' },
  { value: 'delivery', label: 'จัดส่ง' },
  { value: 'shopping', label: 'ช้อปปิ้ง' },
  { value: 'queue', label: 'จองคิว' },
  { value: 'moving', label: 'ขนย้าย' },
  { value: 'laundry', label: 'ซักรีด' },
];

const sortOptions = [
  { value: 'created_at', label: 'วันที่สร้าง' },
  { value: 'amount', label: 'ยอดเงิน' },
  { value: 'user_name', label: 'ชื่อลูกค้า' },
  { value: 'provider_name', label: 'ผู้ให้บริการ' },
  { value: 'distance', label: 'ระยะทาง' },
  { value: 'rating', label: 'คะแนน' },
];

// Enhanced API functions
async function loadOrders() {
  console.log("[OrdersView] loadOrders called with filters:", filters.value);
  console.log("[OrdersView] pagination:", {
    page: currentPage.value,
    limit: pageSize.value,
  });

  loadError.value = null;

  try {
    // Use enhanced RPC function with new parameters
    const result = await api.getOrdersEnhanced(filters.value, {
      page: currentPage.value,
      limit: pageSize.value,
    });

    console.log("[OrdersView] API result:", {
      dataLength: result.data.length,
      total: result.total,
      totalPages: result.totalPages,
      firstItem: result.data[0],
    });

    if (api.error.value) {
      loadError.value = api.error.value;
      console.error("[OrdersView] API error:", api.error.value);
    }

    orders.value = result.data;
    totalOrders.value = result.total;
    totalPages.value = result.totalPages;

    // Auto-enable virtual scroll for large datasets
    isVirtualScrollEnabled.value = result.total > 100;
  } catch (err) {
    loadError.value =
      err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล";
    console.error("[OrdersView] loadOrders error:", err);
  }
}

async function loadAnalytics() {
  isLoadingAnalytics.value = true;
  try {
    analytics.value = await api.getOrdersAnalytics({
      date_from: dateFromFilter.value,
      date_to: dateToFilter.value,
    });
  } catch (err) {
    console.error("[OrdersView] loadAnalytics error:", err);
  } finally {
    isLoadingAnalytics.value = false;
  }
}

// Debounced search
const debouncedLoadOrders = useDebounceFn(loadOrders, 300);

function viewOrder(order: Order) {
  selectedOrder.value = order;
  showDetailModal.value = true;
}

function openStatusModal(order: Order) {
  selectedOrder.value = order;
  newStatus.value = order.status;
  showStatusModal.value = true;
}

function openBulkModal() {
  if (selectedOrdersCount.value === 0) return;
  showBulkModal.value = true;
}

function openAnalyticsModal() {
  loadAnalytics();
  showAnalyticsModal.value = true;
}

async function updateStatus() {
  if (!selectedOrder.value) return;
  
  const success = await api.updateOrderStatus(
    selectedOrder.value.id,
    newStatus.value,
    { serviceType: selectedOrder.value.service_type as any }
  );
  
  if (success) {
    uiStore.showSuccess("อัพเดทสถานะเรียบร้อย");
    showStatusModal.value = false;
    loadOrders();
  } else {
    uiStore.showError("เกิดข้อผิดพลาด");
  }
}

async function bulkUpdateStatus() {
  if (selectedOrdersCount.value === 0) return;
  
  const orderIds = Array.from(selectedOrders.value);
  const serviceType = orders.value.find(o => selectedOrders.value.has(o.id))?.service_type;
  
  if (!serviceType) {
    uiStore.showError("ไม่สามารถระบุประเภทบริการได้");
    return;
  }
  
  const success = await api.bulkUpdateOrdersStatus(
    serviceType,
    orderIds,
    bulkStatus.value,
    bulkReason.value
  );
  
  if (success) {
    uiStore.showSuccess(`อัพเดทสถานะ ${selectedOrdersCount.value} รายการเรียบร้อย`);
    selectedOrders.value.clear();
    showBulkModal.value = false;
    loadOrders();
  } else {
    uiStore.showError("เกิดข้อผิดพลาดในการอัพเดท");
  }
}

function toggleOrderSelection(orderId: string) {
  if (selectedOrders.value.has(orderId)) {
    selectedOrders.value.delete(orderId);
  } else {
    selectedOrders.value.add(orderId);
  }
}

function selectAllOrders() {
  if (selectedOrdersCount.value === orders.value.length) {
    selectedOrders.value.clear();
  } else {
    orders.value.forEach(order => selectedOrders.value.add(order.id));
  }
}

function clearFilters() {
  searchQuery.value = "";
  statusFilter.value = "";
  serviceTypeFilter.value = "";
  dateFromFilter.value = "";
  dateToFilter.value = "";
  sortBy.value = "created_at";
  sortOrder.value = "desc";
  currentPage.value = 1;
}

function exportOrders() {
  // TODO: Implement CSV export
  uiStore.showInfo("ฟีเจอร์ Export กำลังพัฒนา");
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value;
  
  if (autoRefresh.value) {
    refreshInterval.value = setInterval(loadOrders, 30000); // Refresh every 30 seconds
    uiStore.showSuccess("เปิดการรีเฟรชอัตโนมัติแล้ว (30 วินาที)");
  } else {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value);
      refreshInterval.value = null;
    }
    uiStore.showInfo("ปิดการรีเฟรชอัตโนมัติแล้ว");
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

function formatDistance(km: number | null) {
  if (!km) return "-";
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

function getStatusColor(s: string) {
  return (
    {
      pending: "#F59E0B",
      matched: "#3B82F6",
      in_progress: "#8B5CF6",
      shopping: "#8B5CF6",
      delivering: "#8B5CF6",
      completed: "#10B981",
      delivered: "#10B981",
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
      shopping: "กำลังช้อป",
      delivering: "กำลังจัดส่ง",
      completed: "เสร็จสิ้น",
      delivered: "จัดส่งแล้ว",
      cancelled: "ยกเลิก",
    }[s] || s
  );
}

function getPriorityColor(priority: string) {
  return (
    {
      urgent: "#EF4444",
      high_value: "#F59E0B",
      scheduled: "#3B82F6",
      normal: "#6B7280",
    }[priority] || "#6B7280"
  );
}

function getPriorityLabel(priority: string) {
  return (
    {
      urgent: "ด่วน",
      high_value: "มูลค่าสูง",
      scheduled: "จองล่วงหน้า",
      normal: "ปกติ",
    }[priority] || priority
  );
}

function getServiceTypeLabel(type: string) {
  return (
    {
      ride: "เรียกรถ",
      delivery: "จัดส่ง",
      shopping: "ช้อปปิ้ง",
      queue: "จองคิว",
      moving: "ขนย้าย",
      laundry: "ซักรีด",
    }[type] || type
  );
}

function getServiceTypeIcon(type: string) {
  return (
    {
      ride: "🚗",
      delivery: "📦",
      shopping: "🛒",
      queue: "⏰",
      moving: "🚚",
      laundry: "👕",
    }[type] || "📋"
  );
}

function getPaymentLabel(m: string) {
  return { cash: "เงินสด", wallet: "Wallet", card: "บัตร" }[m] || m;
}

// Enhanced watchers
watch([searchQuery], () => {
  currentPage.value = 1;
  debouncedLoadOrders();
});

watch([statusFilter, serviceTypeFilter, dateFromFilter, dateToFilter, sortBy, sortOrder], () => {
  currentPage.value = 1;
  loadOrders();
});

watch(currentPage, loadOrders);

onMounted(() => {
  uiStore.setBreadcrumbs([{ label: "Orders" }, { label: "ออเดอร์ทั้งหมด" }]);
  loadOrders();

  // Setup realtime subscriptions for all order tables
  realtime.subscribeToOrders((table, eventType, _payload) => {
    console.log(`[OrdersView] Realtime update: ${table} ${eventType}`);
    loadOrders();
    uiStore.showInfo(
      `${realtime.getEventLabel(eventType)} - ${realtime.getTableLabel(table)}`
    );
  });
});

onUnmounted(() => {
  realtime.unsubscribe();
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
});

// Helper function for pagination
function getVisiblePages() {
  const pages = [];
  const maxVisible = 5;
  const half = Math.floor(maxVisible / 2);
  
  let start = Math.max(1, currentPage.value - half);
  let end = Math.min(totalPages.value, start + maxVisible - 1);
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  return pages;
}
</script>

<template>
  <div class="orders-view">
    <!-- Enhanced Header -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">ออเดอร์</h1>
        <span class="total-count">{{ totalOrders.toLocaleString() }} รายการ</span>
        <span v-if="priorityOrders.length > 0" class="priority-count">
          {{ priorityOrders.length }} ด่วน
        </span>
        <span
          class="realtime-indicator"
          :class="{ connected: realtime.isConnected.value }"
          :title="
            realtime.isConnected.value
              ? 'Realtime เชื่อมต่อแล้ว'
              : 'กำลังเชื่อมต่อ...'
          "
        >
          <span class="pulse-dot"></span>
          {{ realtime.isConnected.value ? "Live" : "Connecting..." }}
        </span>
      </div>
      <div class="header-right">
        <span v-if="realtime.lastUpdate.value" class="last-update">
          อัพเดทล่าสุด: {{ formatTime(realtime.lastUpdate.value) }}
        </span>
        
        <!-- Action Buttons -->
        <div class="action-buttons">
          <button
            class="action-btn"
            @click="openAnalyticsModal"
            title="ดูสถิติ"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 3v18h18" />
              <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
            </svg>
          </button>
          
          <button
            class="action-btn"
            @click="exportOrders"
            title="Export CSV"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7,10 12,15 17,10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          
          <button
            class="action-btn"
            :class="{ active: autoRefresh }"
            @click="toggleAutoRefresh"
            :title="autoRefresh ? 'ปิดรีเฟรชอัตโนมัติ' : 'เปิดรีเฟรชอัตโนมัติ'"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
          
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
              :class="{ spinning: api.isLoading.value }"
            >
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Enhanced Filters Bar -->
    <div class="filters-section">
      <div class="filters-bar">
        <div class="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหา Tracking ID, ชื่อลูกค้า, ผู้ให้บริการ..."
            class="search-input"
          />
        </div>
        
        <select v-model="serviceTypeFilter" class="filter-select">
          <option v-for="option in serviceTypeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        
        <select v-model="statusFilter" class="filter-select">
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        
        <input
          v-model="dateFromFilter"
          type="date"
          class="filter-input"
          placeholder="จากวันที่"
        />
        
        <input
          v-model="dateToFilter"
          type="date"
          class="filter-input"
          placeholder="ถึงวันที่"
        />
        
        <div class="sort-controls">
          <select v-model="sortBy" class="filter-select">
            <option v-for="option in sortOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <button
            class="sort-order-btn"
            @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
            :title="sortOrder === 'asc' ? 'เรียงจากน้อยไปมาก' : 'เรียงจากมากไปน้อย'"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path v-if="sortOrder === 'asc'" d="M7 14l5-5 5 5" />
              <path v-else d="M7 10l5 5 5-5" />
            </svg>
          </button>
        </div>
      </div>
      
      <div class="filters-actions">
        <button
          v-if="hasActiveFilters"
          class="clear-filters-btn"
          @click="clearFilters"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
          ล้างตัวกรอง
        </button>
        
        <div class="view-controls">
          <button
            class="view-btn"
            :class="{ active: viewMode === 'table' }"
            @click="viewMode = 'table'"
            title="มุมมองตาราง"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <button
            class="view-btn"
            :class="{ active: viewMode === 'cards' }"
            @click="viewMode = 'cards'"
            title="มุมมองการ์ด"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Actions Bar -->
    <div v-if="selectedOrdersCount > 0" class="bulk-actions-bar">
      <div class="bulk-info">
        <span>เลือกแล้ว {{ selectedOrdersCount }} รายการ</span>
      </div>
      <div class="bulk-actions">
        <button class="bulk-btn" @click="openBulkModal">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          เปลี่ยนสถานะ
        </button>
        <button class="bulk-btn secondary" @click="selectedOrders.clear()">
          ยกเลิกการเลือก
        </button>
      </div>
    </div>

    <!-- Enhanced Table Container -->
    <div class="table-container">
      <!-- Error State -->
      <div v-if="loadError" class="error-state">
        <div class="error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3>เกิดข้อผิดพลาด</h3>
        <p class="error-message">{{ loadError }}</p>
        <p class="error-hint">
          กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูลหรือติดต่อผู้ดูแลระบบ
        </p>
        <button class="btn btn-primary" @click="loadOrders">ลองใหม่</button>
      </div>

      <!-- Loading State -->
      <div v-else-if="api.isLoading.value" class="loading-state">
        <div class="skeleton" v-for="i in 10" :key="i" />
      </div>

      <!-- Table View -->
      <div v-else-if="viewMode === 'table' && orders.length > 0" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th class="checkbox-col">
                <input
                  type="checkbox"
                  :checked="selectedOrdersCount === orders.length && orders.length > 0"
                  :indeterminate="selectedOrdersCount > 0 && selectedOrdersCount < orders.length"
                  @change="selectAllOrders"
                  class="checkbox"
                />
              </th>
              <th>บริการ</th>
              <th>Tracking ID</th>
              <th>ลูกค้า</th>
              <th>ผู้ให้บริการ</th>
              <th>สถานะ</th>
              <th>ยอดเงิน</th>
              <th>ระยะทาง</th>
              <th>ชำระ</th>
              <th>วันที่</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="order in orders" 
              :key="order.id" 
              @click="viewOrder(order)"
              :class="{ 
                selected: selectedOrders.has(order.id),
                priority: order.priority === 'urgent' || order.priority === 'high_value'
              }"
            >
              <td class="checkbox-col" @click.stop>
                <input
                  type="checkbox"
                  :checked="selectedOrders.has(order.id)"
                  @change="toggleOrderSelection(order.id)"
                  class="checkbox"
                />
              </td>
              <td>
                <div class="service-type">
                  <span class="service-icon">{{ getServiceTypeIcon(order.service_type) }}</span>
                  <span class="service-label">{{ getServiceTypeLabel(order.service_type) }}</span>
                </div>
              </td>
              <td>
                <div class="tracking-info">
                  <code class="tracking-id">{{ order.tracking_id }}</code>
                  <span 
                    v-if="order.priority !== 'normal'" 
                    class="priority-badge"
                    :style="{ color: getPriorityColor(order.priority) }"
                  >
                    {{ getPriorityLabel(order.priority) }}
                  </span>
                </div>
              </td>
              <td>
                <div class="user-info">
                  <div class="name">{{ order.customer_name || "-" }}</div>
                  <div v-if="order.customer_phone" class="phone">{{ order.customer_phone }}</div>
                </div>
              </td>
              <td>
                <div class="provider-info">
                  <div class="name">{{ order.provider_name || "ยังไม่มี" }}</div>
                  <div v-if="order.provider_rating" class="rating">
                    ⭐ {{ order.provider_rating.toFixed(1) }}
                  </div>
                </div>
              </td>
              <td>
                <span
                  class="status-badge"
                  :style="{
                    color: getStatusColor(order.status),
                    background: getStatusColor(order.status) + '20',
                  }"
                >
                  {{ getStatusLabel(order.status) }}
                </span>
              </td>
              <td class="amount">
                <div class="amount-info">
                  <div class="final-amount">{{ formatCurrency(order.final_amount || order.estimated_amount || 0) }}</div>
                  <div v-if="order.promo_discount" class="discount">
                    -{{ formatCurrency(order.promo_discount) }}
                  </div>
                </div>
              </td>
              <td class="distance">{{ formatDistance(order.distance_km) }}</td>
              <td>
                <span class="payment-badge">{{ getPaymentLabel(order.payment_method || 'cash') }}</span>
              </td>
              <td class="date">{{ formatDate(order.created_at) }}</td>
              <td>
                <div class="action-buttons">
                  <button class="action-btn" @click.stop="viewOrder(order)" title="ดูรายละเอียด">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button class="action-btn" @click.stop="openStatusModal(order)" title="เปลี่ยนสถานะ">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Cards View -->
      <div v-else-if="viewMode === 'cards' && orders.length > 0" class="cards-grid">
        <div 
          v-for="order in orders" 
          :key="order.id" 
          class="order-card"
          :class="{ 
            selected: selectedOrders.has(order.id),
            priority: order.priority === 'urgent' || order.priority === 'high_value'
          }"
          @click="viewOrder(order)"
        >
          <div class="card-header">
            <div class="card-checkbox" @click.stop>
              <input
                type="checkbox"
                :checked="selectedOrders.has(order.id)"
                @change="toggleOrderSelection(order.id)"
                class="checkbox"
              />
            </div>
            <div class="service-info">
              <span class="service-icon">{{ getServiceTypeIcon(order.service_type) }}</span>
              <span class="service-label">{{ getServiceTypeLabel(order.service_type) }}</span>
            </div>
            <span
              class="status-badge"
              :style="{
                color: getStatusColor(order.status),
                background: getStatusColor(order.status) + '20',
              }"
            >
              {{ getStatusLabel(order.status) }}
            </span>
          </div>
          
          <div class="card-body">
            <div class="tracking-info">
              <code class="tracking-id">{{ order.tracking_id }}</code>
              <span 
                v-if="order.priority !== 'normal'" 
                class="priority-badge"
                :style="{ color: getPriorityColor(order.priority) }"
              >
                {{ getPriorityLabel(order.priority) }}
              </span>
            </div>
            
            <div class="participants">
              <div class="customer">
                <strong>ลูกค้า:</strong> {{ order.customer_name || "-" }}
              </div>
              <div class="provider">
                <strong>ผู้ให้บริการ:</strong> {{ order.provider_name || "ยังไม่มี" }}
              </div>
            </div>
            
            <div class="locations">
              <div class="pickup">
                <strong>จุดรับ:</strong> {{ order.pickup_address || "-" }}
              </div>
              <div class="dropoff">
                <strong>จุดส่ง:</strong> {{ order.dropoff_address || "-" }}
              </div>
            </div>
          </div>
          
          <div class="card-footer">
            <div class="amount">{{ formatCurrency(order.final_amount || order.estimated_amount || 0) }}</div>
            <div class="date">{{ formatDate(order.created_at) }}</div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="orders.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4m6-6h4a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-4m-6 0V9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z" />
          </svg>
        </div>
        <h3>ไม่พบออเดอร์</h3>
        <p>{{ hasActiveFilters ? 'ลองเปลี่ยนเงื่อนไขการค้นหา' : 'ยังไม่มีออเดอร์ในระบบ' }}</p>
        <button v-if="hasActiveFilters" class="btn btn-secondary" @click="clearFilters">
          ล้างตัวกรอง
        </button>
      </div>
    </div>

    <!-- Enhanced Detail Modal -->
    <div
      v-if="showDetailModal && selectedOrder"
      class="modal-overlay"
      @click.self="showDetailModal = false"
    >
      <div class="modal modal-lg">
        <div class="modal-header">
          <div class="modal-title-section">
            <h2>รายละเอียดออเดอร์</h2>
            <div class="order-meta">
              <span class="service-type">{{ getServiceTypeIcon(selectedOrder.service_type) }} {{ getServiceTypeLabel(selectedOrder.service_type) }}</span>
              <span 
                v-if="selectedOrder.priority !== 'normal'" 
                class="priority-badge"
                :style="{ color: getPriorityColor(selectedOrder.priority) }"
              >
                {{ getPriorityLabel(selectedOrder.priority) }}
              </span>
            </div>
          </div>
          <button class="close-btn" @click="showDetailModal = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="order-header">
            <code class="tracking-id lg">{{ selectedOrder.tracking_id }}</code>
            <span
              class="status-badge lg"
              :style="{
                color: getStatusColor(selectedOrder.status),
                background: getStatusColor(selectedOrder.status) + '20',
              }"
            >
              {{ getStatusLabel(selectedOrder.status) }}
            </span>
          </div>
          
          <div class="detail-sections">
            <!-- Participants Section -->
            <div class="detail-section">
              <h3>ผู้เกี่ยวข้อง</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <label>ลูกค้า</label>
                  <div class="participant-info">
                    <span class="name">{{ selectedOrder.customer_name || "-" }}</span>
                    <span v-if="selectedOrder.customer_phone" class="contact">{{ selectedOrder.customer_phone }}</span>
                    <span v-if="selectedOrder.customer_email" class="contact">{{ selectedOrder.customer_email }}</span>
                  </div>
                </div>
                <div class="detail-item">
                  <label>ผู้ให้บริการ</label>
                  <div class="participant-info">
                    <span class="name">{{ selectedOrder.provider_name || "ยังไม่มี" }}</span>
                    <span v-if="selectedOrder.provider_phone" class="contact">{{ selectedOrder.provider_phone }}</span>
                    <div v-if="selectedOrder.provider_rating" class="rating">
                      ⭐ {{ selectedOrder.provider_rating.toFixed(1) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Location Section -->
            <div class="detail-section">
              <h3>สถานที่</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <label>จุดรับ</label>
                  <span>{{ selectedOrder.pickup_address || "-" }}</span>
                </div>
                <div class="detail-item">
                  <label>จุดส่ง</label>
                  <span>{{ selectedOrder.dropoff_address || "-" }}</span>
                </div>
                <div v-if="selectedOrder.distance_km" class="detail-item">
                  <label>ระยะทาง</label>
                  <span>{{ formatDistance(selectedOrder.distance_km) }}</span>
                </div>
              </div>
            </div>

            <!-- Financial Section -->
            <div class="detail-section">
              <h3>การเงิน</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <label>ยอดเงิน</label>
                  <div class="amount-breakdown">
                    <div class="final-amount">{{ formatCurrency(selectedOrder.final_amount || selectedOrder.estimated_amount || 0) }}</div>
                    <div v-if="selectedOrder.estimated_amount && selectedOrder.final_amount !== selectedOrder.estimated_amount" class="estimated">
                      (ประเมิน: {{ formatCurrency(selectedOrder.estimated_amount) }})
                    </div>
                  </div>
                </div>
                <div class="detail-item">
                  <label>วิธีชำระ</label>
                  <span>{{ getPaymentLabel(selectedOrder.payment_method || 'cash') }}</span>
                </div>
                <div v-if="selectedOrder.promo_code" class="detail-item">
                  <label>โปรโมชั่น</label>
                  <div class="promo-info">
                    <span class="promo-code">{{ selectedOrder.promo_code }}</span>
                    <span class="discount">-{{ formatCurrency(selectedOrder.promo_discount || 0) }}</span>
                  </div>
                </div>
                <div class="detail-item">
                  <label>สถานะการชำระ</label>
                  <span class="payment-status">{{ selectedOrder.payment_status || 'รอชำระ' }}</span>
                </div>
              </div>
            </div>

            <!-- Timeline Section -->
            <div class="detail-section">
              <h3>ไทม์ไลน์</h3>
              <div class="timeline">
                <div class="timeline-item completed">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <div class="timeline-title">สร้างออเดอร์</div>
                    <div class="timeline-time">{{ formatDate(selectedOrder.created_at) }}</div>
                  </div>
                </div>
                <div v-if="selectedOrder.matched_at" class="timeline-item completed">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <div class="timeline-title">จับคู่ผู้ให้บริการ</div>
                    <div class="timeline-time">{{ formatDate(selectedOrder.matched_at) }}</div>
                  </div>
                </div>
                <div v-if="selectedOrder.started_at" class="timeline-item completed">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <div class="timeline-title">เริ่มให้บริการ</div>
                    <div class="timeline-time">{{ formatDate(selectedOrder.started_at) }}</div>
                  </div>
                </div>
                <div v-if="selectedOrder.completed_at" class="timeline-item completed">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <div class="timeline-title">เสร็จสิ้น</div>
                    <div class="timeline-time">{{ formatDate(selectedOrder.completed_at) }}</div>
                  </div>
                </div>
                <div v-if="selectedOrder.cancelled_at" class="timeline-item cancelled">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <div class="timeline-title">ยกเลิก</div>
                    <div class="timeline-time">{{ formatDate(selectedOrder.cancelled_at) }}</div>
                    <div v-if="selectedOrder.cancel_reason" class="timeline-reason">{{ selectedOrder.cancel_reason }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Notes Section -->
            <div v-if="selectedOrder.special_notes" class="detail-section">
              <h3>หมายเหตุ</h3>
              <div class="notes-content">{{ selectedOrder.special_notes }}</div>
            </div>
          </div>
          
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showDetailModal = false">ปิด</button>
            <button class="btn btn-primary" @click="openStatusModal(selectedOrder)">เปลี่ยนสถานะ</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Enhanced Status Modal -->
    <div
      v-if="showStatusModal"
      class="modal-overlay"
      @click.self="showStatusModal = false"
    >
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2>เปลี่ยนสถานะ</h2>
          <button class="close-btn" @click="showStatusModal = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="current-status">
            <label>สถานะปัจจุบัน</label>
            <span
              class="status-badge"
              :style="{
                color: getStatusColor(selectedOrder?.status || ''),
                background: getStatusColor(selectedOrder?.status || '') + '20',
              }"
            >
              {{ getStatusLabel(selectedOrder?.status || '') }}
            </span>
          </div>
          
          <div class="form-group">
            <label>สถานะใหม่</label>
            <select v-model="newStatus" class="form-select">
              <option v-for="option in statusOptions.slice(1)" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showStatusModal = false">ยกเลิก</button>
            <button class="btn btn-primary" @click="updateStatus" :disabled="api.isLoading.value">
              {{ api.isLoading.value ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Bulk Update Modal -->
    <div
      v-if="showBulkModal"
      class="modal-overlay"
      @click.self="showBulkModal = false"
    >
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2>เปลี่ยนสถานะหลายรายการ</h2>
          <button class="close-btn" @click="showBulkModal = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="bulk-info">
            <p>จะเปลี่ยนสถานะของ <strong>{{ selectedOrdersCount }}</strong> รายการ</p>
          </div>
          
          <div class="form-group">
            <label>สถานะใหม่</label>
            <select v-model="bulkStatus" class="form-select">
              <option v-for="option in statusOptions.slice(1)" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          
          <div v-if="bulkStatus === 'cancelled'" class="form-group">
            <label>เหตุผลในการยกเลิก</label>
            <textarea
              v-model="bulkReason"
              class="form-textarea"
              placeholder="ระบุเหตุผล..."
              rows="3"
            ></textarea>
          </div>
          
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showBulkModal = false">ยกเลิก</button>
            <button class="btn btn-primary" @click="bulkUpdateStatus" :disabled="api.isLoading.value">
              {{ api.isLoading.value ? 'กำลังอัพเดท...' : 'อัพเดท' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Analytics Modal -->
    <div
      v-if="showAnalyticsModal"
      class="modal-overlay"
      @click.self="showAnalyticsModal = false"
    >
      <div class="modal modal-xl">
        <div class="modal-header">
          <h2>สถิติออเดอร์</h2>
          <button class="close-btn" @click="showAnalyticsModal = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div v-if="isLoadingAnalytics" class="loading-state">
            <div class="skeleton" v-for="i in 3" :key="i" />
          </div>
          <div v-else-if="analytics" class="analytics-content">
            <!-- Summary Stats -->
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">{{ analytics.summary.total_orders.toLocaleString() }}</div>
                <div class="stat-label">ออเดอร์ทั้งหมด</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ analytics.summary.total_completed.toLocaleString() }}</div>
                <div class="stat-label">เสร็จสิ้น</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ analytics.summary.completion_rate }}%</div>
                <div class="stat-label">อัตราสำเร็จ</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ formatCurrency(analytics.summary.total_revenue) }}</div>
                <div class="stat-label">รายได้รวม</div>
              </div>
            </div>
            
            <!-- Service Breakdown -->
            <div class="analytics-section">
              <h3>แยกตามประเภทบริการ</h3>
              <div class="service-stats">
                <div v-for="service in analytics.by_service" :key="service.service_type" class="service-stat">
                  <div class="service-header">
                    <span class="service-icon">{{ getServiceTypeIcon(service.service_type) }}</span>
                    <span class="service-name">{{ getServiceTypeLabel(service.service_type) }}</span>
                  </div>
                  <div class="service-metrics">
                    <div class="metric">
                      <span class="metric-value">{{ service.total_orders }}</span>
                      <span class="metric-label">ออเดอร์</span>
                    </div>
                    <div class="metric">
                      <span class="metric-value">{{ formatCurrency(service.total_revenue) }}</span>
                      <span class="metric-label">รายได้</span>
                    </div>
                    <div class="metric">
                      <span class="metric-value">{{ formatCurrency(service.avg_order_value) }}</span>
                      <span class="metric-label">ค่าเฉลี่ย</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showAnalyticsModal = false">ปิด</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Enhanced Pagination -->
    <div v-if="totalPages > 1" class="pagination-container">
      <div class="pagination-info">
        แสดง {{ ((currentPage - 1) * pageSize) + 1 }}-{{ Math.min(currentPage * pageSize, totalOrders) }} 
        จาก {{ totalOrders.toLocaleString() }} รายการ
      </div>
      <div class="pagination">
        <button
          class="page-btn"
          :disabled="currentPage === 1"
          @click="currentPage = 1"
          title="หน้าแรก"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
          </svg>
        </button>
        <button
          class="page-btn"
          :disabled="currentPage === 1"
          @click="currentPage--"
          title="หน้าก่อนหน้า"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        
        <!-- Page Numbers -->
        <div class="page-numbers">
          <button
            v-for="page in getVisiblePages()"
            :key="page"
            class="page-number"
            :class="{ active: page === currentPage }"
            @click="currentPage = page"
          >
            {{ page }}
          </button>
        </div>
        
        <button
          class="page-btn"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
          title="หน้าถัดไป"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
        <button
          class="page-btn"
          :disabled="currentPage === totalPages"
          @click="currentPage = totalPages"
          title="หน้าสุดท้าย"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
          </svg>
        </button>
      </div>
      <div class="page-size-selector">
        <label>แสดง</label>
        <select v-model="pageSize" @change="currentPage = 1; loadOrders()">
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <label>รายการ</label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.orders-view {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 16px;
}

/* Enhanced Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 20px 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.total-count {
  padding: 6px 16px;
  background: linear-gradient(135deg, #e8f5ef, #d1fae5);
  color: #00a86b;
  font-size: 14px;
  font-weight: 600;
  border-radius: 20px;
  border: 1px solid #a7f3d0;
}

.priority-count {
  padding: 6px 16px;
  background: linear-gradient(135deg, #fee2e2, #fecaca);
  color: #dc2626;
  font-size: 14px;
  font-weight: 600;
  border-radius: 20px;
  border: 1px solid #fca5a5;
  animation: pulse-priority 2s infinite;
}

@keyframes pulse-priority {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.realtime-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #fef3c7;
  color: #92400e;
  font-size: 12px;
  font-weight: 500;
  border-radius: 16px;
  transition: all 0.3s ease;
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
  animation: pulse-green 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
  }
}

@keyframes pulse-green {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  50% {
    opacity: 0.8;
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0);
  }
}

.last-update {
  font-size: 12px;
  color: #6b7280;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn, .refresh-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.action-btn:hover, .refresh-btn:hover {
  background: #f9fafb;
  border-color: #00a86b;
  color: #00a86b;
  transform: translateY(-1px);
}

.action-btn.active {
  background: #00a86b;
  border-color: #00a86b;
  color: #fff;
}

.action-btn:disabled, .refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.refresh-btn svg.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Enhanced Filters */
.filters-section {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filters-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.search-box {
  flex: 1;
  min-width: 320px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s;
}

.search-box:focus-within {
  border-color: #00a86b;
  background: #fff;
}

.search-box svg {
  color: #9ca3af;
}

.search-input {
  flex: 1;
  padding: 14px 0;
  border: none;
  outline: none;
  font-size: 14px;
  background: transparent;
}

.filter-select, .filter-input {
  padding: 14px 16px;
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
  min-width: 140px;
  transition: all 0.2s;
}

.filter-select:focus, .filter-input:focus {
  border-color: #00a86b;
  outline: none;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-order-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.sort-order-btn:hover {
  border-color: #00a86b;
  color: #00a86b;
}

.filters-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.clear-filters-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-filters-btn:hover {
  background: #fecaca;
}

.view-controls {
  display: flex;
  gap: 4px;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 8px;
}

.view-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.view-btn.active {
  background: #fff;
  color: #00a86b;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Bulk Actions */
.bulk-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  border: 1px solid #93c5fd;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 20px;
}

.bulk-info {
  font-size: 14px;
  font-weight: 500;
  color: #1e40af;
}

.bulk-actions {
  display: flex;
  gap: 12px;
}

.bulk-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.bulk-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.bulk-btn.secondary {
  background: #6b7280;
}

.bulk-btn.secondary:hover {
  background: #4b5563;
}

/* Enhanced Table */
.table-container {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1200px;
}

.data-table th {
  padding: 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}

.data-table td {
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}

.data-table tbody tr {
  cursor: pointer;
  transition: all 0.15s;
}

.data-table tbody tr:hover {
  background: #f9fafb;
}

.data-table tbody tr.selected {
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
}

.data-table tbody tr.priority {
  border-left: 4px solid #ef4444;
}

.checkbox-col {
  width: 48px;
  text-align: center;
}

.checkbox {
  width: 18px;
  height: 18px;
  accent-color: #00a86b;
  cursor: pointer;
}

.service-type {
  display: flex;
  align-items: center;
  gap: 8px;
}

.service-icon {
  font-size: 18px;
}

.service-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.tracking-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tracking-id {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 13px;
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 6px;
  font-weight: 600;
  display: inline-block;
}

.tracking-id.lg {
  font-size: 16px;
  padding: 8px 12px;
}

.priority-badge {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.user-info, .provider-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.phone {
  font-size: 12px;
  color: #6b7280;
}

.rating {
  font-size: 12px;
  color: #f59e0b;
}

.status-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.lg {
  font-size: 14px;
  padding: 8px 16px;
}

.amount-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.final-amount {
  font-weight: 600;
  color: #059669;
  font-size: 14px;
}

.discount {
  font-size: 12px;
  color: #dc2626;
}

.distance {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.payment-badge {
  padding: 4px 10px;
  background: #f3f4f6;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.date {
  font-size: 13px;
  color: #6b7280;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.action-buttons .action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

/* Cards View */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  padding: 20px;
}

.order-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.order-card:hover {
  border-color: #00a86b;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.order-card.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.order-card.priority {
  border-left: 4px solid #ef4444;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-checkbox {
  margin-right: 12px;
}

.service-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.participants, .locations {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.customer, .provider, .pickup, .dropoff {
  font-size: 14px;
  color: #374151;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.amount {
  font-weight: 600;
  color: #059669;
  font-size: 16px;
}

/* Loading and Empty States */
.loading-state {
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton {
  height: 64px;
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-icon {
  color: #9ca3af;
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.empty-state p {
  color: #6b7280;
  font-size: 16px;
  margin: 0 0 20px 0;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.error-icon {
  color: #ef4444;
  margin-bottom: 20px;
}

.error-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px 0;
}

.error-message {
  color: #ef4444;
  font-size: 14px;
  margin: 0 0 16px 0;
  padding: 12px 16px;
  background: #fee2e2;
  border-radius: 8px;
  max-width: 500px;
}

.error-hint {
  color: #6b7280;
  font-size: 14px;
  margin: 0 0 24px 0;
  line-height: 1.6;
}

/* Enhanced Pagination */
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.pagination-info {
  font-size: 14px;
  color: #6b7280;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  border-color: #00a86b;
  color: #00a86b;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-number {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.page-number:hover {
  border-color: #00a86b;
  color: #00a86b;
}

.page-number.active {
  background: #00a86b;
  border-color: #00a86b;
  color: #fff;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6b7280;
}

.page-size-selector select {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
}

/* Enhanced Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.modal {
  background: #fff;
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal.modal-sm {
  max-width: 400px;
}

.modal.modal-lg {
  max-width: 800px;
}

.modal.modal-xl {
  max-width: 1200px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.modal-title-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
}

.order-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.service-type {
  font-size: 14px;
  color: #6b7280;
}

.close-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 28px;
  max-height: calc(90vh - 140px);
  overflow-y: auto;
}

.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.detail-sections {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-item label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-item span {
  font-size: 14px;
  color: #1f2937;
  line-height: 1.5;
}

.participant-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.participant-info .name {
  font-weight: 600;
}

.participant-info .contact {
  font-size: 13px;
  color: #6b7280;
}

.amount-breakdown {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.amount-breakdown .final-amount {
  font-size: 18px;
  font-weight: 700;
  color: #059669;
}

.amount-breakdown .estimated {
  font-size: 12px;
  color: #6b7280;
}

.promo-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.promo-code {
  padding: 4px 8px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.discount {
  color: #dc2626;
  font-weight: 600;
}

.payment-status {
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

/* Timeline */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  padding-left: 24px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: #e5e7eb;
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
}

.timeline-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #e5e7eb;
  border: 3px solid #fff;
  position: absolute;
  left: -24px;
  top: 2px;
  z-index: 1;
}

.timeline-item.completed .timeline-dot {
  background: #10b981;
}

.timeline-item.cancelled .timeline-dot {
  background: #ef4444;
}

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.timeline-time {
  font-size: 12px;
  color: #6b7280;
}

.timeline-reason {
  font-size: 12px;
  color: #dc2626;
  font-style: italic;
}

.notes-content {
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: #374151;
}

.current-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.current-status label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
}

.bulk-info {
  margin-bottom: 20px;
  padding: 16px;
  background: #eff6ff;
  border-radius: 8px;
  color: #1e40af;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
}

.btn-primary {
  background: #00a86b;
  color: #fff;
}

.btn-primary:hover {
  background: #059669;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.form-select, .form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-select:focus, .form-textarea:focus {
  border-color: #00a86b;
  outline: none;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

/* Analytics */
.analytics-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  padding: 20px;
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border-radius: 12px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #0369a1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 600;
}

.analytics-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.service-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.service-stat {
  padding: 20px;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.service-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.service-name {
  font-weight: 600;
  color: #1f2937;
}

.service-metrics {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.metric {
  text-align: center;
}

.metric-value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #059669;
}

.metric-label {
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .orders-view {
    padding: 0 12px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .filters-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box {
    min-width: auto;
  }
  
  .data-table {
    min-width: 800px;
  }
  
  .cards-grid {
    grid-template-columns: 1fr;
    padding: 16px;
  }
  
  .pagination-container {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
}

@media (max-width: 640px) {
  .modal {
    margin: 10px;
    max-height: calc(100vh - 20px);
  }
  
  .modal-header {
    padding: 20px;
  }
  
  .modal-body {
    padding: 20px;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .service-stats {
    grid-template-columns: 1fr;
  }
}
</style>
