<script setup lang="ts">
/**
 * Feature: F158 - Queue Booking Admin Management
 * Admin view for managing queue bookings
 * 
 * Memory Optimization: Task 25
 * - Cleans up bookings array on unmount
 * - Resets filters and stats
 */
import { ref, onMounted, computed } from 'vue'
import { useAdmin } from '../composables/useAdmin'
import { useAdminCleanup } from '../composables/useAdminCleanup'
import AdminLayout from '../components/AdminLayout.vue'

const { fetchQueueBookings, updateQueueBooking, fetchQueueStats } = useAdmin()
const { addCleanup } = useAdminCleanup()

const bookings = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const limit = 20
const stats = ref({ pending: 0, confirmed: 0, completed: 0, cancelled: 0 })

const statusFilter = ref('')
const categoryFilter = ref('')

const categories = [
  { id: 'hospital', name: 'โรงพยาบาล' },
  { id: 'bank', name: 'ธนาคาร' },
  { id: 'government', name: 'หน่วยงานราชการ' },
  { id: 'restaurant', name: 'ร้านอาหาร' },
  { id: 'salon', name: 'ร้านเสริมสวย' },
  { id: 'other', name: 'อื่นๆ' }
]

const statuses = [
  { id: 'pending', name: 'รอดำเนินการ', color: '#F5A623' },
  { id: 'confirmed', name: 'ยืนยันแล้ว', color: '#2196F3' },
  { id: 'in_progress', name: 'กำลังดำเนินการ', color: '#9C27B0' },
  { id: 'completed', name: 'เสร็จสิ้น', color: '#00A86B' },
  { id: 'cancelled', name: 'ยกเลิก', color: '#E53935' }
]

const loadData = async () => {
  const filter: any = {}
  if (statusFilter.value) filter.status = statusFilter.value
  if (categoryFilter.value) filter.category = categoryFilter.value
  
  const result = await fetchQueueBookings(page.value, limit, filter)
  bookings.value = result.data
  total.value = result.total
  
  stats.value = await fetchQueueStats()
}

const updateStatus = async (bookingId: string, newStatus: string) => {
  const result = await updateQueueBooking(bookingId, { status: newStatus })
  if (result.success) {
    await loadData()
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

const formatTime = (time: string) => {
  return time?.substring(0, 5) || '-'
}

const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || id
const getStatusInfo = (id: string) => statuses.find(s => s.id === id) || { name: id, color: '#666' }

const totalPages = computed(() => Math.ceil(total.value / limit))

// Register cleanup - Task 25
addCleanup(() => {
  bookings.value = []
  total.value = 0
  page.value = 1
  stats.value = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 }
  statusFilter.value = ''
  categoryFilter.value = ''
  console.log('[AdminQueueView] Cleanup complete')
})

onMounted(loadData)
</script>

<template>
  <AdminLayout>
    <div class="admin-queue">
      <div class="page-header">
        <h1>จัดการจองคิว</h1>
        <p>จัดการคำขอจองคิวทั้งหมดในระบบ</p>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card pending">
          <span class="stat-value">{{ stats.pending }}</span>
          <span class="stat-label">รอดำเนินการ</span>
        </div>
        <div class="stat-card confirmed">
          <span class="stat-value">{{ stats.confirmed }}</span>
          <span class="stat-label">ยืนยันแล้ว</span>
        </div>
        <div class="stat-card completed">
          <span class="stat-value">{{ stats.completed }}</span>
          <span class="stat-label">เสร็จสิ้น</span>
        </div>
        <div class="stat-card cancelled">
          <span class="stat-value">{{ stats.cancelled }}</span>
          <span class="stat-label">ยกเลิก</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <select v-model="statusFilter" @change="loadData">
          <option value="">ทุกสถานะ</option>
          <option v-for="s in statuses" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <select v-model="categoryFilter" @change="loadData">
          <option value="">ทุกประเภท</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <!-- Table -->
      <div class="table-container">
        <table v-if="bookings.length > 0">
          <thead>
            <tr>
              <th>Tracking ID</th>
              <th>ลูกค้า</th>
              <th>ประเภท</th>
              <th>สถานที่</th>
              <th>วันที่/เวลา</th>
              <th>สถานะ</th>
              <th>การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="booking in bookings" :key="booking.id">
              <td class="tracking-id">{{ booking.tracking_id }}</td>
              <td>
                <div class="customer-info">
                  <span class="name">{{ booking.user?.name || '-' }}</span>
                  <span class="uid">{{ booking.user?.member_uid }}</span>
                </div>
              </td>
              <td>{{ getCategoryName(booking.category) }}</td>
              <td>
                <div class="place-info">
                  <span class="place-name">{{ booking.place_name || '-' }}</span>
                  <span class="place-address">{{ booking.place_address || '-' }}</span>
                </div>
              </td>
              <td>
                <div class="datetime">
                  <span>{{ formatDate(booking.scheduled_date) }}</span>
                  <span>{{ formatTime(booking.scheduled_time) }}</span>
                </div>
              </td>
              <td>
                <span 
                  class="status-badge" 
                  :style="{ background: getStatusInfo(booking.status).color }"
                >
                  {{ getStatusInfo(booking.status).name }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <select 
                    v-if="booking.status !== 'completed' && booking.status !== 'cancelled'"
                    @change="(e: any) => updateStatus(booking.id, e.target.value)"
                    :value="booking.status"
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
          <p>ไม่พบข้อมูลการจองคิว</p>
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
.admin-queue {
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
.stat-card.confirmed .stat-value { color: #2196F3; }
.stat-card.completed .stat-value { color: #00A86B; }
.stat-card.cancelled .stat-value { color: #E53935; }

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
  color: #9C27B0;
}

.customer-info, .place-info, .datetime {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.customer-info .name, .place-info .place-name {
  font-weight: 500;
}

.customer-info .uid, .place-info .place-address {
  font-size: 12px;
  color: #999999;
}

.datetime span:first-child {
  font-weight: 500;
}

.datetime span:last-child {
  font-size: 12px;
  color: #666666;
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
