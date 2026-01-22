<script setup lang="ts">
/**
 * Admin Providers View
 * ====================
 * จัดการผู้ให้บริการทั้งหมด
 * 
 * Updated to use new useAdminProviders composable with RPC functions
 * Added real-time subscriptions for provider status changes
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAdminProviders } from '@/admin/composables/useAdminProviders'
import { useAdminUIStore } from '../stores/adminUI.store'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useToast } from '@/composables/useToast'
import { useAdminRealtime } from '@/admin/composables/useAdminRealtime'
import ProviderCommissionModal from '@/admin/components/ProviderCommissionModal.vue'

const uiStore = useAdminUIStore()
const errorHandler = useErrorHandler()
const { showSuccess, showError } = useToast()
const realtime = useAdminRealtime()

// Use new composable
const {
  providers,
  totalCount,
  loading,
  error,
  fetchProviders,
  fetchCount,
  approveProvider: approveProviderAction,
  rejectProvider: rejectProviderAction,
  suspendProvider: suspendProviderAction,
  formatCurrency,
  formatDate,
  getStatusLabel,
  getStatusColor,
  getProviderTypeLabel,
  pendingProviders,
  approvedProviders,
  rejectedProviders,
  suspendedProviders,
  onlineProviders
} = useAdminProviders()

// Pagination state
const currentPage = ref(1)
const pageSize = ref(20)
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

// Filter state
const searchQuery = ref('')
const statusFilter = ref<'pending' | 'approved' | 'rejected' | 'suspended' | ''>('')
const typeFilter = ref<'ride' | 'delivery' | 'shopping' | 'all' | ''>('')

// UI state
const selectedProvider = ref<any | null>(null)
const showDetailModal = ref(false)
const showActionModal = ref(false)
const showCommissionModal = ref(false)
const actionType = ref<'approve' | 'reject' | 'suspend'>('approve')
const actionReason = ref('')
const isProcessing = ref(false)

// Computed filters
const filters = computed(() => ({
  status: statusFilter.value || undefined,
  provider_type: typeFilter.value || undefined,
  limit: pageSize.value,
  offset: (currentPage.value - 1) * pageSize.value
}))

// Helper function for row styling
function getProviderRowClass(status: string): string {
  const baseClass = "";
  
  switch (status) {
    case "pending":
      return `${baseClass} bg-gradient-to-r from-yellow-50 to-transparent border-l-4 border-l-yellow-400`;
    case "approved":
      return `${baseClass} bg-gradient-to-r from-green-50 to-transparent border-l-4 border-l-green-400`;
    case "rejected":
      return `${baseClass} bg-gradient-to-r from-red-50 to-transparent border-l-4 border-l-red-400`;
    case "suspended":
      return `${baseClass} bg-gradient-to-r from-gray-50 to-transparent border-l-4 border-l-gray-400`;
    default:
      return baseClass;
  }
}

// Load providers with error handling
async function loadProviders() {
  try {
    await fetchProviders(filters.value)
    await fetchCount({
      status: statusFilter.value || undefined,
      providerType: typeFilter.value || undefined
    })
  } catch (e) {
    errorHandler.handle(e, 'loadProviders')
  }
}

function viewProvider(provider: any) {
  selectedProvider.value = provider
  showDetailModal.value = true
}

function openActionModal(provider: any, action: 'approve' | 'reject' | 'suspend') {
  selectedProvider.value = provider
  actionType.value = action
  actionReason.value = ''
  showActionModal.value = true
}

function openCommissionModal(provider: any) {
  selectedProvider.value = provider
  showCommissionModal.value = true
}

function handleCommissionUpdated() {
  loadProviders()
}

async function executeAction() {
  if (!selectedProvider.value) return
  
  if ((actionType.value === 'reject' || actionType.value === 'suspend') && !actionReason.value.trim()) {
    showError('กรุณาระบุเหตุผล')
    return
  }
  
  isProcessing.value = true
  try {
    if (actionType.value === 'approve') {
      await approveProviderAction(selectedProvider.value.id, actionReason.value || 'อนุมัติโดยแอดมิน')
      showSuccess('อนุมัติผู้ให้บริการเรียบร้อยแล้ว')
    } else if (actionType.value === 'reject') {
      await rejectProviderAction(selectedProvider.value.id, actionReason.value)
      showSuccess('ปฏิเสธผู้ให้บริการเรียบร้อยแล้ว')
    } else if (actionType.value === 'suspend') {
      await suspendProviderAction(selectedProvider.value.id, actionReason.value)
      showSuccess('ระงับผู้ให้บริการเรียบร้อยแล้ว')
    }
    
    showActionModal.value = false
    showDetailModal.value = false
    await loadProviders()
  } catch (e) {
    errorHandler.handle(e, 'executeAction')
  } finally {
    isProcessing.value = false
  }
}

// Setup real-time subscriptions
const setupRealtime = () => {
  realtime.subscribeToProviders((table, eventType) => {
    console.log(`[ProvidersView] Realtime update: ${table} ${eventType}`)
    // Reload providers when changes occur
    loadProviders()
  })
}

// Watch for filter changes
watch([searchQuery, statusFilter, typeFilter], () => {
  currentPage.value = 1
  loadProviders()
})

watch(currentPage, loadProviders)

onMounted(() => {
  uiStore.setBreadcrumbs([{ label: 'Users', path: '/admin/providers' }, { label: 'ผู้ให้บริการ' }])
  loadProviders()
  setupRealtime()
})

onUnmounted(() => {
  realtime.unsubscribe()
})
</script>

<template>
  <div class="providers-view min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            ผู้ให้บริการ
          </h1>
          <p class="text-gray-600 mt-2 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            ทั้งหมด {{ totalCount.toLocaleString() }} คน
            <span
              class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all"
              :class="realtime.isConnected.value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'"
              :title="realtime.isConnected.value ? 'Real-time connected' : 'Connecting...'"
            >
              <span class="w-2 h-2 rounded-full" :class="realtime.isConnected.value ? 'bg-green-500 animate-pulse' : 'bg-gray-400'"></span>
              {{ realtime.isConnected.value ? 'Live' : '...' }}
            </span>
          </p>
        </div>
        
        <button 
          class="min-h-[44px] px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
          @click="loadProviders" 
          :disabled="loading" 
          aria-label="รีเฟรช"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          รีเฟรช
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white px-6 py-4 rounded-xl shadow-sm border-l-4 border-l-yellow-400 hover:shadow-md transition-shadow">
          <div class="text-sm font-medium text-gray-600">รอตรวจสอบ</div>
          <div class="text-3xl font-bold text-yellow-600 mt-1">{{ pendingProviders.length }}</div>
        </div>
        <div class="bg-white px-6 py-4 rounded-xl shadow-sm border-l-4 border-l-green-400 hover:shadow-md transition-shadow">
          <div class="text-sm font-medium text-gray-600">อนุมัติแล้ว</div>
          <div class="text-3xl font-bold text-green-600 mt-1">{{ approvedProviders.length }}</div>
        </div>
        <div class="bg-white px-6 py-4 rounded-xl shadow-sm border-l-4 border-l-blue-400 hover:shadow-md transition-shadow">
          <div class="text-sm font-medium text-gray-600">ออนไลน์</div>
          <div class="text-3xl font-bold text-blue-600 mt-1">{{ onlineProviders.length }}</div>
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
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="search"
              v-model="searchQuery"
              type="text"
              placeholder="ค้นหาชื่อ, เบอร์โทร..."
              class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              aria-label="ค้นหาผู้ให้บริการ"
            />
          </div>
        </div>

        <!-- Status Filter -->
        <select
          v-model="statusFilter"
          class="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all min-h-[44px]"
          aria-label="กรองตามสถานะ"
        >
          <option value="">ทุกสถานะ</option>
          <option value="pending">รอตรวจสอบ</option>
          <option value="approved">อนุมัติแล้ว</option>
          <option value="rejected">ปฏิเสธ</option>
          <option value="suspended">ระงับ</option>
        </select>

        <!-- Type Filter -->
        <select
          v-model="typeFilter"
          class="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all min-h-[44px]"
          aria-label="กรองตามประเภท"
        >
          <option value="">ทุกประเภท</option>
          <option value="ride">Ride</option>
          <option value="delivery">Delivery</option>
          <option value="shopping">Shopping</option>
          <option value="all">All Services</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <!-- Loading State -->
      <div v-if="loading" class="p-8 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" />
        <p class="mt-2 text-gray-600">กำลังโหลด...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="p-8 text-center">
        <svg class="w-12 h-12 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="mt-4 text-gray-600">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
        <button
          class="mt-4 min-h-[44px] px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-sm hover:shadow-md"
          @click="loadProviders"
        >
          ลองใหม่
        </button>
      </div>

      <!-- Data Table -->
      <div v-else-if="providers.length > 0" class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  ผู้ให้บริการ
                </div>
              </th>
              <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  ประเภท
                </div>
              </th>
              <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  สถานะ
                </div>
              </th>
              <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  คอมมิชชั่น
                </div>
              </th>
              <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                  ออนไลน์
                </div>
              </th>
              <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  คะแนน
                </div>
              </th>
              <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  รายได้
                </div>
              </th>
              <th class="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                <div class="flex items-center justify-end gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                  จัดการ
                </div>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="provider in providers"
              :key="provider.id"
              class="hover:bg-gray-50 transition-all duration-200 cursor-pointer"
              :class="getProviderRowClass(provider.status)"
              @click="viewProvider(provider)"
            >
              <td class="px-6 py-5">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                    {{ (provider.first_name || 'P').charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="text-sm font-bold text-gray-900">
                      {{ provider.first_name }} {{ provider.last_name }}
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                      {{ provider.phone_number || '-' }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-5">
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-sm">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {{ getProviderTypeLabel(provider.provider_type) }}
                </span>
              </td>
              <td class="px-6 py-5">
                <span
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm border"
                  :style="{ color: getStatusColor(provider.status), background: getStatusColor(provider.status) + '20', borderColor: getStatusColor(provider.status) + '40' }"
                >
                  <span 
                    class="w-2 h-2 rounded-full" 
                    :class="provider.status === 'pending' ? 'animate-pulse' : ''"
                    :style="{ background: getStatusColor(provider.status) }"
                  ></span>
                  {{ getStatusLabel(provider.status) }}
                </span>
              </td>
              <td class="px-6 py-5">
                <span
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm"
                  :class="provider.commission_type === 'fixed' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 'bg-blue-100 text-blue-800 border border-blue-200'"
                >
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {{ provider.commission_type === 'fixed' ? `${provider.commission_value || 20} ฿` : `${provider.commission_value || 20}%` }}
                </span>
              </td>
              <td class="px-6 py-5">
                <span
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  :class="provider.is_online ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'"
                >
                  <span class="w-2 h-2 rounded-full" :class="provider.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'"></span>
                  {{ provider.is_online ? 'ออนไลน์' : 'ออฟไลน์' }}
                </span>
              </td>
              <td class="px-6 py-5">
                <div class="flex items-center gap-1.5">
                  <svg class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span class="text-sm font-bold text-gray-900">
                    {{ provider.rating?.toFixed(1) || '-' }}
                  </span>
                  <span class="text-xs text-gray-500">/5.0</span>
                </div>
              </td>
              <td class="px-6 py-5">
                <div class="text-sm font-bold text-green-600">
                  {{ formatCurrency(provider.total_earnings || 0) }}
                </div>
              </td>
              <td class="px-6 py-5 text-right">
                <button
                  type="button"
                  class="min-h-[44px] min-w-[44px] p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow-md active:scale-95"
                  :aria-label="`ดูรายละเอียด ${provider.first_name} ${provider.last_name}`"
                  @click.stop="viewProvider(provider)"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-else class="p-8 text-center">
        <svg class="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p class="mt-4 text-gray-600">ไม่พบผู้ให้บริการ</p>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between mt-6 px-6 py-4 bg-white rounded-xl shadow-sm border border-gray-200">
      <div class="text-sm text-gray-600">
        แสดง {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, totalCount) }} จาก {{ totalCount }}
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="min-h-[44px] px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center gap-2"
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          ก่อนหน้า
        </button>
        <div class="flex items-center px-4 py-2 text-sm font-medium text-gray-700">
          {{ currentPage }} / {{ totalPages }}
        </div>
        <button
          type="button"
          class="min-h-[44px] px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center gap-2"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          ถัดไป
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal && selectedProvider" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal">
        <div class="modal-header"><h2>รายละเอียดผู้ให้บริการ</h2><button class="close-btn" @click="showDetailModal = false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
        <div class="modal-body">
          <div class="provider-header">
            <div class="avatar lg">{{ (selectedProvider.first_name || 'P').charAt(0) }}</div>
            <div>
              <h3>{{ selectedProvider.first_name }} {{ selectedProvider.last_name }}</h3>
              <code class="uid">ID: {{ selectedProvider.id }}</code>
            </div>
          </div>
          <div class="detail-grid">
            <div class="detail-item"><label>ประเภท</label><span>{{ getProviderTypeLabel(selectedProvider.provider_type) }}</span></div>
            <div class="detail-item">
              <label>สถานะ</label>
              <span class="status-badge" :style="{ color: getStatusColor(selectedProvider.status), background: getStatusColor(selectedProvider.status) + '20' }">
                {{ getStatusLabel(selectedProvider.status) }}
              </span>
            </div>
            <div class="detail-item"><label>เบอร์โทร</label><span>{{ selectedProvider.phone_number || '-' }}</span></div>
            <div class="detail-item"><label>อีเมล</label><span>{{ selectedProvider.email || '-' }}</span></div>
            <div class="detail-item"><label>คะแนน</label><span>{{ selectedProvider.rating?.toFixed(1) || '-' }} / 5.0</span></div>
            <div class="detail-item"><label>จำนวนเที่ยว</label><span>{{ selectedProvider.total_trips || 0 }} เที่ยว</span></div>
            <div class="detail-item"><label>รายได้รวม</label><span>{{ formatCurrency(selectedProvider.total_earnings || 0) }}</span></div>
            <div class="detail-item"><label>Wallet</label><span>{{ formatCurrency(selectedProvider.wallet_balance || 0) }}</span></div>
            <div class="detail-item"><label>เอกสาร</label><span>{{ selectedProvider.documents_verified ? '✅ ตรวจสอบแล้ว' : '⏳ รอตรวจสอบ' }}</span></div>
            <div class="detail-item"><label>สมัครเมื่อ</label><span>{{ formatDate(selectedProvider.created_at) }}</span></div>
          </div>
          
          <!-- Commission Info -->
          <div class="commission-section">
            <div class="section-header">
              <h4>💰 ค่าคอมมิชชั่น</h4>
              <button class="edit-commission-btn" @click.stop="openCommissionModal(selectedProvider)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                แก้ไข
              </button>
            </div>
            <div class="commission-info-grid">
              <div class="commission-info-item">
                <label>ประเภท</label>
                <span class="commission-type-badge" :class="selectedProvider.commission_type || 'percentage'">
                  {{ selectedProvider.commission_type === 'fixed' ? '💵 จำนวนคงที่' : '📊 เปอร์เซ็นต์' }}
                </span>
              </div>
              <div class="commission-info-item">
                <label>ค่าคอมมิชชั่น</label>
                <span class="commission-value">
                  {{ selectedProvider.commission_type === 'fixed' 
                    ? `${selectedProvider.commission_value || 20} บาท` 
                    : `${selectedProvider.commission_value || 20}%` 
                  }}
                </span>
              </div>
              <div v-if="selectedProvider.commission_notes" class="commission-info-item full-width">
                <label>หมายเหตุ</label>
                <span class="commission-notes">{{ selectedProvider.commission_notes }}</span>
              </div>
              <div v-if="selectedProvider.commission_updated_at" class="commission-info-item full-width">
                <label>อัพเดทล่าสุด</label>
                <span class="commission-updated">{{ formatDate(selectedProvider.commission_updated_at) }}</span>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button v-if="selectedProvider.status === 'pending'" class="btn btn-success" @click="openActionModal(selectedProvider, 'approve')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              อนุมัติ
            </button>
            <button v-if="selectedProvider.status === 'pending'" class="btn btn-danger" @click="openActionModal(selectedProvider, 'reject')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              ปฏิเสธ
            </button>
            <button v-if="selectedProvider.status === 'approved'" class="btn btn-warning" @click="openActionModal(selectedProvider, 'suspend')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
              ระงับ
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Modal -->
    <div v-if="showActionModal" class="modal-overlay" @click.self="showActionModal = false">
      <div class="modal modal-sm">
        <div class="modal-header" :class="{ danger: actionType !== 'approve' }">
          <h2>
            {{ actionType === 'approve' ? '✅ อนุมัติผู้ให้บริการ' : actionType === 'reject' ? '❌ ปฏิเสธผู้ให้บริการ' : '🚫 ระงับผู้ให้บริการ' }}
          </h2>
          <button class="close-btn" @click="showActionModal = false" aria-label="ปิด">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="provider-target">
            <div class="avatar">{{ (selectedProvider?.first_name || 'P').charAt(0) }}</div>
            <div>
              <div class="name">{{ selectedProvider?.first_name }} {{ selectedProvider?.last_name }}</div>
              <div class="email">{{ selectedProvider?.email || selectedProvider?.phone_number }}</div>
            </div>
          </div>
          
          <div v-if="actionType === 'approve'" class="info-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
            </svg>
            <span>ผู้ให้บริการจะสามารถเริ่มรับงานได้ทันที</span>
          </div>
          
          <div v-else class="form-group">
            <label for="action-reason">เหตุผล <span class="required">*</span></label>
            <textarea 
              id="action-reason"
              v-model="actionReason" 
              rows="3" 
              placeholder="ระบุเหตุผล..."
              class="reason-input"
            ></textarea>
          </div>
          
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showActionModal = false" :disabled="isProcessing">ยกเลิก</button>
            <button 
              :class="['btn', actionType === 'approve' ? 'btn-success' : 'btn-danger']" 
              @click="executeAction"
              :disabled="isProcessing || (actionType !== 'approve' && !actionReason.trim())"
            >
              {{ isProcessing ? 'กำลังดำเนินการ...' : 'ยืนยัน' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Commission Modal -->
    <ProviderCommissionModal
      v-if="selectedProvider"
      :provider="selectedProvider"
      :show="showCommissionModal"
      @close="showCommissionModal = false"
      @updated="handleCommissionUpdated"
    />
  </div>
</template>

<style scoped>
.providers-view { max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 24px; font-weight: 700; color: #1F2937; margin: 0; }
.total-count { padding: 4px 12px; background: #E8F5EF; color: #00A86B; font-size: 13px; font-weight: 500; border-radius: 16px; }
.realtime-indicator { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: #F3F4F6; color: #6B7280; font-size: 12px; font-weight: 500; border-radius: 16px; transition: all 0.3s; }
.realtime-indicator.connected { background: #D1FAE5; color: #059669; }
.pulse-dot { width: 6px; height: 6px; background: #9CA3AF; border-radius: 50%; }
.realtime-indicator.connected .pulse-dot { background: #10B981; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.header-stats { display: flex; gap: 8px; }
.stat-badge { display: flex; flex-direction: column; align-items: center; padding: 8px 16px; border-radius: 10px; min-width: 100px; }
.stat-badge.pending { background: #FEF3C7; }
.stat-badge.approved { background: #D1FAE5; }
.stat-badge.online { background: #DBEAFE; }
.stat-label { font-size: 11px; color: #6B7280; font-weight: 500; text-transform: uppercase; }
.stat-value { font-size: 20px; font-weight: 700; margin-top: 2px; }
.stat-badge.pending .stat-value { color: #D97706; }
.stat-badge.approved .stat-value { color: #059669; }
.stat-badge.online .stat-value { color: #2563EB; }
.refresh-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; color: #6B7280; transition: all 0.15s; }
.refresh-btn:hover:not(:disabled) { background: #F9FAFB; }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.filters-bar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.search-box { flex: 1; min-width: 280px; display: flex; align-items: center; gap: 10px; padding: 0 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; }
.search-box svg { color: #9CA3AF; }
.search-input { flex: 1; padding: 12px 0; border: none; outline: none; font-size: 14px; }
.filter-select { padding: 12px 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 14px; cursor: pointer; }
.table-container { background: #fff; border-radius: 16px; overflow: hidden; }
.loading-state { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.skeleton { height: 56px; background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #9CA3AF; gap: 16px; }
.error-state svg { color: #EF4444; }
.error-state p { font-size: 16px; color: #6B7280; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; background: #F9FAFB; border-bottom: 1px solid #E5E7EB; }
.data-table td { padding: 14px 16px; border-bottom: 1px solid #F3F4F6; }
.data-table tbody tr { cursor: pointer; transition: background 0.15s; }
.data-table tbody tr:hover { background: #F9FAFB; }
.provider-cell { display: flex; align-items: center; gap: 12px; }
.avatar { width: 40px; height: 40px; background: #F59E0B; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; flex-shrink: 0; }
.avatar.lg { width: 56px; height: 56px; font-size: 20px; }
.info .name { font-size: 14px; font-weight: 500; color: #1F2937; }
.info .phone { font-size: 12px; color: #6B7280; }
.uid { font-family: monospace; font-size: 12px; padding: 4px 8px; background: #F3F4F6; border-radius: 4px; }
.type-badge { padding: 4px 10px; background: #EEF2FF; color: #4F46E5; border-radius: 16px; font-size: 12px; font-weight: 500; }
.status-badge { display: inline-block; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; }
.online-status { font-size: 13px; color: #6B7280; }
.online-status.online { color: #10B981; font-weight: 500; }
.rating { display: flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 500; }
.earnings { font-weight: 500; color: #059669; }
.action-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6B7280; transition: all 0.15s; }
.action-btn:hover { background: #F3F4F6; }
.empty-state { display: flex; align-items: center; justify-content: center; padding: 60px; color: #9CA3AF; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
.page-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; transition: all 0.15s; }
.page-btn:hover:not(:disabled) { background: #F9FAFB; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 14px; color: #6B7280; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; }
.modal.modal-sm { max-width: 450px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #E5E7EB; }
.modal-header.danger { background: #FEF2F2; border-bottom-color: #FECACA; }
.modal-header.danger h2 { color: #DC2626; }
.modal-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.close-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6B7280; transition: all 0.15s; }
.close-btn:hover { background: #F3F4F6; }
.modal-body { padding: 24px; }
.provider-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.provider-header h3 { font-size: 18px; font-weight: 600; margin: 0 0 4px 0; }
.provider-target { display: flex; align-items: center; gap: 12px; padding: 16px; background: #F9FAFB; border-radius: 12px; margin-bottom: 20px; }
.provider-target .name { font-weight: 500; color: #1F2937; }
.provider-target .email { font-size: 13px; color: #6B7280; }
.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item label { font-size: 12px; font-weight: 500; color: #6B7280; text-transform: uppercase; }
.detail-item span { font-size: 14px; color: #1F2937; }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: #00A86B; color: #fff; }
.btn-primary:hover:not(:disabled) { background: #008C5A; }
.btn-success { background: #10B981; color: #fff; }
.btn-success:hover:not(:disabled) { background: #059669; }
.btn-danger { background: #EF4444; color: #fff; }
.btn-danger:hover:not(:disabled) { background: #DC2626; }
.btn-warning { background: #F59E0B; color: #fff; }
.btn-warning:hover:not(:disabled) { background: #D97706; }
.btn-secondary { background: #F3F4F6; color: #374151; }
.btn-secondary:hover:not(:disabled) { background: #E5E7EB; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px; }
.form-group .required { color: #EF4444; }
.reason-input { width: 100%; padding: 12px; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 14px; resize: vertical; font-family: inherit; box-sizing: border-box; }
.reason-input:focus { outline: none; border-color: #00A86B; box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1); }
.info-box { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #DBEAFE; border-radius: 10px; font-size: 13px; color: #1E40AF; margin-bottom: 20px; }
.info-box svg { flex-shrink: 0; color: #3B82F6; }
.commission-cell { display: flex; align-items: center; gap: 6px; }
.commission-badge { display: inline-block; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; }
.commission-badge.percentage { background: #DBEAFE; color: #1E40AF; }
.commission-badge.fixed { background: #FEF3C7; color: #92400E; }
.commission-section { margin-top: 24px; padding-top: 24px; border-top: 1px solid #E5E7EB; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.section-header h4 { font-size: 16px; font-weight: 600; color: #1F2937; margin: 0; }
.edit-commission-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: #F3F4F6; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; color: #374151; cursor: pointer; transition: all 0.15s; }
.edit-commission-btn:hover { background: #E5E7EB; }
.commission-info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.commission-info-item { display: flex; flex-direction: column; gap: 4px; }
.commission-info-item.full-width { grid-column: 1 / -1; }
.commission-info-item label { font-size: 12px; font-weight: 500; color: #6B7280; text-transform: uppercase; }
.commission-type-badge { display: inline-block; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 500; }
.commission-type-badge.percentage { background: #DBEAFE; color: #1E40AF; }
.commission-type-badge.fixed { background: #FEF3C7; color: #92400E; }
.commission-value { font-size: 18px; font-weight: 700; color: #00A86B; }
.commission-notes { font-size: 13px; color: #6B7280; font-style: italic; }
.commission-updated { font-size: 13px; color: #9CA3AF; }
</style>
