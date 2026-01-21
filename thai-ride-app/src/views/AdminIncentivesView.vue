<script setup lang="ts">
/**
 * Admin Incentives View - Production Ready
 * ========================================
 * Provider incentives management with real database integration
 */
import { ref, computed, onMounted, watch } from "vue";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const isLoading = ref(true);
const incentives = ref<any[]>([]);
const currentPage = ref(1);
const pageSize = ref(20);
const statusFilter = ref("");
const typeFilter = ref("");
const selectedIncentive = ref<any>(null);
const showModal = ref(false);
const showCreateModal = ref(false);
const processing = ref(false);

const stats = ref({
  total_incentives: 0,
  active_incentives: 0,
  total_budget: 0,
  total_claimed: 0,
  providers_participating: 0,
  avg_completion_rate: 0,
});

const newIncentive = ref({
  name: "",
  description: "",
  incentive_type: "bonus",
  target_value: 10,
  reward_amount: 100,
  start_date: "",
  end_date: "",
  provider_types: [] as string[],
});

async function loadIncentives() {
  isLoading.value = true;
  try {
    const offset = (currentPage.value - 1) * pageSize.value;
    const { data, error } = await (supabase.rpc as any)(
      "admin_get_incentives",
      {
        p_status: statusFilter.value || null,
        p_type: typeFilter.value || null,
        p_limit: pageSize.value,
        p_offset: offset,
      }
    );
    if (error) throw error;
    incentives.value = data || [];
  } catch (e) {
    console.error("Failed to load incentives:", e);
  } finally {
    isLoading.value = false;
  }
}

async function loadStats() {
  try {
    const { data, error } = await (supabase.rpc as any)(
      "admin_get_incentive_stats"
    );
    if (error) throw error;
    if (data && data.length > 0) stats.value = data[0];
  } catch (e) {
    console.error("Failed to load stats:", e);
  }
}

function viewIncentive(inc: any) {
  selectedIncentive.value = inc;
  showModal.value = true;
}

function openCreateModal() {
  newIncentive.value = {
    name: "",
    description: "",
    incentive_type: "bonus",
    target_value: 10,
    reward_amount: 100,
    start_date: "",
    end_date: "",
    provider_types: [],
  };
  showCreateModal.value = true;
}

async function createIncentive() {
  if (!newIncentive.value.name || !newIncentive.value.start_date) return;
  processing.value = true;
  try {
    const { data, error } = await (supabase.rpc as any)(
      "admin_create_incentive",
      {
        p_name: newIncentive.value.name,
        p_description: newIncentive.value.description || null,
        p_type: newIncentive.value.incentive_type,
        p_target_value: newIncentive.value.target_value,
        p_reward_amount: newIncentive.value.reward_amount,
        p_start_date: newIncentive.value.start_date,
        p_end_date: newIncentive.value.end_date || null,
        p_provider_types: newIncentive.value.provider_types.length
          ? newIncentive.value.provider_types
          : null,
      }
    );
    if (error) throw error;
    showCreateModal.value = false;
    loadIncentives();
    loadStats();
  } catch (e) {
    console.error("Failed to create incentive:", e);
  } finally {
    processing.value = false;
  }
}

async function toggleIncentiveStatus(inc: any) {
  try {
    const newStatus = inc.status === "active" ? "paused" : "active";
    const { error } = await (supabase.rpc as any)(
      "admin_update_incentive_status",
      {
        p_incentive_id: inc.id,
        p_status: newStatus,
      }
    );
    if (error) throw error;
    loadIncentives();
    loadStats();
  } catch (e) {
    console.error("Failed to update status:", e);
  }
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(n || 0);
}
function formatDate(d: string) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
function getStatusColor(s: string) {
  return (
    (
      {
        active: "#10B981",
        paused: "#F59E0B",
        ended: "#6B7280",
        draft: "#3B82F6",
      } as any
    )[s] || "#6B7280"
  );
}
function getStatusLabel(s: string) {
  return (
    (
      {
        active: "กำลังใช้งาน",
        paused: "หยุดชั่วคราว",
        ended: "สิ้นสุดแล้ว",
        draft: "ร่าง",
      } as any
    )[s] || s
  );
}
function getTypeLabel(t: string) {
  return (
    (
      {
        bonus: "โบนัส",
        streak: "ทำต่อเนื่อง",
        target: "เป้าหมาย",
        referral: "แนะนำเพื่อน",
      } as any
    )[t] || t
  );
}

watch([statusFilter, typeFilter], () => {
  currentPage.value = 1;
  loadIncentives();
});
watch(currentPage, loadIncentives);
onMounted(() => {
  loadIncentives();
  loadStats();
});
</script>

<template>
  <div class="incentives-view">
    <div class="page-header">
      <div class="header-left">
        <h1>Provider Incentives</h1>
        <span class="count">{{ stats.total_incentives }}</span>
      </div>
      <div class="header-right">
        <button class="btn-create" @click="openCreateModal">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          สร้าง Incentive
        </button>
        <button
          class="refresh-btn"
          @click="
            loadIncentives();
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
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
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
          <span class="stat-value">{{ stats.active_incentives }}</span
          ><span class="stat-label">กำลังใช้งาน</span>
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
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{
            formatCurrency(stats.total_budget)
          }}</span
          ><span class="stat-label">งบประมาณรวม</span>
        </div>
      </div>
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
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{
            formatCurrency(stats.total_claimed)
          }}</span
          ><span class="stat-label">จ่ายไปแล้ว</span>
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
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.providers_participating }}</span
          ><span class="stat-label">ผู้ให้บริการเข้าร่วม</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <select v-model="statusFilter" class="filter-select">
        <option value="">ทุกสถานะ</option>
        <option value="active">กำลังใช้งาน</option>
        <option value="paused">หยุดชั่วคราว</option>
        <option value="ended">สิ้นสุดแล้ว</option>
      </select>
      <select v-model="typeFilter" class="filter-select">
        <option value="">ทุกประเภท</option>
        <option value="bonus">โบนัส</option>
        <option value="streak">ทำต่อเนื่อง</option>
        <option value="target">เป้าหมาย</option>
      </select>
    </div>

    <!-- Table -->
    <div class="table-container">
      <div v-if="isLoading" class="loading">
        <div class="skeleton" v-for="i in 6" :key="i" />
      </div>
      <table v-else-if="incentives.length" class="data-table">
        <thead>
          <tr>
            <th>ชื่อ</th>
            <th>ประเภท</th>
            <th>เป้าหมาย</th>
            <th>รางวัล</th>
            <th>ผู้เข้าร่วม</th>
            <th>สถานะ</th>
            <th>ระยะเวลา</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="inc in incentives"
            :key="inc.id"
            @click="viewIncentive(inc)"
          >
            <td>
              <span class="name">{{ inc.name }}</span>
            </td>
            <td>
              <span class="type-badge">{{
                getTypeLabel(inc.incentive_type)
              }}</span>
            </td>
            <td>{{ inc.target_value }} งาน</td>
            <td class="reward">{{ formatCurrency(inc.reward_amount) }}</td>
            <td>{{ inc.participants_count || 0 }}</td>
            <td>
              <span
                class="badge"
                :style="{
                  color: getStatusColor(inc.status),
                  background: getStatusColor(inc.status) + '20',
                }"
                >{{ getStatusLabel(inc.status) }}</span
              >
            </td>
            <td class="date">
              {{ formatDate(inc.start_date) }} - {{ formatDate(inc.end_date) }}
            </td>
            <td>
              <button
                v-if="inc.status === 'active' || inc.status === 'paused'"
                class="toggle-btn"
                @click.stop="toggleIncentiveStatus(inc)"
              >
                {{ inc.status === "active" ? "หยุด" : "เปิด" }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty"><p>ไม่พบ Incentive</p></div>
    </div>

    <!-- Create Modal -->
    <div
      v-if="showCreateModal"
      class="modal-overlay"
      @click.self="showCreateModal = false"
    >
      <div class="modal">
        <div class="modal-header">
          <h2>สร้าง Incentive ใหม่</h2>
          <button @click="showCreateModal = false">
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
            <label>ชื่อ *</label
            ><input
              v-model="newIncentive.name"
              placeholder="เช่น โบนัสวันหยุด"
            />
          </div>
          <div class="form-row">
            <label>รายละเอียด</label
            ><textarea
              v-model="newIncentive.description"
              placeholder="รายละเอียดเพิ่มเติม"
            ></textarea>
          </div>
          <div class="form-grid">
            <div class="form-row">
              <label>ประเภท</label>
              <select v-model="newIncentive.incentive_type">
                <option value="bonus">โบนัส</option>
                <option value="streak">ทำต่อเนื่อง</option>
                <option value="target">เป้าหมาย</option>
              </select>
            </div>
            <div class="form-row">
              <label>เป้าหมาย (งาน)</label
              ><input
                type="number"
                v-model.number="newIncentive.target_value"
                min="1"
              />
            </div>
          </div>
          <div class="form-row">
            <label>รางวัล (บาท)</label
            ><input
              type="number"
              v-model.number="newIncentive.reward_amount"
              min="1"
            />
          </div>
          <div class="form-grid">
            <div class="form-row">
              <label>วันเริ่มต้น *</label
              ><input type="date" v-model="newIncentive.start_date" />
            </div>
            <div class="form-row">
              <label>วันสิ้นสุด</label
              ><input type="date" v-model="newIncentive.end_date" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showCreateModal = false">
              ยกเลิก
            </button>
            <button
              class="btn-primary"
              @click="createIncentive"
              :disabled="
                processing || !newIncentive.name || !newIncentive.start_date
              "
            >
              {{ processing ? "กำลังสร้าง..." : "สร้าง Incentive" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div
      v-if="showModal && selectedIncentive"
      class="modal-overlay"
      @click.self="showModal = false"
    >
      <div class="modal">
        <div class="modal-header">
          <h2>{{ selectedIncentive.name }}</h2>
          <button @click="showModal = false">
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
          <div class="info-row">
            <span class="label">ประเภท</span
            ><span>{{ getTypeLabel(selectedIncentive.incentive_type) }}</span>
          </div>
          <div class="info-row">
            <span class="label">เป้าหมาย</span
            ><span>{{ selectedIncentive.target_value }} งาน</span>
          </div>
          <div class="info-row">
            <span class="label">รางวัล</span
            ><span class="reward">{{
              formatCurrency(selectedIncentive.reward_amount)
            }}</span>
          </div>
          <div class="info-row">
            <span class="label">สถานะ</span
            ><span
              class="badge"
              :style="{
                color: getStatusColor(selectedIncentive.status),
                background: getStatusColor(selectedIncentive.status) + '20',
              }"
              >{{ getStatusLabel(selectedIncentive.status) }}</span
            >
          </div>
          <div class="info-row">
            <span class="label">ระยะเวลา</span
            ><span
              >{{ formatDate(selectedIncentive.start_date) }} -
              {{ formatDate(selectedIncentive.end_date) }}</span
            >
          </div>
          <div class="info-row">
            <span class="label">ผู้เข้าร่วม</span
            ><span>{{ selectedIncentive.participants_count || 0 }} คน</span>
          </div>
          <div class="info-row">
            <span class="label">สำเร็จแล้ว</span
            ><span>{{ selectedIncentive.completed_count || 0 }} คน</span>
          </div>
          <div v-if="selectedIncentive.description" class="desc-box">
            <h4>รายละเอียด</h4>
            <p>{{ selectedIncentive.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.incentives-view {
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
.header-right {
  display: flex;
  gap: 12px;
}
.btn-create {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #00a86b;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
.name {
  font-weight: 500;
  color: #1f2937;
}
.type-badge {
  padding: 4px 10px;
  background: #ede9fe;
  color: #7c3aed;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}
.reward {
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
.toggle-btn {
  padding: 6px 12px;
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}
.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #9ca3af;
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
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
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
.form-row input,
.form-row select,
.form-row textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
}
.form-row textarea {
  min-height: 80px;
  resize: vertical;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}
.info-row .label {
  font-size: 13px;
  color: #6b7280;
}
.desc-box {
  margin-top: 16px;
}
.desc-box h4 {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
}
.desc-box p {
  padding: 16px;
  background: #f9fafb;
  border-radius: 10px;
  font-size: 14px;
  margin: 0;
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
