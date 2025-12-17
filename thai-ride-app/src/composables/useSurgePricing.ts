/**
 * Feature: F36 - Surge Pricing System
 * 
 * ระบบปรับราคาตามความต้องการ (Dynamic Pricing)
 * - คำนวณ surge multiplier ตามช่วงเวลา
 * - คำนวณตามจำนวน provider ที่ว่าง
 * - คำนวณตามจำนวน request ที่รอ
 * - แสดง surge indicator ให้ลูกค้าทราบ
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface SurgeZone {
  lat: number
  lng: number
  radius: number // km
  multiplier: number
  reason: 'high_demand' | 'low_supply' | 'peak_hour' | 'event' | 'weather'
}

export interface SurgeConfig {
  enabled: boolean
  minMultiplier: number
  maxMultiplier: number
  peakHours: number[]
  demandThreshold: number // pending requests to trigger surge
  supplyThreshold: number // available providers below this triggers surge
}

const DEFAULT_CONFIG: SurgeConfig = {
  enabled: true,
  minMultiplier: 1.0,
  maxMultiplier: 2.5,
  peakHours: [7, 8, 12, 17, 18, 19], // Morning, lunch, evening rush
  demandThreshold: 10,
  supplyThreshold: 5
}

export function useSurgePricing() {
  const loading = ref(false)
  const currentMultiplier = ref(1.0)
  const surgeReason = ref<string | null>(null)
  const surgeZones = ref<SurgeZone[]>([])
  const config = ref<SurgeConfig>(DEFAULT_CONFIG)

  const isDemoMode = () => localStorage.getItem('demo_mode') === 'true'

  // Check if current hour is peak hour
  const isPeakHour = (): boolean => {
    const hour = new Date().getHours()
    return config.value.peakHours.includes(hour)
  }

  // Calculate surge based on supply and demand
  const calculateSurge = async (
    pickupLat: number,
    pickupLng: number,
    radiusKm: number = 5
  ): Promise<{ multiplier: number; reason: string | null }> => {
    if (!config.value.enabled) {
      return { multiplier: 1.0, reason: null }
    }

    loading.value = true

    try {
      if (isDemoMode()) {
        // Demo mode: simulate surge based on time
        const hour = new Date().getHours()
        let multiplier = 1.0
        let reason: string | null = null

        if (config.value.peakHours.includes(hour)) {
          multiplier = 1.3 + Math.random() * 0.4 // 1.3x - 1.7x during peak
          reason = 'ช่วงเวลาเร่งด่วน'
        } else if (hour >= 22 || hour < 6) {
          multiplier = 1.2 + Math.random() * 0.3 // 1.2x - 1.5x late night
          reason = 'ช่วงดึก'
        }

        // Round to 1 decimal
        multiplier = Math.round(multiplier * 10) / 10
        
        currentMultiplier.value = multiplier
        surgeReason.value = reason
        
        return { multiplier, reason }
      }

      // Real mode: check actual supply and demand
      const [pendingCount, availableProviders] = await Promise.all([
        getPendingRequestsCount(pickupLat, pickupLng, radiusKm),
        getAvailableProvidersCount(pickupLat, pickupLng, radiusKm)
      ])

      let multiplier = 1.0
      let reason: string | null = null

      // High demand surge
      if (pendingCount >= config.value.demandThreshold) {
        const demandFactor = Math.min(pendingCount / config.value.demandThreshold, 2)
        multiplier = Math.max(multiplier, 1 + (demandFactor - 1) * 0.5)
        reason = 'ความต้องการสูง'
      }

      // Low supply surge
      if (availableProviders <= config.value.supplyThreshold) {
        const supplyFactor = Math.max(1, (config.value.supplyThreshold - availableProviders + 1) / config.value.supplyThreshold)
        multiplier = Math.max(multiplier, 1 + supplyFactor * 0.3)
        reason = reason ? `${reason} + คนขับน้อย` : 'คนขับในพื้นที่น้อย'
      }

      // Peak hour surge
      if (isPeakHour()) {
        multiplier = Math.max(multiplier, 1.2)
        reason = reason || 'ช่วงเวลาเร่งด่วน'
      }

      // Apply min/max limits
      multiplier = Math.max(config.value.minMultiplier, Math.min(config.value.maxMultiplier, multiplier))
      
      // Round to 1 decimal
      multiplier = Math.round(multiplier * 10) / 10

      currentMultiplier.value = multiplier
      surgeReason.value = multiplier > 1 ? reason : null

      return { multiplier, reason: multiplier > 1 ? reason : null }
    } catch (e) {
      console.warn('Error calculating surge:', e)
      return { multiplier: 1.0, reason: null }
    } finally {
      loading.value = false
    }
  }

  // Get count of pending ride requests in area
  const getPendingRequestsCount = async (
    lat: number,
    lng: number,
    radiusKm: number
  ): Promise<number> => {
    try {
      // Simple bounding box query (approximate)
      const latDelta = radiusKm / 111 // ~111km per degree latitude
      const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180))

      const { count } = await supabase
        .from('ride_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .gte('pickup_lat', lat - latDelta)
        .lte('pickup_lat', lat + latDelta)
        .gte('pickup_lng', lng - lngDelta)
        .lte('pickup_lng', lng + lngDelta)

      return count || 0
    } catch {
      return 0
    }
  }

  // Get count of available providers in area
  const getAvailableProvidersCount = async (
    lat: number,
    lng: number,
    radiusKm: number
  ): Promise<number> => {
    try {
      const latDelta = radiusKm / 111
      const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180))

      const { count } = await supabase
        .from('service_providers')
        .select('*', { count: 'exact', head: true })
        .eq('is_available', true)
        .eq('is_verified', true)
        .gte('current_lat', lat - latDelta)
        .lte('current_lat', lat + latDelta)
        .gte('current_lng', lng - lngDelta)
        .lte('current_lng', lng + lngDelta)

      return count || 0
    } catch {
      return 0
    }
  }

  // Apply surge to a base fare
  const applySurge = (baseFare: number): number => {
    return Math.round(baseFare * currentMultiplier.value)
  }

  // Get surge display info
  const getSurgeDisplay = computed(() => {
    if (currentMultiplier.value <= 1) {
      return null
    }

    return {
      multiplier: currentMultiplier.value,
      displayText: `${currentMultiplier.value}x`,
      reason: surgeReason.value,
      color: currentMultiplier.value >= 2 ? '#e11900' : currentMultiplier.value >= 1.5 ? '#f57c00' : '#ffc043'
    }
  })

  // Check if surge is active
  const isSurgeActive = computed(() => currentMultiplier.value > 1)

  // Get surge level (low, medium, high)
  const surgeLevel = computed((): 'none' | 'low' | 'medium' | 'high' => {
    if (currentMultiplier.value <= 1) return 'none'
    if (currentMultiplier.value < 1.5) return 'low'
    if (currentMultiplier.value < 2) return 'medium'
    return 'high'
  })

  // Update config
  const updateConfig = (newConfig: Partial<SurgeConfig>) => {
    config.value = { ...config.value, ...newConfig }
  }

  // Reset surge
  const resetSurge = () => {
    currentMultiplier.value = 1.0
    surgeReason.value = null
  }

  return {
    loading,
    currentMultiplier,
    surgeReason,
    surgeZones,
    config,
    isSurgeActive,
    surgeLevel,
    getSurgeDisplay,
    calculateSurge,
    applySurge,
    updateConfig,
    resetSurge,
    isPeakHour
  }
}
