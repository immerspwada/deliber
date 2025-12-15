import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import type { Payment, PaymentInsert } from '../types/database'

export type PaymentMethod = 'promptpay' | 'credit_card' | 'cash' | 'mobile_banking'

export interface PaymentMethodInfo {
  id: PaymentMethod
  name: string
  icon: string
  description: string
  enabled: boolean
}

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  {
    id: 'promptpay',
    name: 'พร้อมเพย์',
    icon: 'qr',
    description: 'สแกน QR Code เพื่อชำระเงิน',
    enabled: true
  },
  {
    id: 'mobile_banking',
    name: 'Mobile Banking',
    icon: 'phone',
    description: 'SCB Easy, K PLUS, Krungthai NEXT',
    enabled: true
  },
  {
    id: 'credit_card',
    name: 'บัตรเครดิต/เดบิต',
    icon: 'card',
    description: 'Visa, Mastercard, JCB',
    enabled: true
  },
  {
    id: 'cash',
    name: 'เงินสด',
    icon: 'cash',
    description: 'ชำระเงินสดกับผู้ให้บริการ',
    enabled: true
  }
]

export const usePaymentStore = defineStore('payment', () => {
  const currentPayment = ref<Payment | null>(null)
  const paymentHistory = ref<Payment[]>([])
  const selectedMethod = ref<PaymentMethod>('promptpay')
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Create payment record
  const createPayment = async (
    userId: string,
    requestType: 'ride' | 'delivery' | 'shopping',
    requestId: string,
    amount: number,
    method: PaymentMethod
  ) => {
    loading.value = true
    error.value = null
    
    try {
      const paymentData: PaymentInsert = {
        user_id: userId,
        request_type: requestType,
        request_id: requestId,
        amount,
        payment_method: method,
        status: 'pending'
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: insertError } = await (supabase as any)
        .from('payments')
        .insert(paymentData)
        .select()
        .single()
      
      if (insertError) {
        error.value = insertError.message
        return null
      }
      
      currentPayment.value = data
      return data
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    } finally {
      loading.value = false
    }
  }

  // Process payment (simulate payment gateway)
  const processPayment = async (paymentId: string): Promise<boolean> => {
    loading.value = true
    error.value = null
    
    try {
      // Update status to processing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('payments')
        .update({ status: 'processing' })
        .eq('id', paymentId)
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Generate transaction reference
      const transactionRef = `TH${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      
      // Update to completed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: updateError } = await (supabase as any)
        .from('payments')
        .update({ 
          status: 'completed',
          transaction_ref: transactionRef,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .select()
        .single()
      
      if (updateError) {
        error.value = updateError.message
        return false
      }
      
      currentPayment.value = data
      return true
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      
      // Mark as failed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', paymentId)
      
      return false
    } finally {
      loading.value = false
    }
  }

  // Request refund
  const requestRefund = async (paymentId: string, _reason: string): Promise<boolean> => {
    loading.value = true
    error.value = null
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: updateError } = await (supabase as any)
        .from('payments')
        .update({ 
          status: 'refunded',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .select()
        .single()
      
      if (updateError) {
        error.value = updateError.message
        return false
      }
      
      currentPayment.value = data
      return true
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return false
    } finally {
      loading.value = false
    }
  }

  // Fetch payment history
  const fetchPaymentHistory = async (userId: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (fetchError) {
        error.value = fetchError.message
        return []
      }
      
      paymentHistory.value = data || []
      return data || []
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return []
    } finally {
      loading.value = false
    }
  }

  // Generate PromptPay QR data
  const generatePromptPayQR = (amount: number, phoneNumber: string = '0812345678'): string => {
    // Simplified PromptPay QR format
    // In production, use proper EMVCo QR format
    return `00020101021129370016A000000677010111${phoneNumber.length.toString().padStart(2, '0')}${phoneNumber}5303764540${amount.toFixed(2).length.toString().padStart(2, '0')}${amount.toFixed(2)}5802TH6304`
  }

  // Format Thai Baht
  const formatThaiCurrency = (amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
  }

  // Generate receipt
  const generateReceipt = (payment: Payment) => {
    const vatRate = 0.07
    const subtotal = payment.amount / (1 + vatRate)
    const vat = payment.amount - subtotal
    
    return {
      receiptNumber: `RCP-${payment.id.slice(0, 8).toUpperCase()}`,
      date: new Date(payment.created_at || Date.now()).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: new Date(payment.created_at || Date.now()).toLocaleTimeString('th-TH'),
      subtotal: formatThaiCurrency(subtotal),
      vat: formatThaiCurrency(vat),
      total: formatThaiCurrency(payment.amount),
      transactionRef: payment.transaction_ref || '-',
      paymentMethod: PAYMENT_METHODS.find(m => m.id === payment.payment_method)?.name || payment.payment_method
    }
  }

  return {
    currentPayment,
    paymentHistory,
    selectedMethod,
    loading,
    error,
    createPayment,
    processPayment,
    requestRefund,
    fetchPaymentHistory,
    generatePromptPayQR,
    formatThaiCurrency,
    generateReceipt,
    PAYMENT_METHODS
  }
})
