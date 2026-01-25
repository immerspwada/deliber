<script setup lang="ts">
/**
 * Minimal Step-by-Step Provider Job Detail View
 * 
 * Design: Clean Black & White UI with SVG Icons
 * - Step-by-step progress indicator
 * - Focus on primary actions
 * - Essential information only
 * - Mobile-first design
 */

import { ref, computed, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProviderJobDetail } from '../../composables/useProviderJobDetail'
import { useETA } from '../../composables/useETA'
import { useNavigation } from '../../composables/useNavigation'
import { useURLTracking } from '../../composables/useURLTracking'

// Lazy load ChatDrawer
const ChatDrawer = defineAsyncComponent(() => import('../../components/ChatDrawer.vue'))

const route = useRoute()
const router = useRouter()

const {
  job,
  loading,
  updating,
  error,
  currentStatusIndex,
  nextStatus,
  canUpdate,
  isJobCompleted,
  isJobCancelled,
  loadJob,
  updateStatus,
  cancelJob
} = useProviderJobDetail({
  enableRealtime: true,
  enableLocationTracking: false,
  cacheTimeout: 5 * 60 * 1000
})

const { eta, startTracking, stopTracking } = useETA()
const { navigate } = useNavigation()
const { migrateOldURL, updateStep } = useURLTracking()

const showCancelModal = ref(false)
const showChatDrawer = ref(false)
const cancelReason = ref('')

const jobId = computed(() => route.params.id as string)

// Step definitions for minimal UI
const steps = [
  { key: 'matched', label: 'รับงาน' },
  { key: 'pickup', label: 'ถึงจุดรับ' },
  { key: 'in_progress', label: 'กำลังเดินทาง' },
  { key: 'completed', label: 'เสร็จสิ้น' }
]

const currentStep = computed(() => {
  if (!job.value) return null
  return steps.find(s => s.key === job.value!.status) || steps[0]
})

const etaDestination = computed(() => {
  if (!job.value) return null
  const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status } = job.value
  
  if (status === 'matched') {
    return { lat: pickup_lat, lng: pickup_lng, label: 'จุดรับ' }
  }
  if (['pickup', 'in_progress'].includes(status)) {
    return { lat: dropoff_lat, lng: dropoff_lng, label: 'จุดส่ง' }
  }
  return null
})

async function handleUpdateStatus() {
  const result = await updateStatus()
  if (result.success && result.newStatus === 'completed') {
    setTimeout(() => router.push('/provider/my-jobs'), 2000)
  }
}

async function handleCancelJob() {
  const result = await cancelJob(cancelReason.value)
  if (result.success) {
    showCancelModal.value = false
    router.push('/provider/my-jobs')
  }
}

function openNavigation() {
  if (!job.value) return
  const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status } = job.value
  
  if (status === 'matched') {
    navigate({ lat: pickup_lat, lng: pickup_lng, label: 'จุดรับ' })
  } else {
    navigate({ lat: dropoff_lat, lng: dropoff_lng, label: 'จุดส่ง' })
  }
}

function callCustomer() {
  if (job.value?.customer?.phone) {
    window.location.href = `tel:${job.value.customer.phone}`
  }
}

function openChat() {
  showChatDrawer.value = true
}

onMounted(async () => {
  console.log('[JobDetailMinimal] Component mounted, jobId:', jobId.value)
  
  migrateOldURL()
  
  if (jobId.value) {
    console.log('[JobDetailMinimal] Loading job...')
    const result = await loadJob(jobId.value)
    
    console.log('[JobDetailMinimal] Load result:', result)
    
    if (result?.status) {
      const urlStep = result.status.replace(/_/g, '-')
      updateStep(urlStep as any, 'provider_job')
    } else if (error.value) {
      console.error('[JobDetailMinimal] Failed to load job:', error.value)
    }
  }
  
  if (etaDestination.value) {
    startTracking(etaDestination.value.lat, etaDestination.value.lng)
  }
})

onUnmounted(() => {
  stopTracking()
})
</script>

<template>
  <div class="minimal-job-page">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <!-- Alert SVG Icon -->
      <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ error }}</p>
      <button class="btn-secondary" @click="router.push('/provider/my-jobs')">
        กลับหน้าหลัก
      </button>
    </div>

    <!-- Job Content -->
    <template v-else-if="job">
      <!-- Header -->
      <div class="page-header">
        <button class="btn-back" aria-label="กลับ" @click="router.push('/provider/my-jobs')">
          <!-- Back Arrow SVG -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>รายละเอียดงาน</h1>
      </div>

      <!-- Step Progress -->
      <div class="step-progress">
        <div 
          v-for="(step, index) in steps" 
          :key="step.key"
          class="step-item"
          :class="{ 
            active: currentStatusIndex === index,
            completed: currentStatusIndex > index,
            current: step.key === currentStep?.key
          }"
        >
          <div class="step-circle">
            <!-- Check SVG for completed -->
            <svg v-if="currentStatusIndex > index" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <div class="step-label">{{ step.label }}</div>
        </div>
      </div>

      <!-- Current Step Card -->
      <div class="current-step-card">
        <div class="step-header">
          <!-- Status Icon SVG -->
          <svg class="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle v-if="currentStep?.key === 'matched'" cx="12" cy="12" r="10"/>
            <path v-if="currentStep?.key === 'matched'" d="M12 6v6l4 2"/>
            
            <path v-if="currentStep?.key === 'pickup'" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle v-if="currentStep?.key === 'pickup'" cx="12" cy="10" r="3"/>
            
            <path v-if="currentStep?.key === 'in_progress'" d="M5 17h14M3 5h18v12H3z"/>
            <circle v-if="currentStep?.key === 'in_progress'" cx="7" cy="17" r="2"/>
            <circle v-if="currentStep?.key === 'in_progress'" cx="17" cy="17" r="2"/>
            
            <path v-if="currentStep?.key === 'completed'" d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline v-if="currentStep?.key === 'completed'" points="22 4 12 14.01 9 11.01"/>
          </svg>
          <h2>{{ currentStep?.label }}</h2>
        </div>

        <!-- ETA Info (if available) -->
        <div v-if="eta && etaDestination" class="eta-info">
          <div class="eta-time">
            <span class="eta-value">{{ eta.formattedTime }}</span>
            <span class="eta-label">ถึง{{ etaDestination.label }}</span>
          </div>
          <div class="eta-distance">{{ eta.formattedDistance }}</div>
        </div>

        <!-- Customer Info -->
        <div class="customer-info">
          <div class="customer-avatar">
            <img v-if="job.customer?.avatar_url" :src="job.customer.avatar_url" :alt="job.customer.name || 'ลูกค้า'" />
            <!-- User SVG Icon -->
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="customer-details">
            <h3>{{ job.customer?.name || 'ลูกค้า' }}</h3>
            <p v-if="job.customer?.phone">{{ job.customer.phone }}</p>
          </div>
          <button v-if="job.customer?.phone" class="btn-call" aria-label="โทรหาลูกค้า" @click="callCustomer">
            <!-- Phone SVG Icon -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
          <button class="btn-chat" aria-label="แชทกับลูกค้า" @click="openChat">
            <!-- Chat SVG Icon -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>

        <!-- Route Info -->
        <div class="route-info">
          <div class="route-point pickup">
            <!-- Pickup Circle SVG -->
            <svg class="point-icon pickup-icon" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="8"/>
            </svg>
            <div class="point-text">
              <span class="point-label">จุดรับ</span>
              <span class="point-address">{{ job.pickup_address }}</span>
            </div>
          </div>
          
          <div class="route-line"></div>
          
          <div class="route-point dropoff">
            <!-- Dropoff Square SVG -->
            <svg class="point-icon dropoff-icon" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
            <div class="point-text">
              <span class="point-label">จุดส่ง</span>
              <span class="point-address">{{ job.dropoff_address }}</span>
            </div>
          </div>
        </div>

        <!-- Fare -->
        <div class="fare-display">
          <span class="fare-label">ค่าโดยสาร</span>
          <span class="fare-amount">฿{{ job.fare.toLocaleString() }}</span>
        </div>

        <!-- Notes (if any) -->
        <div v-if="job.notes" class="notes-section">
          <!-- Note SVG Icon -->
          <svg class="notes-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <p>{{ job.notes }}</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div v-if="!isJobCompleted && !isJobCancelled" class="action-section">
        <button class="btn-navigate" @click="openNavigation">
          <!-- Navigation SVG Icon -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          <span>นำทาง</span>
        </button>

        <button 
          v-if="canUpdate"
          :disabled="updating"
          class="btn-primary"
          :class="{ completing: nextStatus?.key === 'completed' }"
          @click="handleUpdateStatus"
        >
          <span v-if="updating" class="spinner-small"></span>
          <span v-else>{{ nextStatus?.action }}</span>
        </button>

        <button 
          v-if="currentStatusIndex < 3"
          class="btn-cancel"
          @click="showCancelModal = true"
        >
          ยกเลิกงาน
        </button>
      </div>

      <!-- Completed State -->
      <div v-if="isJobCompleted" class="completed-state">
        <!-- Success SVG Icon -->
        <svg class="completed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <h2>งานเสร็จสิ้น!</h2>
        <div class="completed-fare">฿{{ job.fare.toLocaleString() }}</div>
        <button class="btn-primary" @click="router.push('/provider/my-jobs')">
          กลับหน้าหลัก
        </button>
      </div>
    </template>

    <!-- Cancel Modal -->
    <Teleport to="body">
      <div v-if="showCancelModal" class="modal-overlay" @click.self="showCancelModal = false">
        <div class="modal-content">
          <h2>ยกเลิกงาน</h2>
          <p>คุณแน่ใจหรือไม่ที่จะยกเลิกงานนี้?</p>
          
          <textarea 
            v-model="cancelReason"
            placeholder="เหตุผล (ไม่บังคับ)"
            rows="3"
            maxlength="500"
            aria-label="เหตุผลในการยกเลิก"
          ></textarea>

          <div class="modal-actions">
            <button class="btn-secondary" @click="showCancelModal = false">
              ไม่ยกเลิก
            </button>
            <button :disabled="updating" class="btn-danger" @click="handleCancelJob">
              <span v-if="updating" class="spinner-small"></span>
              <span v-else>ยืนยันยกเลิก</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Chat Drawer -->
    <ChatDrawer
      v-if="job && showChatDrawer"
      :ride-id="job.id"
      :other-user-name="job.customer?.name || 'ลูกค้า'"
      :is-open="showChatDrawer"
      @close="showChatDrawer = false"
    />
  </div>
</template>

<style scoped>
/* ===== BASE ===== */
.minimal-job-page {
  min-height: 100vh;
  background: #ffffff;
  padding: 0;
  padding-bottom: 100px;
}

/* ===== HEADER ===== */
.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: #000;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.btn-back {
  width: 40px;
  height: 40px;
  padding: 8px;
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background 0.2s;
}

.btn-back:active {
  background: rgba(255, 255, 255, 0.1);
}

.btn-back svg {
  width: 24px;
  height: 24px;
}

.page-header h1 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

/* ===== LOADING & ERROR ===== */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  width: 64px;
  height: 64px;
  color: #000;
  margin-bottom: 16px;
}

/* ===== STEP PROGRESS ===== */
.step-progress {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin: 24px 20px;
  padding: 0;
  position: relative;
}

.step-progress::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 8%;
  right: 8%;
  height: 2px;
  background: #e5e7eb;
  z-index: 0;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  position: relative;
  z-index: 1;
}

.step-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  color: #9ca3af;
  transition: all 0.3s;
}

.step-circle svg {
  width: 20px;
  height: 20px;
}

.step-item.completed .step-circle {
  background: #000;
  border-color: #000;
  color: #fff;
}

.step-item.current .step-circle {
  background: #000;
  border-color: #000;
  color: #fff;
  transform: scale(1.15);
  box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.1);
}

.step-label {
  font-size: 11px;
  color: #6b7280;
  text-align: center;
  font-weight: 500;
}

.step-item.current .step-label {
  color: #000;
  font-weight: 700;
}

/* ===== CURRENT STEP CARD ===== */
.current-step-card {
  background: #fff;
  border: 2px solid #000;
  border-radius: 0;
  padding: 24px 20px;
  margin: 0 20px 20px;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #000;
}

.step-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  color: #000;
}

.step-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #000;
  margin: 0;
  flex: 1;
}

/* ===== ETA INFO ===== */
.eta-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f9fafb;
  border: 2px solid #000;
  margin-bottom: 20px;
}

.eta-time {
  display: flex;
  flex-direction: column;
}

.eta-value {
  font-size: 28px;
  font-weight: 700;
  color: #000;
}

.eta-label {
  font-size: 13px;
  color: #6b7280;
  margin-top: 2px;
  font-weight: 500;
}

.eta-distance {
  font-size: 18px;
  font-weight: 700;
  color: #000;
}

/* ===== CUSTOMER INFO ===== */
.customer-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border: 2px solid #000;
  margin-bottom: 20px;
}

.customer-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f3f4f6;
  border: 2px solid #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.customer-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.customer-avatar svg {
  width: 24px;
  height: 24px;
  color: #000;
}

.customer-details {
  flex: 1;
  min-width: 0;
}

.customer-details h3 {
  font-size: 16px;
  font-weight: 700;
  color: #000;
  margin: 0 0 4px 0;
}

.customer-details p {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  font-weight: 500;
}

.btn-call {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  background: #000;
  border: 2px solid #000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  padding: 10px;
}

.btn-call svg {
  width: 20px;
  height: 20px;
  color: #fff;
}

.btn-call:active {
  transform: scale(0.95);
  background: #333;
}

.btn-chat {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  padding: 10px;
}

.btn-chat svg {
  width: 20px;
  height: 20px;
  color: #000;
}

.btn-chat:active {
  transform: scale(0.95);
  background: #000;
}

.btn-chat:active svg {
  color: #fff;
}

/* ===== ROUTE INFO ===== */
.route-info {
  margin-bottom: 20px;
}

.route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
}

.point-icon {
  width: 20px;
  height: 20px;
  margin-top: 2px;
  flex-shrink: 0;
}

.pickup-icon {
  color: #000;
}

.dropoff-icon {
  color: #000;
}

.point-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.point-label {
  font-size: 11px;
  color: #6b7280;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.point-address {
  font-size: 14px;
  color: #000;
  line-height: 1.5;
  font-weight: 500;
}

.route-line {
  width: 2px;
  height: 24px;
  background: #000;
  margin: 4px 0 4px 9px;
}

/* ===== FARE ===== */
.fare-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #000;
  color: #fff;
  margin-bottom: 16px;
}

.fare-label {
  font-size: 14px;
  color: #fff;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.fare-amount {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
}

/* ===== NOTES ===== */
.notes-section {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border: 2px solid #000;
}

.notes-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #000;
}

.notes-section p {
  font-size: 14px;
  color: #000;
  margin: 0;
  line-height: 1.6;
  font-weight: 500;
}

/* ===== ACTION BUTTONS ===== */
.action-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 2px solid #000;
}

.btn-navigate {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  min-height: 52px;
  background: #fff;
  color: #000;
  border: 2px solid #000;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-navigate svg {
  width: 20px;
  height: 20px;
}

.btn-navigate:active {
  background: #000;
  color: #fff;
}

.btn-primary {
  padding: 16px;
  background: #000;
  color: #fff;
  border: 2px solid #000;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 56px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-primary:active {
  background: #333;
  border-color: #333;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary.completing {
  background: #000;
  border-color: #000;
}

.btn-cancel {
  padding: 12px;
  background: #fff;
  color: #000;
  border: 2px solid #000;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
}

.btn-cancel:active {
  background: #f3f4f6;
}

.btn-secondary {
  padding: 12px 24px;
  background: #fff;
  color: #000;
  border: 2px solid #000;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
}

.btn-secondary:active {
  background: #f3f4f6;
}

.btn-danger {
  padding: 12px 24px;
  background: #000;
  color: #fff;
  border: 2px solid #000;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  min-height: 44px;
}

.btn-danger:active {
  background: #333;
  border-color: #333;
}

/* ===== COMPLETED STATE ===== */
.completed-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 20px;
  margin: 0 20px;
  background: #fff;
  border: 2px solid #000;
}

.completed-icon {
  width: 80px;
  height: 80px;
  color: #000;
  margin-bottom: 20px;
  animation: bounce 0.6s ease-in-out;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
}

.completed-state h2 {
  font-size: 24px;
  font-weight: 700;
  color: #000;
  margin: 0 0 16px 0;
}

.completed-fare {
  font-size: 40px;
  font-weight: 700;
  color: #000;
  margin-bottom: 24px;
}

/* ===== MODAL ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border: 2px solid #000;
  border-bottom: none;
  padding: 24px;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-content h2 {
  font-size: 18px;
  font-weight: 700;
  color: #000;
  margin: 0 0 8px 0;
}

.modal-content p {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 16px 0;
  font-weight: 500;
}

.modal-content textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #000;
  font-size: 14px;
  resize: none;
  margin-bottom: 16px;
  font-family: inherit;
  font-weight: 500;
}

.modal-content textarea:focus {
  outline: none;
  border-color: #000;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-actions button {
  flex: 1;
}

.spinner-small {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 360px) {
  .minimal-job-page {
    padding: 0;
  }
  
  .current-step-card {
    margin: 0 16px 16px;
    padding: 20px 16px;
  }
  
  .step-header h2 {
    font-size: 20px;
  }
  
  .page-header {
    padding: 12px 16px;
  }
}
</style>
