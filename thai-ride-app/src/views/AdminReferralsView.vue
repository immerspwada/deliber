<script setup lang="ts">
/**
 * Admin Referrals View - Production Ready
 * =======================================
 * Referral program management with real database integration
 */
import { ref, computed, onMounted, watch } from "vue";
import { supabase } from "../lib/supabase";

const isLoading = ref(true);
const referrals = ref<any[]>([]);
const totalReferrals = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const statusFilter = ref("");

const stats = ref({
  total_referrals: 0,
  completed_referrals: 0,
  pending_referrals: 0,
  total_rewards_paid: 0,
  total_rewards_pending: 0,
  today_referrals: 0,
  this_month_referrals: 0,
  avg_conversion_days: 0,
});

const totalPages = computed(() =>
  Math.ceil(totalReferrals.value / pageSize.value)
);

async function loadReferrals() {
  isLoading.value = true;
  try {
    const offset = (currentPage.value - 1) * pageSize.value;
    const { data, error } = await (supabase.rpc as any)("admin_get_referrals", {
      p_status: statusFilter.value || null,
      p_limit: pageSize.value,
      p_offset: offset,
    });
    if (error) throw error;
    referrals.value = data || [];

    const { data: countData } = await (supabase.rpc as any)(
      "admin_count_referrals",
      {
        p_status: statusFilter.value || null,
      }
    );
    totalReferrals.value = countData || 0;
  } catch (e) {
    console.error("Failed to load referrals:", e);
  } finally {
    isLoading.value = false;
  }
}

async function loadStats() {
  try {
    const { data, error } = await (supabase.rpc as any)(
      "admin_get_referral_stats"
    );
    if (error) throw error;
    if (data && data.length > 0) stats.value = data[0];
  } catch (e) {
    console.error("Failed to load stats:", e);
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
    ({ completed: "#10B981", pending: "#F59E0B", expired: "#6B7280" } as any)[
      s
    ] || "#6B7280"
  );
}

function getStatusLabel(s: string) {
  return (
    (
      { completed: "สำเร็จ", pending: "รอดำเนินการ", expired: "หมดอายุ" } as any
    )[s] || s
  );
}

watch([statusFilter], () => {
  currentPage.value = 1;
  loadReferrals();
});
watch(currentPage, loadReferrals);
onMounted(() => {
  loadReferrals();
  loadStats();
});
</script>

<template>
  <div class="referrals-view">
    <div class="page-header">
      <div class="header-left">
        <h1>Referrals</h1>
        <span class="count">{{ totalReferrals }}</span>
      </div>
      <button
        class="refresh-btn"
        @click="
          loadReferrals();
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
        <div class="stat-icon green">
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
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.total_referrals }}</span
          ><span class="stat-label">ทั้งหมด</span>
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
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.completed_referrals }}</span
          ><span class="stat-label">สำเร็จ</span>
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
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.pending_referrals }}</span
          ><span class="stat-label">รอดำเนินการ</span>
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
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{
            formatCurrency(stats.total_rewards_paid)
          }}</span
          ><span class="stat-label">จ่ายแล้ว</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <select v-model="statusFilter" class="filter-select">
        <option value="">ทุกสถานะ</option>
        <option value="completed">สำเร็จ</option>
        <option value="pending">รอดำเนินการ</option>
      </select>
    </div>

    <!-- Table -->
    <div class="table-container">
      <div v-if="isLoading" class="loading">
        <div class="skeleton" v-for="i in 8" :key="i" />
      </div>
      <table v-else-if="referrals.length" class="data-table">
        <thead>
          <tr>
            <th>ผู้แนะนำ</th>
            <th>ผู้ถูกแนะนำ</th>
            <th>โค้ด</th>
            <th>รางวัล</th>
            <th>สถานะ</th>
            <th>วันที่</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in referrals" :key="r.id">
            <td>
              <div class="user-info">
                <span class="name">{{ r.referrer_name }}</span>
                <span class="uid">{{ r.referrer_member_uid }}</span>
              </div>
            </td>
            <td>
              <div class="user-info">
                <span class="name">{{ r.referred_name }}</span>
                <span class="uid">{{ r.referred_member_uid }}</span>
              </div>
            </td>
            <td>
              <code class="code">{{ r.referral_code }}</code>
            </td>
            <td class="reward">{{ formatCurrency(r.reward_amount) }}</td>
            <td>
              <span
                class="badge"
                :style="{
                  color: getStatusColor(r.status),
                  background: getStatusColor(r.status) + '20',
                }"
                >{{ getStatusLabel(r.status) }}</span
              >
            </td>
            <td class="date">{{ formatDate(r.created_at) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty"><p>ไม่พบข้อมูล Referrals</p></div>
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
  </div>
</template>

<style scoped>
.referrals-view {
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
.code {
  font-family: monospace;
  font-size: 13px;
  padding: 4px 8px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 4px;
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
</style>
