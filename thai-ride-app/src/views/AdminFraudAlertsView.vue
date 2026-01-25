<script setup lang="ts">
/**
 * Admin Fraud Alerts View - Production Ready
 * ==========================================
 * Fraud detection and alert management
 */
import { ref, computed, onMounted, watch } from "vue";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const isLoading = ref(true);
const alerts = ref<any[]>([]);
const totalAlerts = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const statusFilter = ref("");
const severityFilter = ref("");
const selectedAlert = ref<any>(null);
const showModal = ref(false);
const showResolveModal = ref(false);
const resolveAction = ref("dismiss");
const resolveNotes = ref("");
const processing = ref(false);

const stats = ref({
  total_alerts: 0,
  open_alerts: 0,
  critical_alerts: 0,
  high_alerts: 0,
  resolved_today: 0,
  avg_resolution_hours: 0,
  top_alert_types: [],
});

const totalPages = computed(() =>
  Math.ceil(totalAlerts.value / pageSize.value)
);

async function loadAlerts() {
  isLoading.value = true;
  try {
    const offset = (currentPage.value - 1) * pageSize.value;
    const { data, error } = await (supabase.rpc as any)(
      "admin_get_fraud_alerts",
      {
        p_status: statusFilter.value || null,
        p_severity: severityFilter.value || null,
        p_limit: pageSize.value,
        p_offset: offset,
      }
    );
    if (error) throw error;
    alerts.value = data || [];
    totalAlerts.value = data?.length || 0;
  } catch (e) {
    console.error("Failed to load alerts:", e);
  } finally {
    isLoading.value = false;
  }
}

async function loadStats() {
  try {
    const { data, error } = await (supabase.rpc as any)(
      "admin_get_fraud_stats"
    );
    if (error) throw error;
    if (data && data.length > 0) stats.value = data[0];
  } catch (e) {
    console.error("Failed to load stats:", e);
  }
}

function viewAlert(a: any) {
  selectedAlert.value = a;
  showModal.value = true;
}

function openResolve(a: any) {
  selectedAlert.value = a;
  resolveAction.value = "dismiss";
  resolveNotes.value = "";
  showResolveModal.value = true;
}

async function resolveAlert() {
  if (!selectedAlert.value) return;
  processing.value = true;
  try {
    const { data, error } = await (supabase.rpc as any)(
      "admin_resolve_fraud_alert",
      {
        p_alert_id: selectedAlert.value.id,
        p_admin_id: authStore.user?.id,
        p_action: resolveAction.value,
        p_notes: resolveNotes.value || null,
      }
    );
    if (error) throw error;
    showResolveModal.value = false;
    showModal.value = false;
    loadAlerts();
    loadStats();
  } catch (e) {
    console.error("Failed to resolve alert:", e);
  } finally {
    processing.value = false;
  }
}

function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSeverityColor(s: string) {
  return (
    (
      {
        critical: "#DC2626",
        high: "#F59E0B",
        medium: "#3B82F6",
        low: "#10B981",
      } as any
    )[s] || "#6B7280"
  );
}

function getStatusColor(s: string) {
  return (
    ({ open: "#F59E0B", resolved: "#10B981", dismissed: "#6B7280" } as any)[
      s
    ] || "#6B7280"
  );
}

function getAlertTypeLabel(t: string) {
  return (
    (
      {
        suspicious_activity: "กิจกรรมน่าสงสัย",
        multiple_cancellations: "ยกเลิกบ่อย",
        fake_location: "ตำแหน่งปลอม",
        payment_fraud: "ฉ้อโกงการชำระเงิน",
        account_abuse: "ใช้บัญชีผิดปกติ",
      } as any
    )[t] || t
  );
}

watch([statusFilter, severityFilter], () => {
  currentPage.value = 1;
  loadAlerts();
});
watch(currentPage, loadAlerts);
onMounted(() => {
  loadAlerts();
  loadStats();
});
</script>

<template>
  <div class="fraud-view">
    <div class="page-header">
      <div class="header-left">
        <h1>Fraud Alerts</h1>
        <span v-if="stats.critical_alerts > 0" class="count critical">{{ stats.critical_alerts }} Critical</span>
      </div>
      <button
        class="refresh-btn"
        @click="
          loadAlerts();
          loadStats();
        "
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

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon orange">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.open_alerts }}</span><span class="stat-label">เปิดอยู่</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.critical_alerts }}</span><span class="stat-label">Critical</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.resolved_today }}</span><span class="stat-label">แก้ไขวันนี้</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">
          <svg
            width="20"
            height="20"
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
          <span class="stat-value">{{ Math.round(stats.avg_resolution_hours) }}h</span><span class="stat-label">เวลาเฉลี่ย</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <select v-model="statusFilter" class="filter-select">
        <option value="">ทุกสถานะ</option>
        <option value="open">เปิดอยู่</option>
        <option value="resolved">แก้ไขแล้ว</option>
      </select>
      <select v-model="severityFilter" class="filter-select">
        <option value="">ทุกระดับ</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
    </div>

    <!-- Table -->
    <div class="table-container">
      <div v-if="isLoading" class="loading">
        <div v-for="i in 8" :key="i" class="skeleton" />
      </div>
      <table v-else-if="alerts.length" class="data-table">
        <thead>
          <tr>
            <th>ระดับ</th>
            <th>ประเภท</th>
            <th>ผู้ใช้</th>
            <th>รายละเอียด</th>
            <th>สถานะ</th>
            <th>วันที่</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in alerts" :key="a.id" @click="viewAlert(a)">
            <td>
              <span
                class="severity-badge"
                :style="{ background: getSeverityColor(a.severity) }"
              >{{ a.severity }}</span>
            </td>
            <td>{{ getAlertTypeLabel(a.alert_type) }}</td>
            <td>
              <div class="user-info">
                <span class="name">{{ a.user_name }}</span>
                <span class="uid">{{ a.member_uid }}</span>
              </div>
            </td>
            <td class="desc">
              {{ a.description?.slice(0, 50)
              }}{{ a.description?.length > 50 ? "..." : "" }}
            </td>
            <td>
              <span
                class="badge"
                :style="{
                  color: getStatusColor(a.status),
                  background: getStatusColor(a.status) + '20',
                }"
              >{{ a.status }}</span>
            </td>
            <td class="date">{{ formatDate(a.created_at) }}</td>
            <td>
              <button
                v-if="a.status === 'open'"
                class="action-btn"
                @click.stop="openResolve(a)"
              >
                แก้ไข
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty"><p>ไม่พบ Fraud Alerts</p></div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button :disabled="currentPage === 1" @click="currentPage--">
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
      <span>{{ currentPage }}/{{ totalPages }}</span>
      <button :disabled="currentPage === totalPages" @click="currentPage++">
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

    <!-- Resolve Modal -->
    <div
      v-if="showResolveModal"
      class="modal-overlay"
      @click.self="showResolveModal = false"
    >
      <div class="modal">
        <div class="modal-header">
          <h2>แก้ไข Alert</h2>
          <button @click="showResolveModal = false">
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
            <label>การดำเนินการ</label>
            <select v-model="resolveAction" class="filter-select full">
              <option value="dismiss">ยกเลิก (ไม่มีปัญหา)</option>
              <option value="warn_user">เตือนผู้ใช้</option>
              <option value="suspend_user">ระงับบัญชี</option>
              <option value="ban_user">แบนบัญชี</option>
            </select>
          </div>
          <div class="form-row">
            <label>หมายเหตุ</label>
            <textarea
              v-model="resolveNotes"
              placeholder="ระบุรายละเอียดการดำเนินการ"
            ></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showResolveModal = false">
              ยกเลิก
            </button>
            <button
              class="btn-primary"
              :disabled="processing"
              @click="resolveAlert"
            >
              {{ processing ? "กำลังดำเนินการ..." : "ยืนยัน" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fraud-view {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}
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
.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}
.count.critical {
  padding: 4px 12px;
  background: #fee2e2;
  color: #dc2626;
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
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
  border: 1px solid #f3f4f6;
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
.stat-icon.red {
  background: #fee2e2;
  color: #dc2626;
}
.stat-content {
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
.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}
.filter-select {
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
}
.filter-select.full {
  width: 100%;
}
.table-container {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
}
.loading {
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
.severity-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  text-transform: uppercase;
}
.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.user-info .name {
  font-weight: 500;
  color: #1f2937;
}
.user-info .uid {
  font-size: 12px;
  color: #6b7280;
  font-family: monospace;
}
.desc {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #6b7280;
}
.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}
.date {
  font-size: 13px;
  color: #6b7280;
}
.action-btn {
  padding: 6px 12px;
  background: #e8f5ef;
  color: #00a86b;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.empty {
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
.pagination button {
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
.pagination button:disabled {
  opacity: 0.5;
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
  max-width: 440px;
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
.modal-header button {
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
.form-row {
  margin-bottom: 16px;
}
.form-row label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}
.form-row textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  min-height: 80px;
  resize: vertical;
}
.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
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
.btn-primary {
  flex: 1;
  padding: 12px;
  background: #00a86b;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.btn-primary:disabled {
  opacity: 0.5;
}
</style>
