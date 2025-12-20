<script setup lang="ts">
/**
 * Provider Scheduled Rides View - F15
 * แสดงการจองล่วงหน้าที่ใกล้ถึงเวลาให้ Provider รับงาน
 */
import { ref, onMounted, computed } from 'vue'
import { useProvider } from '../../composables/useProvider'
import { useRouter } from 'vue-router'

const router = useRouter()
const { 
  profile, 
  upcomingScheduledRides, 
  fetchUpcomingScheduledRides, 
  acceptScheduledRide,
  loading 
} = useProvider()

const accepting = ref<string | null>(null)
const errorMsg = ref<string | null>(null)
const successMsg = ref<string | null>(null)

onMounted(async () => {
  await fetchUpcomingScheduledRides()
})

const handleAccept = async (rideId: string) => {
  accepting.value = rideId
  errorMsg.value = null
  
  const result = await acceptScheduledRide(rideId)
  
  if (result.success) {
    successMsg.value = 'รับงานสำเร็จ!'
    setTimeout(() => {
      router.push('/provider/dashboard')
    }, 1500)
  } else {
    errorMsg.value = result.error || 'ไม่สามารถรับงานได้'
  }
  
  accepting.value = null
}

const formatDateTime = (datetime: string) => {
  const date = new Date(datetime)
  return {
    date: date.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  }
}

const getTimeUntil = (datetime: string) => {
  const now = new Date()
  const scheduled = new Date(datetime)
  const diffMs = scheduled.getTime() - now.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 60) return `${diffMins} นาที`
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return `${hours} ชม. ${mins} นาที`
}

const isUrgent = (datetime: string) => {
  const now = new Date()
  const scheduled = new Date(datetime)
  const diffMs = scheduled.getTime() - now.getTime()
  return diffMs < 30 * 60 * 1000 // Less than 30 minutes
}
</script>

<template>
  <div class="scheduled-rides-page">
    <!-- Header -->
    <header class="page-header">
      <button @click="router.back()" class="back-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <h1>งานจองล่วงหน้า</h1>
      <button @click="fetchUpcomingScheduledRides" class="refresh-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </button>
    </header>

    <!-- Success Message -->
    <div v-if="successMsg" class="success-toast">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
      </svg>
      <span>{{ successMsg }}</span>
    </div>

    <!-- Error Message -->
    <div v-if="errorMsg" class="error-toast">
      <span>{{ errorMsg }}</span>
      <button @click="errorMsg = null">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Info Banner -->
    <div class="info-banner">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <p>แสดงงานจองล่วงหน้าที่จะถึงภายใน 2 ชั่วโมง</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>กำลังโหลด...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="upcomingScheduledRides.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </div>
      <h3>ไม่มีงานจองล่วงหน้า</h3>
      <p>ยังไม่มีงานจองที่ใกล้ถึงเวลา</p>
    </div>

    <!-- Rides List -->
    <div v-else class="rides-list">
      <div 
        v-for="ride in upcomingScheduledRides" 
        :key="ride.id" 
        :class="['ride-card', { urgent: isUrgent(ride.scheduled_datetime) }]"
      >
        <!-- Time Badge -->
        <div class="time-badge" :class="{ urgent: isUrgent(ride.scheduled_datetime) }">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>อีก {{ getTimeUntil(ride.scheduled_datetime) }}</span>
        </div>

        <!-- Scheduled Time -->
        <div class="scheduled-time">
          <span class="time-label">เวลานัดหมาย</span>
          <span class="time-value">{{ formatDateTime(ride.scheduled_datetime).time }}</span>
          <span class="date-value">{{ formatDateTime(ride.scheduled_datetime).date }}</span>
        </div>

        <!-- Customer Info -->
        <div v-if="ride.customer_name" class="customer-info">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          <span>{{ ride.customer_name }}</span>
        </div>

        <!-- Route -->
        <div class="route-info">
          <div class="route-point">
            <div class="point-dot pickup"></div>
            <span>{{ ride.pickup_address }}</span>
          </div>
          <div class="route-line"></div>
          <div class="route-point">
            <div class="point-dot destination"></div>
            <span>{{ ride.destination_address }}</span>
          </div>
        </div>

        <!-- Meta -->
        <div class="ride-meta">
          <span class="ride-type">{{ ride.ride_type || 'Standard' }}</span>
          <span v-if="ride.estimated_fare" class="ride-fare">~฿{{ ride.estimated_fare }}</span>
        </div>

        <!-- Accept Button -->
        <button 
          @click="handleAccept(ride.id)"
          :disabled="accepting === ride.id"
          class="accept-btn"
        >
          <template v-if="accepting === ride.id">
            <div class="btn-spinner"></div>
            กำลังรับงาน...
          </template>
          <template v-else>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            รับงานนี้
          </template>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scheduled-rides-page {
  min-height: 100vh;
  background: #f6f6f6;
  padding-bottom: 100px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn, .refresh-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border: none;
  border-radius: 10px;
}

.back-btn svg, .refresh-btn svg {
  width: 20px;
  height: 20px;
}

.page-header h1 {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
}

.success-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: #00A86B;
  color: #fff;
  padding: 12px 24px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 100;
  animation: slideDown 0.3s ease;
}

.success-toast svg {
  width: 20px;
  height: 20px;
}

.error-toast {
  margin: 16px;
  padding: 12px 16px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.error-toast button {
  background: none;
  border: none;
  padding: 4px;
}

.error-toast svg {
  width: 16px;
  height: 16px;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.info-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px;
  padding: 12px 16px;
  background: #E8F5EF;
  border-radius: 12px;
  color: #00A86B;
}

.info-banner svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.info-banner p {
  font-size: 13px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 12px;
  color: #6b6b6b;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e5e5;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  background: #f0f0f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.empty-icon svg {
  width: 40px;
  height: 40px;
  color: #999;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
  color: #6b6b6b;
}

.rides-list {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ride-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  position: relative;
}

.ride-card.urgent {
  border: 2px solid #f59e0b;
}

.time-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #E8F5EF;
  color: #00A86B;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 16px;
}

.time-badge.urgent {
  background: #fef3c7;
  color: #92400e;
}

.time-badge svg {
  width: 14px;
  height: 14px;
}

.scheduled-time {
  margin-bottom: 16px;
}

.time-label {
  display: block;
  font-size: 12px;
  color: #6b6b6b;
  margin-bottom: 4px;
}

.time-value {
  font-size: 28px;
  font-weight: 700;
  margin-right: 8px;
}

.date-value {
  font-size: 14px;
  color: #6b6b6b;
}

.customer-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 10px;
}

.customer-info svg {
  width: 20px;
  height: 20px;
  color: #6b6b6b;
}

.route-info {
  margin-bottom: 16px;
}

.route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.point-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.point-dot.pickup {
  background: #00A86B;
}

.point-dot.destination {
  background: #E53935;
}

.route-line {
  width: 2px;
  height: 20px;
  background: #e5e5e5;
  margin-left: 5px;
  margin: 4px 0 4px 5px;
}

.route-point span {
  font-size: 14px;
  line-height: 1.4;
}

.ride-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #6b6b6b;
}

.ride-fare {
  font-weight: 600;
  color: #00A86B;
}

.accept-btn {
  width: 100%;
  padding: 16px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.accept-btn:hover {
  background: #008F5B;
}

.accept-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.accept-btn svg {
  width: 20px;
  height: 20px;
}

.btn-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
</style>
