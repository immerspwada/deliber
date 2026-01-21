/**
 * usePaymentSettings - Payment Settings Management
 * 
 * Feature: Payment Settings for Top-up
 * - Get PromptPay ID and bank info for customers
 * - Admin can update payment settings
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'

// =====================================================
// TYPES
// =====================================================

export interface PaymentSetting {
  id: string
  setting_key: string
  setting_value: string
  setting_label: string
  setting_label_th: string
  setting_type: 'text' | 'number' | 'boolean' | 'json'
  is_active: boolean
  updated_at: string
}

export interface TopupPaymentInfo {
  promptpay_id: string
  promptpay_name: string
  bank_name: string
  bank_account_number: string
  bank_account_name: string
  min_amount: number
  max_amount: number
}

// =====================================================
// COMPOSABLE
// =====================================================

export function usePaymentSettings() {
  // State
  const settings = ref<PaymentSetting[]>([])
  const paymentInfo = ref<TopupPaymentInfo | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Get current user ID from Supabase session
  const getCurrentUserId = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id || null
  }

  /**
   * Get payment info for top-up (PromptPay ID, Bank info)
   */
  const fetchPaymentInfo = async (): Promise<TopupPaymentInfo | null> => {
    try {
      console.log('[PaymentSettings] Fetching payment info...')
      
      // Try RPC first
      const { data, error: err } = await supabase.rpc('get_topup_payment_info')
      
      console.log('[PaymentSettings] RPC response:', { data, error: err })
      
      if (err) {
        console.error('[PaymentSettings] RPC error, trying direct query:', err)
        
        // Fallback to direct query
        const { data: directData, error: directErr } = await supabase
          .from('payment_settings')
          .select('setting_key, setting_value')
          .eq('is_active', true)
          .in('setting_key', ['promptpay_id', 'promptpay_name', 'bank_name', 'bank_account_number', 'bank_account_name', 'min_topup_amount', 'max_topup_amount'])
        
        if (directErr || !directData) {
          console.error('[PaymentSettings] Direct query also failed:', directErr)
          return getDefaultPaymentInfo()
        }
        
        // Convert array to object
        const settingsMap: Record<string, string> = {}
        directData.forEach((item: { setting_key: string; setting_value: string }) => {
          settingsMap[item.setting_key] = item.setting_value
        })
        
        paymentInfo.value = {
          promptpay_id: settingsMap.promptpay_id || '0812345678',
          promptpay_name: settingsMap.promptpay_name || 'บริษัท ไทยไรด์ จำกัด',
          bank_name: settingsMap.bank_name || 'ธนาคารกสิกรไทย',
          bank_account_number: settingsMap.bank_account_number || '123-4-56789-0',
          bank_account_name: settingsMap.bank_account_name || 'บริษัท ไทยไรด์ จำกัด',
          min_amount: Number(settingsMap.min_topup_amount) || 20,
          max_amount: Number(settingsMap.max_topup_amount) || 50000
        }
        console.log('[PaymentSettings] Loaded from direct query:', paymentInfo.value)
        return paymentInfo.value
      }
      
      // RPC returns array, get first row
      if (!data) {
        console.warn('[PaymentSettings] No data returned from RPC')
        return getDefaultPaymentInfo()
      }
      
      const dataArray = data as Array<Record<string, unknown>>
      const row = dataArray[0] as Record<string, unknown> | undefined
      
      if (row) {
        paymentInfo.value = {
          promptpay_id: (row.promptpay_id as string) || '0812345678',
          promptpay_name: (row.promptpay_name as string) || 'บริษัท ไทยไรด์ จำกัด',
          bank_name: (row.bank_name as string) || 'ธนาคารกสิกรไทย',
          bank_account_number: (row.bank_account_number as string) || '123-4-56789-0',
          bank_account_name: (row.bank_account_name as string) || 'บริษัท ไทยไรด์ จำกัด',
          min_amount: Number(row.min_amount) || 20,
          max_amount: Number(row.max_amount) || 50000
        }
        console.log('[PaymentSettings] Loaded from RPC:', paymentInfo.value)
        return paymentInfo.value
      }
      
      console.warn('[PaymentSettings] No data returned, using defaults')
      return getDefaultPaymentInfo()
    } catch (err) {
      console.error('[PaymentSettings] Error fetching payment info:', err)
      return getDefaultPaymentInfo()
    }
  }

  const getDefaultPaymentInfo = (): TopupPaymentInfo => {
    paymentInfo.value = {
      promptpay_id: '0812345678',
      promptpay_name: 'บริษัท ไทยไรด์ จำกัด',
      bank_name: 'ธนาคารกสิกรไทย',
      bank_account_number: '123-4-56789-0',
      bank_account_name: 'บริษัท ไทยไรด์ จำกัด',
      min_amount: 20,
      max_amount: 50000
    }
    return paymentInfo.value
  }

  /**
   * Get a single setting value
   */
  const getSetting = async (key: string): Promise<string | null> => {
    try {
      const { data, error: err } = await (supabase.rpc as any)('get_payment_setting', { p_key: key })
      if (err) throw err
      return data || null
    } catch (err) {
      console.error('Error getting setting:', err)
      return null
    }
  }

  /**
   * Fetch all payment settings (Admin)
   */
  const fetchAllSettings = async (): Promise<PaymentSetting[]> => {
    loading.value = true
    error.value = null
    
    try {
      console.log('[PaymentSettings] Fetching all settings...')
      
      // Try direct table query first (more reliable)
      const { data, error: queryErr } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('is_active', true)
        .order('created_at')
      
      if (queryErr) {
        console.error('[PaymentSettings] Direct query error:', queryErr)
        
        // Fallback to RPC
        const { data: rpcData, error: rpcErr } = await supabase.rpc('get_all_payment_settings')
        
        if (rpcErr) {
          console.error('[PaymentSettings] RPC error:', rpcErr)
          throw rpcErr
        }
        
        console.log('[PaymentSettings] RPC data:', rpcData)
        settings.value = (rpcData || []) as PaymentSetting[]
        return settings.value
      }
      
      console.log('[PaymentSettings] Direct query data:', data)
      settings.value = (data || []) as PaymentSetting[]
      return settings.value
    } catch (err) {
      console.error('[PaymentSettings] Error fetching settings:', err)
      error.value = 'ไม่สามารถโหลดข้อมูลได้'
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Update a payment setting (Admin)
   */
  const updateSetting = async (key: string, value: string): Promise<{ success: boolean; message: string }> => {
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, message: 'กรุณาเข้าสู่ระบบ' }
    try {
      // Try RPC first - use type assertion for custom RPC
      const { data, error: err } = await (supabase.rpc as Function)('update_payment_setting', {
        p_key: key, p_value: value, p_admin_id: userId
      })
      
      if (err) {
        console.log('[PaymentSettings] RPC update failed, trying direct update:', err)
        // Fallback to direct update - use any to bypass strict typing
        const updatePayload = { 
          setting_value: value, 
          updated_by: userId,
          updated_at: new Date().toISOString()
        }
        const { error: updateErr } = await (supabase
          .from('payment_settings')
          .update(updatePayload) as ReturnType<typeof supabase.from>['update'])
          .eq('setting_key', key)
        
        if (updateErr) throw updateErr
        await fetchAllSettings()
        return { success: true, message: 'อัพเดทการตั้งค่าสำเร็จ' }
      }
      
      if (data && (data as any)[0]) {
        if ((data as any)[0].success) await fetchAllSettings()
        return { success: (data as any)[0].success, message: (data as any)[0].message }
      }
      
      await fetchAllSettings()
      return { success: true, message: 'อัพเดทการตั้งค่าสำเร็จ' }
    } catch (err: any) {
      console.error('Error updating setting:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }
    }
  }

  const getSettingLabel = (key: string): string => {
    const labels: Record<string, string> = {
      promptpay_id: 'หมายเลขพร้อมเพย์',
      promptpay_name: 'ชื่อบัญชีพร้อมเพย์',
      bank_name: 'ชื่อธนาคาร',
      bank_account_number: 'เลขบัญชีธนาคาร',
      bank_account_name: 'ชื่อบัญชีธนาคาร',
      min_topup_amount: 'ยอดเติมเงินขั้นต่ำ',
      max_topup_amount: 'ยอดเติมเงินสูงสุด',
      topup_expiry_hours: 'คำขอหมดอายุ (ชั่วโมง)'
    }
    return labels[key] || key
  }

  return {
    settings,
    paymentInfo,
    loading,
    error,
    fetchPaymentInfo,
    getSetting,
    fetchAllSettings,
    updateSetting,
    getSettingLabel
  }
}
