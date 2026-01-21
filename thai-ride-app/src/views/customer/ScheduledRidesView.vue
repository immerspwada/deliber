<script setup lang="ts">
/**
 * ScheduledRidesView - หน้าจัดการการจองล่วงหน้า
 * MUNEEF Style: สีเขียว #00A86B
 * Mobile-First, Touch-Friendly (44px min touch targets)
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdvancedFeatures } from '../../composables/useAdvancedFeatures'
import PullToRefresh from '../../components/PullToRefresh.vue'

const router = useRouter()
const { 
  scheduledRides, 
  loading, 
  error,
  fetchScheduledRides, 
  cancelScheduledRide,
  createScheduledRide
} = useAdvancedFeatures()

// State
const isRefreshing = ref(false)
const showCreateModal = ref(false)
const showCancelConfirm = ref(false)
const selectedRideId = ref<string | null>(null)
const cancelLoading = ref(false)

// New ride form
const newRide = ref({
  pickupAddress: '',
  pickupLat: 13.7563,
  pickupLng: 100.5018,
  destinationAddress: '',
  destinationLat: 13.7563,
  destinationLng: 100.5018,
  scheduledDate: '',
  scheduledTime: '',
  rideType: 'standard' as 'standard' | 'premium' | 'shared',
  notes: ''
})

// Filter state
type FilterType = 'all' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
const activeFilter = ref<FilterType>('all')

const filters: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'scheduled', label: 'รอยืนยัน' },
  { id: 'confirmed', label: 'ยืนยันแล้ว' },
  { id: 'completed', label: 'เสร็จสิ้น' },
  { id: 'cancelled', label: 'ยกเลิก' }
]

// Computed
const filteredRides = computed(() => {
  if (activeFilter.value === 'all') return scheduledRides.value
  return scheduledRides.value.filter(ride => ride.status === activeFilter.value)
})

const upcomingRides = computed(() => {
  return scheduledRides.value.filter(ride => 
    ['scheduled', 'confirmed'].includes(ride.status || '')
  ).length
})

const stats = computed(() => {
  const total = scheduledRides.value.length
  const upcoming = upcomingRides.value
  const completed = scheduledRides.value.filter(r => r.status === 'completed').length
  return { total, upcoming, completed }
})

// Available dates (today + 7 days)
const availableDates = computed(() => {
  const dates = []
  const today = new Date()
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    
    const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    
    dates.push({
      value: date.toISOString().split('T')[0],
      label: i === 0 ? 'วันนี้' : i === 1 ? 'พรุ่งนี้' : `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`
    })
  }
  
  return dates
})

// Available times
const availableTimes = computed(() => {
  const times = []
  const now = new Date()
  const isToday = newRide.value.scheduledDate === availableDates.value[0]?.value
  
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      if (isToday) {
        const timeDate = new Date()
        timeDate.setHours(hour, minute, 0, 0)
        if (timeDate.getTime() < now.getTime() + 60 * 60 * 1000) continue
      }
      
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      times.push({ value: timeStr, label: timeStr })
    }
  }
  
  return times
})

// Methods
const changeFilter = (filter: FilterType) => {
  activeFilter.value = filter
}

const formatDateTime = (datetime: string) => {
  const date = new Date(datetime)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  
  let dateStr = ''
  if (date.toDateString() === today.toDateString()) {
    dateStr = 'วันนี้'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    dateStr = 'พรุ่งนี้'
  } else {
    const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    dateStr = `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`
  }
  
  const timeStr = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  return { dateStr, timeStr }
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    scheduled: 'รอยืนยัน',
    confirmed: 'ยืนยันแล้ว',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก',
    expired: 'หมดอายุ'
  }
  return statusMap[status] || status
}

const getStatusClass = (status: string) => {
  const classMap: Record<string, string> = {
    scheduled: 'pending',
    confirmed: 'confirmed',
    completed: 'completed',
    cancelled: 'cancelled',
    expired: 'cancelled'
  }
  return classMap[status] || 'pending'
}

const getRideTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    standard: 'มาตรฐาน',
    premium: 'พรีเมียม',
    shared: 'แชร์'
  }
  return typeMap[type] || type
}

const handleRefresh = async () => {
  isRefreshing.value = true
  await fetchScheduledRides()
  isRefreshing.value = false
}

const openCancelConfirm = (rideId: string) => {
  selectedRideId.value = rideId
  showCancelConfirm.value = true
}

const handleCancel = async () => {
  if (!selectedRideId.value) return
  
  cancelLoading.value = true
  const success = await cancelScheduledRide(selectedRideId.value)
  cancelLoading.value = false
  
  if (success) {
    showCancelConfirm.value = false
    selectedRideId.value = null
    await fetchScheduledRides()
  }
}

const openCreateModal = () => {
  // Reset form
  newRide.value = {
    pickupAddress: '',
    pickupLat: 13.7563,
    pickupLng: 100.5018,
    destinationAddress: '',
    destinationLat: 13.7563,
    destinationLng: 100.5018,
    scheduledDate: availableDates.value[0]?.value || '',
    scheduledTime: '',
    rideType: 'standard',
    notes: ''
  }
  showCreateModal.value = true
}

const handleCreateRide = async () => {
  if (!newRide.value.pickupAddress || !newRide.value.destinationAddress || 
      !newRide.value.scheduledDate || !newRide.value.scheduledTime) {
    return
  }
  
  const scheduledDatetime = `${newRide.value.scheduledDate}T${newRide.value.scheduledTime}:00`
  
  const result = await createScheduledRide({
    pickup: {
      lat: newRide.value.pickupLat,
      lng: newRide.value.pickupLng,
      address: newRide.value.pickupAddress
    },
    destination: {
      lat: newRide.value.destinationLat,
      lng: newRide.value.destinationLng,
      address: newRide.value.destinationAddress
    },
    scheduledDatetime,
    rideType: newRide.value.rideType,
    notes: newRide.value.notes || undefined
  })
  
  if (result) {
    showCreateModal.value = false
    await fetchScheduledRides()
  }
}

const goBack = () => {
  router.back()
}

const goToRide = () => {
  router.push('/customer/ride')
}

// Lifecycle
onMounted(async () => {
  await fetchScheduledRides()
})
</script>

<template>
  <div class="scheduled-page">
    <PullToRefresh :loading="isRefreshing || loading" @refresh="handleRefresh">
      <!-- Header -->
      <header class="page-header">
        <div class="header-top">
          <button class="back-btn" @click="goBack" aria-label="กลับ">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="page-title">การจองล่วงหน้า</h1>
          <button class="add-btn" @click="openCreateModal" aria-label="เพิ่มการจอง">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
          </button>
        </div>
        
        <!-- Stats Summary -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-icon upcoming">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke-width="2"/>
                <polyline points="12,6 12,12 16,14" stroke-width="2"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.upcoming }}</span>
              <span class="stat-label">รอดำเนินการ</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon completed">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.completed }}</span>
              <span class="stat-label">เสร็จสิ้น</span>
            </div>
          </div>
        </div>
      </header>

      <div class="content-container">
        <!-- Filter Tabs -->
        <div class="filter-section">
          <div class="filters-scroll">
            <button
              v-for="filter in filters"
              :key="filter.id"
              @click="changeFilter(filter.id)"
              :class="['filter-chip', { active: activeFilter === filter.id }]"
            >
              {{ filter.label }}
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading && !isRefreshing" class="loading-state">
          <div v-for="i in 3" :key="i" class="skeleton-card">
            <div class="skeleton skeleton-header"></div>
            <div class="skeleton skeleton-body"></div>
            <div class="skeleton skeleton-footer"></div>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-state">
          <div class="error-icon">
            <svg width="48" height="48" fill="none" stroke="#EF4444" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke-width="2"/>
              <path stroke-linecap="round" stroke-width="2" d="M12 8v4m0 4h.01"/>
            </svg>
          </div>
          <p class="error-text">{{ error }}</p>
          <button class="retry-btn" @click="handleRefresh">ลองใหม่</button>
        </div>

        <!-- Rides List -->
        <div v-else-if="filteredRides.length > 0" class="rides-list">
          <div
            v-for="ride in filteredRides"
            :key="ride.id"
            class="ride-card"
          >
            <!-- Card Header -->
            <div class="card-header">
              <div class="datetime-badge">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke-width="2"/>
                  <polyline points="12,6 12,12 16,14" stroke-width="2"/>
                </svg>
                <div class="datetime-text">
                  <span class="date">{{ formatDateTime(ride.scheduled_datetime).dateStr }}</span>
                  <span class="time">{{ formatDateTime(ride.scheduled_datetime).timeStr }}</span>
                </div>
              </div>
              <span :class="['status-badge', getStatusClass(ride.status)]">
                {{ getStatusText(ride.status) }}
              </span>
            </div>

            <!-- Route Info -->
            <div class="route-info">
              <div class="route-point">
                <div class="point-marker start"></div>
                <div class="point-text">
                  <span class="point-label">จาก</span>
                  <span class="point-address">{{ ride.pickup_address }}</span>
                </div>
              </div>
              <div class="route-connector"></div>
              <div class="route-point">
                <div class="point-marker end"></div>
                <div class="point-text">
                  <span class="point-label">ถึง</span>
                  <span class="point-address">{{ ride.destination_address }}</span>
                </div>
              </div>
            </div>

            <!-- Ride Details -->
            <div class="ride-details">
              <div class="detail-item">
                <span class="detail-label">ประเภท</span>
                <span class="detail-value">{{ getRideTypeText(ride.ride_type) }}</span>
              </div>
              <div v-if="ride.estimated_fare" class="detail-item">
                <span class="detail-label">ค่าโดยสารโดยประมาณ</span>
                <span class="detail-value price">฿{{ ride.estimated_fare.toLocaleString() }}</span>
              </div>
            </div>

            <!-- Notes -->
            <div v-if="ride.notes" class="ride-notes">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
              </svg>
              <span>{{ ride.notes }}</span>
            </div>

            <!-- Card Actions -->
            <div v-if="['scheduled', 'confirmed'].includes(ride.status)" class="card-actions">
              <button 
                class="action-btn cancel"
                @click="openCancelConfirm(ride.id)"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <div class="empty-icon">
            <svg width="64" height="64" fill="none" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="#F0FDF4" stroke="#00A86B" stroke-width="2" stroke-dasharray="4 4"/>
              <circle cx="32" cy="32" r="16" stroke="#00A86B" stroke-width="2"/>
              <polyline points="32,24 32,32 38,35" stroke="#00A86B" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <h3 class="empty-title">ยังไม่มีการจองล่วงหน้า</h3>
          <p class="empty-desc">จองการเดินทางล่วงหน้าเพื่อความสะดวก</p>
          <button class="empty-cta" @click="goToRide">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            จองเลย
          </button>
        </div>
      </div>
    </PullToRefresh>

    <!-- Create Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
          <div class="modal-content">
            <div class="modal-header">
              <h2>จองล่วงหน้า</h2>
              <button class="close-btn" @click="showCreateModal = false">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <div class="modal-body">
              <!-- Pickup -->
              <div class="form-group">
                <label>จุดรับ</label>
                <input 
                  v-model="newRide.pickupAddress"
                  type="text"
                  placeholder="ระบุจุดรับ"
                  class="form-input"
                />
              </div>

              <!-- Destination -->
              <div class="form-group">
                <label>จุดหมาย</label>
                <input 
                  v-model="newRide.destinationAddress"
                  type="text"
                  placeholder="ระบุจุดหมาย"
                  class="form-input"
                />
              </div>

              <!-- Date Selection -->
              <div class="form-group">
                <label>วัน</label>
                <div class="date-chips">
                  <button
                    v-for="date in availableDates"
                    :key="date.value"
                    :class="['date-chip', { selected: newRide.scheduledDate === date.value }]"
                    @click="newRide.scheduledDate = date.value"
                  >
                    {{ date.label }}
                  </button>
                </div>
              </div>

              <!-- Time Selection -->
              <div v-if="newRide.scheduledDate" class="form-group">
                <label>เวลา</label>
                <div class="time-grid">
                  <button
                    v-for="time in availableTimes"
                    :key="time.value"
                    :class="['time-chip', { selected: newRide.scheduledTime === time.value }]"
                    @click="newRide.scheduledTime = time.value"
                  >
                    {{ time.label }}
                  </button>
                </div>
              </div>

              <!-- Ride Type -->
              <div class="form-group">
                <label>ประเภทรถ</label>
                <div class="type-options">
                  <button
                    v-for="type in ['standard', 'premium', 'shared']"
                    :key="type"
                    :class="['type-btn', { selected: newRide.rideType === type }]"
                    @click="newRide.rideType = type as 'standard' | 'premium' | 'shared'"
                  >
                    {{ getRideTypeText(type) }}
                  </button>
                </div>
              </div>

              <!-- Notes -->
              <div class="form-group">
                <label>หมายเหตุ (ไม่บังคับ)</label>
                <textarea 
                  v-model="newRide.notes"
                  placeholder="เช่น มีสัมภาระ, ต้องการรถใหญ่"
                  class="form-textarea"
                  rows="2"
                ></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-secondary" @click="showCreateModal = false">
                ยกเลิก
              </button>
              <button 
                class="btn-primary"
                :disabled="!newRide.pickupAddress || !newRide.destinationAddress || !newRide.scheduledDate || !newRide.scheduledTime || loading"
                @click="handleCreateRide"
              >
                {{ loading ? 'กำลังจอง...' : 'ยืนยันการจอง' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Cancel Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCancelConfirm" class="modal-overlay" @click.self="showCancelConfirm = false">
          <div class="modal-content confirm-modal">
            <div class="confirm-icon">
              <svg width="48" height="48" fill="none" stroke="#EF4444" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke-width="2"/>
                <path stroke-linecap="round" stroke-width="2" d="M12 8v4m0 4h.01"/>
              </svg>
            </div>
            <h3>ยืนยันการยกเลิก?</h3>
            <p>คุณต้องการยกเลิกการจองนี้หรือไม่?</p>
            <div class="confirm-actions">
              <button class="btn-secondary" @click="showCancelConfirm = false">
                ไม่ใช่
              </button>
              <button 
                class="btn-danger"
                :disabled="cancelLoading"
                @click="handleCancel"
              >
                {{ cancelLoading ? 'กำลังยกเลิก...' : 'ยืนยัน' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>


<style scoped>
/* Base */
.scheduled-page {
  min-height: 100vh;
  background: #F8F9FA;
  padding-bottom: 100px;
}

/* Header */
.page-header {
  background: white;
  padding: 16px 16px 20px;
  border-radius: 0 0 20px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.back-btn,
.add-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  color: #1A1A1A;
}

.back-btn:active,
.add-btn:active {
  transform: scale(0.95);
  background: #EBEBEB;
}

.add-btn {
  background: #00A86B;
  color: white;
}

.add-btn:active {
  background: #009960;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #FAFAFA;
  border-radius: 14px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.stat-icon.upcoming {
  background: #E3F2FD;
  color: #1976D2;
}

.stat-icon.completed {
  background: #E8F5EF;
  color: #00A86B;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
}

.stat-label {
  font-size: 12px;
  color: #6B7280;
}

/* Content */
.content-container {
  max-width: 480px;
  margin: 0 auto;
  padding: 0 16px;
}

/* Filters */
.filter-section {
  padding: 16px 0;
  position: sticky;
  top: 0;
  z-index: 10;
  background: #F8F9FA;
}

.filters-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.filters-scroll::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  padding: 10px 16px;
  background: white;
  border: 1.5px solid #E5E5E5;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 500;
  color: #4A4A4A;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  min-height: 44px;
}

.filter-chip:active {
  transform: scale(0.96);
}

.filter-chip.active {
  background: #00A86B;
  border-color: #00A86B;
  color: white;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

.skeleton-header {
  height: 24px;
  width: 60%;
  margin-bottom: 16px;
}

.skeleton-body {
  height: 60px;
  margin-bottom: 12px;
}

.skeleton-footer {
  height: 20px;
  width: 40%;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
}

.error-icon {
  margin-bottom: 16px;
}

.error-text {
  font-size: 14px;
  color: #6B7280;
  margin-bottom: 16px;
}

.retry-btn {
  padding: 12px 24px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* Rides List */
.rides-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ride-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

/* Card Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.datetime-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #E3F2FD;
  border-radius: 10px;
  color: #1976D2;
}

.datetime-text {
  display: flex;
  flex-direction: column;
}

.datetime-text .date {
  font-size: 13px;
  font-weight: 600;
}

.datetime-text .time {
  font-size: 15px;
  font-weight: 700;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.pending {
  background: #FEF3C7;
  color: #D97706;
}

.status-badge.confirmed {
  background: #DCFCE7;
  color: #15803D;
}

.status-badge.completed {
  background: #E0E7FF;
  color: #4338CA;
}

.status-badge.cancelled {
  background: #FEE2E2;
  color: #DC2626;
}

/* Route Info */
.route-info {
  background: #FAFAFA;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
}

.route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.point-marker {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.point-marker.start {
  background: #00A86B;
}

.point-marker.end {
  background: white;
  border: 2.5px solid #EF4444;
}

.route-connector {
  width: 2px;
  height: 20px;
  background: linear-gradient(180deg, #00A86B 0%, #E5E5E5 50%, #EF4444 100%);
  margin-left: 4px;
  margin: 4px 0 4px 4px;
}

.point-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.point-label {
  font-size: 11px;
  color: #9CA3AF;
  font-weight: 500;
  text-transform: uppercase;
}

.point-address {
  font-size: 14px;
  color: #1A1A1A;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Ride Details */
.ride-details {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-top: 1px solid #F3F4F6;
  margin-bottom: 8px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-label {
  font-size: 11px;
  color: #9CA3AF;
}

.detail-value {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.detail-value.price {
  color: #00A86B;
}

/* Notes */
.ride-notes {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #F9FAFB;
  border-radius: 8px;
  font-size: 13px;
  color: #6B7280;
  margin-bottom: 12px;
}

/* Card Actions */
.card-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #F3F4F6;
}

.action-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
}

.action-btn.cancel {
  background: #FEE2E2;
  color: #DC2626;
}

.action-btn.cancel:active {
  transform: scale(0.96);
  background: #FECACA;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  margin-bottom: 20px;
}

.empty-title {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: #6B7280;
  margin-bottom: 24px;
}

.empty-cta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 48px;
}

.empty-cta:active {
  transform: scale(0.96);
  background: #009960;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-content {
  background: white;
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #F3F4F6;
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
}

.close-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #4A4A4A;
  margin-bottom: 8px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 14px 16px;
  background: #F5F5F5;
  border: 1.5px solid transparent;
  border-radius: 12px;
  font-size: 15px;
  color: #1A1A1A;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #00A86B;
  background: white;
}

.form-textarea {
  resize: none;
}

/* Date Chips */
.date-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.date-chip {
  padding: 10px 16px;
  background: #F5F5F5;
  border: 1.5px solid transparent;
  border-radius: 100px;
  font-size: 13px;
  color: #1A1A1A;
  cursor: pointer;
  transition: all 0.2s;
}

.date-chip.selected {
  background: #E8F5EF;
  border-color: #00A86B;
  color: #00A86B;
  font-weight: 600;
}

/* Time Grid */
.time-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
}

.time-chip {
  padding: 10px 8px;
  background: #F5F5F5;
  border: 1.5px solid transparent;
  border-radius: 8px;
  font-size: 13px;
  color: #1A1A1A;
  cursor: pointer;
  transition: all 0.2s;
}

.time-chip.selected {
  background: #E8F5EF;
  border-color: #00A86B;
  color: #00A86B;
  font-weight: 600;
}

/* Type Options */
.type-options {
  display: flex;
  gap: 8px;
}

.type-btn {
  flex: 1;
  padding: 12px;
  background: #F5F5F5;
  border: 1.5px solid transparent;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  cursor: pointer;
  transition: all 0.2s;
}

.type-btn.selected {
  background: #E8F5EF;
  border-color: #00A86B;
  color: #00A86B;
  font-weight: 600;
}

/* Modal Footer */
.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #F3F4F6;
  position: sticky;
  bottom: 0;
  background: white;
}

.btn-secondary,
.btn-primary,
.btn-danger {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 48px;
}

.btn-secondary {
  background: #F5F5F5;
  color: #4A4A4A;
}

.btn-primary {
  background: #00A86B;
  color: white;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-danger {
  background: #EF4444;
  color: white;
}

/* Confirm Modal */
.confirm-modal {
  border-radius: 20px;
  padding: 32px 24px;
  text-align: center;
  max-width: 340px;
}

.confirm-icon {
  margin-bottom: 16px;
}

.confirm-modal h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.confirm-modal p {
  font-size: 14px;
  color: #6B7280;
  margin-bottom: 24px;
}

.confirm-actions {
  display: flex;
  gap: 12px;
}

/* Modal Animation */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: translateY(100%);
}

/* Responsive */
@media (max-width: 360px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
  
  .time-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
