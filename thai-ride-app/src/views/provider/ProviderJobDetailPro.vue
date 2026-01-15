<!--
  Provider Job Detail - Professional Redesign
  
  Design Principles:
  - Mobile-First: Optimized for one-hand use
  - High Contrast: Black & White for sunlight readability
  - Touch-Friendly: All targets ≥ 44px
  - Progressive Disclosure: Show what matters now
  - Error Prevention: Clear states, confirmations
  
  Performance:
  - Load time < 2s
  - Code splitting
  - Optimistic updates
  - Realtime sync
-->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Composables
import { useProviderJobDetail } from '@/composables/useProviderJobDetail'
import { useJobStatusFlow } from '@/composables/useJobStatusFlow'
import { useETA } from '@/composables/useETA'
import { useNavigation } from '@/composables/useNavigation'
import { useURLTracking } from '@/composables/useURLTracking'

// Components
import StatusProgressBar from '@/components/provider/StatusProgressBar.vue'
import CustomerInfoCard from '@/components/provider/CustomerInfoCard.vue'
import ETADisplayCard from '@/components/provider/ETADisplayCard.vue'
import RouteInfoCard from '@/components/provider/RouteInfoCard.vue'
import JobActionBar from '@/components/provider/JobActionBar.vue'

// Lazy load heavy components
import { defineAsyncComponent } from 'vue'
const ChatDrawer = defineAsyncComponent(() => import('@/components/ChatDrawer.vue'))
const PhotoEvidence = defineAsyncComponent(() => import('@/components/provider/PhotoEvidence.vue'))

// Setup
const route = useRoute()
const router = useRouter()

// Job Detail Management
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
  cancelJob,
  handlePhotoUploaded
} = useProviderJobDetail({
  enableRealtime: true,
  enableLocationTracking: true,
  cacheTimeout: 5 * 60 * 1000
})

// Status Flow
const jobStatus = computed(() => job.value?.status)
const {
  STATUS_FLOW,
  currentStep,
  nextStep,
  isCompleted,
  isCancelled
} = useJobStatusFlow(jobStatus)

// ETA Tracking
const { eta, startTracking, stopTracking, arrivalTime } = useETA()

// Navigation
const { navigate } = useNavigation()

// URL Tracking
const { updateStep, migrateOldURL } = useURLTracking()

// Local State
const showCancelModal = ref(false)
const showChatDrawer = ref(false)
const cancelReason = ref('')

// Computed
const jobId = computed(() => route.params.id as string)

const etaDestination = computed(() => {
  if (!job.value) return null
  const { pickup_lat, pickup_lng, destination_lat, destination_lng, status } = job.value
  
  // Before pickup: show ETA to pickup
  if (['matched', 'pickup'].includes(status)) {
    return { lat: pickup_lat, lng: pickup_lng, label: 'จุดรับ' }
  }
  // After pickup: show ETA to dropoff
  if (status === 'in_progress') {
    return { lat: destination_lat, lng: destination_lng, label: 'จุดส่ง' }
  }
  return null
})

const showPickupPhoto = computed(() => {
  if (!job.value) return false
  return ['pickup', 'in_progress', 'completed'].includes(job.value.status)
})

const showDropoffPhoto = computed(() => {
  if (!job.value) return false
  return ['in_progress', 'completed'].includes(job.value.status)
})

// Methods
function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} ม.`
  return `${km.toFixed(1)} กม.`
}

async function handleUpdateStatus(): Promise<void> {
  const result = await updateStatus()
  if (result.success && result.newStatus === 'completed') {
    setTimeout(() => router.push('/provider/my-jobs'), 2000)
  }
}

async function handleCancelJob(): Promise<void> {
  const result = await cancelJob(cancelReason.value)
  if (result.success) {
    showCancelModal.value = false
    router.push('/provider/my-jobs')
  }
}

function openNavigation(): void {
  if (!job.value) return
  
  const { pickup_lat, pickup_lng, destination_lat, destination_lng, status, pickup_address, destination_address } = job.value
  
  if (['matched', 'pickup'].includes(status)) {
    navigate({
      lat: pickup_lat,
      lng: pickup_lng,
      label: pickup_address || 'จุดรับ'
    })
  } else {
    navigate({
      lat: destination_lat,
      lng: destination_lng,
      label: destination_address || 'จุดส่ง'
    })
  }
}

function callCustomer(): void {
  if (job.value?.customer?.phone) {
    window.location.href = `tel:${job.value.customer.phone}`
  }
}

function openChat(): void {
  showChatDrawer.value = true
}

function goBack(): void {
  router.push('/provider/my-jobs')
}

// Lifecycle
onMounted(async () => {
  console.log('[JobDetailPro] Component mounted')
  
  // Migrate old URL format
  migrateOldURL()
  
  // Load job
  if (jobId.value) {
    await loadJob(jobId.value)
    
    // Start ETA tracking
    if (job.value && etaDestination.value) {
      startTracking(etaDestination.value.lat, etaDestination.value.lng)
    }
  }
})

onUnmounted(() => {
  stopTracking()
})
</script>

<template>
  <div class="job-detail-pro">
    <!-- Header -->
    <header class="page-header">
      <button class="btn-back" @click="goBack" type="button" aria-label="กลับ">
        <!-- Back Arrow -->
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <div class="header-title">
        <h1>รายละเอียดงาน</h1>
      </div>
      <div class="header-spacer"></div>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state" role="status" aria-label="กำลังโหลด">
      <div class="spinner-large" aria-hidden="true"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state" role="alert">
      <div class="error-icon" aria-hidden="true">⚠️</div>
      <p>{{ error }}</p>
      <button class="btn-retry" @click="loadJob(jobId)" type="button">
        ลองใหม่
      </button>
    </div>

    <!-- Job Content -->
    <template v-else-if="job">
      <!-- Status Progress -->
      <StatusProgressBar 
        :steps="STATUS_FLOW"
        :current-index="currentStatusIndex"
      />

      <!-- Completed Banner -->
      <div v-if="isJobCompleted" class="success-banner" role="status">
        <span class="success-icon" aria-hidden="true">🎉</span>
        <div class="success-text">
          <h3>งานเสร็จสิ้น!</h3>
          <p class="success-fare">฿{{ job.fare.toLocaleString() }}</p>
        </div>
      </div>

      <!-- Cancelled Banner -->
      <div v-if="isJobCancelled" class="cancelled-banner" role="status">
        <span class="cancelled-icon" aria-hidden="true">❌</span>
        <div class="cancelled-text">
          <h3>งานถูกยกเลิก</h3>
        </div>
      </div>

      <!-- Customer Card -->
      <CustomerInfoCard
        :customer="job.customer"
        :show-actions="!isJobCompleted && !isJobCancelled"
        @call="callCustomer"
        @chat="openChat"
      />

      <!-- ETA Card -->
      <ETADisplayCard
        v-if="eta && etaDestination && !isJobCompleted && !isJobCancelled"
        :eta="eta"
        :destination="etaDestination.label"
        :arrival-time="arrivalTime"
      />

      <!-- Route Card -->
      <RouteInfoCard
        :pickup-address="job.pickup_address"
        :dropoff-address="job.dropoff_address"
      />

      <!-- Notes -->
      <aside v-if="job.notes" class="notes-card" aria-label="หมายเหตุ">
        <h4>
          <span aria-hidden="true">📝</span> หมายเหตุจากลูกค้า
        </h4>
        <p>{{ job.notes }}</p>
      </aside>

      <!-- Fare Display -->
      <div class="fare-card" aria-label="ค่าโดยสาร">
        <span class="fare-label">ค่าโดยสาร</span>
        <span class="fare-amount">฿{{ job.fare.toLocaleString() }}</span>
      </div>

      <!-- Photo Evidence -->
      <div v-if="showPickupPhoto || showDropoffPhoto" class="photo-section">
        <h4 class="photo-title">รูปถ่ายยืนยัน</h4>
        
        <PhotoEvidence
          v-if="showPickupPhoto"
          type="pickup"
          :ride-id="job.id"
          :existing-photo="job.pickup_photo"
          @uploaded="(url: string) => handlePhotoUploaded('pickup', url)"
        />
        
        <PhotoEvidence
          v-if="showDropoffPhoto"
          type="dropoff"
          :ride-id="job.id"
          :existing-photo="job.dropoff_photo"
          @uploaded="(url: string) => handlePhotoUploaded('dropoff', url)"
        />
      </div>

      <!-- Action Bar -->
      <JobActionBar
        :can-update="canUpdate"
        :updating="updating"
        :is-completed="isJobCompleted"
        :is-cancelled="isJobCancelled"
        :next-action="nextStatus?.action"
        :is-last-step="nextStatus?.key === 'completed'"
        @navigate="openNavigation"
        @update-status="handleUpdateStatus"
        @cancel="showCancelModal = true"
      />
    </template>

    <!-- Cancel Modal -->
    <Teleport to="body">
      <div 
        v-if="showCancelModal" 
        class="modal-overlay" 
        @click.self="showCancelModal = false"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
      >
        <div class="modal-content">
          <h2 id="cancel-modal-title">ยกเลิกงาน</h2>
          <p>คุณแน่ใจหรือไม่ที่จะยกเลิกงานนี้?</p>
          
          <textarea 
            v-model="cancelReason"
            placeholder="เหตุผล (ไม่บังคับ)"
            rows="3"
            maxlength="500"
            aria-label="เหตุผลในการยกเลิก"
            class="cancel-textarea"
          ></textarea>

          <div class="modal-actions">
            <button 
              @click="showCancelModal = false" 
              class="btn-secondary"
              type="button"
            >
              ไม่ยกเลิก
            </button>
            <button 
              @click="handleCancelJob" 
              :disabled="updating" 
              class="btn-danger"
              type="button"
            >
              <span v-if="updating" class="spinner-small" aria-hidden="true"></span>
              <span v-else>ยืนยันยกเลิก</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Chat Drawer -->
    <ChatDrawer
      v-if="showChatDrawer && job"
      :ride-id="job.id"
      @close="showChatDrawer = false"
    />
  </div>
</template>

<style scoped>
/* ===== BASE ===== */
.job-detail-pro {
  min-height: 100vh;
  background: #F5F5F5;
  padding-bottom: 200px;
}

/* ===== HEADER ===== */
.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 30;
}

.btn-back {
  width: 40px;
  height: 40px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  transition: background 0.2s;
}

.btn-back:active {
  background: rgba(255, 255, 255, 0.3);
}

.btn-back svg {
  width: 24px;
  height: 24px;
}

.header-title {
  flex: 1;
}

.header-title h1 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
}

.header-spacer {
  width: 40px;
}

/* ===== LOADING STATE ===== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 20px;
}

.spinner-large {
  width: 40px;
  height: 40px;
  border: 3px solid #E5E7EB;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  margin-top: 16px;
  font-size: 14px;
  color: #6B7280;
  font-weight: 500;
}

/* ===== ERROR STATE ===== */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 20px;
}

.error-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.error-state p {
  font-size: 16px;
  color: #111827;
  margin-bottom: 20px;
  font-weight: 500;
}

.btn-retry {
  padding: 12px 24px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
}

.btn-retry:active {
  background: #008F5B;
}

/* ===== BANNERS ===== */
.success-banner,
.cancelled-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  margin: 16px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.success-banner {
  background: #E8F5EF;
  border: 1px solid #A7F3D0;
}

.cancelled-banner {
  background: #FEF2F2;
  border: 1px solid #FECACA;
}

.success-icon,
.cancelled-icon {
  font-size: 40px;
  flex-shrink: 0;
}

.success-text h3,
.cancelled-text h3 {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px 0;
}

.success-fare {
  font-size: 24px;
  font-weight: 700;
  color: #00A86B;
  margin: 0;
}

/* ===== NOTES CARD ===== */
.notes-card {
  margin: 0 16px 16px;
  padding: 16px;
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.notes-card h4 {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.notes-card p {
  font-size: 14px;
  color: #374151;
  margin: 0;
  line-height: 1.6;
  font-weight: 500;
}

/* ===== FARE CARD ===== */
.fare-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  margin: 0 16px 16px;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  color: #fff;
  border-radius: 16px;
}

.fare-label {
  font-size: 14px;
  font-weight: 600;
  opacity: 0.9;
}

.fare-amount {
  font-size: 28px;
  font-weight: 700;
}

/* ===== PHOTO SECTION ===== */
.photo-section {
  margin: 0 16px 16px;
  background: #FFFFFF;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.photo-title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 12px 0;
}

/* ===== MODAL ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  width: 100%;
  max-width: 500px;
  background: #fff;
  border-radius: 24px 24px 0 0;
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
  color: #111827;
  margin: 0 0 8px 0;
}

.modal-content p {
  font-size: 14px;
  color: #6B7280;
  margin: 0 0 16px 0;
  font-weight: 500;
}

.cancel-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  font-size: 14px;
  resize: none;
  margin-bottom: 16px;
  font-family: inherit;
  font-weight: 500;
}

.cancel-textarea:focus {
  outline: none;
  border-color: #00A86B;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-actions button {
  flex: 1;
}

.btn-secondary {
  padding: 12px 24px;
  background: #fff;
  color: #111827;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
}

.btn-secondary:active {
  background: #F3F4F6;
}

.btn-danger {
  padding: 12px 24px;
  background: #EF4444;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-danger:active:not(:disabled) {
  background: #DC2626;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  .page-header {
    padding: 12px 16px;
  }
  
  .header-title h1 {
    font-size: 16px;
  }
}
</style>
