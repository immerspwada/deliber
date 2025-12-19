/**
 * Feature: Role Switch - Customer to Provider
 * ให้ลูกค้าสามารถอัพเกรดเป็นผู้ให้บริการได้โดยใช้บัญชีเดิม
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface ProviderInfo {
  id: string
  type: string
  is_verified: boolean
  status: string
}

export interface UpgradeData {
  provider_type: 'driver' | 'rider' | 'delivery' | 'shopping' | 'moving' | 'laundry'
  vehicle_type?: string
  vehicle_plate?: string
  vehicle_color?: string
  license_number?: string
}

export function useRoleSwitch() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const providers = ref<ProviderInfo[]>([])
  const currentMode = ref<'customer' | 'provider'>('customer')

  // Check if user is also a provider
  const isAlsoProvider = computed(() => providers.value.length > 0)
  
  // Check if user has any verified provider account
  const hasVerifiedProvider = computed(() => 
    providers.value.some(p => p.is_verified && p.status === 'approved')
  )

  // Get available provider types for this user
  const availableProviderTypes = computed(() => 
    providers.value.filter(p => p.is_verified && p.status === 'approved')
  )

  // Check if user can switch to provider mode
  const checkProviderStatus = async () => {
    if (!authStore.user?.id) return

    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('can_switch_to_provider', {
        p_user_id: authStore.user.id
      })

      if (rpcError) throw rpcError

      if (data?.providers) {
        providers.value = data.providers
      }

      return data
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Upgrade customer to provider
  const upgradeToProvider = async (upgradeData: UpgradeData) => {
    if (!authStore.user?.id) {
      error.value = 'กรุณาเข้าสู่ระบบก่อน'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('upgrade_customer_to_provider', {
        p_user_id: authStore.user.id,
        p_provider_type: upgradeData.provider_type,
        p_vehicle_type: upgradeData.vehicle_type || null,
        p_vehicle_plate: upgradeData.vehicle_plate || null,
        p_vehicle_color: upgradeData.vehicle_color || null,
        p_license_number: upgradeData.license_number || null
      })

      if (rpcError) throw rpcError

      if (data?.success) {
        // Refresh provider status
        await checkProviderStatus()
      } else {
        error.value = data?.error || 'เกิดข้อผิดพลาด'
      }

      return data
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Switch between customer and provider mode
  const switchMode = (mode: 'customer' | 'provider') => {
    if (mode === 'provider' && !hasVerifiedProvider.value) {
      error.value = 'คุณยังไม่ได้รับการอนุมัติเป็นผู้ให้บริการ'
      return false
    }
    
    currentMode.value = mode
    localStorage.setItem('app_mode', mode)
    return true
  }

  // Initialize mode from localStorage
  const initMode = () => {
    const savedMode = localStorage.getItem('app_mode') as 'customer' | 'provider' | null
    if (savedMode && (savedMode === 'customer' || savedMode === 'provider')) {
      currentMode.value = savedMode
    }
  }

  // Get provider types that user hasn't registered yet
  const getUnregisteredTypes = () => {
    const allTypes = ['driver', 'rider', 'delivery', 'shopping', 'moving', 'laundry']
    const registeredTypes = providers.value.map(p => p.type)
    return allTypes.filter(t => !registeredTypes.includes(t))
  }

  return {
    loading,
    error,
    providers,
    currentMode,
    isAlsoProvider,
    hasVerifiedProvider,
    availableProviderTypes,
    checkProviderStatus,
    upgradeToProvider,
    switchMode,
    initMode,
    getUnregisteredTypes
  }
}
