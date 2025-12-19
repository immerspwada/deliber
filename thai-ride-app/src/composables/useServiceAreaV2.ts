// @ts-nocheck
/**
 * useServiceAreaV2 - Enhanced Service Area Management
 * 
 * Feature: F42 - Service Area Expansion V2
 * Tables: service_zones, zone_pricing_rules, provider_zone_coverage, 
 *         zone_demand_tracking, area_expansion_requests
 * Migration: 066_service_area_v2.sql
 * 
 * @syncs-with
 * - Customer: ตรวจสอบพื้นที่ให้บริการ, ขอขยายพื้นที่
 * - Provider: จัดการ zone coverage, ดู demand
 * - Admin: จัดการ zones, pricing rules, อนุมัติ expansion requests
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

// Types
export interface ServiceZone {
  id: string
  service_area_id?: string
  name: string
  name_th: string
  zone_type: 'urban' | 'suburban' | 'rural' | 'airport' | 'tourist' | 'industrial'
  boundaries?: any
  center_lat: number
  center_lng: number
  base_fare_multiplier: number
  per_km_multiplier: number
  min_fare_override?: number
  is_active: boolean
  operating_hours?: Record<string, { start: string; end: string }>
  total_rides: number
  avg_wait_time_minutes?: number
}

export interface ZonePricingRule {
  id: string
  zone_id: string
  rule_type: 'time_based' | 'demand_based' | 'weather' | 'event' | 'holiday'
  rule_name: string
  rule_name_th: string
  conditions: any
  fare_multiplier: number
  flat_surcharge: number
  priority: number
  is_active: boolean
  valid_from?: string
  valid_until?: string
}

export interface ProviderZoneCoverage {
  id: string
  provider_id: string
  zone_id: string
  is_preferred: boolean
  priority_level: number
  total_trips_in_zone: number
  avg_rating_in_zone?: number
  last_trip_at?: string
  zone?: ServiceZone
}

export interface ZoneDemand {
  zone_id: string
  zone_name: string
  pending_requests: number
  available_providers: number
  demand_ratio: number
  surge_multiplier: number
}

export interface ExpansionRequest {
  id: string
  requested_lat: number
  requested_lng: number
  requested_address?: string
  user_id?: string
  provider_id?: string
  request_type: 'customer_request' | 'provider_request' | 'business_request'
  reason?: string
  expected_demand?: string
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'implemented'
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
  created_at: string
}

export interface FareCalculation {
  final_fare: number
  surge_multiplier: number
  zone_multiplier: number
  surcharges: number
  breakdown: {
    base_fare: number
    distance_cost: number
    zone_multiplier: number
    surge_multiplier: number
    surcharges: number
    pickup_zone?: string
    dest_zone?: string
  }
}

export function useServiceAreaV2() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const error = ref<string | null>(null)

  // State
  const zones = ref<ServiceZone[]>([])
  const currentZone = ref<ServiceZone | null>(null)
  const pricingRules = ref<ZonePricingRule[]>([])
  const providerCoverage = ref<ProviderZoneCoverage[]>([])
  const zoneDemands = ref<ZoneDemand[]>([])
  const expansionRequests = ref<ExpansionRequest[]>([])

  // Computed
  const activeZones = computed(() => zones.value.filter(z => z.is_active))
  
  const urbanZones = computed(() => zones.value.filter(z => z.zone_type === 'urban'))
  
  const highDemandZones = computed(() => 
    zoneDemands.value.filter(d => d.surge_multiplier > 1.0)
  )

  // =====================================================
  // CUSTOMER FUNCTIONS
  // =====================================================

  /**
   * Get zone for location
   */
  const getZoneForLocation = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const { data, error: err } = await supabase
        .rpc('get_zone_for_location', { p_lat: lat, p_lng: lng })

      if (err) throw err
      return data
    } catch (e: any) {
      console.error('Get zone error:', e)
      return null
    }
  }

  /**
   * Check if location is in service area
   */
  const isLocationServiced = async (lat: number, lng: number): Promise<boolean> => {
    const zoneId = await getZoneForLocation(lat, lng)
    if (!zoneId) return false

    try {
      const { data } = await supabase
        .from('service_zones')
        .select('is_active')
        .eq('id', zoneId)
        .single()

      return data?.is_active || false
    } catch {
      return false
    }
  }

  /**
   * Calculate fare with zone pricing
   */
  const calculateZoneFare = async (
    pickupLat: number,
    pickupLng: number,
    destLat: number,
    destLng: number,
    baseFare: number,
    perKmRate: number,
    distanceKm: number
  ): Promise<FareCalculation | null> => {
    try {
      const { data, error: err } = await supabase
        .rpc('calculate_zone_fare', {
          p_pickup_lat: pickupLat,
          p_pickup_lng: pickupLng,
          p_dest_lat: destLat,
          p_dest_lng: destLng,
          p_base_fare: baseFare,
          p_per_km_rate: perKmRate,
          p_distance_km: distanceKm
        })

      if (err) throw err
      return data?.[0] || null
    } catch (e: any) {
      console.error('Calculate fare error:', e)
      return null
    }
  }

  /**
   * Submit expansion request
   */
  const submitExpansionRequest = async (
    lat: number,
    lng: number,
    address: string,
    reason: string
  ): Promise<string | null> => {
    if (!authStore.user?.id) return null

    try {
      const { data, error: err } = await supabase
        .rpc('submit_expansion_request', {
          p_user_id: authStore.user.id,
          p_lat: lat,
          p_lng: lng,
          p_address: address,
          p_reason: reason
        })

      if (err) throw err
      return data
    } catch (e: any) {
      console.error('Submit expansion request error:', e)
      return null
    }
  }

  /**
   * Fetch user's expansion requests
   */
  const fetchMyExpansionRequests = async () => {
    if (!authStore.user?.id) return

    try {
      const { data, error: err } = await supabase
        .from('area_expansion_requests')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })

      if (err) throw err
      expansionRequests.value = data || []
    } catch (e: any) {
      console.error('Fetch expansion requests error:', e)
    }
  }

  // =====================================================
  // PROVIDER FUNCTIONS
  // =====================================================

  /**
   * Fetch provider's zone coverage
   */
  const fetchProviderCoverage = async (providerId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('provider_zone_coverage')
        .select('*, zone:service_zones(*)')
        .eq('provider_id', providerId)

      if (err) throw err
      providerCoverage.value = data || []
    } catch (e: any) {
      console.error('Fetch provider coverage error:', e)
    }
  }

  /**
   * Update provider zone preference
   */
  const updateZonePreference = async (
    providerId: string,
    zoneId: string,
    isPreferred: boolean
  ): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('provider_zone_coverage')
        .upsert({
          provider_id: providerId,
          zone_id: zoneId,
          is_preferred: isPreferred
        }, { onConflict: 'provider_id,zone_id' })

      if (err) throw err
      return true
    } catch (e: any) {
      console.error('Update zone preference error:', e)
      return false
    }
  }

  /**
   * Get zone demand info
   */
  const fetchZoneDemand = async () => {
    try {
      const { data, error: err } = await supabase
        .from('zone_demand_tracking')
        .select('*, zone:service_zones(name, name_th)')
        .order('tracked_at', { ascending: false })
        .limit(50)

      if (err) throw err

      // Group by zone and get latest
      const demandMap = new Map<string, ZoneDemand>()
      data?.forEach(d => {
        if (!demandMap.has(d.zone_id)) {
          demandMap.set(d.zone_id, {
            zone_id: d.zone_id,
            zone_name: (d as any).zone?.name_th || '',
            pending_requests: d.pending_requests,
            available_providers: d.available_providers,
            demand_ratio: d.demand_ratio,
            surge_multiplier: d.surge_multiplier
          })
        }
      })

      zoneDemands.value = Array.from(demandMap.values())
    } catch (e: any) {
      console.error('Fetch zone demand error:', e)
    }
  }

  // =====================================================
  // ADMIN FUNCTIONS
  // =====================================================

  /**
   * Fetch all zones
   */
  const fetchAllZones = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('service_zones')
        .select('*')
        .order('name')

      if (err) throw err
      zones.value = data || []
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  /**
   * Create zone
   */
  const createZone = async (zone: Partial<ServiceZone>): Promise<ServiceZone | null> => {
    try {
      const { data, error: err } = await supabase
        .from('service_zones')
        .insert(zone)
        .select()
        .single()

      if (err) throw err
      zones.value.push(data)
      return data
    } catch (e: any) {
      console.error('Create zone error:', e)
      return null
    }
  }

  /**
   * Update zone
   */
  const updateZone = async (id: string, updates: Partial<ServiceZone>): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('service_zones')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (err) throw err

      const idx = zones.value.findIndex(z => z.id === id)
      if (idx !== -1) {
        zones.value[idx] = { ...zones.value[idx], ...updates }
      }
      return true
    } catch (e: any) {
      console.error('Update zone error:', e)
      return false
    }
  }

  /**
   * Delete zone
   */
  const deleteZone = async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('service_zones')
        .delete()
        .eq('id', id)

      if (err) throw err
      zones.value = zones.value.filter(z => z.id !== id)
      return true
    } catch (e: any) {
      console.error('Delete zone error:', e)
      return false
    }
  }

  /**
   * Fetch pricing rules for zone
   */
  const fetchPricingRules = async (zoneId?: string) => {
    try {
      let query = supabase.from('zone_pricing_rules').select('*')
      if (zoneId) query = query.eq('zone_id', zoneId)

      const { data, error: err } = await query.order('priority', { ascending: false })
      if (err) throw err
      pricingRules.value = data || []
    } catch (e: any) {
      console.error('Fetch pricing rules error:', e)
    }
  }

  /**
   * Create pricing rule
   */
  const createPricingRule = async (rule: Partial<ZonePricingRule>): Promise<ZonePricingRule | null> => {
    try {
      const { data, error: err } = await supabase
        .from('zone_pricing_rules')
        .insert(rule)
        .select()
        .single()

      if (err) throw err
      pricingRules.value.push(data)
      return data
    } catch (e: any) {
      console.error('Create pricing rule error:', e)
      return null
    }
  }

  /**
   * Update pricing rule
   */
  const updatePricingRule = async (id: string, updates: Partial<ZonePricingRule>): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('zone_pricing_rules')
        .update(updates)
        .eq('id', id)

      if (err) throw err
      return true
    } catch (e: any) {
      console.error('Update pricing rule error:', e)
      return false
    }
  }

  /**
   * Fetch all expansion requests (admin)
   */
  const fetchAllExpansionRequests = async (filter?: { status?: string }) => {
    try {
      let query = supabase
        .from('area_expansion_requests')
        .select('*, user:users(name, email)')

      if (filter?.status) query = query.eq('status', filter.status)

      const { data, error: err } = await query.order('created_at', { ascending: false })
      if (err) throw err
      expansionRequests.value = data || []
    } catch (e: any) {
      console.error('Fetch expansion requests error:', e)
    }
  }

  /**
   * Review expansion request
   */
  const reviewExpansionRequest = async (
    requestId: string,
    status: 'approved' | 'rejected',
    notes?: string
  ): Promise<boolean> => {
    if (!authStore.user?.id) return false

    try {
      const { error: err } = await supabase
        .from('area_expansion_requests')
        .update({
          status,
          reviewed_by: authStore.user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes
        })
        .eq('id', requestId)

      if (err) throw err
      return true
    } catch (e: any) {
      console.error('Review expansion request error:', e)
      return false
    }
  }

  /**
   * Get zone analytics
   */
  const getZoneAnalytics = async (zoneId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('zone_demand_tracking')
        .select('*')
        .eq('zone_id', zoneId)
        .order('tracked_at', { ascending: false })
        .limit(168) // Last 7 days hourly

      if (err) throw err

      // Calculate averages by hour
      const hourlyAvg: Record<number, { demand: number; surge: number; count: number }> = {}
      data?.forEach(d => {
        if (!hourlyAvg[d.hour_of_day]) {
          hourlyAvg[d.hour_of_day] = { demand: 0, surge: 0, count: 0 }
        }
        hourlyAvg[d.hour_of_day].demand += d.demand_ratio || 0
        hourlyAvg[d.hour_of_day].surge += d.surge_multiplier || 1
        hourlyAvg[d.hour_of_day].count++
      })

      return Object.entries(hourlyAvg).map(([hour, data]) => ({
        hour: parseInt(hour),
        avg_demand: data.count > 0 ? data.demand / data.count : 0,
        avg_surge: data.count > 0 ? data.surge / data.count : 1
      }))
    } catch (e: any) {
      console.error('Get zone analytics error:', e)
      return []
    }
  }

  return {
    // State
    loading,
    error,
    zones,
    currentZone,
    pricingRules,
    providerCoverage,
    zoneDemands,
    expansionRequests,

    // Computed
    activeZones,
    urbanZones,
    highDemandZones,

    // Customer functions
    getZoneForLocation,
    isLocationServiced,
    calculateZoneFare,
    submitExpansionRequest,
    fetchMyExpansionRequests,

    // Provider functions
    fetchProviderCoverage,
    updateZonePreference,
    fetchZoneDemand,

    // Admin functions
    fetchAllZones,
    createZone,
    updateZone,
    deleteZone,
    fetchPricingRules,
    createPricingRule,
    updatePricingRule,
    fetchAllExpansionRequests,
    reviewExpansionRequest,
    getZoneAnalytics
  }
}
