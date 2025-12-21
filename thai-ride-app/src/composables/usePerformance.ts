/**
 * Performance Optimization Composable
 * 
 * รวม utilities สำหรับปรับปรุงประสิทธิภาพ
 * - Debounce & Throttle
 * - Lazy Loading
 * - Memory Management
 * - Request Optimization
 */

import { ref, computed, Ref } from 'vue'
import { useAutoCleanup } from './useAutoCleanup'

// ===== DEBOUNCE & THROTTLE =====

/**
 * Debounce function - รอให้หยุดเรียกก่อนจะ execute
 */
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
): {
  debouncedFn: T
  cancel: () => void
  flush: () => void
} {
  const { addTimerCleanup } = useAutoCleanup()
  let timeoutId: NodeJS.Timeout | null = null
  let lastArgs: Parameters<T> | null = null

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  const flush = () => {
    if (timeoutId && lastArgs) {
      cancel()
      fn(...lastArgs)
    }
  }

  const debouncedFn = ((...args: Parameters<T>) => {
    lastArgs = args
    cancel()
    
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
    
    addTimerCleanup(timeoutId, 'timeout', 'Debounced function')
  }) as T

  return {
    debouncedFn,
    cancel,
    flush
  }
}

/**
 * Throttle function - จำกัดการเรียกให้ไม่เกินที่กำหนด
 */
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300,
  options: { leading?: boolean; trailing?: boolean } = { leading: true, trailing: true }
): {
  throttledFn: T
  cancel: () => void
  flush: () => void
} {
  const { addTimerCleanup } = useAutoCleanup()
  let timeoutId: NodeJS.Timeout | null = null
  let lastCallTime = 0
  let lastArgs: Parameters<T> | null = null

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  const flush = () => {
    if (timeoutId && lastArgs) {
      cancel()
      fn(...lastArgs)
    }
  }

  const throttledFn = ((...args: Parameters<T>) => {
    const now = Date.now()
    lastArgs = args

    if (lastCallTime === 0 && options.leading) {
      lastCallTime = now
      fn(...args)
      return
    }

    const remaining = delay - (now - lastCallTime)

    if (remaining <= 0) {
      if (timeoutId) {
        cancel()
      }
      lastCallTime = now
      fn(...args)
    } else if (!timeoutId && options.trailing) {
      timeoutId = setTimeout(() => {
        lastCallTime = options.leading ? Date.now() : 0
        timeoutId = null
        fn(...lastArgs!)
      }, remaining)
      
      addTimerCleanup(timeoutId, 'timeout', 'Throttled function')
    }
  }) as T

  return {
    throttledFn,
    cancel,
    flush
  }
}

/**
 * Main performance composable
 */
export function usePerformance() {
  return {
    useDebounce,
    useThrottle
  }
}