<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { supabase } from "@/lib/supabase";

interface Withdrawal {
  id: string;
  withdrawal_uid: string;
  user_name: string;
  user_email: string;
  amount: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  status: string;
  created_at: string;
}

const withdrawals = ref<Withdrawal[]>([]);
const loading = ref(false);
const activeFilter = ref<string | null>(null);

const stats = computed(() => {
  const result = {
    pending: 0,
    completed: 0,
    cancelled: 0,
    total: 0,
    totalAmount: 0,
  };
  withdrawals.value.forEach((w) => {
    result.total++;
    result.totalAmount += w.amount;
    if (w.status === "pending") result.pending++;
    else if (w.status === "completed") result.completed++;
    else if (w.status === "cancelled") result.cancelled++;
  });
  return result;
});

const filteredWithdrawals = computed(() => {
  let result = withdrawals.value;
  if (activeFilter.value) {
    result = result.filter((w) => w.status === activeFilter.value);
  }
  return result.sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
});

// Helper functions for styling
function getRowClass(status: string): string {
  const baseClass = "hover:bg-gray-50 transition-all duration-200";

  switch (status) {
    case "pending":
      return `${baseClass} bg-gradient-to-r from-yellow-50 to-transparent border-l-4 border-l-yellow-400`;
    case "completed":
      return `${baseClass} bg-gradient-to-r from-green-50 to-transparent border-l-4 border-l-green-400`;
    case "cancelled":
      return `${baseClass} bg-gradient-to-r from-gray-50 to-transparent border-l-4 border-l-gray-400`;
    default:
      return baseClass;
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    case "completed":
      return "bg-green-100 text-green-800 border border-green-200";
    case "cancelled":
      return "bg-gray-100 text-gray-800 border border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-200";
  }
}

function getDotClass(status: string): string {
  const baseClass = status === "pending" ? "animate-pulse" : "";

  switch (status) {
    case "pending":
      return `${baseClass} bg-yellow-500`;
    case "completed":
      return "bg-green-500";
    case "cancelled":
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "รอดำเนินการ";
    case "completed":
      return "สำเร็จ";
    case "cancelled":
      return "ยกเลิก";
    default:
      return status;
  }
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const { data, error } = await supabase.rpc(
      "admin_get_customer_withdrawals",
      {
        p_status: null,
        p_limit: 100,
        p_offset: 0,
      },
    );
    if (error) throw error;
    withdrawals.value = data || [];
  } catch (e) {
    console.error("Load failed:", e);
    alert("ไม่สามารถโหลดข้อมูลได้");
  } finally {
    loading.value = false;
  }
}

onMounted(() => load());
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8"
  >
    <!-- Enhanced Header -->
    <div class="mb-8">
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div
              class="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg"
            >
              <svg
                class="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            คำขอถอนเงิน
          </h1>
          <p class="text-gray-600 mt-2 flex items-center gap-2">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            ทั้งหมด {{ stats.total }} รายการ
          </p>
        </div>

        <!-- Action Button -->
        <button
          @click="load"
          :disabled="loading"
          class="min-h-[44px] px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2 disabled:opacity-50"
        >
          <svg
            class="w-5 h-5"
            :class="{ 'animate-spin': loading }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span class="hidden sm:inline">รีเฟรช</span>
        </button>
      </div>
    </div>

    <!-- Enhanced Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div
        class="bg-white px-6 py-4 rounded-xl shadow-sm border-l-4 border-l-blue-400 hover:shadow-md transition-shadow"
      >
        <div class="text-sm font-medium text-gray-600">ยอดรวม</div>
        <div class="text-3xl font-bold text-blue-600 mt-1">
          ฿{{ stats.totalAmount.toLocaleString() }}
        </div>
      </div>
      <div
        class="bg-white px-6 py-4 rounded-xl shadow-sm border-l-4 border-l-yellow-400 hover:shadow-md transition-shadow"
      >
        <div class="text-sm font-medium text-gray-600">รอดำเนินการ</div>
        <div class="text-3xl font-bold text-yellow-600 mt-1">
          {{ stats.pending }}
        </div>
      </div>
      <div
        class="bg-white px-6 py-4 rounded-xl shadow-sm border-l-4 border-l-green-400 hover:shadow-md transition-shadow"
      >
        <div class="text-sm font-medium text-gray-600">สำเร็จ</div>
        <div class="text-3xl font-bold text-green-600 mt-1">
          {{ stats.completed }}
        </div>
      </div>
      <div
        class="bg-white px-6 py-4 rounded-xl shadow-sm border-l-4 border-l-gray-400 hover:shadow-md transition-shadow"
      >
        <div class="text-sm font-medium text-gray-600">ยกเลิก</div>
        <div class="text-3xl font-bold text-gray-600 mt-1">
          {{ stats.cancelled }}
        </div>
      </div>
    </div>

    <!-- Enhanced Filter -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div class="flex items-center gap-4">
        <label for="status-filter" class="text-sm font-medium text-gray-700"
          >กรองตามสถานะ:</label
        >
        <select
          id="status-filter"
          v-model="activeFilter"
          class="flex-1 max-w-xs px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all min-h-[44px]"
        >
          <option :value="null">ทุกสถานะ</option>
          <option value="pending">รอดำเนินการ</option>
          <option value="completed">สำเร็จ</option>
          <option value="cancelled">ยกเลิก</option>
        </select>
      </div>
    </div>

    <!-- Enhanced Table -->
    <div
      class="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
    >
      <table class="w-full">
        <thead class="bg-gradient-to-r from-gray-50 to-gray-100">
          <tr>
            <th
              class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
            >
              <div class="flex items-center gap-2">
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                ลูกค้า
              </div>
            </th>
            <th
              class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
            >
              <div class="flex items-center gap-2">
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                จำนวนเงิน
              </div>
            </th>
            <th
              class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
            >
              <div class="flex items-center gap-2">
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                บัญชีธนาคาร
              </div>
            </th>
            <th
              class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
            >
              <div class="flex items-center gap-2">
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                สถานะ
              </div>
            </th>
            <th
              class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
            >
              <div class="flex items-center gap-2">
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                วันที่
              </div>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-if="loading">
            <td colspan="5" class="px-6 py-12 text-center text-gray-500">
              กำลังโหลด...
            </td>
          </tr>
          <tr v-else-if="filteredWithdrawals.length === 0">
            <td colspan="5" class="px-6 py-12 text-center text-gray-500">
              ไม่พบข้อมูล
            </td>
          </tr>
          <tr
            v-else
            v-for="w in filteredWithdrawals"
            :key="w.id"
            :class="getRowClass(w.status)"
            class="hover:bg-gray-50 transition-all duration-200"
          >
            <td class="px-6 py-5">
              <div class="text-sm font-semibold text-gray-900">
                {{ w.user_name || w.user_email }}
              </div>
              <div class="text-xs text-gray-500 mt-1">
                {{ w.withdrawal_uid }}
              </div>
            </td>
            <td class="px-6 py-5">
              <div class="text-base font-bold text-gray-900">
                ฿{{ w.amount.toLocaleString() }}
              </div>
            </td>
            <td class="px-6 py-5">
              <div class="text-sm font-medium text-gray-900">
                {{ w.bank_name }}
              </div>
              <div class="text-xs text-gray-500 mt-1">
                {{ w.bank_account_number }}
              </div>
              <div class="text-xs text-gray-500">{{ w.bank_account_name }}</div>
            </td>
            <td class="px-6 py-5">
              <span
                :class="getStatusClass(w.status)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm"
              >
                <span
                  :class="getDotClass(w.status)"
                  class="w-2 h-2 rounded-full"
                ></span>
                {{ getStatusLabel(w.status) }}
              </span>
            </td>
            <td class="px-6 py-5 text-sm text-gray-500">
              {{ new Date(w.created_at).toLocaleString("th-TH") }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
