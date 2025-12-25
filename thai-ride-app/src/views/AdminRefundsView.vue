<script setup lang="ts">
/**
 * AdminRefundsView - Refund Management Dashboard
 * Feature: F24 - Admin Refund Management
 *
 * Capabilities:
 * - View all refunds with filters
 * - Manual refund processing
 * - Refund statistics
 */
import { ref, computed, onMounted } from "vue";
import {
  AdminCard,
  AdminTable,
  AdminStatCard,
  AdminButton,
  AdminModal,
  AdminStatusBadge,
} from "../components/admin";
import AdminLayout from "../components/AdminLayout.vue";
import { supabase } from "../lib/supabase";
import { useAdminCleanup } from "../composables/useAdminCleanup";

// Initialize cleanup utility - Task 13
const { addCleanup } = useAdminCleanup();

interface Refund {
  id: string;
  user_id: string;
  service_type: string;
  service_id: string;
  original_amount: number;
  cancellation_fee: number;
  refund_amount: number;
  refund_method: string;
  status: string;
  reason: string;
  created_at: string;
  user?: { name: string; phone: string; member_uid: string };
}

interface RefundStats {
  total_refunds: number;
  total_amount: number;
  total_fees: number;
  pending_count: number;
}

const loading = ref(false);
const refunds = ref<Refund[]>([]);
const stats = ref<RefundStats>({
  total_refunds: 0,
  total_amount: 0,
  total_fees: 0,
  pending_count: 0,
});

// Filters
const filterStatus = ref("all");
const filterService = ref("all");
const searchQuery = ref("");
const dateRange = ref({ start: "", end: "" });

// Manual refund modal
const showManualRefund = ref(false);
const manualRefundForm = ref({
  userId: "",
  amount: 0,
  reason: "",
  serviceType: "ride",
  serviceId: "",
});
const manualRefundLoading = ref(false);

const statusOptions = [
  { value: "all", label: "ทั้งหมด" },
  { value: "pending", label: "รอดำเนินการ" },
  { value: "processing", label: "กำลังดำเนินการ" },
  { value: "completed", label: "สำเร็จ" },
  { value: "failed", label: "ล้มเหลว" },
];

const serviceOptions = [
  { value: "all", label: "ทุกบริการ" },
  { value: "ride", label: "เรียกรถ" },
  { value: "delivery", label: "ส่งของ" },
  { value: "shopping", label: "ซื้อของ" },
  { value: "queue", label: "จองคิว" },
  { value: "moving", label: "ขนย้าย" },
  { value: "laundry", label: "ซักผ้า" },
];

const filteredRefunds = computed(() => {
  return refunds.value.filter((r) => {
    if (filterStatus.value !== "all" && r.status !== filterStatus.value)
      return false;
    if (filterService.value !== "all" && r.service_type !== filterService.value)
      return false;
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      const userName = r.user?.name?.toLowerCase() || "";
      const memberUid = r.user?.member_uid?.toLowerCase() || "";
      if (!userName.includes(q) && !memberUid.includes(q) && !r.id.includes(q))
        return false;
    }
    return true;
  });
});

const fetchRefunds = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from("refunds")
      .select(`*, user:user_id (name, phone, member_uid)`)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!error && data) refunds.value = data;
  } catch (e) {
    console.error("Error fetching refunds:", e);
  }
  loading.value = false;
};

const fetchStats = async () => {
  try {
    const { data } = await supabase.rpc("get_refund_stats");
    if (data) {
      stats.value = {
        total_refunds: data.total_refunds || 0,
        total_amount: data.total_refund_amount || 0,
        total_fees: data.total_fees_collected || 0,
        pending_count: refunds.value.filter((r) => r.status === "pending")
          .length,
      };
    }
  } catch (e) {
    // Calculate from local data
    stats.value = {
      total_refunds: refunds.value.length,
      total_amount: refunds.value.reduce((sum, r) => sum + r.refund_amount, 0),
      total_fees: refunds.value.reduce((sum, r) => sum + r.cancellation_fee, 0),
      pending_count: refunds.value.filter((r) => r.status === "pending").length,
    };
  }
};

const processManualRefund = async () => {
  if (!manualRefundForm.value.userId || manualRefundForm.value.amount <= 0)
    return;

  manualRefundLoading.value = true;
  try {
    const { error } = await supabase.rpc("process_wallet_refund", {
      p_user_id: manualRefundForm.value.userId,
      p_service_type: manualRefundForm.value.serviceType,
      p_service_id: manualRefundForm.value.serviceId || crypto.randomUUID(),
      p_original_amount: manualRefundForm.value.amount,
      p_cancellation_fee: 0,
      p_reason: manualRefundForm.value.reason || "Manual refund by admin",
    });

    if (!error) {
      showManualRefund.value = false;
      manualRefundForm.value = {
        userId: "",
        amount: 0,
        reason: "",
        serviceType: "ride",
        serviceId: "",
      };
      await fetchRefunds();
      await fetchStats();
    }
  } catch (e) {
    console.error("Manual refund error:", e);
  }
  manualRefundLoading.value = false;
};

const getStatusVariant = (status: string) => {
  const map: Record<string, string> = {
    pending: "warning",
    processing: "info",
    completed: "success",
    failed: "danger",
  };
  return map[status] || "secondary";
};

const getServiceLabel = (type: string) => {
  const map: Record<string, string> = {
    ride: "เรียกรถ",
    delivery: "ส่งของ",
    shopping: "ซื้อของ",
    queue: "จองคิว",
    moving: "ขนย้าย",
    laundry: "ซักผ้า",
  };
  return map[type] || type;
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d
    .getHours()
    .toString()
    .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

// Register cleanup - Task 13
addCleanup(() => {
  refunds.value = [];
  stats.value = {
    total_refunds: 0,
    total_amount: 0,
    total_fees: 0,
    pending_count: 0,
  };
  filterStatus.value = "all";
  filterService.value = "all";
  searchQuery.value = "";
  dateRange.value = { start: "", end: "" };
  showManualRefund.value = false;
  manualRefundForm.value = {
    userId: "",
    amount: 0,
    reason: "",
    serviceType: "ride",
    serviceId: "",
  };
  loading.value = false;
  console.log("[AdminRefundsView] Cleanup complete");
});

onMounted(async () => {
  await fetchRefunds();
  await fetchStats();
});
</script>

<template>
  <AdminLayout>
    <div class="refunds-page">
      <div class="page-header">
        <h1>จัดการการคืนเงิน</h1>
        <AdminButton variant="primary" @click="showManualRefund = true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            width="18"
            height="18"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          คืนเงินด้วยตนเอง
        </AdminButton>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <AdminStatCard
          title="รายการคืนเงินทั้งหมด"
          :value="stats.total_refunds"
          icon="receipt"
        />
        <AdminStatCard
          title="ยอดคืนเงินรวม"
          :value="`฿${stats.total_amount.toLocaleString()}`"
          icon="wallet"
          variant="success"
        />
        <AdminStatCard
          title="ค่าธรรมเนียมรวม"
          :value="`฿${stats.total_fees.toLocaleString()}`"
          icon="coins"
          variant="warning"
        />
        <AdminStatCard
          title="รอดำเนินการ"
          :value="stats.pending_count"
          icon="clock"
          variant="info"
        />
      </div>

      <!-- Filters -->
      <AdminCard title="ตัวกรอง" class="filters-card">
        <div class="filters-row">
          <div class="filter-group">
            <label>สถานะ</label>
            <select v-model="filterStatus">
              <option
                v-for="opt in statusOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
          <div class="filter-group">
            <label>ประเภทบริการ</label>
            <select v-model="filterService">
              <option
                v-for="opt in serviceOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
          <div class="filter-group search">
            <label>ค้นหา</label>
            <input
              v-model="searchQuery"
              placeholder="ชื่อ, Member UID, Refund ID..."
            />
          </div>
        </div>
      </AdminCard>

      <!-- Refunds Table -->
      <AdminCard title="รายการคืนเงิน" :loading="loading">
        <div class="table-container">
          <table class="refunds-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>ลูกค้า</th>
                <th>บริการ</th>
                <th>ยอดเดิม</th>
                <th>ค่าธรรมเนียม</th>
                <th>ยอดคืน</th>
                <th>สถานะ</th>
                <th>เหตุผล</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="refund in filteredRefunds" :key="refund.id">
                <td class="date-cell">{{ formatDate(refund.created_at) }}</td>
                <td class="user-cell">
                  <div class="user-info">
                    <span class="user-name">{{
                      refund.user?.name || "-"
                    }}</span>
                    <span class="member-uid">{{
                      refund.user?.member_uid || "-"
                    }}</span>
                  </div>
                </td>
                <td>
                  <span class="service-badge" :class="refund.service_type">
                    {{ getServiceLabel(refund.service_type) }}
                  </span>
                </td>
                <td class="amount">
                  ฿{{ refund.original_amount.toLocaleString() }}
                </td>
                <td class="fee">
                  -฿{{ refund.cancellation_fee.toLocaleString() }}
                </td>
                <td class="refund-amount">
                  ฿{{ refund.refund_amount.toLocaleString() }}
                </td>
                <td>
                  <AdminStatusBadge
                    :status="refund.status"
                    :variant="getStatusVariant(refund.status)"
                  />
                </td>
                <td class="reason-cell">{{ refund.reason || "-" }}</td>
              </tr>
              <tr v-if="filteredRefunds.length === 0">
                <td colspan="8" class="empty-state">ไม่พบรายการคืนเงิน</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AdminCard>

      <!-- Manual Refund Modal -->
      <AdminModal v-model="showManualRefund" title="คืนเงินด้วยตนเอง" size="md">
        <div class="manual-refund-form">
          <div class="form-group">
            <label>User ID</label>
            <input
              v-model="manualRefundForm.userId"
              placeholder="UUID ของผู้ใช้"
            />
          </div>
          <div class="form-group">
            <label>จำนวนเงิน (บาท)</label>
            <input
              v-model.number="manualRefundForm.amount"
              type="number"
              min="1"
            />
          </div>
          <div class="form-group">
            <label>ประเภทบริการ</label>
            <select v-model="manualRefundForm.serviceType">
              <option value="ride">เรียกรถ</option>
              <option value="delivery">ส่งของ</option>
              <option value="shopping">ซื้อของ</option>
              <option value="other">อื่นๆ</option>
            </select>
          </div>
          <div class="form-group">
            <label>เหตุผล</label>
            <textarea
              v-model="manualRefundForm.reason"
              rows="3"
              placeholder="ระบุเหตุผลในการคืนเงิน"
            ></textarea>
          </div>
        </div>
        <template #footer>
          <AdminButton variant="secondary" @click="showManualRefund = false"
            >ยกเลิก</AdminButton
          >
          <AdminButton
            variant="primary"
            :loading="manualRefundLoading"
            @click="processManualRefund"
          >
            ยืนยันคืนเงิน
          </AdminButton>
        </template>
      </AdminModal>
    </div>
  </AdminLayout>
</template>

<style scoped>
.refunds-page {
  padding: 24px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.filters-card {
  margin-bottom: 24px;
}
.filters-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 150px;
}
.filter-group.search {
  flex: 1;
  min-width: 200px;
}
.filter-group label {
  font-size: 13px;
  font-weight: 500;
  color: #666;
}
.filter-group select,
.filter-group input {
  padding: 10px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
}

.table-container {
  overflow-x: auto;
}
.refunds-table {
  width: 100%;
  border-collapse: collapse;
}
.refunds-table th,
.refunds-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}
.refunds-table th {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  background: #fafafa;
}
.refunds-table td {
  font-size: 14px;
  color: #1a1a1a;
}

.date-cell {
  white-space: nowrap;
  color: #666;
  font-size: 13px;
}
.user-cell .user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.user-name {
  font-weight: 500;
}
.member-uid {
  font-size: 12px;
  color: #999;
  font-family: monospace;
}

.service-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}
.service-badge.ride {
  background: #e8f5ef;
  color: #00a86b;
}
.service-badge.delivery {
  background: #e3f2fd;
  color: #1976d2;
}
.service-badge.shopping {
  background: #fff3e0;
  color: #f57c00;
}
.service-badge.queue {
  background: #f3e5f5;
  color: #9c27b0;
}
.service-badge.moving {
  background: #ffebee;
  color: #e53935;
}
.service-badge.laundry {
  background: #e0f7fa;
  color: #00acc1;
}

.amount {
  font-weight: 500;
}
.fee {
  color: #e53935;
}
.refund-amount {
  font-weight: 600;
  color: #00a86b;
}
.reason-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #666;
}
.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}

.manual-refund-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}
.form-group input,
.form-group select,
.form-group textarea {
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 14px;
}
.form-group textarea {
  resize: vertical;
}
</style>
