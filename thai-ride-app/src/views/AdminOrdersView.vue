<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAdmin } from '../composables/useAdmin'

const { fetchRecentOrders, recentOrders } = useAdmin()

const loading = ref(true)
const typeFilter = ref('')
const statusFilter = ref('')

const filteredOrders = ref<any[]>([])

const loadOrders = async () => {
  loading.value = true
  await fetchRecentOrders(100)
  applyFilters()
  loading.value = false
}

const applyFilters = () => {
  let result = [...recentOrders.value]
  if (typeFilter.value) result = result.filter(o => o.type === typeFilter.value)
  if (statusFilter.value) result = result.filter(o => o.status === statusFilter.value)
  filteredOrders.value = result
}

onMounted(loadOrders)

const getStatusColor = (s: string) => {
  const colors: Record<string, string> = { pending: '#ffc043', matched: '#276ef1', pickup: '#276ef1', in_progress: '#276ef1', in_transit: '#276ef1', shopping: '#276ef1', delivering: '#276ef1', completed: '#05944f', delivered: '#05944f', cancelled: '#e11900', failed: '#e11900' }
  return colors[s] || '#6b6b6b'
}
const getStatusText = (s: string) => {
  const texts: Record<string, string> = { pending: 'รอดำเนินการ', matched: 'จับคู่แล้ว', pickup: 'กำลังรับ', in_progress: 'กำลังเดินทาง', in_transit: 'กำลังส่ง', shopping: 'กำลังซื้อ', delivering: 'กำลังจัดส่ง', completed: 'สำเร็จ', delivered: 'ส่งแล้ว', cancelled: 'ยกเลิก', failed: 'ล้มเหลว' }
  return texts[s] || s
}
const getTypeText = (t: string) => ({ ride: 'เรียกรถ', delivery: 'ส่งของ', shopping: 'ซื้อของ' }[t] || t)
const formatDate = (d: string) => new Date(d).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
const formatCurrency = (n: number) => `฿${n?.toLocaleString('th-TH') || 0}`
</script>

<template>
  <AdminLayout>
    <div class="admin-page">
      <div class="page-header">
        <h1>จัดการออเดอร์</h1>
        <p class="subtitle">{{ filteredOrders.length }} รายการ</p>
      </div>

      <div class="filters">
        <select v-model="typeFilter" @change="applyFilters" class="filter-select">
          <option value="">ทุกประเภท</option>
          <option value="ride">เรียกรถ</option>
          <option value="delivery">ส่งของ</option>
          <option value="shopping">ซื้อของ</option>
        </select>
        <select v-model="statusFilter" @change="applyFilters" class="filter-select">
          <option value="">ทุกสถานะ</option>
          <option value="pending">รอดำเนินการ</option>
          <option value="in_progress">กำลังดำเนินการ</option>
          <option value="completed">สำเร็จ</option>
          <option value="cancelled">ยกเลิก</option>
        </select>
      </div>

      <div v-if="loading" class="loading-state"><div class="spinner"></div></div>

      <div v-else class="orders-table">
        <div class="table-header">
          <span class="col-id">รหัส</span>
          <span class="col-type">ประเภท</span>
          <span class="col-user">ผู้ใช้</span>
          <span class="col-amount">ราคา</span>
          <span class="col-status">สถานะ</span>
          <span class="col-date">วันที่</span>
        </div>

        <div v-for="order in filteredOrders" :key="order.id" class="table-row">
          <span class="col-id">
            <span class="order-id">{{ order.tracking_id }}</span>
          </span>
          <span class="col-type">
            <span class="type-badge" :class="order.type">{{ getTypeText(order.type) }}</span>
          </span>
          <span class="col-user">{{ order.users?.name || 'ไม่ระบุ' }}</span>
          <span class="col-amount">{{ formatCurrency(order.estimated_fare || order.estimated_fee || order.service_fee) }}</span>
          <span class="col-status">
            <span class="status-badge" :style="{ color: getStatusColor(order.status), background: getStatusColor(order.status) + '15' }">
              {{ getStatusText(order.status) }}
            </span>
          </span>
          <span class="col-date">{{ formatDate(order.created_at) }}</span>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.admin-page { padding: 20px; max-width: 1100px; margin: 0 auto; }
.page-header { margin-bottom: 20px; }
.page-header h1 { font-size: 24px; font-weight: 700; }
.subtitle { color: #6b6b6b; font-size: 14px; }

.filters { display: flex; gap: 12px; margin-bottom: 20px; }
.filter-select { padding: 12px 16px; border: 1px solid #e5e5e5; border-radius: 8px; background: #fff; font-size: 14px; }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid #e5e5e5; border-top-color: #000; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.orders-table { background: #fff; border-radius: 12px; overflow: hidden; }
.table-header { display: none; padding: 14px 16px; background: #f9f9f9; font-size: 12px; font-weight: 600; color: #6b6b6b; text-transform: uppercase; }
.table-row { display: flex; flex-direction: column; gap: 8px; padding: 16px; border-bottom: 1px solid #f0f0f0; transition: background 0.2s; }
.table-row:hover { background: #fafafa; }
.table-row:last-child { border-bottom: none; }

.order-id { font-family: monospace; font-size: 12px; color: #000; font-weight: 500; }
.type-badge { font-size: 11px; padding: 4px 8px; border-radius: 4px; font-weight: 500; }
.type-badge.ride { background: #e6f7ed; color: #05944f; }
.type-badge.delivery { background: #fff3e0; color: #f57c00; }
.type-badge.shopping { background: #fce4ec; color: #e91e63; }

.status-badge { font-size: 12px; padding: 4px 10px; border-radius: 20px; font-weight: 500; }

.col-user { font-size: 14px; }
.col-amount { font-weight: 600; }
.col-date { font-size: 12px; color: #999; }

@media (min-width: 768px) {
  .table-header { display: grid; grid-template-columns: 180px 80px 1fr 100px 120px 140px; gap: 12px; }
  .table-row { display: grid; grid-template-columns: 180px 80px 1fr 100px 120px 140px; gap: 12px; align-items: center; flex-direction: row; }
}
</style>
