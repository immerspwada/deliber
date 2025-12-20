<script setup lang="ts">
/**
 * Admin Scheduled Rides View - F15
 * จัดการการจองล่วงหน้าทั้งหมด
 * Tables: scheduled_rides
 * 
 * Memory Optimization: Task 21
 * - Cleans up rides array on unmount
 * - Resets filters and modal state
 */
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAdminCleanup } from '../composables/useAdminCleanup'

// Initialize cleanup utility
const { addCleanup } = useAdminCleanup()

interface ScheduledRide {
  id: string
  tracking_id: string
  user_id: string
  pickup_address: string
  destination_address: string
  scheduled_datetime: string
  ride_type: string
  estimated_fare: number
  notes: string
  status: string
  created_at: string
  user?: { name: string; email: string; phone: string }
}

const loading = ref(true)
const rides = ref<ScheduledRide[]>([])
const statusFilter = ref('all')
const searchQuery = ref('')
const selectedRide = ref<ScheduledRide | null>(null)
const showDetailModal = ref(false)
const processing = ref(false)

const statusOptions = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'scheduled', label: 'รอดำเนินการ' },
  { value: 'confirmed', label: 'ยืนยันแล้ว' },
  { value: 'completed', label: 'เสร็จสิ้น' },
  { value: 'cancelled', label: 'ยกเลิก' },
  { value: 'expired', label: 'หมดอายุ' }
]

// Stats
const stats = computed(() => ({
  total: rides.value.length,
  scheduled: rides.value.filter(r => r.status === 'scheduled').length,
  confirmed: rides.value.filter(r => r.status === 'confirmed').length,
  completed: rides.value.filter(r => r.status === 'completed').length,
  cancelled: rides.value.filter(r => r.status === 'cancelled').length
}))

// Filtered rides
const filteredRides = computed(() => {
  let result = rides.value
  
  if (statusFilter.value !== 'all') {
    result = result.filter(r => r.status === statusFilter.value)
  }
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(r => 
      r.tracking_id?.toLowerCase().includes(q) ||
      r.user?.name?.toLowerCase().includes(q) ||
      r.user?.phone?.includes(q) ||
      r.pickup_address?.toLowerCase().includes(q) ||
      r.destination_address?.toLowerCase().includes(q)
    )
  }
  
  return result
})

const fetchRides = async () => {
  try {
    const { data } = await (supabase.from('scheduled_rides') as any)
      .select('*, user:users(name, email, phone)')
      .order('scheduled_datetime', { ascending: true })
    rides.value = data || []
  } catch (err) {
    console.error('Error fetching scheduled rides:', err)
  } finally {
    loading.value = false
  }
}

// Register cleanup - Task 21
addCleanup(() => {
  rides.value = []
  statusFilter.value = 'all'
  searchQuery.value = ''
  selectedRide.value = null
  showDetailModal.value = false
  processing.value = false
  loading.value = false
  console.log('[AdminScheduledRidesView] Cleanup complete')
})

onMounted(fetchRides)

const viewDetail = (ride: ScheduledRide) => {
  selectedRide.value = ride
  showDetailModal.value = true
}

const updateStatus = async (rideId: string, newStatus: string) => {
  processing.value = true
  try {
    await (supabase.from('scheduled_rides') as any)
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', rideId)
    
    await fetchRides()
    showDetailModal.value = false
  } catch (err) {
    console.error('Error updating status:', err)
  } finally {
    processing.value = false
  }
}

const formatDateTime = (datetime: string) => {
  const date = new Date(datetime)
  return {
    date: date.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  }
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    scheduled: 'รอดำเนินการ', confirmed: 'ยืนยันแล้ว', completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก', expired: 'หมดอายุ'
  }
  return labels[status] || status
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    scheduled: 'pending', confirmed: 'confirmed', completed: 'completed',
    cancelled: 'cancelled', expired: 'expired'
  }
  return colors[status] || 'pending'
}

const getRideTypeLabel = (type: string) => {
  const labels: Record<string, string> = { standard: 'Standard', premium: 'Premium', shared: 'Shared' }
  return labels[type] || type
}

const isUpcoming = (datetime: string) => new Date(datetime) > new Date()
</script>

<template>
  <div class="admin-page">
    <header class="page-header">
      <h1>จัดการการจองล่วงหน้า</h1>
    </header>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-value">{{ stats.total }}</span>
        <span class="stat-label">ทั้งหมด</span>
      </div>
      <div class="stat-card pending">
        <span class="stat-value">{{ stats.scheduled }}</span>
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
    </div>

    <!-- Filters -->
    <div class="filters">
      <div class="search-bar">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input v-model="searchQuery" type="text" placeholder="ค้นหา Tracking ID, ชื่อ, เบอร์โทร..." />
      </div>
      <div class="status-filter">
        <button v-for="opt in statusOptions" :key="opt.value" :class="['filter-btn', { active: statusFilter === opt.value }]" @click="statusFilter = opt.value">
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading"><div class="spinner"></div></div>

    <!-- Empty State -->
    <div v-else-if="filteredRides.length === 0" class="empty-state">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
      <p>ไม่พบการจองล่วงหน้า</p>
    </div>

    <!-- Rides List -->
    <div v-else class="rides-list">
      <div v-for="ride in filteredRides" :key="ride.id" :class="['ride-card', { upcoming: isUpcoming(ride.scheduled_datetime) }]" @click="viewDetail(ride)">
        <div class="ride-datetime">
          <span class="ride-date">{{ formatDateTime(ride.scheduled_datetime).date }}</span>
          <span class="ride-time">{{ formatDateTime(ride.scheduled_datetime).time }}</span>
        </div>
        <div class="ride-info">
          <div class="ride-header">
            <span class="tracking-id">{{ ride.tracking_id || '-' }}</span>
            <span :class="['status-badge', getStatusColor(ride.status)]">{{ getStatusLabel(ride.status) }}</span>
          </div>
          <div class="ride-user">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            <span>{{ ride.user?.name || '-' }}</span>
            <span class="user-phone">{{ ride.user?.phone }}</span>
          </div>
          <div class="ride-route">
            <div class="route-point">
              <div class="point-dot pickup"></div>
              <span>{{ ride.pickup_address }}</span>
            </div>
            <div class="route-point">
              <div class="point-dot destination"></div>
              <span>{{ ride.destination_address }}</span>
            </div>
          </div>
          <div class="ride-meta">
            <span class="ride-type">{{ getRideTypeLabel(ride.ride_type) }}</span>
            <span v-if="ride.estimated_fare" class="ride-fare">~฿{{ ride.estimated_fare }}</span>
          </div>
        </div>
        <div class="ride-arrow">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal && selectedRide" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>รายละเอียดการจอง</h3>
          <button @click="showDetailModal = false" class="close-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="detail-section">
          <div class="detail-row">
            <span class="detail-label">Tracking ID</span>
            <span class="detail-value">{{ selectedRide.tracking_id || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">สถานะ</span>
            <span :class="['status-badge', getStatusColor(selectedRide.status)]">{{ getStatusLabel(selectedRide.status) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">วันเวลา</span>
            <span class="detail-value">{{ formatDateTime(selectedRide.scheduled_datetime).date }} {{ formatDateTime(selectedRide.scheduled_datetime).time }}</span>
          </div>
        </div>

        <div class="detail-section">
          <h4>ข้อมูลผู้จอง</h4>
          <div class="detail-row">
            <span class="detail-label">ชื่อ</span>
            <span class="detail-value">{{ selectedRide.user?.name || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">เบอร์โทร</span>
            <span class="detail-value">{{ selectedRide.user?.phone || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">อีเมล</span>
            <span class="detail-value">{{ selectedRide.user?.email || '-' }}</span>
          </div>
        </div>

        <div class="detail-section">
          <h4>เส้นทาง</h4>
          <div class="route-detail">
            <div class="route-point">
              <div class="point-dot pickup"></div>
              <span>{{ selectedRide.pickup_address }}</span>
            </div>
            <div class="route-line"></div>
            <div class="route-point">
              <div class="point-dot destination"></div>
              <span>{{ selectedRide.destination_address }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-row">
            <span class="detail-label">ประเภทรถ</span>
            <span class="detail-value">{{ getRideTypeLabel(selectedRide.ride_type) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">ค่าโดยสารโดยประมาณ</span>
            <span class="detail-value">฿{{ selectedRide.estimated_fare || '-' }}</span>
          </div>
          <div v-if="selectedRide.notes" class="detail-row">
            <span class="detail-label">หมายเหตุ</span>
            <span class="detail-value">{{ selectedRide.notes }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div v-if="selectedRide.status === 'scheduled'" class="modal-actions">
          <button @click="updateStatus(selectedRide.id, 'confirmed')" :disabled="processing" class="btn-confirm">
            {{ processing ? 'กำลังดำเนินการ...' : 'ยืนยันการจอง' }}
          </button>
          <button @click="updateStatus(selectedRide.id, 'cancelled')" :disabled="processing" class="btn-cancel">
            ยกเลิก
          </button>
        </div>
        <div v-else-if="selectedRide.status === 'confirmed'" class="modal-actions">
          <button @click="updateStatus(selectedRide.id, 'completed')" :disabled="processing" class="btn-complete">
            {{ processing ? 'กำลังดำเนินการ...' : 'เสร็จสิ้น' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-page { padding: 20px; max-width: 1200px; margin: 0 auto; }
.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 24px; font-weight: 600; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; padding: 20px; border-radius: 12px; text-align: center; }
.stat-card.pending { border-left: 4px solid #f59e0b; }
.stat-card.confirmed { border-left: 4px solid #3b82f6; }
.stat-card.completed { border-left: 4px solid #22c55e; }
.stat-value { display: block; font-size: 28px; font-weight: 700; }
.stat-label { font-size: 12px; color: #6b6b6b; }

.filters { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.search-bar { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #fff; border-radius: 8px; }
.search-bar svg { width: 20px; height: 20px; color: #6b6b6b; }
.search-bar input { flex: 1; border: none; background: none; font-size: 14px; outline: none; }

.status-filter { display: flex; gap: 8px; flex-wrap: wrap; }
.filter-btn { padding: 8px 16px; border: 1px solid #e5e5e5; border-radius: 20px; background: #fff; font-size: 13px; cursor: pointer; }
.filter-btn.active { border-color: #000; background: #000; color: #fff; }

.loading { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid #e5e5e5; border-top-color: #000; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state { text-align: center; padding: 60px; color: #6b6b6b; }
.empty-state svg { width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.5; }

.rides-list { display: flex; flex-direction: column; gap: 12px; }
.ride-card { display: flex; gap: 16px; background: #fff; padding: 16px; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
.ride-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.ride-card.upcoming { border-left: 4px solid #3b82f6; }

.ride-datetime { min-width: 80px; text-align: center; padding-right: 16px; border-right: 1px solid #e5e5e5; }
.ride-date { display: block; font-size: 12px; color: #6b6b6b; }
.ride-time { display: block; font-size: 20px; font-weight: 600; }

.ride-info { flex: 1; }
.ride-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.tracking-id { font-size: 12px; color: #6b6b6b; font-family: monospace; }

.status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
.status-badge.pending { background: #fef3c7; color: #92400e; }
.status-badge.confirmed { background: #dbeafe; color: #1e40af; }
.status-badge.completed { background: #dcfce7; color: #166534; }
.status-badge.cancelled { background: #fee2e2; color: #991b1b; }
.status-badge.expired { background: #f3f4f6; color: #6b7280; }

.ride-user { display: flex; align-items: center; gap: 8px; font-size: 14px; margin-bottom: 8px; }
.ride-user svg { width: 16px; height: 16px; color: #6b6b6b; }
.user-phone { color: #6b6b6b; font-size: 12px; }

.ride-route { margin-bottom: 8px; }
.route-point { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 4px; }
.point-dot { width: 8px; height: 8px; border-radius: 50%; }
.point-dot.pickup { background: #000; }
.point-dot.destination { background: #fff; border: 2px solid #000; }
.route-line { width: 2px; height: 12px; background: #e5e5e5; margin-left: 3px; }

.ride-meta { display: flex; gap: 12px; font-size: 12px; color: #6b6b6b; }
.ride-arrow { display: flex; align-items: center; }
.ride-arrow svg { width: 20px; height: 20px; color: #ccc; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; }
.modal-content { background: #fff; border-radius: 16px; padding: 24px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-header h3 { font-size: 18px; font-weight: 600; }
.close-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; }
.close-btn svg { width: 20px; height: 20px; }

.detail-section { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #e5e5e5; }
.detail-section:last-of-type { border-bottom: none; }
.detail-section h4 { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #6b6b6b; }
.detail-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.detail-label { font-size: 14px; color: #6b6b6b; }
.detail-value { font-size: 14px; font-weight: 500; }

.route-detail { padding: 12px; background: #f6f6f6; border-radius: 8px; }

.modal-actions { display: flex; gap: 12px; margin-top: 20px; }
.btn-confirm { flex: 1; padding: 14px; border: none; border-radius: 8px; background: #3b82f6; color: #fff; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-complete { flex: 1; padding: 14px; border: none; border-radius: 8px; background: #22c55e; color: #fff; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-cancel { flex: 1; padding: 14px; border: 1px solid #ef4444; border-radius: 8px; background: #fff; color: #ef4444; font-size: 14px; cursor: pointer; }
.btn-confirm:disabled, .btn-complete:disabled { opacity: 0.5; }

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .ride-card { flex-direction: column; }
  .ride-datetime { border-right: none; border-bottom: 1px solid #e5e5e5; padding-bottom: 12px; margin-bottom: 12px; }
}
</style>
