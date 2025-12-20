/**
 * Retry Utilities - Exponential Backoff and Retry Logic
 * Task: 12 - Implement retry and circuit breaker patterns
 * Requirements: 11.4
 */

import { AppError, isRetryableError, ErrorType } from './errorHandler'

export interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryableErrors?: ErrorType[]
  onRetry?: (attempt: number, error: any, delay: number) => void
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'retryableErrors'>> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2
}

/**
 * Execute a function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: any
  let delay = opts.initialDelay

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // Check if error is retryable
      const shouldRetry = 
        (error instanceof AppError && isRetryableError(error)) ||
        (opts.retryableErrors && error instanceof AppError && opts.retryableErrors.includes(error.type)) ||
        (error.message?.includes('network') || error.message?.includes('timeout'))

      if (!shouldRetry || attempt === opts.maxAttempts) {
        throw error
      }

      // Call onRetry callback
      if (opts.onRetry) {
        opts.onRetry(attempt, error, delay)
      }

      // Wait before retry
      await sleep(delay)

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay)
    }
  }

  throw lastError
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry decorator for class methods
 */
export function Retry(options: RetryOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      return withRetry(() => originalMethod.apply(this, args), options)
    }

    return descriptor
  }
}
