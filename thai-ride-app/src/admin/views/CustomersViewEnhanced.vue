<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8"
  >
    <!-- Header -->
    <div class="mb-8">
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div
              class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg"
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            จัดการลูกค้า
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
            ทั้งหมด {{ totalCount }} คน
          </p>
        </div>

        <!-- Stats Cards -->
        <div class="flex gap-4">
          <div
            class="bg-white px-6 py-4 rounded-xl shadow-sm border-l-4 border-l-green-400 hover:shadow-md transition-shadow"
          >
            <div class="text-sm font-medium text-gray-600">ใช้งานปกติ</div>
            <div class="text-3xl font-bold text-green-600 mt-1">
              {{ activeCount }}
            </div>
          </div>
          <div
            class="bg-white px-6 py-4 rounded-xl shadow-sm border-l-4 border-l-red-400 hover:shadow-md transition-shadow"
          >
            <div class="text-sm font-medium text-gray-600">ถูกระงับ</div>
            <div class="text-3xl font-bold text-red-600 mt-1">
              {{ suspendedCount }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div class="flex flex-wrap gap-4">
        <!-- Search -->
        <div class="flex-1 min-w-[300px]">
          <label for="search" class="sr-only">ค้นหา</label>
          <div class="relative">
            <div
              class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
            >
              <svg
                class="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              id="search"
              v-model="searchQuery"
              type="text"
              placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร..."
              class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              @input="debouncedSearch"
            />
          </div>
        </div>

        <!-- Status Filter -->
        <select
          v-model="statusFilter"
          class="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all min-h-[44px]"
          @change="loadCustomers"
        >
          <option value="">สถานะทั้งหมด</option>
          <option value="active">ใช้งานปกติ</option>
          <option value="suspended">ถูกระงับ</option>
          <option value="banned">ถูกแบน</option>
        </select>

        <!-- Bulk Actions -->
        <button
          v-if="selectedCustomers.length > 0"
          type="button"
          class="min-h-[44px] px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md font-medium flex items-center gap-2"
          @click="openBulkSuspendModal"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
          ระงับที่เลือก ({{ selectedCustomers.length }})
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="px-6 py-4">
      <div
        class="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
      >
        <!-- Loading State -->
        <div v-if="loading" class="p-8 text-center">
          <div
            class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"
          />
          <p class="mt-2 text-gray-600">กำลังโหลด...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-8 text-center">
          <p class="text-red-600">{{ error }}</p>
          <button
            type="button"
            class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            @click="loadCustomers"
          >
            ลองใหม่
          </button>
        </div>

        <!-- Empty State -->
        <div v-else-if="customers.length === 0" class="p-8 text-center">
          <p class="text-gray-600">ไม่พบข้อมูลลูกค้า</p>
        </div>

        <!-- Data Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th class="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    :checked="isAllSelected"
                    @change="toggleSelectAll"
                  />
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    ชื่อ
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
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    อีเมล
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
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    เบอร์โทร
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
                    วันที่สมัคร
                  </div>
                </th>
                <th
                  class="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider"
                >
                  <div class="flex items-center justify-end gap-2">
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
                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                      />
                    </svg>
                    จัดการ
                  </div>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr
                v-for="customer in customers"
                :key="customer.id"
                :class="getRowClass(customer.status)"
              >
                <td class="px-6 py-5">
                  <input
                    type="checkbox"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    :checked="selectedCustomers.includes(customer.id)"
                    @change="toggleSelect(customer.id)"
                  />
                </td>
                <td class="px-6 py-5 whitespace-nowrap">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm"
                    >
                      {{ getInitial(customer.full_name) }}
                    </div>
                    <div>
                      <div class="text-sm font-semibold text-gray-900">
                        {{ customer.full_name || "-" }}
                      </div>
                      <div class="text-xs text-gray-500 mt-0.5">
                        ID: {{ customer.id.slice(0, 8) }}...
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-5 text-gray-600">
                  {{ customer.email || "-" }}
                </td>
                <td class="px-6 py-5 text-gray-600">
                  {{ customer.phone_number || "-" }}
                </td>
                <td class="px-6 py-5">
                  <span
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm border"
                    :class="getStatusClass(customer.status)"
                  >
                    <span
                      :class="getDotClass(customer.status)"
                      class="w-2 h-2 rounded-full"
                    ></span>
                    {{ getStatusLabel(customer.status) }}
                  </span>
                </td>
                <td class="px-6 py-5 text-gray-600 text-sm">
                  {{ formatDate(customer.created_at) }}
                </td>
                <td class="px-6 py-5 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      class="min-h-[44px] min-w-[44px] p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow-md"
                      :aria-label="`ดูรายละเอียด ${customer.full_name || 'ลูกค้า'}`"
                      @click="viewCustomer(customer)"
                    >
                      <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </button>

                    <button
                      v-if="customer.status === 'active'"
                      type="button"
                      class="min-h-[44px] min-w-[44px] p-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-sm hover:shadow-md"
                      :aria-label="`ระงับ ${customer.full_name || 'ลูกค้า'}`"
                      @click="openSuspendModal(customer)"
                    >
                      <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                    </button>

                    <button
                      v-else-if="customer.status === 'suspended'"
                      type="button"
                      class="min-h-[44px] min-w-[44px] p-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm hover:shadow-md"
                      :aria-label="`ยกเลิกการระงับ ${customer.full_name || 'ลูกค้า'}`"
                      @click="openUnsuspendModal(customer)"
                    >
                      <svg
                        class="w-5 h-5"
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
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          v-if="totalPages > 1"
          class="px-6 py-4 border-t border-gray-200 flex items-center justify-between"
        >
          <div class="text-sm text-gray-600">
            แสดง {{ (currentPage - 1) * pageSize + 1 }} -
            {{ Math.min(currentPage * pageSize, totalCount) }} จาก
            {{ totalCount }}
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
              :disabled="currentPage === 1"
              @click="goToPage(currentPage - 1)"
            >
              ก่อนหน้า
            </button>
            <button
              type="button"
              class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
              :disabled="currentPage === totalPages"
              @click="goToPage(currentPage + 1)"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Suspension Modal -->
    <CustomerSuspensionModal
      :is-open="showSuspensionModal"
      :customer-ids="suspensionCustomerIds"
      :is-suspending="isSuspending"
      @close="closeSuspensionModal"
      @success="handleSuspensionSuccess"
    />

    <!-- Customer Detail Modal -->
    <CustomerDetailModal
      v-if="selectedCustomer"
      :is-open="showDetailModal"
      :customer="selectedCustomer"
      @close="showDetailModal = false"
      @suspend="openSuspendModal(selectedCustomer)"
      @unsuspend="openUnsuspendModal(selectedCustomer)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { supabase } from "@/lib/supabase";
import { useDebounceFn } from "@vueuse/core";
import { useToast } from "@/composables/useToast";
import { useErrorHandler } from "@/composables/useErrorHandler";
import CustomerSuspensionModal from "@/admin/components/CustomerSuspensionModal.vue";
import CustomerDetailModal from "@/admin/components/CustomerDetailModal.vue";

interface Customer {
  id: string;
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
  status: string;
  created_at: string;
  suspended_at: string | null;
  suspension_reason: string | null;
}

const { showSuccess, showError } = useToast();
const errorHandler = useErrorHandler();

// State
const customers = ref<Customer[]>([]);
const totalCount = ref(0);
const loading = ref(false);
const error = ref<string | null>(null);

// Filters
const searchQuery = ref("");
const statusFilter = ref("");
const currentPage = ref(1);
const pageSize = ref(20);

// Selection
const selectedCustomers = ref<string[]>([]);

// Modals
const showSuspensionModal = ref(false);
const suspensionCustomerIds = ref<string[]>([]);
const isSuspending = ref(true);
const showDetailModal = ref(false);
const selectedCustomer = ref<Customer | null>(null);

// Realtime subscription
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

// Computed
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value));

const activeCount = computed(
  () => customers.value.filter((c) => c.status === "active").length,
);

const suspendedCount = computed(
  () => customers.value.filter((c) => c.status === "suspended").length,
);

const isAllSelected = computed(
  () =>
    customers.value.length > 0 &&
    selectedCustomers.value.length === customers.value.length,
);

// Methods
async function loadCustomers() {
  loading.value = true;
  error.value = null;

  try {
    const { data, error: rpcError } = await supabase.rpc(
      "admin_get_customers",
      {
        p_search: searchQuery.value || null,
        p_status: statusFilter.value ? [statusFilter.value] : null,
        p_limit: pageSize.value,
        p_offset: (currentPage.value - 1) * pageSize.value,
      },
    );

    if (rpcError) throw rpcError;

    customers.value = data || [];

    // Get total count from users table
    const { count } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "customer");

    totalCount.value = count || 0;
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Failed to load customers";
    errorHandler.handle(err, "loadCustomers");
  } finally {
    loading.value = false;
  }
}

const debouncedSearch = useDebounceFn(() => {
  currentPage.value = 1;
  loadCustomers();
}, 300);

function toggleSelect(customerId: string) {
  const index = selectedCustomers.value.indexOf(customerId);
  if (index > -1) {
    selectedCustomers.value.splice(index, 1);
  } else {
    selectedCustomers.value.push(customerId);
  }
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedCustomers.value = [];
  } else {
    selectedCustomers.value = customers.value.map((c) => c.id);
  }
}

function viewCustomer(customer: Customer) {
  selectedCustomer.value = customer;
  showDetailModal.value = true;
}

function openSuspendModal(customer: Customer) {
  suspensionCustomerIds.value = [customer.id];
  isSuspending.value = true;
  showSuspensionModal.value = true;
}

function openUnsuspendModal(customer: Customer) {
  suspensionCustomerIds.value = [customer.id];
  isSuspending.value = false;
  showSuspensionModal.value = true;
}

function openBulkSuspendModal() {
  suspensionCustomerIds.value = [...selectedCustomers.value];
  isSuspending.value = true;
  showSuspensionModal.value = true;
}

function closeSuspensionModal() {
  showSuspensionModal.value = false;
  suspensionCustomerIds.value = [];
}

function handleSuspensionSuccess() {
  showSuccess(
    isSuspending.value ? "ระงับผู้ใช้งานสำเร็จ" : "ยกเลิกการระงับสำเร็จ",
  );
  selectedCustomers.value = [];
  showDetailModal.value = false;
  loadCustomers();
}

function goToPage(page: number) {
  currentPage.value = page;
  loadCustomers();
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "ใช้งานปกติ",
    suspended: "ถูกระงับ",
    banned: "ถูกแบน",
  };
  return labels[status] || status;
}

function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    active: "bg-green-100 text-green-800 border-green-200",
    suspended: "bg-red-100 text-red-800 border-red-200",
    banned: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return classes[status] || "bg-gray-100 text-gray-800 border-gray-200";
}

function getRowClass(status: string): string {
  const baseClass = "hover:bg-gray-50 transition-all duration-200";

  switch (status) {
    case "active":
      return `${baseClass} bg-gradient-to-r from-green-50 to-transparent border-l-4 border-l-green-400`;
    case "suspended":
      return `${baseClass} bg-gradient-to-r from-red-50 to-transparent border-l-4 border-l-red-400`;
    case "banned":
      return `${baseClass} bg-gradient-to-r from-gray-50 to-transparent border-l-4 border-l-gray-400`;
    default:
      return baseClass;
  }
}

function getDotClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-green-500";
    case "suspended":
      return "bg-red-500 animate-pulse";
    case "banned":
      return "bg-gray-500";
    default:
      return "bg-gray-400";
  }
}

function getInitial(name: string | null): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Setup realtime subscription
function setupRealtime() {
  realtimeChannel = supabase
    .channel("admin-customers")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "profiles",
        filter: "role=eq.customer",
      },
      (payload) => {
        console.log("Customer change detected:", payload);
        loadCustomers();
      },
    )
    .subscribe();
}

// Lifecycle
onMounted(() => {
  loadCustomers();
  setupRealtime();
});

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }
});

// Watch filters
watch([statusFilter], () => {
  currentPage.value = 1;
  loadCustomers();
});
</script>
