<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { supabase } from '../../lib/supabase'
import { useAdminUIStore } from '../stores/adminUI.store'

interface ScheduledRide {
  id: string
  user_id: string
  customer_name: string
  customer_phone: string
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  destination_address: string
  destination_lat: number
  destination_lng: number
  scheduled_datetime: string
  ride_type: string
  estimated_fare: number | null
  notes: string | null
  reminder_sent: boolean
  status: string
  ride_request_id: string | null
  passenger_count: number
  special_requests: string | null
  created_at: string
  updated_at: string
}

type ScheduledRideStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'expired'

const uiStore = useAdminUIStore()

const rides = ref<ScheduledRide[]>([])
const totalRides = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const totalPages = ref(0)
const statusFilter = ref('')
const dateFilter = ref<'all' | 'today' | 'tomorrow' | 'week'>('all')
const selectedRide = ref<ScheduledRide | null>(null)
const showDetailModal = ref(false)
const showStatusModal = ref(false)
const showCancelModal = ref(false)
const newStatus = ref<ScheduledRideStatus>('scheduled')
const cancelReason = ref('')
const loadError = ref<string | null>(null)
const isLoading = ref(false)
const isUpdating = ref(false)

// Stats
const stats = ref({
  total: 0,
  scheduled: 0,
  confirmed: 0,
  completed: 0,
  cancelled: 0
})

// Computed
const upcomingRides = computed(() => {
  const now = new Date()
  return rides.value.filter(r => 
    new Date(r.scheduled_datetime) > now && 
    !['cancelled', 'completed', 'expired'].includes(r.status)
  ).length
})

async function loadRides() {
  isLoading.value = true
  loadError.value = null
  
  try {
    const offset = (currentPage.value - 1) * pageSize.value
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_all_scheduled_rides_for_admin', {
      p_status: statusFilter.value || null,
      p_limit: pageSize.value,
      p_offset: offset
    })

    if (error) throw error

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: countData, error: countError } = await (supabase.rpc as any)('count_scheduled_rides_for_admin', {
      p_status: statusFilter.value || null
    })

    if (countError) throw countError

    rides.value = data || []
    totalRides.value = countData || 0
    totalPages.value = Math.ceil(totalRides.value / pageSize.value)
    
    // Load stats
    await loadStats()
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
    console.error('[ScheduledRides] Load error:', err)
  } finally {
    isLoading.value = false
  }
}

async function loadStats() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('get_scheduled_rides_stats')
    
    if (error) throw error
    
    if (data) {
      stats.value = {
        total: data.total || 0,
        scheduled: data.scheduled || 0,
        confirmed: data.confirmed || 0,
        completed: data.completed || 0,
        cancelled: data.cancelled || 0
      }
    }
  } catch (err) {
    console.error('[ScheduledRides] Stats error:', err)
  }
}

function viewRide(ride: ScheduledRide) {
  selectedRide.value = ride
  showDetailModal.value = true
}

function openStatusModal(ride: ScheduledRide) {
  selectedRide.value = ride
  newStatus.value = ride.status as ScheduledRideStatus
  showStatusModal.value = true
}

function openCancelModal(ride: ScheduledRide) {
  selectedRide.value = ride
  cancelReason.value = ''
  showCancelModal.value = true
}

async function updateStatus() {
  if (!selectedRide.value || isUpdating.value) return
  
  isUpdating.value = true
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('admin_update_scheduled_ride_status', {
      p_ride_id: selectedRide.value.id,
      p_new_status: newStatus.value
    })

    if (error) throw error
    
    if (data?.success) {
      uiStore.showSuccess('อัพเดทสถานะเรียบร้อย')
      showStatusModal.value = false
      showDetailModal.value = false
      await loadRides()
    } else {
      throw new Error(data?.error || 'Failed to update status')
    }
  } catch (err) {
    uiStore.showError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
  } finally {
    isUpdating.value = false
  }
}

async function cancelRide() {
  if (!selectedRide.value || isUpdating.value) return
  
  isUpdating.value = true
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('admin_cancel_scheduled_ride', {
      p_ride_id: selectedRide.value.id,
      p_reason: cancelReason.value || 'ยกเลิกโดย Admin'
    })

    if (error) throw error
    
    if (data?.success) {
      uiStore.showSuccess('ยกเลิกการจองเรียบร้อย')
      showCancelModal.value = false
      showDetailModal.value = false
      await loadRides()
    } else {
      throw new Error(data?.error || 'Failed to cancel ride')
    }
  } catch (err) {
    uiStore.showError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
  } finally {
    isUpdating.value = false
  }
}

async function sendReminder(ride: ScheduledRide) {
  try {
    // Create notification for user
    const { error } = await supabase.from('user_notifications').insert({
      user_id: ride.user_id,
      type: 'ride',
      title: 'แจ้งเตือนการจองล่วงหน้า',
      message: `การจองของคุณในวันที่ ${formatDate(ride.scheduled_datetime)} กำลังจะถึงเวลา`,
      data: { scheduled_ride_id: ride.id }
    })
    
    if (error) throw error
    
    // Update reminder_sent flag
    await supabase
      .from('scheduled_rides')
      .update({ reminder_sent: true })
      .eq('id', ride.id)
    
    uiStore.showSuccess('ส่งการแจ้งเตือนเรียบร้อย')
    await loadRides()
  } catch (err) {
    uiStore.showError('ไม่สามารถส่งการแจ้งเตือนได้')
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatRelativeTime(date: string) {
  const now = new Date()
  const target = new Date(date)
  const diff = target.getTime() - now.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  if (diff < 0) return 'ผ่านไปแล้ว'
  if (days > 0) return `อีก ${days} วัน`
  if (hours > 0) return `อีก ${hours} ชม.`
  return 'เร็วๆ นี้'
}

function formatCurrency(amount: number | null) {
  if (amount === null) return '-'
  return new Intl.NumberFormat('th-TH', {
    style: 'currency', currency: 'THB', minimumFractionDigits: 0
  }).format(amount)
}

function getStatusColor(s: string) {
  const colors: Record<string, string> = {
    scheduled: '#F59E0B',
    confirmed: '#3B82F6', 
    completed: '#10B981',
    cancelled: '#EF4444',
    expired: '#6B7280'
  }
  return colors[s] || '#6B7280'
}

function getStatusLabel(s: string) {
  const labels: Record<string, string> = {
    scheduled: 'รอดำเนินการ',
    confirmed: 'ยืนยันแล้ว',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก',
    expired: 'หมดอายุ'
  }
  return labels[s] || s
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

watch([statusFilter, dateFilter], () => { 
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
        <span class="total-count">{{ totalRides.toLocaleString() }} รายการ</span>
      </div>
      <div class="header-right">
        <button class="refresh-btn" @click="loadRides" :disabled="isLoading" aria-label="รีเฟรช">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ spinning: isLoading }">
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
        <div class="stat-icon pending">⏳</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.scheduled }}</div>
          <div class="stat-label">รอดำเนินการ</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon confirmed">✅</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.confirmed }}</div>
          <div class="stat-label">ยืนยันแล้ว</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon upcoming">🚗</div>
        <div class="stat-content">
          <div class="stat-value">{{ upcomingRides }}</div>
          <div class="stat-label">กำลังจะถึง</div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <select v-model="statusFilter" class="filter-select">
        <option value="">ทุกสถานะ</option>
        <option value="scheduled">รอดำเนินการ</option>
        <option value="confirmed">ยืนยันแล้ว</option>
        <option value="completed">เสร็จสิ้น</option>
        <option value="cancelled">ยกเลิก</option>
        <option value="expired">หมดอายุ</option>
      </select>
    </div>

    <!-- Table -->
    <div class="table-container">
      <div v-if="loadError" class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>เกิดข้อผิดพลาด</h3>
        <p class="error-message">{{ loadError }}</p>
        <button class="btn btn-primary" @click="loadRides">ลองใหม่</button>
      </div>

      <div v-else-if="isLoading" class="loading-state">
        <div class="skeleton" v-for="i in 8" :key="i"/>
      </div>

      <table v-else-if="rides.length > 0" class="data-table">
        <thead>
          <tr>
            <th>เวลานัดหมาย</th>
            <th>ลูกค้า</th>
            <th>เส้นทาง</th>
            <th>ประเภท</th>
            <th>ค่าโดยสาร</th>
            <th>สถานะ</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ride in rides" :key="ride.id" @click="viewRide(ride)" :class="{ 'upcoming-row': isUpcoming(ride.scheduled_datetime) && ride.status === 'scheduled' }">
            <td>
              <div class="datetime-cell">
                <div class="date">{{ formatDate(ride.scheduled_datetime) }}</div>
                <div class="relative-time" :class="{ 'text-warning': isUpcoming(ride.scheduled_datetime) }">
                  {{ formatRelativeTime(ride.scheduled_datetime) }}
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
              <span class="status-badge" :style="{ color: getStatusColor(ride.status), background: getStatusColor(ride.status) + '20' }">
                {{ getStatusLabel(ride.status) }}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button 
                  v-if="ride.status === 'scheduled' && !ride.reminder_sent" 
                  class="action-btn reminder-btn" 
                  @click.stop="sendReminder(ride)"
                  title="ส่งการแจ้งเตือน"
                >
                  🔔
                </button>
                <button class="action-btn" @click.stop="viewRide(ride)" title="ดูรายละเอียด">
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
        <p>ไม่พบการจองล่วงหน้า</p>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">ก่อนหน้า</button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">ถัดไป</button>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal && selectedRide" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>รายละเอียดการจอง</h2>
          <button class="close-btn" @click="showDetailModal = false" aria-label="ปิด">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item">
              <label>เวลานัดหมาย</label>
              <span>{{ formatDate(selectedRide.scheduled_datetime) }}</span>
            </div>
            <div class="detail-item">
              <label>สถานะ</label>
              <span class="status-badge" :style="{ color: getStatusColor(selectedRide.status), background: getStatusColor(selectedRide.status) + '20' }">
                {{ getStatusLabel(selectedRide.status) }}
              </span>
            </div>
            <div class="detail-item">
              <label>ลูกค้า</label>
              <span>{{ selectedRide.customer_name || 'ไม่ระบุ' }}</span>
            </div>
            <div class="detail-item">
              <label>เบอร์โทร</label>
              <span>{{ selectedRide.customer_phone || '-' }}</span>
            </div>
            <div class="detail-item full-width">
              <label>จุดรับ</label>
              <span>{{ selectedRide.pickup_address }}</span>
            </div>
            <div class="detail-item full-width">
              <label>จุดหมาย</label>
              <span>{{ selectedRide.destination_address }}</span>
            </div>
            <div class="detail-item">
              <label>ประเภทรถ</label>
              <span>{{ getRideTypeLabel(selectedRide.ride_type) }}</span>
            </div>
            <div class="detail-item">
              <label>จำนวนผู้โดยสาร</label>
              <span>{{ selectedRide.passenger_count }} คน</span>
            </div>
            <div class="detail-item">
              <label>ค่าโดยสารโดยประมาณ</label>
              <span class="amount">{{ formatCurrency(selectedRide.estimated_fare) }}</span>
            </div>
            <div class="detail-item">
              <label>แจ้งเตือนแล้ว</label>
              <span>{{ selectedRide.reminder_sent ? '✅ ใช่' : '❌ ยัง' }}</span>
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
            <button class="btn btn-secondary" @click="showDetailModal = false">ปิด</button>
            <button 
              v-if="!['completed', 'cancelled', 'expired'].includes(selectedRide.status)" 
              class="btn btn-danger" 
              @click="openCancelModal(selectedRide)"
            >
              ยกเลิก
            </button>
            <button 
              v-if="!['completed', 'cancelled', 'expired'].includes(selectedRide.status)" 
              class="btn btn-primary" 
              @click="openStatusModal(selectedRide)"
            >
              เปลี่ยนสถานะ
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Status Modal -->
    <div v-if="showStatusModal" class="modal-overlay" @click.self="showStatusModal = false">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2>เปลี่ยนสถานะ</h2>
          <button class="close-btn" @click="showStatusModal = false" aria-label="ปิด">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="new-status">สถานะใหม่</label>
            <select id="new-status" v-model="newStatus" class="form-select">
              <option value="scheduled">รอดำเนินการ</option>
              <option value="confirmed">ยืนยันแล้ว</option>
              <option value="completed">เสร็จสิ้น</option>
              <option value="cancelled">ยกเลิก</option>
              <option value="expired">หมดอายุ</option>
            </select>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showStatusModal = false" :disabled="isUpdating">ยกเลิก</button>
            <button class="btn btn-primary" @click="updateStatus" :disabled="isUpdating">
              {{ isUpdating ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Cancel Modal -->
    <div v-if="showCancelModal" class="modal-overlay" @click.self="showCancelModal = false">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h2>ยกเลิกการจอง</h2>
          <button class="close-btn" @click="showCancelModal = false" aria-label="ปิด">&times;</button>
        </div>
        <div class="modal-body">
          <p class="confirm-text">คุณต้องการยกเลิกการจองนี้หรือไม่?</p>
          <div class="form-group">
            <label for="cancel-reason">เหตุผล (ไม่บังคับ)</label>
            <textarea 
              id="cancel-reason"
              v-model="cancelReason" 
              class="form-textarea" 
              rows="3" 
              placeholder="ระบุเหตุผลในการยกเลิก..."
            ></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showCancelModal = false" :disabled="isUpdating">ไม่</button>
            <button class="btn btn-danger" @click="cancelRide" :disabled="isUpdating">
              {{ isUpdating ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก' }}
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
.stat-icon.upcoming { background: #ede9fe; }
.stat-content { flex: 1; }
.stat-value { font-size: 24px; font-weight: 700; color: #1f2937; }
.stat-label { font-size: 13px; color: #6b7280; }

/* Filters */
.filters-bar { display: flex; gap: 12px; margin-bottom: 20px; }
.filter-select { padding: 12px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; font-size: 14px; min-width: 160px; }

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

.datetime-cell .date { font-weight: 500; color: #1f2937; }
.datetime-cell .relative-time { font-size: 12px; color: #6b7280; }
.datetime-cell .relative-time.text-warning { color: #f59e0b; font-weight: 500; }

.customer-cell .customer-name { font-weight: 500; color: #1f2937; }
.customer-cell .customer-phone { font-size: 12px; color: #6b7280; }

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
