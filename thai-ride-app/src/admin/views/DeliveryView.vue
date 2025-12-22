<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAdminAPI } from '../composables/useAdminAPI'
import { useAdminUIStore } from '../stores/adminUI.store'
import type { Order, OrderFilters, OrderStatus } from '../types'

const api = useAdminAPI()
const uiStore = useAdminUIStore()

const deliveries = ref<Order[]>([])
const totalDeliveries = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const totalPages = ref(0)
const searchQuery = ref('')
const statusFilter = ref('')
const selectedDelivery = ref<Order | null>(null)
const showDetailModal = ref(false)

const filters = computed<OrderFilters>(() => ({
  search: searchQuery.value || undefined,
  status: statusFilter.value as OrderStatus || undefined
}))

async function loadDeliveries() {
  const result = await api.getDeliveries(filters.value, { page: currentPage.value, limit: pageSize.value })
  deliveries.value = result.data
  totalDeliveries.value = result.total
  totalPages.value = result.totalPages
}

function viewDelivery(delivery: Order) { selectedDelivery.value = delivery; showDetailModal.value = true }
function formatDate(date: string) { return new Date(date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
function formatCurrency(amount: number) { return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(amount) }
function getStatusColor(s: string) { return { pending: '#F59E0B', matched: '#3B82F6', in_progress: '#8B5CF6', completed: '#10B981', cancelled: '#EF4444' }[s] || '#6B7280' }
function getStatusLabel(s: string) { return { pending: 'รอรับ', matched: 'จับคู่แล้ว', in_progress: 'กำลังส่ง', completed: 'ส่งแล้ว', cancelled: 'ยกเลิก' }[s] || s }

watch([searchQuery, statusFilter], () => { currentPage.value = 1; loadDeliveries() })
watch(currentPage, loadDeliveries)
onMounted(() => { uiStore.setBreadcrumbs([{ label: 'Delivery' }]); loadDeliveries() })
</script>

<template>
  <div class="delivery-view">
    <div class="page-header">
      <h1 class="page-title">Delivery</h1>
      <span class="total-count">{{ totalDeliveries }} รายการ</span>
    </div>

    <div class="filters-bar">
      <div class="search-box">
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
      <button class="status-tab" :class="{ active: statusFilter === 'in_progress' }" @click="statusFilter = 'in_progress'">กำลังส่ง</button>
      <button class="status-tab" :class="{ active: statusFilter === 'completed' }" @click="statusFilter = 'completed'">ส่งแล้ว</button>
      <button class="status-tab" :class="{ active: statusFilter === 'cancelled' }" @click="statusFilter = 'cancelled'">ยกเลิก</button>
    </div>

    <div class="table-container">
      <table v-if="deliveries.length > 0" class="data-table">
        <thead><tr><th>Tracking ID</th><th>ลูกค้า</th><th>ผู้ส่ง</th><th>จุดรับ</th><th>จุดส่ง</th><th>สถานะ</th><th>ยอดเงิน</th><th>วันที่</th></tr></thead>
        <tbody>
          <tr v-for="delivery in deliveries" :key="delivery.id" @click="viewDelivery(delivery)">
            <td><code class="tracking-id">{{ delivery.tracking_id }}</code></td>
            <td>{{ delivery.customer_name || '-' }}</td>
            <td>{{ delivery.provider_name || '-' }}</td>
            <td class="address">{{ delivery.pickup_address || '-' }}</td>
            <td class="address">{{ delivery.dropoff_address || '-' }}</td>
            <td><span class="status-badge" :style="{ color: getStatusColor(delivery.status), background: getStatusColor(delivery.status) + '20' }">{{ getStatusLabel(delivery.status) }}</span></td>
            <td class="amount">{{ formatCurrency(delivery.total_amount) }}</td>
            <td class="date">{{ formatDate(delivery.created_at) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state"><p>ไม่พบรายการส่งของ</p></div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">←</button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">→</button>
    </div>
  </div>
</template>

<style scoped>
.delivery-view { max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.page-title { font-size: 24px; font-weight: 700; color: #1F2937; margin: 0; }
.total-count { padding: 4px 12px; background: #E8F5EF; color: #00A86B; font-size: 13px; font-weight: 500; border-radius: 16px; }
.filters-bar { display: flex; gap: 12px; margin-bottom: 20px; }
.search-box { flex: 1; display: flex; align-items: center; padding: 0 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; }
.search-input { flex: 1; padding: 12px 0; border: none; outline: none; font-size: 14px; }
.filter-select { padding: 12px 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 14px; }
.status-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.status-tab { padding: 8px 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 14px; font-weight: 500; color: #6B7280; cursor: pointer; }
.status-tab.active { background: #00A86B; color: #fff; border-color: #00A86B; }
.table-container { background: #fff; border-radius: 16px; overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; background: #F9FAFB; border-bottom: 1px solid #E5E7EB; }
.data-table td { padding: 14px 16px; border-bottom: 1px solid #F3F4F6; }
.data-table tbody tr { cursor: pointer; }
.data-table tbody tr:hover { background: #F9FAFB; }
.tracking-id { font-family: monospace; font-size: 13px; padding: 4px 8px; background: #F3F4F6; border-radius: 4px; font-weight: 600; }
.address { font-size: 13px; color: #6B7280; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-badge { display: inline-block; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; }
.amount { font-weight: 600; color: #059669; }
.date { font-size: 13px; color: #6B7280; }
.empty-state { padding: 60px; text-align: center; color: #9CA3AF; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
.page-btn { width: 40px; height: 40px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 14px; color: #6B7280; }
</style>
