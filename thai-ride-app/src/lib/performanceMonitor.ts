/**
 * Performance Monitor
 * Client-side performance monitoring for production
 */

import { logger } from '../utils/logger'
import { isProduction } from './envValidation'

export interface PerformanceMetrics {
  // Navigation Timing
  dns: number
  tcp: number
  ttfb: number
  domLoad: number
  windowLoad: number
  
  // Core Web Vitals
  fcp?: number
  lcp?: number
  fid?: number
  cls?: number
  
  // Custom
  timestamp: string
  url: string
}

type MetricsHandler = (metrics: PerformanceMetrics) => void

const metricsHandlers: MetricsHandler[] = []

/**
 * Register metrics handler
 */
export function registerMetricsHandler(handler: MetricsHandler): () => void {
  metricsHandlers.push(handler)
  return () => {
    const index = metricsHandlers.indexOf(handler)
    if (index > -1) metricsHandlers.splice(index, 1)
  }
}

/**
 * Collect navigation timing metrics
 */
export function collectNavigationMetrics(): Partial<PerformanceMetrics> {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  
  if (!nav) return {}
  
  return {
    dns: nav.domainLookupEnd - nav.domainLookupStart,
    tcp: nav.connectEnd - nav.connectStart,
    ttfb: nav.responseStart - nav.requestStart,
    domLoad: nav.domContentLoadedEventEnd - nav.navigationStart,
    windowLoad: nav.loadEventEnd - nav.navigationStart
  }
}

/**
 * Observe Core Web Vitals
 */
export function observeWebVitals(callback: (metric: { name: string; value: number }) => void): void {
  // First Contentful Paint
  const paintObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        callback({ name: 'FCP', value: entry.startTime })
      }
    }
  })
  
  try {
    paintObserver.observe({ type: 'paint', buffered: true })
  } catch (e) {
    // Not supported
  }

  // Largest Contentful Paint
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lastEntry = entries[entries.length - 1]
    callback({ name: 'LCP', value: lastEntry.startTime })
  })
  
  try {
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
  } catch (e) {
    // Not supported
  }

  // First Input Delay
  const fidObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const fidEntry = entry as PerformanceEventTiming
      callback({ name: 'FID', value: fidEntry.processingStart - fidEntry.startTime })
    }
  })
  
  try {
    fidObserver.observe({ type: 'first-input', buffered: true })
  } catch (e) {
    // Not supported
  }

  // Cumulative Layout Shift
  let clsValue = 0
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value
      }
    }
    callback({ name: 'CLS', value: clsValue })
  })
  
  try {
    clsObserver.observe({ type: 'layout-shift', buffered: true })
  } catch (e) {
    // Not supported
  }
}

/**
 * Measure function execution time
 */
export function measureTime<T>(name: string, fn: () => T): T {
  const start = performance.now()
  const result = fn()
  const duration = performance.now() - start
  
  if (!isProduction()) {
    logger.debug(`[Performance] ${name}: ${duration.toFixed(2)}ms`)
  }
  
  return result
}

/**
 * Measure async function execution time
 */
export async function measureTimeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start
  
  if (!isProduction()) {
    logger.debug(`[Performance] ${name}: ${duration.toFixed(2)}ms`)
  }
  
  return result
}

/**
 * Create performance mark
 */
export function mark(name: string): void {
  performance.mark(name)
}

/**
 * Measure between two marks
 */
export function measureBetween(name: string, startMark: string, endMark: string): number {
  try {
    performance.measure(name, startMark, endMark)
    const entries = performance.getEntriesByName(name, 'measure')
    return entries[entries.length - 1]?.duration || 0
  } catch {
    return 0
  }
}

/**
 * Get memory usage (if available)
 */
export function getMemoryUsage(): { usedJSHeapSize: number; totalJSHeapSize: number } | null {
  const memory = (performance as any).memory
  if (!memory) return null
  
  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize
  }
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring(): void {
  // Collect metrics after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navMetrics = collectNavigationMetrics()
      const webVitals: Partial<PerformanceMetrics> = {}
      
      observeWebVitals((metric) => {
        switch (metric.name) {
          case 'FCP': webVitals.fcp = metric.value; break
          case 'LCP': webVitals.lcp = metric.value; break
          case 'FID': webVitals.fid = metric.value; break
          case 'CLS': webVitals.cls = metric.value; break
        }
      })
      
      // Report after 5 seconds to capture all vitals
      setTimeout(() => {
        const metrics: PerformanceMetrics = {
          ...navMetrics,
          ...webVitals,
          timestamp: new Date().toISOString(),
          url: window.location.href
        } as PerformanceMetrics
        
        metricsHandlers.forEach(handler => {
          try {
            handler(metrics)
          } catch (e) {
            console.error('Metrics handler failed:', e)
          }
        })
        
        if (!isProduction()) {
          logger.info('Performance metrics:', metrics)
        }
      }, 5000)
    }, 0)
  })
}
