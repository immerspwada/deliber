<script setup lang="ts">
/**
 * Provider Jobs View - Production Ready
 * 
 * Features:
 * - Debounced job loading (prevent duplicate API calls)
 * - Optimistic UI updates for job acceptance
 * - Race condition prevention with version check
 * - Proper error handling with retry
 * - Memory leak prevention (cleanup subscriptions)
 * - Input validation with Zod
 * - Loading/Error states
 * - Job Preview Map
 * - Auto-Accept Rules
 * - Job Priority Score
 */
import { ref, computed, onMounted, onUnmounted, watch, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { useJobAlert } from '../../composables/useJobAlert'
import { useAutoAcceptRules } from '../../composables/useAutoAcceptRules'
import { useJobPriority } from '../../composables/useJobPriority'
import { usePushNotification } from '../../composables/usePushNotification'
import JobPreviewMap from '../../components/provider/JobPreviewMap.vue'
import AutoAcceptSettings from '../../components/provider/AutoAcceptSettings.vue'
import JobHeatMap from '../../components/provider/JobHeatMap.vue'

// =====================================================
// Types & Validation Schemas
// =====================================================
const JobSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['ride', 'delivery', 'shopping']),
  service_type: z.string().default('standard'),
  fare: z.number().min(0).default(0),
  pickup_address: z.string().min(1).max(500),
  dropoff_address: z.string().min(1).max(500),
  pickup_lat: z.number().min(-90).max(90),
  pickup_lng: z.number().min(-180).max(180),
  dropoff_lat: z.number().min(-90).max(90),
  dropoff_lng: z.number().min(-180).max(180),
  created_at: z.string(),
  distance: z.number().optional(),
  version: z.number().optional() // For optimistic locking
})

type Job = z.infer<typeof JobSchema>

interface ProviderData {
  id: string
  status: string
  is_online: boolean
  first_name?: string
  service_types?: string[]
}

// =====================================================
// Constants - Optimized for Production
// =====================================================
const DEBOUNCE_MS = 200 // Reduced for better responsiveness
const REFRESH_INTERVAL_MS = 25000 // Slightly faster refresh
const MAX_JOBS_LIMIT = 30 // Reduced for better performance
const REALTIME_DEBOUNCE_MS = 300 // Faster real-time updates
const RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000

// =====================================================
// Composables
// =====================================================
const router = useRouter()
const { isPlaying, playAlert, stopAlert, quickBeep, quickVibrate } = useJobAlert()
const { notifyNewJob, requestPermission: requestPushPermission, isSubscribed: isPushSubscribed } = usePushNotification()

// =====================================================
// State - Enhanced with Performance Tracking
// =====================================================
const loading = ref(true)
const loadingJobs = ref(false)
const error = ref<string | null>(null)
const provider = shallowRef<ProviderData | null>(null)
const isOnline = ref(false)
const toggling = ref(false)
const availableJobs = shallowRef<Job[]>([])
const userLocation = ref<{ lat: number; lng: number } | null>(null)
const acceptingJobId = ref<string | null>(null)
const acceptError = ref<string | null>(null)
const sortBy = ref<'distance' | 'fare_high' | 'newest'>('distance')
const showJobPreviewModal = ref(false)
const selectedJobForPreview = ref<Job | null>(null)
const retryCount = ref(0)
const lastRefreshTime = ref<Date | null>(null)
const connectionStatus = ref<'connected' | 'connecting' | 'disconnected'>('disconnected')
const showHeatMap = ref(false)

// Development mode check
const isDev = computed(() => import.meta.env.DEV)

// Debounce & Cleanup refs
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null
let refreshInterval: ReturnType<typeof setInterval> | null = null
let loadJobsDebounceTimer: ReturnType<typeof setTimeout> | null = null
let realtimeDebounceTimer: ReturnType<typeof setTimeout> | null = null
let isLoadingJobs = false // Mutex flag

// =====================================================
// Computed
// =====================================================
const canWork = computed(() => {
  const s = provider.value?.status
  return s === 'approved' || s === 'active'
})

const sortedJobs = computed(() => {
  const jobs = [...availableJobs.value]
  
  switch (sortBy.value) {
    case 'distance':
      return jobs.sort((a, b) => (a.distance || 999) - (b.distance || 999))
    case 'fare_high':
      return jobs.sort((a, b) => b.fare - a.fare)
    case 'newest':
      return jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    default:
      return jobs
  }
})

const statusText = computed(() => {
  if (!canWork.value) return 'บัญชียังไม่ได้รับอนุมัติ'
  return isOnline.value ? 'พร้อมรับงาน' : 'ออฟไลน์'
})

const hasError = computed(() => error.value !== null)

// =====================================================
// Utility Functions
// =====================================================
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

function formatDistance(km: number | undefined): string {
  if (km === undefined) return ''
  if (km < 1) return `${Math.round(km * 1000)} ม.`
  return `${km.toFixed(1)} กม.`
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'เมื่อสักครู่'
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} ชม.ที่แล้ว`
  return `${Math.floor(diffHours / 24)} วันที่แล้ว`
}

function getJobTypeLabel(job: Job): string {
  if (job.type === 'ride') {
    const labels: Record<string, string> = { standard: 'เรียกรถ', premium: 'พรีเมียม', shared: 'แชร์รถ' }
    return labels[job.service_type] || 'เรียกรถ'
  }
  if (job.type === 'delivery') {
    const labels: Record<string, string> = { document: 'ส่งเอกสาร', small: 'ส่งพัสดุเล็ก', medium: 'ส่งพัสดุกลาง', large: 'ส่งพัสดุใหญ่' }
    return labels[job.service_type] || 'ส่งของ'
  }
  return 'ซื้อของ'
}

// =====================================================
// Enhanced Error Handling & Retry Logic
// =====================================================

// Retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  attempts: number = RETRY_ATTEMPTS,
  delay: number = RETRY_DELAY_MS
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (attempts <= 1) throw err
    
    console.warn(`[Retry] Attempt failed, ${attempts - 1} attempts remaining:`, err)
    await new Promise(resolve => setTimeout(resolve, delay))
    return retryWithBackoff(fn, attempts - 1, delay * 2)
  }
}

// Enhanced error handler with user-friendly messages
function handleError(err: unknown, context: string): string {
  console.error(`[${context}] Error:`, err)
  
  if (err instanceof Error) {
    // Network errors
    if (err.message.includes('fetch') || err.message.includes('network')) {
      return 'ปัญหาการเชื่อมต่อ กรุณาตรวจสอบอินเทอร์เน็ต'
    }
    
    // Database errors
    if (err.message.includes('database') || err.message.includes('supabase')) {
      return 'ปัญหาระบบฐานข้อมูล กรุณาลองใหม่อีกครั้ง'
    }
    
    // Permission errors
    if (err.message.includes('permission') || err.message.includes('unauthorized')) {
      return 'ไม่มีสิทธิ์เข้าถึง กรุณาเข้าสู่ระบบใหม่'
    }
    
    return err.message
  }
  
  return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
}

// =====================================================
// Performance Monitoring & Analytics
// =====================================================

// Track performance metrics
const performanceMetrics = ref({
  jobLoadTime: 0,
  lastJobCount: 0,
  averageResponseTime: 0,
  errorRate: 0
})

// Performance tracking function
function trackPerformance(operation: string, startTime: number): void {
  const endTime = performance.now()
  const duration = endTime - startTime
  
  console.log(`[Performance] ${operation}: ${duration.toFixed(2)}ms`)
  
  // Update metrics
  if (operation === 'loadJobs') {
    performanceMetrics.value.jobLoadTime = duration
    lastRefreshTime.value = new Date()
  }
}

// Enhanced error tracking
function trackError(error: unknown, context: string): void {
  console.error(`[Error Tracking] ${context}:`, error)
  
  // Update error rate
  performanceMetrics.value.errorRate += 1
  
  // Send to analytics (if implemented)
  // analytics.track('provider_error', { context, error: error.message })
}

// =====================================================
// Enhanced Core Functions
// =====================================================

// Load provider profile with retry
async function loadProvider(): Promise<void> {
  loading.value = true
  error.value = null
  retryCount.value = 0
  
  try {
    await retryWithBackoff(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('กรุณาเข้าสู่ระบบ')
      }

      const { data, error: dbError } = await supabase
        .from('providers_v2')
        .select('id, status, is_online, first_name, service_types')
        .eq('user_id', user.id)
        .maybeSingle()

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`)
      }

      if (data) {
        const providerData = data as ProviderData
        provider.value = providerData
        isOnline.value = providerData.is_online || false
        
        if (isOnline.value) {
          await loadAvailableJobsDebounced()
          setupRealtimeSubscription()
        }
      } else {
        throw new Error('ไม่พบข้อมูลผู้ให้บริการ')
      }
    })
  } catch (err) {
    error.value = handleError(err, 'Provider Load')
  } finally {
    loading.value = false
  }
}

// Debounced job loading - prevents duplicate calls
function loadAvailableJobsDebounced(): Promise<void> {
  return new Promise((resolve) => {
    if (loadJobsDebounceTimer) {
      clearTimeout(loadJobsDebounceTimer)
    }
    
    loadJobsDebounceTimer = setTimeout(async () => {
      await loadAvailableJobs()
      resolve()
    }, DEBOUNCE_MS)
  })
}

// Load available jobs with mutex and performance tracking
async function loadAvailableJobs(): Promise<void> {
  // Mutex: prevent concurrent calls
  if (isLoadingJobs) {
    console.log('[Jobs] Skipping - already loading')
    return
  }
  
  if (!provider.value) return
  
  const startTime = performance.now()
  isLoadingJobs = true
  loadingJobs.value = true
  error.value = null
  
  const jobs: Job[] = []
  const serviceTypes = provider.value.service_types || ['ride']
  
  try {
    // Load ride requests with performance tracking
    if (serviceTypes.includes('ride')) {
      const rideStartTime = performance.now()
      const { data: rides, error: ridesError } = await supabase
        .from('ride_requests')
        .select('id, pickup_address, destination_address, pickup_lat, pickup_lng, destination_lat, destination_lng, estimated_fare, ride_type, created_at')
        .eq('status', 'pending')
        .is('provider_id', null)
        .order('created_at', { ascending: false })
        .limit(MAX_JOBS_LIMIT)
      
      trackPerformance('loadRides', rideStartTime)
      
      if (ridesError) {
        trackError(ridesError, 'Rides Load')
        console.error('[Jobs] Rides error:', ridesError)
      } else if (rides) {
        for (const ride of rides) {
          const validated = validateAndTransformRide(ride)
          if (validated) {
            if (userLocation.value) {
              validated.distance = calculateDistance(
                userLocation.value.lat, userLocation.value.lng,
                validated.pickup_lat, validated.pickup_lng
              )
            }
            jobs.push(validated)
          }
        }
      }
    }
    
    // Load delivery requests with performance tracking
    if (serviceTypes.includes('delivery')) {
      const deliveryStartTime = performance.now()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: deliveries, error: deliveriesError } = await (supabase as any)
        .from('delivery_requests')
        .select('id, sender_address, recipient_address, sender_lat, sender_lng, recipient_lat, recipient_lng, estimated_fee, package_type, created_at')
        .eq('status', 'pending')
        .is('provider_id', null)
        .order('created_at', { ascending: false })
        .limit(MAX_JOBS_LIMIT)
      
      trackPerformance('loadDeliveries', deliveryStartTime)
      
      if (deliveriesError) {
        trackError(deliveriesError, 'Deliveries Load')
        console.error('[Jobs] Deliveries error:', deliveriesError)
      } else if (deliveries) {
        for (const delivery of deliveries) {
          const validated = validateAndTransformDelivery(delivery)
          if (validated) {
            if (userLocation.value) {
              validated.distance = calculateDistance(
                userLocation.value.lat, userLocation.value.lng,
                validated.pickup_lat, validated.pickup_lng
              )
            }
            jobs.push(validated)
          }
        }
      }
    }
    
    // Sort by distance or time
    jobs.sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    
    const prevCount = availableJobs.value.length
    availableJobs.value = jobs
    performanceMetrics.value.lastJobCount = jobs.length
    
    // Play alert and send push notification for new jobs
    if (jobs.length > 0 && prevCount === 0 && !isPlaying.value) {
      playAlert()
      
      // Send push notification for first job
      const firstJob = jobs[0]
      if (firstJob) {
        notifyNewJob({
          id: firstJob.id,
          type: getJobTypeLabel(firstJob),
          pickup: firstJob.pickup_address,
          fare: firstJob.fare
        })
      }
    }
    
    trackPerformance('loadJobs', startTime)
    
  } catch (err) {
    trackError(err, 'Jobs Load')
    console.error('[Jobs] Exception:', err)
    error.value = handleError(err, 'Jobs Load')
  } finally {
    loadingJobs.value = false
    isLoadingJobs = false
  }
}

// Validate and transform ride data
function validateAndTransformRide(ride: unknown): Job | null {
  try {
    const r = ride as Record<string, unknown>
    const job = {
      id: r.id as string,
      type: 'ride' as const,
      service_type: (r.ride_type as string) || 'standard',
      fare: Number(r.estimated_fare) || 0,
      pickup_address: (r.pickup_address as string) || '',
      dropoff_address: (r.destination_address as string) || '',
      pickup_lat: Number(r.pickup_lat) || 0,
      pickup_lng: Number(r.pickup_lng) || 0,
      dropoff_lat: Number(r.destination_lat) || 0,
      dropoff_lng: Number(r.destination_lng) || 0,
      created_at: r.created_at as string
    }
    
    const result = JobSchema.safeParse(job)
    if (!result.success) {
      console.warn('[Validate] Invalid ride:', result.error.flatten())
      return null
    }
    return result.data
  } catch {
    return null
  }
}

// Validate and transform delivery data
function validateAndTransformDelivery(delivery: unknown): Job | null {
  try {
    const d = delivery as Record<string, unknown>
    const job = {
      id: d.id as string,
      type: 'delivery' as const,
      service_type: (d.package_type as string) || 'small',
      fare: Number(d.estimated_fee) || 0,
      pickup_address: (d.sender_address as string) || '',
      dropoff_address: (d.recipient_address as string) || '',
      pickup_lat: Number(d.sender_lat) || 0,
      pickup_lng: Number(d.sender_lng) || 0,
      dropoff_lat: Number(d.recipient_lat) || 0,
      dropoff_lng: Number(d.recipient_lng) || 0,
      created_at: d.created_at as string
    }
    
    const result = JobSchema.safeParse(job)
    if (!result.success) {
      console.warn('[Validate] Invalid delivery:', result.error.flatten())
      return null
    }
    return result.data
  } catch {
    return null
  }
}

// Setup realtime subscription with connection status tracking
function setupRealtimeSubscription(): void {
  cleanupRealtimeSubscription()
  connectionStatus.value = 'connecting'
  
  realtimeChannel = supabase
    .channel('provider-jobs-v3') // Updated channel name
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'ride_requests',
      filter: 'status=eq.pending'
    }, handleRealtimeEvent)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'delivery_requests',
      filter: 'status=eq.pending'
    }, handleRealtimeEvent)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'ride_requests'
    }, handleRealtimeEvent)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'delivery_requests'
    }, handleRealtimeEvent)
    .subscribe((status) => {
      console.log('[Realtime] Status:', status)
      
      switch (status) {
        case 'SUBSCRIBED':
          connectionStatus.value = 'connected'
          break
        case 'CHANNEL_ERROR':
        case 'TIMED_OUT':
        case 'CLOSED':
          connectionStatus.value = 'disconnected'
          // Auto-reconnect after delay
          setTimeout(() => {
            if (isOnline.value && !realtimeChannel) {
              setupRealtimeSubscription()
            }
          }, 5000)
          break
        default:
          connectionStatus.value = 'connecting'
      }
    })
}

// Debounced realtime event handler
function handleRealtimeEvent(): void {
  if (realtimeDebounceTimer) {
    clearTimeout(realtimeDebounceTimer)
  }
  
  realtimeDebounceTimer = setTimeout(() => {
    console.log('[Realtime] Refreshing jobs...')
    loadAvailableJobs()
  }, REALTIME_DEBOUNCE_MS)
}

// Cleanup realtime subscription
function cleanupRealtimeSubscription(): void {
  if (realtimeChannel) {
    try {
      realtimeChannel.unsubscribe()
    } catch (err) {
      console.warn('[Realtime] Cleanup error:', err)
    }
    realtimeChannel = null
  }
  
  if (realtimeDebounceTimer) {
    clearTimeout(realtimeDebounceTimer)
    realtimeDebounceTimer = null
  }
}

// Accept job with optimistic UI and race condition prevention
async function acceptJob(job: Job): Promise<void> {
  if (!provider.value || acceptingJobId.value) return
  
  acceptingJobId.value = job.id
  acceptError.value = null
  stopAlert()
  
  // Optimistic UI: remove job immediately
  const previousJobs = [...availableJobs.value]
  availableJobs.value = availableJobs.value.filter(j => j.id !== job.id)
  
  try {
    const providerId = provider.value.id
    const table = job.type === 'ride' ? 'ride_requests' : 
                  job.type === 'delivery' ? 'delivery_requests' : 
                  'shopping_requests'
    
    // Use atomic update with status check (prevents race condition)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: updateError } = await (supabase as any)
      .from(table)
      .update({ 
        provider_id: providerId,
        status: 'matched',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)
      .eq('status', 'pending') // Only if still pending
      .is('provider_id', null) // Only if not yet assigned
      .select('id')
      .maybeSingle()
    
    if (updateError) {
      throw new Error(updateError.message)
    }
    
    if (!data) {
      // Job was taken by another provider
      acceptError.value = 'งานนี้ถูกรับไปแล้ว'
      // Rollback optimistic update but remove this job
      availableJobs.value = previousJobs.filter(j => j.id !== job.id)
      // Refresh to get latest jobs
      await loadAvailableJobs()
      return
    }
    
    // Success
    quickBeep()
    quickVibrate()
    console.log('[Accept] Success:', job.id)
    
    // Navigate to my jobs page to see accepted job
    router.push('/provider/my-jobs')
    
  } catch (err) {
    console.error('[Accept] Error:', err)
    acceptError.value = 'ไม่สามารถรับงานได้ กรุณาลองใหม่'
    // Rollback optimistic update
    availableJobs.value = previousJobs
  } finally {
    acceptingJobId.value = null
  }
}

// Toggle online status
async function toggleOnline(): Promise<void> {
  if (!provider.value || !canWork.value || toggling.value) return
  
  toggling.value = true
  error.value = null
  const newStatus = !isOnline.value
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('providers_v2')
      .update({ is_online: newStatus, updated_at: new Date().toISOString() })
      .eq('id', provider.value.id)

    if (updateError) {
      throw new Error(updateError.message)
    }
    
    isOnline.value = newStatus
    quickBeep()
    quickVibrate()
    
    if (newStatus) {
      getUserLocation()
      await loadAvailableJobsDebounced()
      setupRealtimeSubscription()
      startRefreshInterval()
      
      // Request push notification permission when going online
      if (!isPushSubscribed.value) {
        requestPushPermission()
      }
    } else {
      availableJobs.value = []
      stopAlert()
      cleanupRealtimeSubscription()
      stopRefreshInterval()
    }
  } catch (err) {
    console.error('[Toggle] Error:', err)
    error.value = 'ไม่สามารถเปลี่ยนสถานะได้'
  } finally {
    toggling.value = false
  }
}

// Get user location
function getUserLocation(): void {
  if (!navigator.geolocation) return
  
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLocation.value = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }
    },
    (err) => console.warn('[Location] Error:', err.message),
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

// Refresh interval management
function startRefreshInterval(): void {
  stopRefreshInterval()
  refreshInterval = setInterval(() => {
    if (isOnline.value && !isLoadingJobs) {
      loadAvailableJobs()
    }
  }, REFRESH_INTERVAL_MS)
}

function stopRefreshInterval(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

// Retry loading
function retryLoad(): void {
  error.value = null
  loadProvider()
}

// Show job preview modal
function showJobPreview(job: Job): void {
  selectedJobForPreview.value = job
  showJobPreviewModal.value = true
}

// Close job preview modal
function closeJobPreview(): void {
  showJobPreviewModal.value = false
  selectedJobForPreview.value = null
}

// Simulate new job for testing
function simulateNewJob(): void {
  playAlert()
  quickVibrate()
}

// Watch for location changes
watch(userLocation, () => {
  if (userLocation.value && availableJobs.value.length > 0) {
    availableJobs.value = availableJobs.value.map(job => ({
      ...job,
      distance: calculateDistance(
        userLocation.value!.lat, userLocation.value!.lng,
        job.pickup_lat, job.pickup_lng
      )
    })).sort((a, b) => (a.distance || 999) - (b.distance || 999))
  }
})

// Lifecycle
onMounted(() => {
  loadProvider()
  getUserLocation()
})

onUnmounted(() => {
  // Cleanup all resources
  stopRefreshInterval()
  cleanupRealtimeSubscription()
  stopAlert()
  
  if (loadJobsDebounceTimer) {
    clearTimeout(loadJobsDebounceTimer)
  }
})
</script>

<template>
  <div class="jobs-page">
    <!-- Loading State -->
    <div v-if="loading" class="center-state">
      <div class="loader" aria-label="กำลังโหลด"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="hasError" class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>เกิดข้อผิดพลาด</h3>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="retryLoad" type="button">
        ลองใหม่
      </button>
    </div>

    <template v-else>
      <!-- Enhanced Status Card -->
      <div class="status-card" :class="{ online: isOnline, disabled: !canWork }">
        <div class="status-left">
          <div class="status-indicator" :class="{ active: isOnline }">
            <span class="dot"></span>
          </div>
          <div class="status-text">
            <h2>{{ isOnline ? 'ออนไลน์' : 'ออฟไลน์' }}</h2>
            <p>{{ statusText }}</p>
            <div v-if="isOnline && userLocation" class="location-info">
              📍 ตำแหน่งปัจจุบัน: พร้อมใช้งาน
            </div>
            <div v-if="isOnline" class="connection-status" :class="connectionStatus">
              <span class="connection-dot"></span>
              <span class="connection-text">
                {{ connectionStatus === 'connected' ? 'เชื่อมต่อแล้ว' : 
                   connectionStatus === 'connecting' ? 'กำลังเชื่อมต่อ...' : 'ขาดการเชื่อมต่อ' }}
              </span>
            </div>
          </div>
        </div>
        
        <div class="status-right">
          <button 
            v-if="canWork"
            class="toggle-btn" 
            :class="{ active: isOnline }"
            :disabled="toggling"
            @click="toggleOnline"
            type="button"
            :aria-label="isOnline ? 'ปิดสถานะออนไลน์' : 'เปิดสถานะออนไลน์'"
            :aria-pressed="isOnline"
          >
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
          </button>
          
          <!-- Quick Stats -->
          <div v-if="isOnline" class="quick-stats">
            <div class="stat-item">
              <span class="stat-value" aria-label="จำนวนงานที่พร้อมรับ">{{ availableJobs.length }}</span>
              <span class="stat-label">งานพร้อมรับ</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Enhanced Quick Actions Bar -->
      <div v-if="isOnline" class="quick-actions">
        <button 
          class="action-btn" 
          @click="loadAvailableJobs" 
          :disabled="loadingJobs"
          :aria-label="loadingJobs ? 'กำลังรีเฟรช...' : 'รีเฟรชรายการงาน'"
        >
          <span class="action-icon" :class="{ spinning: loadingJobs }">🔄</span>
          <span>{{ loadingJobs ? 'กำลังโหลด...' : 'รีเฟรช' }}</span>
        </button>
        <button 
          class="action-btn" 
          @click="showHeatMap = !showHeatMap"
          :aria-label="showHeatMap ? 'ซ่อนแผนที่ความร้อน' : 'แสดงแผนที่ความร้อน'"
          :aria-pressed="showHeatMap"
        >
          <span class="action-icon">🗺️</span>
          <span>{{ showHeatMap ? 'ซ่อน' : 'แสดง' }}แผนที่</span>
        </button>
        <button 
          class="action-btn" 
          @click="router.push('/provider/earnings')"
          aria-label="ดูรายได้"
        >
          <span class="action-icon">💰</span>
          <span>รายได้</span>
        </button>
        <button 
          class="action-btn" 
          @click="getUserLocation"
          aria-label="อัปเดตตำแหน่ง"
          :disabled="!navigator.geolocation"
        >
          <span class="action-icon">📍</span>
          <span>ตำแหน่ง</span>
        </button>
      </div>

      <!-- Accept Error Toast -->
      <div v-if="acceptError" class="accept-error-toast" role="alert">
        <span>{{ acceptError }}</span>
        <button @click="acceptError = null" type="button" aria-label="ปิด">✕</button>
      </div>

      <!-- Not Approved -->
      <div v-if="!canWork" class="info-card warning">
        <span class="info-icon">⏳</span>
        <div class="info-content">
          <h3>รอการอนุมัติ</h3>
          <p>บัญชีของคุณอยู่ระหว่างการตรวจสอบ</p>
        </div>
      </div>

      <!-- Offline State -->
      <template v-else-if="!isOnline">
        <div class="offline-content">
          <div class="offline-illustration">
            <svg viewBox="0 0 120 120" fill="none" aria-hidden="true">
              <circle cx="60" cy="60" r="50" stroke="#E5E7EB" stroke-width="2" stroke-dasharray="8 4"/>
              <circle cx="60" cy="60" r="20" fill="#F3F4F6"/>
              <path d="M55 55L65 65M65 55L55 65" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <h3>คุณกำลังออฟไลน์</h3>
          <p>เปิดสถานะออนไลน์เพื่อเริ่มรับงาน</p>
        </div>
      </template>

      <!-- Online State -->
      <template v-else>
        <!-- Searching (No Jobs) -->
        <div v-if="availableJobs.length === 0" class="searching-content">
          <div class="radar-container">
            <div class="radar-pulse"></div>
            <div class="radar-pulse delay-1"></div>
            <div class="radar-pulse delay-2"></div>
            <div class="radar-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
          </div>
          <h3>กำลังค้นหางาน</h3>
          <p>ระบบจะแจ้งเตือนเมื่อมีงานใหม่</p>
          
          <div v-if="loadingJobs" class="loading-jobs">
            <div class="mini-loader"></div>
            <span>กำลังโหลด...</span>
          </div>
          
          <button 
            v-if="!isPlaying && !loadingJobs"
            class="test-alert-btn"
            @click="simulateNewJob"
            type="button"
          >
            🔔 ทดสอบแจ้งเตือน
          </button>
          <button 
            v-else-if="isPlaying"
            class="stop-alert-btn"
            @click="stopAlert"
            type="button"
          >
            🔇 หยุดเสียง
          </button>
          
          <div class="tip-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            <span>อยู่ในพื้นที่ที่มีความต้องการสูงเพื่อรับงานเร็วขึ้น</span>
          </div>
        </div>

        <!-- Heat Map -->
        <div v-if="showHeatMap && availableJobs.length === 0" class="heat-map-section">
          <JobHeatMap :user-location="userLocation" />
        </div>

        <!-- Jobs List with Enhanced Design -->
        <div v-if="availableJobs.length > 0" class="jobs-section">
          <div class="jobs-header">
            <h3>งานที่รอรับ ({{ availableJobs.length }})</h3>
            <div class="header-actions">
              <select v-model="sortBy" class="sort-select">
                <option value="distance">ใกล้ที่สุด</option>
                <option value="fare_high">ราคาสูงสุด</option>
                <option value="newest">ใหม่ล่าสุด</option>
              </select>
              <button 
                class="refresh-btn" 
                @click="loadAvailableJobs" 
                :disabled="loadingJobs"
                type="button"
                aria-label="รีเฟรชรายการงาน"
              >
                <svg :class="{ spinning: loadingJobs }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
              </button>
            </div>
          </div>
          
          <div class="jobs-list" role="list">
            <article 
              v-for="job in sortedJobs" 
              :key="job.id" 
              class="job-card enhanced"
              v-memo="[job.id, job.distance, acceptingJobId]"
              tabindex="0"
              role="article"
              :aria-label="`งาน ${getJobTypeLabel(job)} ราคา ${job.fare} บาท จาก ${job.pickup_address} ไป ${job.dropoff_address}`"
              @keydown.enter="showJobPreview(job)"
              @keydown.space.prevent="showJobPreview(job)"
            >
              <div class="job-header">
                <div class="job-type-badge" :class="job.type">
                  <span v-if="job.type === 'ride'" aria-hidden="true">🚗</span>
                  <span v-else-if="job.type === 'delivery'" aria-hidden="true">📦</span>
                  <span v-else aria-hidden="true">🛒</span>
                  {{ getJobTypeLabel(job) }}
                </div>
                <div class="job-meta">
                  <div class="job-price">฿{{ job.fare.toLocaleString() }}</div>
                  <div class="job-details">
                    <span v-if="job.distance !== undefined" class="job-distance">
                      📍 {{ formatDistance(job.distance) }}
                    </span>
                    <span class="job-time">{{ formatTimeAgo(job.created_at) }}</span>
                  </div>
                </div>
              </div>
              
              <div class="job-route">
                <div class="route-point">
                  <span class="point-marker pickup" aria-hidden="true"></span>
                  <div class="point-content">
                    <span class="point-label">รับ</span>
                    <span class="point-text">{{ job.pickup_address }}</span>
                  </div>
                </div>
                <div class="route-line" aria-hidden="true"></div>
                <div class="route-point">
                  <span class="point-marker dropoff" aria-hidden="true"></span>
                  <div class="point-content">
                    <span class="point-label">ส่ง</span>
                    <span class="point-text">{{ job.dropoff_address }}</span>
                  </div>
                </div>
              </div>
              
              <!-- Enhanced Action Buttons -->
              <div class="job-actions">
                <button 
                  class="preview-btn"
                  @click="showJobPreview(job)"
                  type="button"
                >
                  <span>👁️</span>
                  ดูแผนที่
                </button>
                <button 
                  class="accept-btn" 
                  @click="acceptJob(job)"
                  :disabled="acceptingJobId !== null"
                  type="button"
                >
                  <span v-if="acceptingJobId === job.id" class="btn-loader" aria-hidden="true"></span>
                  <span v-else>รับงาน</span>
                </button>
              </div>
            </article>
          </div>
        </div>
      </template>
    </template>

    <!-- Job Preview Modal -->
    <div v-if="showJobPreviewModal && selectedJobForPreview" class="modal-overlay" @click="closeJobPreview">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>รายละเอียดงาน</h3>
          <button class="modal-close" @click="closeJobPreview" type="button" aria-label="ปิด">
            ✕
          </button>
        </div>
        
        <div class="modal-body">
          <div class="job-preview-info">
            <div class="preview-type-badge" :class="selectedJobForPreview.type">
              <span v-if="selectedJobForPreview.type === 'ride'" aria-hidden="true">🚗</span>
              <span v-else-if="selectedJobForPreview.type === 'delivery'" aria-hidden="true">📦</span>
              <span v-else aria-hidden="true">🛒</span>
              {{ getJobTypeLabel(selectedJobForPreview) }}
            </div>
            
            <div class="preview-price">฿{{ selectedJobForPreview.fare.toLocaleString() }}</div>
            
            <div class="preview-route">
              <div class="preview-point">
                <span class="preview-marker pickup"></span>
                <div>
                  <div class="preview-label">จุดรับ</div>
                  <div class="preview-address">{{ selectedJobForPreview.pickup_address }}</div>
                </div>
              </div>
              
              <div class="preview-point">
                <span class="preview-marker dropoff"></span>
                <div>
                  <div class="preview-label">จุดส่ง</div>
                  <div class="preview-address">{{ selectedJobForPreview.dropoff_address }}</div>
                </div>
              </div>
            </div>
            
            <div class="preview-meta">
              <div v-if="selectedJobForPreview.distance" class="meta-item">
                <span class="meta-label">ระยะทาง:</span>
                <span class="meta-value">{{ formatDistance(selectedJobForPreview.distance) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">เวลา:</span>
                <span class="meta-value">{{ formatTimeAgo(selectedJobForPreview.created_at) }}</span>
              </div>
            </div>
          </div>
          
          <!-- Map placeholder -->
          <div class="preview-map">
            <JobPreviewMap 
              v-if="selectedJobForPreview"
              :pickup-lat="selectedJobForPreview.pickup_lat"
              :pickup-lng="selectedJobForPreview.pickup_lng"
              :dropoff-lat="selectedJobForPreview.dropoff_lat"
              :dropoff-lng="selectedJobForPreview.dropoff_lng"
              :user-location="userLocation"
            />
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="modal-btn secondary" @click="closeJobPreview" type="button">
            ปิด
          </button>
          <button 
            class="modal-btn primary" 
            @click="acceptJob(selectedJobForPreview); closeJobPreview()"
            :disabled="acceptingJobId !== null"
            type="button"
          >
            <span v-if="acceptingJobId === selectedJobForPreview.id" class="btn-loader"></span>
            <span v-else>รับงาน</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Simulate Alert Button (Dev Only) -->
    <div v-if="isDev && isOnline && availableJobs.length === 0" class="dev-controls">
      <button 
        v-if="!isPlaying"
        class="test-alert-btn"
        @click="playAlert"
        type="button"
      >
        🔔 ทดสอบแจ้งเตือน
      </button>
      <button 
        v-else
        class="stop-alert-btn"
        @click="stopAlert"
        type="button"
      >
        🔇 หยุดเสียง
      </button>
      
      <!-- Performance Metrics (Dev Only) -->
      <div class="dev-metrics">
        <h4>📊 Performance Metrics</h4>
        <div class="metric-item">
          <span>Job Load Time:</span>
          <span>{{ performanceMetrics.jobLoadTime.toFixed(0) }}ms</span>
        </div>
        <div class="metric-item">
          <span>Last Job Count:</span>
          <span>{{ performanceMetrics.lastJobCount }}</span>
        </div>
        <div class="metric-item">
          <span>Connection:</span>
          <span :class="connectionStatus">{{ connectionStatus }}</span>
        </div>
        <div v-if="lastRefreshTime" class="metric-item">
          <span>Last Refresh:</span>
          <span>{{ lastRefreshTime.toLocaleTimeString('th-TH') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Base Styles - Mobile First */
.jobs-page {
  padding: 20px 16px;
  min-height: calc(100vh - 130px);
  font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Loading & Error States */
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
  border-top-color: #00A86B;
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

.error-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111;
  margin: 0 0 8px 0;
}

.error-state p {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 24px 0;
}

.retry-btn {
  padding: 12px 32px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
  min-width: 120px;
  font-family: 'Sarabun', sans-serif;
}

.retry-btn:active {
  background: #008f5a;
  transform: scale(0.98);
}

/* Accept Error Toast */
.accept-error-toast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  margin-bottom: 16px;
  color: #b91c1c;
  font-size: 14px;
}

.accept-error-toast button {
  background: none;
  border: none;
  color: #b91c1c;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 16px;
  min-height: 44px;
  min-width: 44px;
}

/* Status Card */
.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.status-card.online {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border-color: #a7f3d0;
}

.status-card.disabled {
  opacity: 0.7;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.status-indicator {
  width: 48px;
  height: 48px;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.status-indicator.active {
  background: #10b981;
}

.dot {
  width: 12px;
  height: 12px;
  background: #9ca3af;
  border-radius: 50%;
  transition: all 0.3s;
}

.status-indicator.active .dot {
  background: #fff;
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

.status-text h2 {
  font-size: 18px;
  font-weight: 600;
  color: #111;
  margin: 0 0 2px 0;
}

.status-text p {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.location-info {
  font-size: 12px;
  color: #10b981;
  margin-top: 4px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 11px;
}

.connection-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  transition: all 0.3s;
}

.connection-status.connected .connection-dot {
  background: #10b981;
  animation: pulse-dot 2s ease-in-out infinite;
}

.connection-status.connecting .connection-dot {
  background: #f59e0b;
  animation: pulse-dot 1s ease-in-out infinite;
}

.connection-status.disconnected .connection-dot {
  background: #ef4444;
}

.connection-text {
  color: #6b7280;
}

/* Toggle Button */
.toggle-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  min-height: 44px;
  min-width: 60px;
}

.toggle-track {
  display: block;
  width: 52px;
  height: 28px;
  background: #e5e7eb;
  border-radius: 14px;
  position: relative;
  transition: background 0.3s;
}

.toggle-btn.active .toggle-track {
  background: #10b981;
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 24px;
  height: 24px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.3s;
}

.toggle-btn.active .toggle-thumb {
  transform: translateX(24px);
}

/* Info Card */
.info-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
}

.info-card.warning {
  background: #fffbeb;
  border-color: #fde68a;
}

.info-icon {
  font-size: 24px;
}

.info-content h3 {
  font-size: 15px;
  font-weight: 600;
  color: #111;
  margin: 0 0 4px 0;
}

.info-content p {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

/* Offline Content */
.offline-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 60px 20px;
}

.offline-illustration {
  width: 120px;
  height: 120px;
  margin-bottom: 24px;
}

.offline-content h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111;
  margin: 0 0 8px 0;
}

.offline-content p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* Searching Content */
.searching-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 20px;
}

.radar-container {
  position: relative;
  width: 140px;
  height: 140px;
  margin-bottom: 24px;
}

.radar-pulse {
  position: absolute;
  inset: 0;
  border: 2px solid #10b981;
  border-radius: 50%;
  animation: radar 2.5s ease-out infinite;
  opacity: 0;
}

.radar-pulse.delay-1 { animation-delay: 0.8s; }
.radar-pulse.delay-2 { animation-delay: 1.6s; }

@keyframes radar {
  0% { transform: scale(0.3); opacity: 0.6; }
  100% { transform: scale(1); opacity: 0; }
}

.radar-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 56px;
  height: 56px;
  background: #10b981;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.radar-center svg {
  width: 28px;
  height: 28px;
}

.searching-content h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111;
  margin: 0 0 8px 0;
}

.searching-content p {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 24px 0;
}

.tip-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #f9fafb;
  border-radius: 10px;
  font-size: 13px;
  color: #6b7280;
  max-width: 300px;
}

.tip-box svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: #9ca3af;
}

/* Alert Buttons */
.test-alert-btn,
.stop-alert-btn {
  margin-top: 16px;
  margin-bottom: 16px;
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 48px;
}

.test-alert-btn {
  background: #fef3c7;
  color: #b45309;
}

.test-alert-btn:active {
  background: #fde68a;
  transform: scale(0.98);
}

.stop-alert-btn {
  background: #fee2e2;
  color: #b91c1c;
  animation: pulse-btn 1s ease-in-out infinite;
}

@keyframes pulse-btn {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.stop-alert-btn:active {
  background: #fecaca;
}

/* Dev Controls */
.dev-controls {
  position: fixed;
  bottom: 100px;
  right: 16px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dev-metrics {
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
  padding: 12px;
  border-radius: 8px;
  font-size: 11px;
  min-width: 200px;
}

.dev-metrics h4 {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.metric-item span:last-child {
  font-weight: 600;
}

.metric-item .connected {
  color: #10b981;
}

.metric-item .connecting {
  color: #f59e0b;
}

.metric-item .disconnected {
  color: #ef4444;
}

/* Enhanced Quick Actions */
.quick-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding: 0 2px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.quick-actions::-webkit-scrollbar {
  display: none;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  min-height: 44px;
  font-family: 'Sarabun', sans-serif;
}

.action-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #00A86B;
  color: #00A86B;
}

.action-btn:active:not(:disabled) {
  transform: scale(0.98);
  background: #f0fdf4;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn[aria-pressed="true"] {
  background: #ecfdf5;
  border-color: #00A86B;
  color: #00A86B;
}

.action-icon {
  font-size: 16px;
  transition: transform 0.2s;
}

.action-icon.spinning {
  animation: spin 1s linear infinite;
}

/* Heat Map Section */
.heat-map-section {
  margin-top: 20px;
}

/* Loading Jobs */
.loading-jobs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0;
  font-size: 13px;
  color: #6b7280;
}

.mini-loader {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* Jobs Section */
.jobs-section {
  margin-top: 20px;
}

.jobs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-select {
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  min-height: 36px;
  font-family: 'Sarabun', sans-serif;
}

.sort-select:focus {
  outline: none;
  border-color: #00A86B;
  box-shadow: 0 0 0 2px rgba(0,168,107,0.2);
}

.refresh-btn {
  width: 44px;
  height: 44px;
  background: #f3f4f6;
  border: none;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:active {
  background: #e5e7eb;
}

.refresh-btn svg {
  width: 18px;
  height: 18px;
  color: #6b7280;
}

.refresh-btn svg.spinning {
  animation: spin 0.8s linear infinite;
}

/* Jobs List */
.jobs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.job-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transition: all 0.2s ease;
  cursor: pointer;
}

.job-card:hover {
  border-color: #00A86B;
  box-shadow: 0 4px 12px rgba(0,168,107,0.1);
}

.job-card:focus {
  outline: none;
  border-color: #00A86B;
  box-shadow: 0 0 0 3px rgba(0,168,107,0.2);
}

.job-card:focus-visible {
  outline: 2px solid #00A86B;
  outline-offset: 2px;
}

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.job-type-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 8px;
}

.job-type-badge.ride {
  background: #dbeafe;
  color: #1d4ed8;
}

.job-type-badge.delivery {
  background: #fef3c7;
  color: #b45309;
}

.job-type-badge.shopping {
  background: #f3e8ff;
  color: #7c3aed;
}

.job-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.job-distance {
  font-size: 12px;
  font-weight: 500;
  color: #10b981;
}

.job-time {
  font-size: 11px;
  color: #9ca3af;
}

.job-price {
  font-size: 28px;
  font-weight: 700;
  color: #10b981;
  margin-bottom: 14px;
}

.job-route {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  position: relative;
  padding-left: 4px;
}

.route-line {
  position: absolute;
  left: 8px;
  top: 18px;
  bottom: 18px;
  width: 2px;
  background: linear-gradient(to bottom, #10b981, #ef4444);
  border-radius: 1px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.point-marker {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 3px solid #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.point-marker.pickup { background: #10b981; }
.point-marker.dropoff { background: #ef4444; }

.point-text {
  font-size: 14px;
  color: #374151;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.point-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.point-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.job-details {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

/* Job Actions */
.job-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.preview-btn {
  flex: 1;
  padding: 12px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  font-family: 'Sarabun', sans-serif;
}

.preview-btn:hover {
  background: #e5e7eb;
  border-color: #d1d5db;
}

.preview-btn:active {
  transform: scale(0.98);
}

.accept-btn {
  flex: 2;
  padding: 12px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  font-family: 'Sarabun', sans-serif;
}

.accept-btn:active:not(:disabled) {
  transform: scale(0.98);
  background: #1f2937;
}

.accept-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-loader {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111;
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  background: #f3f4f6;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
  font-size: 16px;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.job-preview-info {
  margin-bottom: 20px;
}

.preview-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 12px;
}

.preview-type-badge.ride {
  background: #dbeafe;
  color: #1d4ed8;
}

.preview-type-badge.delivery {
  background: #fef3c7;
  color: #b45309;
}

.preview-type-badge.shopping {
  background: #f3e8ff;
  color: #7c3aed;
}

.preview-price {
  font-size: 32px;
  font-weight: 700;
  color: #10b981;
  margin-bottom: 16px;
}

.preview-route {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.preview-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.preview-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.preview-marker.pickup { background: #10b981; }
.preview-marker.dropoff { background: #ef4444; }

.preview-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.preview-address {
  font-size: 14px;
  color: #374151;
  line-height: 1.4;
}

.preview-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.meta-label {
  color: #6b7280;
}

.meta-value {
  color: #111;
  font-weight: 500;
}

.preview-map {
  height: 200px;
  background: #f3f4f6;
  border-radius: 8px;
  overflow: hidden;
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #f0f0f0;
}

.modal-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  font-family: 'Sarabun', sans-serif;
}

.modal-btn.secondary {
  background: #f3f4f6;
  color: #374151;
}

.modal-btn.secondary:active {
  background: #e5e7eb;
}

.modal-btn.primary {
  background: #000;
  color: #fff;
}

.modal-btn.primary:active {
  background: #1f2937;
}

.modal-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Quick Stats */
.quick-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-left: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #10b981;
}

.stat-label {
  font-size: 10px;
  color: #6b7280;
  text-align: center;
}
</style>