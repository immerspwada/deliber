/**
 * Result Type Utility
 * 
 * Provides a standardized way to handle success/error results
 * Inspired by Rust's Result type and functional programming patterns
 */

import type { AppError } from './errorHandling'

/**
 * Result type for operations that can succeed or fail
 */
export type Result<T, E = AppError> = 
  | { success: true; data: T }
  | { success: false; error: E }

/**
 * Create a successful result
 */
export function Ok<T>(data: T): Result<T> {
  return { success: true, data }
}

/**
 * Create an error result
 */
export function Err<E = AppError>(error: E): Result<never, E> {
  return { success: false, error }
}

/**
 * Check if result is successful
 */
export function isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success === true
}

/**
 * Check if result is an error
 */
export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false
}

/**
 * Map the success value of a result
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (isOk(result)) {
    return Ok(fn(result.data))
  }
  return result
}

/**
 * Map the error value of a result
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (isErr(result)) {
    return Err(fn(result.error))
  }
  return result
}

/**
 * Chain operations that return Results
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (isOk(result)) {
    return fn(result.data)
  }
  return result
}

/**
 * Provide a default value for error cases
 */
export function orElse<T, E>(
  result: Result<T, E>,
  defaultValue: T
): T {
  if (isOk(result)) {
    return result.data
  }
  return defaultValue
}

/**
 * Unwrap the result, throwing an error if it failed
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.data
  }
  throw result.error
}

/**
 * Unwrap the result with a custom error message
 */
export function expect<T, E>(result: Result<T, E>, message: string): T {
  if (isOk(result)) {
    return result.data
  }
  throw new Error(message)
}

/**
 * Convert a Promise to a Result
 */
export async function fromPromise<T>(
  promise: Promise<T>
): Promise<Result<T>> {
  try {
    const data = await promise
    return Ok(data)
  } catch (error) {
    return Err(error as AppError)
  }
}

/**
 * Combine multiple Results into one
 */
export function combine<T extends readonly unknown[]>(
  results: { [K in keyof T]: Result<T[K]> }
): Result<T> {
  const data: any[] = []
  
  for (const result of results) {
    if (isErr(result)) {
      return result
    }
    data.push(result.data)
  }
  
  return Ok(data as T)
}

/**
 * Execute multiple async operations and combine their results
 */
export async function combineAsync<T extends readonly unknown[]>(
  operations: { [K in keyof T]: () => Promise<Result<T[K]>> }
): Promise<Result<T>> {
  const results = await Promise.all(operations.map(op => op()))
  return combine(results)
}

/**
 * Filter successful results from an array
 */
export function filterOk<T, E>(results: Result<T, E>[]): T[] {
  return results
    .filter(isOk)
    .map(result => result.data)
}

/**
 * Filter error results from an array
 */
export function filterErr<T, E>(results: Result<T, E>[]): E[] {
  return results
    .filter(isErr)
    .map(result => result.error)
}

/**
 * Partition results into successes and errors
 */
export function partition<T, E>(
  results: Result<T, E>[]
): { successes: T[]; errors: E[] } {
  const successes: T[] = []
  const errors: E[] = []
  
  for (const result of results) {
    if (isOk(result)) {
      successes.push(result.data)
    } else {
      errors.push(result.error)
    }
  }
  
  return { successes, errors }
}

/**
 * Retry an operation that returns a Result
 */
export async function retry<T>(
  operation: () => Promise<Result<T>>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<Result<T>> {
  let lastError: AppError | undefined
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await operation()
    
    if (isOk(result)) {
      return result
    }
    
    lastError = result.error
    
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }
  
  return Err(lastError!)
}

/**
 * Execute operation with timeout
 */
export async function withTimeout<T>(
  operation: () => Promise<Result<T>>,
  timeoutMs: number
): Promise<Result<T>> {
  const timeoutPromise = new Promise<Result<T>>(resolve => {
    setTimeout(() => {
      resolve(Err(new Error(`Operation timed out after ${timeoutMs}ms`) as AppError))
    }, timeoutMs)
  })
  
  return Promise.race([operation(), timeoutPromise])
}

/**
 * Memoize a function that returns a Result
 */
export function memoize<T extends any[], R>(
  fn: (...args: T) => Result<R>,
  keyFn?: (...args: T) => string
): (...args: T) => Result<R> {
  const cache = new Map<string, Result<R>>()
  
  return (...args: T): Result<R> => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)!
    }
    
    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

/**
 * Async memoize for functions returning Promise<Result>
 */
export function memoizeAsync<T extends any[], R>(
  fn: (...args: T) => Promise<Result<R>>,
  keyFn?: (...args: T) => string,
  ttl?: number
): (...args: T) => Promise<Result<R>> {
  const cache = new Map<string, { result: Result<R>; timestamp: number }>()
  
  return async (...args: T): Promise<Result<R>> => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args)
    const now = Date.now()
    
    const cached = cache.get(key)
    if (cached && (!ttl || now - cached.timestamp < ttl)) {
      return cached.result
    }
    
    const result = await fn(...args)
    cache.set(key, { result, timestamp: now })
    return result
  }
}