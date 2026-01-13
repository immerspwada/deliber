/**
 * useProviderJobPoolEnhanced - Enhanced Provider Job Pool with Fallback
 * รวม Error Handling, Connection Health Check, และ Mock Mode
 */

import { ref, computed, watch, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { useConnectionHealth } from './useConnectionHealth'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type ServiceType = 'ride' | 'delivery' | 'shopping'
export type RequestStatus = 'pending' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'

export interface JobRequest {
  id: string
  tracking_id: string
  user_id: string
  status: RequestStatus
  estimated_fare: number
  pickup_lat: number | null
  pickup_lng: number | null
  pickup_address: string | null
  destination_lat: number | null
  destination_lng: number | null
  destination_address: string | null
  created_at: string
  type: ServiceType
  distance?: number
  customer?: CustomerInfo
  isMock?: boolean
  [key: string]: any
}

export interface CustomerInfo {
  id: string
  first_name: string
  last_name: string
  phone_number: string
}

export interface AcceptResult {
  success: boolean
  requestId?: string
  error?: string
  isMock?: boolean
}

// Mock data for fallback mode
const MOCK_JOBS: JobRequest[] = [
  {
    id: 'mock-1',
    tracking_id: 'MOCK-001',
    user_id: 'customer-1',
    status: 'pending',
    pickup_lat: 13.7563,
    pickup_lng: 100.5018,
    pickup_address: 'สยามพารากอน กรุงเทพฯ',
    destination_lat: 13.7467,
    destination_lng: 100.5342,
    destination_address: 'เซ็นทรัลเวิลด์ กรุงเทพฯ',
    estimated_fare: 150,
    created_at: new Date().toISOString(),
    type: 'ride',
    distance: 1.2,
    isMock: true,
    customer: {
      id: 'customer-1',
      first_name: 'สมชาย',
      last_name: 'ใจดี',
      phone_number: '081-234-5678'
    }
  },
  {
    id: 'mock-2',
    tracking_id: 'MOCK-002',
    user_id: 'customer-2',
    status: 'pending',
    pickup_lat: 13.7308,
    pickup_lng: 100.5418,
    pickup_address: 'ห้างสรรพสินค้าเอ็มบีเค',
    destination_lat: 13.7650,
    destination_lng: 100.5380,
    destination_address: 'สถานีรถไฟฟ้าชิดลม',
    estimated_fare: 120,
    created_at: new Date(Date.now() - 30000).toISOString(),
    type: 'ride',
    distance: 2.1,
    isMock: true,
    customer: {
      id: 'customer-2',
      first_name: 'สมหญิง',
      last_name: 'รักสะอาด',
      phone_number: '082-345-6789'
    }
  }
]

export function useProviderJobPoolEnhanced(serviceTypes: ServiceType[] = ['ride']) {
  const availableJobs = ref<JobRequest[]>([])
  const currentJob = ref<JobRequest | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const realtimeChannels = ref<RealtimeChannel[]>([])
  const providerLocation = ref<{ lat: number; lng: number } | null>(null)
  
  // Connection health monitoring
  const { 
    status: connectionStatus, 
    isHealthy, 
    shouldUseFallback,
    statusText,
    statusColor,
    forceReconnect
  } = useConnectionHealth()

  // Mock job generator
  let mockJobCounter = 3
  let mockJobInterval: ReturnType<typeof setInterval> | null = null

  // Computed
  const hasCurrentJob = computed(() => currentJob.value !== null)
  const jobCount = computed(() => availableJobs.value.length)
  const sortedJobs = computed(() => 
    [...availableJobs.value].sort((a, b) => (a.distance || 999) - (b.distance || 999))
  )
  
  const isInFallbackMode = computed(() => shouldUseFallback.value)
  
  const connectionInfo = computed(() => ({
    status: connectionStatus.value,
    statusText: statusText.value,
    statusColor: statusColor.value,
    isHealthy: isHealthy.value,
    jobCount: jobCount.value,
    fallbackMode: isInFallbackMode.value
  }))

  // Watch connection status changes
  watch(shouldUseFallback, (useFallback) => {
    if (useFallback) {
      console.log('[JobPool] 🔄 Switching to fallback mode')
      enableMockMode()
    } else {
      console.log('[JobPool] ✅ Switching to database mode')
      disableMockMode()
      loadAvailableJobs()
    }
  })

  // Calculate distance between two points
  function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Enable mock mode
  function enableMockMode(): void {
    console.log('[JobPool] 🎭 Enabling mock mode')
    
    // Load mock jobs
    availableJobs.value = [...MOCK_JOBS]
    
    // Start mock job generator
    if (!mockJobInterval) {
      mockJobInterval = setInterval(() => {
        if (Math.random() > 0.7) { // 30% chance every 15 seconds
          generateMockJob()
        }
      }, 15000)
    }
    
    // Clear any real-time subscriptions
    cleanup()
  }

  // Disable mock mode
  function disableMockMode(): void {
    console.log('[JobPool] 🔄 Disabling mock mode')
    
    // Stop mock job generator
    if (mockJobInterval) {
      clearInterval(mockJobInterval)
      mockJobInterval = null
    }
    
    // Clear mock jobs
    availableJobs.value = availableJobs.value.filter(job => !job.isMock)
  }

  // Generate mock job
  function generateMockJob(): void {
    mockJobCounter++
    
    const mockJob: JobRequest = {
      id: `mock-${mockJobCounter}`,
      tracking_id: `MOCK-${String(mockJobCounter).padStart(3, '0')}`,
      user_id: `customer-${mockJobCounter}`,
      status: 'pending',
      pickup_lat: 13.7563 + (Math.random() - 0.5) * 0.1,
      pickup_lng: 100.5018 + (Math.random() - 0.5) * 0.1,
      pickup_address: `สถานที่รับ ${mockJobCounter}`,
      destination_lat: 13.7467 + (Math.random() - 0.5) * 0.1,
      destination_lng: 100.5342 + (Math.random() - 0.5) * 0.1,
      destination_address: `สถานที่ส่ง ${mockJobCounter}`,
      estimated_fare: Math.floor(Math.random() * 200) + 100,
      created_at: new Date().toISOString(),
      type: 'ride',
      distance: Math.random() * 5 + 0.5,
      isMock: true,
      customer: {
        id: `customer-${mockJobCounter}`,
        first_name: `ลูกค้า${mockJobCounter}`,
        last_name: 'ทดสอบ',
        phone_number: `08${Math.floor(Math.random() * 10)}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`
      }
    }
    
    console.log('[JobPool] 🆕 Generated mock job:', mockJob.tracking_id)
    availableJobs.value.unshift(mockJob)
    
    // Keep only latest 10 jobs
    if (availableJobs.value.length > 10) {
      availableJobs.value.pop()
    }
    
    // Play notification sound
    playNotificationSound()
  }

  // Accept job (enhanced with fallback handling)
  async function acceptJob(requestId: string, requestType: ServiceType = 'ride'): Promise<AcceptResult> {
    isLoading.value = true
    error.value = null

    try {
      // Check if it's a mock job
      const job = availableJobs.value.find(j => j.id === requestId)
      if (job?.isMock) {
        console.log('[JobPool] 🎭 Accepting mock job:', requestId)
        
        // Simulate acceptance
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Remove from available jobs
        availableJobs.value = availableJobs.value.filter(j => j.id !== requestId)
        
        // Set as current job
        currentJob.value = { ...job, status: 'accepted' }
        
        return { success: true, requestId, isMock: true }
      }

      // Real job acceptance (only if connected)
      if (!isHealthy.value) {
        throw new Error('ไม่สามารถเชื่อมต่อฐานข้อมูลได้')
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return { success: false, error: 'AUTH_REQUIRED' }
      }

      // Get provider ID from providers_v2 table
      const { data: provider } = await supabase
        .from('providers_v2')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!provider) {
        error.value = 'ไม่พบข้อมูลผู้ให้บริการ'
        return { success: false, error: 'PROVIDER_NOT_FOUND' }
      }

      console.log('[JobPool] Accepting real job:', requestId, 'provider_id:', provider.id)

      // Update ride_requests table with race condition protection
      const { data: updatedRide, error: updateError } = await supabase
        .from('ride_requests')
        .update({
          provider_id: provider.id,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('status', 'pending')
        .is('provider_id', null)
        .select()
        .maybeSingle()

      if (updateError) {
        console.error('[JobPool] Accept job error:', updateError)
        error.value = 'ไม่สามารถรับงานได้'
        return { success: false, error: updateError.message }
      }

      if (!updatedRide) {
        console.log('[JobPool] Job already taken or not found')
        availableJobs.value = availableJobs.value.filter(j => j.id !== requestId)
        error.value = 'งานนี้ถูกรับไปแล้ว'
        return { success: false, error: 'ALREADY_ACCEPTED' }
      }

      console.log('[JobPool] ✓ Real job accepted successfully:', updatedRide)

      // Remove from available jobs
      availableJobs.value = availableJobs.value.filter(j => j.id !== requestId)

      // Set as current job
      currentJob.value = {
        ...updatedRide,
        type: requestType
      } as JobRequest

      // Subscribe to current job updates
      await subscribeToCurrentJob()

      return { success: true, requestId, isMock: false }

    } catch (err: any) {
      console.error('[JobPool] Accept job exception:', err)
      error.value = err.message || 'เกิดข้อผิดพลาด'
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  // Load available jobs (with fallback handling)
  async function loadAvailableJobs(): Promise<void> {
    if (shouldUseFallback.value) {
      console.log('[JobPool] 🎭 Loading mock jobs (fallback mode)')
      enableMockMode()
      return
    }

    isLoading.value = true
    error.value = null
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return
      }

      console.log('[JobPool] Loading available jobs for user:', user.id)

      // Get provider info
      const { data: provider } = await supabase
        .from('providers_v2')
        .select('id, current_lat, current_lng, status, is_online, is_available')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!provider) {
        error.value = 'ไม่พบข้อมูลผู้ให้บริการ'
        console.error('[JobPool] Provider profile not found for user:', user.id)
        return
      }

      if (provider.current_lat && provider.current_lng) {
        providerLocation.value = { 
          lat: provider.current_lat, 
          lng: provider.current_lng 
        }
      }

      // Load pending ride requests
      const { data: rides, error: ridesError } = await supabase
        .from('ride_requests')
        .select(`
          id,
          tracking_id,
          user_id,
          status,
          pickup_lat,
          pickup_lng,
          pickup_address,
          destination_lat,
          destination_lng,
          destination_address,
          estimated_fare,
          created_at
        `)
        .eq('status', 'pending')
        .is('provider_id', null)
        .order('created_at', { ascending: false })
        .limit(20)

      if (ridesError) {
        console.error('[JobPool] Load jobs error:', ridesError)
        error.value = `ไม่สามารถโหลดงานได้: ${ridesError.message}`
        
        // Switch to fallback mode on RLS error
        if (ridesError.message.includes('permission') || ridesError.message.includes('policy')) {
          console.log('[JobPool] 🔄 RLS error detected, switching to fallback mode')
          enableMockMode()
        }
        return
      }

      const jobs: JobRequest[] = []

      if (rides && rides.length > 0) {
        for (const ride of rides) {
          const jobWithType: JobRequest = { 
            ...ride, 
            type: 'ride',
            tracking_id: ride.tracking_id || ride.id,
            isMock: false
          }
          
          // Calculate distance if provider has location
          if (providerLocation.value && ride.pickup_lat && ride.pickup_lng) {
            jobWithType.distance = calculateDistance(
              providerLocation.value.lat,
              providerLocation.value.lng,
              ride.pickup_lat,
              ride.pickup_lng
            )
            
            // Only include jobs within 10km radius
            if (jobWithType.distance <= 10) {
              jobs.push(jobWithType)
            }
          } else {
            jobs.push(jobWithType)
          }
        }
      }

      availableJobs.value = jobs
      console.log('[JobPool] ✅ Loaded', jobs.length, 'real jobs')

    } catch (err: any) {
      console.error('[JobPool] loadAvailableJobs exception:', err)
      error.value = err.message || 'เกิดข้อผิดพลาดในการโหลดงาน'
      
      // Switch to fallback mode on error
      console.log('[JobPool] 🔄 Exception occurred, switching to fallback mode')
      enableMockMode()
    } finally {
      isLoading.value = false
    }
  }

  // Subscribe to new jobs (with error handling)
  async function subscribeToNewJobs(): Promise<void> {
    if (shouldUseFallback.value) {
      console.log('[JobPool] 🎭 Skipping realtime subscription (fallback mode)')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('[JobPool] User not authenticated')
        return
      }

      console.log('[JobPool] 📡 Subscribing to new jobs...')

      const channel = supabase
        .channel(`provider_jobs_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ride_requests',
            filter: 'status=eq.pending'
          },
          async (payload) => {
            const newJob = payload.new as any
            console.log('[JobPool] 🆕 New ride request detected:', newJob.tracking_id || newJob.id)

            if (newJob.provider_id) return

            // Calculate distance and add to available jobs
            let distance = 0
            if (providerLocation.value && newJob.pickup_lat && newJob.pickup_lng) {
              distance = calculateDistance(
                providerLocation.value.lat,
                providerLocation.value.lng,
                newJob.pickup_lat,
                newJob.pickup_lng
              )

              if (distance > 10) return
            }

            const jobRequest: JobRequest = {
              id: newJob.id,
              tracking_id: newJob.tracking_id || newJob.id,
              user_id: newJob.user_id,
              status: newJob.status,
              estimated_fare: newJob.estimated_fare || 0,
              pickup_lat: newJob.pickup_lat,
              pickup_lng: newJob.pickup_lng,
              pickup_address: newJob.pickup_address,
              destination_lat: newJob.destination_lat,
              destination_lng: newJob.destination_lng,
              destination_address: newJob.destination_address,
              created_at: newJob.created_at,
              type: 'ride',
              distance: distance,
              isMock: false
            }

            const exists = availableJobs.value.find(j => j.id === jobRequest.id)
            if (!exists) {
              availableJobs.value.push(jobRequest)
              console.log('[JobPool] ✅ Real job added:', jobRequest.tracking_id)
              playNotificationSound()
            }
          }
        )
        .subscribe((status) => {
          console.log('[JobPool] 📡 Realtime subscription status:', status)
          if (status === 'CHANNEL_ERROR') {
            console.warn('[JobPool] ⚠️ Realtime subscription failed, jobs may not update in real-time')
          }
        })

      realtimeChannels.value.push(channel)

    } catch (error) {
      console.error('[JobPool] Subscribe to new jobs failed:', error)
    }
  }

  // Subscribe to current job updates
  async function subscribeToCurrentJob(): Promise<void> {
    if (!currentJob.value || currentJob.value.isMock) return

    console.log('[JobPool] Subscribing to current job updates:', currentJob.value.id)
    
    const channel = supabase
      .channel(`provider_job:${currentJob.value.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
          filter: `id=eq.${currentJob.value.id}`
        },
        (payload) => {
          console.log('[JobPool] Job update received:', payload.new)
          if (currentJob.value) {
            currentJob.value = { 
              ...payload.new, 
              type: currentJob.value.type,
              customer: currentJob.value.customer,
              isMock: false
            } as JobRequest
          }
        }
      )
      .subscribe()

    realtimeChannels.value.push(channel)
  }

  // Play notification sound
  function playNotificationSound(): void {
    try {
      const audio = new Audio('/sounds/new-job.mp3')
      audio.play().catch(() => {})
    } catch {}
  }

  // Cleanup
  async function cleanup(): Promise<void> {
    for (const channel of realtimeChannels.value) {
      await supabase.removeChannel(channel)
    }
    realtimeChannels.value = []
    
    if (mockJobInterval) {
      clearInterval(mockJobInterval)
      mockJobInterval = null
    }
  }

  onUnmounted(() => cleanup())

  return {
    // State
    availableJobs,
    currentJob,
    isLoading,
    error,
    
    // Computed
    hasCurrentJob,
    jobCount,
    sortedJobs,
    isInFallbackMode,
    connectionInfo,
    
    // Methods
    acceptJob,
    loadAvailableJobs,
    subscribeToNewJobs,
    enableMockMode,
    disableMockMode,
    forceReconnect,
    cleanup
  }
}