// @ts-nocheck
/**
 * useDeliveryV2 - Enhanced Delivery Service
 * 
 * Feature: F03 - Delivery Service Improvements V2
 * Tables: package_types, delivery_packages, delivery_tracking_events, delivery_insurance_claims
 * Migration: 072_delivery_v2.sql
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface PackageType {
  id: string
  name: string
  name_th: string
  description?: string
  max_weight_kg?: number
  max_dimensions_cm?: { length: number; width: number; height: number }
  base_price: number
  price_per_km: number
  icon_url?: string
  is_active: boolean
}

export interface DeliveryPackage {
  id: string
  delivery_id: string
  package_type_id?: string
  description?: string
  weight_kg?: number
  dimensions_cm?: any
  declared_value?: number
  is_insured: boolean
  insurance_fee?: number
  photo_urls: string[]
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'returned'
}

export interface TrackingEvent {
  event_id: string
  event_type: string
  event_time: string
  lat?: number
  lng?: number
  notes?: string
  photo_url?: string
}

export interface FeeCalculation {
  base_fee: number
  distance_fee: number
  express_fee: number
  insurance_fee: number
  total_fee: number
}

export function useDeliveryV2() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const error = ref<string | null>(null)

  const packageTypes = ref<PackageType[]>([])
  const packages = ref<DeliveryPackage[]>([])
  const trackingEvents = ref<TrackingEvent[]>([])

  const fetchPackageTypes = async () => {
    try {
      const { data, error: err } = await supabase
        .from('package_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (err) throw err
      packageTypes.value = data || []
    } catch (e: any) {
      console.error('Fetch package types error:', e)
    }
  }

  const calculateFee = async (
    packageTypeId: string,
    distanceKm: number,
    isExpress = false,
    declaredValue = 0
  ): Promise<FeeCalculation | null> => {
    try {
      const { data, error: err } = await supabase
        .rpc('calculate_delivery_fee_v2', {
          p_package_type_id: packageTypeId,
          p_distance_km: distanceKm,
          p_is_express: isExpress,
          p_declared_value: declaredValue
        })
      if (err) throw err
      return data?.[0] || null
    } catch (e: any) {
      console.error('Calculate fee error:', e)
      return null
    }
  }

  const addPackage = async (deliveryId: string, pkg: Partial<DeliveryPackage>): Promise<DeliveryPackage | null> => {
    try {
      const { data, error: err } = await supabase
        .from('delivery_packages')
        .insert({ ...pkg, delivery_id: deliveryId })
        .select()
        .single()
      if (err) throw err
      packages.value.push(data)
      return data
    } catch (e: any) {
      console.error('Add package error:', e)
      return null
    }
  }

  const fetchPackages = async (deliveryId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('delivery_packages')
        .select('*')
        .eq('delivery_id', deliveryId)
      if (err) throw err
      packages.value = data || []
    } catch (e: any) {
      console.error('Fetch packages error:', e)
    }
  }

  const addTrackingEvent = async (
    deliveryId: string,
    eventType: string,
    lat?: number,
    lng?: number,
    notes?: string,
    photoUrl?: string
  ): Promise<string | null> => {
    try {
      const { data, error: err } = await supabase
        .rpc('add_delivery_tracking_event', {
          p_delivery_id: deliveryId,
          p_event_type: eventType,
          p_lat: lat,
          p_lng: lng,
          p_notes: notes,
          p_photo_url: photoUrl
        })
      if (err) throw err
      return data
    } catch (e: any) {
      console.error('Add tracking event error:', e)
      return null
    }
  }

  const fetchTimeline = async (deliveryId: string) => {
    try {
      const { data, error: err } = await supabase
        .rpc('get_delivery_timeline', { p_delivery_id: deliveryId })
      if (err) throw err
      trackingEvents.value = data || []
    } catch (e: any) {
      console.error('Fetch timeline error:', e)
    }
  }

  const submitInsuranceClaim = async (
    deliveryId: string,
    packageId: string | null,
    claimType: string,
    description: string,
    claimedAmount: number,
    photoUrls: string[] = []
  ): Promise<string | null> => {
    if (!authStore.user?.id) return null
    try {
      const { data, error: err } = await supabase
        .from('delivery_insurance_claims')
        .insert({
          delivery_id: deliveryId,
          package_id: packageId,
          user_id: authStore.user.id,
          claim_type: claimType,
          description,
          claimed_amount: claimedAmount,
          photo_urls: photoUrls
        })
        .select()
        .single()
      if (err) throw err
      return data.id
    } catch (e: any) {
      console.error('Submit claim error:', e)
      return null
    }
  }

  const init = async () => {
    await fetchPackageTypes()
  }

  return {
    loading, error, packageTypes, packages, trackingEvents,
    fetchPackageTypes, calculateFee, addPackage, fetchPackages,
    addTrackingEvent, fetchTimeline, submitInsuranceClaim, init
  }
}
