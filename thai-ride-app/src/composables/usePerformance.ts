// @ts-nocheck
/**
 * Feature: Advanced Performance Optimization
 * Session 1-5: Core Performance Utilities
 * 
 * รวม utilities สำหรับ performance optimization ทั้งหมด
 */

import { ref, computed, onUnmounted, onMounted, watch } from 'vue'
import type { Ref } from 'vue'

// ============================================
// SESSION 1: Memory Management & Cleanup
// ============================================

/**
 * Auto-cleanup manager สำหรับ subscriptions และ timers
 */
export function useAutoCleanup() {
  const cleanupFns: (() => void)[] = []
  const timers: number[] = []
  const intervals: number[] = []

  const addCleanup = (fn: () => void) => {
    cleanupFns.push(fn)
  }

  const setTimeout = (fn: () => void, delay: number): number => {
    const id = window.setTimeout(fn, delay)
    timers.push(id)
    return id
  }

  const setInterval = (fn: () => void, delay: number): number => {
    const id = window.setInterval(fn, delay)
    intervals.push(id)
    return id
  }

  const clearTimer = (id: number) => {
    window.clearTimeout(id)
    const idx = timers.indexOf(id)
    if (idx > -1) timers.splice(idx, 1)
  }

  const clearIntervalTimer = (id: number) => {
    window.clearInterval(id)
    const idx = intervals.indexOf(id)
    if (idx > -1) intervals.splice(idx, 1)
  }

  const cleanup = () => {
    cleanupFns.forEach(fn => fn())
    cleanupFns.length = 0
    timers.forEach(id => window.clearTimeout(id))
    timers.length = 0
    intervals.forEach(id => window.clearInterval(id))
    intervals.length = 0
  }

  onUnmounted(cleanup)

  return {
    addCleanup,
    setTimeout,
    setInterval,
    clearTimer,
    clearIntervalTimer,
    cleanup
  }
}

// ============================================
// SESSION 2: Debounce & Throttle Utilities
// ============================================

/**
 * Debounce function with cancel capability
 */
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 300
) {
  let timeoutId: number | null = null
  const isPending = ref(false)

  const debouncedFn = (...args: Parameters<T>) => {
    isPending.value = true
    if (timeoutId) {
      window.clearTimeout(timeoutId)
    }
    timeoutId = window.setTimeout(() => {
      fn(...args)
      isPending.value = false
      timeoutId = null
    }, delay)
  }

  const cancel = () => {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      timeoutId = null
      isPending.value = false
    }
  }

  const flush = (...args: Parameters<T>) => {
    cancel()
    fn(...args)
  }

  onUnmounted(cancel)

  return {
    debouncedFn,
    cancel,
    flush,
    isPending
  }
}

/**
 * Throttle function with leading/trailing options
 */
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number = 300,
  options: { leading?: boolean; trailing?: boolean } = {}
) {
  const { leading = true, trailing = true } = options
  let lastCall = 0
  let timeoutId: number | null = null
  let lastArgs: Parameters<T> | null = null
  const isThrottled = ref(false)

  const throttledFn = (...args: Parameters<T>) => {
    const now = Date.now()
    const remaining = limit - (now - lastCall)

    if (remaining <= 0 || remaining > limit) {
      if (timeoutId) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
      lastCall = now
      if (leading || lastCall !== 0) {
        fn(...args)
      }
      isThrottled.value = false
    } else {
      lastArgs = args
      isThrottled.value = true
      if (trailing && !timeoutId) {
        timeoutId = window.setTimeout(() => {
          lastCall = Date.now()
          timeoutId = null
          if (lastArgs) {
            fn(...lastArgs)
            lastArgs = null
          }
          isThrottled.value = false
        }, remaining)
      }
    }
  }

  const cancel = () => {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      timeoutId = null
    }
    lastArgs = null
    isThrottled.value = false
  }

  onUnmounted(cancel)

  return {
    throttledFn,
    cancel,
    isThrottled
  }
}

// ============================================
// SESSION 3: Lazy Loading & Code Splitting
// ============================================

/**
 * Lazy load data with intersection observer
 */
export function useLazyLoad<T>(
  loadFn: () => Promise<T>,
  options: {
    rootMargin?: string
    threshold?: number
    immediate?: boolean
  } = {}
) {
  const { rootMargin = '100px', threshold = 0, immediate = false } = options
  
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const isVisible = ref(false)
  const hasLoaded = ref(false)
  let observer: IntersectionObserver | null = null

  const load = async () => {
    if (hasLoaded.value || loading.value) return
    
    loading.value = true
    error.value = null
    
    try {
      data.value = await loadFn()
      hasLoaded.value = true
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  const observe = (element: HTMLElement | null) => {
    if (!element) return

    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry) {
          isVisible.value = entry.isIntersecting
          if (entry.isIntersecting && !hasLoaded.value) {
            load()
          }
        }
      },
      { rootMargin, threshold }
    )

    observer.observe(element)
  }

  const unobserve = () => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }

  if (immediate) {
    load()
  }

  onUnmounted(unobserve)

  return {
    data,
    loading,
    error,
    isVisible,
    hasLoaded,
    load,
    observe,
    unobserve
  }
}

/**
 * Preload resources
 */
export function usePreload() {
  const preloadedUrls = new Set<string>()

  const preloadImage = (url: string): Promise<void> => {
    if (preloadedUrls.has(url)) return Promise.resolve()
    
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        preloadedUrls.add(url)
        resolve()
      }
      img.onerror = reject
      img.src = url
    })
  }

  const preloadScript = (url: string): Promise<void> => {
    if (preloadedUrls.has(url)) return Promise.resolve()
    
    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'script'
      link.href = url
      link.onload = () => {
        preloadedUrls.add(url)
        resolve()
      }
      link.onerror = reject
      document.head.appendChild(link)
    })
  }

  const preloadStyle = (url: string): Promise<void> => {
    if (preloadedUrls.has(url)) return Promise.resolve()
    
    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'style'
      link.href = url
      link.onload = () => {
        preloadedUrls.add(url)
        resolve()
      }
      link.onerror = reject
      document.head.appendChild(link)
    })
  }

  const preloadFont = (url: string): Promise<void> => {
    if (preloadedUrls.has(url)) return Promise.resolve()
    
    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'font'
      link.type = 'font/woff2'
      link.crossOrigin = 'anonymous'
      link.href = url
      link.onload = () => {
        preloadedUrls.add(url)
        resolve()
      }
      link.onerror = reject
      document.head.appendChild(link)
    })
  }

  return {
    preloadImage,
    preloadScript,
    preloadStyle,
    preloadFont,
    preloadedUrls
  }
}

// ============================================
// SESSION 4: Virtual Scrolling
// ============================================

/**
 * Virtual scroll for large lists
 */
export function useVirtualScroll<T>(
  items: Ref<T[]>,
  options: {
    itemHeight: number
    containerHeight: number
    overscan?: number
  }
) {
  const { itemHeight, containerHeight, overscan = 3 } = options
  
  const scrollTop = ref(0)
  const containerRef = ref<HTMLElement | null>(null)

  const totalHeight = computed(() => items.value.length * itemHeight)
  
  const visibleCount = computed(() => 
    Math.ceil(containerHeight / itemHeight) + overscan * 2
  )

  const startIndex = computed(() => 
    Math.max(0, Math.floor(scrollTop.value / itemHeight) - overscan)
  )

  const endIndex = computed(() => 
    Math.min(items.value.length, startIndex.value + visibleCount.value)
  )

  const visibleItems = computed(() => 
    items.value.slice(startIndex.value, endIndex.value).map((item, index) => ({
      item,
      index: startIndex.value + index,
      style: {
        position: 'absolute' as const,
        top: `${(startIndex.value + index) * itemHeight}px`,
        height: `${itemHeight}px`,
        width: '100%'
      }
    }))
  )

  const offsetY = computed(() => startIndex.value * itemHeight)

  const handleScroll = (e: Event) => {
    const target = e.target as HTMLElement
    scrollTop.value = target.scrollTop
  }

  const scrollToIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
    if (containerRef.value) {
      containerRef.value.scrollTo({
        top: index * itemHeight,
        behavior
      })
    }
  }

  const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
    scrollToIndex(0, behavior)
  }

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    scrollToIndex(items.value.length - 1, behavior)
  }

  return {
    containerRef,
    totalHeight,
    visibleItems,
    offsetY,
    startIndex,
    endIndex,
    handleScroll,
    scrollToIndex,
    scrollToTop,
    scrollToBottom
  }
}

// ============================================
// SESSION 5: Memoization & Caching
// ============================================

/**
 * Memoize expensive computations
 */
export function useMemo<T, Args extends any[]>(
  fn: (...args: Args) => T,
  options: {
    maxSize?: number
    ttl?: number
  } = {}
) {
  const { maxSize = 100, ttl = 0 } = options
  
  const cache = new Map<string, { value: T; timestamp: number }>()

  const getKey = (args: Args): string => {
    return JSON.stringify(args)
  }

  const memoizedFn = (...args: Args): T => {
    const key = getKey(args)
    const cached = cache.get(key)

    if (cached) {
      if (ttl === 0 || Date.now() - cached.timestamp < ttl) {
        return cached.value
      }
      cache.delete(key)
    }

    const result = fn(...args)
    
    // Evict oldest if at max size
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value
      if (firstKey) cache.delete(firstKey)
    }

    cache.set(key, { value: result, timestamp: Date.now() })
    return result
  }

  const clear = () => cache.clear()
  const size = computed(() => cache.size)

  return {
    memoizedFn,
    clear,
    size
  }
}

/**
 * LRU Cache implementation
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>()
  private maxSize: number

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined
    
    // Move to end (most recently used)
    const value = this.cache.get(key)!
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // Delete oldest (first item)
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }

  keys(): IterableIterator<K> {
    return this.cache.keys()
  }

  values(): IterableIterator<V> {
    return this.cache.values()
  }

  entries(): IterableIterator<[K, V]> {
    return this.cache.entries()
  }
}

export function useLRUCache<K, V>(maxSize: number = 100) {
  const cache = new LRUCache<K, V>(maxSize)
  const size = ref(0)

  const get = (key: K): V | undefined => {
    return cache.get(key)
  }

  const set = (key: K, value: V): void => {
    cache.set(key, value)
    size.value = cache.size
  }

  const has = (key: K): boolean => {
    return cache.has(key)
  }

  const remove = (key: K): boolean => {
    const result = cache.delete(key)
    size.value = cache.size
    return result
  }

  const clear = (): void => {
    cache.clear()
    size.value = 0
  }

  return {
    get,
    set,
    has,
    remove,
    clear,
    size
  }
}


// ============================================
// SESSION 6: Request Queue & Batching
// ============================================

/**
 * Request queue with priority and batching
 */
export function useRequestQueue() {
  interface QueueItem<T> {
    id: string
    fn: () => Promise<T>
    priority: number
    resolve: (value: T) => void
    reject: (error: Error) => void
  }

  const queue: QueueItem<any>[] = []
  const processing = ref(false)
  const concurrency = ref(3)
  const activeCount = ref(0)
  const pendingCount = computed(() => queue.length)

  const enqueue = <T>(
    fn: () => Promise<T>,
    options: { priority?: number; id?: string } = {}
  ): Promise<T> => {
    const { priority = 0, id = `req_${Date.now()}_${Math.random().toString(36).slice(2)}` } = options

    return new Promise((resolve, reject) => {
      const item: QueueItem<T> = { id, fn, priority, resolve, reject }
      
      // Insert by priority (higher first)
      const insertIndex = queue.findIndex(q => q.priority < priority)
      if (insertIndex === -1) {
        queue.push(item)
      } else {
        queue.splice(insertIndex, 0, item)
      }

      processQueue()
    })
  }

  const processQueue = async () => {
    if (processing.value) return
    processing.value = true

    while (queue.length > 0 && activeCount.value < concurrency.value) {
      const item = queue.shift()
      if (!item) continue

      activeCount.value++
      
      item.fn()
        .then(item.resolve)
        .catch(item.reject)
        .finally(() => {
          activeCount.value--
          if (queue.length > 0) {
            processQueue()
          }
        })
    }

    processing.value = false
  }

  const cancel = (id: string): boolean => {
    const index = queue.findIndex(item => item.id === id)
    if (index > -1) {
      const item = queue.splice(index, 1)[0]
      item.reject(new Error('Request cancelled'))
      return true
    }
    return false
  }

  const clear = () => {
    queue.forEach(item => item.reject(new Error('Queue cleared')))
    queue.length = 0
  }

  const setConcurrency = (value: number) => {
    concurrency.value = Math.max(1, value)
    processQueue()
  }

  return {
    enqueue,
    cancel,
    clear,
    setConcurrency,
    activeCount,
    pendingCount,
    concurrency
  }
}

/**
 * Batch multiple requests into one
 */
export function useBatchRequest<K, V>(
  batchFn: (keys: K[]) => Promise<Map<K, V>>,
  options: {
    maxBatchSize?: number
    maxWaitMs?: number
  } = {}
) {
  const { maxBatchSize = 50, maxWaitMs = 10 } = options

  let pendingKeys: K[] = []
  let pendingResolvers: Map<K, { resolve: (v: V) => void; reject: (e: Error) => void }> = new Map()
  let timeoutId: number | null = null

  const executeBatch = async () => {
    if (pendingKeys.length === 0) return

    const keys = [...pendingKeys]
    const resolvers = new Map(pendingResolvers)
    
    pendingKeys = []
    pendingResolvers = new Map()
    timeoutId = null

    try {
      const results = await batchFn(keys)
      
      resolvers.forEach((resolver, key) => {
        const value = results.get(key)
        if (value !== undefined) {
          resolver.resolve(value)
        } else {
          resolver.reject(new Error(`No result for key: ${String(key)}`))
        }
      })
    } catch (error) {
      resolvers.forEach(resolver => {
        resolver.reject(error as Error)
      })
    }
  }

  const load = (key: K): Promise<V> => {
    return new Promise((resolve, reject) => {
      pendingKeys.push(key)
      pendingResolvers.set(key, { resolve, reject })

      if (pendingKeys.length >= maxBatchSize) {
        if (timeoutId) {
          window.clearTimeout(timeoutId)
          timeoutId = null
        }
        executeBatch()
      } else if (!timeoutId) {
        timeoutId = window.setTimeout(executeBatch, maxWaitMs)
      }
    })
  }

  const loadMany = (keys: K[]): Promise<V[]> => {
    return Promise.all(keys.map(load))
  }

  onUnmounted(() => {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
    }
  })

  return {
    load,
    loadMany
  }
}

// ============================================
// SESSION 7: Connection Pool & Retry Logic
// ============================================

/**
 * Retry with exponential backoff
 */
export function useRetry() {
  const retryWithBackoff = async <T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number
      baseDelay?: number
      maxDelay?: number
      shouldRetry?: (error: Error, attempt: number) => boolean
      onRetry?: (error: Error, attempt: number) => void
    } = {}
  ): Promise<T> => {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      shouldRetry = () => true,
      onRetry
    } = options

    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        if (attempt === maxRetries || !shouldRetry(lastError, attempt)) {
          throw lastError
        }

        onRetry?.(lastError, attempt)

        // Exponential backoff with jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          maxDelay
        )
        
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }

  return { retryWithBackoff }
}

/**
 * Circuit breaker pattern
 */
export function useCircuitBreaker(options: {
  failureThreshold?: number
  resetTimeout?: number
  halfOpenRequests?: number
} = {}) {
  const {
    failureThreshold = 5,
    resetTimeout = 30000,
    halfOpenRequests = 1
  } = options

  type State = 'closed' | 'open' | 'half-open'
  
  const state = ref<State>('closed')
  const failures = ref(0)
  const successes = ref(0)
  const lastFailureTime = ref<number | null>(null)
  const halfOpenAttempts = ref(0)

  const execute = async <T>(fn: () => Promise<T>): Promise<T> => {
    // Check if circuit should transition from open to half-open
    if (state.value === 'open') {
      if (lastFailureTime.value && Date.now() - lastFailureTime.value >= resetTimeout) {
        state.value = 'half-open'
        halfOpenAttempts.value = 0
      } else {
        throw new Error('Circuit breaker is open')
      }
    }

    // In half-open state, limit requests
    if (state.value === 'half-open' && halfOpenAttempts.value >= halfOpenRequests) {
      throw new Error('Circuit breaker is half-open, waiting for test requests')
    }

    try {
      if (state.value === 'half-open') {
        halfOpenAttempts.value++
      }

      const result = await fn()

      // Success - reset or close circuit
      if (state.value === 'half-open') {
        state.value = 'closed'
        failures.value = 0
      }
      successes.value++

      return result
    } catch (error) {
      failures.value++
      lastFailureTime.value = Date.now()

      if (state.value === 'half-open') {
        state.value = 'open'
      } else if (failures.value >= failureThreshold) {
        state.value = 'open'
      }

      throw error
    }
  }

  const reset = () => {
    state.value = 'closed'
    failures.value = 0
    successes.value = 0
    lastFailureTime.value = null
    halfOpenAttempts.value = 0
  }

  const getStats = () => ({
    state: state.value,
    failures: failures.value,
    successes: successes.value,
    lastFailureTime: lastFailureTime.value
  })

  return {
    execute,
    reset,
    getStats,
    state,
    failures,
    successes
  }
}

// ============================================
// SESSION 8: Image Optimization
// ============================================

/**
 * Progressive image loading
 */
export function useProgressiveImage(options: {
  placeholder?: string
  blur?: boolean
} = {}) {
  const { placeholder = '', blur = true } = options

  const loadImage = (
    src: string,
    lowResSrc?: string
  ): { src: Ref<string>; loading: Ref<boolean>; error: Ref<Error | null> } => {
    const currentSrc = ref(lowResSrc || placeholder)
    const loading = ref(true)
    const error = ref<Error | null>(null)

    const img = new Image()
    
    img.onload = () => {
      currentSrc.value = src
      loading.value = false
    }
    
    img.onerror = () => {
      error.value = new Error(`Failed to load image: ${src}`)
      loading.value = false
    }
    
    img.src = src

    return { src: currentSrc, loading, error }
  }

  const getBlurStyle = (isLoading: boolean) => {
    if (!blur) return {}
    return isLoading ? { filter: 'blur(10px)', transition: 'filter 0.3s' } : { filter: 'none', transition: 'filter 0.3s' }
  }

  return {
    loadImage,
    getBlurStyle
  }
}

/**
 * Responsive image srcset generator
 */
export function useResponsiveImage() {
  const generateSrcSet = (
    baseUrl: string,
    widths: number[] = [320, 640, 960, 1280, 1920],
    format: 'webp' | 'jpg' | 'png' = 'webp'
  ): string => {
    return widths
      .map(w => `${baseUrl}?w=${w}&format=${format} ${w}w`)
      .join(', ')
  }

  const generateSizes = (
    breakpoints: { maxWidth: number; size: string }[] = [
      { maxWidth: 640, size: '100vw' },
      { maxWidth: 1024, size: '50vw' },
      { maxWidth: Infinity, size: '33vw' }
    ]
  ): string => {
    return breakpoints
      .map(bp => 
        bp.maxWidth === Infinity 
          ? bp.size 
          : `(max-width: ${bp.maxWidth}px) ${bp.size}`
      )
      .join(', ')
  }

  return {
    generateSrcSet,
    generateSizes
  }
}

// ============================================
// SESSION 9: Animation Performance
// ============================================

/**
 * RequestAnimationFrame hook
 */
export function useRAF() {
  let rafId: number | null = null
  const isRunning = ref(false)

  const start = (callback: (timestamp: number) => void) => {
    if (isRunning.value) return

    isRunning.value = true
    
    const loop = (timestamp: number) => {
      if (!isRunning.value) return
      callback(timestamp)
      rafId = requestAnimationFrame(loop)
    }
    
    rafId = requestAnimationFrame(loop)
  }

  const stop = () => {
    isRunning.value = false
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  const once = (callback: (timestamp: number) => void) => {
    rafId = requestAnimationFrame((timestamp) => {
      callback(timestamp)
      rafId = null
    })
  }

  onUnmounted(stop)

  return {
    start,
    stop,
    once,
    isRunning
  }
}

/**
 * Smooth scroll with easing
 */
export function useSmoothScroll() {
  const { once } = useRAF()

  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  const scrollTo = (
    element: HTMLElement,
    target: number,
    duration: number = 500
  ): Promise<void> => {
    return new Promise((resolve) => {
      const start = element.scrollTop
      const distance = target - start
      const startTime = performance.now()

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = easeInOutCubic(progress)
        
        element.scrollTop = start + distance * eased

        if (progress < 1) {
          once(animate)
        } else {
          resolve()
        }
      }

      once(animate)
    })
  }

  const scrollToElement = (
    container: HTMLElement,
    target: HTMLElement,
    offset: number = 0,
    duration: number = 500
  ): Promise<void> => {
    const targetPosition = target.offsetTop - offset
    return scrollTo(container, targetPosition, duration)
  }

  return {
    scrollTo,
    scrollToElement
  }
}

// ============================================
// SESSION 10: Web Workers Integration
// ============================================

/**
 * Web Worker wrapper
 */
export function useWebWorker<T, R>(workerFn: (data: T) => R) {
  const result = ref<R | null>(null) as Ref<R | null>
  const error = ref<Error | null>(null)
  const loading = ref(false)
  let worker: Worker | null = null

  const createWorker = () => {
    const blob = new Blob(
      [`self.onmessage = function(e) { 
        try {
          const fn = ${workerFn.toString()};
          const result = fn(e.data);
          self.postMessage({ success: true, result });
        } catch (err) {
          self.postMessage({ success: false, error: err.message });
        }
      }`],
      { type: 'application/javascript' }
    )
    return new Worker(URL.createObjectURL(blob))
  }

  const run = (data: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      loading.value = true
      error.value = null

      worker = createWorker()
      
      worker.onmessage = (e) => {
        loading.value = false
        if (e.data.success) {
          result.value = e.data.result
          resolve(e.data.result)
        } else {
          error.value = new Error(e.data.error)
          reject(error.value)
        }
        terminate()
      }

      worker.onerror = (e) => {
        loading.value = false
        error.value = new Error(e.message)
        reject(error.value)
        terminate()
      }

      worker.postMessage(data)
    })
  }

  const terminate = () => {
    if (worker) {
      worker.terminate()
      worker = null
    }
  }

  onUnmounted(terminate)

  return {
    run,
    terminate,
    result,
    error,
    loading
  }
}


// ============================================
// SESSION 11: Network Status & Adaptive Loading
// ============================================

/**
 * Network information and adaptive loading
 */
export function useNetworkStatus() {
  const isOnline = ref(navigator.onLine)
  const effectiveType = ref<string>('4g')
  const downlink = ref<number>(10)
  const rtt = ref<number>(50)
  const saveData = ref(false)

  const updateNetworkInfo = () => {
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection

    if (connection) {
      effectiveType.value = connection.effectiveType || '4g'
      downlink.value = connection.downlink || 10
      rtt.value = connection.rtt || 50
      saveData.value = connection.saveData || false
    }
  }

  const isSlowConnection = computed(() => 
    effectiveType.value === 'slow-2g' || 
    effectiveType.value === '2g' ||
    rtt.value > 500 ||
    downlink.value < 0.5
  )

  const isFastConnection = computed(() =>
    effectiveType.value === '4g' &&
    rtt.value < 100 &&
    downlink.value > 5
  )

  const getImageQuality = computed(() => {
    if (saveData.value || effectiveType.value === 'slow-2g') return 'low'
    if (effectiveType.value === '2g' || effectiveType.value === '3g') return 'medium'
    return 'high'
  })

  const shouldPreload = computed(() => 
    isFastConnection.value && !saveData.value
  )

  onMounted(() => {
    updateNetworkInfo()
    
    window.addEventListener('online', () => { isOnline.value = true })
    window.addEventListener('offline', () => { isOnline.value = false })
    
    const connection = (navigator as any).connection
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo)
    }
  })

  onUnmounted(() => {
    window.removeEventListener('online', () => { isOnline.value = true })
    window.removeEventListener('offline', () => { isOnline.value = false })
    
    const connection = (navigator as any).connection
    if (connection) {
      connection.removeEventListener('change', updateNetworkInfo)
    }
  })

  return {
    isOnline,
    effectiveType,
    downlink,
    rtt,
    saveData,
    isSlowConnection,
    isFastConnection,
    getImageQuality,
    shouldPreload
  }
}

// ============================================
// SESSION 12: Idle Detection & Background Tasks
// ============================================

/**
 * Idle callback for non-critical tasks
 */
export function useIdleCallback() {
  const pendingCallbacks: number[] = []

  const requestIdleCallback = (
    callback: () => void,
    options: { timeout?: number } = {}
  ): number => {
    const { timeout = 5000 } = options

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(callback, { timeout })
      pendingCallbacks.push(id)
      return id
    } else {
      // Fallback for Safari
      const id = window.setTimeout(callback, 1)
      pendingCallbacks.push(id)
      return id
    }
  }

  const cancelIdleCallback = (id: number) => {
    if ('cancelIdleCallback' in window) {
      window.cancelIdleCallback(id)
    } else {
      window.clearTimeout(id)
    }
    const index = pendingCallbacks.indexOf(id)
    if (index > -1) pendingCallbacks.splice(index, 1)
  }

  const cancelAll = () => {
    pendingCallbacks.forEach(id => {
      if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(id)
      } else {
        window.clearTimeout(id)
      }
    })
    pendingCallbacks.length = 0
  }

  onUnmounted(cancelAll)

  return {
    requestIdleCallback,
    cancelIdleCallback,
    cancelAll
  }
}

/**
 * Background task scheduler
 */
export function useBackgroundTasks() {
  const { requestIdleCallback } = useIdleCallback()
  
  interface Task {
    id: string
    fn: () => void | Promise<void>
    priority: number
  }

  const taskQueue: Task[] = []
  const isProcessing = ref(false)
  const completedCount = ref(0)

  const addTask = (
    fn: () => void | Promise<void>,
    options: { id?: string; priority?: number } = {}
  ) => {
    const { id = `task_${Date.now()}`, priority = 0 } = options
    
    const task: Task = { id, fn, priority }
    
    // Insert by priority
    const insertIndex = taskQueue.findIndex(t => t.priority < priority)
    if (insertIndex === -1) {
      taskQueue.push(task)
    } else {
      taskQueue.splice(insertIndex, 0, task)
    }

    if (!isProcessing.value) {
      processNextTask()
    }
  }

  const processNextTask = () => {
    if (taskQueue.length === 0) {
      isProcessing.value = false
      return
    }

    isProcessing.value = true

    requestIdleCallback(async () => {
      const task = taskQueue.shift()
      if (task) {
        try {
          await task.fn()
          completedCount.value++
        } catch (e) {
          console.error(`Background task ${task.id} failed:`, e)
        }
      }
      processNextTask()
    })
  }

  const removeTask = (id: string): boolean => {
    const index = taskQueue.findIndex(t => t.id === id)
    if (index > -1) {
      taskQueue.splice(index, 1)
      return true
    }
    return false
  }

  const clearTasks = () => {
    taskQueue.length = 0
  }

  const pendingCount = computed(() => taskQueue.length)

  return {
    addTask,
    removeTask,
    clearTasks,
    isProcessing,
    pendingCount,
    completedCount
  }
}

// ============================================
// SESSION 13: State Persistence
// ============================================

/**
 * Persistent state with localStorage
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  options: {
    serialize?: (value: T) => string
    deserialize?: (value: string) => T
    storage?: Storage
  } = {}
) {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    storage = localStorage
  } = options

  const state = ref<T>(defaultValue) as Ref<T>

  // Load initial value
  try {
    const stored = storage.getItem(key)
    if (stored !== null) {
      state.value = deserialize(stored)
    }
  } catch (e) {
    console.warn(`Failed to load state for key "${key}":`, e)
  }

  // Watch and persist changes
  watch(
    state,
    (newValue) => {
      try {
        storage.setItem(key, serialize(newValue))
      } catch (e) {
        console.warn(`Failed to persist state for key "${key}":`, e)
      }
    },
    { deep: true }
  )

  const reset = () => {
    state.value = defaultValue
    storage.removeItem(key)
  }

  return {
    state,
    reset
  }
}

/**
 * Session state (cleared on tab close)
 */
export function useSessionState<T>(key: string, defaultValue: T) {
  return usePersistentState(key, defaultValue, { storage: sessionStorage })
}

// ============================================
// SESSION 14: Event Bus & Pub/Sub
// ============================================

type EventCallback<T = any> = (data: T) => void

class EventBus {
  private events = new Map<string, Set<EventCallback>>()

  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(callback)

    // Return unsubscribe function
    return () => this.off(event, callback)
  }

  off<T>(event: string, callback: EventCallback<T>): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.events.delete(event)
      }
    }
  }

  emit<T>(event: string, data?: T): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  once<T>(event: string, callback: EventCallback<T>): () => void {
    const wrapper: EventCallback<T> = (data) => {
      this.off(event, wrapper)
      callback(data)
    }
    return this.on(event, wrapper)
  }

  clear(event?: string): void {
    if (event) {
      this.events.delete(event)
    } else {
      this.events.clear()
    }
  }
}

// Global event bus instance
const globalEventBus = new EventBus()

export function useEventBus() {
  const subscriptions: (() => void)[] = []

  const on = <T>(event: string, callback: EventCallback<T>) => {
    const unsubscribe = globalEventBus.on(event, callback)
    subscriptions.push(unsubscribe)
    return unsubscribe
  }

  const once = <T>(event: string, callback: EventCallback<T>) => {
    const unsubscribe = globalEventBus.once(event, callback)
    subscriptions.push(unsubscribe)
    return unsubscribe
  }

  const emit = <T>(event: string, data?: T) => {
    globalEventBus.emit(event, data)
  }

  const off = <T>(event: string, callback: EventCallback<T>) => {
    globalEventBus.off(event, callback)
  }

  onUnmounted(() => {
    subscriptions.forEach(unsubscribe => unsubscribe())
  })

  return {
    on,
    once,
    emit,
    off
  }
}

// ============================================
// SESSION 15: Performance Monitoring
// ============================================

/**
 * Performance metrics collection
 */
export function usePerformanceMetrics() {
  const metrics = ref<{
    fcp: number | null
    lcp: number | null
    fid: number | null
    cls: number | null
    ttfb: number | null
  }>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null
  })

  const collectMetrics = () => {
    // First Contentful Paint
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0]
    if (fcpEntry) {
      metrics.value.fcp = fcpEntry.startTime
    }

    // Time to First Byte
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navEntry) {
      metrics.value.ttfb = navEntry.responseStart - navEntry.requestStart
    }

    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          metrics.value.lcp = lastEntry.startTime
        })
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          if (entries.length > 0) {
            const firstEntry = entries[0] as PerformanceEventTiming
            metrics.value.fid = firstEntry.processingStart - firstEntry.startTime
          }
        })
        fidObserver.observe({ type: 'first-input', buffered: true })

        // Cumulative Layout Shift
        let clsValue = 0
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
          metrics.value.cls = clsValue
        })
        clsObserver.observe({ type: 'layout-shift', buffered: true })
      } catch (e) {
        console.warn('Performance observer not supported:', e)
      }
    }
  }

  const measureFunction = <T extends (...args: any[]) => any>(
    name: string,
    fn: T
  ): T => {
    return ((...args: Parameters<T>) => {
      const start = performance.now()
      const result = fn(...args)
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = performance.now() - start
          console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`)
        })
      }
      
      const duration = performance.now() - start
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`)
      return result
    }) as T
  }

  const mark = (name: string) => {
    performance.mark(name)
  }

  const measure = (name: string, startMark: string, endMark?: string) => {
    if (endMark) {
      performance.measure(name, startMark, endMark)
    } else {
      performance.measure(name, startMark)
    }
    const entries = performance.getEntriesByName(name, 'measure')
    return entries[entries.length - 1]?.duration || 0
  }

  onMounted(collectMetrics)

  return {
    metrics,
    measureFunction,
    mark,
    measure
  }
}


// ============================================
// SESSION 16: Resource Hints & Prefetching
// ============================================

/**
 * Resource hints management
 */
export function useResourceHints() {
  const addedHints = new Set<string>()

  const addHint = (
    href: string,
    rel: 'preconnect' | 'dns-prefetch' | 'prefetch' | 'prerender' | 'preload',
    options: { as?: string; crossOrigin?: string; type?: string } = {}
  ) => {
    const key = `${rel}:${href}`
    if (addedHints.has(key)) return

    const link = document.createElement('link')
    link.rel = rel
    link.href = href
    
    if (options.as) link.setAttribute('as', options.as)
    if (options.crossOrigin) link.crossOrigin = options.crossOrigin
    if (options.type) link.type = options.type

    document.head.appendChild(link)
    addedHints.add(key)
  }

  const preconnect = (origin: string, crossOrigin = true) => {
    addHint(origin, 'preconnect', { crossOrigin: crossOrigin ? 'anonymous' : undefined })
  }

  const dnsPrefetch = (origin: string) => {
    addHint(origin, 'dns-prefetch')
  }

  const prefetch = (href: string, as?: string) => {
    addHint(href, 'prefetch', { as })
  }

  const prerender = (href: string) => {
    addHint(href, 'prerender')
  }

  const preload = (href: string, as: string, type?: string) => {
    addHint(href, 'preload', { as, type })
  }

  // Common preconnects for the app
  const setupCommonHints = () => {
    // Supabase
    preconnect('https://onsflqhkgqhydeupiqyt.supabase.co')
    
    // Map tiles
    preconnect('https://a.basemaps.cartocdn.com')
    preconnect('https://b.basemaps.cartocdn.com')
    preconnect('https://c.basemaps.cartocdn.com')
    
    // Fonts
    preconnect('https://fonts.googleapis.com')
    preconnect('https://fonts.gstatic.com')
    
    // Geocoding
    dnsPrefetch('https://nominatim.openstreetmap.org')
    
    // Routing
    dnsPrefetch('https://router.project-osrm.org')
  }

  return {
    preconnect,
    dnsPrefetch,
    prefetch,
    prerender,
    preload,
    setupCommonHints
  }
}

// ============================================
// SESSION 17: Intersection Observer Utilities
// ============================================

/**
 * Intersection observer hook
 */
export function useIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
) {
  const targets = ref<Set<Element>>(new Set())
  let observer: IntersectionObserver | null = null

  const createObserver = () => {
    if (observer) observer.disconnect()
    
    observer = new IntersectionObserver(callback, options)
    targets.value.forEach(target => observer!.observe(target))
  }

  const observe = (element: Element) => {
    targets.value.add(element)
    if (observer) {
      observer.observe(element)
    } else {
      createObserver()
    }
  }

  const unobserve = (element: Element) => {
    targets.value.delete(element)
    if (observer) {
      observer.unobserve(element)
    }
  }

  const disconnect = () => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    targets.value.clear()
  }

  onUnmounted(disconnect)

  return {
    observe,
    unobserve,
    disconnect,
    targets
  }
}

/**
 * Visibility tracking
 */
export function useVisibility(
  element: Ref<HTMLElement | null>,
  options: { threshold?: number; rootMargin?: string } = {}
) {
  const { threshold = 0, rootMargin = '0px' } = options
  
  const isVisible = ref(false)
  const hasBeenVisible = ref(false)
  let observer: IntersectionObserver | null = null

  const startObserving = () => {
    if (!element.value) return

    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        isVisible.value = entry.isIntersecting
        if (entry.isIntersecting) {
          hasBeenVisible.value = true
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element.value)
  }

  const stopObserving = () => {
    if (observer) {
      observer.disconnect()
      observer = null
    }
  }

  watch(element, (newEl, oldEl) => {
    if (oldEl && observer) {
      observer.unobserve(oldEl)
    }
    if (newEl) {
      startObserving()
    }
  }, { immediate: true })

  onUnmounted(stopObserving)

  return {
    isVisible,
    hasBeenVisible
  }
}

// ============================================
// SESSION 18: Form Optimization
// ============================================

/**
 * Optimized form state management
 */
export function useOptimizedForm<T extends Record<string, any>>(
  initialValues: T,
  options: {
    validateOnChange?: boolean
    validateOnBlur?: boolean
    debounceMs?: number
  } = {}
) {
  const { validateOnChange = false, validateOnBlur = true, debounceMs = 300 } = options

  const values = ref<T>({ ...initialValues }) as Ref<T>
  const errors = ref<Partial<Record<keyof T, string>>>({})
  const touched = ref<Partial<Record<keyof T, boolean>>>({})
  const isDirty = ref(false)
  const isSubmitting = ref(false)

  const validators = new Map<keyof T, (value: any) => string | null>()

  const setFieldValue = <K extends keyof T>(field: K, value: T[K]) => {
    values.value[field] = value
    isDirty.value = true
    
    if (validateOnChange && validators.has(field)) {
      validateField(field)
    }
  }

  const setFieldTouched = <K extends keyof T>(field: K, isTouched = true) => {
    touched.value[field] = isTouched
    
    if (validateOnBlur && validators.has(field)) {
      validateField(field)
    }
  }

  const validateField = <K extends keyof T>(field: K): boolean => {
    const validator = validators.get(field)
    if (!validator) return true

    const error = validator(values.value[field])
    if (error) {
      errors.value[field] = error
      return false
    } else {
      delete errors.value[field]
      return true
    }
  }

  const validateAll = (): boolean => {
    let isValid = true
    
    validators.forEach((_, field) => {
      if (!validateField(field)) {
        isValid = false
      }
    })

    return isValid
  }

  const registerValidator = <K extends keyof T>(
    field: K,
    validator: (value: T[K]) => string | null
  ) => {
    validators.set(field, validator)
  }

  const reset = () => {
    values.value = { ...initialValues }
    errors.value = {}
    touched.value = {}
    isDirty.value = false
  }

  const handleSubmit = async (
    onSubmit: (values: T) => Promise<void> | void
  ) => {
    if (!validateAll()) return

    isSubmitting.value = true
    try {
      await onSubmit(values.value)
    } finally {
      isSubmitting.value = false
    }
  }

  const isValid = computed(() => Object.keys(errors.value).length === 0)

  return {
    values,
    errors,
    touched,
    isDirty,
    isSubmitting,
    isValid,
    setFieldValue,
    setFieldTouched,
    validateField,
    validateAll,
    registerValidator,
    reset,
    handleSubmit
  }
}

// ============================================
// SESSION 19: Scroll Performance
// ============================================

/**
 * Scroll position tracking with throttling
 */
export function useScrollPosition(
  element?: Ref<HTMLElement | null>,
  throttleMs: number = 100
) {
  const scrollX = ref(0)
  const scrollY = ref(0)
  const isScrolling = ref(false)
  const direction = ref<'up' | 'down' | 'none'>('none')
  
  let lastScrollY = 0
  let scrollTimeout: number | null = null
  let ticking = false

  const updatePosition = () => {
    const target = element?.value || window
    const isWindow = target === window

    const newScrollX = isWindow ? window.scrollX : (target as HTMLElement).scrollLeft
    const newScrollY = isWindow ? window.scrollY : (target as HTMLElement).scrollTop

    direction.value = newScrollY > lastScrollY ? 'down' : newScrollY < lastScrollY ? 'up' : 'none'
    lastScrollY = newScrollY

    scrollX.value = newScrollX
    scrollY.value = newScrollY
    isScrolling.value = true

    if (scrollTimeout) {
      window.clearTimeout(scrollTimeout)
    }
    scrollTimeout = window.setTimeout(() => {
      isScrolling.value = false
      direction.value = 'none'
    }, 150)

    ticking = false
  }

  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(updatePosition)
      ticking = true
    }
  }

  onMounted(() => {
    const target = element?.value || window
    target.addEventListener('scroll', handleScroll, { passive: true })
  })

  onUnmounted(() => {
    const target = element?.value || window
    target.removeEventListener('scroll', handleScroll)
    if (scrollTimeout) {
      window.clearTimeout(scrollTimeout)
    }
  })

  return {
    scrollX,
    scrollY,
    isScrolling,
    direction
  }
}

/**
 * Infinite scroll implementation
 */
export function useInfiniteScroll(
  loadMore: () => Promise<void>,
  options: {
    threshold?: number
    container?: Ref<HTMLElement | null>
  } = {}
) {
  const { threshold = 200, container } = options

  const isLoading = ref(false)
  const hasMore = ref(true)
  const error = ref<Error | null>(null)

  const checkAndLoad = async () => {
    if (isLoading.value || !hasMore.value) return

    const target = container?.value || document.documentElement
    const scrollHeight = target.scrollHeight
    const scrollTop = container?.value ? target.scrollTop : window.scrollY
    const clientHeight = container?.value ? target.clientHeight : window.innerHeight

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      isLoading.value = true
      error.value = null

      try {
        await loadMore()
      } catch (e) {
        error.value = e as Error
      } finally {
        isLoading.value = false
      }
    }
  }

  const handleScroll = () => {
    requestAnimationFrame(checkAndLoad)
  }

  const setHasMore = (value: boolean) => {
    hasMore.value = value
  }

  const reset = () => {
    hasMore.value = true
    error.value = null
  }

  onMounted(() => {
    const target = container?.value || window
    target.addEventListener('scroll', handleScroll, { passive: true })
  })

  onUnmounted(() => {
    const target = container?.value || window
    target.removeEventListener('scroll', handleScroll)
  })

  return {
    isLoading,
    hasMore,
    error,
    setHasMore,
    reset,
    checkAndLoad
  }
}

// ============================================
// SESSION 20: Touch & Gesture Optimization
// ============================================

/**
 * Touch gesture detection
 */
export function useTouchGestures(element: Ref<HTMLElement | null>) {
  const startX = ref(0)
  const startY = ref(0)
  const deltaX = ref(0)
  const deltaY = ref(0)
  const isSwiping = ref(false)
  const swipeDirection = ref<'left' | 'right' | 'up' | 'down' | null>(null)

  const SWIPE_THRESHOLD = 50
  const SWIPE_VELOCITY_THRESHOLD = 0.3

  let startTime = 0

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0]
    startX.value = touch.clientX
    startY.value = touch.clientY
    deltaX.value = 0
    deltaY.value = 0
    isSwiping.value = true
    swipeDirection.value = null
    startTime = Date.now()
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isSwiping.value) return

    const touch = e.touches[0]
    deltaX.value = touch.clientX - startX.value
    deltaY.value = touch.clientY - startY.value
  }

  const handleTouchEnd = () => {
    if (!isSwiping.value) return

    const duration = Date.now() - startTime
    const velocityX = Math.abs(deltaX.value) / duration
    const velocityY = Math.abs(deltaY.value) / duration

    const isHorizontalSwipe = Math.abs(deltaX.value) > Math.abs(deltaY.value)

    if (isHorizontalSwipe) {
      if (Math.abs(deltaX.value) > SWIPE_THRESHOLD || velocityX > SWIPE_VELOCITY_THRESHOLD) {
        swipeDirection.value = deltaX.value > 0 ? 'right' : 'left'
      }
    } else {
      if (Math.abs(deltaY.value) > SWIPE_THRESHOLD || velocityY > SWIPE_VELOCITY_THRESHOLD) {
        swipeDirection.value = deltaY.value > 0 ? 'down' : 'up'
      }
    }

    isSwiping.value = false
  }

  watch(element, (el, oldEl) => {
    if (oldEl) {
      oldEl.removeEventListener('touchstart', handleTouchStart)
      oldEl.removeEventListener('touchmove', handleTouchMove)
      oldEl.removeEventListener('touchend', handleTouchEnd)
    }
    if (el) {
      el.addEventListener('touchstart', handleTouchStart, { passive: true })
      el.addEventListener('touchmove', handleTouchMove, { passive: true })
      el.addEventListener('touchend', handleTouchEnd, { passive: true })
    }
  }, { immediate: true })

  onUnmounted(() => {
    if (element.value) {
      element.value.removeEventListener('touchstart', handleTouchStart)
      element.value.removeEventListener('touchmove', handleTouchMove)
      element.value.removeEventListener('touchend', handleTouchEnd)
    }
  })

  return {
    startX,
    startY,
    deltaX,
    deltaY,
    isSwiping,
    swipeDirection
  }
}


// ============================================
// SESSION 21: Data Compression & Serialization
// ============================================

/**
 * Data compression utilities
 */
export function useDataCompression() {
  // Simple LZ-based compression for strings
  const compress = (data: string): string => {
    if (!data) return ''
    
    const dict: Record<string, number> = {}
    const result: number[] = []
    let dictSize = 256
    let w = ''

    for (let i = 0; i < data.length; i++) {
      const c = data[i]
      const wc = w + c
      
      if (dict[wc] !== undefined) {
        w = wc
      } else {
        result.push(w.length > 1 ? dict[w] : w.charCodeAt(0))
        dict[wc] = dictSize++
        w = c
      }
    }

    if (w) {
      result.push(w.length > 1 ? dict[w] : w.charCodeAt(0))
    }

    return result.map(n => String.fromCharCode(n)).join('')
  }

  const decompress = (compressed: string): string => {
    if (!compressed) return ''

    const dict: string[] = []
    for (let i = 0; i < 256; i++) {
      dict[i] = String.fromCharCode(i)
    }

    let w = compressed[0]
    let result = w
    let entry: string

    for (let i = 1; i < compressed.length; i++) {
      const k = compressed.charCodeAt(i)
      
      if (dict[k]) {
        entry = dict[k]
      } else if (k === dict.length) {
        entry = w + w[0]
      } else {
        throw new Error('Invalid compressed data')
      }

      result += entry
      dict.push(w + entry[0])
      w = entry
    }

    return result
  }

  // JSON with compression
  const compressJSON = <T>(data: T): string => {
    return compress(JSON.stringify(data))
  }

  const decompressJSON = <T>(compressed: string): T => {
    return JSON.parse(decompress(compressed))
  }

  // Calculate compression ratio
  const getCompressionRatio = (original: string, compressed: string): number => {
    return 1 - (compressed.length / original.length)
  }

  return {
    compress,
    decompress,
    compressJSON,
    decompressJSON,
    getCompressionRatio
  }
}

// ============================================
// SESSION 22: Query String Optimization
// ============================================

/**
 * URL query string management
 */
export function useQueryParams() {
  const getParams = (): Record<string, string> => {
    const params: Record<string, string> = {}
    const searchParams = new URLSearchParams(window.location.search)
    
    searchParams.forEach((value, key) => {
      params[key] = value
    })
    
    return params
  }

  const setParams = (
    params: Record<string, string | number | boolean | null | undefined>,
    options: { replace?: boolean } = {}
  ) => {
    const { replace = false } = options
    const searchParams = new URLSearchParams(window.location.search)

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        searchParams.delete(key)
      } else {
        searchParams.set(key, String(value))
      }
    })

    const newUrl = `${window.location.pathname}?${searchParams.toString()}`
    
    if (replace) {
      window.history.replaceState({}, '', newUrl)
    } else {
      window.history.pushState({}, '', newUrl)
    }
  }

  const getParam = (key: string): string | null => {
    const searchParams = new URLSearchParams(window.location.search)
    return searchParams.get(key)
  }

  const setParam = (
    key: string,
    value: string | number | boolean | null,
    options: { replace?: boolean } = {}
  ) => {
    setParams({ [key]: value }, options)
  }

  const removeParam = (key: string, options: { replace?: boolean } = {}) => {
    setParams({ [key]: null }, options)
  }

  const clearParams = (options: { replace?: boolean } = {}) => {
    const { replace = false } = options
    const newUrl = window.location.pathname
    
    if (replace) {
      window.history.replaceState({}, '', newUrl)
    } else {
      window.history.pushState({}, '', newUrl)
    }
  }

  return {
    getParams,
    setParams,
    getParam,
    setParam,
    removeParam,
    clearParams
  }
}

// ============================================
// SESSION 23: Focus Management
// ============================================

/**
 * Focus trap for modals and dialogs
 */
export function useFocusTrap(containerRef: Ref<HTMLElement | null>) {
  const isActive = ref(false)
  let previousActiveElement: HTMLElement | null = null

  const getFocusableElements = (): HTMLElement[] => {
    if (!containerRef.value) return []

    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ')

    return Array.from(containerRef.value.querySelectorAll<HTMLElement>(selector))
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isActive.value || e.key !== 'Tab') return

    const focusableElements = getFocusableElements()
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }
  }

  const activate = () => {
    previousActiveElement = document.activeElement as HTMLElement
    isActive.value = true
    
    document.addEventListener('keydown', handleKeyDown)
    
    // Focus first focusable element
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }
  }

  const deactivate = () => {
    isActive.value = false
    document.removeEventListener('keydown', handleKeyDown)
    
    // Restore focus
    if (previousActiveElement) {
      previousActiveElement.focus()
      previousActiveElement = null
    }
  }

  onUnmounted(deactivate)

  return {
    isActive,
    activate,
    deactivate
  }
}

// ============================================
// SESSION 24: Clipboard Optimization
// ============================================

/**
 * Clipboard operations
 */
export function useClipboard() {
  const copied = ref(false)
  const error = ref<Error | null>(null)
  let timeoutId: number | null = null

  const copy = async (text: string): Promise<boolean> => {
    error.value = null
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        const success = document.execCommand('copy')
        document.body.removeChild(textArea)
        
        if (!success) {
          throw new Error('Copy command failed')
        }
      }

      copied.value = true
      
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
      timeoutId = window.setTimeout(() => {
        copied.value = false
      }, 2000)

      return true
    } catch (e) {
      error.value = e as Error
      return false
    }
  }

  const read = async (): Promise<string | null> => {
    error.value = null
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        return await navigator.clipboard.readText()
      }
      return null
    } catch (e) {
      error.value = e as Error
      return null
    }
  }

  onUnmounted(() => {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
    }
  })

  return {
    copy,
    read,
    copied,
    error
  }
}

// ============================================
// SESSION 25: Media Query Optimization
// ============================================

/**
 * Responsive media query hook
 */
export function useMediaQuery(query: string) {
  const matches = ref(false)
  let mediaQuery: MediaQueryList | null = null

  const updateMatches = (e: MediaQueryListEvent | MediaQueryList) => {
    matches.value = e.matches
  }

  onMounted(() => {
    mediaQuery = window.matchMedia(query)
    matches.value = mediaQuery.matches
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateMatches)
    } else {
      // Legacy support
      mediaQuery.addListener(updateMatches)
    }
  })

  onUnmounted(() => {
    if (mediaQuery) {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', updateMatches)
      } else {
        mediaQuery.removeListener(updateMatches)
      }
    }
  })

  return matches
}

/**
 * Breakpoint utilities
 */
export function useBreakpoints() {
  const breakpoints = {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536
  }

  const isMobile = useMediaQuery('(max-width: 639px)')
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)')
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const isLargeDesktop = useMediaQuery('(min-width: 1280px)')

  const current = computed(() => {
    if (isLargeDesktop.value) return 'xl'
    if (isDesktop.value) return 'lg'
    if (isTablet.value) return 'md'
    return 'sm'
  })

  const isGreaterThan = (breakpoint: keyof typeof breakpoints) => {
    return useMediaQuery(`(min-width: ${breakpoints[breakpoint]}px)`)
  }

  const isLessThan = (breakpoint: keyof typeof breakpoints) => {
    return useMediaQuery(`(max-width: ${breakpoints[breakpoint] - 1}px)`)
  }

  return {
    breakpoints,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    current,
    isGreaterThan,
    isLessThan
  }
}

// ============================================
// SESSION 26: Storage Quota Management
// ============================================

/**
 * Storage quota monitoring
 */
export function useStorageQuota() {
  const quota = ref<number>(0)
  const usage = ref<number>(0)
  const percentage = computed(() => quota.value > 0 ? (usage.value / quota.value) * 100 : 0)
  const isLow = computed(() => percentage.value > 80)

  const checkQuota = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        quota.value = estimate.quota || 0
        usage.value = estimate.usage || 0
      } catch (e) {
        console.warn('Storage estimate failed:', e)
      }
    }
  }

  const requestPersistence = async (): Promise<boolean> => {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        return await navigator.storage.persist()
      } catch (e) {
        console.warn('Persistence request failed:', e)
        return false
      }
    }
    return false
  }

  const isPersisted = async (): Promise<boolean> => {
    if ('storage' in navigator && 'persisted' in navigator.storage) {
      try {
        return await navigator.storage.persisted()
      } catch (e) {
        return false
      }
    }
    return false
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  onMounted(checkQuota)

  return {
    quota,
    usage,
    percentage,
    isLow,
    checkQuota,
    requestPersistence,
    isPersisted,
    formatBytes
  }
}

// ============================================
// SESSION 27: Error Boundary & Recovery
// ============================================

/**
 * Error recovery utilities
 */
export function useErrorRecovery() {
  const errors = ref<Error[]>([])
  const lastError = computed(() => errors.value[errors.value.length - 1] || null)
  const hasError = computed(() => errors.value.length > 0)

  const captureError = (error: Error, context?: string) => {
    const enrichedError = new Error(
      context ? `[${context}] ${error.message}` : error.message
    )
    enrichedError.stack = error.stack
    errors.value.push(enrichedError)

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Captured error:', enrichedError)
    }
  }

  const clearErrors = () => {
    errors.value = []
  }

  const clearLastError = () => {
    errors.value.pop()
  }

  const withErrorHandling = async <T>(
    fn: () => Promise<T>,
    options: {
      context?: string
      fallback?: T
      onError?: (error: Error) => void
    } = {}
  ): Promise<T | undefined> => {
    const { context, fallback, onError } = options

    try {
      return await fn()
    } catch (error) {
      captureError(error as Error, context)
      onError?.(error as Error)
      return fallback
    }
  }

  return {
    errors,
    lastError,
    hasError,
    captureError,
    clearErrors,
    clearLastError,
    withErrorHandling
  }
}

// ============================================
// SESSION 28: Polling & Long Polling
// ============================================

/**
 * Polling with smart intervals
 */
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  options: {
    interval?: number
    immediate?: boolean
    enabled?: Ref<boolean>
    onSuccess?: (data: T) => void
    onError?: (error: Error) => void
    adaptiveInterval?: boolean
    minInterval?: number
    maxInterval?: number
  } = {}
) {
  const {
    interval = 5000,
    immediate = true,
    enabled = ref(true),
    onSuccess,
    onError,
    adaptiveInterval = false,
    minInterval = 1000,
    maxInterval = 30000
  } = options

  const data = ref<T | null>(null) as Ref<T | null>
  const error = ref<Error | null>(null)
  const isPolling = ref(false)
  const currentInterval = ref(interval)
  let timeoutId: number | null = null
  let consecutiveErrors = 0

  const poll = async () => {
    if (!enabled.value) return

    isPolling.value = true
    error.value = null

    try {
      const result = await fetchFn()
      data.value = result
      onSuccess?.(result)
      consecutiveErrors = 0

      // Adaptive: decrease interval on success
      if (adaptiveInterval && currentInterval.value > minInterval) {
        currentInterval.value = Math.max(minInterval, currentInterval.value * 0.9)
      }
    } catch (e) {
      error.value = e as Error
      onError?.(e as Error)
      consecutiveErrors++

      // Adaptive: increase interval on error
      if (adaptiveInterval) {
        currentInterval.value = Math.min(
          maxInterval,
          currentInterval.value * Math.pow(1.5, consecutiveErrors)
        )
      }
    } finally {
      isPolling.value = false
      scheduleNext()
    }
  }

  const scheduleNext = () => {
    if (!enabled.value) return
    timeoutId = window.setTimeout(poll, currentInterval.value)
  }

  const start = () => {
    stop()
    if (immediate) {
      poll()
    } else {
      scheduleNext()
    }
  }

  const stop = () => {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  const reset = () => {
    stop()
    data.value = null
    error.value = null
    currentInterval.value = interval
    consecutiveErrors = 0
  }

  watch(enabled, (isEnabled) => {
    if (isEnabled) {
      start()
    } else {
      stop()
    }
  })

  onMounted(() => {
    if (enabled.value) {
      start()
    }
  })

  onUnmounted(stop)

  return {
    data,
    error,
    isPolling,
    currentInterval,
    start,
    stop,
    reset,
    poll
  }
}


// ============================================
// SESSION 29: Concurrent Request Management
// ============================================

/**
 * Concurrent request limiter
 */
export function useConcurrentRequests(maxConcurrent: number = 5) {
  const activeCount = ref(0)
  const queuedCount = ref(0)
  const queue: Array<{
    fn: () => Promise<any>
    resolve: (value: any) => void
    reject: (error: Error) => void
  }> = []

  const processQueue = async () => {
    while (queue.length > 0 && activeCount.value < maxConcurrent) {
      const item = queue.shift()
      if (!item) continue

      queuedCount.value--
      activeCount.value++

      try {
        const result = await item.fn()
        item.resolve(result)
      } catch (error) {
        item.reject(error as Error)
      } finally {
        activeCount.value--
        processQueue()
      }
    }
  }

  const execute = <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (activeCount.value < maxConcurrent) {
        activeCount.value++
        fn()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            activeCount.value--
            processQueue()
          })
      } else {
        queue.push({ fn, resolve, reject })
        queuedCount.value++
      }
    })
  }

  const setMaxConcurrent = (value: number) => {
    maxConcurrent = Math.max(1, value)
    processQueue()
  }

  return {
    execute,
    activeCount,
    queuedCount,
    setMaxConcurrent
  }
}

/**
 * Request cancellation with AbortController
 */
export function useAbortController() {
  const controllers = new Map<string, AbortController>()

  const create = (key: string): AbortSignal => {
    // Cancel existing request with same key
    cancel(key)
    
    const controller = new AbortController()
    controllers.set(key, controller)
    return controller.signal
  }

  const cancel = (key: string): boolean => {
    const controller = controllers.get(key)
    if (controller) {
      controller.abort()
      controllers.delete(key)
      return true
    }
    return false
  }

  const cancelAll = () => {
    controllers.forEach(controller => controller.abort())
    controllers.clear()
  }

  const isAborted = (key: string): boolean => {
    const controller = controllers.get(key)
    return controller?.signal.aborted ?? false
  }

  onUnmounted(cancelAll)

  return {
    create,
    cancel,
    cancelAll,
    isAborted
  }
}

// ============================================
// SESSION 30: Performance Dashboard & Monitoring
// ============================================

/**
 * Performance dashboard data collector
 */
export function usePerformanceDashboard() {
  const stats = ref({
    // Memory
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
    memoryUsagePercent: 0,
    
    // Timing
    pageLoadTime: 0,
    domContentLoaded: 0,
    firstPaint: 0,
    firstContentfulPaint: 0,
    
    // Network
    requestCount: 0,
    transferSize: 0,
    
    // Custom
    componentRenderCount: 0,
    apiCallCount: 0,
    cacheHitRate: 0
  })

  const apiCalls = ref<Array<{
    url: string
    method: string
    duration: number
    status: number
    timestamp: number
  }>>([])

  const componentRenders = ref<Array<{
    name: string
    duration: number
    timestamp: number
  }>>([])

  // Collect memory stats
  const collectMemoryStats = () => {
    const memory = (performance as any).memory
    if (memory) {
      stats.value.usedJSHeapSize = memory.usedJSHeapSize
      stats.value.totalJSHeapSize = memory.totalJSHeapSize
      stats.value.jsHeapSizeLimit = memory.jsHeapSizeLimit
      stats.value.memoryUsagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    }
  }

  // Collect timing stats
  const collectTimingStats = () => {
    const timing = performance.timing
    if (timing) {
      stats.value.pageLoadTime = timing.loadEventEnd - timing.navigationStart
      stats.value.domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart
    }

    // Paint timing
    const paintEntries = performance.getEntriesByType('paint')
    paintEntries.forEach(entry => {
      if (entry.name === 'first-paint') {
        stats.value.firstPaint = entry.startTime
      } else if (entry.name === 'first-contentful-paint') {
        stats.value.firstContentfulPaint = entry.startTime
      }
    })
  }

  // Collect network stats
  const collectNetworkStats = () => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    stats.value.requestCount = resources.length
    stats.value.transferSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
  }

  // Track API call
  const trackApiCall = (
    url: string,
    method: string,
    duration: number,
    status: number
  ) => {
    apiCalls.value.push({
      url,
      method,
      duration,
      status,
      timestamp: Date.now()
    })
    stats.value.apiCallCount++

    // Keep only last 100 calls
    if (apiCalls.value.length > 100) {
      apiCalls.value.shift()
    }
  }

  // Track component render
  const trackComponentRender = (name: string, duration: number) => {
    componentRenders.value.push({
      name,
      duration,
      timestamp: Date.now()
    })
    stats.value.componentRenderCount++

    // Keep only last 100 renders
    if (componentRenders.value.length > 100) {
      componentRenders.value.shift()
    }
  }

  // Update cache hit rate
  const updateCacheHitRate = (hits: number, total: number) => {
    stats.value.cacheHitRate = total > 0 ? (hits / total) * 100 : 0
  }

  // Get average API response time
  const getAverageApiTime = computed(() => {
    if (apiCalls.value.length === 0) return 0
    const sum = apiCalls.value.reduce((acc, call) => acc + call.duration, 0)
    return sum / apiCalls.value.length
  })

  // Get slowest API calls
  const getSlowestApiCalls = computed(() => {
    return [...apiCalls.value]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
  })

  // Get slowest component renders
  const getSlowestRenders = computed(() => {
    return [...componentRenders.value]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
  })

  // Collect all stats
  const collectAll = () => {
    collectMemoryStats()
    collectTimingStats()
    collectNetworkStats()
  }

  // Format bytes for display
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  // Format duration for display
  const formatDuration = (ms: number): string => {
    if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`
    if (ms < 1000) return `${ms.toFixed(2)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  // Clear all tracked data
  const clear = () => {
    apiCalls.value = []
    componentRenders.value = []
    stats.value.componentRenderCount = 0
    stats.value.apiCallCount = 0
  }

  // Auto-collect on mount
  onMounted(() => {
    collectAll()
    
    // Periodic collection
    const intervalId = setInterval(collectMemoryStats, 5000)
    onUnmounted(() => clearInterval(intervalId))
  })

  return {
    stats,
    apiCalls,
    componentRenders,
    collectAll,
    collectMemoryStats,
    collectTimingStats,
    collectNetworkStats,
    trackApiCall,
    trackComponentRender,
    updateCacheHitRate,
    getAverageApiTime,
    getSlowestApiCalls,
    getSlowestRenders,
    formatBytes,
    formatDuration,
    clear
  }
}

// All utilities are exported inline with their function definitions
