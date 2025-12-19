/**
 * useAdminCleanup - Universal cleanup composable for Admin views
 * 
 * ✅ Fixes memory leaks by providing cleanup utilities
 * ✅ Tracks subscriptions, timers, and cleanup functions
 * ✅ Auto-cleanup on unmount
 * 
 * Usage:
 * ```typescript
 * const { addCleanup, addSubscription, cleanup } = useAdminCleanup()
 * 
 * // Track realtime subscription
 * const channel = supabase.channel('my-channel')
 * addSubscription(channel)
 * 
 * // Track interval
 * const interval = setInterval(() => {}, 1000)
 * addCleanup(() => clearInterval(interval))
 * 
 * // Auto-cleanup on unmount
 * onUnmounted(() => cleanup())
 * ```
 */

import { onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useAdminCleanup() {
  // Track cleanup functions
  const cleanupFunctions: (() => void)[] = []
  
  // Track realtime subscriptions
  const subscriptions: RealtimeChannel[] = []
  
  // Track intervals
  const intervals: number[] = []
  
  // Track timeouts
  const timeouts: number[] = []

  /**
   * Add a custom cleanup function
   */
  const addCleanup = (fn: () => void) => {
    cleanupFunctions.push(fn)
  }

  /**
   * Add a realtime subscription to track
   */
  const addSubscription = (channel: RealtimeChannel) => {
    subscriptions.push(channel)
  }

  /**
   * Add an interval to track
   */
  const addInterval = (intervalId: number) => {
    intervals.push(intervalId)
  }

  /**
   * Add a timeout to track
   */
  const addTimeout = (timeoutId: number) => {
    timeouts.push(timeoutId)
  }

  /**
   * Main cleanup function - call this in onUnmounted
   */
  const cleanup = () => {
    // Unsubscribe all realtime channels
    subscriptions.forEach(channel => {
      try {
        supabase.removeChannel(channel)
      } catch (error) {
        console.warn('[Cleanup] Failed to remove channel:', error)
      }
    })
    subscriptions.length = 0

    // Clear all intervals
    intervals.forEach(intervalId => {
      clearInterval(intervalId)
    })
    intervals.length = 0

    // Clear all timeouts
    timeouts.forEach(timeoutId => {
      clearTimeout(timeoutId)
    })
    timeouts.length = 0

    // Run all custom cleanup functions
    cleanupFunctions.forEach(fn => {
      try {
        fn()
      } catch (error) {
        console.warn('[Cleanup] Cleanup function error:', error)
      }
    })
    cleanupFunctions.length = 0

    console.log('[Cleanup] Admin view cleanup complete')
  }

  // Auto-cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })

  return {
    addCleanup,
    addSubscription,
    addInterval,
    addTimeout,
    cleanup
  }
}
