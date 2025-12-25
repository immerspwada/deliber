/**
 * Loading State Manager
 * Feature: F263 - Centralized Loading State Management
 * 
 * Manages loading states across the application with:
 * - Multiple concurrent loading states
 * - Automatic cleanup
 * - Minimum display time (prevent flashing)
 * - Loading priorities
 * - Scoped loading states
 */

import { ref, computed, watch } from 'vue'

export type LoadingPriority = 'low' | 'normal' | 'high' | 'critical'

interface LoadingState {
  id: string
  message?: string
  priority: LoadingPriority
  startTime: number
  minDuration: number
  scope?: string
}

// Global loading states
const loadingStates = ref<Map<string, LoadingState>>(new Map())
const minDisplayTime = 300 // Minimum 300ms to prevent flashing

// ID generator
let loadingIdCounter = 0
const generateId = () => `loading-${Date.now()}-${loadingIdCounter++}`

export function useLoadingState(scope?: string) {
  /**
   * Check if any loading is active
   */
  const isLoading = computed(() => {
    if (scope) {
      return Array.from(loadingStates.value.values()).some(
        state => state.scope === scope
      )
    }
    return loadingStates.value.size > 0
  })

  /**
   * Get highest priority loading state
   */
  const currentLoadingState = computed(() => {
    const states = Array.from(loadingStates.value.values())
    
    if (scope) {
      const scopedStates = states.filter(s => s.scope === scope)
      if (scopedStates.length === 0) return null
      return getHighestPriority(scopedStates)
    }
    
    if (states.length === 0) return null
    return getHighestPriority(states)
  })

  /**
   * Get loading message
   */
  const loadingMessage = computed(() => {
    return currentLoadingState.value?.message || 'กำลังโหลด...'
  })

  /**
   * Count of active loading states
   */
  const loadingCount = computed(() => {
    if (scope) {
      return Array.from(loadingStates.value.values()).filter(
        state => state.scope === scope
      ).length
    }
    return loadingStates.value.size
  })

  /**
   * Start loading
   */
  const startLoading = (
    message?: string,
    options: {
      priority?: LoadingPriority
      minDuration?: number
      scope?: string
    } = {}
  ): string => {
    const id = generateId()
    
    const state: LoadingState = {
      id,
      message,
      priority: options.priority || 'normal',
      startTime: Date.now(),
      minDuration: options.minDuration ?? minDisplayTime,
      scope: options.scope || scope
    }

    loadingStates.value.set(id, state)
    return id
  }

  /**
   * Stop loading
   */
  const stopLoading = async (id: string) => {
    const state = loadingStates.value.get(id)
    if (!state) return

    const elapsed = Date.now() - state.startTime
    const remaining = state.minDuration - elapsed

    // Wait for minimum duration if needed
    if (remaining > 0) {
      await new Promise(resolve => setTimeout(resolve, remaining))
    }

    loadingStates.value.delete(id)
  }

  /**
   * Clear all loading states (optionally by scope)
   */
  const clearAll = (targetScope?: string) => {
    if (targetScope) {
      const toDelete: string[] = []
      loadingStates.value.forEach((state, id) => {
        if (state.scope === targetScope) {
          toDelete.push(id)
        }
      })
      toDelete.forEach(id => loadingStates.value.delete(id))
    } else {
      loadingStates.value.clear()
    }
  }

  /**
   * Wrap async operation with loading state
   */
  const withLoading = async <T>(
    operation: () => Promise<T>,
    message?: string,
    options?: {
      priority?: LoadingPriority
      minDuration?: number
      scope?: string
    }
  ): Promise<T> => {
    const id = startLoading(message, options)
    
    try {
      const result = await operation()
      await stopLoading(id)
      return result
    } catch (error) {
      await stopLoading(id)
      throw error
    }
  }

  /**
   * Create scoped loading manager
   */
  const createScope = (scopeName: string) => {
    return useLoadingState(scopeName)
  }

  return {
    // State
    isLoading,
    loadingMessage,
    loadingCount,
    currentLoadingState,
    
    // Methods
    startLoading,
    stopLoading,
    clearAll,
    withLoading,
    createScope
  }
}

/**
 * Get highest priority loading state
 */
function getHighestPriority(states: LoadingState[]): LoadingState {
  const priorityOrder: Record<LoadingPriority, number> = {
    critical: 4,
    high: 3,
    normal: 2,
    low: 1
  }

  return states.reduce((highest, current) => {
    return priorityOrder[current.priority] > priorityOrder[highest.priority]
      ? current
      : highest
  })
}

/**
 * Composable for component-level loading
 */
export function useComponentLoading() {
  const loading = ref(false)
  const loadingMessage = ref<string>()

  const setLoading = (isLoading: boolean, message?: string) => {
    loading.value = isLoading
    loadingMessage.value = message
  }

  const withLoading = async <T>(
    operation: () => Promise<T>,
    message?: string
  ): Promise<T> => {
    setLoading(true, message)
    
    try {
      const result = await operation()
      setLoading(false)
      return result
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  return {
    loading,
    loadingMessage,
    setLoading,
    withLoading
  }
}

/**
 * Auto-cleanup on unmount
 */
export function useAutoCleanupLoading(scope: string) {
  const { startLoading, stopLoading, clearAll } = useLoadingState(scope)

  // Cleanup on unmount
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      clearAll(scope)
    })
  }

  return {
    startLoading,
    stopLoading,
    clearAll
  }
}
