/**
 * Global Error Handling Setup
 * Initialize error handling for the entire application
 */
import { setupGlobalErrorHandler } from '@/composables/useErrorHandler'
import { apiService } from '@/services/apiService'

/**
 * Setup global error handling
 * Call this in main.ts
 */
export function setupErrorHandling(): void {
  // Setup global error handlers
  setupGlobalErrorHandler()
  
  // Setup network connectivity monitoring
  setupNetworkMonitoring()
  
  // Setup performance monitoring
  setupPerformanceMonitoring()
  
  console.log('[ErrorHandling] Global error handling initialized')
}

/**
 * Monitor network connectivity
 */
function setupNetworkMonitoring(): void {
  // Online/offline detection
  window.addEventListener('online', () => {
    console.log('[Network] Connection restored')
    // Could show a toast notification here
  })
  
  window.addEventListener('offline', () => {
    console.warn('[Network] Connection lost')
    // Could show a toast notification here
  })
  
  // Periodic connectivity check
  setInterval(async () => {
    const isConnected = await apiService.checkConnectivity()
    if (!isConnected && navigator.onLine) {
      console.warn('[Network] API connectivity issues detected')
    }
  }, 30000) // Check every 30 seconds
}

/**
 * Monitor performance issues
 */
function setupPerformanceMonitoring(): void {
  // Monitor long tasks
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            console.warn('[Performance] Long task detected:', {
              duration: entry.duration,
              startTime: entry.startTime
            })
          }
        }
      })
      
      observer.observe({ entryTypes: ['longtask'] })
    } catch (error) {
      console.warn('[Performance] PerformanceObserver not supported:', error)
    }
  }
  
  // Monitor memory usage (if available)
  if ('memory' in performance) {
    setInterval(() => {
      const memory = (performance as any).memory
      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
        console.warn('[Performance] High memory usage detected:', {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        })
      }
    }, 60000) // Check every minute
  }
}

/**
 * Error reporting configuration
 */
export interface ErrorReportingConfig {
  apiKey?: string
  environment: 'development' | 'staging' | 'production'
  userId?: string
  enableConsoleLogging: boolean
  enableToastNotifications: boolean
}

let errorConfig: ErrorReportingConfig = {
  environment: 'development',
  enableConsoleLogging: true,
  enableToastNotifications: true
}

export function configureErrorReporting(config: Partial<ErrorReportingConfig>): void {
  errorConfig = { ...errorConfig, ...config }
  console.log('[ErrorHandling] Error reporting configured:', errorConfig)
}

export function getErrorConfig(): ErrorReportingConfig {
  return errorConfig
}