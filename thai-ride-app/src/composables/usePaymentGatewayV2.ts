/**
 * usePaymentGatewayV2 - Payment Gateway Integration
 * Feature: F211 - Payment Gateway
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface PaymentMethod {
  id: string
  user_id: string
  type: 'credit_card' | 'debit_card' | 'bank_transfer' | 'promptpay' | 'truemoney'
  provider: string
  last_four?: string
  brand?: string
  is_default: boolean
  is_verified: boolean
}

export interface PaymentTransaction {
  id: string
  user_id: string
  ride_id?: string
  amount: number
  currency: string
  method_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
}

export function usePaymentGatewayV2() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const methods = ref<PaymentMethod[]>([])
  const transactions = ref<PaymentTransaction[]>([])

  const defaultMethod = computed(() => methods.value.find(m => m.is_default))
  const verifiedMethods = computed(() => methods.value.filter(m => m.is_verified))

  const fetchMethods = async (userId: string) => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('payment_methods').select('*').eq('user_id', userId).order('is_default', { ascending: false })
      if (err) throw err
      methods.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const addMethod = async (method: Partial<PaymentMethod>): Promise<PaymentMethod | null> => {
    try {
      const { data, error: err } = await supabase.from('payment_methods').insert({ ...method, is_verified: false } as never).select().single()
      if (err) throw err
      methods.value.push(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const setDefaultMethod = async (methodId: string, userId: string): Promise<boolean> => {
    try {
      await supabase.from('payment_methods').update({ is_default: false } as never).eq('user_id', userId)
      const { error: err } = await supabase.from('payment_methods').update({ is_default: true } as never).eq('id', methodId)
      if (err) throw err
      methods.value.forEach(m => m.is_default = m.id === methodId)
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const processPayment = async (userId: string, amount: number, methodId: string, rideId?: string): Promise<PaymentTransaction | null> => {
    try {
      const { data, error: err } = await supabase.from('payment_transactions').insert({ user_id: userId, amount, currency: 'THB', method_id: methodId, ride_id: rideId, status: 'pending' } as never).select().single()
      if (err) throw err
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const getMethodTypeText = (t: string) => ({ credit_card: 'บัตรเครดิต', debit_card: 'บัตรเดบิต', bank_transfer: 'โอนเงิน', promptpay: 'พร้อมเพย์', truemoney: 'TrueMoney' }[t] || t)
  const getStatusText = (s: string) => ({ pending: 'รอดำเนินการ', processing: 'กำลังดำเนินการ', completed: 'สำเร็จ', failed: 'ล้มเหลว', refunded: 'คืนเงินแล้ว' }[s] || s)

  return { loading, error, methods, transactions, defaultMethod, verifiedMethods, fetchMethods, addMethod, setDefaultMethod, processPayment, getMethodTypeText, getStatusText }
}
