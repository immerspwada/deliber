<script setup lang="ts">
/**
 * Feature: F160 - Laundry Service Tracking
 * Customer view for tracking laundry request status
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLaundry } from '../composables/useLaundry'

const route = useRoute()
const router = useRouter()
const { currentRequest, loading, subscribeToRequest, unsubscribe, submitRating, serviceLabels } = useLaundry()

const requestId = computed(() => route.params.id as string)
const showRating = ref(false)
const rating = ref(5)
const comment = ref('')

const statusSteps = [
  { status: 'pending', label: 'รอรับ' },
  { status: 'matched', label: 'จับคู่' },
  { status: 'picked_up', label: 'รับผ้า' },
  { status: 'washing', label: 'ซัก' },
  { status: 'ready', label: 'พร้อมส่ง' },
  { status: 'delivered', label: 'ส่งแล้ว' }
]

const currentStepIndex = computed(() => {
  if (!currentRequest.value) return 0
  return statusSteps.findIndex(s => s.status === currentRequest.value?.status)
})

const goBack = () => router.back()

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('th-TH').format(price)
}

const formatServices = (services: string[]) => {
  if (!services || !Array.isArray(services)) return '-'
  return services.map(s => serviceLabels[s as keyof typeof serviceLabels] || s).join(', ')
}

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
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
      <h1>ติดตามบริการซักผ้า</h1>
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
        <h3>รายละเอียดการซักผ้า</h3>
        
        <div class="detail-row">
          <span class="label">บริการ</span>
          <span class="value">{{ formatServices(currentRequest.services) }}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">ที่อยู่รับ-ส่ง</span>
          <span class="value">{{ currentRequest.pickup_address }}</span>
        </div>
        
        <div class="detail-row">
          <span class="label">นัดรับ</span>
          <span class="value">{{ formatDateTime(currentRequest.scheduled_pickup) }}</span>
        </div>
        
        <div v-if="currentRequest.actual_weight" class="detail-row">
          <span class="label">น้ำหนักจริง</span>
          <span class="value">{{ currentRequest.actual_weight }} กก.</span>
        </div>
        <div v-else-if="currentRequest.estimated_weight" class="detail-row">
          <span class="label">น้ำหนักประมาณ</span>
          <span class="value">~{{ currentRequest.estimated_weight }} กก.</span>
        </div>
        
        <div v-if="currentRequest.notes" class="detail-row">
          <span class="label">หมายเหตุ</span>
          <span class="value">{{ currentRequest.notes }}</span>
        </div>
        
        <div class="detail-row fee">
          <span class="label">ราคา</span>
          <span class="value">
            <span v-if="currentRequest.final_price">฿{{ formatPrice(currentRequest.final_price) }}</span>
            <span v-else-if="currentRequest.estimated_price">~฿{{ formatPrice(currentRequest.estimated_price) }}</span>
            <span v-else>รอคำนวณ</span>
          </span>
        </div>
      </div>

      <!-- Status Info -->
      <div v-if="currentRequest.status === 'washing'" class="status-info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="2" width="18" height="20" rx="2"/>
          <circle cx="12" cy="13" r="5"/>
          <path d="M9 13c0-1.5 1.5-2 3-1s3 .5 3-1"/>
        </svg>
        <p>กำลังซักผ้าของคุณ</p>
      </div>

      <div v-if="currentRequest.status === 'ready'" class="status-info ready">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        <p>ผ้าพร้อมส่งแล้ว รอจัดส่ง</p>
      </div>

      <!-- Rating (when delivered) -->
      <div v-if="currentRequest.status === 'delivered' && !showRating" class="rate-btn-container">
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
  background: #00BCD4;
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
  padding: 24px 12px;
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
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #E8E8E8;
  margin-bottom: 6px;
  z-index: 1;
}

.timeline-step.active .step-dot { background: #00BCD4; }
.timeline-step.current .step-dot { box-shadow: 0 0 0 4px rgba(0, 188, 212, 0.2); }

.step-label {
  font-size: 10px;
  color: #999999;
  text-align: center;
}

.timeline-step.active .step-label {
  color: #00BCD4;
  font-weight: 500;
}

.step-line {
  position: absolute;
  top: 8px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #E8E8E8;
}

.timeline-step.active .step-line { background: #00BCD4; }

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

.detail-row:last-child { border-bottom: none; }
.detail-row .label { font-size: 14px; color: #666666; }
.detail-row .value { font-size: 14px; font-weight: 500; color: #1A1A1A; text-align: right; max-width: 60%; }
.detail-row.fee .value { color: #00BCD4; font-size: 18px; }

.status-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  background: #E0F7FA;
  border-radius: 16px;
  margin-bottom: 20px;
}

.status-info svg {
  width: 48px;
  height: 48px;
  color: #00BCD4;
}

.status-info p {
  font-size: 14px;
  color: #00838F;
  margin: 0;
}

.status-info.ready {
  background: #E8F5E9;
}

.status-info.ready svg { color: #00A86B; }
.status-info.ready p { color: #2E7D32; }

.rate-btn-container { margin-bottom: 20px; }

.rate-btn {
  width: 100%;
  padding: 14px;
  background: #00BCD4;
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
