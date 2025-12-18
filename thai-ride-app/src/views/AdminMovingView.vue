<script setup lang="ts">
/**
 * Feature: F159 - Moving Service Admin Management
 * Admin view for managing moving requests
 */
import { ref, onMounted, computed } from 'vue'
import { useAdmin } from '../composables/useAdmin'
import AdminLayout from '../components/AdminLayout.vue'

const { fetchMovingRequests, updateMovingRequest, fetchMovingStats, loading } = useAdmin()

const requests = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const limit = 20
const stats = ref({ pending: 0, matched: 0, inProgress: 0, completed: 0 })

const statusFilter = ref('')
const serviceTypeFilter = ref('')

const serviceTypes = [
  { id: 'small', name: 'ยกของชิ้นเล็ก', price: '฿150' },
  { id: 'medium', name: 'ยกของชิ้นกลาง', price: '฿350' },
  { id: 'large', name: 'ขนย้ายบ้าน', price: '฿1,500+' }
]

const statuses = [
  { id: 'pending', name: 'รอผู้ให้บริการ', color: '#F5A623' },
  { id: 'matched', name: 'จับคู่แล้ว', color: '#2196F3' },
  { id: 'pickup', name: 'กำลังไปรับ', color: '#9C27B0' },
  { id: 'in_progress', name: 'กำลังขนย้าย', color: '#00BCD4' },
  { id: 'completed', name: 'เสร็จสิ้น', color: '#00A86B' },
  { id: 'cancelled', name: 'ยกเลิก', color: '#E53935' }
]

const loadData = async () => {
  const filter: any = {}
  if (statusFilter.value) filter.status = statusFilter.value
  if (serviceTypeFilter.value) filter.serviceType = serviceTypeFilter.value
  
  const result = await fetchMovingRequests(page.value, limit, filter)
  requests.value = result.data
  total.value = result.total
  
  stats.value = await fetchMovingStats()
}

const updateStatus = async (requestId: string, newStatus: string) => {
  const result = await updateMovingRequest(requestId, { status: newStatus })
  if (result.success) {
    await loadData()
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('th-TH').format(price)
}

const getServiceTypeName = (id: string) => serviceTypes.find(s => s.id === id)?.name || id
const getStatusInfo = (id: string) => statuses.find(s => s.id === id) || { name: id, color: '#666' }

const totalPages = computed(() => Math.ceil(total.value / limit))

onMounted(loadData)
</script>

<template>
  <AdminLayout>
    <div class="admin-moving">
      <div class="page-header">
        <h1>จัดการบริการยกของ</h1>
        <p>จัดการคำขอยกของ/ขนย้ายทั้งหมดในระบบ</p>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card pending">
          <span class="stat-value">{{ stats.pending }}</span>
          <span class="stat-label">รอผู้ให้บริการ</span>
        </div>
        <div class="stat-card matched">
          <span class="stat-value">{{ stats.matched }}</span>
          <span class="stat-label">จับคู่แล้ว</span>
        </div>
        <div class="stat-card in-progress">
          <span class="stat-value">{{ stats.inProgress }}</span>
          <span class="stat-label">กำลังดำเนินการ</span>
        </div>
        <div class="stat-card completed">
          <span class="stat-value">{{ stats.completed }}</span>
          <span class="stat-label">เสร็จสิ้น</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <select v-model="statusFilter" @change="loadData">
          <option value="">ทุกสถานะ</option>
          <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <select v-model="serviceTypeFilter" @change="loadData">
          <option value="">ทุกประเภท</option>
          <option v-for="t in serviceTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </div>

      <!-- Table -->
      <div class="table-container">
        <table v-if="requests.length > 0">
          <thead>
            <tr>
              <th>Tracking ID</th>
              <th>ลูกค้า</th>
              <th>ประเภท</th>
              <th>จุดรับ</th>
              <th>จุดส่ง</th>
              <th>ราคา</th>
              <th>สถานะ</th>
              <th>การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="req in requests" :key="req.id">
              <td class="tracking-id">{{ req.tracking_id }}</td>
              <td>
                <div class="customer-info">
                  <span class="name">{{ req.user?.name || '-' }}</span>
                  <span class="uid">{{ req.user?.member_uid }}</span>
                </div>
              </td>
              <td>
                <span class="service-type">{{ getServiceTypeName(req.service_type) }}</span>
                <span class="helper-count">{{ req.helper_count }} คน</span>
              </td>
              <td class="address">{{ req.pickup_address }}</td>
              <td class="address">{{ req.destination_address }}</td>
              <td class="price">
                <span class="estimated">฿{{ formatPrice(req.estimated_price) }}</span>
                <span v-if="req.final_price" class="final">฿{{ formatPrice(req.final_price) }}</span>
              </td>
              <td>
                <span 
                  class="status-badge" 
                  :style="{ background: getStatusInfo(req.status).color }"
                >
                  {{ getStatusInfo(req.status).name }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <select 
                    v-if="req.status !== 'completed' && req.status !== 'cancelled'"
                    @change="(e: any) => updateStatus(req.id, e.target.value)"
                    :value="req.status"
                  >
                    <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.name }}</option>
                  </select>
                  <span v-else class="no-action">-</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">
          <p>ไม่พบข้อมูลคำขอยกของ</p>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button :disabled="page === 1" @click="page--; loadData()">ก่อนหน้า</button>
        <span>หน้า {{ page }} / {{ totalPages }}</span>
        <button :disabled="page === totalPages" @click="page++; loadData()">ถัดไป</button>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.admin-moving {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 4px;
}

.page-header p {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  padding: 20px;
  background: #FFFFFF;
  border-radius: 12px;
  border: 1px solid #F0F0F0;
}

.stat-card .stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-card .stat-label {
  font-size: 13px;
  color: #666666;
}

.stat-card.pending .stat-value { color: #F5A623; }
.stat-card.matched .stat-value { color: #2196F3; }
.stat-card.in-progress .stat-value { color: #00BCD4; }
.stat-card.completed .stat-value { color: #00A86B; }

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.filters select {
  padding: 10px 14px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 14px;
  min-width: 150px;
}

.table-container {
  background: #FFFFFF;
  border-radius: 12px;
  border: 1px solid #F0F0F0;
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid #F0F0F0;
}

th {
  background: #F5F5F5;
  font-weight: 600;
  font-size: 13px;
  color: #666666;
}

td {
  font-size: 14px;
}

.tracking-id {
  font-family: monospace;
  font-size: 12px;
  color: #2196F3;
}

.customer-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.customer-info .name {
  font-weight: 500;
}

.customer-info .uid {
  font-size: 12px;
  color: #999999;
}

.service-type {
  display: block;
  font-weight: 500;
}

.helper-count {
  display: block;
  font-size: 12px;
  color: #666666;
}

.address {
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.price {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.price .estimated {
  font-weight: 500;
}

.price .final {
  font-size: 12px;
  color: #00A86B;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: #FFFFFF;
}

.actions select {
  padding: 6px 10px;
  border: 1px solid #E8E8E8;
  border-radius: 6px;
  font-size: 12px;
}

.no-action {
  color: #999999;
}

.empty-state {
  padding: 48px;
  text-align: center;
  color: #666666;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}

.pagination button {
  padding: 8px 16px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 6px;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filters {
    flex-direction: column;
  }
  
  .table-container {
    overflow-x: auto;
  }
}
</style>
