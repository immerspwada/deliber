/**
 * Provider Job Detail Composable - Enhanced Production Version
 * 
 * Features:
 * - Type-safe job management
 * - Performance optimized queries
 * - Comprehensive error handling
 * - Real-time updates
 * - Location tracking integration
 * - Photo evidence management
 * 
 * Role Impact:
 * - Provider: Full job detail access and management
 * - Customer: No direct access (RLS protected)
 * - Admin: Monitor via separate admin tools
 */

import { ref, computed, onUnmounted, shallowRef, readonly as vueReadonly } from 'vue'
import { supabase } from '../lib/supabase'
import { useErrorHandler } from './useErrorHandler'
import { useRoleAccess } from './useRoleAccess'
import { useJobAlert } from './useJobAlert'
import { useURLTracking } from './useURLTracking'
import { measureAsync } from '../utils/performance'
import { 
  type JobDetail, 
  type RideRequestRow, 
  type UserProfile,
  type RideStatus,
  type UpdateStatusResponse,
  type CancelJobResponse,
  JobIdSchema,
  CancelReasonSchema,
  STATUS_FLOW,
  getNextStatus,
  canUpdateStatus,
  isCompleted,
  isCancelled
} from '../types/ride-requests'
import { ErrorCode, createAppError, handleSupabaseError } from '../utils/errorHandler'

interface UseProviderJobDetailOptions {
  enableRealtime?: boolean
  enableLocationTracking?: boolean
  cacheTimeout?: number
}

const DEFAULT_OPTIONS: Required<UseProviderJobDetailOptions> = {
  enableRealtime: true,
  enableLocationTracking: true,
  cacheTimeout: 5 * 60 * 1000 // 5 minutes
}

export function useProviderJobDetail(options: UseProviderJobDetailOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const { handleError, clearError } = useErrorHandler()
  const { providerId } = useRoleAccess()
  const { quickBeep, quickVibrate } = useJobAlert()
  const { updateStep } = useURLTracking()

  // =====================================================
  // STATE MANAGEMENT
  // =====================================================

  const job = shallowRef<JobDetail | null>(null)
  const loading = ref(false)
  const updating = ref(false)
  const error = ref<string | null>(null)
  
  // Realtime subscription
  let realtimeChannel: ReturnType<typeof supabase.channel> | null = null
  
  // Cache for performance
  const cache = new Map<string, { data: JobDetail; expires: number }>()

  // =====================================================
  // COMPUTED PROPERTIES
  // =====================================================

  const currentStatusIndex = computed(() => {
    if (!job.value) return -1
    return STATUS_FLOW.findIndex(s => s.key === job.value!.status)
  })

  const nextStatus = computed(() => {
    if (!job.value) return null
    return getNextStatus(job.value.status)
  })

  const canUpdate = computed(() => {
    return job.value ? canUpdateStatus(job.value.status) && !updating.value : false
  })

  const isJobCompleted = computed(() => {
    return job.value ? isCompleted(job.value.status) : false
  })

  const isJobCancelled = computed(() => {
    return job.value ? isCancelled(job.value.status) : false
  })

  const showPickupPhoto = computed(() => {
    if (!job.value) return false
    return ['pickup', 'in_progress', 'completed'].includes(job.value.status)
  })

  const showDropoffPhoto = computed(() => {
    if (!job.value) return false
    return ['in_progress', 'completed'].includes(job.value.status)
  })

  // =====================================================
  // CORE METHODS
  // =====================================================

  /**
   * Load job details with caching and error handling
   */
  async function loadJob(jobId: string): Promise<JobDetail | null> {
    // Validate job ID
    const validation = JobIdSchema.safeParse(jobId)
    if (!validation.success) {
      error.value = 'รหัสงานไม่ถูกต้อง'
      return null
    }

    // Check cache first
    const cached = cache.get(jobId)
    if (cached && cached.expires > Date.now()) {
      job.value = cached.data
      return cached.data
    }

    // Note: Provider access check removed here - router already validates access
    // The RLS policies on ride_requests table will enforce provider ownership

    loading.value = true
    error.value = null
    clearError()

    try {
      // Wait for provider ID to be loaded (race condition fix)
      // The useRoleAccess composable loads providerId asynchronously in onMounted
      // We need to wait for it to complete before querying
      let currentProviderId = providerId.value
      if (!currentProviderId) {
        console.log('[JobDetail] Provider ID not loaded yet, waiting...')
        // Wait up to 3 seconds for provider ID to load
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 100))
          currentProviderId = providerId.value
          if (currentProviderId) {
            console.log('[JobDetail] Provider ID loaded:', currentProviderId)
            break
          }
        }
        
        // If still no provider ID, try to fetch it directly
        if (!currentProviderId) {
          console.log('[JobDetail] Fetching provider ID directly...')
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: providerData } = await supabase
              .from('providers_v2')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle() as { data: { id: string } | null }
            
            if (providerData?.id) {
              currentProviderId = providerData.id
              console.log('[JobDetail] Provider ID fetched:', currentProviderId)
            }
          }
        }
      }
      
      const result = await measureAsync('LoadProviderJob', async () => {
        console.log('[JobDetail] Loading job:', jobId, 'Provider ID:', currentProviderId)
        
        // Load ride request data - use any to bypass strict typing issues with generated types
        // Query base columns first (columns that exist in production)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rideData, error: rideError } = await (supabase
          .from('ride_requests') as any)
          .select(`
            id, status, ride_type, pickup_address, destination_address,
            pickup_lat, pickup_lng, destination_lat, destination_lng,
            estimated_fare, final_fare, notes, created_at, user_id, provider_id,
            pickup_photo, dropoff_photo
          `)
          .eq('id', jobId)
          .single()

        console.log('[JobDetail] Query result:', { data: rideData, error: rideError })

        if (rideError) {
          throw handleSupabaseError(rideError, 'LoadRideRequest')
        }

        if (!rideData) {
          throw createAppError(ErrorCode.NOT_FOUND, 'Job not found', { jobId })
        }

        // Verify provider ownership (only if provider_id is set on the job)
        // Note: For 'matched' status, provider_id might not be set yet
        // RLS policies will handle access control at database level
        if (rideData.provider_id && providerId.value && rideData.provider_id !== providerId.value) {
          console.warn('[JobDetail] Provider ID mismatch:', {
            jobProviderId: rideData.provider_id,
            currentProviderId: providerId.value
          })
          throw createAppError(ErrorCode.PERMISSION_DENIED, 'Not authorized to view this job')
        }

        // Load customer profile (optional, with fallback)
        let customerProfile: UserProfile | null = null
        if (rideData.user_id) {
          try {
            const { data: profileData } = await supabase
              .from('users')
              .select('id, name, phone, avatar_url')
              .eq('id', rideData.user_id)
              .maybeSingle()
            
            customerProfile = profileData
          } catch (profileError) {
            console.warn('[JobDetail] Customer profile fetch failed:', profileError)
            // Continue without customer profile
          }
        }

        // Transform to JobDetail format
        // Note: promo_code, promo_discount, tip_amount, tip_message columns 
        // may not exist in production yet - use optional chaining
        const jobDetail: JobDetail = {
          id: rideData.id,
          type: 'ride',
          status: rideData.status as RideStatus,
          service_type: rideData.ride_type || 'standard',
          pickup_address: rideData.pickup_address || '',
          pickup_lat: rideData.pickup_lat || 0,
          pickup_lng: rideData.pickup_lng || 0,
          dropoff_address: rideData.destination_address || '',
          dropoff_lat: rideData.destination_lat || 0,
          dropoff_lng: rideData.destination_lng || 0,
          fare: rideData.final_fare || rideData.estimated_fare || 0,
          notes: rideData.notes || undefined,
          created_at: rideData.created_at,
          pickup_photo: rideData.pickup_photo,
          dropoff_photo: rideData.dropoff_photo,
          customer: customerProfile ? {
            id: customerProfile.id,
            name: customerProfile.name || 'ลูกค้า',
            phone: customerProfile.phone || '',
            avatar_url: customerProfile.avatar_url || undefined
          } : null,
          // Promo & Pricing (columns may not exist yet)
          estimated_fare: rideData.estimated_fare || 0,
          final_fare: rideData.final_fare,
          promo_code: rideData.promo_code ?? null,
          promo_discount: rideData.promo_discount ?? null,
          // Tip (columns may not exist yet)
          tip_amount: rideData.tip_amount ?? null,
          tip_message: rideData.tip_message ?? null
        }

        return jobDetail
      })

      if (result) {
        job.value = result
        
        // Cache the result
        cache.set(jobId, {
          data: result,
          expires: Date.now() + config.cacheTimeout
        })

        // Setup realtime subscription
        if (config.enableRealtime) {
          setupRealtimeSubscription(jobId)
        }

        return result
      }

      return null

    } catch (err) {
      handleError(err, 'LoadProviderJob')
      
      // Provide more specific error messages
      const appErr = err as { code?: string }
      if (appErr.code === 'NOT_FOUND' || appErr.code === 'PGRST116') {
        error.value = 'ไม่พบงานนี้ หรือคุณไม่มีสิทธิ์เข้าถึง'
      } else if (appErr.code === 'PERMISSION_DENIED') {
        error.value = 'คุณไม่มีสิทธิ์เข้าถึงงานนี้'
      } else {
        error.value = 'ไม่สามารถโหลดข้อมูลงานได้'
      }
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Update job status with validation and timestamps
   */
  async function updateStatus(): Promise<UpdateStatusResponse> {
    if (!job.value || !nextStatus.value || updating.value) {
      return { success: false, error: 'ไม่สามารถอัพเดทสถานะได้' }
    }

    updating.value = true
    
    try {
      const result = await measureAsync('UpdateJobStatus', async () => {
        const newStatus = nextStatus.value!.key
        
        // Build update object with appropriate timestamps
        const updateData: Partial<RideRequestRow> = { 
          status: newStatus,
          updated_at: new Date().toISOString()
        }
        
        // Add status-specific timestamps
        switch (newStatus) {
          case 'pickup':
            updateData.arrived_at = new Date().toISOString()
            break
          case 'in_progress':
            updateData.started_at = new Date().toISOString()
            break
          case 'completed':
            updateData.completed_at = new Date().toISOString()
            break
        }
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase
          .from('ride_requests') as any)
          .update(updateData)
          .eq('id', job.value!.id)

        if (updateError) {
          throw handleSupabaseError(updateError, 'UpdateJobStatus')
        }

        return newStatus
      })

      if (result) {
        // Update local state
        job.value!.status = result
        
        // Update URL with new step (standardized)
        // Convert database status format (in_progress) to URL format (in-progress)
        const urlStep = result.replace(/_/g, '-')
        updateStep(urlStep as any, 'provider_job')
        
        // Clear cache to force refresh
        cache.delete(job.value!.id)
        
        // Provide feedback
        quickBeep()
        quickVibrate()

        // Handle completion
        if (result === 'completed') {
          await handleJobCompletion()
        }

        return { success: true, newStatus: result }
      }

      return { success: false, error: 'อัพเดทสถานะไม่สำเร็จ' }

    } catch (err) {
      handleError(err, 'UpdateJobStatus')
      return { success: false, error: 'เกิดข้อผิดพลาดในการอัพเดทสถานะ' }
    } finally {
      updating.value = false
    }
  }

  /**
   * Cancel job with reason validation
   */
  async function cancelJob(reason?: string): Promise<CancelJobResponse> {
    if (!job.value || updating.value) {
      return { success: false, error: 'ไม่สามารถยกเลิกงานได้' }
    }

    // Validate cancel reason
    const reasonValidation = CancelReasonSchema.safeParse(reason)
    if (!reasonValidation.success) {
      return { 
        success: false, 
        error: reasonValidation.error.issues[0]?.message || 'เหตุผลไม่ถูกต้อง' 
      }
    }

    updating.value = true

    try {
      await measureAsync('CancelJob', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase
          .from('ride_requests') as any)
          .update({ 
            status: 'cancelled',
            cancellation_reason: reason || 'ยกเลิกโดยคนขับ',
            cancelled_by: 'provider',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.value!.id)

        if (updateError) {
          throw handleSupabaseError(updateError, 'CancelJob')
        }
      })

      // Update local state
      job.value!.status = 'cancelled'
      
      // Clear cache
      cache.delete(job.value!.id)

      return { success: true }

    } catch (err) {
      handleError(err, 'CancelJob')
      return { success: false, error: 'ไม่สามารถยกเลิกงานได้' }
    } finally {
      updating.value = false
    }
  }

  /**
   * Handle photo evidence upload
   */
  function handlePhotoUploaded(type: 'pickup' | 'dropoff', url: string): void {
    if (job.value) {
      if (type === 'pickup') {
        job.value.pickup_photo = url
      } else {
        job.value.dropoff_photo = url
      }
      
      // Clear cache to ensure fresh data on next load
      cache.delete(job.value.id)
    }
  }

  // =====================================================
  // PRIVATE METHODS
  // =====================================================

  /**
   * Setup realtime subscription for job updates
   */
  function setupRealtimeSubscription(jobId: string): void {
    cleanupRealtimeSubscription()

    realtimeChannel = supabase
      .channel(`job-detail-${jobId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ride_requests',
        filter: `id=eq.${jobId}`
      }, (payload) => {
        if (job.value && payload.new) {
          const newData = payload.new as Partial<RideRequestRow>
          
          // Update relevant fields
          if (newData.status) {
            job.value.status = newData.status as RideStatus
          }
          if (newData.final_fare !== undefined) {
            job.value.fare = newData.final_fare || job.value.fare
          }
          
          // Clear cache to ensure consistency
          cache.delete(jobId)
        }
      })
      .subscribe()
  }

  /**
   * Handle job completion notifications
   */
  async function handleJobCompletion(): Promise<void> {
    if (!job.value) return

    try {
      // Notify customer for review via realtime broadcast
      await supabase.channel(`ride-${job.value.id}`).send({
        type: 'broadcast',
        event: 'ride_completed',
        payload: {
          ride_id: job.value.id,
          provider_id: providerId.value,
          fare: job.value.fare,
          completed_at: new Date().toISOString()
        }
      })
    } catch (e) {
      console.warn('[JobDetail] Failed to send completion broadcast:', e)
    }
  }

  /**
   * Cleanup realtime subscription
   */
  function cleanupRealtimeSubscription(): void {
    if (realtimeChannel) {
      realtimeChannel.unsubscribe()
      realtimeChannel = null
    }
  }

  /**
   * Clear cache entry
   */
  function clearCache(jobId?: string): void {
    if (jobId) {
      cache.delete(jobId)
    } else {
      cache.clear()
    }
  }

  // =====================================================
  // LIFECYCLE
  // =====================================================

  onUnmounted(() => {
    cleanupRealtimeSubscription()
    cache.clear()
  })

  // =====================================================
  // RETURN API
  // =====================================================

  return {
    // State
    job: vueReadonly(job),
    loading: vueReadonly(loading),
    updating: vueReadonly(updating),
    error: vueReadonly(error),
    
    // Computed
    currentStatusIndex: vueReadonly(currentStatusIndex),
    nextStatus: vueReadonly(nextStatus),
    canUpdate: vueReadonly(canUpdate),
    isJobCompleted: vueReadonly(isJobCompleted),
    isJobCancelled: vueReadonly(isJobCancelled),
    showPickupPhoto: vueReadonly(showPickupPhoto),
    showDropoffPhoto: vueReadonly(showDropoffPhoto),
    
    // Methods
    loadJob,
    updateStatus,
    cancelJob,
    handlePhotoUploaded,
    clearCache,
    
    // Utils
    STATUS_FLOW
  }
}

