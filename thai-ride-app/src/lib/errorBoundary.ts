/**
 * Error Boundary Utilities
 * Global error handling for production
 */

import { logger } from '../utils/logger'
import { isProduction } from './envValidation'

export interface ErrorInfo {
  message: string
  stack?: string
  componentStack?: string
  timestamp: string
  url: string
  userAgent: string
  userId?: string
}

type ErrorHandler = (error: ErrorInfo) => void

const errorHandlers: ErrorHandler[] = []

/**
 * Register error handler
 */
export function registerErrorHandler(handler: ErrorHandler): () => void {
  errorHandlers.push(handler)
  return () => {
    const index = errorHandlers.indexOf(handler)
    if (index > -1) errorHandlers.splice(index, 1)
  }
}

/**
 * Report error to all handlers
 */
export function reportError(error: Error, componentStack?: string, userId?: string): void {
  const errorInfo: ErrorInfo = {
    message: error.message,
    stack: error.stack,
    componentStack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    userId
  }

  // Log locally
  logger.error('Application error:', errorInfo)

  // Call all registered handlers
  errorHandlers.forEach(handler => {
    try {
      handler(errorInfo)
    } catch (e) {
      console.error('Error handler failed:', e)
    }
  })
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers(): void {
  // Unhandled errors
  window.onerror = (message, source, lineno, colno, error) => {
    reportError(
      error || new Error(String(message)),
      `at ${source}:${lineno}:${colno}`
    )
    return false
  }

  // Unhandled promise rejections
  window.onunhandledrejection = (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason))
    reportError(error, 'Unhandled Promise Rejection')
  }

  // Vue error handler (set in main.ts)
  if (isProduction()) {
    logger.info('Global error handlers initialized')
  }
}

/**
 * Create error boundary wrapper
 */
export function withErrorBoundary<T extends (...args: any[]) => any>(
  fn: T,
  fallback?: (...args: Parameters<T>) => ReturnType<T>
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args)
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error: Error) => {
          reportError(error)
          if (fallback) return fallback(...args)
          throw error
        })
      }
      
      return result
    } catch (error) {
      reportError(error as Error)
      if (fallback) return fallback(...args)
      throw error
    }
  }) as T
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

/**
 * Safe async operation with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError = 'Operation timed out'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutError)), timeoutMs)
  })

  try {
    const result = await Promise.race([promise, timeoutPromise])
    clearTimeout(timeoutId!)
    return result
  } catch (error) {
    clearTimeout(timeoutId!)
    throw error
  }
}

/**
 * Retry failed operation
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000,
  backoff = 2
): Promise<T> {
  let lastError: Error | undefined
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt < maxRetries - 1) {
        const delay = delayMs * Math.pow(backoff, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}
