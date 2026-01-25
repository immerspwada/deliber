<template>
  <div class="system-logs-view">
    <!-- Header -->
    <div class="view-header">
      <div>
        <h1 class="view-title">System Logs</h1>
        <p class="view-subtitle">ติดตาม logs แบบ realtime จากทุก users</p>
      </div>

      <div class="header-actions">
        <!-- Time Range -->
        <select
          v-model="selectedHours"
          class="time-select"
          @change="handleTimeChange"
        >
          <option :value="1">1 ชั่วโมงที่แล้ว</option>
          <option :value="6">6 ชั่วโมงที่แล้ว</option>
          <option :value="24">24 ชั่วโมงที่แล้ว</option>
          <option :value="168">7 วันที่แล้ว</option>
        </select>

        <!-- Export Button -->
        <button class="btn-export" :disabled="loading" @click="handleExport">
          <svg
            class="icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
            />
          </svg>
          Export
        </button>

        <!-- Clean Logs Button -->
        <button
          class="btn-clean"
          :disabled="loading"
          @click="showCleanModal = true"
        >
          <svg
            class="icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
            />
          </svg>
          Clean Old Logs
        </button>

        <!-- Refresh Button -->
        <button class="btn-refresh" :disabled="loading" @click="handleRefresh">
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
    <div v-else-if="hasData" class="logs-content">
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background: #e8f5ef">
            <svg viewBox="0 0 24 24" fill="none" stroke="#00A86B">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </div>
          <div class="stat-content">
            <p class="stat-label">Total Logs</p>
            <p class="stat-value">{{ formatNumber(totalLogs) }}</p>
            <p class="stat-change">ใน {{ selectedHours }} ชั่วโมงที่แล้ว</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: #fee">
            <svg viewBox="0 0 24 24" fill="none" stroke="#E53935">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <div class="stat-content">
            <p class="stat-label">Errors</p>
            <p class="stat-value">
              {{ formatNumber(stats?.error_count || 0) }}
            </p>
            <p class="stat-change" :class="{ negative: errorRate > 5 }">
              {{ errorRate.toFixed(1) }}% error rate
            </p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: #fff4e6">
            <svg viewBox="0 0 24 24" fill="none" stroke="#F5A623">
              <path
                d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
              <path d="M12 9v4M12 17h.01" />
            </svg>
          </div>
          <div class="stat-content">
            <p class="stat-label">Warnings</p>
            <p class="stat-value">{{ formatNumber(stats?.warn_count || 0) }}</p>
            <p class="stat-change">
              {{ stats?.unique_users || 0 }} users affected
            </p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: #e3f2fd">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2196F3">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <div class="stat-content">
            <p class="stat-label">Active Users</p>
            <p class="stat-value">
              {{ formatNumber(stats?.unique_users || 0) }}
            </p>
            <p class="stat-change">
              {{ stats?.unique_sessions || 0 }} sessions
            </p>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label>Level:</label>
          <select v-model="filters.level" @change="applyFilters">
            <option value="">All</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Category:</label>
          <input
            v-model="filters.category"
            type="text"
            placeholder="Filter by category..."
            @input="applyFilters"
          />
        </div>

        <div class="filter-group">
          <label>Page:</label>
          <input
            v-model="filters.page"
            type="text"
            placeholder="Filter by page..."
            @input="applyFilters"
          />
        </div>

        <div class="filter-group">
          <label>Search:</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Search message..."
            @input="applyFilters"
          />
        </div>

        <button class="btn-clear-filters" @click="clearFilters">
          Clear Filters
        </button>
      </div>

      <!-- Common Errors -->
      <div class="chart-card">
        <h3 class="chart-title">Most Common Errors (Top 10)</h3>
        <div class="errors-list">
          <div
            v-for="(error, index) in commonErrors"
            :key="index"
            class="error-item"
          >
            <div class="error-rank">{{ index + 1 }}</div>
            <div class="error-content">
              <p class="error-message">{{ error.message }}</p>
              <p class="error-meta">
                <span class="error-category">{{ error.category }}</span>
                <span class="error-count">{{ error.count }} occurrences</span>
                <span class="error-users">{{ error.affected_users }} users</span>
                <span class="error-time">{{
                  formatTimeAgo(error.last_seen)
                }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Logs Table -->
      <div class="logs-table-card">
        <div class="table-header">
          <h3 class="table-title">Recent Logs ({{ logs.length }})</h3>
          <div class="realtime-indicator" :class="{ active: isRealtimeActive }">
            <span class="indicator-dot"></span>
            {{ isRealtimeActive ? "Realtime Active" : "Realtime Inactive" }}
          </div>
        </div>

        <div class="logs-table-wrapper">
          <table class="logs-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Level</th>
                <th>Category</th>
                <th>Message</th>
                <th>User</th>
                <th>Page</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="log in logs"
                :key="log.id"
                class="log-row"
                :class="log.level"
              >
                <td class="log-time">{{ formatTime(log.timestamp) }}</td>
                <td>
                  <span
                    class="level-badge"
                    :style="{ background: getLevelColor(log.level) }"
                  >
                    {{ log.level }}
                  </span>
                </td>
                <td class="log-category">{{ log.category }}</td>
                <td class="log-message">{{ truncateMessage(log.message) }}</td>
                <td class="log-user">
                  <div v-if="log.user_email">
                    <p class="user-name">{{ log.user_name || "Unknown" }}</p>
                    <p class="user-email">{{ log.user_email }}</p>
                  </div>
                  <span v-else class="user-guest">Guest</span>
                </td>
                <td class="log-page">{{ log.page || "-" }}</td>
                <td>
                  <button class="btn-view" @click="viewLogDetail(log)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
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
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
      <h3>ยังไม่มี Logs</h3>
      <p>Logs จะแสดงที่นี่เมื่อมีการใช้งานระบบ</p>
    </div>

    <!-- Log Detail Modal -->
    <div v-if="selectedLog" class="modal-overlay" @click="selectedLog = null">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Log Detail</h3>
          <button class="close-btn" @click="selectedLog = null">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="detail-row">
            <span class="label">Time:</span>
            <span class="value">{{
              formatFullTime(selectedLog.timestamp)
            }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Level:</span>
            <span
              class="value"
              :style="{ color: getLevelColor(selectedLog.level) }"
            >
              {{ selectedLog.level }}
            </span>
          </div>
          <div class="detail-row">
            <span class="label">Category:</span>
            <span class="value">{{ selectedLog.category }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Page:</span>
            <span class="value">{{ selectedLog.page || "N/A" }}</span>
          </div>
          <div class="detail-row">
            <span class="label">User:</span>
            <span class="value">{{
              selectedLog.user_name || selectedLog.user_email || "Guest"
            }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Session ID:</span>
            <span class="value">{{ selectedLog.session_id || "N/A" }}</span>
          </div>
          <div class="detail-row full">
            <span class="label">Message:</span>
            <pre class="value">{{ selectedLog.message }}</pre>
          </div>
          <div v-if="selectedLog.data" class="detail-row full">
            <span class="label">Data:</span>
            <pre class="value">{{
              JSON.stringify(selectedLog.data, null, 2)
            }}</pre>
          </div>
          <div v-if="selectedLog.stack" class="detail-row full">
            <span class="label">Stack Trace:</span>
            <pre class="value">{{ selectedLog.stack }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Clean Logs Modal -->
    <div
      v-if="showCleanModal"
      class="modal-overlay"
      @click="showCleanModal = false"
    >
      <div class="modal-content small" @click.stop>
        <div class="modal-header">
          <h3>Clean Old Logs</h3>
          <button class="close-btn" @click="showCleanModal = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p>ลบ logs ที่เก่ากว่า:</p>
          <select v-model="cleanDays" class="clean-select">
            <option :value="7">7 วัน</option>
            <option :value="30">30 วัน</option>
            <option :value="90">90 วัน</option>
            <option :value="180">180 วัน</option>
          </select>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showCleanModal = false">
              ยกเลิก
            </button>
            <button
              class="btn-confirm"
              :disabled="cleaning"
              @click="handleCleanLogs"
            >
              {{ cleaning ? "กำลังลบ..." : "ยืนยันลบ" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import {
  useSystemLogs,
  type LogFilters,
  type SystemLog,
} from "../composables/useSystemLogs";

const {
  loading,
  logs,
  stats,
  errorTrends,
  commonErrors,
  hasData,
  errorRate,
  totalLogs,
  fetchAll,
  subscribeToLogs,
  unsubscribe,
  exportLogs,
  cleanOldLogs,
} = useSystemLogs();

const selectedHours = ref(24);
const filters = ref<LogFilters>({});
const selectedLog = ref<SystemLog | null>(null);
const showCleanModal = ref(false);
const cleanDays = ref(30);
const cleaning = ref(false);
const isRealtimeActive = ref(false);

onMounted(async () => {
  await fetchAll(selectedHours.value, filters.value);
  subscribeToLogs(filters.value);
  isRealtimeActive.value = true;
});

onUnmounted(() => {
  unsubscribe();
  isRealtimeActive.value = false;
});

const handleTimeChange = async () => {
  await fetchAll(selectedHours.value, filters.value);
};

const handleRefresh = async () => {
  await fetchAll(selectedHours.value, filters.value);
};

const applyFilters = async () => {
  await fetchAll(selectedHours.value, filters.value);
  unsubscribe();
  subscribeToLogs(filters.value);
};

const clearFilters = async () => {
  filters.value = {};
  await fetchAll(selectedHours.value, filters.value);
  unsubscribe();
  subscribeToLogs(filters.value);
};

const handleExport = async () => {
  try {
    const count = await exportLogs(filters.value);
    alert(`Exported ${count} logs successfully!`);
  } catch (err) {
    alert("Failed to export logs");
  }
};

const handleCleanLogs = async () => {
  if (
    !confirm(
      `Are you sure you want to delete logs older than ${cleanDays.value} days?`
    )
  ) {
    return;
  }

  cleaning.value = true;
  try {
    const deletedCount = await cleanOldLogs(cleanDays.value);
    alert(`Deleted ${deletedCount} old logs successfully!`);
    showCleanModal.value = false;
    await handleRefresh();
  } catch (err) {
    alert("Failed to clean logs");
  } finally {
    cleaning.value = false;
  }
};

const viewLogDetail = (log: SystemLog) => {
  selectedLog.value = log;
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat("th-TH").format(num);
};

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatFullTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString("th-TH");
};

const formatTimeAgo = (timestamp: string) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diff = now.getTime() - time.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} วันที่แล้ว`;
  if (hours > 0) return `${hours} ชั่วโมงที่แล้ว`;
  if (minutes > 0) return `${minutes} นาทีที่แล้ว`;
  return "เมื่อสักครู่";
};

const getLevelColor = (level: string) => {
  const colors: Record<string, string> = {
    error: "#E53935",
    warn: "#F5A623",
    info: "#2196F3",
    success: "#00A86B",
    debug: "#9C27B0",
  };
  return colors[level] || "#666666";
};

const truncateMessage = (message: string, maxLength = 80) => {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength) + "...";
};
</script>

<style scoped>
.system-logs-view {
  padding: 24px;
  max-width: 1600px;
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

.time-select,
.clean-select {
  padding: 10px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  background: white;
  cursor: pointer;
}

.btn-export,
.btn-clean,
.btn-refresh {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-export {
  background: #2196f3;
  color: white;
}

.btn-clean {
  background: #e53935;
  color: white;
}

.btn-refresh {
  background: #00a86b;
  color: white;
}

.btn-export:hover:not(:disabled),
.btn-clean:hover:not(:disabled),
.btn-refresh:hover:not(:disabled) {
  transform: translateY(-1px);
  opacity: 0.9;
}

.btn-export:disabled,
.btn-clean:disabled,
.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon {
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

.stat-change.negative {
  color: #e53935;
}

/* Filters */
.filters-section {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 200px;
}

.filter-group label {
  font-size: 13px;
  font-weight: 600;
  color: #666;
}

.filter-group input,
.filter-group select {
  padding: 10px 12px;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}

.filter-group input:focus,
.filter-group select:focus {
  border-color: #00a86b;
}

.btn-clear-filters {
  padding: 10px 20px;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
}

/* Chart Card */
.chart-card {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.chart-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 20px 0;
}

/* Errors List */
.errors-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.error-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 12px;
}

.error-rank {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e53935;
  color: white;
  border-radius: 8px;
  font-weight: 600;
  flex-shrink: 0;
}

.error-content {
  flex: 1;
}

.error-message {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.error-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #666;
}

.error-category {
  padding: 2px 8px;
  background: white;
  border-radius: 4px;
  font-weight: 600;
}

/* Logs Table */
.logs-table-card {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 16px;
  padding: 24px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.table-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.realtime-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #666;
}

.realtime-indicator.active {
  background: #e8f5ef;
  color: #00a86b;
}

.indicator-dot {
  width: 8px;
  height: 8px;
  background: #666;
  border-radius: 50%;
}

.realtime-indicator.active .indicator-dot {
  background: #00a86b;
  animation: pulse 2s infinite;
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

.logs-table-wrapper {
  overflow-x: auto;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
}

.logs-table th {
  text-align: left;
  padding: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  border-bottom: 2px solid #f0f0f0;
}

.logs-table td {
  padding: 12px;
  font-size: 13px;
  border-bottom: 1px solid #f5f5f5;
}

.log-row.error {
  background: #fff5f5;
}

.log-row.warn {
  background: #fffbf0;
}

.log-time {
  font-family: "Courier New", monospace;
  color: #999;
}

.level-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  color: white;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.log-category {
  font-weight: 600;
  color: #666;
}

.log-message {
  color: #1a1a1a;
}

.log-user {
  font-size: 12px;
}

.user-name {
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 2px 0;
}

.user-email {
  color: #999;
  margin: 0;
}

.user-guest {
  color: #999;
  font-style: italic;
}

.log-page {
  color: #666;
  font-family: "Courier New", monospace;
  font-size: 12px;
}

.btn-view {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-view:hover {
  background: #e8e8e8;
}

.btn-view svg {
  width: 16px;
  height: 16px;
  stroke-width: 2;
  color: #666;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 800px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-content.small {
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e8e8e8;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.close-btn svg {
  width: 16px;
  height: 16px;
  color: #666;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.detail-row {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 12px;
  margin-bottom: 16px;
  font-size: 14px;
}

.detail-row.full {
  grid-template-columns: 1fr;
}

.detail-row .label {
  font-weight: 600;
  color: #666;
}

.detail-row .value {
  color: #1a1a1a;
  word-break: break-word;
}

.detail-row pre {
  margin: 0;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  font-family: "Courier New", monospace;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-confirm {
  background: #e53935;
  color: white;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
