<script setup lang="ts">
/**
 * Admin Scheduled Rides View
 * ===========================
 * จัดการการจองล่วงหน้าทั้งหมดในระบบ
 * 
 * Updated to use useAdminScheduledRides composable with RPC functions
 */
import { ref, onMounted, watch, computed } from 'vue'
import { useAdminScheduledRides, type ScheduledRide } from '@/admin/composables/useAdminScheduledRides'
import { useAdminUIStore } from '../stores/adminUI.store'

const uiStore = useAdminUIStore()

// Use composable
const {
  loading,
  scheduledRides,
  totalCount,
  error,
  upcomingRides,
  todayRides,
  assignedRides,
  unassignedRides,
  fetchScheduledRides,
  fetchCount,
  formatCurrency,
  formatDate,
  formatDateOnly,
  formatTimeOnly,
  getTimeUntil,
  isRideSoon,
  getStatusColor,
  getStatusLabel
} = useAdminScheduledRides()

// Pagination state
const currentPage = ref(1)
const pageSize = ref(20)
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

// Filter state
const dateFromFilter = ref<string>('')
const dateToFilter = ref<string>('')

// UI state
const selectedRide = ref<ScheduledRide | null>(null)
const showDetailModal = ref(false)

// Computed filters
const filters = computed(() => {
  const dateFrom = dateFromFilter.value ? new Date(dateFromFilter.value) : new Date()
  const dateTo = dateToFilter.value ? new Date(dateToFilter.value) : null
  
  return {
    dateFrom,
    dateTo,
    limit: pageSize.value,
    offset: (currentPage.value - 1) * pageSize.value
  }
})

// Stats computed from composable
const stats = computed(() => ({
  total: totalCount.value,
  upcoming: upcomingRides.value.length,
  today: todayRides.value.length,
  assigned: assignedRides.value.length,
  unassigned: unassignedRides.value.length
}))

// Initialize date from filter to today
onMounted(() => {
  const today = new Date()
  dateFromFilter.value = today.toISOString().split('T')[0]
})

// Load scheduled rides with error handling
async function loadRides() {
  try {
    await fetchScheduledRides(filters.value)
    await fetchCount({
      dateFrom: filters.value.dateFrom,
      dateTo: filters.value.dateTo
    })
  } catch (err) {
    console.error('[ScheduledRidesView] Load error:', err)
  }
}

function viewRide(ride: ScheduledRide) {
  selectedRide.value = ride
  showDetailModal.value = true
}

function getRideTypeLabel(type: string) {
  const labels: Record<string, string> = {
    standard: 'มาตรฐาน',
    premium: 'พรีเมียม',
    suv: 'SUV',
    van: 'รถตู้'
  }
  return labels[type] || type
}

function isUpcoming(date: string) {
  return new Date(date) > new Date()
}

// Set date range presets
function setDateRange(preset: 'today' | 'tomorrow' | 'week' | 'month') {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  switch (preset) {
    case 'today':
      dateFromFilter.value = today.toISOString().split('T')[0]
      const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      dateToFilter.value = todayEnd.toISOString().split('T')[0]
      break
    case 'tomorrow':
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      dateFromFilter.value = tomorrow.toISOString().split('T')[0]
      const tomorrowEnd = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
      dateToFilter.value = tomorrowEnd.toISOString().split('T')[0]
      break
    case 'week':
      dateFromFilter.value = today.toISOString().split('T')[0]
      const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      dateToFilter.value = weekEnd.toISOString().split('T')[0]
      break
    case 'month':
      dateFromFilter.value = today.toISOString().split('T')[0]
      const monthEnd = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      dateToFilter.value = monthEnd.toISOString().split('T')[0]
      break
  }
}

// Watch for filter changes
watch([dateFromFilter, dateToFilter], () => {
  currentPage.value = 1
  loadRides()
})

watch(currentPage, loadRides)

onMounted(() => {
  uiStore.setBreadcrumbs([{ label: 'Orders' }, { label: 'Scheduled Rides' }])
  loadRides()
})
</script>

<template>
  <div class="scheduled-rides-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">การจองล่วงหน้า</h1>
        <span class="total-count">{{ totalCount.toLocaleString() }} รายการ</span>
      </div>
      <div class="header-right">
        <button 
          class="refresh-btn" 
          @click="loadRides" 
          :disabled="loading" 
          aria-label="รีเฟรช"
        >
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2" 
            :class="{ spinning: loading }"
          >
            <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon total">📅</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">ทั้งหมด</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon upcoming">⏰</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.upcoming }}</div>
          <div class="stat-label">กำลังจะถึง</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon today">📆</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.today }}</div>
          <div class="stat-label">วันนี้</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon assigned">✅</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.assigned }}</div>
          <div class="stat-label">มอบหมายแล้ว</div>
        </div>
      </div>
    </div>

    <!-- Date Range Filters -->
    <div class="filters-bar">
      <div class="filter-group">
        <label class="filter-label">ช่วงเวลา:</label>
        <div class="date-presets">
          <button 
            class="preset-btn" 
            @click="setDateRange('today')"
          >
            วันนี้
          </button>
          <button 
            class="preset-btn" 
            @click="setDateRange('tomorrow')"
          >
            พรุ่งนี้
          </button>
          <button 
            class="preset-btn" 
            @click="setDateRange('week')"
          >
            7 วัน
          </button>
          <button 
            class="preset-btn" 
            @click="setDateRange('month')"
          >
            30 วัน
          </button>
        </div>
      </div>
      <div class="filter-group">
        <label class="filter-label">จาก:</label>
        <input 
          type="date" 
          v-model="dateFromFilter" 
          class="date-input"
        />
      </div>
      <div class="filter-group">
        <label class="filter-label">ถึง:</label>
        <input 
          type="date" 
          v-model="dateToFilter" 
          class="date-input"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="table-container">
      <div v-if="error" class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>เกิดข้อผิดพลาด</h3>
        <p class="error-message">{{ error }}</p>
        <button class="btn btn-primary" @click="loadRides">ลองใหม่</button>
      </div>

      <div v-else-if="loading" class="loading-state">
        <div class="skeleton" v-for="i in 8" :key="i"/>
      </div>

      <table v-else-if="scheduledRides.length > 0" class="data-table">
        <thead>
          <tr>
            <th>เวลานัดหมาย</th>
            <th>ลูกค้า</th>
            <th>เส้นทาง</th>
            <th>ประเภท</th>
            <th>ค่าโดยสาร</th>
            <th>สถานะ</th>
            <th>ผู้ให้บริการ</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="ride in scheduledRides" 
            :key="ride.id" 
            @click="viewRide(ride)" 
            :class="{ 
              'upcoming-row': isUpcoming(ride.scheduled_datetime) && ride.status === 'pending',
              'soon-row': isRideSoon(ride.scheduled_datetime)
            }"
          >
            <td>
              <div class="datetime-cell">
                <div class="date">{{ formatDate(ride.scheduled_datetime) }}</div>
                <div 
                  class="relative-time" 
                  :class="{ 
                    'text-warning': isRideSoon(ride.scheduled_datetime),
                    'text-danger': isUpcoming(ride.scheduled_datetime) && isRideSoon(ride.scheduled_datetime)
                  }"
                >
                  {{ getTimeUntil(ride.scheduled_datetime) }}
                </div>
              </div>
            </td>
            <td>
              <div class="customer-cell">
                <div class="customer-name">{{ ride.customer_name || 'ไม่ระบุ' }}</div>
                <div class="customer-phone">{{ ride.customer_phone || '-' }}</div>
              </div>
            </td>
            <td class="route-cell">
              <div class="pickup">📍 {{ ride.pickup_address }}</div>
              <div class="destination">🎯 {{ ride.destination_address }}</div>
            </td>
            <td>
              <span class="ride-type-badge">{{ getRideTypeLabel(ride.ride_type) }}</span>
            </td>
            <td class="amount">{{ formatCurrency(ride.estimated_fare) }}</td>
            <td>
              <span 
                class="status-badge" 
                :style="{ 
                  color: getStatusColor(ride.status), 
                  background: getStatusColor(ride.status) + '20' 
                }"
              >
                {{ getStatusLabel(ride.status) }}
              </span>
            </td>
            <td>
              <div v-if="ride.provider_name" class="provider-cell">
                <div class="provider-name">{{ ride.provider_name }}</div>
                <div class="provider-phone">{{ ride.provider_phone || '-' }}</div>
              </div>
              <span v-else class="text-muted">ยังไม่มอบหมาย</span>
            </td>
            <td>
              <div class="action-buttons">
                <button 
                  class="action-btn" 
                  @click.stop="viewRide(ride)" 
                  title="ดูรายละเอียด"
                  aria-label="ดูรายละเอียด"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty-state">
        <div class="empty-icon">📅</div>
        <p>ไม่พบการจองล่วงหน้าในช่วงเวลาที่เลือก</p>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button 
        class="page-btn" 
        :disabled="currentPage === 1" 
        @click="currentPage--"
        aria-label="หน้าก่อนหน้า"
      >
        ก่อนหน้า
      </button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button 
        class="page-btn" 
        :disabled="currentPage === totalPages" 
        @click="currentPage++"
        aria-label="หน้าถัดไป"
      >
        ถัดไป
      </button>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal && selectedRide" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>รายละเอียดการจอง</h2>
          <button 
            class="close-btn" 
            @click="showDetailModal = false" 
            aria-label="ปิด"
          >
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item">
              <label>Tracking ID</label>
              <span class="tracking-id">{{ selectedRide.tracking_id }}</span>
            </div>
            <div class="detail-item">
              <label>เวลานัดหมาย</label>
              <span>{{ formatDate(selectedRide.scheduled_datetime) }}</span>
            </div>
            <div class="detail-item">
              <label>เหลือเวลา</label>
              <span :class="{ 'text-warning': isRideSoon(selectedRide.scheduled_datetime) }">
                {{ getTimeUntil(selectedRide.scheduled_datetime) }}
              </span>
            </div>
            <div class="detail-item">
              <label>สถานะ</label>
              <span 
                class="status-badge" 
                :style="{ 
                  color: getStatusColor(selectedRide.status), 
                  background: getStatusColor(selectedRide.status) + '20' 
                }"
              >
                {{ getStatusLabel(selectedRide.status) }}
              </span>
            </div>
            <div class="detail-item">
              <label>ลูกค้า</label>
              <span>{{ selectedRide.customer_name || 'ไม่ระบุ' }}</span>
            </div>
            <div class="detail-item">
              <label>อีเมล</label>
              <span>{{ selectedRide.customer_email || '-' }}</span>
            </div>
            <div class="detail-item">
              <label>เบอร์โทร</label>
              <span>{{ selectedRide.customer_phone || '-' }}</span>
            </div>
            <div class="detail-item">
              <label>จำนวนผู้โดยสาร</label>
              <span>{{ selectedRide.passenger_count }} คน</span>
            </div>
            <div class="detail-item full-width">
              <label>จุดรับ</label>
              <span>📍 {{ selectedRide.pickup_address }}</span>
            </div>
            <div class="detail-item full-width">
              <label>จุดหมาย</label>
              <span>🎯 {{ selectedRide.destination_address }}</span>
            </div>
            <div class="detail-item">
              <label>ประเภทรถ</label>
              <span>{{ getRideTypeLabel(selectedRide.ride_type) }}</span>
            </div>
            <div class="detail-item">
              <label>ค่าโดยสารโดยประมาณ</label>
              <span class="amount">{{ formatCurrency(selectedRide.estimated_fare) }}</span>
            </div>
            <div class="detail-item">
              <label>ส่งการแจ้งเตือนแล้ว</label>
              <span>{{ selectedRide.reminder_sent ? '✅ ใช่' : '❌ ยัง' }}</span>
            </div>
            <div class="detail-item">
              <label>สร้างเมื่อ</label>
              <span>{{ formatDate(selectedRide.created_at) }}</span>
            </div>
          </div>
          
          <!-- Provider Info (if assigned) -->
          <div v-if="selectedRide.provider_name" class="provider-section">
            <h3>ผู้ให้บริการ</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <label>ชื่อ</label>
                <span>{{ selectedRide.provider_name }}</span>
              </div>
              <div class="detail-item">
                <label>เบอร์โทร</label>
                <span>{{ selectedRide.provider_phone || '-' }}</span>
              </div>
              <div class="detail-item" v-if="selectedRide.provider_rating">
                <label>คะแนน</label>
                <span>⭐ {{ selectedRide.provider_rating.toFixed(1) }}</span>
              </div>
            </div>
          </div>
          
          <div v-if="selectedRide.special_requests" class="notes-section">
            <label>คำขอพิเศษ</label>
            <p>{{ selectedRide.special_requests }}</p>
          </div>
          
          <div v-if="selectedRide.notes" class="notes-section">
            <label>หมายเหตุ</label>
            <p>{{ selectedRide.notes }}</p>
          </div>
          
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showDetailModal = false">
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.scheduled-rides-view { max-width: 1400px; margin: 0 auto; }

/* Header */
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 24px; font-weight: 700; color: #1f2937; margin: 0; }
.total-count { padding: 4px 12px; background: #e8f5ef; color: #00a86b; font-size: 13px; font-weight: 500; border-radius: 16px; }
.refresh-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; cursor: pointer; color: #6b7280; transition: all 0.2s; }
.refresh-btn:hover { background: #f9fafb; border-color: #00a86b; color: #00a86b; }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.refresh-btn svg.spinning { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Stats */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { display: flex; align-items: center; gap: 12px; padding: 16px; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.stat-icon { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 12px; font-size: 24px; }
.stat-icon.total { background: #e0f2fe; }
.stat-icon.pending { background: #fef3c7; }
.stat-icon.confirmed { background: #d1fae5; }
.stat-icon.today { background: #fef3c7; }
.stat-icon.assigned { background: #d1fae5; }
.stat-content { flex: 1; }
.stat-value { font-size: 24px; font-weight: 700; color: #1f2937; }
.stat-label { font-size: 13px; color: #6b7280; }

/* Filters */
.filters-bar { display: flex; gap: 16px; align-items: center; margin-bottom: 20px; flex-wrap: wrap; }
.filter-group { display: flex; align-items: center; gap: 8px; }
.filter-label { font-size: 14px; font-weight: 500; color: #374151; white-space: nowrap; }
.date-presets { display: flex; gap: 8px; }
.preset-btn { padding: 8px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.2s; color: #6b7280; }
.preset-btn:hover { background: #f9fafb; border-color: #00a86b; color: #00a86b; }
.preset-btn.active { background: #00a86b; border-color: #00a86b; color: #fff; }
.date-input { padding: 8px 12px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; min-width: 140px; }

/* Table */
.table-container { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.loading-state { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.skeleton { height: 56px; background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.data-table { width: 100%; border-collapse: collapse; }
.data-table th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
.data-table td { padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
.data-table tbody tr { cursor: pointer; transition: background 0.15s; }
.data-table tbody tr:hover { background: #f9fafb; }
.data-table tbody tr.upcoming-row { background: #fffbeb; }
.data-table tbody tr.upcoming-row:hover { background: #fef3c7; }
.data-table tbody tr.soon-row { background: #fee2e2; }
.data-table tbody tr.soon-row:hover { background: #fecaca; }

.datetime-cell .date { font-weight: 500; color: #1f2937; }
.datetime-cell .relative-time { font-size: 12px; color: #6b7280; }
.datetime-cell .relative-time.text-warning { color: #f59e0b; font-weight: 500; }
.datetime-cell .relative-time.text-danger { color: #ef4444; font-weight: 600; }

.customer-cell .customer-name { font-weight: 500; color: #1f2937; }
.customer-cell .customer-phone { font-size: 12px; color: #6b7280; }

.provider-cell .provider-name { font-weight: 500; color: #1f2937; }
.provider-cell .provider-phone { font-size: 12px; color: #6b7280; }
.text-muted { color: #9ca3af; font-size: 13px; }

.route-cell .pickup, .route-cell .destination { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
.route-cell .pickup { color: #059669; margin-bottom: 2px; }
.route-cell .destination { color: #dc2626; }

.ride-type-badge { display: inline-block; padding: 4px 10px; background: #f3f4f6; color: #374151; border-radius: 16px; font-size: 12px; font-weight: 500; }

.status-badge { display: inline-block; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; }
.amount { font-weight: 600; color: #059669; }

.action-buttons { display: flex; gap: 4px; }
.action-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6b7280; font-size: 16px; }
.action-btn:hover { background: #f3f4f6; }
.action-btn.reminder-btn:hover { background: #fef3c7; }

/* Empty & Error States */
.empty-state, .error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #9ca3af; text-align: center; }
.empty-icon, .error-icon { font-size: 48px; margin-bottom: 16px; }
.error-state h3 { font-size: 18px; font-weight: 600; color: #1f2937; margin: 0 0 8px 0; }
.error-message { color: #ef4444; font-size: 14px; margin: 0 0 16px 0; padding: 12px 16px; background: #fee2e2; border-radius: 8px; }

/* Pagination */
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
.page-btn { padding: 8px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; font-size: 14px; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 14px; color: #6b7280; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; }
.modal.modal-sm { max-width: 400px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; background: #fff; }
.modal-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.close-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6b7280; font-size: 24px; }
.close-btn:hover { background: #f3f4f6; }
.modal-body { padding: 24px; }

.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item.full-width { grid-column: span 2; }
.detail-item label { font-size: 12px; font-weight: 500; color: #6b7280; text-transform: uppercase; }
.detail-item span { font-size: 14px; color: #1f2937; }
.detail-item .tracking-id { font-family: 'Courier New', monospace; font-weight: 600; color: #00a86b; }

.provider-section { margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
.provider-section h3 { font-size: 16px; font-weight: 600; color: #1f2937; margin: 0 0 16px 0; }

.notes-section { margin-bottom: 20px; }
.notes-section label { font-size: 12px; font-weight: 500; color: #6b7280; text-transform: uppercase; display: block; margin-bottom: 8px; }
.notes-section p { font-size: 14px; color: #1f2937; background: #f9fafb; padding: 12px; border-radius: 8px; margin: 0; }

.confirm-text { font-size: 14px; color: #374151; margin-bottom: 16px; }

.modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
.btn { padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: #00a86b; color: #fff; }
.btn-primary:hover:not(:disabled) { background: #009960; }
.btn-secondary { background: #f3f4f6; color: #374151; }
.btn-secondary:hover:not(:disabled) { background: #e5e7eb; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-danger:hover:not(:disabled) { background: #dc2626; }

.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px; }
.form-select, .form-textarea { width: 100%; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; }
.form-textarea { resize: vertical; font-family: inherit; }

/* Responsive */
@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .detail-grid { grid-template-columns: 1fr; }
  .detail-item.full-width { grid-column: span 1; }
}
</style>
