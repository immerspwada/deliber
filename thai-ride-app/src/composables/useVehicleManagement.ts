/**
 * useVehicleManagement - Vehicle Management System
 * Feature: F184 - Vehicle Management
 * Tables: provider_vehicles, vehicle_types
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface Vehicle {
  id: string
  provider_id: string
  vehicle_type_id: string
  license_plate: string
  brand: string
  model: string
  year: number
  color: string
  photo_url?: string
  insurance_expiry?: string
  registration_expiry?: string
  is_active: boolean
  is_verified: boolean
  verified_at?: string
  created_at: string
}

export interface VehicleType {
  id: string
  name: string
  name_th: string
  icon: string
  base_fare: number
  per_km_rate: number
  per_minute_rate: number
  min_fare: number
  max_passengers: number
  is_active: boolean
}

export function useVehicleManagement() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const vehicles = ref<Vehicle[]>([])
  const vehicleTypes = ref<VehicleType[]>([])

  const activeVehicles = computed(() => vehicles.value.filter(v => v.is_active))
  const verifiedVehicles = computed(() => vehicles.value.filter(v => v.is_verified))
  const pendingVerification = computed(() => vehicles.value.filter(v => !v.is_verified))

  const fetchVehicles = async (providerId?: string) => {
    loading.value = true
    try {
      let query = supabase.from('provider_vehicles').select('*, vehicle_type:vehicle_types(*)')
      if (providerId) query = query.eq('provider_id', providerId)
      const { data, error: err } = await query.order('created_at', { ascending: false })
      if (err) throw err
      vehicles.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchVehicleTypes = async () => {
    try {
      const { data, error: err } = await supabase
        .from('vehicle_types')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (err) throw err
      vehicleTypes.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const addVehicle = async (vehicle: Partial<Vehicle>): Promise<Vehicle | null> => {
    try {
      const { data, error: err } = await supabase
        .from('provider_vehicles')
        .insert(vehicle as never)
        .select()
        .single()
      if (err) throw err
      vehicles.value.unshift(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const updateVehicle = async (id: string, updates: Partial<Vehicle>): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('provider_vehicles')
        .update(updates as never)
        .eq('id', id)
      if (err) throw err
      const idx = vehicles.value.findIndex(v => v.id === id)
      if (idx !== -1) vehicles.value[idx] = { ...vehicles.value[idx], ...updates }
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const deleteVehicle = async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('provider_vehicles').delete().eq('id', id)
      if (err) throw err
      vehicles.value = vehicles.value.filter(v => v.id !== id)
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const verifyVehicle = async (id: string): Promise<boolean> => {
    return updateVehicle(id, { is_verified: true, verified_at: new Date().toISOString() })
  }

  const checkExpiringDocuments = computed(() => {
    const now = new Date()
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    return vehicles.value.filter(v => {
      const insurance = v.insurance_expiry ? new Date(v.insurance_expiry) : null
      const registration = v.registration_expiry ? new Date(v.registration_expiry) : null
      return (insurance && insurance <= thirtyDaysLater) || (registration && registration <= thirtyDaysLater)
    })
  })

  const getVehicleStats = computed(() => ({
    total: vehicles.value.length,
    active: activeVehicles.value.length,
    verified: verifiedVehicles.value.length,
    pending: pendingVerification.value.length,
    expiringSoon: checkExpiringDocuments.value.length
  }))

  return {
    loading, error, vehicles, vehicleTypes, activeVehicles, verifiedVehicles,
    pendingVerification, checkExpiringDocuments, getVehicleStats,
    fetchVehicles, fetchVehicleTypes, addVehicle, updateVehicle,
    deleteVehicle, verifyVehicle
  }
}
