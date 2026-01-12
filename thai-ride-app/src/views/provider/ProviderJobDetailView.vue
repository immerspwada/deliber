<script setup lang="ts">
/**
 * Provider Job Detail View - หน้ารายละเอียดงานและ Tracking
 * 
 * Features:
 * - แสดงรายละเอียดงาน (ลูกค้า, ที่อยู่, ราคา)
 * - แผนที่ navigation ไปหาลูกค้า
 * - ปุ่มอัพเดทสถานะ (ถึงจุดรับ → รับลูกค้าแล้ว → เสร็จสิ้น)
 * - โทรหาลูกค้า
 * - Realtime status updates
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'
import { useJobAlert } from '../../composables/useJobAlert'
import { useLocationUpdater } from '../../composables/useProviderTracking'

// Types
interface JobDetail {
  id: string
  type: 'ride' | 'delivery' | 'shopping'
  status: string
  service_type: string
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  dropoff_address: string
  dropoff_lat: number
  dropoff_lng: number
  fare: number
  notes?: string
  created_at: string
  customer: {
    id: string
    name: string
    phone: string
    avatar_url?: string
  } | null
}

interface StatusStep {
  key: string
  label: string
  icon: string
  action?: string
}

// Route & Router
const route = useRoute()
const router = useRouter()
const { quickBeep, quickVibrate } = useJobAlert()

// State
const loading = ref(true)
const error = ref<string | null>(null)
const job = ref<JobDetail | null>(null)
const updating = ref(false)
const showCancelModal = ref(false)
const cancelReason = ref('')
const providerLocation = ref<{ lat: number; lng: number } | null>(null)

// Realtime subscription
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null
let locationWatchId: number | null = null

// Status flow
const STATUS_FLOW: StatusStep[] = [
  { key: 'matched', label: 'รับงานแล้ว', icon: '✅' },
  { key: 'arriving', label: 'กำลังไปรับ', icon: '🚗', action: 'เริ่มเดินทาง' },
  { key: 'pickup', label: 'ถึงจุดรับแล้ว', icon: '📍', action: 'ถึงจุดรับแล้ว' },
  { key: 'in_progress', label: 'กำลังเดินทาง', icon: '🛣️', action: 'รับลูกค้าแล้ว' },
  { key: 'completed', label: 'เสร็จสิ้น', icon: '🎉', action: 'เสร็จสิ้นงาน' }
]

// Computed
const jobId = computed(() => route.params.id as string)

const currentStatusIndex = computed(() => {
  if (!job.value) return -1
  return STATUS_FLOW.findIndex(s => s.key === job.value!.status)
})

const nextStatus = computed(() => {
  const idx = currentStatusIndex.value
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null
  return STATUS_FLOW[idx + 1]
})

const canUpdateStatus = computed(() => {
  return nextStatus.value !== null && !updating.value
})

const isCompleted = computed(() => {
  return job.value?.status === 'completed'
})

const isCancelled = computed(() => {
  return job.value?.status === 'cancelled'
})

const googleMapsUrl = computed(() => {
  if (!job.value) return ''
  const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status } = job.value
  
  // ถ้ายังไม่รับลูกค้า → navigate ไปจุดรับ
  if (['matched', 'arriving'].includes(status)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${pickup_lat},${pickup_lng}&travelmode=driving`
  }
  // ถ้ารับลูกค้าแล้ว → navigate ไปจุดส่ง
  return `https://www.google.com/maps/dir/?api=1&destination=${dropoff_lat},${dropoff_lng}&travelmode=driving`
})

const distanceToPickup = computed(() => {
  if (!job.value || !providerLocation.value) return null
  return calculateDistance(
    providerLocation.value.lat, providerLocation.value.lng,
    job.value.pickup_lat, job.value.pickup_lng
  )
})

// Methods
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
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

async function loadJob(): Promise<void> {
  loading.value = true
  error.value = null

  try {
    const { data, error: dbError } = await supabase
      .from('ride_requests')
      .select(`
        id, status, ride_type, pickup_address, destination_address,
        pickup_lat, pickup_lng, destination_lat, destination_lng,
        estimated_fare, final_fare, notes, created_at,
        profiles:user_id(id, full_name, phone, avatar_url)
      `)
      .eq('id', jobId.value)
      .single()

    if (dbError) {
      console.error('[JobDetail] Load error:', dbError)
      error.value = 'ไม่สามารถโหลดข้อมูลงานได้'
      return
    }

    if (!data) {
      error.value = 'ไม่พบข้อมูลงาน'
      return
    }

    const profile = data.profiles as Record<string, unknown> | null
    job.value = {
      id: data.id,
      type: 'ride',
      status: data.status,
      service_type: data.ride_type || 'standard',
      pickup_address: data.pickup_address || '',
      pickup_lat: data.pickup_lat || 0,
      pickup_lng: data.pickup_lng || 0,
      dropoff_address: data.destination_address || '',
      dropoff_lat: data.destination_lat || 0,
      dropoff_lng: data.destination_lng || 0,
      fare: data.final_fare || data.estimated_fare || 0,
      notes: data.notes,
      created_at: data.created_at,
      customer: profile ? {
        id: profile.id as string,
        name: profile.full_name as string || 'ลูกค้า',
        phone: profile.phone as string || '',
        avatar_url: profile.avatar_url as string | undefined
      } : null
    }

    // Setup realtime subscription
    setupRealtimeSubscription()

  } catch (err) {
    console.error('[JobDetail] Exception:', err)
    error.value = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  } finally {
    loading.value = false
  }
}

function setupRealtimeSubscription(): void {
  cleanupRealtimeSubscription()

  realtimeChannel = supabase
    .channel(`job-detail-${jobId.value}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'ride_requests',
      filter: `id=eq.${jobId.value}`
    }, (payload) => {
      if (job.value && payload.new) {
        job.value.status = (payload.new as Record<string, unknown>).status as string
      }
    })
    .subscribe()
}

function cleanupRealtimeSubscription(): void {
  if (realtimeChannel) {
    realtimeChannel.unsubscribe()
    realtimeChannel = null
  }
}

async function updateStatus(): Promise<void> {
  if (!job.value || !nextStatus.value || updating.value) return

  updating.value = true
  error.value = null

  try {
    const newStatus = nextStatus.value.key
    
    const { error: updateError } = await supabase
      .from('ride_requests')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.value.id)

    if (updateError) {
      throw new Error(updateError.message)
    }

    // Update local state
    job.value.status = newStatus
    quickBeep()
    quickVibrate()

    // If completed, show success and go back
    if (newStatus === 'completed') {
      setTimeout(() => {
        router.push('/provider/my-jobs')
      }, 1500)
    }

  } catch (err) {
    console.error('[JobDetail] Update error:', err)
    error.value = 'ไม่สามารถอัพเดทสถานะได้'
  } finally {
    updating.value = false
  }
}

async function cancelJob(): Promise<void> {
  if (!job.value || updating.value) return

  updating.value = true

  try {
    const { error: updateError } = await supabase
      .from('ride_requests')
      .update({ 
        status: 'cancelled',
        cancellation_reason: cancelReason.value || 'ยกเลิกโดยคนขับ',
        cancelled_by: 'provider',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.value.id)

    if (updateError) {
      throw new Error(updateError.message)
    }

    showCancelModal.value = false
    router.push('/provider/my-jobs')

  } catch (err) {
    console.error('[JobDetail] Cancel error:', err)
    error.value = 'ไม่สามารถยกเลิกงานได้'
  } finally {
    updating.value = false
  }
}

function openNavigation(): void {
  if (googleMapsUrl.value) {
    window.open(googleMapsUrl.value, '_blank')
  }
}

function callCustomer(): void {
  if (job.value?.customer?.phone) {
    window.location.href = `tel:${job.value.customer.phone}`
  }
}

function startLocationTracking(): void {
  if (!navigator.geolocation) return

  locationWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      providerLocation.value = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }
    },
    (err) => console.warn('[Location] Error:', err.message),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
  )
}

function stopLocationTracking(): void {
  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId)
    locationWatchId = null
  }
}

function goBack(): void {
  router.push('/provider/my-jobs')
}

// Lifecycle
onMounted(() => {
  loadJob()
  startLocationTracking()
})

onUnmounted(() => {
  cleanupRealtimeSubscription()
  stopLocationTracking()
})

// Watch for route changes
watch(() => route.params.id, () => {
  if (route.params.id) {
    loadJob()
  }
})
</script>

<template>
  <div class="job-detail-page">
    <!-- Header -->
    <header class="detail-header">
      <button class="back-btn" @click="goBack" type="button" aria-label="กลับ">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <h1>รายละเอียดงาน</h1>
      <div class="header-spacer"></div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="center-state">
      <div class="loader"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="loadJob" type="button">ลองใหม่</button>
    </div>

    <!-- Job Detail -->
    <template v-else-if="job">
      <!-- Status Progress -->
      <div class="status-progress">
        <div 
          v-for="(step, index) in STATUS_FLOW" 
          :key="step.key"
          class="status-step"
          :class="{ 
            active: index === currentStatusIndex,
            completed: index < currentStatusIndex,
            pending: index > currentStatusIndex
          }"
        >
          <div class="step-icon">{{ step.icon }}</div>
          <span class="step-label">{{ step.label }}</span>
        </div>
      </div>

      <!-- Completed Banner -->
      <div v-if="isCompleted" class="success-banner">
        <span class="success-icon">🎉</span>
        <div class="success-text">
          <h3>งานเสร็จสิ้น!</h3>
          <p>รายได้ ฿{{ job.fare.toLocaleString() }}</p>
        </div>
      </div>

      <!-- Cancelled Banner -->
      <div v-if="isCancelled" class="cancelled-banner">
        <span class="cancelled-icon">❌</span>
        <div class="cancelled-text">
          <h3>งานถูกยกเลิก</h3>
        </div>
      </div>

      <!-- Customer Card -->
      <div v-if="job.customer" class="customer-card">
        <div class="customer-avatar">
          <img 
            v-if="job.customer.avatar_url" 
            :src="job.customer.avatar_url" 
            :alt="job.customer.name"
          />
          <span v-else class="avatar-placeholder">👤</span>
        </div>
        <div class="customer-info">
          <h3>{{ job.customer.name }}</h3>
          <p v-if="distanceToPickup !== null" class="distance-info">
            📍 ห่าง {{ formatDistance(distanceToPickup) }}
          </p>
        </div>
        <button 
          v-if="job.customer.phone && !isCompleted && !isCancelled"
          class="call-btn"
          @click="callCustomer"
          type="button"
          aria-label="โทรหาลูกค้า"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
          </svg>
          โทร
        </button>
      </div>

      <!-- Route Info -->
      <div class="route-card">
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
      </div>

      <!-- Notes -->
      <div v-if="job.notes" class="notes-card">
        <h4>📝 หมายเหตุจากลูกค้า</h4>
        <p>{{ job.notes }}</p>
      </div>

      <!-- Fare -->
      <div class="fare-card">
        <span class="fare-label">ค่าโดยสาร</span>
        <span class="fare-amount">฿{{ job.fare.toLocaleString() }}</span>
      </div>

      <!-- Action Buttons -->
      <div v-if="!isCompleted && !isCancelled" class="action-buttons">
        <!-- Navigation Button -->
        <button 
          class="nav-btn"
          @click="openNavigation"
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
          นำทาง
        </button>

        <!-- Status Update Button -->
        <button 
          v-if="canUpdateStatus"
          class="status-btn"
          :class="{ completing: nextStatus?.key === 'completed' }"
          @click="updateStatus"
          :disabled="updating"
          type="button"
        >
          <span v-if="updating" class="btn-loader" aria-hidden="true"></span>
          <span v-else>{{ nextStatus?.action }}</span>
        </button>
      </div>

      <!-- Cancel Button -->
      <button 
        v-if="!isCompleted && !isCancelled && currentStatusIndex < 3"
        class="cancel-btn"
        @click="showCancelModal = true"
        type="button"
      >
        ยกเลิกงาน
      </button>
    </template>

    <!-- Cancel Modal -->
    <div v-if="showCancelModal" class="modal-overlay" @click.self="showCancelModal = false">
      <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
        <h3 id="cancel-title">ยกเลิกงาน</h3>
        <p>คุณแน่ใจหรือไม่ที่จะยกเลิกงานนี้?</p>
        
        <label for="cancel-reason">เหตุผล (ไม่บังคับ)</label>
        <textarea 
          id="cancel-reason"
          v-model="cancelReason"
          placeholder="ระบุเหตุผลในการยกเลิก..."
          rows="3"
        ></textarea>

        <div class="modal-actions">
          <button 
            class="modal-cancel-btn"
            @click="showCancelModal = false"
            type="button"
          >
            ไม่ยกเลิก
          </button>
          <button 
            class="modal-confirm-btn"
            @click="cancelJob"
            :disabled="updating"
            type="button"
          >
            <span v-if="updating" class="btn-loader" aria-hidden="true"></span>
            <span v-else>ยืนยันยกเลิก</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.job-detail-page {
  min-height: 100vh;
  background: #f9fafb;
  padding-bottom: 100px;
}

/* Header */
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
}

.back-btn:active {
  background: #f3f4f6;
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

/* States */
.center-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
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

.error-state p {
  color: #6b7280;
  margin: 0 0 20px 0;
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
}

/* Status Progress */
.status-progress {
  display: flex;
  justify-content: space-between;
  padding: 20px 16px;
  background: #fff;
  margin-bottom: 12px;
  overflow-x: auto;
}

.status-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 60px;
  opacity: 0.4;
  transition: all 0.3s;
}

.status-step.active {
  opacity: 1;
}

.status-step.completed {
  opacity: 0.7;
}

.step-icon {
  font-size: 24px;
}

.step-label {
  font-size: 11px;
  color: #6b7280;
  text-align: center;
  white-space: nowrap;
}

.status-step.active .step-label {
  color: #111;
  font-weight: 600;
}

/* Success/Cancelled Banners */
.success-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  margin: 0 16px 12px;
  border-radius: 16px;
}

.success-icon {
  font-size: 40px;
}

.success-text h3 {
  font-size: 18px;
  font-weight: 700;
  color: #065f46;
  margin: 0 0 4px 0;
}

.success-text p {
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
  background: #fef2f2;
  margin: 0 16px 12px;
  border-radius: 16px;
}

.cancelled-icon {
  font-size: 40px;
}

.cancelled-text h3 {
  font-size: 18px;
  font-weight: 600;
  color: #b91c1c;
  margin: 0;
}

/* Customer Card */
.customer-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #fff;
  margin: 0 16px 12px;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
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
}

.call-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #10b981;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
}

.call-btn:active {
  background: #059669;
}

.call-btn svg {
  width: 18px;
  height: 18px;
}

/* Route Card */
.route-card {
  padding: 20px 16px;
  background: #fff;
  margin: 0 16px 12px;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
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
}

.point-marker.dropoff {
  background: #ef4444;
}

.point-content {
  flex: 1;
}

.point-label {
  display: block;
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 2px;
}

.point-address {
  font-size: 14px;
  color: #111;
  line-height: 1.4;
}

.route-line {
  width: 2px;
  height: 24px;
  background: #e5e7eb;
  margin: 8px 0 8px 5px;
}

/* Notes Card */
.notes-card {
  padding: 16px;
  background: #fffbeb;
  margin: 0 16px 12px;
  border-radius: 16px;
  border: 1px solid #fde68a;
}

.notes-card h4 {
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
  margin: 0 0 8px 0;
}

.notes-card p {
  font-size: 14px;
  color: #78350f;
  margin: 0;
  line-height: 1.5;
}

/* Fare Card */
.fare-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #fff;
  margin: 0 16px 12px;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
}

.fare-label {
  font-size: 15px;
  color: #6b7280;
}

.fare-amount {
  font-size: 24px;
  font-weight: 700;
  color: #10b981;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 12px;
  padding: 16px;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  z-index: 20;
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
}

.nav-btn:active {
  background: #e5e7eb;
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
}

.status-btn:active {
  background: #1f2937;
}

.status-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-btn.completing {
  background: #10b981;
}

.status-btn.completing:active {
  background: #059669;
}

.btn-loader {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* Cancel Button */
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
}

.cancel-btn:active {
  background: #fef2f2;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.modal-content {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 24px;
}

.modal-content h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111;
  margin: 0 0 8px 0;
}

.modal-content > p {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 20px 0;
}

.modal-content label {
  display: block;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
}

.modal-content textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
  resize: none;
  margin-bottom: 20px;
}

.modal-content textarea:focus {
  outline: none;
  border-color: #000;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-cancel-btn {
  flex: 1;
  padding: 14px;
  background: #f3f4f6;
  color: #111;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 52px;
}

.modal-confirm-btn {
  flex: 1;
  padding: 14px;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-confirm-btn:disabled {
  opacity: 0.6;
}
</style>
