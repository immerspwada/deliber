<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAdminAPI } from '../composables/useAdminAPI'
import { useAdminUIStore } from '../stores/adminUI.store'
import { useServiceActions } from '../composables/useServiceActions'
import ServiceDetailModal from '../components/common/ServiceDetailModal.vue'
import StatusUpdateModal from '../components/common/StatusUpdateModal.vue'
import type { Order, OrderFilters, OrderStatus, ServiceType } from '../types'

const api = useAdminAPI()
const uiStore = useAdminUIStore()
const { 
  isUpdating, 
  updateStatus, 
  exportToCSV, 
  getStatusOptions,
  formatDate,
  formatCurrency,
  getStatusColor,
  getStatusLabel
} = useServiceActions()

const serviceType: ServiceType = 'moving'

const items = ref<Order[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const totalPages = ref(0)
const searchQuery = ref('')
const statusFilter = ref('')

const selectedItem = ref<Order | null>(null)
const showDetailModal = ref(false)
const showStatusModal = ref(false)

const filters = computed<OrderFilters>(() => ({
  search: searchQuery.value || undefined,
  status: statusFilter.value as OrderStatus || undefined
}))

async function loadData() {
  const result = await api.getMoving(filters.value, { page: currentPage.value, limit: pageSize.value })
  items.value = result.data
  total.value = result.total
  totalPages.value = result.totalPages
}

function viewDetail(item: Order) {
  selectedItem.value = item
  showDetailModal.value = true
}

function openStatusModal(item: Order) {
  selectedItem.value = item
  showStatusModal.value = true
}

async function handleStatusUpdate(orderId: string, newStatus: string) {
  const success = await updateStatus(serviceType, orderId, newStatus)
  if (success) {
    uiStore.showSuccess('อัพเดทสถานะเรียบร้อย')
    showStatusModal.value = false
    loadData()
  } else {
    uiStore.showError('เกิดข้อผิดพลาด')
  }
}

function handleExport() {
  exportToCSV(items.value, 'moving_report')
  uiStore.showSuccess('ดาวน์โหลดรายงานเรียบร้อย')
}

watch([searchQuery, statusFilter], () => { currentPage.value = 1; loadData() })
watch(currentPage, loadData)
onMounted(() => { uiStore.setBreadcrumbs([{ label: 'Moving' }]); loadData() })
</script>

<template>
  <div class="moving-view">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">Moving</h1>
        <span class="total-count">{{ total }} รายการ</span>
      </div>
      <button class="btn-export" @click="handleExport">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export CSV
      </button>
    </div>

    <div class="filters-bar">
      <div class="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input v-model="searchQuery" type="text" placeholder="ค้นหา..." class="search-input" />
      </div>
      <select v-model="pageSize" class="filter-select">
        <option :value="20">20 รายการ</option>
        <option :value="50">50 รายการ</option>
      </select>
    </div>

    <div class="status-tabs">
      <button class="status-tab" :class="{ active: statusFilter === '' }" @click="statusFilter = ''">ทั้งหมด</button>
      <button class="status-tab" :class="{ active: statusFilter === 'pending' }" @click="statusFilter = 'pending'">รอรับ</button>
      <button class="status-tab" :class="{ active: statusFilter === 'matched' }" @click="statusFilter = 'matched'">จับคู่แล้ว</button>
      <button class="status-tab" :class="{ active: statusFilter === 'in_progress' }" @click="statusFilter = 'in_progress'">กำลังขนย้าย</button>
      <button class="status-tab" :class="{ active: statusFilter === 'completed' }" @click="statusFilter = 'completed'">เสร็จสิ้น</button>
      <button class="status-tab" :class="{ active: statusFilter === 'cancelled' }" @click="statusFilter = 'cancelled'">ยกเลิก</button>
    </div>

    <div class="table-container">
      <div v-if="api.isLoading.value" class="loading-state">
        <div v-for="i in 5" :key="i" class="skeleton-row">
          <div class="skeleton" style="width: 120px;"></div>
          <div class="skeleton" style="width: 100px;"></div>
          <div class="skeleton" style="width: 100px;"></div>
          <div class="skeleton" style="width: 150px;"></div>
          <div class="skeleton" style="width: 80px;"></div>
        </div>
      </div>

      <table v-else-if="items.length > 0" class="data-table">
        <thead><tr><th>Tracking ID</th><th>ลูกค้า</th><th>ผู้ขนย้าย</th><th>จุดรับ</th><th>จุดส่ง</th><th>สถานะ</th><th>ยอดเงิน</th><th>วันที่</th><th>จัดการ</th></tr></thead>
        <tbody>
          <tr v-for="item in items" :key="item.id" @click="viewDetail(item)" class="clickable-row">
            <td><code class="tracking-id">{{ item.tracking_id }}</code></td>
            <td>{{ item.customer_name || '-' }}</td>
            <td>{{ item.provider_name || '-' }}</td>
            <td class="address">{{ item.pickup_address || '-' }}</td>
            <td class="address">{{ item.dropoff_address || '-' }}</td>
            <td><span class="status-badge" :style="{ color: getStatusColor(item.status), background: getStatusColor(item.status) + '20' }">{{ getStatusLabel(item.status, serviceType) }}</span></td>
            <td class="amount">{{ formatCurrency(item.total_amount) }}</td>
            <td class="date">{{ formatDate(item.created_at) }}</td>
            <td @click.stop><button class="action-btn" @click="openStatusModal(item)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state"><p>ไม่พบรายการขนย้าย</p></div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">←</button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">→</button>
    </div>

    <ServiceDetailModal :order="selectedItem" :service-type="serviceType" :show="showDetailModal" @close="showDetailModal = false" />
    <StatusUpdateModal :order="selectedItem" :service-type="serviceType" :show="showStatusModal" :status-options="getStatusOptions(serviceType)" :is-updating="isUpdating" @close="showStatusModal = false" @update="handleStatusUpdate" />
  </div>
</template>

<style scoped>
.moving-view { max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 24px; font-weight: 700; color: #1F2937; margin: 0; }
.total-count { padding: 4px 12px; background: #E8F5EF; color: #00A86B; font-size: 13px; font-weight: 500; border-radius: 16px; }
.btn-export { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 14px; font-weight: 500; color: #374151; cursor: pointer; }
.btn-export:hover { background: #F9FAFB; border-color: #00A86B; color: #00A86B; }
.filters-bar { display: flex; gap: 12px; margin-bottom: 20px; }
.search-box { flex: 1; display: flex; align-items: center; gap: 10px; padding: 0 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; }
.search-box svg { color: #9CA3AF; }
.search-input { flex: 1; padding: 12px 0; border: none; outline: none; font-size: 14px; }
.filter-select { padding: 12px 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 14px; }
.status-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.status-tab { padding: 8px 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 14px; font-weight: 500; color: #6B7280; cursor: pointer; }
.status-tab.active { background: #00A86B; color: #fff; border-color: #00A86B; }
.table-container { background: #fff; border-radius: 16px; overflow: hidden; }
.loading-state { padding: 20px; }
.skeleton-row { display: flex; gap: 16px; padding: 14px 16px; border-bottom: 1px solid #F3F4F6; }
.skeleton { height: 20px; background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; background: #F9FAFB; border-bottom: 1px solid #E5E7EB; }
.data-table td { padding: 14px 16px; border-bottom: 1px solid #F3F4F6; }
.data-table tbody tr:hover { background: #F9FAFB; }
.clickable-row { cursor: pointer; }
.tracking-id { font-family: monospace; font-size: 13px; padding: 4px 8px; background: #F3F4F6; border-radius: 4px; font-weight: 600; }
.address { font-size: 13px; color: #6B7280; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-badge { display: inline-block; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; }
.amount { font-weight: 600; color: #059669; }
.date { font-size: 13px; color: #6B7280; }
.action-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: none; border: 1px solid #E5E7EB; border-radius: 6px; cursor: pointer; color: #6B7280; }
.action-btn:hover { background: #F3F4F6; color: #00A86B; border-color: #00A86B; }
.empty-state { padding: 60px; text-align: center; color: #9CA3AF; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
.page-btn { width: 40px; height: 40px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 14px; color: #6B7280; }
</style>
