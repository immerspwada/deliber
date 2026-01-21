<template>
  <div class="reorder-analytics-view">
    <!-- Header -->
    <div class="view-header">
      <div>
        <h1 class="view-title">📊 Reorder Analytics</h1>
        <p class="view-subtitle">วิเคราะห์พฤติกรรมการสั่งซ้ำของลูกค้า</p>
      </div>

      <div class="header-actions">
        <!-- Date Range Selector -->
        <select
          v-model="selectedDays"
          @change="handleDaysChange"
          class="date-select"
        >
          <option :value="7">7 วันที่แล้ว</option>
          <option :value="30">30 วันที่แล้ว</option>
          <option :value="90">90 วันที่แล้ว</option>
          <option :value="365">1 ปีที่แล้ว</option>
        </select>

        <button @click="handleRefresh" class="btn-refresh" :disabled="loading">
          <svg
            class="icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"
            />
          </svg>
          รีเฟรช
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !hasData" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Content -->
    <div v-else-if="hasData" class="analytics-content">
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background: #e8f5ef">
            <svg viewBox="0 0 24 24" fill="none" stroke="#00A86B">
              <path
                d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
              />
            </svg>
          </div>
          <div class="stat-content">
            <p class="stat-label">จำนวนการสั่งซ้ำ</p>
            <p class="stat-value">{{ formatNumber(totalReorders) }}</p>
            <p class="stat-change positive">
              +{{ stats?.reorder_rate || 0 }}% จากเดือนที่แล้ว
            </p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: #fff4e6">
            <svg viewBox="0 0 24 24" fill="none" stroke="#F5A623">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div class="stat-content">
            <p class="stat-label">ลูกค้าที่สั่งซ้ำ</p>
            <p class="stat-value">
              {{ formatNumber(stats?.total_users || 0) }}
            </p>
            <p class="stat-change">
              {{
                (
                  ((stats?.total_users || 0) / (stats?.total_reorders || 1)) *
                  100
                ).toFixed(1)
              }}% ของทั้งหมด
            </p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: #fee">
            <svg viewBox="0 0 24 24" fill="none" stroke="#E53935">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div class="stat-content">
            <p class="stat-label">เวลาเฉลี่ยในการสั่งซ้ำ</p>
            <p class="stat-value">{{ stats?.avg_time_to_reorder || "-" }}</p>
            <p class="stat-change">หลังจากคำสั่งเดิม</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: #f3e5f5">
            <svg viewBox="0 0 24 24" fill="none" stroke="#9C27B0">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              />
            </svg>
          </div>
          <div class="stat-content">
            <p class="stat-label">บริการที่สั่งซ้ำมากที่สุด</p>
            <p class="stat-value">
              {{ getServiceLabel(stats?.most_reordered_service) }}
            </p>
            <p class="stat-change">{{ getMostReorderedCount() }} ครั้ง</p>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="charts-row">
        <!-- By Service -->
        <div class="chart-card">
          <h3 class="chart-title">การสั่งซ้ำแยกตามบริการ</h3>
          <div class="service-bars">
            <div
              v-for="service in byService"
              :key="service.service_type"
              class="service-bar-item"
            >
              <div class="service-info">
                <span class="service-name">{{
                  getServiceLabel(service.service_type)
                }}</span>
                <span class="service-count"
                  >{{ service.reorder_count }} ครั้ง</span
                >
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{
                    width: `${(service.reorder_count / totalReorders) * 100}%`,
                    background: getServiceColor(service.service_type),
                  }"
                ></div>
              </div>
              <p class="service-meta">
                {{ service.unique_users }} ลูกค้า · เฉลี่ย
                {{ service.avg_time_since_original }}
              </p>
            </div>
          </div>
        </div>

        <!-- By Method -->
        <div class="chart-card">
          <h3 class="chart-title">วิธีการสั่งซ้ำ</h3>
          <div class="method-list">
            <div
              v-for="method in byMethod"
              :key="method.reorder_method"
              class="method-item"
            >
              <div
                class="method-icon"
                :style="{ background: getMethodColor(method.reorder_method) }"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="white">
                  <path
                    v-if="method.reorder_method === 'quick_button'"
                    d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                  />
                  <path
                    v-else-if="method.reorder_method === 'history'"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                  <path
                    v-else
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div class="method-content">
                <p class="method-name">
                  {{ getMethodLabel(method.reorder_method) }}
                </p>
                <p class="method-stats">
                  {{ method.count }} ครั้ง ({{ method.percentage }}%)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Routes -->
      <div class="chart-card full-width">
        <h3 class="chart-title">เส้นทางที่สั่งซ้ำมากที่สุด (Top 10)</h3>
        <div class="routes-table">
          <table>
            <thead>
              <tr>
                <th>อันดับ</th>
                <th>จาก</th>
                <th>ถึง</th>
                <th>บริการ</th>
                <th>จำนวนครั้ง</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(route, index) in topRoutes" :key="index">
                <td>
                  <span class="rank-badge" :class="{ 'top-3': index < 3 }">
                    {{ index + 1 }}
                  </span>
                </td>
                <td class="location-cell">
                  <svg
                    class="location-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#00A86B"
                  >
                    <circle cx="12" cy="10" r="3" />
                    <path
                      d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"
                    />
                  </svg>
                  {{ route.from_location }}
                </td>
                <td class="location-cell">
                  <svg
                    class="location-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#E53935"
                  >
                    <circle cx="12" cy="10" r="3" />
                    <path
                      d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"
                    />
                  </svg>
                  {{ route.to_location }}
                </td>
                <td>
                  <span
                    class="service-badge"
                    :style="{ background: getServiceColor(route.service_type) }"
                  >
                    {{ getServiceLabel(route.service_type) }}
                  </span>
                </td>
                <td class="count-cell">{{ route.reorder_count }} ครั้ง</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Trends Chart -->
      <div class="chart-card full-width">
        <h3 class="chart-title">แนวโน้มการสั่งซ้ำ</h3>
        <div class="trends-chart">
          <div class="chart-placeholder">
            <p>📈 กราฟแนวโน้มจะแสดงที่นี่</p>
            <p class="chart-note">ข้อมูล {{ trends.length }} วัน</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <svg
        class="empty-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
      <h3>ยังไม่มีข้อมูลการสั่งซ้ำ</h3>
      <p>เมื่อลูกค้าเริ่มสั่งซ้ำ ข้อมูลจะแสดงที่นี่</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useReorderAnalytics } from "../composables/useReorderAnalytics";

const {
  loading,
  stats,
  byService,
  byMethod,
  topRoutes,
  trends,
  hasData,
  totalReorders,
  fetchAll,
} = useReorderAnalytics();

const selectedDays = ref(30);

onMounted(() => {
  fetchAll(selectedDays.value);
});

const handleDaysChange = () => {
  fetchAll(selectedDays.value);
};

const handleRefresh = () => {
  fetchAll(selectedDays.value);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat("th-TH").format(num);
};

const getServiceLabel = (serviceType: string | undefined) => {
  if (!serviceType) return "-";
  const labels: Record<string, string> = {
    ride: "เรียกรถ",
    delivery: "ส่งของ",
    shopping: "ซื้อของ",
    queue: "จองคิว",
    moving: "ขนย้าย",
    laundry: "ซักผ้า",
  };
  return labels[serviceType] || serviceType;
};

const getServiceColor = (serviceType: string) => {
  const colors: Record<string, string> = {
    ride: "#00A86B",
    delivery: "#F5A623",
    shopping: "#E53935",
    queue: "#9C27B0",
    moving: "#2196F3",
    laundry: "#FF9800",
  };
  return colors[serviceType] || "#00A86B";
};

const getMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    quick_button: "ปุ่มสั่งซ้ำด่วน",
    history: "จากประวัติ",
    suggestion: "จากคำแนะนำ",
  };
  return labels[method] || method;
};

const getMethodColor = (method: string) => {
  const colors: Record<string, string> = {
    quick_button: "#00A86B",
    history: "#2196F3",
    suggestion: "#9C27B0",
  };
  return colors[method] || "#00A86B";
};

const getMostReorderedCount = () => {
  if (!stats.value?.most_reordered_service) return 0;
  const service = byService.value.find(
    (s) => s.service_type === stats.value?.most_reordered_service
  );
  return service?.reorder_count || 0;
};
</script>

<style scoped>
.reorder-analytics-view {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.view-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.view-subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.date-select {
  padding: 10px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.date-select:hover {
  border-color: #00a86b;
}

.btn-refresh {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #00a86b;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh:hover:not(:disabled) {
  background: #008f5b;
  transform: translateY(-1px);
}

.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-refresh .icon {
  width: 18px;
  height: 18px;
  stroke-width: 2;
}

/* Loading */
.loading-state {
  text-align: center;
  padding: 80px 20px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e8e8e8;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon svg {
  width: 28px;
  height: 28px;
  stroke-width: 2;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 13px;
  color: #666;
  margin: 0 0 8px 0;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.stat-change {
  font-size: 13px;
  color: #666;
  margin: 0;
}

.stat-change.positive {
  color: #00a86b;
}

/* Charts */
.charts-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.chart-card {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 16px;
  padding: 24px;
}

.chart-card.full-width {
  grid-column: 1 / -1;
  margin-bottom: 20px;
}

.chart-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 20px 0;
}

/* Service Bars */
.service-bars {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.service-bar-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.service-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.service-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.service-count {
  font-size: 14px;
  font-weight: 600;
  color: #00a86b;
}

.progress-bar {
  height: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.service-meta {
  font-size: 12px;
  color: #999;
  margin: 0;
}

/* Method List */
.method-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.method-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 12px;
}

.method-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.method-icon svg {
  width: 24px;
  height: 24px;
  stroke-width: 2;
}

.method-content {
  flex: 1;
}

.method-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.method-stats {
  font-size: 13px;
  color: #666;
  margin: 0;
}

/* Routes Table */
.routes-table {
  overflow-x: auto;
}

.routes-table table {
  width: 100%;
  border-collapse: collapse;
}

.routes-table th {
  text-align: left;
  padding: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  border-bottom: 2px solid #f0f0f0;
}

.routes-table td {
  padding: 16px 12px;
  font-size: 14px;
  color: #1a1a1a;
  border-bottom: 1px solid #f5f5f5;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f5f5f5;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
}

.rank-badge.top-3 {
  background: #ffd700;
  color: white;
}

.location-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.location-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  stroke-width: 2;
}

.service-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.count-cell {
  font-weight: 600;
  color: #00a86b;
}

/* Trends Chart */
.trends-chart {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-placeholder {
  text-align: center;
  color: #999;
}

.chart-placeholder p:first-child {
  font-size: 48px;
  margin: 0 0 8px 0;
}

.chart-note {
  font-size: 14px;
  margin: 0;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  stroke: #e8e8e8;
  stroke-width: 2;
  margin: 0 auto 16px;
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 14px;
  color: #999;
  margin: 0;
}
</style>
