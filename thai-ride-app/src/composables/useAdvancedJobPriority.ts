/**
 * useAdvancedJobPriority - Enhanced Job Priority Composable
 * Handles job priority calculation and sorting with admin-configurable weights
 */

import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export interface JobRequest {
  id: string
  tracking_id: string
  user_id: string
  status: string
  estimated_fare: number
  pickup_lat: number | null
  pickup_lng: number | null
  pickup_address: string | null
  destination_lat: number | null
  destination_lng: number | null
  destination_address: string | null
  created_at: string
  distance?: number
  priority_score?: number
  auto_accept_eligible?: boolean
  customer_rating?: number
}

export interface PriorityConfig {
  id: string
  name: string
  distance_weight: number
  fare_weight: number
  rating_weight: number
  time_weight: number
  is_active: boolean
}

export function useAdvancedJobPriority() {
  const priorityConfig = ref<PriorityConfig | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Load active priority configuration
  async function loadPriorityConfig(): Promise<void> {
    try {
      const { data, error: configError } = await supabase
        .from('job_priority_config')
        .select('*')
        .eq('is_active', true)
        .maybeSingle()

      if (configError) throw configError

      priorityConfig.value = data || {
        id: 'default',
        name: 'Default',
        distance_weight: 0.4,
        fare_weight: 0.3,
        rating_weight: 0.2,
        time_weight: 0.1,
        is_active: true
      }
    } catch (err: any) {
      console.error('[AdvancedJobPriority] Failed to load config:', err)
      error.value = err.message
    }
  }

  // Calculate priority score for a job
  function calculatePriorityScore(
    job: JobRequest,
    providerLat: number,
    providerLng: number
  ): number {
    if (!priorityConfig.value) return 0.5 // Default neutral score

    const config = priorityConfig.value

    // Calculate distance (Haversine formula)
    let distance = 0
    if (job.pickup_lat && job.pickup_lng) {
      const R = 6371 // Earth's radius in km
      const dLat = (job.pickup_lat - providerLat) * Math.PI / 180
      const dLng = (job.pickup_lng - providerLng) * Math.PI / 180
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(providerLat * Math.PI / 180) * Math.cos(job.pickup_lat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      distance = R * c
    }

    // Calculate time since request (in hours)
    const timeHours = (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60)

    // Calculate component scores (0.0 to 1.0)
    
    // Distance: closer = higher score (inverse relationship)
    const distanceScore = Math.max(0, 1.0 - (distance / 20.0)) // Max 20km

    // Fare: higher fare = higher score (normalized to 50-550 baht range)
    const fareScore = Math.min(1.0, Math.max(0, (job.estimated_fare - 50) / 500))

    // Rating: higher customer rating = higher score (1-5 scale to 0-1)
    const ratingScore = job.customer_rating ? (job.customer_rating - 1.0) / 4.0 : 0.8 // Default 4.0 rating

    // Time: newer requests = higher score (max 2 hours)
    const timeScore = Math.max(0, 1.0 - (timeHours / 2.0))

    // Calculate weighted final score
    const finalScore = (
      distanceScore * config.distance_weight +
      fareScore * config.fare_weight +
      ratingScore * config.rating_weight +
      timeScore * config.time_weight
    )

    return Math.min(1.0, Math.max(0.0, finalScore))
  }

  // Sort jobs by priority
  function sortJobsByPriority(
    jobs: JobRequest[],
    providerLat: number,
    providerLng: number
  ): JobRequest[] {
    return jobs
      .map(job => ({
        ...job,
        priority_score: calculatePriorityScore(job, providerLat, providerLng)
      }))
      .sort((a, b) => {
        // Primary sort: priority score (descending)
        if (a.priority_score !== b.priority_score) {
          return (b.priority_score || 0) - (a.priority_score || 0)
        }
        
        // Secondary sort: distance (ascending)
        if (a.distance !== b.distance) {
          return (a.distance || 999) - (b.distance || 999)
        }
        
        // Tertiary sort: creation time (ascending - older first)
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
  }

  // Get priority explanation for a job
  function getPriorityExplanation(job: JobRequest): string {
    if (!job.priority_score || !priorityConfig.value) return 'No priority data'

    const score = job.priority_score
    const config = priorityConfig.value

    if (score >= 0.8) return `🔥 High Priority (${(score * 100).toFixed(0)}%) - Great match!`
    if (score >= 0.6) return `⭐ Good Priority (${(score * 100).toFixed(0)}%) - Worth considering`
    if (score >= 0.4) return `📍 Medium Priority (${(score * 100).toFixed(0)}%) - Average match`
    if (score >= 0.2) return `⏰ Low Priority (${(score * 100).toFixed(0)}%) - Consider if needed`
    return `❄️ Very Low Priority (${(score * 100).toFixed(0)}%) - Last resort`
  }

  // Get priority color for UI
  function getPriorityColor(score: number): string {
    if (score >= 0.8) return 'text-red-600 bg-red-50'
    if (score >= 0.6) return 'text-orange-600 bg-orange-50'
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-50'
    if (score >= 0.2) return 'text-blue-600 bg-blue-50'
    return 'text-gray-600 bg-gray-50'
  }

  // Enhanced job filtering with priority
  function filterJobsByPriority(
    jobs: JobRequest[],
    minPriorityScore: number = 0.3
  ): JobRequest[] {
    return jobs.filter(job => (job.priority_score || 0) >= minPriorityScore)
  }

  // Get jobs with auto-accept eligibility
  async function getJobsWithAutoAccept(
    jobs: JobRequest[],
    providerId: string
  ): Promise<JobRequest[]> {
    const jobsWithAutoAccept = []

    for (const job of jobs) {
      try {
        const { data: isEligible, error } = await supabase
          .rpc('check_auto_accept_rules', {
            p_ride_id: job.id,
            p_provider_id: providerId
          })

        if (!error) {
          jobsWithAutoAccept.push({
            ...job,
            auto_accept_eligible: isEligible
          })
        } else {
          jobsWithAutoAccept.push({
            ...job,
            auto_accept_eligible: false
          })
        }
      } catch (err) {
        console.error('[AdvancedJobPriority] Auto-accept check failed:', err)
        jobsWithAutoAccept.push({
          ...job,
          auto_accept_eligible: false
        })
      }
    }

    return jobsWithAutoAccept
  }

  // Get enhanced nearby rides with priority and auto-accept
  async function getEnhancedNearbyRides(
    providerLat: number,
    providerLng: number,
    radiusKm: number = 10
  ): Promise<JobRequest[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_nearby_pending_rides_with_priority', {
          provider_lat: providerLat,
          provider_lng: providerLng,
          radius_km: radiusKm
        })

      if (error) throw error

      return data || []
    } catch (err: any) {
      console.error('[AdvancedJobPriority] Failed to get enhanced nearby rides:', err)
      error.value = err.message
      return []
    }
  }

  // Computed properties
  const isConfigLoaded = computed(() => priorityConfig.value !== null)
  const configName = computed(() => priorityConfig.value?.name || 'Default')

  return {
    // State
    priorityConfig,
    isLoading,
    error,
    
    // Computed
    isConfigLoaded,
    configName,
    
    // Methods
    loadPriorityConfig,
    calculatePriorityScore,
    sortJobsByPriority,
    getPriorityExplanation,
    getPriorityColor,
    filterJobsByPriority,
    getJobsWithAutoAccept,
    getEnhancedNearbyRides
  }
}