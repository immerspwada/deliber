<script setup lang="ts">
/**
 * Feature: F159 - Moving Service Tracking
 * Customer view for tracking moving request status
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMoving } from '../composables/useMoving'

const route = useRoute()
const router = useRouter()
const { currentRequest, loading, subscribeToRequest, unsubscribe, submitRating, serviceTypeLabels } = useMoving()

const requestId = computed(() => route.params.id as string)
const showRating = ref(false)
const rating = ref(5)
const comment = ref('')

const statusSteps = [
  { status: 'pending', label: 'รอผู้ให้บริการ' },
  { status: 'matched', label: 'จับคู่แล้ว' },
  { status: 'pickup', label: 'กำลังไปรับ' },
  { status: 'in_progress', label: 'กำลังขนย้าย' },
  { status: 'completed', label: 'เสร็จสิ้น' }
]

const currentStepIndex = computed(() => {
  if (!currentRequest.value) return 0
  return statusSteps.findIndex(s => s.status === currentRequest.value?.status)
})

const goBack = () => router.back()

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('th-TH').format(price)
}

const handleSubmitRating = async () => {
  if (!currentRequest.value?.provider_id) return
  const success = await submitRating(requestId.value, currentRequest.value.provider_id, rating.value, comment.value)
  if (success) {
    showRating.value = false
    router.push('/customer/services')
  }
}

onMounted(() => {
  subscribeToRequest(requestId.value)
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
      <h1>ติดตามบริการยกของ</h1>
      <div class="spacer"></div>
    </div>

    <div v-if="currentRequest" class="content">
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

      <!-- Request Details -->
      <div class="details-card">
        <h3>รายละเอียดการขนย้าย</h3>
        
        <div class="detail-row">
          <span class="label">ประเภท</span>
          <span class="value">{{ serviceTypeLabels[currentRequest.service_type] }}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">จำนวนคนช่วย</span>
          <span class="value">{{ currentRequest.helper_count }} คน</span>
        </div>
        
        <div class="location-section">
          <div class="location-item pickup">
            <div class="location-marker"></div>
            <div class="location-info">
              <span class="location-label">จุดรับ</span>
              <span class="location-address">{{ currentRequest.pickup_address }}</span>
            </div>
          </div>
          <div class="location-item destination">
            <div class="location-marker"></div>
            <div class="location-info">
              <span class="location-label">จุดส่ง</span>
              <span class="location-address">{{ currentRequest.destination_address }}</span>
            </div>
          </div>
        </div>
        
        <div v-if="currentRequest.item_description" class="detail-row">
          <span class="label">รายการสิ่งของ</span>
          <span class="value">{{ currentRequest.item_description }}</span>
        </div>
        
        <div class="detail-row fee">
          <span class="label">ราคา</span>
          <span class="value">
            <span v-if="currentRequest.final_price">฿{{ formatPrice(currentRequest.final_price) }}</span>
            <span v-else>~฿{{ formatPrice(currentRequest.estimated_price) }}</span>
          </span>
        </div>
      </div>

      <!-- Rating (when completed) -->
      <div v-if="currentRequest.status === 'completed' && !showRating" class="rate-btn-container">
        <button class="rate-btn" @click="showRating = true">
          ให้คะแนนบริการ
        </button>
      </div>

      <!-- Rating Form -->
      <div v-if="showRating" class="rating-card">
        <h3>ให้คะแนนบริการ</h3>
        <div class="stars">
          <button 
            v-for="n in 5" 
            :key="n" 
            :class="['star', { active: n <= rating }]"
            @click="rating = n"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
        </div>
        <textarea v-model="comment" placeholder="แสดงความคิดเห็น (ไม่บังคับ)" rows="3"></textarea>
        <button class="submit-rating-btn" @click="handleSubmitRating">ส่งคะแนน</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="loading">
      <p>กำลังโหลด...</p>
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

.spacer { width: 40px; }

.content { padding: 20px; }

.tracking-id-card {
  background: #2196F3;
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
}

.status-timeline {
  display: flex;
  justify-content: space-between;
  padding: 24px 16px;
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
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #E8E8E8;
  margin-bottom: 8px;
  z-index: 1;
}

.timeline-step.active .step-dot { background: #2196F3; }
.timeline-step.current .step-dot { box-shadow: 0 0 0 4px rgba(33, 150, 243, 0.2); }

.step-label {
  font-size: 10px;
  color: #999999;
  text-align: center;
}

.timeline-step.active .step-label {
  color: #2196F3;
  font-weight: 500;
}

.step-line {
  position: absolute;
  top: 9px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #E8E8E8;
}

.timeline-step.active .step-line { background: #2196F3; }

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

.detail-row .label { font-size: 14px; color: #666666; }
.detail-row .value { font-size: 14px; font-weight: 500; color: #1A1A1A; }
.detail-row.fee .value { color: #2196F3; font-size: 18px; }

.location-section {
  padding: 16px 0;
  border-bottom: 1px solid #F0F0F0;
}

.location-item {
  display: flex;
  gap: 12px;
  padding: 8px 0;
}

.location-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
}

.location-item.pickup .location-marker { background: #00A86B; }
.location-item.destination .location-marker { background: #E53935; }

.location-info { flex: 1; }
.location-label { display: block; font-size: 12px; color: #999999; }
.location-address { display: block; font-size: 14px; color: #1A1A1A; margin-top: 2px; }

.rate-btn-container { margin-bottom: 20px; }

.rate-btn {
  width: 100%;
  padding: 14px;
  background: #2196F3;
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.rating-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 20px;
}

.rating-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
  text-align: center;
}

.stars {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}

.star {
  width: 40px;
  height: 40px;
  background: none;
  border: none;
  color: #E8E8E8;
  cursor: pointer;
}

.star.active { color: #F5A623; }
.star svg { width: 100%; height: 100%; }

.rating-card textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #E8E8E8;
  border-radius: 10px;
  font-size: 14px;
  resize: none;
  margin-bottom: 16px;
}

.submit-rating-btn {
  width: 100%;
  padding: 14px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.loading { padding: 48px 20px; text-align: center; color: #666666; }
</style>
