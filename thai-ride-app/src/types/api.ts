/**
 * API Type Definitions
 * 
 * Common types for API requests and responses
 */

import type { Result } from '../utils/result'
import type { ApiError } from '../composables/useApiQuery'

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data: T | null
  error: ApiError | null
  success: boolean
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  limit?: number
  offset?: number
}

/**
 * Sort parameters
 */
export interface SortParams {
  field: string
  direction: 'asc' | 'desc'
}

/**
 * Filter parameters
 */
export interface FilterParams {
  [key: string]: any
}

/**
 * Query parameters
 */
export interface QueryParams extends PaginationParams {
  sort?: SortParams | SortParams[]
  filter?: FilterParams
  search?: string
  include?: string[]
}

/**
 * Base entity with common fields
 */
export interface BaseEntity {
  id: string
  created_at: string
  updated_at?: string
}

/**
 * API request options
 */
export interface ApiRequestOptions {
  /** Request timeout in milliseconds */
  timeout?: number
  /** Retry attempts */
  retries?: number
  /** Retry delay in milliseconds */
  retryDelay?: number
  /** Custom headers */
  headers?: Record<string, string>
  /** Abort signal for cancellation */
  signal?: AbortSignal
}

/**
 * Batch request item
 */
export interface BatchRequestItem<T = any> {
  key: string
  request: () => Promise<T>
}

/**
 * Batch request result
 */
export interface BatchRequestResult<T extends Record<string, any>> {
  success: boolean
  data?: Partial<T>
  errors?: Partial<Record<keyof T, ApiError>>
}

/**
 * Type helper for API function return type
 */
export type ApiFunction<T> = () => Promise<Result<T, ApiError>>

/**
 * Type helper for API function with parameters
 */
export type ApiFunctionWithParams<TParams extends any[], TReturn> = 
  (...params: TParams) => Promise<Result<TReturn, ApiError>>

/**
 * Type helper for paginated API function
 */
export type PaginatedApiFunction<T> = (
  params: QueryParams
) => Promise<Result<PaginatedResponse<T>, ApiError>>

