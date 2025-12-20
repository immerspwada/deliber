/**
 * Production API Client
 * Centralized HTTP client with retry, timeout, and error handling
 */

import { productionConfig } from './productionConfig'

// ========================================
// Types
// ========================================

export interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
  timeout?: number
  retries?: number
  retryDelay?: number
  cache?: RequestCache
  signal?: AbortSignal
}

export interface ApiResponse<T = unknown> {
  data: T | null
  error: string | null
  status: number
  headers: Headers
  duration: number
}

export interface ApiError {
  message: string
  code: string
  status: number
  details?: unknown
}

// ========================================
// API Client Class
// ========================================

class ApiClient {
  private baseUrl: string
  private defaultTimeout: number
  private defaultRetries: number
  private defaultHeaders: Record<string, string>

  constructor() {
    this.baseUrl = productionConfig.api.baseUrl
    this.defaultTimeout = productionConfig.api.timeout
    this.defaultRetries = productionConfig.api.retryAttempts
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }

  /**
   * Set authorization token
   */
  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  /**
   * Remove authorization token
   */
  clearAuthToken(): void {
    delete this.defaultHeaders['Authorization']
  }

  /**
   * Make API request with retry and timeout
   */
  async request<T>(
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = 1000,
      cache = 'default',
      signal
    } = config

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`
    const startTime = performance.now()

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(url, {
          method,
          headers: { ...this.defaultHeaders, ...headers },
          body: body ? JSON.stringify(body) : undefined,
          cache,
          signal: signal || controller.signal
        })

        clearTimeout(timeoutId)

        const duration = performance.now() - startTime

        // Parse response
        let data: T | null = null
        const contentType = response.headers.get('content-type')
        
        if (contentType?.includes('application/json')) {
          data = await response.json()
        }

        // Handle error responses
        if (!response.ok) {
          const errorData = data as unknown as { message?: string; error?: string }
          return {
            data: null,
            error: errorData?.message || errorData?.error || `HTTP ${response.status}`,
            status: response.status,
            headers: response.headers,
            duration
          }
        }

        return {
          data,
          error: null,
          status: response.status,
          headers: response.headers,
          duration
        }

      } catch (error) {
        lastError = error as Error

        // Don't retry on abort
        if ((error as Error).name === 'AbortError') {
          break
        }

        // Wait before retry
        if (attempt < retries) {
          await this.delay(retryDelay * Math.pow(2, attempt))
        }
      }
    }

    const duration = performance.now() - startTime

    return {
      data: null,
      error: lastError?.message || 'Request failed',
      status: 0,
      headers: new Headers(),
      duration
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown, config?: Omit<ApiRequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body })
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: unknown, config?: Omit<ApiRequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body })
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: unknown, config?: Omit<ApiRequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body })
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' })
  }

  /**
   * Upload file
   */
  async upload<T>(
    endpoint: string,
    file: File,
    fieldName = 'file',
    additionalData?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append(fieldName, file)

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value)
      })
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`
    const startTime = performance.now()

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.defaultHeaders['Authorization'] || ''
        },
        body: formData
      })

      const duration = performance.now() - startTime
      const data = await response.json()

      if (!response.ok) {
        return {
          data: null,
          error: data?.message || `HTTP ${response.status}`,
          status: response.status,
          headers: response.headers,
          duration
        }
      }

      return {
        data,
        error: null,
        status: response.status,
        headers: response.headers,
        duration
      }
    } catch (error) {
      return {
        data: null,
        error: (error as Error).message,
        status: 0,
        headers: new Headers(),
        duration: performance.now() - startTime
      }
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ========================================
// Singleton Instance
// ========================================

export const apiClient = new ApiClient()

// ========================================
// Request Interceptors
// ========================================

/**
 * Add request logging in development
 */
export function enableRequestLogging(): void {
  const originalRequest = apiClient.request.bind(apiClient)
  
  apiClient.request = async function<T>(
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    console.log(`[API] ${config.method || 'GET'} ${endpoint}`)
    const response = await originalRequest<T>(endpoint, config)
    console.log(`[API] Response: ${response.status} (${response.duration.toFixed(0)}ms)`)
    return response
  }
}

// ========================================
// Error Helpers
// ========================================

/**
 * Check if error is network error
 */
export function isNetworkError(response: ApiResponse): boolean {
  return response.status === 0
}

/**
 * Check if error is authentication error
 */
export function isAuthError(response: ApiResponse): boolean {
  return response.status === 401 || response.status === 403
}

/**
 * Check if error is rate limit error
 */
export function isRateLimitError(response: ApiResponse): boolean {
  return response.status === 429
}

/**
 * Check if error is server error
 */
export function isServerError(response: ApiResponse): boolean {
  return response.status >= 500
}
