/**
 * Composable: useProviderHeatmap
 * จัดการข้อมูล provider location heatmap
 * 
 * Features:
 * - Load provider locations with filters
 * - Real-time updates via Supabase subscriptions
 * - Time-lapse playback functionality
 * - Density area analysis
 */

import { ref, computed, onUnmounted, type Ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useErrorHandler } from './useErrorHandler'

// Types
export interface ProviderLocation {
  id: string
  provider_type: string
  current_lat: number
  current_lng: number
  is_online: boolean
  is_available: boolean
  last_updated: string
}

export interface HeatmapPoint {
  lat: number
  lng: number
  intensity: number // 0-1
  provider_count: number
}

export interface AreaStats {
  area_name: string
  center_lat: number
  center_lng: number
  provider_count: number
  coverage_level: 'high' | 'medium' | 'low'
  is_high_density: boolean
}

export interface HeatmapFilters {
  provider_type: string | null
  is_online: boolean | null
  time_range: { start: Date; end: Date } | null
}

export interface HeatmapStats {
  total: number
  online: number
  available: number
  avg_per_area: number
}

export interface UseProviderHeatmapReturn {
  // State
  providers: Ref<ProviderLocation[]>
  heatmapPoints: Ref<HeatmapPoint[]>
  stats: Ref<HeatmapStats>
  highDensityAreas: Ref<AreaStats[]>
  lowDensityAreas: Ref<AreaStats[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  
  // Filters
  filters: Ref<HeatmapFilters>
  
  // Time-lapse
  isTimeLapseMode: Ref<boolean>
  timeLapseDuration: Ref<'1h' | '6h' | '24h'>
  timeLapseProgress: Ref<number>
  currentTimestamp: Ref<Date>
  timeLapseSnapshots: Ref<HeatmapPoint[][]>
  
  // Actions
  loadProviders: () => Promise<void>
  loadHeatmapData: () => Promise<void>
  loadDensityAreas: () => Promise<void>
  loadStats: () => Promise<void>
  applyFilters: (newFilters: Partial<HeatmapFilters>) => void
  clearFilters: () => void
  startTimeLapse: () => void
  pauseTimeLapse: () => void
  stopTimeLapse: () => void
  setTimeLapseSpeed: (speed: number) => void
  setTimeLapseDuration: (duration: '1h' | '6h' | '24h') => void
  getAreaDetails: (lat: number, lng: number) => Promise<AreaStats | null>
}

// Realtime subscription
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null

export function useProviderHeatmap(): UseProviderHeatmapReturn {
  const { handle } = useErrorHandler()
  
  // State
  const providers = ref<ProviderLocation[]>([])
  const heatmapPoints = ref<HeatmapPoint[]>([])
  const stats = ref<HeatmapStats>({
    total: 0,
    online: 0,
    available: 0,
    avg_per_area: 0
  })
  const highDensityAreas = ref<AreaStats[]>([])
  const lowDensityAreas = ref<AreaStats[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Filters
  const filters = ref<HeatmapFilters>({
    provider_type: null,
    is_online: null,
    time_range: null
  })
  
  // Time-lapse
  const isTimeLapseMode = ref(false)
  const timeLapseDuration = ref<'1h' | '6h' | '24h'>('24h')
  const timeLapseProgress = ref(0)
  const currentTimestamp = ref(new Date())
  const timeLapseSnapshots = ref<HeatmapPoint[][]>([])
  const timeLapseSpeed = ref(1) // 1x speed
  const timeLapseInterval = ref<number | null>(null)
  const timeLapseCurrentIndex = ref(0)
  
  /**
   * Load provider locations (for map markers)
   */
  async function loadProviders(): Promise<void> {
    try {
      let query = supabase
        .from('providers_v2')
        .select('id, provider_type, current_lat, current_lng, is_online, is_available, updated_at')
        .eq('status', 'approved')
        .not('current_lat', 'is', null)
        .not('current_lng', 'is', null)
      
      if (filters.value.provider_type) {
        query = query.eq('provider_type', filters.value.provider_type)
      }
      
      if (filters.value.is_online !== null) {
        query = query.eq('is_online', filters.value.is_online)
      }
      
      const { data, error: queryError } = await query
      
      if (queryError) throw queryError
      
      providers.value = (data || []).map(p => ({
        id: p.id,
        provider_type: p.provider_type,
        current_lat: p.current_lat,
        current_lng: p.current_lng,
        is_online: p.is_online,
        is_available: p.is_available,
        last_updated: p.updated_at
      }))
    } catch (err) {
      console.error('[useProviderHeatmap] Error loading providers:', err)
      handle(err, 'useProviderHeatmap.loadProviders')
    }
  }
  
  /**
   * Load heatmap data (aggregated points)
   */
  async function loadHeatmapData(): Promise<void> {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_provider_heatmap_data', {
          p_provider_type: filters.value.provider_type,
          p_is_online: filters.value.is_online,
          p_start_time: filters.value.time_range?.start.toISOString() || null,
          p_end_time: filters.value.time_range?.end.toISOString() || null
        })
      
      if (rpcError) throw rpcError
      
      heatmapPoints.value = (data || []).map(point => ({
        lat: point.lat,
        lng: point.lng,
        provider_count: point.provider_count,
        intensity: point.intensity
      }))
    } catch (err) {
      console.error('[useProviderHeatmap] Error loading heatmap data:', err)
      error.value = 'ไม่สามารถโหลดข้อมูล heatmap ได้'
      handle(err, 'useProviderHeatmap.loadHeatmapData')
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Load density areas (high/low coverage)
   */
  async function loadDensityAreas(): Promise<void> {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_provider_density_areas', {
          p_limit: 5
        })
      
      if (rpcError) throw rpcError
      
      const areas = (data || []) as AreaStats[]
      
      highDensityAreas.value = areas
        .filter(a => a.is_high_density)
        .sort((a, b) => b.provider_count - a.provider_count)
      
      lowDensityAreas.value = areas
        .filter(a => !a.is_high_density)
        .sort((a, b) => a.provider_count - b.provider_count)
    } catch (err) {
      console.error('[useProviderHeatmap] Error loading density areas:', err)
      handle(err, 'useProviderHeatmap.loadDensityAreas')
    }
  }
  
  /**
   * Load summary statistics
   */
  async function loadStats(): Promise<void> {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_provider_heatmap_stats')
      
      if (rpcError) throw rpcError
      
      if (data && data.length > 0) {
        const result = data[0]
        stats.value = {
          total: result.total_providers || 0,
          online: result.online_providers || 0,
          available: result.available_providers || 0,
          avg_per_area: result.avg_providers_per_area || 0
        }
      }
    } catch (err) {
      console.error('[useProviderHeatmap] Error loading stats:', err)
      handle(err, 'useProviderHeatmap.loadStats')
    }
  }
  
  /**
   * Apply filters and reload data
   */
  function applyFilters(newFilters: Partial<HeatmapFilters>): void {
    filters.value = {
      ...filters.value,
      ...newFilters
    }
    
    // Reload all data with new filters
    loadHeatmapData()
    loadProviders()
    loadDensityAreas()
    loadStats()
  }
  
  /**
   * Clear all filters
   */
  function clearFilters(): void {
    filters.value = {
      provider_type: null,
      is_online: null,
      time_range: null
    }
    
    loadHeatmapData()
    loadProviders()
    loadDensityAreas()
    loadStats()
  }
  
  /**
   * Load time-lapse snapshots
   */
  async function loadTimeLapseData(): Promise<void> {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_provider_location_timelapse', {
          p_duration: timeLapseDuration.value,
          p_interval_minutes: 15,
          p_provider_type: filters.value.provider_type
        })
      
      if (rpcError) throw rpcError
      
      // Group by timestamp
      const snapshotMap = new Map<string, HeatmapPoint[]>()
      
      for (const record of data || []) {
        const timestamp = record.snapshot_time
        if (!snapshotMap.has(timestamp)) {
          snapshotMap.set(timestamp, [])
        }
        
        snapshotMap.get(timestamp)!.push({
          lat: record.lat,
          lng: record.lng,
          provider_count: record.provider_count,
          intensity: Math.min(record.provider_count / 10, 1)
        })
      }
      
      // Convert to array sorted by time
      timeLapseSnapshots.value = Array.from(snapshotMap.entries())
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([_, points]) => points)
    } catch (err) {
      console.error('[useProviderHeatmap] Error loading time-lapse data:', err)
      handle(err, 'useProviderHeatmap.loadTimeLapseData')
    }
  }
  
  /**
   * Start time-lapse playback
   */
  async function startTimeLapse(): Promise<void> {
    if (isTimeLapseMode.value && timeLapseInterval.value) {
      // Already playing, just resume
      return
    }
    
    isTimeLapseMode.value = true
    timeLapseCurrentIndex.value = 0
    timeLapseProgress.value = 0
    
    // Load time-lapse data
    await loadTimeLapseData()
    
    if (timeLapseSnapshots.value.length === 0) {
      error.value = 'ไม่มีข้อมูลสำหรับ time-lapse'
      isTimeLapseMode.value = false
      return
    }
    
    // Start playback
    const intervalMs = 1000 / timeLapseSpeed.value
    
    timeLapseInterval.value = window.setInterval(() => {
      if (timeLapseCurrentIndex.value >= timeLapseSnapshots.value.length - 1) {
        // Loop back to start
        timeLapseCurrentIndex.value = 0
      } else {
        timeLapseCurrentIndex.value++
      }
      
      // Update heatmap with current snapshot
      heatmapPoints.value = timeLapseSnapshots.value[timeLapseCurrentIndex.value] || []
      
      // Update progress
      timeLapseProgress.value = (timeLapseCurrentIndex.value / (timeLapseSnapshots.value.length - 1)) * 100
      
      // Update timestamp (estimate based on duration)
      const durationMs = timeLapseDuration.value === '1h' ? 3600000 : 
                         timeLapseDuration.value === '6h' ? 21600000 : 86400000
      const startTime = Date.now() - durationMs
      const timePerSnapshot = durationMs / timeLapseSnapshots.value.length
      currentTimestamp.value = new Date(startTime + (timeLapseCurrentIndex.value * timePerSnapshot))
    }, intervalMs)
  }
  
  /**
   * Pause time-lapse playback
   */
  function pauseTimeLapse(): void {
    if (timeLapseInterval.value) {
      clearInterval(timeLapseInterval.value)
      timeLapseInterval.value = null
    }
  }
  
  /**
   * Stop time-lapse and return to live view
   */
  function stopTimeLapse(): void {
    pauseTimeLapse()
    isTimeLapseMode.value = false
    timeLapseCurrentIndex.value = 0
    timeLapseProgress.value = 0
    timeLapseSnapshots.value = []
    
    // Reload live data
    loadHeatmapData()
  }
  
  /**
   * Set time-lapse playback speed
   */
  function setTimeLapseSpeed(speed: number): void {
    timeLapseSpeed.value = speed
    
    // Restart interval with new speed if playing
    if (timeLapseInterval.value) {
      pauseTimeLapse()
      startTimeLapse()
    }
  }
  
  /**
   * Set time-lapse duration
   */
  function setTimeLapseDuration(duration: '1h' | '6h' | '24h'): void {
    timeLapseDuration.value = duration
    
    // Reload time-lapse data if in time-lapse mode
    if (isTimeLapseMode.value) {
      stopTimeLapse()
      startTimeLapse()
    }
  }
  
  /**
   * Get details for a specific area
   */
  async function getAreaDetails(lat: number, lng: number): Promise<AreaStats | null> {
    try {
      // Round to match density area calculation
      const roundedLat = Math.round(lat * 100) / 100
      const roundedLng = Math.round(lng * 100) / 100
      
      // Find in existing density areas
      const area = [...highDensityAreas.value, ...lowDensityAreas.value].find(
        a => Math.abs(a.center_lat - roundedLat) < 0.01 && 
             Math.abs(a.center_lng - roundedLng) < 0.01
      )
      
      return area || null
    } catch (err) {
      console.error('[useProviderHeatmap] Error getting area details:', err)
      handle(err, 'useProviderHeatmap.getAreaDetails')
      return null
    }
  }
  
  /**
   * Setup realtime subscription for provider location updates
   */
  function setupRealtimeSubscription(): void {
    realtimeChannel = supabase
      .channel('provider-locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'providers_v2',
          filter: 'status=eq.approved'
        },
        () => {
          // Reload data on any provider update
          if (!isTimeLapseMode.value) {
            loadHeatmapData()
            loadProviders()
            loadStats()
          }
        }
      )
      .subscribe()
  }
  
  /**
   * Cleanup on unmount
   */
  onUnmounted(() => {
    pauseTimeLapse()
    
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  })
  
  // Setup realtime subscription
  setupRealtimeSubscription()
  
  return {
    // State
    providers,
    heatmapPoints,
    stats,
    highDensityAreas,
    lowDensityAreas,
    loading,
    error,
    
    // Filters
    filters,
    
    // Time-lapse
    isTimeLapseMode,
    timeLapseDuration,
    timeLapseProgress,
    currentTimestamp,
    timeLapseSnapshots,
    
    // Actions
    loadProviders,
    loadHeatmapData,
    loadDensityAreas,
    loadStats,
    applyFilters,
    clearFilters,
    startTimeLapse,
    pauseTimeLapse,
    stopTimeLapse,
    setTimeLapseSpeed,
    setTimeLapseDuration,
    getAreaDetails
  }
}
