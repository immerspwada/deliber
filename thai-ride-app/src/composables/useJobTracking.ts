import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'

interface Location {
  lat: number
  lng: number
}

type JobStatus = 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'

export function useJobTracking(jobId: string) {
  const location = ref<Location | null>(null)
  const status = ref<JobStatus>('accepted')
  const error = ref<string | null>(null)
  const isTracking = ref(false)

  let locationInterval: number | null = null
  let realtimeChannel: any = null
  let watchId: number | null = null

  // Start location tracking
  function startTracking(): void {
    if (isTracking.value) return

    // Check if geolocation is available
    if (!navigator.geolocation) {
      error.value = 'Geolocation is not supported by your browser'
      return
    }

    isTracking.value = true
    error.value = null

    // Watch position continuously
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        location.value = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
      },
      (err) => {
        console.error('Geolocation error:', err)
        error.value = 'Unable to get your location'
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    )

    // Update location every 5 seconds
    locationInterval = window.setInterval(async () => {
      if (location.value) {
        await updateLocation(location.value.lat, location.value.lng)
      }
    }, 5000)
  }

  // Stop location tracking
  function stopTracking(): void {
    isTracking.value = false

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }

    if (locationInterval !== null) {
      clearInterval(locationInterval)
      locationInterval = null
    }
  }

  // Update location to server
  async function updateLocation(lat: number, lng: number): Promise<void> {
    try {
      await supabase.rpc('update_provider_location', {
        p_job_id: jobId,
        p_location: `POINT(${lng} ${lat})`,
      })
    } catch (err: any) {
      console.error('Error updating location:', err)
    }
  }

  // Subscribe to job status changes
  function subscribeToJobUpdates(): void {
    realtimeChannel = supabase
      .channel(`job:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          if (payload.new.status) {
            status.value = payload.new.status as JobStatus
          }
        }
      )
      .subscribe()
  }

  // Unsubscribe from updates
  function unsubscribe(): void {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  // Update job status
  async function updateJobStatus(newStatus: JobStatus): Promise<void> {
    try {
      const updateData: any = {
        status: newStatus,
      }

      if (newStatus === 'arrived') {
        updateData.arrived_at = new Date().toISOString()
      } else if (newStatus === 'in_progress') {
        updateData.started_at = new Date().toISOString()
      } else if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId)

      if (updateError) throw updateError

      status.value = newStatus
    } catch (err: any) {
      console.error('Error updating job status:', err)
      error.value = err.message || 'Failed to update job status'
      throw err
    }
  }

  // Initialize
  onMounted(() => {
    subscribeToJobUpdates()
    startTracking()
  })

  // Cleanup
  onUnmounted(() => {
    stopTracking()
    unsubscribe()
  })

  return {
    location,
    status,
    error,
    isTracking,
    startTracking,
    stopTracking,
    updateJobStatus,
  }
}
