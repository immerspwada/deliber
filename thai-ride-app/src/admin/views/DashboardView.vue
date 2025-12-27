<!--
  Admin V2 Dashboard View
  ======================
  Main dashboard with real-time analytics
-->

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useAdminAPI } from "../composables/useAdminAPI";

const {
  getDashboardStats,
  getOrders,
  getVerificationQueue,
  getRealtimeOrderStats,
  getRealtimeServiceBreakdown,
  getLiveProviderStats,
  getRevenueTrends,
  isLoading: apiLoading,
} = useAdminAPI();

// Stats
const stats = ref({
  totalOrders: 0,
  totalRevenue: 0,
  totalUsers: 0,
  totalProviders: 0,
  activeProviders: 0,
  pendingProviders: 0,
});

// Real-time stats
const realtimeStats = ref({
  today_orders: 0,
  today_completed: 0,
  today_cancelled: 0,
  today_revenue: 0,
  active_rides: 0,
  online_providers: 0,
  hourly_orders: [] as any[],
});

const serviceBreakdown = ref<any>({});
const providerStats = ref<any>({});
const revenueTrends = ref<any[]>([]);

const recentOrders = ref<any[]>([]);
const pendingProviders = ref<any[]>([]);
const isLoading = ref(true);
const lastUpdated = ref<Date | null>(null);
let refreshInterval: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  console.log("[Dashboard] Component mounted, starting data load...");
  await loadDashboardData();
  // Auto-refresh every 30 seconds
  refreshInterval = setInterval(loadRealtimeData, 30000);
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

const loadDashboardData = async () => {
  isLoading.value = true;

  try {
    console.log("[Dashboard] Loading dashboard data...");

    // Load all data in parallel
    const [
      dashboardStats,
      ordersResult,
      providers,
      realtime,
      services,
      provStats,
      trends,
    ] = await Promise.all([
      getDashboardStats(),
      getOrders({}, { page: 1, limit: 5 }),
      getVerificationQueue(),
      getRealtimeOrderStats(),
      getRealtimeServiceBreakdown(),
      getLiveProviderStats(),
      getRevenueTrends(),
    ]);

    console.log("[Dashboard] Data loaded:", {
      dashboardStats,
      ordersCount: ordersResult.data.length,
      providersCount: providers.length,
      realtime,
      services,
      provStats,
    });

    stats.value = {
      totalOrders: dashboardStats.totalOrders,
      totalRevenue: dashboardStats.todayRevenue,
      totalUsers: dashboardStats.totalCustomers,
      totalProviders: dashboardStats.totalProviders,
      activeProviders: dashboardStats.activeProviders,
      pendingProviders: dashboardStats.pendingProviders,
    };

    recentOrders.value = ordersResult.data;
    pendingProviders.value = providers.slice(0, 5);
    realtimeStats.value = realtime;
    serviceBreakdown.value = services;
    providerStats.value = provStats;
    revenueTrends.value = trends || [];
    lastUpdated.value = new Date();
  } catch (error) {
    console.error("[Dashboard] Error loading dashboard:", error);
  } finally {
    isLoading.value = false;
  }
};

const loadRealtimeData = async () => {
  try {
    const [realtime, services, provStats] = await Promise.all([
      getRealtimeOrderStats(),
      getRealtimeServiceBreakdown(),
      getLiveProviderStats(),
    ]);

    realtimeStats.value = realtime;
    serviceBreakdown.value = services;
    providerStats.value = provStats;
    lastUpdated.value = new Date();
  } catch (error) {
    console.error("Error refreshing realtime data:", error);
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
  }).format(amount);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: "รอดำเนินการ",
    matched: "จับคู่แล้ว",
    in_progress: "กำลังดำเนินการ",
    completed: "เสร็จสิ้น",
    cancelled: "ยกเลิก",
  };
  return labels[status] || status;
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getServiceIcon = (service: string) => {
  const icons: Record<string, string> = {
    rides: "🚗",
    deliveries: "📦",
    shopping: "🛒",
    queue: "🎫",
    moving: "🚚",
    laundry: "👕",
  };
  return icons[service] || "📋";
};

const getServiceLabel = (service: string) => {
  const labels: Record<string, string> = {
    rides: "เรียกรถ",
    deliveries: "ส่งของ",
    shopping: "ซื้อของ",
    queue: "จองคิว",
    moving: "ขนย้าย",
    laundry: "ซักผ้า",
  };
  return labels[service] || service;
};
</script>

<template>
  <div class="dashboard">
    <div class="page-header">
      <h1 class="page-title">Dashboard</h1>
      <div v-if="lastUpdated" class="last-updated">
        <span class="pulse-dot"></span>
        อัพเดทล่าสุด: {{ formatTime(lastUpdated) }}
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading">
      <div class="spinner" />
      <span>กำลังโหลดข้อมูล...</span>
    </div>

    <!-- Dashboard Content -->
    <div v-else class="dashboard-content">
      <!-- Real-time Stats Cards -->
      <div class="realtime-section">
        <h2 class="section-title">
          <span class="live-indicator"></span>
          สถิติวันนี้ (Real-time)
        </h2>
        <div class="stats-grid">
          <div class="stat-card highlight">
            <div class="stat-icon active">
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
              <div class="stat-label">ออเดอร์กำลังดำเนินการ</div>
              <div class="stat-value live">
                {{ realtimeStats.active_rides }}
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon orders">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
                />
                <rect x="9" y="3" width="6" height="4" rx="1" />
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-label">ออเดอร์วันนี้</div>
              <div class="stat-value">{{ realtimeStats.today_orders }}</div>
              <div class="stat-sub">
                <span class="success"
                  >{{ realtimeStats.today_completed }} สำเร็จ</span
                >
                <span class="danger"
                  >{{ realtimeStats.today_cancelled }} ยกเลิก</span
                >
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon revenue">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
                />
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-label">รายได้วันนี้</div>
              <div class="stat-value">
                {{ formatCurrency(realtimeStats.today_revenue) }}
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon providers">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-label">ผู้ให้บริการออนไลน์</div>
              <div class="stat-value online">
                {{ realtimeStats.online_providers }}
              </div>
              <div class="stat-sub">
                <span>จาก {{ providerStats.total_providers || 0 }} คน</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Service Breakdown -->
      <div class="service-breakdown">
        <h2 class="section-title">สถิติตามบริการ (วันนี้)</h2>
        <div class="service-grid">
          <div
            v-for="(data, service) in serviceBreakdown"
            :key="service"
            class="service-card"
          >
            <div class="service-header">
              <span class="service-icon">{{ getServiceIcon(service) }}</span>
              <span class="service-name">{{ getServiceLabel(service) }}</span>
            </div>
            <div class="service-stats">
              <div class="service-stat">
                <span class="label">ทั้งหมด</span>
                <span class="value">{{ data?.total || 0 }}</span>
              </div>
              <div class="service-stat">
                <span class="label">กำลังดำเนินการ</span>
                <span class="value active">{{ data?.active || 0 }}</span>
              </div>
              <div class="service-stat">
                <span class="label">สำเร็จ</span>
                <span class="value success">{{ data?.completed || 0 }}</span>
              </div>
              <div class="service-stat">
                <span class="label">รายได้</span>
                <span class="value revenue">{{
                  formatCurrency(data?.revenue || 0)
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Overview Stats -->
      <div class="overview-section">
        <h2 class="section-title">ภาพรวมระบบ</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon orders">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
                />
                <rect x="9" y="3" width="6" height="4" rx="1" />
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-label">ออเดอร์ทั้งหมด</div>
              <div class="stat-value">
                {{ stats.totalOrders.toLocaleString() }}
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon revenue">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
                />
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-label">รายได้ทั้งหมด</div>
              <div class="stat-value">
                {{ formatCurrency(stats.totalRevenue) }}
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon users">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-label">ผู้ใช้ทั้งหมด</div>
              <div class="stat-value">
                {{ stats.totalUsers.toLocaleString() }}
              </div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon providers">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-label">ผู้ให้บริการ</div>
              <div class="stat-value">
                {{ stats.totalProviders.toLocaleString() }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Orders & Pending Providers -->
      <div class="content-grid">
        <!-- Recent Orders -->
        <div class="card">
          <h2 class="card-title">ออเดอร์ล่าสุด</h2>
          <div v-if="recentOrders.length === 0" class="empty-state">
            ไม่มีออเดอร์
          </div>
          <div v-else class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Tracking ID</th>
                  <th>สถานะ</th>
                  <th>วันที่</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in recentOrders" :key="order.id">
                  <td>{{ order.tracking_id }}</td>
                  <td>
                    <span class="status-badge" :class="order.status">
                      {{ order.status }}
                    </span>
                  </td>
                  <td>{{ formatDate(order.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pending Providers -->
        <div class="card">
          <h2 class="card-title">
            ผู้ให้บริการรอตรวจสอบ
            <span
              v-if="providerStats.pending_verification"
              class="badge warning"
            >
              {{ providerStats.pending_verification }}
            </span>
          </h2>
          <div v-if="pendingProviders.length === 0" class="empty-state">
            ไม่มีรายการรอตรวจสอบ
          </div>
          <div v-else class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Provider UID</th>
                  <th>ประเภท</th>
                  <th>วันที่สมัคร</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="provider in pendingProviders" :key="provider.id">
                  <td>{{ provider.provider_uid }}</td>
                  <td>{{ provider.provider_type }}</td>
                  <td>{{ formatDate(provider.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.last-updated {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #00a86b;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
  color: #6b7280;
}

.spinner {
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

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.live-indicator {
  width: 10px;
  height: 10px;
  background: #00a86b;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.stat-card.highlight {
  background: linear-gradient(135deg, #00a86b 0%, #008f5b 100%);
  border: none;
}

.stat-card.highlight .stat-label,
.stat-card.highlight .stat-value {
  color: white;
}

.stat-card.highlight .stat-icon {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.active {
  background: #d1fae5;
  color: #065f46;
}
.stat-icon.orders {
  background: #dbeafe;
  color: #1e40af;
}
.stat-icon.revenue {
  background: #d1fae5;
  color: #065f46;
}
.stat-icon.users {
  background: #fef3c7;
  color: #92400e;
}
.stat-icon.providers {
  background: #e0e7ff;
  color: #3730a3;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.stat-value.live {
  color: white;
}
.stat-value.online {
  color: #00a86b;
}

.stat-sub {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  font-size: 12px;
}

.stat-sub .success {
  color: #059669;
}
.stat-sub .danger {
  color: #dc2626;
}

/* Service Breakdown */
.service-breakdown {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e5e7eb;
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.service-card {
  background: #f9fafb;
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #e5e7eb;
}

.service-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.service-icon {
  font-size: 20px;
}

.service-name {
  font-weight: 600;
  color: #1f2937;
}

.service-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.service-stat {
  display: flex;
  flex-direction: column;
}

.service-stat .label {
  font-size: 11px;
  color: #9ca3af;
}

.service-stat .value {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.service-stat .value.active {
  color: #f59e0b;
}
.service-stat .value.success {
  color: #059669;
}
.service-stat .value.revenue {
  color: #00a86b;
  font-size: 14px;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e5e7eb;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.badge.warning {
  background: #fef3c7;
  color: #92400e;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
}

.data-table td {
  padding: 12px;
  font-size: 14px;
  color: #1f2937;
  border-bottom: 1px solid #f3f4f6;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}
.status-badge.matched {
  background: #dbeafe;
  color: #1e40af;
}
.status-badge.in_progress {
  background: #e0e7ff;
  color: #3730a3;
}
.status-badge.completed {
  background: #d1fae5;
  color: #065f46;
}
.status-badge.cancelled {
  background: #fee2e2;
  color: #991b1b;
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  .service-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
