/**
 * Payment Repository (F08)
 * 
 * Data access layer for payment operations
 */

import { BaseRepository } from './BaseRepository'
import type { Result } from '../utils/result'

export interface Payment {
  id: string
  user_id: string
  request_id: string
  request_type: 'ride' | 'delivery' | 'shopping'
  amount: number
  payment_method: string
  payment_provider?: string
  transaction_id?: string
  status: string
  metadata?: Record<string, any>
  created_at: string
  updated_at?: string
}

export interface PaymentInsert {
  user_id: string
  request_id: string
  request_type: 'ride' | 'delivery' | 'shopping'
  amount: number
  payment_method: string
  payment_provider?: string
  transaction_id?: string
  status?: string
  metadata?: Record<string, any>
}

export interface PaymentMethod {
  id: string
  user_id: string
  type: string
  provider: string
  token: string
  last_four?: string
  expiry_month?: number
  expiry_year?: number
  is_default: boolean
  is_active: boolean
  created_at: string
}

export class PaymentRepository extends BaseRepository<Payment, PaymentInsert> {
  constructor() {
    super('payments', `
      *,
      user:user_id (id, name, phone_number, member_uid)
    `)
  }

  /**
   * Find payments for user
   */
  async findPaymentsForUser(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<Result<{ data: Payment[]; total: number }>> {
    return this.executeQuery(
      async (query) => {
        const { data, count, error } = await query
          .select(this.selectFields, { count: 'exact' })
          .eq('user_id', userId)
          .range((page - 1) * limit, page * limit - 1)
          .order('created_at', { ascending: false })

        if (error) throw error

        return {
          data: data || [],
          total: count || 0
        }
      },
      'findPaymentsForUser'
    )
  }

  /**
   * Find payment by transaction ID
   */
  async findByTransactionId(transactionId: string): Promise<Result<Payment | null>> {
    return this.executeQuery(
      (query) => query
        .select(this.selectFields)
        .eq('transaction_id', transactionId)
        .maybeSingle(),
      'findByTransactionId'
    )
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    paymentId: string,
    status: string,
    transactionId?: string,
    metadata?: Record<string, any>
  ): Promise<Result<Payment>> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (transactionId) {
      updateData.transaction_id = transactionId
    }

    if (metadata) {
      updateData.metadata = metadata
    }

    return this.update(paymentId, updateData)
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(options?: {
    startDate?: string
    endDate?: string
    userId?: string
  }): Promise<Result<{
    totalAmount: number
    totalTransactions: number
    successfulTransactions: number
    failedTransactions: number
    successRate: number
    averageAmount: number
    methodBreakdown: Array<{ method: string; count: number; amount: number }>
  }>> {
    return this.executeQuery(
      async (query) => {
        let baseQuery = query.select('amount, status, payment_method')
        
        if (options?.userId) {
          baseQuery = baseQuery.eq('user_id', options.userId)
        }
        if (options?.startDate) {
          baseQuery = baseQuery.gte('created_at', options.startDate)
        }
        if (options?.endDate) {
          baseQuery = baseQuery.lte('created_at', options.endDate)
        }

        const { data, error } = await baseQuery

        if (error) throw error

        const payments = data || []
        const totalTransactions = payments.length
        const successfulTransactions = payments.filter((p: any) => p.status === 'completed').length
        const failedTransactions = payments.filter((p: any) => p.status === 'failed').length
        const totalAmount = payments
          .filter((p: any) => p.status === 'completed')
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
        
        const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0
        const averageAmount = successfulTransactions > 0 ? totalAmount / successfulTransactions : 0

        // Method breakdown
        const methodMap = new Map<string, { count: number; amount: number }>()
        payments
          .filter((p: any) => p.status === 'completed')
          .forEach((p: any) => {
            const method = p.payment_method || 'unknown'
            const existing = methodMap.get(method) || { count: 0, amount: 0 }
            methodMap.set(method, {
              count: existing.count + 1,
              amount: existing.amount + (p.amount || 0)
            })
          })

        const methodBreakdown = Array.from(methodMap.entries()).map(([method, stats]) => ({
          method,
          count: stats.count,
          amount: stats.amount
        }))

        return {
          totalAmount,
          totalTransactions,
          successfulTransactions,
          failedTransactions,
          successRate: Math.round(successRate * 100) / 100,
          averageAmount: Math.round(averageAmount * 100) / 100,
          methodBreakdown
        }
      },
      'getPaymentStats'
    )
  }

  /**
   * Get user payment methods
   */
  async getUserPaymentMethods(userId: string): Promise<Result<PaymentMethod[]>> {
    return this.executeQuery(
      (query) => this.supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false }),
      'getUserPaymentMethods'
    )
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(paymentMethod: Omit<PaymentMethod, 'id' | 'created_at'>): Promise<Result<PaymentMethod>> {
    return this.executeQuery(
      async (query) => {
        // If this is set as default, unset other defaults
        if (paymentMethod.is_default) {
          await this.supabase
            .from('payment_methods')
            .update({ is_default: false })
            .eq('user_id', paymentMethod.user_id)
        }

        const { data, error } = await this.supabase
          .from('payment_methods')
          .insert(paymentMethod as any)
          .select()
          .single()

        if (error) throw error
        return data
      },
      'addPaymentMethod'
    )
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(
    methodId: string,
    updates: Partial<PaymentMethod>
  ): Promise<Result<PaymentMethod>> {
    return this.executeQuery(
      async (query) => {
        // If setting as default, unset other defaults for this user
        if (updates.is_default) {
          const { data: method } = await this.supabase
            .from('payment_methods')
            .select('user_id')
            .eq('id', methodId)
            .single()

          if (method) {
            await this.supabase
              .from('payment_methods')
              .update({ is_default: false })
              .eq('user_id', method.user_id)
          }
        }

        const { data, error } = await this.supabase
          .from('payment_methods')
          .update(updates as any)
          .eq('id', methodId)
          .select()
          .single()

        if (error) throw error
        return data
      },
      'updatePaymentMethod'
    )
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(methodId: string): Promise<Result<boolean>> {
    return this.executeQuery(
      async (query) => {
        const { error } = await this.supabase
          .from('payment_methods')
          .delete()
          .eq('id', methodId)

        if (error) throw error
        return true
      },
      'deletePaymentMethod'
    )
  }

  private get supabase() {
    // Access supabase through the base class
    return (this as any).supabase || require('../lib/supabase').supabase
  }
}