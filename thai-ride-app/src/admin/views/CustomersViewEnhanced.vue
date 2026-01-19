<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">จัดการลูกค้า</h1>
          <p class="text-sm text-gray-600 mt-1">
            ทั้งหมด {{ totalCount }} คน
          </p>
        </div>
        
        <!-- Stats -->
        <div class="flex gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ activeCount }}</div>
            <div class="text-xs text-gray-600">ใช้งานปกติ</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-red-600">{{ suspendedCount }}</div>
            <div class="text-xs text-gray-600">ถูกระงับ</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex flex-wrap gap-4">
        <!-- Search -->
        <div class="flex-1 min-w-[300px]">
          <label for="search" class="sr-only">ค้นหา</label>
          <input
            id="search"
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร..."
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @input="debouncedSearch"
          />
        </div>

        <!-- Status Filter -->
        <select
          v-model="statusFilter"
          class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors min-h-[44px]"
          @click="openBulkSuspendModal"
        >
          ระงับที่เลือก ({{ selectedCustomers.length }})
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="px-6 py-4">
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <!-- Loading State -->
        <div v-if="loading" class="p-8 text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
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
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    :checked="isAllSelected"
                    @change="toggleSelectAll"
                  />
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">ชื่อ</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">อีเมล</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">เบอร์โทร</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">สถานะ</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">วันที่สมัคร</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr
                v-for="customer in customers"
                :key="customer.id"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="px-4 py-3">
                  <input
                    type="checkbox"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    :checked="selectedCustomers.includes(customer.id)"
                    @change="toggleSelect(customer.id)"
                  />
                </td>
                <td class="px-4 py-3">
                  <div class="font-medium text-gray-900">{{ customer.full_name || '-' }}</div>
                </td>
                <td class="px-4 py-3 text-gray-600">{{ customer.email || '-' }}</td>
                <td class="px-4 py-3 text-gray-600">{{ customer.phone_number || '-' }}</td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="getStatusClass(customer.status)"
                  >
                    {{ getStatusLabel(customer.status) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-600 text-sm">
                  {{ formatDate(customer.created_at) }}
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
                      :aria-label="`ดูรายละเอียด ${customer.full_name}`"
                      @click="viewCustomer(customer)"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    
                    <button
                      v-if="customer.status === 'active'"
                      type="button"
                      class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
                      :aria-label="`ระงับ ${customer.full_name}`"
                      @click="openSuspendModal(customer)"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                    
                    <button
                      v-else-if="customer.status === 'suspended'"
                      type="button"
                      class="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
                      :aria-label="`ยกเลิกการระงับ ${customer.full_name}`"
                      @click="openUnsuspendModal(customer)"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div class="text-sm text-gray-600">
            แสดง {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, totalCount) }} จาก {{ totalCount }}
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { supabase } from '@/lib/supabase';
import { useDebounceFn } from '@vueuse/core';
import { useToast } from '@/composables/useToast';
import { useErrorHandler } from '@/composables/useErrorHandler';
import CustomerSuspensionModal from '@/admin/components/CustomerSuspensionModal.vue';
import CustomerDetailModal from '@/admin/components/CustomerDetailModal.vue';

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
const searchQuery = ref('');
const statusFilter = ref('');
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

const activeCount = computed(() => 
  customers.value.filter(c => c.status === 'active').length
);

const suspendedCount = computed(() => 
  customers.value.filter(c => c.status === 'suspended').length
);

const isAllSelected = computed(() => 
  customers.value.length > 0 && selectedCustomers.value.length === customers.value.length
);

// Methods
async function loadCustomers() {
  loading.value = true;
  error.value = null;

  try {
    const { data, error: rpcError } = await supabase.rpc('admin_get_customers', {
      p_search: searchQuery.value || null,
      p_status: statusFilter.value ? [statusFilter.value] : null,
      p_limit: pageSize.value,
      p_offset: (currentPage.value - 1) * pageSize.value,
    });

    if (rpcError) throw rpcError;

    customers.value = data || [];

    // Get total count from users table
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer');

    totalCount.value = count || 0;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load customers';
    errorHandler.handle(err, 'loadCustomers');
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
    selectedCustomers.value = customers.value.map(c => c.id);
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
  showSuccess(isSuspending.value ? 'ระงับผู้ใช้งานสำเร็จ' : 'ยกเลิกการระงับสำเร็จ');
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
    active: 'ใช้งานปกติ',
    suspended: 'ถูกระงับ',
    banned: 'ถูกแบน',
  };
  return labels[status] || status;
}

function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
    banned: 'bg-gray-100 text-gray-800',
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Setup realtime subscription
function setupRealtime() {
  realtimeChannel = supabase
    .channel('admin-customers')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: 'role=eq.customer',
      },
      (payload) => {
        console.log('Customer change detected:', payload);
        loadCustomers();
      }
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
