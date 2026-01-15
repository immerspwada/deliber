<script setup lang="ts">
/**
 * Provider Job Detail View - หน้ารายละเอียดงานและ Tracking
 * 
 * Features:
 * - แสดงรายละเอียดงาน (ลูกค้า, ที่อยู่, ราคา)
 * - แผนที่ navigation ไปหาลูกค้า
 * - ปุ่มอัพเดทสถานะ (ถึงจุดรับ → รับลูกค้าแล้ว → เสร็จสิ้น)
 * - โทร/แชทหาลูกค้า
 * - Photo Evidence (ถ่ายรูปยืนยัน)
 * - ETA Display (เวลาโดยประมาณ)
 * - Realtime status updates
 * 
 * Security:
 * - Role-based access (provider only)
 * - Input validation with Zod
 * - Proper error handling
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { useJobAlert } from '../../composables/useJobAlert'
import { useRoleAccess } from '../../composables/useRoleAccess'
import { useErrorHandler } from '../../composables/useErrorHandler'
import { useETA } from '../../composables/useETA'
import { useNavigation } from '../../composables/useNavigation'
import { useJobStatusFlow } from '../../composables/useJobStatusFlow'
import { useURLTracking } from '../../composables/useURLTracking'
import { ErrorCode, createAppError, handleSupabaseError } from '../../utils/errorHandler'
import ChatDrawer from '../../components/ChatDrawer.vue'
import PhotoEvidence from '../../components/provider/PhotoEvidence.vue'

// Zod Schemas for validation
const JobIdSchema = z.string().uuid()

const CancelReasonSchema = z.string().max(500, 'เหตุผลยาวเกินไป').optional()

// Types
interface JobDetail {
  id: string
  tracking_id?: string
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
  updated_at?: string
  pickup_photo?: string | null
  dropoff_photo?: string | null
  provider_id?: string
  customer: {
    id: string
    name: string
    phone: string
    avatar_url?: string
  } | null
}

// Route & Router
const route = useRoute()
const router = useRouter()
const { quickBeep, quickVibrate } = useJobAlert()
const { canAccessProvider, providerId, checkingProvider, checkProviderRouteAccess } = useRoleAccess()
const { handleAsync, clearError } = useErrorHandler()
const { eta, startTracking, updateETA, stopTracking, arrivalTime } = useETA()
const { navigate } = useNavigation()
const { updateStep, updateAction, getCurrentTracking, migrateOldURL } = useURLTracking()

// Job status from database
const jobStatus = computed(() => job.value?.status)

// Use status flow composable
const {
  STATUS_FLOW,
  currentStatusIndex,
  currentStep,
  nextStep,
  nextDbStatus,
  canProgress,
  isCompleted: isCompletedStatus,
  isCancelled: isCancelledStatus,
  debugInfo
} = useJobStatusFlow(jobStatus)

// State
const loading = ref(true)
const errorMessage = ref<string | null>(null)
const job = ref<JobDetail | null>(null)
const updating = ref(false)
const showCancelModal = ref(false)
const showChatDrawer = ref(false)
const cancelReason = ref('')
const providerLocation = ref<{ lat: number; lng: number } | null>(null)
const accessDenied = ref(false)
const photoError = ref<string | null>(null)

// Realtime subscription
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null
let locationWatchId: number | null = null

// Computed
const jobId = computed(() => {
  const id = route.params.id as string
  // Validate UUID format
  const result = JobIdSchema.safeParse(id)
  return result.success ? id : null
})

const canUpdateStatus = computed(() => {
  const result = canProgress.value && !updating.value
  
  // Debug log
  console.log('[JobDetail] canUpdateStatus check:', {
    canProgress: canProgress.value,
    updating: updating.value,
    result,
    jobStatus: job.value?.status,
    currentIndex: currentStatusIndex.value,
    nextStep: nextStep.value?.key,
    nextDbStatus: nextDbStatus.value
  })
  
  return result
})

const isCompleted = computed(() => {
  return isCompletedStatus.value
})

const isCancelled = computed(() => {
  return isCancelledStatus.value
})

const isDevelopment = computed(() => {
  return import.meta.env.DEV
})

const googleMapsUrl = computed(() => {
  if (!job.value) return ''
  const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status } = job.value
  
  // ถ้ายังไม่รับลูกค้า (matched) → navigate ไปจุดรับ
  if (['matched', 'accepted', 'offered', 'confirmed'].includes(status)) {
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

// ETA destination based on status
const etaDestination = computed(() => {
  if (!job.value) return null
  const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status } = job.value
  
  // Before pickup: ETA to pickup (matched/pickup)
  if (['matched', 'pickup', 'accepted', 'offered', 'confirmed', 'arrived'].includes(status)) {
    return { lat: pickup_lat, lng: pickup_lng, label: 'จุดรับ' }
  }
  // After pickup: ETA to dropoff (in_progress)
  if (['in_progress', 'picked_up', 'ongoing', 'started'].includes(status)) {
    return { lat: dropoff_lat, lng: dropoff_lng, label: 'จุดส่ง' }
  }
  return null
})

// Show photo evidence based on status
const showPickupPhoto = computed(() => {
  if (!job.value) return false
  // Show after arriving at pickup (pickup or later)
  return ['pickup', 'arrived', 'in_progress', 'picked_up', 'ongoing', 'started', 'completed', 'finished', 'done'].includes(job.value.status)
})

const showDropoffPhoto = computed(() => {
  if (!job.value) return false
  // Show after picking up customer (in_progress or later)
  return ['in_progress', 'picked_up', 'ongoing', 'started', 'completed', 'finished', 'done'].includes(job.value.status)
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

function formatTrackingId(trackingId: string): string {
  if (!trackingId) return '-'
  // If it's RID-xxx format, show as-is
  if (trackingId.startsWith('RID-')) {
    return trackingId
  }
  // For UUID format, show shortened version
  return trackingId.slice(-8).toUpperCase()
}

/**
 * Check provider access before loading job
 * Uses Promise.race to prevent timeout issues
 */
async function checkAccess(): Promise<boolean> {
  console.log('[JobDetail] Checking access...', {
    checkingProvider: checkingProvider.value,
    canAccessProvider: canAccessProvider.value,
    providerId: providerId.value
  })
  
  try {
    // Create timeout promise
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Access check timeout')), 5000)
    })
    
    // Create access check promise
    const accessCheckPromise = new Promise<boolean>(async (resolve) => {
      // If still checking, wait for it to complete
      if (checkingProvider.value) {
        console.log('[JobDetail] Waiting for provider check to complete...')
        let attempts = 0
        while (checkingProvider.value && attempts < 50) {
          await new Promise(r => setTimeout(r, 100))
          attempts++
        }
      }
      
      // If canAccessProvider is still false, try checking again
      if (!canAccessProvider.value) {
        console.log('[JobDetail] canAccessProvider is false, checking again...')
        const hasAccess = await checkProviderRouteAccess()
        console.log('[JobDetail] checkProviderRouteAccess result:', hasAccess)
        resolve(hasAccess)
      } else {
        resolve(true)
      }
    })
    
    // Race between timeout and access check
    const hasAccess = await Promise.race([accessCheckPromise, timeoutPromise])
    
    if (!hasAccess) {
      accessDenied.value = true
      errorMessage.value = 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้'
      return false
    }
    
    console.log('[JobDetail] Access granted, providerId:', providerId.value)
    return true
    
  } catch (error) {
    console.error('[JobDetail] Access check error:', error)
    accessDenied.value = true
    errorMessage.value = 'ไม่สามารถตรวจสอบสิทธิ์ได้ กรุณาลองใหม่'
    return false
  }
}

/**
 * Get step number from status for URL
 */
function getStepFromStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'accepted': '1-accepted',
    'matched': '1-matched',
    'offered': '1-offered',
    'arrived': '2-arrived',
    'pickup': '2-pickup',
    'in_progress': '3-in-progress',
    'picked_up': '3-picked-up',
    'completed': '4-completed',
    'cancelled': 'cancelled'
  }
  return statusMap[status] || 'unknown'
}

async function loadJob(): Promise<void> {
  // Validate job ID first
  if (!jobId.value) {
    errorMessage.value = 'รหัสงานไม่ถูกต้อง'
    loading.value = false
    return
  }

  // Check access
  if (!await checkAccess()) {
    loading.value = false
    return
  }

  loading.value = true
  errorMessage.value = null
  clearError()

  const result = await handleAsync(async () => {
    const { data, error: dbError } = await supabase
      .from('ride_requests')
      .select(`
        id, tracking_id, status, ride_type, pickup_address, destination_address,
        pickup_lat, pickup_lng, destination_lat, destination_lng,
        estimated_fare, final_fare, notes, created_at, user_id, provider_id
      `)
      .eq('id', jobId.value!)
      .single()

    if (dbError) {
      throw handleSupabaseError(dbError, 'LoadJob')
    }

    if (!data) {
      throw createAppError(ErrorCode.NOT_FOUND, 'Job not found', { jobId: jobId.value })
    }

    // Verify this job belongs to current provider
    if (data.provider_id && providerId.value && data.provider_id !== providerId.value) {
      throw createAppError(ErrorCode.PERMISSION_DENIED, 'Not authorized to view this job')
    }

    return data
  }, 'LoadJob')

  if (!result) {
    errorMessage.value = 'ไม่สามารถโหลดข้อมูลงานได้'
    loading.value = false
    return
  }

  // Fetch customer profile separately with error handling
  let customerProfile: { id: string; full_name: string | null; phone: string | null; avatar_url: string | null } | null = null
  if (result.user_id) {
    const profileResult = await handleAsync(async () => {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('id, name, phone, avatar_url')
        .eq('id', result.user_id)
        .maybeSingle()
      
      if (profileError) {
        console.warn('[JobDetail] Profile fetch warning:', profileError)
      }
      return profileData ? {
        id: profileData.id,
        full_name: profileData.name,
        phone: profileData.phone,
        avatar_url: profileData.avatar_url
      } : null
    }, 'FetchCustomerProfile')
    
    customerProfile = profileResult as typeof customerProfile
  }

  job.value = {
    id: result.id,
    tracking_id: result.tracking_id || result.id,
    type: 'ride',
    status: result.status,
    service_type: result.ride_type || 'standard',
    pickup_address: result.pickup_address || '',
    pickup_lat: result.pickup_lat || 0,
    pickup_lng: result.pickup_lng || 0,
    dropoff_address: result.destination_address || '',
    dropoff_lat: result.destination_lat || 0,
    dropoff_lng: result.destination_lng || 0,
    fare: result.final_fare || result.estimated_fare || 0,
    notes: result.notes as string | undefined,
    created_at: result.created_at,
    provider_id: result.provider_id,
    customer: customerProfile ? {
      id: customerProfile.id,
      name: customerProfile.full_name || 'ลูกค้า',
      phone: customerProfile.phone || '',
      avatar_url: customerProfile.avatar_url || undefined
    } : null
  }

  // Setup realtime subscription
  setupRealtimeSubscription()
  
  // Update URL with current status AFTER job is loaded
  // Update URL with current status (standardized)
  // Convert database format (in_progress) to URL format (in-progress)
  setTimeout(() => {
    const urlStep = result.status.replace(/_/g, '-')
    updateStep(urlStep as any, 'provider_job')
  }, 100)
  
  loading.value = false
}

function setupRealtimeSubscription(): void {
  if (!jobId.value) return
  cleanupRealtimeSubscription()

  console.log('[JobDetail] Setting up realtime subscription for:', jobId.value)

  realtimeChannel = supabase
    .channel(`job-detail-${jobId.value}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'ride_requests',
      filter: `id=eq.${jobId.value}`
    }, (payload) => {
      if (job.value && payload.new) {
        const newData = payload.new as Record<string, unknown>
        
        // Version checking to prevent race conditions
        const currentUpdatedAt = job.value.updated_at ? new Date(job.value.updated_at).getTime() : 0
        const newUpdatedAt = newData.updated_at ? new Date(newData.updated_at as string).getTime() : 0
        
        // Only update if new data is newer
        if (newUpdatedAt >= currentUpdatedAt) {
          console.log('[JobDetail] Realtime update received:', {
            oldStatus: job.value.status,
            newStatus: newData.status,
            oldUpdatedAt: job.value.updated_at,
            newUpdatedAt: newData.updated_at
          })
          
          job.value.status = newData.status as string
          job.value.updated_at = newData.updated_at as string
          
          // Update URL with new status (standardized)
          // Convert database format to URL format
          setTimeout(() => {
            const urlStep = (newData.status as string).replace(/_/g, '-')
            updateStep(urlStep as any, 'provider_job')
          }, 100)
          
          // Update fare if changed
          if (newData.final_fare) {
            job.value.fare = newData.final_fare as number
          }
        } else {
          console.warn('[JobDetail] Ignoring stale realtime update:', {
            currentUpdatedAt: new Date(currentUpdatedAt).toISOString(),
            newUpdatedAt: new Date(newUpdatedAt).toISOString()
          })
        }
      }
    })
    .subscribe((status) => {
      console.log('[JobDetail] Subscription status:', status)
    })
}

function cleanupRealtimeSubscription(): void {
  if (realtimeChannel) {
    realtimeChannel.unsubscribe()
    realtimeChannel = null
  }
}

async function updateStatus(): Promise<void> {
  if (!job.value || !nextDbStatus.value || updating.value) return

  // Explicit validation checks
  if (isCompleted.value) {
    errorMessage.value = 'ไม่สามารถอัพเดทงานที่เสร็จสิ้นแล้ว'
    return
  }

  if (isCancelled.value) {
    errorMessage.value = 'ไม่สามารถอัพเดทงานที่ถูกยกเลิกแล้ว'
    return
  }

  if (!canUpdateStatus.value) {
    errorMessage.value = 'ไม่สามารถอัพเดทสถานะได้ในขณะนี้'
    return
  }

  // Verify provider is still assigned
  if (job.value.provider_id && providerId.value && job.value.provider_id !== providerId.value) {
    errorMessage.value = 'งานนี้ไม่ได้มอบหมายให้คุณแล้ว'
    return
  }

  console.log('[JobDetail] Updating status:', {
    currentStatus: job.value.status,
    nextDbStatus: nextDbStatus.value,
    debugInfo: debugInfo.value
  })

  updating.value = true
  errorMessage.value = null

  const result = await handleAsync(async () => {
    const newStatus = nextDbStatus.value!
    
    // Build update object with appropriate timestamps
    const updateData: Record<string, unknown> = { 
      status: newStatus,
      updated_at: new Date().toISOString()
    }
    
    // Add timestamp based on status
    // Database uses: matched, pickup, in_progress, completed
    if (newStatus === 'pickup') {
      updateData.arrived_at = new Date().toISOString()
    } else if (newStatus === 'in_progress') {
      updateData.started_at = new Date().toISOString()
    } else if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }
    
    console.log('[JobDetail] Updating with data:', updateData)
    
    const { error: updateError } = await supabase
      .from('ride_requests')
      .update(updateData)
      .eq('id', job.value!.id)
      .eq('provider_id', providerId.value) // Ensure provider still owns job

    if (updateError) {
      throw handleSupabaseError(updateError, 'UpdateStatus')
    }

    return newStatus
  }, 'UpdateStatus')

  if (result) {
    // Update local state
    job.value!.status = result
    job.value!.updated_at = new Date().toISOString()
    
    // Update URL with new status (standardized)
    // Convert database format to URL format
    setTimeout(() => {
      const urlStep = result.replace(/_/g, '-')
      updateStep(urlStep as any, 'provider_job')
    }, 100)
    
    quickBeep()
    quickVibrate()

    console.log('[JobDetail] Status updated successfully to:', result)

    // If completed, notify customer for review and redirect
    if (result === 'completed') {
      // Trigger customer review notification via realtime broadcast
      try {
        await supabase.channel(`ride-${job.value!.id}`).send({
          type: 'broadcast',
          event: 'ride_completed',
          payload: {
            ride_id: job.value!.id,
            provider_id: providerId.value,
            fare: job.value!.fare,
            completed_at: new Date().toISOString()
          }
        })
      } catch (e) {
        console.warn('[JobDetail] Failed to send completion broadcast:', e)
      }
      
      setTimeout(() => {
        router.push('/provider/my-jobs')
      }, 2000)
    }
  } else {
    errorMessage.value = 'ไม่สามารถอัพเดทสถานะได้'
  }

  updating.value = false
}

async function cancelJob(): Promise<void> {
  if (!job.value || updating.value) return

  // Validate cancel reason
  const reasonValidation = CancelReasonSchema.safeParse(cancelReason.value)
  if (!reasonValidation.success) {
    errorMessage.value = reasonValidation.error.issues[0]?.message || 'ข้อมูลไม่ถูกต้อง'
    return
  }

  updating.value = true

  const result = await handleAsync(async () => {
    const { error: updateError } = await supabase
      .from('ride_requests')
      .update({ 
        status: 'cancelled',
        cancellation_reason: cancelReason.value || 'ยกเลิกโดยคนขับ',
        cancelled_by: 'provider',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.value!.id)

    if (updateError) {
      throw handleSupabaseError(updateError, 'CancelJob')
    }

    return true
  }, 'CancelJob')

  if (result) {
    showCancelModal.value = false
    router.push('/provider/my-jobs')
  } else {
    errorMessage.value = 'ไม่สามารถยกเลิกงานได้'
  }

  updating.value = false
}

function openNavigation(): void {
  if (!job.value) return
  
  const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status, pickup_address, dropoff_address } = job.value
  
  // ถ้ายังไม่รับลูกค้า (matched/pickup) → navigate ไปจุดรับ
  if (['matched', 'pickup', 'accepted', 'offered', 'confirmed', 'arrived'].includes(status)) {
    navigate({
      lat: pickup_lat,
      lng: pickup_lng,
      label: pickup_address || 'จุดรับ'
    })
  } else {
    // ถ้ารับลูกค้าแล้ว (in_progress) → navigate ไปจุดส่ง
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

function handlePhotoUploaded(type: 'pickup' | 'dropoff', url: string): void {
  if (job.value) {
    if (type === 'pickup') {
      job.value.pickup_photo = url
    } else {
      job.value.dropoff_photo = url
    }
  }
  photoError.value = null
}

function handlePhotoError(message: string): void {
  photoError.value = message
  setTimeout(() => {
    photoError.value = null
  }, 3000)
}

function startLocationTracking(): void {
  if (!navigator.geolocation) return

  locationWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      providerLocation.value = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }
      
      // Update ETA when location changes
      if (etaDestination.value) {
        updateETA(
          pos.coords.latitude, pos.coords.longitude,
          etaDestination.value.lat, etaDestination.value.lng
        )
      }
    },
    (err) => console.warn('[Location] Error:', err.message),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
  )
  
  // Start ETA tracking if destination available
  if (etaDestination.value) {
    startTracking(etaDestination.value.lat, etaDestination.value.lng)
  }
}

function stopLocationTracking(): void {
  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId)
    locationWatchId = null
  }
  stopTracking()
}

function goBack(): void {
  router.push('/provider/my-jobs')
}

function goToUnauthorized(): void {
  router.push('/unauthorized')
}

// Lifecycle
onMounted(() => {
  console.log('[JobDetail] Component mounted, loading job...')
  
  // Migrate old URL format to new standardized format
  migrateOldURL()
  
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
    console.log('[JobDetail] Route changed, reloading job:', route.params.id)
    loadJob()
  }
})

// Debug watch for status changes
watch([jobStatus, debugInfo], ([status, debug]) => {
  console.log('[JobDetail] Status Debug:', {
    jobStatus: status,
    currentIndex: currentStatusIndex.value,
    currentStep: currentStep.value?.key,
    nextStep: nextStep.value?.key,
    nextDbStatus: nextDbStatus.value,
    canProgress: canProgress.value,
    canUpdateStatus: canUpdateStatus.value,
    updating: updating.value,
    fullDebug: debug
  })
}, { immediate: true, deep: true })
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
      <div class="header-title">
        <h1>รายละเอียดงาน</h1>
        <span v-if="job?.tracking_id" class="tracking-badge" :title="job.tracking_id">
          #{{ formatTrackingId(job.tracking_id) }}
        </span>
      </div>
      <div class="header-spacer"></div>
    </header>

    <!-- Access Denied -->
    <div v-if="accessDenied" class="error-state" role="alert">
      <div class="error-icon" aria-hidden="true">🚫</div>
      <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
      <button class="retry-btn" @click="goToUnauthorized" type="button">กลับหน้าหลัก</button>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="center-state" role="status" aria-label="กำลังโหลด">
      <div class="loader" aria-hidden="true"></div>
      <span class="sr-only">กำลังโหลดข้อมูล...</span>
    </div>

    <!-- Error -->
    <div v-else-if="errorMessage" class="error-state" role="alert">
      <div class="error-icon" aria-hidden="true">⚠️</div>
      <p>{{ errorMessage }}</p>
      <button class="retry-btn" @click="loadJob" type="button">ลองใหม่</button>
    </div>

    <!-- Job Detail -->
    <template v-else-if="job">
      <!-- Status Progress -->
      <nav class="status-progress" aria-label="สถานะงาน">
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

      <!-- Completed Banner -->
      <div v-if="isCompleted" class="success-banner" role="status">
        <span class="success-icon" aria-hidden="true">🎉</span>
        <div class="success-text">
          <h3>งานเสร็จสิ้น!</h3>
          <p>รายได้ ฿{{ job.fare.toLocaleString() }}</p>
        </div>
      </div>

      <!-- Cancelled Banner -->
      <div v-if="isCancelled" class="cancelled-banner" role="status">
        <span class="cancelled-icon" aria-hidden="true">❌</span>
        <div class="cancelled-text">
          <h3>งานถูกยกเลิก</h3>
        </div>
      </div>

      <!-- Customer Card -->
      <article v-if="job.customer" class="customer-card" aria-label="ข้อมูลลูกค้า">
        <div class="customer-avatar">
          <img 
            v-if="job.customer.avatar_url" 
            :src="job.customer.avatar_url" 
            :alt="`รูปโปรไฟล์ ${job.customer.name}`"
            loading="lazy"
            decoding="async"
          />
          <span v-else class="avatar-placeholder" aria-hidden="true">👤</span>
        </div>
        <div class="customer-info">
          <h3>{{ job.customer.name }}</h3>
          <p v-if="distanceToPickup !== null" class="distance-info">
            <span aria-hidden="true">📍</span> ห่าง {{ formatDistance(distanceToPickup) }}
          </p>
        </div>
        <div v-if="!isCompleted && !isCancelled" class="contact-buttons">
          <button 
            v-if="job.customer.phone"
            class="call-btn"
            @click="callCustomer"
            type="button"
            :aria-label="`โทรหา ${job.customer.name}`"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
          </button>
          <button 
            class="chat-btn"
            @click="openChat"
            type="button"
            :aria-label="`แชทกับ ${job.customer.name}`"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </button>
        </div>
      </article>

      <!-- Customer Card Fallback (no customer data) -->
      <article v-else class="customer-card" aria-label="ข้อมูลลูกค้า">
        <div class="customer-avatar">
          <span class="avatar-placeholder" aria-hidden="true">👤</span>
        </div>
        <div class="customer-info">
          <h3>ลูกค้า</h3>
          <p class="distance-info">ไม่มีข้อมูลลูกค้า</p>
        </div>
        <div v-if="!isCompleted && !isCancelled" class="contact-buttons">
          <button 
            class="chat-btn"
            @click="openChat"
            type="button"
            aria-label="แชทกับลูกค้า"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </button>
        </div>
      </article>

      <!-- ETA Card -->
      <article v-if="eta && etaDestination && !isCompleted && !isCancelled" class="eta-card" aria-label="เวลาโดยประมาณ">
        <div class="eta-header">
          <span class="eta-icon" aria-hidden="true">⏱️</span>
          <span class="eta-label">ถึง{{ etaDestination.label }}</span>
        </div>
        <div class="eta-content">
          <div class="eta-time">
            <span class="eta-value">{{ eta.formattedTime }}</span>
            <span class="eta-arrival">ถึงประมาณ {{ arrivalTime }}</span>
          </div>
          <div class="eta-distance">
            <span class="eta-km">{{ eta.formattedDistance }}</span>
          </div>
        </div>
      </article>

      <!-- Route Info -->
      <article class="route-card" aria-label="เส้นทาง">
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

      <!-- Notes -->
      <aside v-if="job.notes" class="notes-card" aria-label="หมายเหตุ">
        <h4><span aria-hidden="true">📝</span> หมายเหตุจากลูกค้า</h4>
        <p>{{ job.notes }}</p>
      </aside>

      <!-- Fare -->
      <div class="fare-card" aria-label="ค่าโดยสาร">
        <span class="fare-label">ค่าโดยสาร</span>
        <span class="fare-amount" aria-live="polite">฿{{ job.fare.toLocaleString() }}</span>
      </div>

      <!-- Photo Evidence Section -->
      <section v-if="showPickupPhoto || showDropoffPhoto" class="photo-section" aria-label="รูปยืนยัน">
        <h4 class="section-title">
          <span aria-hidden="true">📷</span> รูปยืนยัน
        </h4>
        <div class="photo-grid">
          <PhotoEvidence
            v-if="showPickupPhoto"
            :ride-id="job.id"
            type="pickup"
            :existing-photo="job.pickup_photo"
            :disabled="isCompleted || isCancelled"
            @uploaded="(url) => handlePhotoUploaded('pickup', url)"
            @error="handlePhotoError"
          />
          <PhotoEvidence
            v-if="showDropoffPhoto"
            :ride-id="job.id"
            type="dropoff"
            :existing-photo="job.dropoff_photo"
            :disabled="isCompleted || isCancelled"
            @uploaded="(url) => handlePhotoUploaded('dropoff', url)"
            @error="handlePhotoError"
          />
        </div>
      </section>

      <!-- Photo Error Toast -->
      <Transition name="toast">
        <div v-if="photoError" class="photo-error-toast" role="alert">
          <span aria-hidden="true">⚠️</span> {{ photoError }}
        </div>
      </Transition>

      <!-- Action Buttons -->
      <div v-if="!isCompleted && !isCancelled" class="action-buttons" role="group" aria-label="การดำเนินการ">
        <!-- Navigation Button -->
        <button 
          class="nav-btn"
          @click="openNavigation"
          type="button"
          aria-label="เปิดแผนที่นำทาง"
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
          :class="{ completing: nextStep?.key === 'completed' }"
          @click="updateStatus"
          :disabled="updating"
          type="button"
          :aria-busy="updating"
        >
          <span v-if="updating" class="btn-loader" aria-hidden="true"></span>
          <span v-if="updating" class="sr-only">กำลังดำเนินการ...</span>
          <span v-else>{{ nextStep?.action }}</span>
        </button>
      </div>

      <!-- Debug Info (Development Only) -->
      <div v-if="!isCompleted && !isCancelled && isDevelopment" class="debug-panel">
        <details>
          <summary>🔧 Debug Status Flow</summary>
          <pre>{{ JSON.stringify(debugInfo, null, 2) }}</pre>
          <button 
            v-if="nextDbStatus"
            @click="updateStatus"
            class="debug-update-btn"
            type="button"
          >
            Force Update to: {{ nextDbStatus }}
          </button>
        </details>
      </div>

      <!-- Cancel Button -->
      <button 
        v-if="!isCompleted && !isCancelled && currentStatusIndex < 3"
        class="cancel-btn"
        @click="showCancelModal = true"
        type="button"
        aria-haspopup="dialog"
      >
        ยกเลิกงาน
      </button>
    </template>

    <!-- Cancel Modal -->
    <Teleport to="body">
      <div 
        v-if="showCancelModal" 
        class="modal-overlay" 
        @click.self="showCancelModal = false"
        role="presentation"
      >
        <div 
          class="modal-content" 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="cancel-title"
          aria-describedby="cancel-description"
        >
          <h3 id="cancel-title">ยกเลิกงาน</h3>
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
          <span id="reason-hint" class="sr-only">สูงสุด 500 ตัวอักษร</span>

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
              :aria-busy="updating"
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
    <ChatDrawer
      v-if="job"
      :ride-id="job.id"
      :other-user-name="job.customer?.name || 'ลูกค้า'"
      :is-open="showChatDrawer"
      @close="showChatDrawer = false"
    />
  </div>
</template>

<style scoped>
.job-detail-page {
  min-height: 100vh;
  background: #f9fafb;
  padding-bottom: 100px;
}

/* Screen reader only */
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

.header-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.tracking-badge {
  padding: 2px 8px;
  background: #f1f5f9;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  letter-spacing: 0.5px;
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
  justify-content: center;
  width: 44px;
  height: 44px;
  background: #10b981;
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.call-btn:active {
  background: #059669;
}

.call-btn svg {
  width: 20px;
  height: 20px;
}

/* Contact Buttons */
.contact-buttons {
  display: flex;
  gap: 8px;
}

.chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.chat-btn:active {
  background: #2563eb;
}

.chat-btn svg {
  width: 20px;
  height: 20px;
}

/* ETA Card */
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
  margin-bottom: 12px;
}

.eta-icon {
  font-size: 20px;
}

.eta-label {
  font-size: 14px;
  font-weight: 600;
  color: #1e40af;
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

/* Photo Section */
.photo-section {
  padding: 16px;
  background: #fff;
  margin: 0 16px 12px;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
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

@media (max-width: 400px) {
  .photo-grid {
    grid-template-columns: 1fr;
  }
}

/* Photo Error Toast */
.photo-error-toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 20px;
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
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

/* Debug Panel (Development Only) */
.debug-panel {
  margin: 0 16px 20px;
  padding: 16px;
  background: #fef3c7;
  border: 2px dashed #f59e0b;
  border-radius: 12px;
  font-family: monospace;
  font-size: 12px;
}

.debug-panel summary {
  cursor: pointer;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 12px;
  user-select: none;
}

.debug-panel pre {
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
  color: #1f2937;
}

.debug-update-btn {
  width: 100%;
  padding: 12px;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
}

.debug-update-btn:active {
  background: #dc2626;
}
</style>
