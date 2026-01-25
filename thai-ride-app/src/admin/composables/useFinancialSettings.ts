/**
 * useFinancialSettings - Admin Financial Settings Composable
 * 
 * Manages commission rates, withdrawal settings, and top-up configuration
 * 
 * Features:
 * - Fetch/update commission rates
 * - Fetch/update withdrawal settings
 * - Fetch/update top-up settings
 * - Calculate commission impact
 * - Audit log tracking
 */

import { ref, computed, readonly } from 'vue'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/composables/useToast'
import type {
  FinancialSetting,
  CommissionRates,
  WithdrawalSettings,
  TopupSettings,
  SettingsAuditLog,
  CommissionImpact,
  DistanceRates
} from '@/types/financial-settings'

export function useFinancialSettings() {
  const toast = useToast()
  
  // State
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Settings
  const commissionRates = ref<CommissionRates | null>(null)
  const withdrawalSettings = ref<WithdrawalSettings | null>(null)
  const topupSettings = ref<TopupSettings | null>(null)
  const distanceRates = ref<DistanceRates | null>(null)
  const vehicleMultipliers = ref<{ bike: number; car: number; premium: number } | null>(null)
  const auditLog = ref<SettingsAuditLog[]>([])
  
  // Computed
  const hasCommissionRates = computed(() => commissionRates.value !== null)
  const hasWithdrawalSettings = computed(() => withdrawalSettings.value !== null)
  const hasTopupSettings = computed(() => topupSettings.value !== null)
  const hasDistanceRates = computed(() => distanceRates.value !== null)
  const hasVehicleMultipliers = computed(() => vehicleMultipliers.value !== null)
  
  /**
   * Fetch all financial settings
   */
  async function fetchSettings(category?: string) {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('get_financial_settings', {
        p_category: category || null
      })
      
      if (rpcError) throw rpcError
      
      // Parse settings by category
      if (data && Array.isArray(data)) {
        data.forEach((setting: FinancialSetting) => {
          if (setting.category === 'commission' && setting.key === 'service_rates') {
            commissionRates.value = setting.value as CommissionRates
          } else if (setting.category === 'withdrawal' && setting.key === 'limits') {
            withdrawalSettings.value = setting.value as WithdrawalSettings
          } else if (setting.category === 'topup' && setting.key === 'config') {
            topupSettings.value = setting.value as TopupSettings
          } else if (setting.category === 'pricing' && setting.key === 'distance_rates') {
            distanceRates.value = setting.value as DistanceRates
          } else if (setting.category === 'pricing' && setting.key === 'vehicle_multipliers') {
            vehicleMultipliers.value = setting.value as { bike: number; car: number; premium: number }
          }
        })
      }
      
      return data
    } catch (e) {
      const message = (e as Error).message
      error.value = message
      toast.error(message)
      return null
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Update commission rates
   */
  async function updateCommissionRates(rates: CommissionRates, reason?: string) {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('update_financial_setting', {
        p_category: 'commission',
        p_key: 'service_rates',
        p_value: rates,
        p_reason: reason || 'อัพเดทอัตราคอมมิชชั่น'
      })
      
      if (rpcError) throw rpcError
      
      if (data && data[0]?.success) {
        commissionRates.value = rates
        toast.success('อัพเดทอัตราคอมมิชชั่นสำเร็จ')
        return { success: true, message: data[0].message }
      }
      
      throw new Error('Failed to update commission rates')
    } catch (e) {
      const message = (e as Error).message
      error.value = message
      toast.error(message)
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Update withdrawal settings
   */
  async function updateWithdrawalSettings(settings: WithdrawalSettings, reason?: string) {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('update_financial_setting', {
        p_category: 'withdrawal',
        p_key: 'limits',
        p_value: settings,
        p_reason: reason || 'อัพเดทการตั้งค่าการถอนเงิน'
      })
      
      if (rpcError) throw rpcError
      
      if (data && data[0]?.success) {
        withdrawalSettings.value = settings
        toast.success('อัพเดทการตั้งค่าการถอนเงินสำเร็จ')
        return { success: true, message: data[0].message }
      }
      
      throw new Error('Failed to update withdrawal settings')
    } catch (e) {
      const message = (e as Error).message
      error.value = message
      toast.error(message)
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Update distance-based pricing rates
   */
  async function updateDistanceRates(rates: DistanceRates, reason?: string) {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('update_financial_setting', {
        p_category: 'pricing',
        p_key: 'distance_rates',
        p_value: rates,
        p_reason: reason || 'อัพเดทราคาบริการตามระยะทาง'
      })
      
      if (rpcError) throw rpcError
      
      if (data && data[0]?.success) {
        distanceRates.value = rates
        toast.success('อัพเดทราคาบริการสำเร็จ')
        return { success: true, message: data[0].message }
      }
      
      throw new Error('Failed to update distance rates')
    } catch (e) {
      const message = (e as Error).message
      error.value = message
      toast.error(message)
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Update top-up settings
   */
  async function updateTopupSettings(settings: TopupSettings, reason?: string) {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('update_financial_setting', {
        p_category: 'topup',
        p_key: 'config',
        p_value: settings,
        p_reason: reason || 'อัพเดทการตั้งค่าการเติมเงิน'
      })
      
      if (rpcError) throw rpcError
      
      if (data && data[0]?.success) {
        topupSettings.value = settings
        toast.success('อัพเดทการตั้งค่าการเติมเงินสำเร็จ')
        return { success: true, message: data[0].message }
      }
      
      throw new Error('Failed to update top-up settings')
    } catch (e) {
      const message = (e as Error).message
      error.value = message
      toast.error(message)
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Update vehicle multipliers
   */
  async function updateVehicleMultipliers(
    multipliers: { bike: number; car: number; premium: number },
    reason?: string
  ) {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('update_financial_setting', {
        p_category: 'pricing',
        p_key: 'vehicle_multipliers',
        p_value: multipliers,
        p_reason: reason || 'อัพเดทตัวคูณราคาตามประเภทรถ'
      })
      
      if (rpcError) throw rpcError
      
      if (data && data[0]?.success) {
        vehicleMultipliers.value = multipliers
        toast.success('อัพเดทตัวคูณราคาตามประเภทรถสำเร็จ')
        return { success: true, message: data[0].message }
      }
      
      throw new Error('Failed to update vehicle multipliers')
    } catch (e) {
      const message = (e as Error).message
      error.value = message
      toast.error(message)
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Calculate commission impact
   */
  async function calculateCommissionImpact(
    serviceType: string,
    newRate: number
  ): Promise<CommissionImpact | null> {
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('calculate_commission_impact', {
        p_service_type: serviceType,
        p_new_rate: newRate
      })
      
      if (rpcError) throw rpcError
      
      if (data && data.length > 0) {
        return {
          current_rate: Number(data[0].current_rate) || 0,
          new_rate: Number(data[0].new_rate) || 0,
          rate_change: Number(data[0].rate_change) || 0,
          estimated_monthly_impact: Number(data[0].estimated_monthly_impact) || 0,
          affected_providers: Number(data[0].affected_providers) || 0
        }
      }
      
      return null
    } catch (e) {
      // Error handled silently - return null for impact calculation
      return null
    }
  }
  
  /**
   * Fetch audit log
   */
  async function fetchAuditLog(category?: string, limit = 50) {
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('get_settings_audit_log', {
        p_category: category || null,
        p_limit: limit,
        p_offset: 0
      })
      
      if (rpcError) throw rpcError
      
      auditLog.value = data || []
      return data
    } catch (e) {
      // Error handled silently - return empty array
      auditLog.value = []
      return []
    }
  }
  
  /**
   * Format currency
   */
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
  }
  
  /**
   * Format percentage
   */
  function formatPercentage(value: number): string {
    return `${(value * 100).toFixed(1)}%`
  }
  
  /**
   * Validate commission rate
   */
  function validateCommissionRate(rate: number): { valid: boolean; message?: string } {
    if (rate < 0) {
      return { valid: false, message: 'อัตราคอมมิชชั่นต้องไม่ต่ำกว่า 0%' }
    }
    if (rate > 0.5) {
      return { valid: false, message: 'อัตราคอมมิชชั่นต้องไม่เกิน 50%' }
    }
    if (rate > 0.3) {
      return { valid: true, message: '⚠️ อัตราคอมมิชชั่นสูงกว่า 30% อาจส่งผลต่อความพึงพอใจของ Provider' }
    }
    return { valid: true }
  }
  
  /**
   * Validate withdrawal settings
   */
  function validateWithdrawalSettings(settings: WithdrawalSettings): { valid: boolean; message?: string } {
    if (settings.min_amount < 50) {
      return { valid: false, message: 'จำนวนเงินขั้นต่ำต้องไม่ต่ำกว่า 50 บาท' }
    }
    if (settings.max_amount > 100000) {
      return { valid: false, message: 'จำนวนเงินสูงสุดต้องไม่เกิน 100,000 บาท' }
    }
    if (settings.min_amount >= settings.max_amount) {
      return { valid: false, message: 'จำนวนเงินขั้นต่ำต้องน้อยกว่าจำนวนเงินสูงสุด' }
    }
    return { valid: true }
  }
  
  /**
   * Validate top-up settings
   */
  function validateTopupSettings(settings: TopupSettings): { valid: boolean; message?: string } {
    if (settings.min_amount < 10) {
      return { valid: false, message: 'จำนวนเงินขั้นต่ำต้องไม่ต่ำกว่า 10 บาท' }
    }
    if (settings.max_amount > 100000) {
      return { valid: false, message: 'จำนวนเงินสูงสุดต้องไม่เกิน 100,000 บาท' }
    }
    if (settings.min_amount >= settings.max_amount) {
      return { valid: false, message: 'จำนวนเงินขั้นต่ำต้องน้อยกว่าจำนวนเงินสูงสุด' }
    }
    return { valid: true }
  }
  
  return {
    // State (readonly)
    loading: readonly(loading),
    error: readonly(error),
    commissionRates: readonly(commissionRates),
    withdrawalSettings: readonly(withdrawalSettings),
    topupSettings: readonly(topupSettings),
    distanceRates: readonly(distanceRates),
    vehicleMultipliers: readonly(vehicleMultipliers),
    auditLog: readonly(auditLog),
    // Computed
    hasCommissionRates,
    hasWithdrawalSettings,
    hasTopupSettings,
    hasDistanceRates,
    hasVehicleMultipliers,
    // Methods
    fetchSettings,
    updateCommissionRates,
    updateWithdrawalSettings,
    updateTopupSettings,
    updateDistanceRates,
    updateVehicleMultipliers,
    calculateCommissionImpact,
    fetchAuditLog,
    // Helpers
    formatCurrency,
    formatPercentage,
    validateCommissionRate,
    validateWithdrawalSettings,
    validateTopupSettings
  }
}
