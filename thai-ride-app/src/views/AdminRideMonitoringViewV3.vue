<script setup lang="ts">
/**
 * Feature: Multi-Role Ride Booking System V3 - Admin Ride Monitoring
 * Task 7.3: AdminRideMonitoringViewV3.vue
 * 
 * Real-time monitoring of all active rides with filtering
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminRideMonitoring } from '../composables/useAdminRideMonitoring'

const router = useRouter()

const {
  activeRides,
  rideStats,
  isLoading,
  error,
  subscribeToAllActiveRides,
  loadActiveRides
} = useAdminRideMonitoring()

const searchQuery = ref('')
const statusFilter = ref<string>('all')

const statusOptions = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'pending', label: 'รอคนขับ' },
  { value: 'matched', label: 'จับคู่แล้ว' },
  { value: 'in_progress', label: 'กำลังเดินทาง' }
]

const statusColors: Record<string, string> = {
  pending: '#F5A623',
  matched: '#00A86B',
  arriving: '#00A86B',
  picked_up: '#1976D2',
  in_progress: '#1976D2',
  completed: '#4CAF50',
  cancelled: '#E53935'
}

const statusLabels: Record<string, string> = {
  pending: 'รอคนขับ',
  matched: 'จับคู่แล้ว',
  arriving: 'กำลังมารับ',
  picked_up: 'รับแล้ว',
  in_progress: 'กำลังเดินทาง',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก'
}

const filteredRides = computed(() => {
  let rides = activeRides.value

  // Filter by status
  if (statusFilter.value !== 'all') {
    rides = rides.filter(r => r.status === statusFilter.value)
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    rides = rides.filter(r => 
      r.tracking_id.toLowerCase().includes(query) ||
      r.pickup_address.toLowerCase().includes(query) ||
      r.destination_address.toLowerCase().includes(query)
    )
  }

  return rides
})

const viewRideDetail = (rideId: string) => {
  router.push(`/admin/rides/${rideId}`)
}

const formatTime = (date: string) => {
  const d = new Date(date)
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

const formatFare = (fare: number) => `฿${fare.toLocaleString()}`

onMounted(async () => {
  await loadActiveRides()
  await subscribeToAllActiveRides()
})
</script>

<template>
  <div class="admin-monitoring-page">
    <!-- Header -->
    <div class="header">
      <h1>ติดตามการเดินทาง</h1>
      <button class="refresh-btn" @click="loadActiveRides" :disabled="isLoading">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
        </svg>
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon total">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
            <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
            <path d="M5 17h-2v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ rideStats.total_active }}</span>
          <span class="stat-label">งานทั้งหมด</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon pending">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ rideStats.pending }}</span>
          <span class="stat-label">รอคนขับ</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon matched">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ rideStats.matched }}</span>
          <span class="stat-label">จับคู่แล้ว</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon progress">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ rideStats.in_progress }}</span>
          <span class="stat-label">กำลังเดินทาง</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหา Tracking ID หรือสถานที่..."
        />
      </div>

      <div class="status-filters">
        <button
          v-for="option in statusOptions"
          :key="option.value"
          :class="['filter-btn', { active: statusFilter === option.value }]"
          @click="statusFilter = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && activeRides.length === 0" class="loading-state">
      <div class="spinner"></div>
      <span>กำลังโหลด...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{{ error }}</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredRides.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 12h8M12 8v8"/>
      </svg>
      <h3>ไม่มีการเดินทาง</h3>
      <p>{{ searchQuery ? 'ไม่พบผลลัพธ์ที่ค้นหา' : 'ไม่มีการเดินทางที่กำลังดำเนินการ' }}</p>
    </div>

    <!-- Rides List -->
    <div v-else class="rides-list">
      <div
        v-for="ride in filteredRides"
        :key="ride.id"
        class="ride-card"
        @click="viewRideDetail(ride.id)"
      >
        <!-- Header -->
        <div class="ride-header">
          <div class="tracking-id">{{ ride.tracking_id }}</div>
          <div class="status-badge" :style="{ background: statusColors[ride.status] }">
            {{ statusLabels[ride.status] }}
          </div>
        </div>

        <!-- Locations -->
        <div class="ride-locations">
          <div class="location-row">
            <div class="location-dot pickup"></div>
            <span class="location-text">{{ ride.pickup_address }}</span>
          </div>
          <div class="location-connector"></div>
          <div class="location-row">
            <div class="location-dot destination"></div>
            <span class="location-text">{{ ride.destination_address }}</span>
          </div>
        </div>

        <!-- Meta -->
        <div class="ride-meta">
          <div class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
            <span>{{ formatTime(ride.created_at) }}</span>
          </div>
          <div class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
              <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
              <path d="M5 17h-2v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5"/>
            </svg>
            <span>{{ ride.vehicle_type === 'car' ? 'รถเก๋ง' : ride.vehicle_type === 'motorcycle' ? 'มอเตอร์ไซค์' : 'รถตู้' }}</span>
          </div>
          <div class="meta-item fare">
            {{ formatFare(ride.estimated_fare) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-monitoring-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.refresh-btn {
  width: 40px;
  height: 40px;
  background: #fff;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #F8F8F8;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.total {
  background: #E8F5EF;
  color: #00A86B;
}

.stat-icon.pending {
  background: #FFF3E0;
  color: #F5A623;
}

.stat-icon.matched {
  background: #E8F5EF;
  color: #00A86B;
}

.stat-icon.progress {
  background: #E3F2FD;
  color: #1976D2;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1A1A1A;
}

.stat-label {
  font-size: 13px;
  color: #666;
}

.filters-section {
  margin-bottom: 24px;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  margin-bottom: 16px;
}

.search-bar svg {
  width: 20px;
  height: 20px;
  color: #999;
}

.search-bar input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
}

.status-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn.active {
  background: #00A86B;
  color: #fff;
  border-color: #00A86B;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 20px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state svg {
  width: 64px;
  height: 64px;
  color: #CCC;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.empty-state p {
  font-size: 14px;
  color: #999;
  margin: 0;
}

.rides-list {
  display: grid;
  gap: 16px;
}

.ride-card {
  background: #fff;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.ride-card:hover {
  border-color: #00A86B;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.1);
}

.ride-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.tracking-id {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  font-family: monospace;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.ride-locations {
  margin-bottom: 16px;
}

.location-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 6px 0;
}

.location-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.location-dot.pickup {
  background: #00A86B;
}

.location-dot.destination {
  background: #E53935;
}

.location-connector {
  width: 2px;
  height: 16px;
  background: #E8E8E8;
  margin-left: 4px;
}

.location-text {
  font-size: 14px;
  color: #1A1A1A;
  line-height: 1.4;
}

.ride-meta {
  display: flex;
  gap: 16px;
  align-items: center;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
}

.meta-item svg {
  width: 16px;
  height: 16px;
}

.meta-item.fare {
  margin-left: auto;
  color: #00A86B;
  font-weight: 600;
  font-size: 15px;
}
</style>
