/**
 * Provider Job Pool Fallback
 * ใช้เมื่อ database ไม่ทำงาน - ใช้ localStorage และ mock data
 */

import { ref, computed, onUnmounted } from 'vue'
import type { JobRequest, AcceptResult, CompleteResult } from './useProviderJobPool'

export function useProviderJobPoolFallback() {
  const availableJobs = ref<JobRequest[]>([])
  const currentJob = ref<JobRequest | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const hasCurrentJob = computed(() => currentJob.value !== null)
  const jobCount = computed(() => availableJobs.value.length)
  const sortedJobs = computed(() => 
    [...availableJobs.value].sort((a, b) => (a.distance || 999) - (b.distance || 999))
  )

  // Mock job data
  const mockJobs: JobRequest[] = [
    {
      id: 'mock-1',
      tracking_id: 'MOCK-001',
      user_id: 'customer-1',
      status: 'pending',
      estimated_fare: 120,
      pickup_lat: 13.7563,
      pickup_lng: 100.5018,
      pickup_address: 'สยามพารากอน',
      destination_lat: 13.7466,
      destination_lng: 100.5392,
      destination_address: 'เซ็นทรัลเวิลด์',
      created_at: new Date().toISOString(),
      type: 'ride',
      distance: 1.2
    },
    {
      id: 'mock-2',
      tracking_id: 'MOCK-002',
      user_id: 'customer-2',
      status: 'pending',
      estimated_fare: 85,
      pickup_lat: 13.7308,
      pickup_lng: 100.5695,
      pickup_address: 'อโศก',
      destination_lat: 13.7276,
      destination_lng: 100.5280,
      destination_address: 'สีลม',
      created_at: new Date(Date.now() - 60000).toISOString(),
      type: 'ride',
      distance: 2.8
    },
    {
      id: 'mock-3',
      tracking_id: 'MOCK-003',
      user_id: 'customer-3',
      status: 'pending',
      estimated_fare: 200,
      pickup_lat: 13.8117,
      pickup_lng: 100.5619,
      pickup_address: 'จตุจักร',
      destination_lat: 13.6900,
      destination_lng: 100.7501,
      destination_address: 'สุวรรณภูมิ',
      created_at: new Date(Date.now() - 120000).toISOString(),
      type: 'ride',
      distance: 8.5
    }
  ]

  // Load jobs from localStorage or use mock data
  function loadAvailableJobs(): Promise<void> {
    isLoading.value = true
    
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const stored = localStorage.getItem('provider-jobs-fallback')
          if (stored) {
            availableJobs.value = JSON.parse(stored)
          } else {
            // Use mock jobs
            availableJobs.value = [...mockJobs]
            localStorage.setItem('provider-jobs-fallback', JSON.stringify(mockJobs))
          }
          
          console.log('[Fallback] Loaded', availableJobs.value.length, 'jobs')
        } catch (err) {
          console.error('[Fallback] Load error:', err)
          availableJobs.value = [...mockJobs]
        } finally {
          isLoading.value = false
          resolve()
        }
      }, 500) // Simulate network delay
    })
  }

  // Accept job (mock implementation)
  async function acceptJob(requestId: string): Promise<AcceptResult> {
    isLoading.value = true
    error.value = null

    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const jobIndex = availableJobs.value.findIndex(j => j.id === requestId)
          if (jobIndex === -1) {
            resolve({ success: false, error: 'Job not found' })
            return
          }

          const job = availableJobs.value[jobIndex]
          
          // Remove from available jobs
          availableJobs.value.splice(jobIndex, 1)
          
          // Set as current job
          currentJob.value = { ...job, status: 'accepted' }
          
          // Update localStorage
          localStorage.setItem('provider-jobs-fallback', JSON.stringify(availableJobs.value))
          localStorage.setItem('provider-current-job', JSON.stringify(currentJob.value))
          
          console.log('[Fallback] Job accepted:', requestId)
          resolve({ success: true, requestId })
        } catch (err: any) {
          error.value = err.message
          resolve({ success: false, error: err.message })
        } finally {
          isLoading.value = false
        }
      }, 1000) // Simulate network delay
    })
  }

  // Update job status (mock implementation)
  async function updateJobStatus(status: string): Promise<void> {
    if (!currentJob.value) {
      throw new Error('ไม่มีงานปัจจุบัน')
    }

    isLoading.value = true
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          if (currentJob.value) {
            currentJob.value.status = status as any
            localStorage.setItem('provider-current-job', JSON.stringify(currentJob.value))
            console.log('[Fallback] Status updated:', status)
          }
          resolve()
        } catch (err: any) {
          error.value = err.message
          reject(err)
        } finally {
          isLoading.value = false
        }
      }, 500)
    })
  }

  // Complete job (mock implementation)
  async function completeJob(actualFare?: number): Promise<CompleteResult> {
    if (!currentJob.value) {
      return { success: false }
    }

    isLoading.value = true

    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const finalFare = actualFare || currentJob.value!.estimated_fare
          const providerEarnings = Math.round(finalFare * 0.8)
          const platformFee = finalFare - providerEarnings

          // Clear current job
          currentJob.value = null
          localStorage.removeItem('provider-current-job')

          console.log('[Fallback] Job completed')
          resolve({
            success: true,
            finalFare,
            providerEarnings,
            platformFee
          })
        } catch (err: any) {
          error.value = err.message
          resolve({ success: false })
        } finally {
          isLoading.value = false
        }
      }, 1000)
    })
  }

  // Subscribe to new jobs (mock implementation with interval)
  let jobInterval: number | null = null
  
  async function subscribeToNewJobs(): Promise<void> {
    console.log('[Fallback] Starting job subscription...')
    
    // Add new jobs periodically
    jobInterval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance every 10 seconds
        const newJob: JobRequest = {
          id: `mock-${Date.now()}`,
          tracking_id: `MOCK-${Date.now().toString(36).toUpperCase()}`,
          user_id: `customer-${Date.now()}`,
          status: 'pending',
          estimated_fare: Math.floor(Math.random() * 200) + 50,
          pickup_lat: 13.7563 + (Math.random() - 0.5) * 0.1,
          pickup_lng: 100.5018 + (Math.random() - 0.5) * 0.1,
          pickup_address: 'สถานที่รับ (Mock)',
          destination_lat: 13.7466 + (Math.random() - 0.5) * 0.1,
          destination_lng: 100.5392 + (Math.random() - 0.5) * 0.1,
          destination_address: 'สถานที่ส่ง (Mock)',
          created_at: new Date().toISOString(),
          type: 'ride',
          distance: Math.random() * 10 + 1
        }
        
        availableJobs.value.push(newJob)
        localStorage.setItem('provider-jobs-fallback', JSON.stringify(availableJobs.value))
        
        console.log('[Fallback] New job added:', newJob.tracking_id)
        
        // Play notification sound
        try {
          const audio = new Audio('/sounds/new-job.mp3')
          audio.play().catch(() => {})
        } catch {}
      }
    }, 10000) // Check every 10 seconds
  }

  // Cleanup
  async function cleanup(): Promise<void> {
    if (jobInterval) {
      clearInterval(jobInterval)
      jobInterval = null
    }
    console.log('[Fallback] Cleanup completed')
  }

  // Load current job from localStorage on init
  try {
    const storedCurrentJob = localStorage.getItem('provider-current-job')
    if (storedCurrentJob) {
      currentJob.value = JSON.parse(storedCurrentJob)
    }
  } catch (err) {
    console.error('[Fallback] Error loading current job:', err)
  }

  onUnmounted(() => cleanup())

  return {
    availableJobs,
    currentJob,
    isLoading,
    error,
    hasCurrentJob,
    jobCount,
    sortedJobs,
    acceptJob,
    updateJobStatus,
    completeJob,
    subscribeToNewJobs,
    loadAvailableJobs,
    cleanup
  }
}