/**
 * Feature: F38 - App Settings Management
 * Tables: app_settings
 * 
 * ระบบจัดการการตั้งค่าแอพ
 * - ค่าธรรมเนียมบริการ
 * - ระยะทางให้บริการ
 * - การตั้งค่า Surge Pricing
 * - การตั้งค่าทั่วไป
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export interface AppSettings {
  // Pricing
  baseFare: number
  perKmRate: number
  perMinuteRate: number
  minimumFare: number
  bookingFee: number
  
  // Delivery
  deliveryBaseFee: number
  deliveryPerKmRate: number
  
  // Shopping
  shoppingServiceFee: number
  shoppingPercentageFee: number
  
  // Service Area
  serviceAreaRadius: number
  maxPickupDistance: number
  
  // Provider
  providerCommissionRate: number
  minimumWithdrawal: number
  withdrawalFee: number
  
  // General
  supportPhone: string
  supportEmail: string
  appVersion: string
  maintenanceMode: boolean
}

const DEFAULT_SETTINGS: AppSettings = {
  baseFare: 35,
  perKmRate: 8,
  perMinuteRate: 2,
  minimumFare: 35,
  bookingFee: 10,
  deliveryBaseFee: 30,
  deliveryPerKmRate: 10,
  shoppingServiceFee: 50,
  shoppingPercentageFee: 5,
  serviceAreaRadius: 10,
  maxPickupDistance: 5,
  providerCommissionRate: 20,
  minimumWithdrawal: 100,
  withdrawalFee: 15,
  supportPhone: '02-xxx-xxxx',
  supportEmail: 'support@gobear.app',
  appVersion: '1.0.0',
  maintenanceMode: false
}

export function useAppSettings() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })

  const isDemoMode = () => localStorage.getItem('demo_mode') === 'true' || localStorage.getItem('admin_demo_mode') === 'true'

  // Fetch all settings
  const fetchSettings = async () => {
    loading.value = true
    error.value = null

    try {
      if (isDemoMode()) {
        // Load from localStorage if available
        const saved = localStorage.getItem('app_settings')
        if (saved) {
          settings.value = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
        }
        return settings.value
      }

      const { data, error: fetchError } = await supabase
        .from('app_settings')
        .select('key, value')

      if (fetchError) throw fetchError

      if (data) {
        const settingsObj: Partial<AppSettings> = {}
        data.forEach((row: { key: string; value: any }) => {
          const key = row.key as keyof AppSettings
          settingsObj[key] = row.value
        })
        settings.value = { ...DEFAULT_SETTINGS, ...settingsObj }
      }

      return settings.value
    } catch (e: any) {
      error.value = e.message
      return settings.value
    } finally {
      loading.value = false
    }
  }

  // Update a single setting
  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    loading.value = true
    error.value = null

    try {
      if (isDemoMode()) {
        settings.value[key] = value
        localStorage.setItem('app_settings', JSON.stringify(settings.value))
        return true
      }

      const { error: upsertError } = await (supabase
        .from('app_settings') as any)
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

      if (upsertError) throw upsertError

      settings.value[key] = value
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Update multiple settings
  const updateSettings = async (updates: Partial<AppSettings>) => {
    loading.value = true
    error.value = null

    try {
      if (isDemoMode()) {
        settings.value = { ...settings.value, ...updates }
        localStorage.setItem('app_settings', JSON.stringify(settings.value))
        return true
      }

      const upsertData = Object.entries(updates).map(([key, value]) => ({
        key,
        value,
        updated_at: new Date().toISOString()
      }))

      const { error: upsertError } = await (supabase
        .from('app_settings') as any)
        .upsert(upsertData, { onConflict: 'key' })

      if (upsertError) throw upsertError

      settings.value = { ...settings.value, ...updates }
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Reset to defaults
  const resetToDefaults = async () => {
    return updateSettings(DEFAULT_SETTINGS)
  }

  // Calculate fare
  const calculateFare = (distanceKm: number, durationMin: number, rideType: string = 'standard') => {
    const s = settings.value
    let fare = s.baseFare + (distanceKm * s.perKmRate) + (durationMin * s.perMinuteRate) + s.bookingFee
    
    // Apply ride type multiplier
    if (rideType === 'premium') fare *= 1.5
    if (rideType === 'moto') fare *= 0.7
    
    return Math.max(fare, s.minimumFare)
  }

  // Calculate delivery fee
  const calculateDeliveryFee = (distanceKm: number) => {
    const s = settings.value
    return s.deliveryBaseFee + (distanceKm * s.deliveryPerKmRate)
  }

  // Calculate shopping fee
  const calculateShoppingFee = (itemsCost: number) => {
    const s = settings.value
    return s.shoppingServiceFee + (itemsCost * s.shoppingPercentageFee / 100)
  }

  // Calculate provider earnings
  const calculateProviderEarnings = (fare: number) => {
    const s = settings.value
    return fare * (1 - s.providerCommissionRate / 100)
  }

  return {
    loading,
    error,
    settings,
    fetchSettings,
    updateSetting,
    updateSettings,
    resetToDefaults,
    calculateFare,
    calculateDeliveryFee,
    calculateShoppingFee,
    calculateProviderEarnings,
    DEFAULT_SETTINGS
  }
}
