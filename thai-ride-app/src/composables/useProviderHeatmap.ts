/**
 * Feature: F43 - Provider Heat Map
 * Tables: service_providers
 * 
 * ระบบแสดง heat map ตำแหน่ง providers
 * - แสดงความหนาแน่นของ providers
 * - Realtime updates
 * - Filter by provider type
 */

import { ref, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'

export interface ProviderLocation {
  id: string
  lat: number
  lng: number
  provider_type: 'driver' | 'rider'
  is_available: boolean
  last_update: string
}

export interface HeatmapPoint {
  lat: number
  lng: number
  intensity: number
}

export function useProviderHeatmap() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const providers = ref<ProviderLocation[]>([])
  const heatmapData = ref<HeatmapPoint[]>([])
  
  let subscription: any = null

  const isDemoMode = () => localStorage.getItem('demo_mode') === 'true'

  // Generate demo provider locations around Bangkok
  const generateDemoProviders = (): ProviderLocation[] => {
    const baseLocations = [
      { lat: 13.7563, lng: 100.5018 }, // Central Bangkok
      { lat: 13.7466, lng: 100.5347 }, // Siam
      { lat: 13.7377, lng: 100.5603 }, // Terminal 21
      { lat: 13.7280, lng: 100.5340 }, // Silom
      { lat: 13.8060, lng: 100.5610 }, // Ladprao
      { lat: 13.7210, lng: 100.5290 }, // Sathorn
      { lat: 13.7580, lng: 100.5740 }, // Ratchada
      { lat: 13.7314, lng: 100.5697 }, // Emquartier
    ]

    const providers: ProviderLocation[] = []
    
    // Generate 50 random providers
    for (let i = 0; i < 50; i++) {
      const base = baseLocations[Math.floor(Math.random() * baseLocations.length)]
      if (!base) continue
      
      providers.push({
        id: `provider-${i}`,
        lat: base.lat + (Math.random() - 0.5) * 0.05,
        lng: base.lng + (Math.random() - 0.5) * 0.05,
        provider_type: Math.random() > 0.3 ? 'driver' : 'rider',
        is_available: Math.random() > 0.3,
        last_update: new Date().toISOString()
      })
    }

    return providers
  }

  // Convert providers to heatmap data
  const generateHeatmapData = (providerList: ProviderLocation[]): HeatmapPoint[] => {
    // Group by grid cells
    const gridSize = 0.005 // ~500m
    const grid = new Map<string, { lat: number; lng: number; count: number }>()

    providerList.forEach(p => {
      if (!p.is_available) return
      
      const gridLat = Math.floor(p.lat / gridSize) * gridSize
      const gridLng = Math.floor(p.lng / gridSize) * gridSize
      const key = `${gridLat},${gridLng}`

      const existing = grid.get(key)
      if (existing) {
        existing.count++
      } else {
        grid.set(key, { lat: gridLat + gridSize / 2, lng: gridLng + gridSize / 2, count: 1 })
      }
    })

    // Convert to heatmap points with intensity
    const maxCount = Math.max(...Array.from(grid.values()).map(g => g.count), 1)
    
    return Array.from(grid.values()).map(g => ({
      lat: g.lat,
      lng: g.lng,
      intensity: g.count / maxCount
    }))
  }

  // Fetch provider locations
  const fetchProviders = async (filter?: { type?: 'driver' | 'rider'; availableOnly?: boolean }) => {
    loading.value = true
    error.value = null

    try {
      if (isDemoMode()) {
        let demoProviders = generateDemoProviders()
        
        if (filter?.type) {
          demoProviders = demoProviders.filter(p => p.provider_type === filter.type)
        }
        if (filter?.availableOnly) {
          demoProviders = demoProviders.filter(p => p.is_available)
        }

        providers.value = demoProviders
        heatmapData.value = generateHeatmapData(demoProviders)
        return providers.value
      }

      let query = (supabase
        .from('service_providers') as any)
        .select('id, current_lat, current_lng, provider_type, is_available, last_location_update')
        .not('current_lat', 'is', null)
        .not('current_lng', 'is', null)

      if (filter?.type) {
        query = query.eq('provider_type', filter.type)
      }
      if (filter?.availableOnly) {
        query = query.eq('is_available', true)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      providers.value = (data || []).map((p: any) => ({
        id: p.id,
        lat: p.current_lat,
        lng: p.current_lng,
        provider_type: p.provider_type || 'driver',
        is_available: p.is_available,
        last_update: p.last_location_update
      }))

      heatmapData.value = generateHeatmapData(providers.value)
      return providers.value
    } catch (e: any) {
      error.value = e.message
      // Fallback to demo data
      providers.value = generateDemoProviders()
      heatmapData.value = generateHeatmapData(providers.value)
      return providers.value
    } finally {
      loading.value = false
    }
  }

  // Subscribe to realtime updates
  const subscribeToUpdates = () => {
    if (isDemoMode()) {
      // Simulate realtime updates in demo mode
      const interval = setInterval(() => {
        providers.value = generateDemoProviders()
        heatmapData.value = generateHeatmapData(providers.value)
      }, 5000)

      return () => clearInterval(interval)
    }

    subscription = supabase
      .channel('provider-locations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_providers'
        },
        (payload) => {
          const updated = payload.new as any
          if (!updated.current_lat || !updated.current_lng) return

          const idx = providers.value.findIndex(p => p.id === updated.id)
          const newProvider: ProviderLocation = {
            id: updated.id,
            lat: updated.current_lat,
            lng: updated.current_lng,
            provider_type: updated.provider_type || 'driver',
            is_available: updated.is_available,
            last_update: updated.last_location_update
          }

          if (idx !== -1) {
            providers.value[idx] = newProvider
          } else {
            providers.value.push(newProvider)
          }

          heatmapData.value = generateHeatmapData(providers.value)
        }
      )
      .subscribe()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }

  // Get statistics
  const getStats = () => {
    const total = providers.value.length
    const available = providers.value.filter(p => p.is_available).length
    const drivers = providers.value.filter(p => p.provider_type === 'driver').length
    const riders = providers.value.filter(p => p.provider_type === 'rider').length

    return {
      total,
      available,
      busy: total - available,
      drivers,
      riders,
      availabilityRate: total > 0 ? Math.round((available / total) * 100) : 0
    }
  }

  // Cleanup
  onUnmounted(() => {
    if (subscription) {
      subscription.unsubscribe()
    }
  })

  return {
    loading,
    error,
    providers,
    heatmapData,
    fetchProviders,
    subscribeToUpdates,
    getStats
  }
}
