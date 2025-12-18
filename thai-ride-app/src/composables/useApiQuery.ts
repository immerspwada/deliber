/**
 * Base Composable for API Queries
 * 
 * Provides standardized error handling, loading states, and data management
 * for all API calls across the application.
 * 
 * Features:
 * - Automatic loading state management
 * - Standardized error handling
 * - Request deduplication support
 * - Caching support
 * - Retry mechanism
 */

import { ref, computed } from 'vue'
import { useRequestDedup } from './useRequestDedup'
import { logger } from '../utils/logger'
import { captureError } from '../lib/sentry'

/**
 * Result type for API operations
 * Provides type-safe success/error handling
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }

/**
 * API Error with additional context
 */
export interface ApiError {
  message: string
  code?: string
  statusCode?: number
  details?: unknown
}

/**
 * Options for API query execution
 */
export interface ApiQueryOptions {
  /** Use request deduplication (default: true) */
  deduplicate?: boolean
  /** Cache key for deduplication */
  cacheKey?: string
  /** Cache TTL in milliseconds (default: 30000) */
  cacheTtl?: number
  /** Force refresh, bypass cache */
  forceRefresh?: boolean
  /** Retry attempts on failure (default: 0) */
  retries?: number
  /** Retry delay in milliseconds (default: 1000) */
  retryDelay?: number
  /** Show error toast (default: false) */
  showErrorToast?: boolean
  /** Custom error message */
  errorMessage?: string
  /** Skip error logging to Sentry */
  skipErrorLogging?: boolean
}

/**
 * Base API Query Composable
 * 
 * @example
 * ```ts
 * const { loading, error, data, execute, reset } = useApiQuery<User>()
 * 
 * const fetchUser = async (id: string) => {
 *   await execute(
 *     () => supabase.from('users').select('*').eq('id', id).single(),
 *     { cacheKey: `user_${id}`, cacheTtl: 60000 }
 *   )
 * }
 * ```
 */
export function useApiQuery<T = any>() {
  const loading = ref(false)
  const error = ref<ApiError | null>(null)
  const data = ref<T | null>(null)
  
  const { dedupRequest } = useRequestDedup()

  /**
   * Check if query is in loading state
   */
  const isLoading = computed(() => loading.value)

  /**
   * Check if query has error
   */
  const hasError = computed(() => error.value !== null)

  /**
   * Check if query has data
   */
  const hasData = computed(() => data.value !== null)

  /**
   * Execute API query with standardized error handling
   */
  const execute = async (
    queryFn: () => Promise<T>,
    options: ApiQueryOptions = {}
  ): Promise<Result<T, ApiError>> => {
    const {
      deduplicate = true,
      cacheKey,
      cacheTtl = 30000,
      forceRefresh = false,
      retries = 0,
      retryDelay = 1000,
      showErrorToast = false,
      errorMessage,
      skipErrorLogging = false
    } = options

    // Reset error state
    error.value = null

    // Execute with retry logic
    const executeWithRetry = async (attempt: number): Promise<T> => {
      try {
        loading.value = true

        // Use request deduplication if enabled and cache key provided
        if (deduplicate && cacheKey) {
          const result = await dedupRequest(
            cacheKey,
            queryFn,
            { ttl: cacheTtl, forceRefresh }
          )
          data.value = result
          return result
        }

        // Execute query directly
        const result = await queryFn()
        data.value = result
        return result
      } catch (err: any) {
        // Retry logic
        if (attempt < retries) {
          logger.warn(`API query failed, retrying (${attempt + 1}/${retries})...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          return executeWithRetry(attempt + 1)
        }

        // Handle error
        const apiError: ApiError = {
          message: errorMessage || err.message || 'เกิดข้อผิดพลาดในการเรียก API',
          code: err.code,
          statusCode: err.statusCode,
          details: err
        }

        error.value = apiError

        // Log error
        if (!skipErrorLogging) {
          logger.error('API query failed:', apiError)
          captureError(new Error(apiError.message), {
            code: apiError.code,
            statusCode: apiError.statusCode,
            details: apiError.details
          })
        }

        // Show error toast if enabled
        if (showErrorToast) {
          // Import toast dynamically to avoid circular dependency
          const { useToast } = await import('./useToast')
          const toast = useToast()
          toast.error(apiError.message)
        }

        throw apiError
      } finally {
        loading.value = false
      }
    }

    try {
      const result = await executeWithRetry(0)
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err as ApiError }
    }
  }

  /**
   * Execute query and return data directly (throws on error)
   */
  const executeOrThrow = async (
    queryFn: () => Promise<T>,
    options: ApiQueryOptions = {}
  ): Promise<T> => {
    const result = await execute(queryFn, options)
    if (!result.success) {
      throw result.error
    }
    return result.data
  }

  /**
   * Reset all state
   */
  const reset = () => {
    loading.value = false
    error.value = null
    data.value = null
  }

  /**
   * Clear error only
   */
  const clearError = () => {
    error.value = null
  }

  /**
   * Set data manually (useful for optimistic updates)
   */
  const setData = (newData: T | null) => {
    data.value = newData
  }

  return {
    // State
    loading: isLoading,
    error: computed(() => error.value),
    data: computed(() => data.value),
    hasError,
    hasData,
    
    // Methods
    execute,
    executeOrThrow,
    reset,
    clearError,
    setData
  }
}

/**
 * Specialized composable for Supabase queries
 */
export function useSupabaseQuery<T = any>() {
  const baseQuery = useApiQuery<T>()

  /**
   * Execute Supabase query with automatic error extraction
   */
  const executeSupabase = async (
    queryFn: () => Promise<{ data: T | null; error: any }>,
    options: ApiQueryOptions = {}
  ): Promise<Result<T, ApiError>> => {
    return baseQuery.execute(async () => {
      const { data, error: supabaseError } = await queryFn()
      
      if (supabaseError) {
        const apiError: ApiError = {
          message: supabaseError.message || 'เกิดข้อผิดพลาดในการเรียกข้อมูล',
          code: supabaseError.code,
          details: supabaseError
        }
        throw apiError
      }

      if (data === null) {
        throw {
          message: 'ไม่พบข้อมูล',
          code: 'NOT_FOUND'
        } as ApiError
      }

      return data
    }, options)
  }

  return {
    ...baseQuery,
    executeSupabase
  }
}

/**
 * Composable for handling multiple parallel queries
 */
export function useParallelQueries<T extends Record<string, any>>() {
  const loading = ref(false)
  const errors = ref<Partial<Record<keyof T, ApiError>>>({})
  const data = ref<Partial<T>>({})

  const executeParallel = async (
    queries: {
      [K in keyof T]: () => Promise<T[K]>
    },
    _options: ApiQueryOptions = {}
  ): Promise<Result<T, Partial<Record<keyof T, ApiError>>>> => {
    loading.value = true
    errors.value = {}
    data.value = {}

    try {
      const results = await Promise.allSettled(
        Object.entries(queries).map(async ([key, queryFn]) => {
          try {
            const result = await queryFn()
            return { key, success: true as const, data: result }
          } catch (err: any) {
            return { 
              key, 
              success: false as const, 
              error: {
                message: err.message || 'เกิดข้อผิดพลาด',
                code: err.code,
                details: err
              } as ApiError
            }
          }
        })
      )

      // Process results
      const finalData = {} as T
      const finalErrors = {} as Partial<Record<keyof T, ApiError>>

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            finalData[result.value.key as keyof T] = result.value.data
            data.value[result.value.key as keyof T] = result.value.data
          } else {
            finalErrors[result.value.key as keyof T] = result.value.error
            errors.value[result.value.key as keyof T] = result.value.error
          }
        } else {
          // Promise rejected
          const key = (result.reason as any)?.key || 'unknown'
          const error: ApiError = {
            message: result.reason?.message || 'เกิดข้อผิดพลาด',
            details: result.reason
          }
          finalErrors[key as keyof T] = error
          errors.value[key as keyof T] = error
        }
      }

      const hasErrors = Object.keys(finalErrors).length > 0

      if (hasErrors) {
        return { success: false, error: finalErrors }
      }

      return { success: true, data: finalData }
    } finally {
      loading.value = false
    }
  }

  return {
    loading: computed(() => loading.value),
    errors: computed(() => errors.value),
    data: computed(() => data.value),
    executeParallel
  }
}

