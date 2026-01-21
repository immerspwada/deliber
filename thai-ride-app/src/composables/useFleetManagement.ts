/**
 * useFleetManagement - Fleet Management System
 * Feature: F191 - Fleet Management
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface FleetVehicle {
  id: string
  provider_id: string
  vehicle_id: string
  fleet_id: string
  assigned_at: string
  status: 'active' | 'maintenance' | 'inactive'
  provider?: { first_name: string; last_name: string }
  vehicle?: { license_plate: string; brand: string; model: string }
}

export interface Fleet {
  id: string
  name: string
  name_th: string
  description?: string
  manager_id?: string
  vehicle_count: number
  active_count: number
  zone_id?: string
  is_active: boolean
  created_at: string
}

export function useFleetManagement() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const fleets = ref<Fleet[]>([])
  const fleetVehicles = ref<FleetVehicle[]>([])

  const activeFleets = computed(() => fleets.value.filter(f => f.is_active))
  const totalVehicles = computed(() => fleets.value.reduce((sum, f) => sum + f.vehicle_count, 0))
  const totalActive = computed(() => fleets.value.reduce((sum, f) => sum + f.active_count, 0))

  const fetchFleets = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('fleets').select('*').order('name')
      if (err) throw err
      fleets.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchFleetVehicles = async (fleetId: string) => {
    try {
      const { data, error: err } = await supabase.from('fleet_vehicles').select('*, provider:service_providers(user_id), vehicle:provider_vehicles(license_plate, brand, model)').eq('fleet_id', fleetId)
      if (err) throw err
      fleetVehicles.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const createFleet = async (fleet: Partial<Fleet>): Promise<Fleet | null> => {
    try {
      const { data, error: err } = await supabase.from('fleets').insert({ ...fleet, vehicle_count: 0, active_count: 0 } as never).select().single()
      if (err) throw err
      fleets.value.push(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const updateFleet = async (id: string, updates: Partial<Fleet>): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('fleets').update(updates as never).eq('id', id)
      if (err) throw err
      const idx = fleets.value.findIndex(f => f.id === id)
      if (idx !== -1) fleets.value[idx] = { ...fleets.value[idx], ...updates }
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const deleteFleet = async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('fleets').delete().eq('id', id)
      if (err) throw err
      fleets.value = fleets.value.filter(f => f.id !== id)
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const assignVehicleToFleet = async (fleetId: string, providerId: string, vehicleId: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('fleet_vehicles').insert({ fleet_id: fleetId, provider_id: providerId, vehicle_id: vehicleId, status: 'active' } as never)
      if (err) throw err
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const removeVehicleFromFleet = async (fleetVehicleId: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('fleet_vehicles').delete().eq('id', fleetVehicleId)
      if (err) throw err
      fleetVehicles.value = fleetVehicles.value.filter(fv => fv.id !== fleetVehicleId)
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  return { loading, error, fleets, fleetVehicles, activeFleets, totalVehicles, totalActive, fetchFleets, fetchFleetVehicles, createFleet, updateFleet, deleteFleet, assignVehicleToFleet, removeVehicleFromFleet }
}
