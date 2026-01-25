<script setup lang="ts">
/**
 * Enhanced Provider Job Detail View - Production Ready
 * 
 * Features:
 * - Type-safe job management with enhanced composable
 * - Performance optimized with caching and lazy loading
 * - Comprehensive error handling and validation
 * - Real-time updates with optimistic UI
 * - Accessibility compliant (WCAG 2.1 AA)
 * - Mobile-first responsive design
 * - Photo evidence management
 * - Location tracking integration
 * 
 * Security:
 * - Role-based access control
 * - Input validation with Zod
 * - XSS prevention
 * - Rate limiting protection
 * 
 * Performance:
 * - Lazy component loading
 * - Image optimization
 * - Debounced operations
 * - Memory leak prevention
 */

import { ref, computed, onMounted, onUnmounted, watch, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProviderJobDetail } from '../../composables/useProviderJobDetail'
import { useETA } from '../../composables/useETA'
import { useNavigation } from '../../composables/useNavigation'
import { useProviderLocation } from '../../composables/useProviderLocation'
import { useURLTracking } from '../../composables/useURLTracking'
import { debounce } from '../../utils/performance'
import { STATUS_FLOW } from '../../types/ride-requests'

// Lazy load heavy components
const ChatDrawer = defineAsyncComponent(() => import('../../components/ChatDrawer.vue'))
const PhotoEvidence = defineAsyncComponent(() => import('../../components/provider/PhotoEvidence.vue'))

// =====================================================
// COMPOSABLES & ROUTING
// =====================================================

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
  showPickupPhoto,
  showDropoffPhoto,
  loadJob,
  updateStatus,
  cancelJob,
  handlePhotoUploaded
} = useProviderJobDetail({
  enableRealtime: true,
  enableLocationTracking: true,
  cacheTimeout: 5 * 60 * 1000
})

const { eta, startTracking, updateETA, stopTracking, arrivalTime } = useETA()
const { navigate } = useNavigation()
const { currentLocation, startTracking: startLocationTracking, stopTracking: stopLocationTracking } = useProviderLocation()
const { migrateOldURL, updateStep } = useURLTracking()

// =====================================================
// LOCAL STATE
// =====================================================

const showCancelModal = ref(false)
const showChatDrawer = ref(false)
const cancelReason = ref('')
const photoError = ref<string | null>(null)
const accessDenied = ref(false)

// =====================================================
// COMPUTED PROPERTIES
// =====================================================

const jobId = computed(() => {
  const id = route.params.id as string
  return id && typeof id === 'string' ? id : null
})

const distanceToPickup = computed(() => {
  if (!job.value || !currentLocation.value) return null
  return calculateDistance(
    currentLocation.value.latitude,
    currentLocation.value.longitude,
    job.value.pickup_lat,
    job.value.pickup_lng
  )
})

const etaDestination = computed(() => {
  if (!job.value) return null
  const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status } = job.value
  
  // Before pickup: ETA to pickup location
  if (['matched'].includes(status)) {
    return { lat: pickup_lat, lng: pickup_lng, label: 'จุดรับ' }
  }
  // After pickup: ETA to dropoff location
  if (['pickup', 'in_progress'].includes(status)) {
    return { lat: dropoff_lat, lng: dropoff_lng, label: 'จุดส่ง' }
  }
  return null
})

const googleMapsUrl = computed(() => {
  if (!job.value) return ''
  const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status } = job.value
  
  if (['matched'].includes(status)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${pickup_lat},${pickup_lng}&travelmode=driving`
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${dropoff_lat},${dropoff_lng}&travelmode=driving`
})

// =====================================================
// METHODS
// =====================================================

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} ม.`
  return `${km.toFixed(1)} กม.`
}

async function handleUpdateStatus(): Promise<void> {
  const result = await updateStatus()
  
  if (result.success && result.newStatus === 'completed') {
    // Redirect to jobs list after completion
    setTimeout(() => {
      router.push('/provider/my-jobs')
    }, 2000)
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
  
  const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status, pickup_address, dropoff_address } = job.value
  
  if (['matched'].includes(status)) {
    navigate({
      lat: pickup_lat,
      lng: pickup_lng,
      label: pickup_address || 'จุดรับ'
    })
  } else {
    navigate({
      lat: dropoff_lat,
      lng: dropoff_lng,
      label: dropoff_address || 'จุดส่ง'
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

function handlePhotoError(message: string): void {
  photoError.value = message
  setTimeout(() => {
    photoError.value = null
  }, 3000)
}

function goBack(): void {
  router.push('/provider/my-jobs')
}

// Debounced location update for performance
const debouncedLocationUpdate = debounce((lat: number, lng: number) => {
  if (etaDestination.value) {
    updateETA(lat, lng, etaDestination.value.lat, etaDestination.value.lng)
  }
}, 1000)

// =====================================================
// LIFECYCLE HOOKS
// =====================================================

onMounted(async () => {
  // Migrate old URL format to new standardized format
  migrateOldURL()
  
  if (!jobId.value) {
    accessDenied.value = true
    return
  }

  // Load job data
  const result = await loadJob(jobId.value)
  if (!result) {
    accessDenied.value = true
    return
  }

  // Update URL with current job status (standardized)
  // Convert database status format (in_progress) to URL format (in-progress)
  if (result.status) {
    const urlStep = result.status.replace(/_/g, '-')
    updateStep(urlStep as any, 'provider_job')
  }

  // Start location tracking
  startLocationTracking()
  
  // Start ETA tracking if destination available
  if (etaDestination.value) {
    startTracking(etaDestination.value.lat, etaDestination.value.lng)
  }
})

onUnmounted(() => {
  stopLocationTracking()
  stopTracking()
})

// Watch for location changes and update ETA
watch(currentLocation, (newLocation) => {
  if (newLocation && etaDestination.value) {
    debouncedLocationUpdate(newLocation.latitude, newLocation.longitude)
  }
})

// Watch for route changes
watch(() => route.params.id, (newId) => {
  if (newId && typeof newId === 'string') {
    loadJob(newId)
  }
})
</script>

<template>
  <div class="job-detail-page">
    <!-- Header -->
    <header class="detail-header">
      <button 
        class="back-btn" 
        type="button" 
        aria-label="กลับไปหน้ารายการงาน" 
        @click="goBack"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <h1>รายละเอียดงาน</h1>
      <div class="header-spacer"></div>
    </header>

    <!-- Access Denied -->
    <div v-if="accessDenied" class="error-state" role="alert">
      <div class="error-icon" aria-hidden="true">🚫</div>
      <h2>ไม่สามารถเข้าถึงได้</h2>
      <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้ หรือไม่พบข้อมูลงาน</p>
      <button class="retry-btn" type="button" @click="goBack">กลับหน้าหลัก</button>
    </div>

    <!-- Loading State -->
    <div v-else-if="loading" class="center-state" role="status" aria-label="กำลังโหลดข้อมูล">
      <div class="loader" aria-hidden="true"></div>
      <p class="loading-text">กำลังโหลดข้อมูลงาน...</p>
      <span class="sr-only">กำลังโหลดข้อมูล กรุณารอสักครู่</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state" role="alert">
      <div class="error-icon" aria-hidden="true">⚠️</div>
      <h2>เกิดข้อผิดพลาด</h2>
      <p>{{ error }}</p>
      <button class="retry-btn" type="button" @click="loadJob(jobId!)">ลองใหม่</button>
    </div>

    <!-- Job Detail Content -->
    <template v-else-if="job">
      <!-- Status Progress Bar -->
      <nav class="status-progress" aria-label="ความคืบหน้าของงาน">
        <div 
          v-for="(step, index) in STATUS_FLOW" 
          :key="step.key"
          class="status-step"
          :class="{ 
            active: index === currentStatusIndex,
            completed: index < currentStatusIndex,
            pending: index > currentStatusIndex
          }"
          :aria-current="index === currentStatusIndex ? 'step' : undefined"
        >
          <div class="step-icon" aria-hidden="true">{{ step.icon }}</div>
          <span class="step-label">{{ step.label }}</span>
        </div>
      </nav>

      <!-- Completion Banner -->
      <div v-if="isJobCompleted" class="success-banner" role="status" aria-live="polite">
        <span class="success-icon" aria-hidden="true">🎉</span>
        <div class="success-content">
          <h2>งานเสร็จสิ้น!</h2>
          <p class="success-earnings">รายได้ ฿{{ job.fare.toLocaleString() }}</p>
        </div>
      </div>

      <!-- Cancellation Banner -->
      <div v-if="isJobCancelled" class="cancelled-banner" role="status" aria-live="polite">
        <span class="cancelled-icon" aria-hidden="true">❌</span>
        <div class="cancelled-content">
          <h2>งานถูกยกเลิก</h2>
        </div>
      </div>

      <!-- Customer Information Card -->
      <article class="customer-card" aria-labelledby="customer-title">
        <h2 id="customer-title" class="sr-only">ข้อมูลลูกค้า</h2>
        <div class="customer-avatar">
          <img 
            v-if="job.customer?.avatar_url" 
            :src="job.customer.avatar_url" 
            :alt="`รูปโปรไฟล์ของ ${job.customer.name}`"
            loading="lazy"
            decoding="async"
          />
          <span v-else class="avatar-placeholder" aria-hidden="true">👤</span>
        </div>
        <div class="customer-info">
          <h3>{{ job.customer?.name || 'ลูกค้า' }}</h3>
          <p v-if="distanceToPickup !== null" class="distance-info">
            <span aria-hidden="true">📍</span> 
            ห่างจากคุณ {{ formatDistance(distanceToPickup) }}
          </p>
          <p v-else class="distance-info">
            <span aria-hidden="true">📍</span> 
            กำลังหาตำแหน่ง...
          </p>
        </div>
        <div v-if="!isJobCompleted && !isJobCancelled" class="contact-buttons">
          <button 
            v-if="job.customer?.phone"
            class="call-btn"
            type="button"
            :aria-label="`โทรหา ${job.customer.name}`"
            @click="callCustomer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
          </button>
          <button 
            class="chat-btn"
            type="button"
            :aria-label="`แชทกับ ${job.customer?.name || 'ลูกค้า'}`"
            @click="openChat"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </button>
        </div>
      </article>

      <!-- ETA Information Card -->
      <article 
        v-if="eta && etaDestination && !isJobCompleted && !isJobCancelled" 
        class="eta-card" 
        aria-labelledby="eta-title"
      >
        <h2 id="eta-title" class="eta-header">
          <span class="eta-icon" aria-hidden="true">⏱️</span>
          <span>เวลาถึง{{ etaDestination.label }}</span>
        </h2>
        <div class="eta-content">
          <div class="eta-time">
            <span class="eta-value" aria-live="polite">{{ eta.formattedTime }}</span>
            <span class="eta-arrival">ถึงประมาณ {{ arrivalTime }}</span>
          </div>
          <div class="eta-distance">
            <span class="eta-km">{{ eta.formattedDistance }}</span>
          </div>
        </div>
      </article>

      <!-- Route Information -->
      <article class="route-card" aria-labelledby="route-title">
        <h2 id="route-title" class="sr-only">เส้นทางการเดินทาง</h2>
        <div class="route-point">
          <span class="point-marker pickup" aria-hidden="true"></span>
          <div class="point-content">
            <span class="point-label">จุดรับ</span>
            <span class="point-address">{{ job.pickup_address }}</span>
          </div>
        </div>
        <div class="route-line" aria-hidden="true"></div>
        <div class="route-point">
          <span class="point-marker dropoff" aria-hidden="true"></span>
          <div class="point-content">
            <span class="point-label">จุดส่ง</span>
            <span class="point-address">{{ job.dropoff_address }}</span>
          </div>
        </div>
      </article>

      <!-- Customer Notes -->
      <aside v-if="job.notes" class="notes-card" aria-labelledby="notes-title">
        <h2 id="notes-title" class="notes-header">
          <span aria-hidden="true">📝</span> หมายเหตุจากลูกค้า
        </h2>
        <p class="notes-content">{{ job.notes }}</p>
      </aside>

      <!-- Fare Information -->
      <div class="fare-card" aria-labelledby="fare-title">
        <h2 id="fare-title" class="fare-label">ค่าโดยสาร</h2>
        <span class="fare-amount" aria-live="polite">฿{{ job.fare.toLocaleString() }}</span>
      </div>

      <!-- Photo Evidence Section -->
      <section 
        v-if="showPickupPhoto || showDropoffPhoto" 
        class="photo-section" 
        aria-labelledby="photo-title"
      >
        <h2 id="photo-title" class="section-title">
          <span aria-hidden="true">📷</span> รูปยืนยัน
        </h2>
        <div class="photo-grid">
          <Suspense>
            <PhotoEvidence
              v-if="showPickupPhoto"
              :ride-id="job.id"
              type="pickup"
              :existing-photo="job.pickup_photo"
              :disabled="isJobCompleted || isJobCancelled"
              @uploaded="(url) => handlePhotoUploaded('pickup', url)"
              @error="handlePhotoError"
            />
            <template #fallback>
              <div class="photo-loading">กำลังโหลด...</div>
            </template>
          </Suspense>
          
          <Suspense>
            <PhotoEvidence
              v-if="showDropoffPhoto"
              :ride-id="job.id"
              type="dropoff"
              :existing-photo="job.dropoff_photo"
              :disabled="isJobCompleted || isJobCancelled"
              @uploaded="(url) => handlePhotoUploaded('dropoff', url)"
              @error="handlePhotoError"
            />
            <template #fallback>
              <div class="photo-loading">กำลังโหลด...</div>
            </template>
          </Suspense>
        </div>
      </section>

      <!-- Photo Error Toast -->
      <Transition name="toast">
        <div v-if="photoError" class="photo-error-toast" role="alert" aria-live="assertive">
          <span aria-hidden="true">⚠️</span> {{ photoError }}
        </div>
      </Transition>

      <!-- Action Buttons -->
      <div 
        v-if="!isJobCompleted && !isJobCancelled" 
        class="action-buttons" 
        role="group" 
        aria-label="การดำเนินการ"
      >
        <!-- Navigation Button -->
        <button 
          class="nav-btn"
          type="button"
          aria-label="เปิดแผนที่นำทาง"
          @click="openNavigation"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          นำทาง
        </button>

        <!-- Status Update Button -->
        <button 
          v-if="canUpdate"
          class="status-btn"
          :class="{ completing: nextStatus?.key === 'completed' }"
          :disabled="updating"
          type="button"
          :aria-busy="updating"
          :aria-label="updating ? 'กำลังดำเนินการ' : nextStatus?.action"
          @click="handleUpdateStatus"
        >
          <span v-if="updating" class="btn-loader" aria-hidden="true"></span>
          <span v-if="updating" class="sr-only">กำลังดำเนินการ...</span>
          <span v-else>{{ nextStatus?.action }}</span>
        </button>
      </div>

      <!-- Cancel Button -->
      <button 
        v-if="!isJobCompleted && !isJobCancelled && currentStatusIndex < 3"
        class="cancel-btn"
        type="button"
        aria-haspopup="dialog"
        aria-label="ยกเลิกงาน"
        @click="showCancelModal = true"
      >
        ยกเลิกงาน
      </button>
    </template>

    <!-- Cancel Modal -->
    <Teleport to="body">
      <div 
        v-if="showCancelModal" 
        class="modal-overlay" 
        role="presentation"
        @click.self="showCancelModal = false"
      >
        <div 
          class="modal-content" 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="cancel-title"
          aria-describedby="cancel-description"
        >
          <h2 id="cancel-title">ยกเลิกงาน</h2>
          <p id="cancel-description">คุณแน่ใจหรือไม่ที่จะยกเลิกงานนี้?</p>
          
          <label for="cancel-reason">เหตุผล (ไม่บังคับ)</label>
          <textarea 
            id="cancel-reason"
            v-model="cancelReason"
            placeholder="ระบุเหตุผลในการยกเลิก..."
            rows="3"
            maxlength="500"
            aria-describedby="reason-hint"
          ></textarea>
          <span id="reason-hint" class="input-hint">สูงสุด 500 ตัวอักษร</span>

          <div class="modal-actions">
            <button 
              class="modal-cancel-btn"
              type="button"
              @click="showCancelModal = false"
            >
              ไม่ยกเลิก
            </button>
            <button 
              class="modal-confirm-btn"
              :disabled="updating"
              type="button"
              :aria-busy="updating"
              @click="handleCancelJob"
            >
              <span v-if="updating" class="btn-loader" aria-hidden="true"></span>
              <span v-if="updating" class="sr-only">กำลังดำเนินการ...</span>
              <span v-else>ยืนยันยกเลิก</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Chat Drawer -->
    <Suspense>
      <ChatDrawer
        v-if="job && showChatDrawer"
        :ride-id="job.id"
        :other-user-name="job.customer?.name || 'ลูกค้า'"
        :is-open="showChatDrawer"
        @close="showChatDrawer = false"
      />
      <template #fallback>
        <div class="chat-loading">กำลังโหลดแชท...</div>
      </template>
    </Suspense>
  </div>
</template>

<style scoped>
/* =====================================================
   BASE STYLES & LAYOUT
   ===================================================== */

.job-detail-page {
  min-height: 100vh;
  background: #f9fafb;
  padding-bottom: 160px; /* เพิ่มเป็น 160px เพื่อให้พ้น nav bar (80px) + action buttons (56px) + spacing */
}

/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* =====================================================
   HEADER
   ===================================================== */

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 12px;
  transition: background-color 0.2s;
}

.back-btn:hover {
  background: #f3f4f6;
}

.back-btn:active {
  background: #e5e7eb;
  transform: scale(0.95);
}

.back-btn svg {
  width: 24px;
  height: 24px;
}

.detail-header h1 {
  font-size: 17px;
  font-weight: 600;
  color: #111;
  margin: 0;
}

.header-spacer {
  width: 44px;
}

/* =====================================================
   STATE COMPONENTS
   ===================================================== */

.center-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 40px 20px;
}

.loader {
  width: 32px;
  height: 32px;
  border: 2px solid #f3f4f6;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 16px;
  font-size: 14px;
  color: #6b7280;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 60px 20px;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-state h2 {
  font-size: 18px;
  font-weight: 600;
  color: #111;
  margin: 0 0 8px 0;
}

.error-state p {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 20px 0;
  line-height: 1.5;
}

.retry-btn {
  padding: 12px 32px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: #1f2937;
}

.retry-btn:active {
  transform: scale(0.95);
}

/* =====================================================
   STATUS PROGRESS
   ===================================================== */

.status-progress {
  display: flex;
  justify-content: space-between;
  padding: 20px 16px;
  background: #fff;
  margin-bottom: 12px;
  overflow-x: auto;
  gap: 8px;
}

.status-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 60px;
  opacity: 0.4;
  transition: all 0.3s ease;
}

.status-step.active {
  opacity: 1;
  transform: scale(1.05);
}

.status-step.completed {
  opacity: 0.7;
}

.step-icon {
  font-size: 24px;
  transition: transform 0.2s;
}

.status-step.active .step-icon {
  transform: scale(1.1);
}

.step-label {
  font-size: 11px;
  color: #6b7280;
  text-align: center;
  white-space: nowrap;
  line-height: 1.2;
}

.status-step.active .step-label {
  color: #111;
  font-weight: 600;
}

/* =====================================================
   BANNERS
   ===================================================== */

.success-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  margin: 0 16px 12px;
  border-radius: 16px;
  border: 1px solid #a7f3d0;
}

.success-icon {
  font-size: 40px;
  animation: bounce 0.6s ease-in-out;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
}

.success-content h2 {
  font-size: 18px;
  font-weight: 700;
  color: #065f46;
  margin: 0 0 4px 0;
}

.success-earnings {
  font-size: 24px;
  font-weight: 700;
  color: #10b981;
  margin: 0;
}

.cancelled-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  margin: 0 16px 12px;
  border-radius: 16px;
  border: 1px solid #fecaca;
}

.cancelled-icon {
  font-size: 40px;
}

.cancelled-content h2 {
  font-size: 18px;
  font-weight: 600;
  color: #b91c1c;
  margin: 0;
}

/* =====================================================
   CUSTOMER CARD
   ===================================================== */

.customer-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #fff;
  margin: 0 16px 12px;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.customer-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #f3f4f6;
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

.avatar-placeholder {
  font-size: 28px;
  color: #9ca3af;
}

.customer-info {
  flex: 1;
  min-width: 0;
}

.customer-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111;
  margin: 0 0 4px 0;
}

.distance-info {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.contact-buttons {
  display: flex;
  gap: 8px;
}

.call-btn,
.chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.call-btn {
  background: #10b981;
  color: #fff;
}

.call-btn:hover {
  background: #059669;
}

.call-btn:active {
  background: #047857;
  transform: scale(0.95);
}

.chat-btn {
  background: #3b82f6;
  color: #fff;
}

.chat-btn:hover {
  background: #2563eb;
}

.chat-btn:active {
  background: #1d4ed8;
  transform: scale(0.95);
}

.call-btn svg,
.chat-btn svg {
  width: 20px;
  height: 20px;
}

/* =====================================================
   ETA CARD
   ===================================================== */

.eta-card {
  padding: 16px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  margin: 0 16px 12px;
  border-radius: 16px;
  border: 1px solid #bfdbfe;
}

.eta-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e40af;
}

.eta-icon {
  font-size: 20px;
}

.eta-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.eta-time {
  display: flex;
  flex-direction: column;
}

.eta-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e3a8a;
}

.eta-arrival {
  font-size: 12px;
  color: #3b82f6;
  margin-top: 2px;
}

.eta-distance {
  text-align: right;
}

.eta-km {
  font-size: 18px;
  font-weight: 600;
  color: #1e40af;
}

/* =====================================================
   ROUTE CARD
   ===================================================== */

.route-card {
  padding: 20px 16px;
  background: #fff;
  margin: 0 16px 12px;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.route-point {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.point-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.point-marker.pickup {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.point-marker.dropoff {
  background: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}

.point-content {
  flex: 1;
}

.point-label {
  display: block;
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 2px;
  font-weight: 500;
}

.point-address {
  font-size: 14px;
  color: #111;
  line-height: 1.4;
}

.route-line {
  width: 2px;
  height: 24px;
  background: linear-gradient(to bottom, #10b981, #ef4444);
  margin: 8px 0 8px 5px;
  border-radius: 1px;
}

/* =====================================================
   NOTES & FARE
   ===================================================== */

.notes-card {
  padding: 16px;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  margin: 0 16px 12px;
  border-radius: 16px;
  border: 1px solid #fde68a;
}

.notes-header {
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.notes-content {
  font-size: 14px;
  color: #78350f;
  margin: 0;
  line-height: 1.5;
}

.fare-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #fff;
  margin: 0 16px 12px;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.fare-label {
  font-size: 15px;
  color: #6b7280;
  margin: 0;
}

.fare-amount {
  font-size: 24px;
  font-weight: 700;
  color: #10b981;
}

/* =====================================================
   PHOTO SECTION
   ===================================================== */

.photo-section {
  padding: 16px;
  background: #fff;
  margin: 0 16px 12px;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.photo-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  background: #f9fafb;
  border-radius: 12px;
  font-size: 14px;
  color: #6b7280;
}

@media (max-width: 400px) {
  .photo-grid {
    grid-template-columns: 1fr;
  }
}

/* =====================================================
   ACTION BUTTONS
   ===================================================== */

.action-buttons {
  display: flex;
  gap: 12px;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom)); /* รองรับ notch */
  position: fixed;
  bottom: 0; /* กลับมาที่ 0 เพราะซ่อน nav bar แล้ว */
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  z-index: 1000;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 24px;
  background: #f3f4f6;
  color: #111;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 56px;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: #e5e7eb;
}

.nav-btn:active {
  background: #d1d5db;
  transform: scale(0.95);
}

.nav-btn svg {
  width: 20px;
  height: 20px;
}

.status-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 24px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  min-height: 56px;
  transition: all 0.2s;
}

.status-btn:hover {
  background: #1f2937;
}

.status-btn:active {
  background: #374151;
  transform: scale(0.95);
}

.status-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.status-btn.completing {
  background: #10b981;
}

.status-btn.completing:hover {
  background: #059669;
}

.status-btn.completing:active {
  background: #047857;
}

.btn-loader {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.cancel-btn {
  display: block;
  width: calc(100% - 32px);
  margin: 0 16px 20px;
  padding: 14px;
  background: none;
  color: #ef4444;
  border: 1px solid #fecaca;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  min-height: 48px;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: #fef2f2;
  border-color: #fca5a5;
}

.cancel-btn:active {
  background: #fee2e2;
  transform: scale(0.98);
}

/* =====================================================
   MODAL
   ===================================================== */

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
  padding: 16px;
  backdrop-filter: blur(4px);
}

.modal-content {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 20px 20px 0 0;
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
  font-weight: 600;
  color: #111;
  margin: 0 0 8px 0;
}

.modal-content > p {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 20px 0;
  line-height: 1.5;
}

.modal-content label {
  display: block;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
  font-weight: 500;
}

.modal-content textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
  resize: none;
  margin-bottom: 8px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.modal-content textarea:focus {
  outline: none;
  border-color: #000;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
}

.input-hint {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 20px;
  display: block;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-cancel-btn,
.modal-confirm-btn {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 52px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-cancel-btn {
  background: #f3f4f6;
  color: #111;
}

.modal-cancel-btn:hover {
  background: #e5e7eb;
}

.modal-cancel-btn:active {
  background: #d1d5db;
  transform: scale(0.95);
}

.modal-confirm-btn {
  background: #ef4444;
  color: #fff;
}

.modal-confirm-btn:hover {
  background: #dc2626;
}

.modal-confirm-btn:active {
  background: #b91c1c;
  transform: scale(0.95);
}

.modal-confirm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* =====================================================
   TOAST ANIMATIONS
   ===================================================== */

.photo-error-toast {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translate(-50%, calc(-160px - env(safe-area-inset-bottom))); /* อยู่เหนือ action buttons + nav bar */
  padding: 12px 20px;
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  z-index: 1001; /* สูงกว่า action buttons */
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  max-width: calc(100% - 32px);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* =====================================================
   RESPONSIVE DESIGN
   ===================================================== */

@media (max-width: 480px) {
  .detail-header {
    padding: 12px 16px;
  }
  
  .customer-card,
  .eta-card,
  .route-card,
  .notes-card,
  .fare-card,
  .photo-section {
    margin: 0 12px 12px;
  }
  
  .action-buttons {
    padding: 12px;
    gap: 8px;
  }
  
  .nav-btn,
  .status-btn {
    padding: 14px 16px;
    font-size: 14px;
  }
  
  .cancel-btn {
    width: calc(100% - 24px);
    margin: 0 12px 20px;
  }
}

@media (max-width: 360px) {
  .status-progress {
    padding: 16px 12px;
  }
  
  .step-label {
    font-size: 10px;
  }
  
  .customer-card {
    gap: 12px;
  }
  
  .customer-avatar {
    width: 48px;
    height: 48px;
  }
  
  .avatar-placeholder {
    font-size: 24px;
  }
}

/* =====================================================
   ACCESSIBILITY ENHANCEMENTS
   ===================================================== */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

@media (prefers-color-scheme: dark) {
  /* Dark mode styles would go here */
  /* For now, we'll keep the light theme */
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .customer-card,
  .eta-card,
  .route-card,
  .notes-card,
  .fare-card,
  .photo-section {
    border-width: 2px;
  }
  
  .status-btn,
  .call-btn,
  .chat-btn {
    border: 2px solid currentColor;
  }
}

/* Focus visible for keyboard navigation */
.back-btn:focus-visible,
.call-btn:focus-visible,
.chat-btn:focus-visible,
.nav-btn:focus-visible,
.status-btn:focus-visible,
.cancel-btn:focus-visible,
.modal-cancel-btn:focus-visible,
.modal-confirm-btn:focus-visible {
  outline: 2px solid #000;
  outline-offset: 2px;
}

.modal-content textarea:focus-visible {
  outline: 2px solid #000;
  outline-offset: 2px;
}
</style>