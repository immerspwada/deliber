<script setup lang="ts">
/**
 * Admin Feedback View - Production Ready
 * ======================================
 * Customer feedback management with NPS tracking
 */
import { ref, computed, onMounted, watch } from "vue";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const isLoading = ref(true);
const feedbacks = ref<any[]>([]);
const currentPage = ref(1);
const pageSize = ref(20);
const typeFilter = ref("");
const statusFilter = ref("");
const selectedFeedback = ref<any>(null);
const showModal = ref(false);
const showResponseModal = ref(false);
const responseText = ref("");
const processing = ref(false);

const stats = ref({
  total_feedback: 0,
  pending_feedback: 0,
  resolved_feedback: 0,
  avg_rating: 0,
  nps_score: 0,
  promoters: 0,
  passives: 0,
  detractors: 0,
  today_feedback: 0,
  avg_response_hours: 0,
});

async function loadFeedbacks() {
  isLoading.value = true;
  try {
    const offset = (currentPage.value - 1) * pageSize.value;
    const { data, error } = await (supabase.rpc as any)("admin_get_feedback", {
      p_type: typeFilter.value || null,
      p_status: statusFilter.value || null,
      p_limit: pageSize.value,
      p_offset: offset,
    });
    if (error) throw error;
    feedbacks.value = data || [];
  } catch (e) {
    console.error("Failed to load feedbacks:", e);
  } finally {
    isLoading.value = false;
  }
}

async function loadStats() {
  try {
    const { data, error } = await (supabase.rpc as any)(
      "admin_get_feedback_stats"
    );
    if (error) throw error;
    if (data && data.length > 0) stats.value = data[0];
  } catch (e) {
    console.error("Failed to load stats:", e);
  }
}

function viewFeedback(f: any) {
  selectedFeedback.value = f;
  showModal.value = true;
}

function openResponse(f: any) {
  selectedFeedback.value = f;
  responseText.value = "";
  showResponseModal.value = true;
}

async function submitResponse() {
  if (!selectedFeedback.value || !responseText.value) return;
  processing.value = true;
  try {
    const { data, error } = await (supabase.rpc as any)(
      "admin_respond_feedback",
      {
        p_feedback_id: selectedFeedback.value.id,
        p_admin_id: authStore.user?.id,
        p_response: responseText.value,
      }
    );
    if (error) throw error;
    showResponseModal.value = false;
    showModal.value = false;
    loadFeedbacks();
    loadStats();
  } catch (e) {
    console.error("Failed to respond:", e);
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
  });
}

function getTypeLabel(t: string) {
  return (
    (
      {
        suggestion: "ข้อเสนอแนะ",
        complaint: "ร้องเรียน",
        praise: "ชื่นชม",
        bug: "แจ้งปัญหา",
        other: "อื่นๆ",
      } as any
    )[t] || t
  );
}

function getStatusColor(s: string) {
  return (
    (
      { pending: "#F59E0B", resolved: "#10B981", in_progress: "#3B82F6" } as any
    )[s] || "#6B7280"
  );
}

function getNPSColor(score: number) {
  if (score >= 50) return "#10B981";
  if (score >= 0) return "#F59E0B";
  return "#EF4444";
}

watch([typeFilter, statusFilter], () => {
  currentPage.value = 1;
  loadFeedbacks();
});
watch(currentPage, loadFeedbacks);
onMounted(() => {
  loadFeedbacks();
  loadStats();
});
</script>

<template>
  <div class="feedback-view">
    <div class="page-header">
      <div class="header-left">
        <h1>Customer Feedback</h1>
        <span class="count">{{ stats.total_feedback }}</span>
      </div>
      <button
        class="refresh-btn"
        @click="
          loadFeedbacks();
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

    <!-- NPS Card -->
    <div class="nps-card">
      <div class="nps-score" :style="{ color: getNPSColor(stats.nps_score) }">
        <span class="value">{{ stats.nps_score.toFixed(0) }}</span>
        <span class="label">NPS Score</span>
      </div>
      <div class="nps-breakdown">
        <div class="nps-item promoters">
          <span class="count">{{ stats.promoters }}</span>
          <span class="label">Promoters (9-10)</span>
          <div class="bar">
            <div
              class="fill"
              :style="{
                width:
                  ((stats.promoters / stats.total_feedback) * 100 || 0) + '%',
              }"
            ></div>
          </div>
        </div>
        <div class="nps-item passives">
          <span class="count">{{ stats.passives }}</span>
          <span class="label">Passives (7-8)</span>
          <div class="bar">
            <div
              class="fill"
              :style="{
                width:
                  ((stats.passives / stats.total_feedback) * 100 || 0) + '%',
              }"
            ></div>
          </div>
        </div>
        <div class="nps-item detractors">
          <span class="count">{{ stats.detractors }}</span>
          <span class="label">Detractors (0-6)</span>
          <div class="bar">
            <div
              class="fill"
              :style="{
                width:
                  ((stats.detractors / stats.total_feedback) * 100 || 0) + '%',
              }"
            ></div>
          </div>
        </div>
      </div>
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
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.pending_feedback }}</span><span class="stat-label">รอตอบกลับ</span>
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
          <span class="stat-value">{{ stats.resolved_feedback }}</span><span class="stat-label">ตอบกลับแล้ว</span>
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
          <span class="stat-value">{{ stats.avg_response_hours.toFixed(1) }}h</span><span class="stat-label">เวลาตอบเฉลี่ย</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.avg_rating.toFixed(1) }}</span><span class="stat-label">คะแนนเฉลี่ย</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <select v-model="typeFilter" class="filter-select">
        <option value="">ทุกประเภท</option>
        <option value="suggestion">ข้อเสนอแนะ</option>
        <option value="complaint">ร้องเรียน</option>
        <option value="praise">ชื่นชม</option>
        <option value="bug">แจ้งปัญหา</option>
      </select>
      <select v-model="statusFilter" class="filter-select">
        <option value="">ทุกสถานะ</option>
        <option value="pending">รอตอบกลับ</option>
        <option value="resolved">ตอบกลับแล้ว</option>
      </select>
    </div>

    <!-- Table -->
    <div class="table-container">
      <div v-if="isLoading" class="loading">
        <div v-for="i in 8" :key="i" class="skeleton" />
      </div>
      <table v-else-if="feedbacks.length" class="data-table">
        <thead>
          <tr>
            <th>ประเภท</th>
            <th>ลูกค้า</th>
            <th>หัวข้อ</th>
            <th>คะแนน</th>
            <th>สถานะ</th>
            <th>วันที่</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in feedbacks" :key="f.id" @click="viewFeedback(f)">
            <td>
              <span class="type-badge">{{
                getTypeLabel(f.feedback_type)
              }}</span>
            </td>
            <td>
              <div class="user-info">
                <span class="name">{{ f.user_name }}</span><span class="uid">{{ f.member_uid }}</span>
              </div>
            </td>
            <td class="subject">
              {{ f.subject || f.message?.slice(0, 30) }}...
            </td>
            <td>
              <span v-if="f.rating" class="rating">{{ f.rating }}/10</span><span v-else>-</span>
            </td>
            <td>
              <span
                class="badge"
                :style="{
                  color: getStatusColor(f.status),
                  background: getStatusColor(f.status) + '20',
                }"
              >{{
                f.status === "pending" ? "รอตอบกลับ" : "ตอบกลับแล้ว"
              }}</span>
            </td>
            <td class="date">{{ formatDate(f.created_at) }}</td>
            <td>
              <button
                v-if="f.status === 'pending'"
                class="action-btn"
                @click.stop="openResponse(f)"
              >
                ตอบกลับ
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty"><p>ไม่พบ Feedback</p></div>
    </div>

    <!-- Response Modal -->
    <div
      v-if="showResponseModal"
      class="modal-overlay"
      @click.self="showResponseModal = false"
    >
      <div class="modal">
        <div class="modal-header">
          <h2>ตอบกลับ Feedback</h2>
          <button @click="showResponseModal = false">
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
          <div class="feedback-preview">
            <h4>{{ selectedFeedback?.subject || "Feedback" }}</h4>
            <p>{{ selectedFeedback?.message }}</p>
          </div>
          <div class="form-row">
            <label>ข้อความตอบกลับ *</label>
            <textarea
              v-model="responseText"
              placeholder="พิมพ์ข้อความตอบกลับ..."
            ></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showResponseModal = false">
              ยกเลิก
            </button>
            <button
              class="btn-primary"
              :disabled="processing || !responseText"
              @click="submitResponse"
            >
              {{ processing ? "กำลังส่ง..." : "ส่งตอบกลับ" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feedback-view {
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
.count {
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

/* NPS Card */
.nps-card {
  display: flex;
  align-items: center;
  gap: 40px;
  padding: 24px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #f3f4f6;
  margin-bottom: 24px;
}
.nps-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
}
.nps-score .value {
  font-size: 56px;
  font-weight: 700;
  line-height: 1;
}
.nps-score .label {
  font-size: 14px;
  color: #6b7280;
  margin-top: 8px;
}
.nps-breakdown {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.nps-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.nps-item .count {
  font-size: 18px;
  font-weight: 600;
  min-width: 40px;
}
.nps-item .label {
  font-size: 13px;
  color: #6b7280;
  min-width: 120px;
}
.nps-item .bar {
  flex: 1;
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
}
.nps-item .fill {
  height: 100%;
  border-radius: 4px;
}
.nps-item.promoters .count {
  color: #10b981;
}
.nps-item.promoters .fill {
  background: #10b981;
}
.nps-item.passives .count {
  color: #f59e0b;
}
.nps-item.passives .fill {
  background: #f59e0b;
}
.nps-item.detractors .count {
  color: #ef4444;
}
.nps-item.detractors .fill {
  background: #ef4444;
}

/* Stats Grid */
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
.stat-icon.purple {
  background: #ede9fe;
  color: #7c3aed;
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

/* Filters */
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

/* Table */
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
.type-badge {
  padding: 4px 10px;
  background: #ede9fe;
  color: #7c3aed;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
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
.subject {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #374151;
}
.rating {
  font-weight: 600;
  color: #059669;
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
  background: #00a86b;
  color: #fff;
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
  max-width: 500px;
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
.feedback-preview {
  padding: 16px;
  background: #f9fafb;
  border-radius: 10px;
  margin-bottom: 20px;
}
.feedback-preview h4 {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
}
.feedback-preview p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
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
  min-height: 100px;
  resize: vertical;
}
.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
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
  cursor: not-allowed;
}
</style>
