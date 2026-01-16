/**
 * API Service with Centralized Error Handling
 * Wraps Supabase calls with consistent error handling
 */
import { supabase } from '@/lib/supabase'
import { 
  handleSupabaseError, 
  parseEdgeFunctionError, 
  type AppError,
  ErrorCode,
  createAppError
} from '@/utils/errorHandler'

interface ApiOptions {
  timeout?: number
  retries?: number
  context?: string
}

export class ApiService {
  private static instance: ApiService
  private defaultTimeout = 10000 // 10 seconds
  private defaultRetries = 3

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService()
    }
    return ApiService.instance
  }

  /**
   * Execute Supabase query with error handling
   */
  async executeQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    options: ApiOptions = {}
  ): Promise<T> {
    const { timeout = this.defaultTimeout, context = 'ApiService' } = options
    
    try {
      // Add timeout to query
      const queryPromise = queryFn()
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      })
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise])
      
      if (error) {
        throw handleSupabaseError(error, context)
      }
      
      if (data === null) {
        throw createAppError(ErrorCode.NOT_FOUND, 'No data returned', {}, context)
      }
      
      return data
    } catch (error) {
      if (error instanceof Error && error.message === 'Request timeout') {
        throw createAppError(ErrorCode.TIMEOUT_ERROR, 'Request timeout', {}, context)
      }
      
      // Re-throw AppError as-is
      if (error && typeof error === 'object' && 'code' in error && 'userMessage' in error) {
        throw error
      }
      
      // Convert other errors
      throw handleSupabaseError(error, context)
    }
  }

  /**
   * Execute Edge Function with error handling
   */
  async executeFunction<T>(
    functionName: string,
    body?: Record<string, unknown>,
    options: ApiOptions = {}
  ): Promise<T> {
    const { timeout = this.defaultTimeout, context = `EdgeFunction:${functionName}` } = options
    
    try {
      const functionPromise = supabase.functions.invoke(functionName, { body })
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      })
      
      const { data, error } = await Promise.race([functionPromise, timeoutPromise])
      
      if (error) {
        throw handleSupabaseError(error, context)
      }
      
      // Check for Edge Function specific errors
      if (data && typeof data === 'object' && 'error' in data) {
        throw parseEdgeFunctionError(data)
      }
      
      return data as T
    } catch (error) {
      if (error instanceof Error && error.message === 'Request timeout') {
        throw createAppError(ErrorCode.TIMEOUT_ERROR, 'Request timeout', {}, context)
      }
      
      // Re-throw AppError as-is
      if (error && typeof error === 'object' && 'code' in error && 'userMessage' in error) {
        throw error
      }
      
      throw handleSupabaseError(error, context)
    }
  }

  /**
   * Execute with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: ApiOptions = {}
  ): Promise<T> {
    const { retries = this.defaultRetries, context = 'RetryOperation' } = options
    
    let lastError: AppError | null = null
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        const appError = error as AppError
        lastError = appError
        
        // Don't retry certain error types
        const nonRetryableErrors = [
          ErrorCode.AUTH_ERROR,
          ErrorCode.PERMISSION_DENIED,
          ErrorCode.VALIDATION_ERROR,
          ErrorCode.NOT_FOUND,
          ErrorCode.DUPLICATE_REQUEST
        ]
        
        if (nonRetryableErrors.includes(appError.code)) {
          throw appError
        }
        
        // Don't retry on last attempt
        if (attempt === retries) {
          throw appError
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        console.warn(`[${context}] Attempt ${attempt} failed, retrying in ${delay}ms:`, appError.message)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError || createAppError(ErrorCode.UNKNOWN, 'All retry attempts failed')
  }

  /**
   * Check network connectivity
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        .single()
      
      return !error
    } catch {
      return false
    }
  }

  /**
   * Get current user with error handling
   */
  async getCurrentUser(): Promise<any> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        throw handleSupabaseError(error, 'GetCurrentUser')
      }
      
      if (!user) {
        throw createAppError(ErrorCode.AUTH_ERROR, 'No authenticated user')
      }
      
      return user
    } catch (error) {
      throw handleSupabaseError(error, 'GetCurrentUser')
    }
  }
}

// Export singleton instance
export const apiService = ApiService.getInstance()

// Convenience functions
export const executeQuery = apiService.executeQuery.bind(apiService)
export const executeFunction = apiService.executeFunction.bind(apiService)
export const executeWithRetry = apiService.executeWithRetry.bind(apiService)