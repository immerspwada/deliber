/**
 * Auto Cleanup Composable
 * 
 * จัดการการทำความสะอาด resources อัตโนมัติ
 * ป้องกัน memory leaks และปรับปรุงประสิทธิภาพ
 */

import { onUnmounted, onBeforeUnmount, ref, Ref } from 'vue'

interface CleanupFunction {
  id: string
  fn: () => void
  type: 'subscription' | 'timer' | 'listener' | 'custom'
  description?: string
}

/**
 * Auto Cleanup Composable
 */
export function useAutoCleanup() {
  const cleanupFunctions = ref<CleanupFunction[]>([])
  const isDestroyed = ref(false)

  /**
   * เพิ่ม cleanup function
   */
  const addCleanup = (
    fn: () => void,
    type: CleanupFunction['type'] = 'custom',
    description?: string
  ): string => {
    const id = `cleanup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    cleanupFunctions.value.push({
      id,
      fn,
      type,
      description
    })
    
    if (import.meta.env.DEV) {
      console.log(`[AutoCleanup] Added ${type} cleanup:`, description || id)
    }
    
    return id
  }

  /**
   * ลบ cleanup function ตาม ID
   */
  const removeCleanup = (id: string): boolean => {
    const index = cleanupFunctions.value.findIndex(cleanup => cleanup.id === id)
    if (index !== -1) {
      cleanupFunctions.value.splice(index, 1)
      if (import.meta.env.DEV) {
        console.log(`[AutoCleanup] Removed cleanup:`, id)
      }
      return true
    }
    return false
  }

  /**
   * เพิ่ม Supabase subscription cleanup
   */
  const addSubscriptionCleanup = (
    subscription: { unsubscribe: () => void },
    description?: string
  ): string => {
    return addCleanup(
      () => subscription.unsubscribe(),
      'subscription',
      description || 'Supabase subscription'
    )
  }

  /**
   * เพิ่ม Timer cleanup (setTimeout, setInterval)
   */
  const addTimerCleanup = (
    timerId: NodeJS.Timeout,
    type: 'timeout' | 'interval' = 'timeout',
    description?: string
  ): string => {
    return addCleanup(
      () => {
        if (type === 'interval') {
          clearInterval(timerId)
        } else {
          clearTimeout(timerId)
        }
      },
      'timer',
      description || `${type} timer`
    )
  }

  /**
   * เพิ่ม Event Listener cleanup
   */
  const addEventListenerCleanup = (
    element: EventTarget,
    event: string,
    listener: EventListener,
    description?: string
  ): string => {
    return addCleanup(
      () => element.removeEventListener(event, listener),
      'listener',
      description || `${event} listener`
    )
  }

  /**
   * เพิ่ม AbortController cleanup
   */
  const addAbortControllerCleanup = (
    controller: AbortController,
    description?: string
  ): string => {
    return addCleanup(
      () => {
        if (!controller.signal.aborted) {
          controller.abort()
        }
      },
      'custom',
      description || 'AbortController'
    )
  }

  /**
   * เพิ่ม Ref cleanup (สำหรับ reactive refs ที่ต้องการ reset)
   */
  const addRefCleanup = <T>(
    refToClean: Ref<T>,
    resetValue: T,
    description?: string
  ): string => {
    return addCleanup(
      () => {
        refToClean.value = resetValue
      },
      'custom',
      description || 'Ref reset'
    )
  }

  /**
   * เพิ่ม Promise cleanup (สำหรับ promises ที่ยังไม่ resolve)
   */
  const addPromiseCleanup = (
    promiseController: { cancel?: () => void; abort?: () => void },
    description?: string
  ): string => {
    return addCleanup(
      () => {
        if (promiseController.cancel) {
          promiseController.cancel()
        } else if (promiseController.abort) {
          promiseController.abort()
        }
      },
      'custom',
      description || 'Promise cancellation'
    )
  }

  /**
   * เพิ่ม WebSocket cleanup
   */
  const addWebSocketCleanup = (
    ws: WebSocket,
    description?: string
  ): string => {
    return addCleanup(
      () => {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close()
        }
      },
      'custom',
      description || 'WebSocket connection'
    )
  }

  /**
   * เพิ่ม MediaStream cleanup (สำหรับ camera/microphone)
   */
  const addMediaStreamCleanup = (
    stream: MediaStream,
    description?: string
  ): string => {
    return addCleanup(
      () => {
        stream.getTracks().forEach(track => track.stop())
      },
      'custom',
      description || 'MediaStream'
    )
  }

  /**
   * เพิ่ม IntersectionObserver cleanup
   */
  const addIntersectionObserverCleanup = (
    observer: IntersectionObserver,
    description?: string
  ): string => {
    return addCleanup(
      () => observer.disconnect(),
      'custom',
      description || 'IntersectionObserver'
    )
  }

  /**
   * เพิ่ม MutationObserver cleanup
   */
  const addMutationObserverCleanup = (
    observer: MutationObserver,
    description?: string
  ): string => {
    return addCleanup(
      () => observer.disconnect(),
      'custom',
      description || 'MutationObserver'
    )
  }

  /**
   * เพิ่ม ResizeObserver cleanup
   */
  const addResizeObserverCleanup = (
    observer: ResizeObserver,
    description?: string
  ): string => {
    return addCleanup(
      () => observer.disconnect(),
      'custom',
      description || 'ResizeObserver'
    )
  }

  /**
   * ทำความสะอาดทั้งหมด
   */
  const cleanup = () => {
    if (isDestroyed.value) return

    const cleanupCount = cleanupFunctions.value.length
    
    if (import.meta.env.DEV && cleanupCount > 0) {
      console.log(`[AutoCleanup] Running ${cleanupCount} cleanup functions`)
    }

    // รัน cleanup functions ทั้งหมด
    cleanupFunctions.value.forEach(({ fn, type, description, id }) => {
      try {
        fn()
        if (import.meta.env.DEV) {
          console.log(`[AutoCleanup] ✓ Cleaned ${type}:`, description || id)
        }
      } catch (error) {
        console.error(`[AutoCleanup] ✗ Failed to clean ${type}:`, description || id, error)
      }
    })

    // ล้าง array
    cleanupFunctions.value = []
    isDestroyed.value = true

    if (import.meta.env.DEV) {
      console.log('[AutoCleanup] All cleanup functions executed')
    }
  }

  /**
   * ทำความสะอาดตาม type
   */
  const cleanupByType = (type: CleanupFunction['type']) => {
    const toClean = cleanupFunctions.value.filter(cleanup => cleanup.type === type)
    
    toClean.forEach(({ fn, description, id }) => {
      try {
        fn()
        if (import.meta.env.DEV) {
          console.log(`[AutoCleanup] ✓ Cleaned ${type}:`, description || id)
        }
      } catch (error) {
        console.error(`[AutoCleanup] ✗ Failed to clean ${type}:`, description || id, error)
      }
    })

    // ลบออกจาก array
    cleanupFunctions.value = cleanupFunctions.value.filter(cleanup => cleanup.type !== type)
  }

  /**
   * ทำความสะอาดทันที (manual cleanup)
   */
  const cleanupNow = (id?: string) => {
    if (id) {
      const cleanup = cleanupFunctions.value.find(c => c.id === id)
      if (cleanup) {
        try {
          cleanup.fn()
          removeCleanup(id)
          if (import.meta.env.DEV) {
            console.log(`[AutoCleanup] ✓ Manual cleanup:`, cleanup.description || id)
          }
        } catch (error) {
          console.error(`[AutoCleanup] ✗ Manual cleanup failed:`, cleanup.description || id, error)
        }
      }
    } else {
      cleanup()
    }
  }

  /**
   * ดูสถานะ cleanup functions
   */
  const getCleanupInfo = () => {
    return {
      total: cleanupFunctions.value.length,
      byType: cleanupFunctions.value.reduce((acc, cleanup) => {
        acc[cleanup.type] = (acc[cleanup.type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      functions: cleanupFunctions.value.map(({ id, type, description }) => ({
        id,
        type,
        description
      }))
    }
  }

  // Auto cleanup เมื่อ component ถูก unmount
  onBeforeUnmount(() => {
    if (import.meta.env.DEV) {
      console.log('[AutoCleanup] Component unmounting, starting cleanup...')
    }
    cleanup()
  })

  onUnmounted(() => {
    if (!isDestroyed.value) {
      cleanup()
    }
  })

  return {
    // Core functions
    addCleanup,
    removeCleanup,
    cleanup,
    cleanupNow,
    cleanupByType,
    
    // Specialized cleanup functions
    addSubscriptionCleanup,
    addTimerCleanup,
    addEventListenerCleanup,
    addAbortControllerCleanup,
    addRefCleanup,
    addPromiseCleanup,
    addWebSocketCleanup,
    addMediaStreamCleanup,
    addIntersectionObserverCleanup,
    addMutationObserverCleanup,
    addResizeObserverCleanup,
    
    // Info
    getCleanupInfo,
    isDestroyed: readonly(isDestroyed)
  }
}

/**
 * Helper สำหรับสร้าง cleanup-aware timer
 */
export function useCleanupTimer() {
  const { addTimerCleanup } = useAutoCleanup()

  const setTimeout = (callback: () => void, delay: number, description?: string): NodeJS.Timeout => {
    const timerId = globalThis.setTimeout(callback, delay)
    addTimerCleanup(timerId, 'timeout', description)
    return timerId
  }

  const setInterval = (callback: () => void, delay: number, description?: string): NodeJS.Timeout => {
    const timerId = globalThis.setInterval(callback, delay)
    addTimerCleanup(timerId, 'interval', description)
    return timerId
  }

  return {
    setTimeout,
    setInterval
  }
}

/**
 * Helper สำหรับสร้าง cleanup-aware event listeners
 */
export function useCleanupEventListener() {
  const { addEventListenerCleanup } = useAutoCleanup()

  const addEventListener = (
    element: EventTarget,
    event: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions,
    description?: string
  ): void => {
    element.addEventListener(event, listener, options)
    addEventListenerCleanup(element, event, listener, description)
  }

  return {
    addEventListener
  }
}

/**
 * Helper สำหรับสร้าง cleanup-aware subscriptions
 */
export function useCleanupSubscription() {
  const { addSubscriptionCleanup } = useAutoCleanup()

  const subscribe = <T>(
    subscription: { unsubscribe: () => void },
    description?: string
  ): { unsubscribe: () => void } => {
    addSubscriptionCleanup(subscription, description)
    return subscription
  }

  return {
    subscribe
  }
}

// Export readonly function for external use
function readonly<T>(ref: Ref<T>): Readonly<Ref<T>> {
  return ref as Readonly<Ref<T>>
}