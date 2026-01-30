/**
 * useLoadingStates - Composable สำหรับจัดการ loading states แบบ centralized
 * 
 * Features:
 * - Track multiple loading states
 * - Automatic timeout
 * - Loading state history
 * - Performance monitoring
 */
import { ref, computed, readonly } from 'vue'

interface LoadingState {
  key: string
  startTime: number
  timeout?: number
}

export function useLoadingStates() {
  const loadingStates = ref<Map<string, LoadingState>>(new Map())
  const loadingHistory = ref<Array<{ key: string; duration: number }>>([])

  /**
   * Check if any loading state is active
   */
  const isLoading = computed(() => loadingStates.value.size > 0)

  /**
   * Check if specific key is loading
   */
  const isLoadingKey = (key: string): boolean => {
    return loadingStates.value.has(key)
  }

  /**
   * Get all active loading keys
   */
  const activeLoadingKeys = computed(() => {
    return Array.from(loadingStates.value.keys())
  })

  /**
   * Start loading for a specific key
   */
  const startLoading = (key: string, timeout?: number): void => {
    const state: LoadingState = {
      key,
      startTime: Date.now(),
      timeout
    }

    loadingStates.value.set(key, state)

    // Auto-stop after timeout
    if (timeout) {
      setTimeout(() => {
        if (loadingStates.value.has(key)) {
          console.warn(`[LoadingStates] Timeout for key: ${key}`)
          stopLoading(key)
        }
      }, timeout)
    }
  }

  /**
   * Stop loading for a specific key
   */
  const stopLoading = (key: string): void => {
    const state = loadingStates.value.get(key)
    
    if (state) {
      const duration = Date.now() - state.startTime
      
      // Track history
      loadingHistory.value.push({ key, duration })
      
      // Keep only last 10 entries
      if (loadingHistory.value.length > 10) {
        loadingHistory.value.shift()
      }

      // Log slow operations
      if (duration > 3000) {
        console.warn(`[LoadingStates] Slow operation: ${key} took ${duration}ms`)
      }

      loadingStates.value.delete(key)
    }
  }

  /**
   * Stop all loading states
   */
  const stopAllLoading = (): void => {
    loadingStates.value.forEach((_, key) => {
      stopLoading(key)
    })
  }

  /**
   * Get loading duration for a key
   */
  const getLoadingDuration = (key: string): number => {
    const state = loadingStates.value.get(key)
    return state ? Date.now() - state.startTime : 0
  }

  /**
   * Get average loading time from history
   */
  const getAverageLoadingTime = (key?: string): number => {
    const filtered = key
      ? loadingHistory.value.filter(h => h.key === key)
      : loadingHistory.value

    if (filtered.length === 0) return 0

    const total = filtered.reduce((sum, h) => sum + h.duration, 0)
    return Math.round(total / filtered.length)
  }

  /**
   * Wrap async function with loading state
   */
  const withLoading = async <T>(
    key: string,
    fn: () => Promise<T>,
    timeout = 30000
  ): Promise<T> => {
    startLoading(key, timeout)
    try {
      return await fn()
    } finally {
      stopLoading(key)
    }
  }

  return {
    // State
    isLoading: readonly(isLoading),
    activeLoadingKeys: readonly(activeLoadingKeys),
    loadingHistory: readonly(loadingHistory),

    // Methods
    isLoadingKey,
    startLoading,
    stopLoading,
    stopAllLoading,
    getLoadingDuration,
    getAverageLoadingTime,
    withLoading
  }
}
