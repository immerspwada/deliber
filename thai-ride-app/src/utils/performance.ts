/**
 * Performance Monitoring Utilities
 * Production-ready performance measurement and optimization tools
 */

// =====================================================
// PERFORMANCE MEASUREMENT
// =====================================================

/**
 * Measure async function execution time
 * Logs warnings for slow operations and sends metrics in production
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  warnThreshold = 1000
): Promise<T> {
  const start = performance.now()

  try {
    const result = await fn()
    const duration = performance.now() - start

    // Log warning for slow operations
    if (duration > warnThreshold) {
      console.warn(`[Perf] ${name}: ${duration.toFixed(0)}ms (slow)`)
    } else {
      console.debug(`[Perf] ${name}: ${duration.toFixed(0)}ms`)
    }

    // Send to analytics in production
    if (import.meta.env.PROD) {
      sendMetric(name, duration)
    }

    return result
  } catch (error) {
    const duration = performance.now() - start
    console.error(`[Perf] ${name}: ${duration.toFixed(0)}ms (error)`, error)
    
    if (import.meta.env.PROD) {
      sendMetric(`${name}_error`, duration)
    }
    
    throw error
  }
}

/**
 * Measure sync function execution time
 */
export function measureSync<T>(
  name: string,
  fn: () => T,
  warnThreshold = 100
): T {
  const start = performance.now()

  try {
    const result = fn()
    const duration = performance.now() - start

    if (duration > warnThreshold) {
      console.warn(`[Perf] ${name}: ${duration.toFixed(0)}ms (slow sync)`)
    }

    if (import.meta.env.PROD) {
      sendMetric(name, duration)
    }

    return result
  } catch (error) {
    const duration = performance.now() - start
    console.error(`[Perf] ${name}: ${duration.toFixed(0)}ms (sync error)`, error)
    throw error
  }
}

// =====================================================
// CACHING UTILITIES
// =====================================================

interface CacheEntry<T> {
  data: T
  expires: number
  hits: number
}

/**
 * Simple in-memory cache with TTL and hit tracking
 */
export class PerformanceCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private maxSize: number
  private defaultTTL: number

  constructor(maxSize = 100, defaultTTL = 5 * 60 * 1000) {
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    if (entry.expires < Date.now()) {
      this.cache.delete(key)
      return null
    }
    
    entry.hits++
    return entry.data
  }

  set(key: string, data: T, ttl?: number): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + (ttl || this.defaultTTL),
      hits: 0
    })
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  getStats() {
    const entries = Array.from(this.cache.values())
    return {
      size: this.cache.size,
      totalHits: entries.reduce((sum, entry) => sum + entry.hits, 0),
      avgHits: entries.length > 0 ? entries.reduce((sum, entry) => sum + entry.hits, 0) / entries.length : 0
    }
  }
}

/**
 * Cached function wrapper with automatic cache management
 */
export function cached<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    keyFn?: (...args: T) => string
    ttl?: number
    maxSize?: number
  } = {}
): (...args: T) => Promise<R> {
  const cache = new PerformanceCache<R>(options.maxSize, options.ttl)
  const keyFn = options.keyFn || ((...args) => JSON.stringify(args))

  return async (...args: T): Promise<R> => {
    const key = keyFn(...args)
    
    // Check cache first
    const cached = cache.get(key)
    if (cached !== null) {
      return cached
    }

    // Execute function and cache result
    const result = await fn(...args)
    cache.set(key, result)
    
    return result
  }
}

// =====================================================
// DEBOUNCING & THROTTLING
// =====================================================

/**
 * Debounce function calls
 */
export function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number
): (...args: T) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  
  return (...args: T) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Throttle function calls
 */
export function throttle<T extends unknown[]>(
  fn: (...args: T) => void,
  limit: number
): (...args: T) => void {
  let inThrottle: boolean
  
  return (...args: T) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// =====================================================
// METRICS COLLECTION
// =====================================================

interface Metric {
  name: string
  value: number
  timestamp: number
  tags?: Record<string, string>
}

const metricsQueue: Metric[] = []
const BATCH_SIZE = 10
const FLUSH_INTERVAL = 30000 // 30 seconds

/**
 * Send performance metric
 */
function sendMetric(name: string, value: number, tags?: Record<string, string>): void {
  metricsQueue.push({
    name,
    value,
    timestamp: Date.now(),
    tags
  })

  // Flush if batch is full
  if (metricsQueue.length >= BATCH_SIZE) {
    flushMetrics()
  }
}

/**
 * Flush metrics to analytics service
 */
function flushMetrics(): void {
  if (metricsQueue.length === 0) return

  const batch = metricsQueue.splice(0, BATCH_SIZE)
  
  // Send to your analytics service
  // Example: Sentry, DataDog, custom endpoint
  if (import.meta.env.PROD) {
    fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metrics: batch })
    }).catch(err => {
      console.warn('[Metrics] Failed to send metrics:', err)
    })
  }
}

// Auto-flush metrics periodically
if (typeof window !== 'undefined') {
  setInterval(flushMetrics, FLUSH_INTERVAL)
  
  // Flush on page unload
  window.addEventListener('beforeunload', flushMetrics)
}

// =====================================================
// RESOURCE MONITORING
// =====================================================

/**
 * Monitor memory usage
 */
export function getMemoryUsage(): {
  used: number
  total: number
  percentage: number
} | null {
  if ('memory' in performance) {
    const memory = (performance as any).memory
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
    }
  }
  return null
}

/**
 * Monitor connection quality
 */
export function getConnectionInfo(): {
  effectiveType: string
  downlink: number
  rtt: number
} | null {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt
    }
  }
  return null
}

/**
 * Performance observer for Core Web Vitals
 */
export function observeWebVitals(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return
  }

  // Largest Contentful Paint
  new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lastEntry = entries[entries.length - 1]
    sendMetric('lcp', lastEntry.startTime)
  }).observe({ entryTypes: ['largest-contentful-paint'] })

  // First Input Delay
  new PerformanceObserver((list) => {
    const entries = list.getEntries()
    entries.forEach((entry) => {
      sendMetric('fid', entry.processingStart - entry.startTime)
    })
  }).observe({ entryTypes: ['first-input'] })

  // Cumulative Layout Shift
  new PerformanceObserver((list) => {
    let clsValue = 0
    const entries = list.getEntries()
    entries.forEach((entry) => {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value
      }
    })
    sendMetric('cls', clsValue)
  }).observe({ entryTypes: ['layout-shift'] })
}

// Auto-start web vitals monitoring
if (typeof window !== 'undefined') {
  observeWebVitals()
}