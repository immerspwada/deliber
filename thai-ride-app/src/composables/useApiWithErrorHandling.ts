/**
 * Composable for API calls with centralized error handling
 * ใช้แทน direct Supabase calls เพื่อให้ error handling consistent
 */
import { ref, type Ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { apiService } from '@/services/apiService'

interface UseApiState<T> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
}

export function useApiWithErrorHandling<T>() {
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Execute API call with loading state and error handling
   */
  async function execute(
    operation: () => Promise<T>,
    options?: {
      showErrorToast?: boolean
      context?: string
      retryOnError?: boolean
    }
  ): Promise<T | null> {
    const { context, retryOnError = false } = options || {}
    
    loading.value = true
    error.value = null
    
    try {
      let result: T
      
      if (retryOnError) {
        result = await apiService.executeWithRetry(operation, { context })
      } else {
        result = await operation()
      }
      
      data.value = result
      return result
    } catch (err) {
      console.error(`[API Error${context ? ` - ${context}` : ''}]:`, err)
      error.value = err as Error
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Execute Supabase query
   */
  async function executeQuery<TResult = T>(
    queryFn: () => Promise<{ data: TResult | null; error: any }>,
    options?: {
      showErrorToast?: boolean
      context?: string
      timeout?: number
    }
  ): Promise<TResult | null> {
    return execute(
      () => apiService.executeQuery(queryFn, { 
        timeout: options?.timeout,
        context: options?.context 
      }),
      options
    ) as Promise<TResult | null>
  }

  /**
   * Execute Edge Function
   */
  async function executeFunction<TResult = T>(
    functionName: string,
    body?: Record<string, unknown>,
    options?: {
      showErrorToast?: boolean
      context?: string
      timeout?: number
    }
  ): Promise<TResult | null> {
    return execute(
      () => apiService.executeFunction<TResult>(functionName, body, {
        timeout: options?.timeout,
        context: options?.context
      }),
      options
    ) as Promise<TResult | null>
  }

  /**
   * Clear state
   */
  function clear(): void {
    data.value = null
    error.value = null
    loading.value = false
  }

  /**
   * Retry last operation
   */
  function retry(): void {
    if (error.value) {
      error.value = null
      // Note: This would need to store the last operation to retry
      // For now, just clear the error state
    }
  }

  return {
    data,
    loading,
    error,
    execute,
    executeQuery,
    executeFunction,
    clear,
    retry
  }
}

/**
 * Specialized hook for provider operations
 */
export function useProviderApi() {
  const api = useApiWithErrorHandling()
  
  async function acceptJob(jobId: string) {
    return api.executeFunction('job-acceptance', 
      { job_id: jobId },
      { context: 'AcceptJob', showErrorToast: true }
    )
  }
  
  async function completeJob(jobId: string, completionData: Record<string, unknown>) {
    return api.executeFunction('job-completion',
      { job_id: jobId, ...completionData },
      { context: 'CompleteJob', showErrorToast: true }
    )
  }
  
  async function requestWithdrawal(amount: number, bankAccountId?: string) {
    return api.executeFunction('withdrawal-request',
      { amount, bank_account_id: bankAccountId },
      { context: 'WithdrawalRequest', showErrorToast: true }
    )
  }
  
  return {
    ...api,
    acceptJob,
    completeJob,
    requestWithdrawal
  }
}

/**
 * Specialized hook for wallet operations
 */
export function useWalletApi() {
  const api = useApiWithErrorHandling()
  
  async function getBalance(userId: string) {
    return api.executeQuery(
      () => supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single(),
      { context: 'GetWalletBalance' }
    )
  }
  
  async function getTransactions(userId: string, limit = 20) {
    return api.executeQuery(
      () => supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit),
      { context: 'GetTransactions' }
    )
  }
  
  return {
    ...api,
    getBalance,
    getTransactions
  }
}