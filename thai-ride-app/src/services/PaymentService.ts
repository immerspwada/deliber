/**
 * Payment Service (F08)
 * 
 * Business logic layer for payment operations
 */

import { BaseService } from './BaseService'
import { PaymentRepository } from '../repositories/PaymentRepository'
import { UserRepository } from '../repositories/UserRepository'
import type { Result } from '../utils/result'
import type { PaymentInsert, PaymentMethod } from '../repositories/PaymentRepository'

export interface ProcessPaymentRequest {
  userId: string
  requestId: string
  requestType: 'ride' | 'delivery' | 'shopping'
  amount: number
  paymentMethodId?: string
  paymentMethod: string
  metadata?: Record<string, any>
}

export interface PaymentResult {
  paymentId: string
  transactionId?: string
  status: 'completed' | 'pending' | 'failed'
  message?: string
}

export class PaymentService extends BaseService {
  private paymentRepository: PaymentRepository
  private userRepository: UserRepository

  constructor() {
    super('PaymentService')
    this.paymentRepository = new PaymentRepository()
    this.userRepository = new UserRepository()
  }

  /**
   * Process a payment
   */
  async processPayment(request: ProcessPaymentRequest): Promise<Result<PaymentResult>> {
    return this.execute(async () => {
      // Validate user exists and is active
      const userResult = await this.userRepository.findById(request.userId)
      if (!userResult.success || !userResult.data) {
        throw new Error('User not found or inactive')
      }

      const user = userResult.data
      if (!user.is_active) {
        throw new Error('User account is not active')
      }

      // Validate amount
      if (request.amount <= 0) {
        throw new Error('Invalid payment amount')
      }

      // Create payment record
      const paymentData: PaymentInsert = {
        user_id: request.userId,
        request_id: request.requestId,
        request_type: request.requestType,
        amount: request.amount,
        payment_method: request.paymentMethod,
        status: 'pending',
        metadata: request.metadata
      }

      const createResult = await this.paymentRepository.create(paymentData)
      if (!createResult.success) {
        throw new Error('Failed to create payment record')
      }

      const payment = createResult.data

      try {
        // Process payment based on method
        const paymentResult = await this.processPaymentByMethod(
          payment.id,
          request.paymentMethod,
          request.amount,
          request.paymentMethodId,
          request.metadata
        )

        // Update payment status
        await this.paymentRepository.updatePaymentStatus(
          payment.id,
          paymentResult.status,
          paymentResult.transactionId,
          paymentResult.metadata
        )

        this.log('info', 'Payment processed', { 
          paymentId: payment.id, 
          status: paymentResult.status,
          amount: request.amount 
        })

        return {
          paymentId: payment.id,
          transactionId: paymentResult.transactionId,
          status: paymentResult.status,
          message: paymentResult.message
        }
      } catch (error) {
        // Update payment as failed
        await this.paymentRepository.updatePaymentStatus(
          payment.id,
          'failed',
          undefined,
          { error: (error as Error).message }
        )

        throw error
      }
    }, 'processPayment', { userId: request.userId, amount: request.amount })
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    paymentId: string,
    amount?: number,
    reason?: string
  ): Promise<Result<{ refundId: string; status: string }>> {
    return this.execute(async () => {
      // Get original payment
      const paymentResult = await this.paymentRepository.findById(paymentId)
      if (!paymentResult.success || !paymentResult.data) {
        throw new Error('Payment not found')
      }

      const payment = paymentResult.data

      if (payment.status !== 'completed') {
        throw new Error('Can only refund completed payments')
      }

      const refundAmount = amount || payment.amount

      if (refundAmount > payment.amount) {
        throw new Error('Refund amount cannot exceed original payment amount')
      }

      // Process refund based on original payment method
      const refundResult = await this.processRefundByMethod(
        payment.payment_method,
        payment.transaction_id || '',
        refundAmount,
        reason
      )

      // Create refund record as negative payment
      const refundData: PaymentInsert = {
        user_id: payment.user_id,
        request_id: payment.request_id,
        request_type: payment.request_type,
        amount: -refundAmount,
        payment_method: payment.payment_method,
        payment_provider: payment.payment_provider,
        transaction_id: refundResult.transactionId,
        status: refundResult.status,
        metadata: {
          original_payment_id: paymentId,
          refund_reason: reason,
          ...refundResult.metadata
        }
      }

      const createResult = await this.paymentRepository.create(refundData)
      if (!createResult.success) {
        throw new Error('Failed to create refund record')
      }

      this.log('info', 'Payment refunded', { 
        paymentId, 
        refundId: createResult.data.id,
        amount: refundAmount 
      })

      return {
        refundId: createResult.data.id,
        status: refundResult.status
      }
    }, 'refundPayment', { paymentId, amount })
  }

  /**
   * Add payment method for user
   */
  async addPaymentMethod(
    userId: string,
    paymentMethod: Omit<PaymentMethod, 'id' | 'user_id' | 'created_at'>
  ): Promise<Result<PaymentMethod>> {
    return this.execute(async () => {
      // Validate user exists
      const userResult = await this.userRepository.findById(userId)
      if (!userResult.success || !userResult.data) {
        throw new Error('User not found')
      }

      // Validate payment method data
      if (!paymentMethod.type || !paymentMethod.provider || !paymentMethod.token) {
        throw new Error('Invalid payment method data')
      }

      const methodData = {
        ...paymentMethod,
        user_id: userId
      }

      const result = await this.paymentRepository.addPaymentMethod(methodData)
      if (!result.success) {
        throw new Error('Failed to add payment method')
      }

      this.log('info', 'Payment method added', { userId, type: paymentMethod.type })

      return result.data
    }, 'addPaymentMethod', { userId })
  }

  /**
   * Get user payment methods
   */
  async getUserPaymentMethods(userId: string): Promise<Result<PaymentMethod[]>> {
    return this.execute(async () => {
      const result = await this.paymentRepository.getUserPaymentMethods(userId)
      if (!result.success) {
        throw new Error('Failed to get payment methods')
      }

      return result.data
    }, 'getUserPaymentMethods', { userId })
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(
    methodId: string,
    updates: Partial<PaymentMethod>
  ): Promise<Result<PaymentMethod>> {
    return this.execute(async () => {
      const result = await this.paymentRepository.updatePaymentMethod(methodId, updates)
      if (!result.success) {
        throw new Error('Failed to update payment method')
      }

      this.log('info', 'Payment method updated', { methodId })

      return result.data
    }, 'updatePaymentMethod', { methodId })
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(methodId: string): Promise<Result<boolean>> {
    return this.execute(async () => {
      const result = await this.paymentRepository.deletePaymentMethod(methodId)
      if (!result.success) {
        throw new Error('Failed to delete payment method')
      }

      this.log('info', 'Payment method deleted', { methodId })

      return true
    }, 'deletePaymentMethod', { methodId })
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(options?: {
    startDate?: string
    endDate?: string
    userId?: string
  }): Promise<Result<any>> {
    return this.execute(async () => {
      const result = await this.paymentRepository.getPaymentStats(options)
      if (!result.success) {
        throw new Error('Failed to get payment statistics')
      }

      return result.data
    }, 'getPaymentStats', options)
  }

  /**
   * Process payment by specific method
   */
  private async processPaymentByMethod(
    paymentId: string,
    method: string,
    amount: number,
    paymentMethodId?: string,
    metadata?: Record<string, any>
  ): Promise<{
    status: 'completed' | 'pending' | 'failed'
    transactionId?: string
    message?: string
    metadata?: Record<string, any>
  }> {
    switch (method) {
      case 'cash':
        return this.processCashPayment(paymentId, amount)
      
      case 'promptpay':
        return this.processPromptPayPayment(paymentId, amount, metadata)
      
      case 'credit_card':
        return this.processCreditCardPayment(paymentId, amount, paymentMethodId, metadata)
      
      case 'mobile_banking':
        return this.processMobileBankingPayment(paymentId, amount, metadata)
      
      case 'wallet':
        return this.processWalletPayment(paymentId, amount, metadata)
      
      default:
        throw new Error(`Unsupported payment method: ${method}`)
    }
  }

  /**
   * Process cash payment
   */
  private async processCashPayment(
    paymentId: string,
    amount: number
  ): Promise<{ status: 'completed'; transactionId: string }> {
    // Cash payments are immediately completed
    return {
      status: 'completed',
      transactionId: `CASH-${paymentId}-${Date.now()}`
    }
  }

  /**
   * Process PromptPay payment
   */
  private async processPromptPayPayment(
    paymentId: string,
    amount: number,
    metadata?: Record<string, any>
  ): Promise<{ status: 'pending' | 'completed'; transactionId: string }> {
    // Mock PromptPay processing
    // In real implementation, this would integrate with PromptPay API
    
    const transactionId = `PP-${paymentId}-${Date.now()}`
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Mock success (90% success rate)
    const isSuccess = Math.random() > 0.1
    
    return {
      status: isSuccess ? 'completed' : 'pending',
      transactionId
    }
  }

  /**
   * Process credit card payment
   */
  private async processCreditCardPayment(
    paymentId: string,
    amount: number,
    paymentMethodId?: string,
    metadata?: Record<string, any>
  ): Promise<{ status: 'completed' | 'failed'; transactionId?: string; message?: string }> {
    // Mock credit card processing
    // In real implementation, this would integrate with payment gateway
    
    if (!paymentMethodId) {
      throw new Error('Payment method ID required for credit card payments')
    }
    
    const transactionId = `CC-${paymentId}-${Date.now()}`
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mock success (95% success rate)
    const isSuccess = Math.random() > 0.05
    
    if (isSuccess) {
      return {
        status: 'completed',
        transactionId
      }
    } else {
      return {
        status: 'failed',
        message: 'Credit card declined'
      }
    }
  }

  /**
   * Process mobile banking payment
   */
  private async processMobileBankingPayment(
    paymentId: string,
    amount: number,
    metadata?: Record<string, any>
  ): Promise<{ status: 'pending' | 'completed'; transactionId: string }> {
    // Mock mobile banking processing
    const transactionId = `MB-${paymentId}-${Date.now()}`
    
    // Mobile banking usually requires user confirmation
    return {
      status: 'pending',
      transactionId
    }
  }

  /**
   * Process wallet payment
   */
  private async processWalletPayment(
    paymentId: string,
    amount: number,
    metadata?: Record<string, any>
  ): Promise<{ status: 'completed' | 'failed'; transactionId?: string; message?: string }> {
    // Mock wallet payment processing
    // In real implementation, this would check wallet balance and deduct
    
    const transactionId = `WALLET-${paymentId}-${Date.now()}`
    
    // Mock wallet balance check (assume sufficient balance 90% of the time)
    const hasSufficientBalance = Math.random() > 0.1
    
    if (hasSufficientBalance) {
      return {
        status: 'completed',
        transactionId
      }
    } else {
      return {
        status: 'failed',
        message: 'Insufficient wallet balance'
      }
    }
  }

  /**
   * Process refund by method
   */
  private async processRefundByMethod(
    method: string,
    originalTransactionId: string,
    amount: number,
    reason?: string
  ): Promise<{
    status: 'completed' | 'pending' | 'failed'
    transactionId?: string
    metadata?: Record<string, any>
  }> {
    // Mock refund processing
    // In real implementation, this would integrate with respective payment providers
    
    const refundTransactionId = `REFUND-${originalTransactionId}-${Date.now()}`
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Most refunds are successful
    const isSuccess = Math.random() > 0.05
    
    return {
      status: isSuccess ? 'completed' : 'failed',
      transactionId: isSuccess ? refundTransactionId : undefined,
      metadata: {
        original_transaction_id: originalTransactionId,
        refund_reason: reason
      }
    }
  }
}