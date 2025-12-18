<script setup lang="ts">
/**
 * Feature: F158 - Queue Booking Tracking
 * Customer view for tracking queue booking status
 */
import { onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQueueBooking } from '../composables/useQueueBooking'

const route = useRoute()
const router = useRouter()
const { currentBooking: currentRequest, loading, error, subscribeToBooking, unsubscribe, cancelBooking, categoryLabels } = useQueueBooking()

const bookingId = computed(() => route.params.id as string)

const statusSteps = [
  { status: 'pending', label: 'รอดำเนินการ' },
  { status: 'confirmed', label: 'ยืนยันแล้ว' },
  { status: 'in_progress', label: 'กำลังดำเนินการ' },
  { status: 'completed', label: 'เสร็จสิ้น' }
]

const currentStepIndex = computed(() => {
  if (!currentRequest.value) return 0
  return statusSteps.findIndex(s => s.status === currentRequest.value?.status)
})

const goBack = () => router.back()

const handleCancel = async () => {
  if (!confirm('ต้องการยกเลิกการจองนี้หรือไม่?')) return
  const success = await cancelBooking(bookingId.value, 'ลูกค้ายกเลิก')
  if (success) {
    router.push('/customer/services')
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const formatTime = (time: string) => {
  return time?.substring(0, 5) || '-'
}

onMounted(() => {
  subscribeToBooking(bookingId.value)
})

onUnmounted(() => {
  unsubscribe()
})
</script>

<template>
  <div class="tracking-page">
    <!-- Header -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <h1>ติดตามการจองคิว</h1>
      <div class="spacer"></div>
    </div>

    <div class="content" v-if="currentRequest">
      <!-- Tracking ID -->
      <div class="tracking-id-card">
        <span class="label">หมายเลขติดตาม</span>
        <span class="tracking-id">{{ currentRequest.tracking_id }}</span>
      </div>

      <!-- Status Timeline -->
      <div class="status-timeline">
        <div 
          v-for="(step, index) in statusSteps" 
          :key="step.status"
          :class="['timeline-step', { 
            active: index <= currentStepIndex,
            current: index === currentStepIndex
          }]"
        >
          <div class="step-dot"></div>
          <div class="step-label">{{ step.label }}</div>
          <div v-if="index < statusSteps.length - 1" class="step-line"></div>
        </div>
      </div>

      <!-- Booking Details -->
      <div class="details-card">
        <h3>รายละเอียดการจอง</h3>
        
        <div class="detail-row">
          <span class="label">ประเภท</span>
          <span class="value">{{ categoryLabels[currentRequest.category] }}</span>
        </div>
        
        <div class="detail-row" v-if="currentRequest.place_name">
          <span class="label">สถานที่</span>
          <span class="value">{{ currentRequest.place_name }}</span>
        </div>
        
        <div class="detail-row" v-if="currentRequest.place_address">
          <span class="label">ที่อยู่</span>
          <span class="value">{{ currentRequest.place_address }}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">วันที่</span>
          <span class="value">{{ formatDate(currentRequest.scheduled_date) }}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">เวลา</span>
          <span class="value">{{ formatTime(currentRequest.scheduled_time) }}</span>
        </div>
        
        <div class="detail-row" v-if="currentRequest.details">
          <span class="label">รายละเอียด</span>
          <span class="value">{{ currentRequest.details }}</span>
        </div>
        
        <div class="detail-row fee">
          <span class="label">ค่าบริการ</span>
          <span class="value">฿{{ currentRequest.service_fee }}</span>
        </div>
      </div>

      <!-- Cancel Button -->
      <button 
        v-if="currentRequest.status === 'pending' || currentRequest.status === 'confirmed'"
        class="cancel-btn"
        @click="handleCancel"
      >
        ยกเลิกการจอง
      </button>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="loading">
      <p>กำลังโหลด...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.tracking-page {
  min-height: 100vh;
  background: #F5F5F5;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top));
  background: #FFFFFF;
  border-bottom: 1px solid #F0F0F0;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  color: #1A1A1A;
}

.header h1 {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
}

.spacer {
  width: 40px;
}

.content {
  padding: 20px;
}

.tracking-id-card {
  background: #9C27B0;
  color: #FFFFFF;
  padding: 20px;
  border-radius: 16px;
  text-align: center;
  margin-bottom: 20px;
}

.tracking-id-card .label {
  display: block;
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 4px;
}

.tracking-id-card .tracking-id {
  font-size: 20px;
  font-weight: 700;
  font-family: monospace;
  letter-spacing: 1px;
}

.status-timeline {
  display: flex;
  justify-content: space-between;
  padding: 24px 20px;
  background: #FFFFFF;
  border-radius: 16px;
  margin-bottom: 20px;
}

.timeline-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
}

.step-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #E8E8E8;
  margin-bottom: 8px;
  z-index: 1;
}

.timeline-step.active .step-dot {
  background: #9C27B0;
}

.timeline-step.current .step-dot {
  box-shadow: 0 0 0 4px rgba(156, 39, 176, 0.2);
}

.step-label {
  font-size: 11px;
  color: #999999;
  text-align: center;
}

.timeline-step.active .step-label {
  color: #9C27B0;
  font-weight: 500;
}

.step-line {
  position: absolute;
  top: 10px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #E8E8E8;
}

.timeline-step.active .step-line {
  background: #9C27B0;
}

.details-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
}

.details-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #F0F0F0;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  font-size: 14px;
  color: #666666;
}

.detail-row .value {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  text-align: right;
  max-width: 60%;
}

.detail-row.fee .value {
  color: #9C27B0;
  font-size: 16px;
}

.cancel-btn {
  width: 100%;
  padding: 14px;
  background: #FFFFFF;
  color: #E53935;
  border: 2px solid #E53935;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.loading, .error {
  padding: 48px 20px;
  text-align: center;
  color: #666666;
}
</style>
