/**
 * Feature: Role Switch - Customer to Provider
 * ให้ลูกค้าสามารถอัพเกรดเป็นผู้ให้บริการได้โดยใช้บัญชีเดิม
 * 
 * ใช้ Direct Insert แทน RPC function เพื่อความเสถียร
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

  // Check if user can switch to provider mode - ใช้ direct query แทน RPC
  const checkProviderStatus = async () => {
    if (!authStore.user?.id) return

    loading.value = true
    error.value = null

    try {
      // Query providers directly from database
      const { data: providerData, error: queryError } = await supabase
        .from('service_providers')
        .select('id, provider_type, is_verified, status')
        .eq('user_id', authStore.user.id)

      if (queryError) throw queryError

      // Map to ProviderInfo format
      providers.value = (providerData || []).map(p => ({
        id: p.id,
        type: p.provider_type,
        is_verified: p.is_verified || false,
        status: p.status || 'pending'
      }))

      const canSwitch = providers.value.some(p => p.is_verified && p.status === 'approved')

      return {
        can_switch: canSwitch,
        providers: providers.value
      }
    } catch (err: any) {
      console.error('[checkProviderStatus] Error:', err)
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Upgrade customer to provider - ใช้ direct insert แทน RPC
  const upgradeToProvider = async (upgradeData: UpgradeData) => {
    if (!authStore.user?.id) {
      error.value = 'กรุณาเข้าสู่ระบบก่อน'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const userId = authStore.user.id

      // Check if already registered for this type
      const { data: existing } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', userId)
        .eq('provider_type', upgradeData.provider_type)
        .single()

      if (existing) {
        error.value = 'คุณสมัครประเภทนี้แล้ว'
        return { success: false, error: 'คุณสมัครประเภทนี้แล้ว', provider_id: (existing as any).id }
      }

      // Create new provider record - use type assertion for flexibility
      const { data: newProvider, error: insertError } = await (supabase
        .from('service_providers') as any)
        .insert({
          user_id: userId,
          provider_type: upgradeData.provider_type,
          vehicle_type: upgradeData.vehicle_type || null,
          vehicle_plate: upgradeData.vehicle_plate || null,
          vehicle_color: upgradeData.vehicle_color || null,
          license_number: upgradeData.license_number || null,
          status: 'pending',
          is_verified: false,
          is_available: false,
          documents: {},
          rating: 5.0,
          total_trips: 0
        })
        .select('id')
        .single()

      if (insertError) {
        // Handle duplicate key error
        if (insertError.code === '23505') {
          error.value = 'คุณสมัครประเภทนี้แล้ว'
          return { success: false, error: 'คุณสมัครประเภทนี้แล้ว' }
        }
        throw insertError
      }

      // Create notification for user
      try {
        await (supabase.from('user_notifications') as any).insert({
          user_id: userId,
          type: 'system',
          title: 'สมัครเป็นผู้ให้บริการสำเร็จ',
          message: 'กรุณาอัพโหลดเอกสารเพื่อรอการอนุมัติ',
          action_url: '/provider/documents',
          is_read: false
        })
      } catch (notifErr) {
        console.warn('[upgradeToProvider] Notification insert failed:', notifErr)
        // Continue even if notification fails
      }

      // Refresh provider status
      await checkProviderStatus()

      return {
        success: true,
        provider_id: newProvider?.id || null,
        message: 'สมัครสำเร็จ กรุณาอัพโหลดเอกสาร'
      }
    } catch (err: any) {
      console.error('[upgradeToProvider] Error:', err)
      error.value = err.message || 'เกิดข้อผิดพลาด'
      return { success: false, error: err.message }
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
