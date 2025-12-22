/**
 * usePaymentSettings - Payment Settings Management
 * 
 * Feature: Payment Settings for Top-up
 * - Get PromptPay ID and bank info for customers
 * - Admin can update payment settings
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

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
  const authStore = useAuthStore()
  
  // State
  const settings = ref<PaymentSetting[]>([])
  const paymentInfo = ref<TopupPaymentInfo | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Get payment info for top-up (PromptPay ID, Bank info)
   */
  const fetchPaymentInfo = async (): Promise<TopupPaymentInfo | null> => {
    try {
      const { data, error: err } = await (supabase.rpc as any)('get_topup_payment_info')
      if (err) throw err
      if (data && data[0]) {
        paymentInfo.value = {
          promptpay_id: data[0].promptpay_id || '',
          promptpay_name: data[0].promptpay_name || '',
          bank_name: data[0].bank_name || '',
          bank_account_number: data[0].bank_account_number || '',
          bank_account_name: data[0].bank_account_name || '',
          min_amount: Number(data[0].min_amount) || 20,
          max_amount: Number(data[0].max_amount) || 50000
        }
        return paymentInfo.value
      }
      return null
    } catch (err) {
      console.error('Error fetching payment info:', err)
      return null
    }
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
    try {
      const { data, error: err } = await (supabase.rpc as any)('get_all_payment_settings')
      if (err) throw err
      settings.value = (data || []) as PaymentSetting[]
      return settings.value
    } catch (err) {
      console.error('Error fetching settings:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Update a payment setting (Admin)
   */
  const updateSetting = async (key: string, value: string): Promise<{ success: boolean; message: string }> => {
    if (!authStore.user?.id) return { success: false, message: 'กรุณาเข้าสู่ระบบ' }
    try {
      const { data, error: err } = await (supabase.rpc as any)('update_payment_setting', {
        p_key: key, p_value: value, p_admin_id: authStore.user.id
      })
      if (err) throw err
      if (data && data[0]) {
        if (data[0].success) await fetchAllSettings()
        return { success: data[0].success, message: data[0].message }
      }
      return { success: false, message: 'เกิดข้อผิดพลาด' }
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
