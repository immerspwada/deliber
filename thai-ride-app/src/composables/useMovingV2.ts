// @ts-nocheck
/**
 * useMovingV2 - Enhanced Moving Service
 * Feature: F159 - Moving Service Features V2
 * Tables: moving_inventory_items, moving_crew, moving_job_assignments, moving_price_config
 * Migration: 075_moving_v2.sql
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface MovingInventoryItem {
  id: string
  moving_id: string
  item_name: string
  category: string
  quantity: number
  weight_kg?: number
  requires_disassembly: boolean
  is_fragile: boolean
  special_instructions?: string
  status: string
}

export interface MovingPriceResult {
  base_price: number
  distance_price: number
  floor_price: number
  item_price: number
  crew_price: number
  total_price: number
  breakdown: any
}

export function useMovingV2() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const inventory = ref<MovingInventoryItem[]>([])
  const priceConfig = ref<any[]>([])

  const totalWeight = computed(() => 
    inventory.value.reduce((sum, item) => sum + (item.weight_kg || 0) * item.quantity, 0)
  )

  const fragileItems = computed(() => inventory.value.filter(i => i.is_fragile))

  const fetchPriceConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('moving_price_config')
        .select('*')
        .eq('is_active', true)
      if (error) throw error
      priceConfig.value = data || []
    } catch (e) {
      console.error('Fetch price config error:', e)
    }
  }

  const calculatePrice = async (
    truckType: string,
    distanceKm: number,
    originFloor: number,
    destFloor: number,
    hasElevatorOrigin: boolean,
    hasElevatorDest: boolean,
    crewSize: number,
    estimatedHours: number
  ): Promise<MovingPriceResult | null> => {
    try {
      const { data, error } = await (supabase.rpc as any)('calculate_moving_price', {
        p_truck_type: truckType,
        p_distance_km: distanceKm,
        p_origin_floor: originFloor,
        p_dest_floor: destFloor,
        p_has_elevator_origin: hasElevatorOrigin,
        p_has_elevator_dest: hasElevatorDest,
        p_crew_size: crewSize,
        p_estimated_hours: estimatedHours
      })
      if (error) throw error
      return data?.[0] || null
    } catch (e) {
      console.error('Calculate price error:', e)
      return null
    }
  }

  const addInventoryItems = async (movingId: string, items: Partial<MovingInventoryItem>[]): Promise<number> => {
    try {
      const { data, error } = await (supabase.rpc as any)('add_moving_inventory', {
        p_moving_id: movingId,
        p_items: items
      })
      if (error) throw error
      await fetchInventory(movingId)
      return data || 0
    } catch (e) {
      console.error('Add inventory error:', e)
      return 0
    }
  }

  const fetchInventory = async (movingId: string) => {
    try {
      const { data, error } = await supabase
        .from('moving_inventory_items')
        .select('*')
        .eq('moving_id', movingId)
      if (error) throw error
      inventory.value = data || []
    } catch (e) {
      console.error('Fetch inventory error:', e)
    }
  }

  const updateItemStatus = async (itemId: string, status: string, damageNotes?: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('moving_inventory_items')
        .update({ status, damage_notes: damageNotes })
        .eq('id', itemId)
      if (error) throw error
      return true
    } catch (e) {
      console.error('Update item status error:', e)
      return false
    }
  }

  const init = async () => {
    await fetchPriceConfig()
  }

  return {
    loading, inventory, priceConfig, totalWeight, fragileItems,
    fetchPriceConfig, calculatePrice, addInventoryItems, fetchInventory, updateItemStatus, init
  }
}
