// @ts-nocheck
/**
 * usePaymentGateway - Payment Gateway Integration
 * 
 * Feature: F08 - Payment Gateway Integration
 * Tables: payment_gateways, payment_transactions, payment_refunds
 * Migration: 060_payment_gateway.sql
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface PaymentGateway {
  id: string
  name: string
  display_name: string
  display_name_th: string
  gateway_type: 'card' | 'bank_transfer' | 'ewallet' | 'qr' | 'cash'
  provider: string
  min_amount: number
  max_amount: number
  fee_type: 'fixed' | 'percentage' | 'mixed'
  fee_fixed: number
  fee_percentage: number
  is_active: boolean
  sort_order: number
  icon_url?: string
}

export interface PaymentTransaction {
  id: string
  user_id: string
  gateway_name: string
  request_id?: string
  request_type?: string
  amount: number
  currency: string
  fee_amount: number
  net_amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded'
  gateway_transaction_id?: string
  card_last_four?: string
  card_brand?: string
  description?: string
  paid_at?: string
  failed_at?: string
  failure_reason?: string
  created_at: string
}

export interface RefundRequest {
  id: string
  transaction_id: string
  amount: number
  reason: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected'
  admin_notes?: string
  processed_at?: string
  created_at: string
}

export function usePaymentGateway() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // State
  const gateways = ref<PaymentGateway[]>([])
  const transactions = ref<PaymentTransaction[]>([])
  const currentTransaction = ref<PaymentTransaction | null>(null)
  const refunds = ref<RefundRequest[]>([])

  // Computed
  const activeGateways = computed(() => 
    gateways.value.filter(g => g.is_active).sort((a, b) => a.sort_order - b.sort_order)
  )

  const gatewaysByType = computed(() => {
    const grouped: Record<string, PaymentGateway[]> = {}
    activeGateways.value.forEach(g => {
      if (!grouped[g.gateway_type]) grouped[g.gateway_type] = []
      grouped[g.gateway_type].push(g)
    })
    return grouped
  })

  // Fetch available gateways
  const fetchGateways = async () => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      
      if (err) throw err
      gateways.value = data || []
    } catch (e: any) {
      error.value = e.message
      // Default gateways
      gateways.value = [
        { id: '1', name: 'wallet', display_name: 'ThaiRide Wallet', display_name_th: 'กระเป๋าเงิน', gateway_type: 'ewallet', provider: 'internal', min_amount: 1, max_amount: 100000, fee_type: 'fixed', fee_fixed: 0, fee_percentage: 0, is_active: true, sort_order: 0 },
        { id: '2', name: 'promptpay', display_name: 'PromptPay', display_name_th: 'พร้อมเพย์', gateway_type: 'qr', provider: 'promptpay', min_amount: 1, max_amount: 100000, fee_type: 'fixed', fee_fixed: 0, fee_percentage: 0, is_active: true, sort_order: 1 },
        { id: '3', name: 'credit_card', display_name: 'Credit Card', display_name_th: 'บัตรเครดิต', gateway_type: 'card', provider: 'omise', min_amount: 20, max_amount: 100000, fee_type: 'percentage', fee_fixed: 0, fee_percentage: 0.029, is_active: true, sort_order: 2 },
        { id: '4', name: 'cash', display_name: 'Cash', display_name_th: 'เงินสด', gateway_type: 'cash', provider: 'internal', min_amount: 1, max_amount: 10000, fee_type: 'fixed', fee_fixed: 0, fee_percentage: 0, is_active: true, sort_order: 5 }
      ]
    } finally {
      loading.value = false
    }
  }

  // Calculate fee for gateway
  const calculateFee = (gatewayName: string, amount: number): number => {
    const gateway = gateways.value.find(g => g.name === gatewayName)
    if (!gateway) return 0
    
    if (gateway.fee_type === 'fixed') return gateway.fee_fixed
    if (gateway.fee_type === 'percentage') return amount * gateway.fee_percentage
    return gateway.fee_fixed + (amount * gateway.fee_percentage)
  }

  // Create payment transaction
  const createTransaction = async (
    gatewayName: string,
    amount: number,
    requestId?: string,
    requestType?: string,
    description?: string
  ) => {
    loading.value = true
    error.value = null
    
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')
      
      const { data, error: err } = await (supabase.rpc as any)('create_payment_transaction', {
        p_user_id: userData.user.id,
        p_gateway_name: gatewayName,
        p_amount: amount,
        p_request_id: requestId,
        p_request_type: requestType,
        p_description: description
      })
      
      if (err) throw err
      
      // Fetch the created transaction
      const { data: txData } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', data)
        .single()
      
      currentTransaction.value = txData
      return { success: true, transactionId: data, transaction: txData }
    } catch (e: any) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // Process payment (simulate gateway interaction)
  const processPayment = async (
    transactionId: string,
    paymentDetails?: Record<string, any>
  ) => {
    loading.value = true
    
    try {
      // In real implementation, this would call the actual payment gateway
      // For now, simulate success
      
      const gatewayTransactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const { data, error: err } = await (supabase.rpc as any)('complete_payment', {
        p_transaction_id: transactionId,
        p_gateway_transaction_id: gatewayTransactionId,
        p_gateway_response: paymentDetails || {}
      })
      
      if (err) throw err
      
      return { success: true, gatewayTransactionId }
    } catch (e: any) {
      // Mark as failed
      await (supabase.rpc as any)('fail_payment', {
        p_transaction_id: transactionId,
        p_reason: e.message,
        p_gateway_response: {}
      })
      
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // Pay with wallet
  const payWithWallet = async (
    amount: number,
    requestId?: string,
    requestType?: string,
    description?: string
  ) => {
    const result = await createTransaction('wallet', amount, requestId, requestType, description)
    if (!result.success) return result
    
    // Get current user
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return { success: false, error: 'Not authenticated' }
    }
    
    // Check wallet balance - use maybeSingle() to avoid 406 error when wallet doesn't exist
    const { data: walletData } = await supabase
      .from('user_wallets')
      .select('balance')
      .eq('user_id', userData.user.id)
      .maybeSingle()
    
    if (!walletData || (walletData.balance || 0) < amount) {
      await (supabase.rpc as any)('fail_payment', {
        p_transaction_id: result.transactionId,
        p_reason: 'ยอดเงินในกระเป๋าไม่เพียงพอ'
      })
      return { success: false, error: 'ยอดเงินในกระเป๋าไม่เพียงพอ' }
    }
    
    // Deduct from wallet and complete (reuse userData from above)
    await (supabase.rpc as any)('add_wallet_transaction', {
      p_user_id: userData.user.id,
      p_amount: -amount,
      p_type: 'payment',
      p_description: description || 'ชำระเงิน'
    })
    
    return await processPayment(result.transactionId!)
  }

  // Fetch user transactions
  const fetchTransactions = async (limit: number = 20) => {
    loading.value = true
    
    try {
      const { data, error: err } = await supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (err) throw err
      transactions.value = data || []
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // Request refund
  const requestRefund = async (
    transactionId: string,
    amount: number,
    reason: string
  ) => {
    loading.value = true
    
    try {
      const { data, error: err } = await (supabase.rpc as any)('request_refund', {
        p_transaction_id: transactionId,
        p_amount: amount,
        p_reason: reason
      })
      
      if (err) throw err
      return { success: true, refundId: data }
    } catch (e: any) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // Fetch refunds
  const fetchRefunds = async () => {
    try {
      const { data, error: err } = await supabase
        .from('payment_refunds')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (err) throw err
      refunds.value = data || []
    } catch (e: any) {
      error.value = e.message
    }
  }

  // Admin: Process refund
  const processRefund = async (
    refundId: string,
    approved: boolean,
    notes?: string
  ) => {
    loading.value = true
    
    try {
      const { data: userData } = await supabase.auth.getUser()
      
      const { data, error: err } = await (supabase.rpc as any)('process_refund', {
        p_refund_id: refundId,
        p_admin_id: userData.user?.id,
        p_approved: approved,
        p_notes: notes
      })
      
      if (err) throw err
      return { success: true }
    } catch (e: any) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // Get gateway icon
  const getGatewayIcon = (gatewayName: string): string => {
    const icons: Record<string, string> = {
      wallet: '💳',
      promptpay: '📱',
      credit_card: '💳',
      truemoney: '🟠',
      mobile_banking: '🏦',
      cash: '💵'
    }
    return icons[gatewayName] || '💰'
  }

  // Format gateway display name
  const getGatewayDisplayName = (gatewayName: string, useThai: boolean = true): string => {
    const gateway = gateways.value.find(g => g.name === gatewayName)
    if (!gateway) return gatewayName
    return useThai ? gateway.display_name_th : gateway.display_name
  }

  return {
    // State
    loading,
    error,
    gateways,
    transactions,
    currentTransaction,
    refunds,
    
    // Computed
    activeGateways,
    gatewaysByType,
    
    // Methods
    fetchGateways,
    calculateFee,
    createTransaction,
    processPayment,
    payWithWallet,
    fetchTransactions,
    requestRefund,
    fetchRefunds,
    processRefund,
    getGatewayIcon,
    getGatewayDisplayName
  }
}
