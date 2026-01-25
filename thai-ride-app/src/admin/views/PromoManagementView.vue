<script setup lang="ts">
/**
 * Admin Promo Management View
 * Feature: F10 - Complete Promo System (Admin)
 *
 * Capabilities:
 * - Dashboard with stats
 * - CRUD promo codes
 * - Campaign management
 * - Analytics & reporting
 * - Realtime updates
 */
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import {
  useAdminPromos,
  type CreatePromoInput,
  type CreateCampaignInput,
} from "../composables/useAdminPromos";
import { useAdminUIStore } from "../stores/adminUI.store";
import { useAdminRealtime } from "../composables/useAdminRealtime";

const promoApi = useAdminPromos();
const uiStore = useAdminUIStore();
const realtime = useAdminRealtime();

// Tab state
const activeTab = ref<"dashboard" | "promos" | "campaigns" | "analytics">(
  "dashboard"
);

// Promo list state
const currentPage = ref(1);
const pageSize = ref(20);
const searchQuery = ref("");
const statusFilter = ref("");
const categoryFilter = ref("");

// Modal state
const showCreatePromoModal = ref(false);
const showCreateCampaignModal = ref(false);
const showPromoDetailModal = ref(false);
const selectedPromo = ref<any>(null);

// Form state
const newPromo = ref<CreatePromoInput>({
  code: "",
  description: "",
  discount_type: "fixed",
  discount_value: 50,
  min_order_amount: 0,
  category: "all",
  service_types: ["ride", "delivery", "shopping"],
  user_type: "all",
  per_user_limit: 1,
});

const newCampaign = ref<CreateCampaignInput>({
  name: "",
  description: "",
  start_date: new Date().toISOString().split("T")[0],
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0],
});

// Computed
const totalPages = computed(() =>
  Math.ceil(promoApi.totalPromos.value / pageSize.value)
);

const serviceTypeOptions = [
  { value: "ride", label: "เรียกรถ" },
  { value: "delivery", label: "ส่งของ" },
  { value: "shopping", label: "ซื้อของ" },
  { value: "queue", label: "จองคิว" },
  { value: "moving", label: "ขนย้าย" },
  { value: "laundry", label: "ซักผ้า" },
];

const categoryOptions = [
  { value: "all", label: "ทั้งหมด" },
  { value: "ride", label: "เรียกรถ" },
  { value: "delivery", label: "ส่งของ" },
  { value: "shopping", label: "ซื้อของ" },
];

const userTypeOptions = [
  { value: "all", label: "ทุกคน" },
  { value: "new", label: "ผู้ใช้ใหม่" },
  { value: "existing", label: "ผู้ใช้เดิม" },
  { value: "vip", label: "VIP" },
];

// Methods
async function loadData() {
  if (activeTab.value === "dashboard") {
    await promoApi.fetchDashboardStats();
  } else if (activeTab.value === "promos") {
    await promoApi.fetchPromos(
      {
        status: statusFilter.value || undefined,
        category: categoryFilter.value || undefined,
      },
      { page: currentPage.value, limit: pageSize.value }
    );
  } else if (activeTab.value === "campaigns") {
    await promoApi.fetchCampaigns();
  } else if (activeTab.value === "analytics") {
    await promoApi.fetchPromoAnalytics();
  }
}

async function handleCreatePromo() {
  const id = await promoApi.createPromo(newPromo.value);
  if (id) {
    showCreatePromoModal.value = false;
    resetPromoForm();
    uiStore.showSuccess("สร้างโปรโมชั่นสำเร็จ");
    loadData();
  } else {
    uiStore.showError("ไม่สามารถสร้างโปรโมชั่นได้");
  }
}

async function handleCreateCampaign() {
  const id = await promoApi.createCampaign(newCampaign.value);
  if (id) {
    showCreateCampaignModal.value = false;
    resetCampaignForm();
    uiStore.showSuccess("สร้างแคมเปญสำเร็จ");
    loadData();
  } else {
    uiStore.showError("ไม่สามารถสร้างแคมเปญได้");
  }
}

async function handleToggleStatus(id: string) {
  const success = await promoApi.togglePromoStatus(id);
  if (success) {
    uiStore.showSuccess("อัพเดทสถานะสำเร็จ");
  }
}

async function handleDeletePromo(id: string) {
  if (!confirm("ต้องการลบโปรโมชั่นนี้?")) return;
  const success = await promoApi.deletePromo(id);
  if (success) {
    uiStore.showSuccess("ลบโปรโมชั่นสำเร็จ");
    loadData();
  }
}

function viewPromoDetail(promo: any) {
  selectedPromo.value = promo;
  showPromoDetailModal.value = true;
}

function resetPromoForm() {
  newPromo.value = {
    code: "",
    description: "",
    discount_type: "fixed",
    discount_value: 50,
    min_order_amount: 0,
    category: "all",
    service_types: ["ride", "delivery", "shopping"],
    user_type: "all",
    per_user_limit: 1,
  };
}

function resetCampaignForm() {
  newCampaign.value = {
    name: "",
    description: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Watchers
watch([statusFilter, categoryFilter], () => {
  currentPage.value = 1;
  loadData();
});

watch(currentPage, loadData);
watch(activeTab, loadData);

// Lifecycle
onMounted(() => {
  uiStore.setBreadcrumbs([{ label: "Marketing" }, { label: "โปรโมชั่น" }]);
  loadData();

  realtime.subscribe({
    tables: ["promo_codes", "promo_usage_analytics"],
    onChange: () => loadData(),
    debounceMs: 500,
  });
});

onUnmounted(() => {
  realtime.unsubscribe();
});
</script>

<template>
  <div class="promo-management">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">โปรโมชั่น</h1>
        <span
          class="realtime-indicator"
          :class="{ connected: realtime.isConnected.value }"
        >
          <span class="pulse-dot"></span>
          {{ realtime.isConnected.value ? "Live" : "..." }}
        </span>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" @click="showCreateCampaignModal = true">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
          สร้างแคมเปญ
        </button>
        <button class="btn-primary" @click="showCreatePromoModal = true">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          สร้างโปรโม
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        :class="['tab', { active: activeTab === 'dashboard' }]"
        @click="activeTab = 'dashboard'"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
        Dashboard
      </button>
      <button
        :class="['tab', { active: activeTab === 'promos' }]"
        @click="activeTab = 'promos'"
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
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
        โปรโมชั่น ({{ promoApi.totalPromos.value }})
      </button>
      <button
        :class="['tab', { active: activeTab === 'campaigns' }]"
        @click="activeTab = 'campaigns'"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
        แคมเปญ
      </button>
      <button
        :class="['tab', { active: activeTab === 'analytics' }]"
        @click="activeTab = 'analytics'"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
        Analytics
      </button>
    </div>

    <!-- Dashboard Tab -->
    <div v-if="activeTab === 'dashboard'" class="dashboard-content">
      <div v-if="promoApi.loading.value" class="loading-state">
        <div class="skeleton-grid">
          <div v-for="i in 4" :key="i" class="skeleton-card"></div>
        </div>
      </div>
      <template v-else-if="promoApi.dashboardStats.value">
        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon green">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{
                promoApi.dashboardStats.value.active_promos
              }}</span>
              <span class="stat-label">โปรโมใช้งาน</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon blue">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{
                promoApi.dashboardStats.value.active_campaigns
              }}</span>
              <span class="stat-label">แคมเปญใช้งาน</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon orange">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{
                promoApi.dashboardStats.value.total_uses_today
              }}</span>
              <span class="stat-label">ใช้วันนี้</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon purple">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{
                promoApi.formatCurrency(
                  promoApi.dashboardStats.value.total_discount_today
                )
              }}</span>
              <span class="stat-label">ส่วนลดวันนี้</span>
            </div>
          </div>
        </div>

        <!-- Top Promos & Recent Usage -->
        <div class="dashboard-grid">
          <div class="dashboard-card">
            <h3>โปรโมยอดนิยม</h3>
            <div class="top-promos-list">
              <div
                v-for="promo in promoApi.dashboardStats.value.top_promos"
                :key="promo.code"
                class="top-promo-item"
              >
                <code class="promo-code">{{ promo.code }}</code>
                <span class="promo-discount">{{
                  promo.discount_type === "fixed"
                    ? "฿" + promo.discount_value
                    : promo.discount_value + "%"
                }}</span>
                <span class="promo-uses">{{ promo.used_count || 0 }} ครั้ง</span>
              </div>
              <div
                v-if="!promoApi.dashboardStats.value.top_promos?.length"
                class="empty-list"
              >
                ยังไม่มีข้อมูล
              </div>
            </div>
          </div>
          <div class="dashboard-card">
            <h3>การใช้งานล่าสุด</h3>
            <div class="recent-usage-list">
              <div
                v-for="usage in promoApi.dashboardStats.value.recent_usage"
                :key="usage.used_at"
                class="usage-item"
              >
                <div class="usage-info">
                  <code class="promo-code small">{{ usage.code }}</code>
                  <span class="user-name">{{ usage.user_name }}</span>
                </div>
                <div class="usage-meta">
                  <span class="discount-amount">-{{ promoApi.formatCurrency(usage.discount_amount) }}</span>
                  <span class="usage-time">{{
                    formatDateTime(usage.used_at)
                  }}</span>
                </div>
              </div>
              <div
                v-if="!promoApi.dashboardStats.value.recent_usage?.length"
                class="empty-list"
              >
                ยังไม่มีการใช้งาน
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Promos Tab -->
    <div v-else-if="activeTab === 'promos'" class="promos-content">
      <!-- Filters -->
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
            placeholder="ค้นหาโค้ด..."
            class="search-input"
          />
        </div>
        <select v-model="statusFilter" class="filter-select">
          <option value="">ทุกสถานะ</option>
          <option value="active">ใช้งาน</option>
          <option value="inactive">ปิด</option>
        </select>
        <select v-model="categoryFilter" class="filter-select">
          <option value="">ทุกหมวด</option>
          <option
            v-for="cat in categoryOptions"
            :key="cat.value"
            :value="cat.value"
          >
            {{ cat.label }}
          </option>
        </select>
      </div>

      <!-- Promos Table -->
      <div class="table-container">
        <div v-if="promoApi.loading.value" class="loading-state">
          <div v-for="i in 8" :key="i" class="skeleton-row"></div>
        </div>
        <table v-else-if="promoApi.promos.value.length" class="data-table">
          <thead>
            <tr>
              <th>โค้ด</th>
              <th>ส่วนลด</th>
              <th>หมวด</th>
              <th>ใช้แล้ว/จำกัด</th>
              <th>หมดอายุ</th>
              <th>สถานะ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="promo in promoApi.promos.value"
              :key="promo.id"
              @click="viewPromoDetail(promo)"
            >
              <td>
                <code class="promo-code">{{ promo.code }}</code>
                <div class="promo-desc">{{ promo.description || "-" }}</div>
              </td>
              <td class="discount-cell">
                <span class="discount-badge" :class="promo.discount_type">
                  {{
                    promo.discount_type === "fixed"
                      ? "฿" + promo.discount_value
                      : promo.discount_value + "%"
                  }}
                </span>
                <span v-if="promo.max_discount" class="max-discount">สูงสุด ฿{{ promo.max_discount }}</span>
              </td>
              <td>{{ promoApi.getCategoryLabel(promo.category || "all") }}</td>
              <td>
                <span class="usage-count">{{ promo.used_count || 0 }}</span>
                <span class="usage-limit">/ {{ promo.usage_limit || "∞" }}</span>
              </td>
              <td>
                <span
                  v-if="promo.valid_until"
                  :class="{
                    'expiring-soon':
                      new Date(promo.valid_until) <
                      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                  }"
                >
                  {{ formatDate(promo.valid_until) }}
                </span>
                <span v-else class="no-expiry">ไม่หมดอายุ</span>
              </td>
              <td>
                <button
                  class="status-toggle"
                  :class="{ active: promo.is_active }"
                  @click.stop="handleToggleStatus(promo.id)"
                >
                  {{ promo.is_active ? "ใช้งาน" : "ปิด" }}
                </button>
              </td>
              <td>
                <button
                  class="action-btn delete"
                  title="ลบ"
                  @click.stop="handleDeletePromo(promo.id)"
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
                      d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                    />
                  </svg>
                </button>
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
            <path
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <p>ไม่พบโปรโมชั่น</p>
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
    </div>

    <!-- Campaigns Tab -->
    <div v-else-if="activeTab === 'campaigns'" class="campaigns-content">
      <div class="campaigns-grid">
        <div
          v-for="campaign in promoApi.campaigns.value"
          :key="campaign.id"
          class="campaign-card"
        >
          <div class="campaign-header">
            <h3>{{ campaign.name }}</h3>
            <span
              class="campaign-status"
              :style="{
                color: promoApi.getStatusColor(campaign.status),
                background: promoApi.getStatusColor(campaign.status) + '20',
              }"
            >
              {{ campaign.status }}
            </span>
          </div>
          <p class="campaign-desc">
            {{ campaign.description || "ไม่มีคำอธิบาย" }}
          </p>
          <div class="campaign-stats">
            <div class="stat">
              <span class="label">โปรโม</span><span class="value">{{ campaign.promo_count }}</span>
            </div>
            <div class="stat">
              <span class="label">ใช้แล้ว</span><span class="value">{{ campaign.total_uses }}</span>
            </div>
            <div class="stat">
              <span class="label">งบใช้</span><span class="value">{{
                promoApi.formatCurrency(campaign.spent)
              }}</span>
            </div>
          </div>
          <div class="campaign-dates">
            {{ formatDate(campaign.start_date) }} -
            {{ formatDate(campaign.end_date) }}
          </div>
        </div>
        <div v-if="!promoApi.campaigns.value.length" class="empty-state">
          <p>ยังไม่มีแคมเปญ</p>
        </div>
      </div>
    </div>

    <!-- Analytics Tab -->
    <div v-else-if="activeTab === 'analytics'" class="analytics-content">
      <div class="analytics-chart">
        <h3>การใช้งานโปรโมชั่น (30 วันล่าสุด)</h3>
        <div v-if="promoApi.analytics.value.length" class="chart-placeholder">
          <div
            v-for="day in promoApi.analytics.value.slice(0, 14)"
            :key="day.date"
            class="chart-bar"
          >
            <div
              class="bar"
              :style="{ height: Math.min(day.total_uses * 5, 100) + '%' }"
            ></div>
            <span class="bar-label">{{ new Date(day.date).getDate() }}</span>
          </div>
        </div>
        <div v-else class="empty-chart">ยังไม่มีข้อมูล</div>
      </div>
    </div>

    <!-- Create Promo Modal -->
    <div
      v-if="showCreatePromoModal"
      class="modal-overlay"
      @click.self="showCreatePromoModal = false"
    >
      <div class="modal modal-lg">
        <div class="modal-header">
          <h2>สร้างโปรโมชั่นใหม่</h2>
          <button class="close-btn" @click="showCreatePromoModal = false">
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
          <div class="form-grid">
            <div class="form-row">
              <label>โค้ด <span class="required">*</span></label>
              <input
                v-model="newPromo.code"
                type="text"
                placeholder="SAVE50"
                class="form-input"
              />
            </div>
            <div class="form-row">
              <label>คำอธิบาย</label>
              <input
                v-model="newPromo.description"
                type="text"
                placeholder="ส่วนลด 50 บาท"
                class="form-input"
              />
            </div>
            <div class="form-row">
              <label>ประเภทส่วนลด</label>
              <select v-model="newPromo.discount_type" class="form-select">
                <option value="fixed">จำนวนเงิน (฿)</option>
                <option value="percentage">เปอร์เซ็นต์ (%)</option>
              </select>
            </div>
            <div class="form-row">
              <label>มูลค่าส่วนลด</label>
              <input
                v-model.number="newPromo.discount_value"
                type="number"
                min="0"
                class="form-input"
              />
            </div>
            <div
              v-if="newPromo.discount_type === 'percentage'"
              class="form-row"
            >
              <label>ส่วนลดสูงสุด (฿)</label>
              <input
                v-model.number="newPromo.max_discount"
                type="number"
                min="0"
                class="form-input"
              />
            </div>
            <div class="form-row">
              <label>ยอดขั้นต่ำ (฿)</label>
              <input
                v-model.number="newPromo.min_order_amount"
                type="number"
                min="0"
                class="form-input"
              />
            </div>
            <div class="form-row">
              <label>หมวดหมู่</label>
              <select v-model="newPromo.category" class="form-select">
                <option
                  v-for="cat in categoryOptions"
                  :key="cat.value"
                  :value="cat.value"
                >
                  {{ cat.label }}
                </option>
              </select>
            </div>
            <div class="form-row">
              <label>กลุ่มผู้ใช้</label>
              <select v-model="newPromo.user_type" class="form-select">
                <option
                  v-for="ut in userTypeOptions"
                  :key="ut.value"
                  :value="ut.value"
                >
                  {{ ut.label }}
                </option>
              </select>
            </div>
            <div class="form-row">
              <label>จำกัดการใช้ (ทั้งหมด)</label>
              <input
                v-model.number="newPromo.usage_limit"
                type="number"
                min="0"
                placeholder="ไม่จำกัด"
                class="form-input"
              />
            </div>
            <div class="form-row">
              <label>จำกัดต่อคน</label>
              <input
                v-model.number="newPromo.per_user_limit"
                type="number"
                min="1"
                class="form-input"
              />
            </div>
            <div class="form-row">
              <label>วันหมดอายุ</label>
              <input
                v-model="newPromo.valid_until"
                type="date"
                class="form-input"
              />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showCreatePromoModal = false">
            ยกเลิก
          </button>
          <button
            class="btn-primary"
            :disabled="promoApi.loading.value || !newPromo.code"
            @click="handleCreatePromo"
          >
            {{ promoApi.loading.value ? "กำลังสร้าง..." : "สร้างโปรโม" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Create Campaign Modal -->
    <div
      v-if="showCreateCampaignModal"
      class="modal-overlay"
      @click.self="showCreateCampaignModal = false"
    >
      <div class="modal">
        <div class="modal-header">
          <h2>สร้างแคมเปญใหม่</h2>
          <button class="close-btn" @click="showCreateCampaignModal = false">
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
          <div class="form-row">
            <label>ชื่อแคมเปญ <span class="required">*</span></label>
            <input
              v-model="newCampaign.name"
              type="text"
              placeholder="New Year Sale"
              class="form-input"
            />
          </div>
          <div class="form-row">
            <label>คำอธิบาย</label>
            <textarea
              v-model="newCampaign.description"
              rows="3"
              class="form-textarea"
            ></textarea>
          </div>
          <div class="form-row-inline">
            <div class="form-row">
              <label>วันเริ่ม</label>
              <input
                v-model="newCampaign.start_date"
                type="date"
                class="form-input"
              />
            </div>
            <div class="form-row">
              <label>วันสิ้นสุด</label>
              <input
                v-model="newCampaign.end_date"
                type="date"
                class="form-input"
              />
            </div>
          </div>
          <div class="form-row">
            <label>งบประมาณ (฿)</label>
            <input
              v-model.number="newCampaign.budget"
              type="number"
              min="0"
              class="form-input"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showCreateCampaignModal = false">
            ยกเลิก
          </button>
          <button
            class="btn-primary"
            :disabled="promoApi.loading.value || !newCampaign.name"
            @click="handleCreateCampaign"
          >
            {{ promoApi.loading.value ? "กำลังสร้าง..." : "สร้างแคมเปญ" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.promo-management {
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
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
.header-actions {
  display: flex;
  gap: 12px;
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

/* Buttons */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #00a86b;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-primary:hover {
  background: #008f5b;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.btn-secondary:hover {
  background: #e5e7eb;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  padding: 4px;
  background: #f3f4f6;
  border-radius: 12px;
}
.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
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

/* Dashboard */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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
  border: 1px solid #e5e7eb;
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
.stat-info {
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

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}
.dashboard-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #e5e7eb;
}
.dashboard-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.top-promos-list,
.recent-usage-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.top-promo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 10px;
}
.promo-code {
  font-family: monospace;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 8px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 4px;
}
.promo-code.small {
  font-size: 11px;
  padding: 2px 6px;
}
.promo-discount {
  font-weight: 600;
  color: #059669;
}
.promo-uses {
  margin-left: auto;
  font-size: 13px;
  color: #6b7280;
}

.usage-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f9fafb;
  border-radius: 10px;
}
.usage-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-name {
  font-size: 13px;
  color: #374151;
}
.usage-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.discount-amount {
  font-weight: 600;
  color: #dc2626;
}
.usage-time {
  font-size: 11px;
  color: #9ca3af;
}
.empty-list {
  padding: 20px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}

/* Filters */
.filters-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}
.search-box {
  flex: 1;
  max-width: 300px;
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

/* Table */
.table-container {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
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
  position: relative;
}
.data-table tr {
  cursor: pointer;
  transition: background 0.2s;
}
.data-table tr:hover {
  background: #f9fafb;
}
.promo-desc {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.discount-cell {
  display: block;
  position: relative;
}
.discount-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
  position: static;
}
.discount-badge.fixed {
  background: #d1fae5;
  color: #059669;
}
.discount-badge.percentage {
  background: #dbeafe;
  color: #2563eb;
}
.max-discount {
  font-size: 11px;
  color: #9ca3af;
}
.usage-count {
  font-weight: 600;
  color: #1f2937;
}
.usage-limit {
  color: #9ca3af;
}
.expiring-soon {
  color: #dc2626;
  font-weight: 500;
}
.no-expiry {
  color: #9ca3af;
  font-style: italic;
}
.status-toggle {
  padding: 6px 12px;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  background: #fee2e2;
  color: #dc2626;
}
.status-toggle.active {
  background: #d1fae5;
  color: #059669;
}
.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #9ca3af;
}
.action-btn:hover {
  background: #f3f4f6;
}
.action-btn.delete:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* Campaigns */
.campaigns-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.campaign-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #e5e7eb;
}
.campaign-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.campaign-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}
.campaign-status {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}
.campaign-desc {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 16px;
}
.campaign-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}
.campaign-stats .stat {
  display: flex;
  flex-direction: column;
}
.campaign-stats .label {
  font-size: 11px;
  color: #9ca3af;
}
.campaign-stats .value {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}
.campaign-dates {
  font-size: 12px;
  color: #6b7280;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

/* Analytics */
.analytics-chart {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #e5e7eb;
}
.analytics-chart h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
}
.chart-placeholder {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 200px;
  padding: 20px 0;
}
.chart-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.chart-bar .bar {
  width: 100%;
  background: linear-gradient(180deg, #00a86b 0%, #00c77b 100%);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
}
.chart-bar .bar-label {
  font-size: 11px;
  color: #9ca3af;
}
.empty-chart {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}

/* Modal */
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
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
}
.modal.modal-lg {
  max-width: 600px;
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
.close-btn:hover {
  background: #f3f4f6;
}
.modal-body {
  padding: 24px;
}
.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
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

/* Form */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-row label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}
.form-row .required {
  color: #dc2626;
}
.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
}
.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #00a86b;
}
.form-row-inline {
  display: flex;
  gap: 16px;
}
.form-row-inline .form-row {
  flex: 1;
}

/* Loading & Empty */
.loading-state {
  padding: 20px;
}
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.skeleton-card {
  height: 100px;
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 16px;
}
.skeleton-row {
  height: 56px;
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
  margin-bottom: 8px;
}
@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #9ca3af;
}
.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
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

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .campaigns-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  .campaigns-grid {
    grid-template-columns: 1fr;
  }
  .tabs {
    flex-wrap: wrap;
  }
  .filters-bar {
    flex-direction: column;
  }
  .search-box {
    max-width: none;
  }
}
</style>
