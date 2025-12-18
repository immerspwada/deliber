/**
 * Smart Performance Monitoring (F194)
 * 
 * ระบบตรวจสอบประสิทธิภาพแอปแบบอัตโนมัติ รวมถึง Core Web Vitals และ memory usage
 * 
 * Features:
 * - Core Web Vitals tracking (LCP, FID, CLS)
 * - Memory usage monitoring
 * - Network performance analysis
 * - API response time tracking
 * - Performance scoring and recommendations
 * - Automatic issue detection and alerting
 * 
 * @syncs-with
 * - Admin: Performance dashboard and alerts
 * - Customer: Optimized experience based on performance
 * - Provider: Performance-aware features
 */

import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { logger } from '../utils/logger'
import { captureError } from '../lib/sentry'

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  fcp?: number // First Contentful Paint
  ttfb?: number // Time to First Byte

  // Memory metrics
  usedJSHeapSize?: number
  totalJSHeapSize?: number
  jsHeapSizeLimit?: number
  memoryUsagePercent?: number

  // Network metrics
  connectionType?: string
  effectiveType?: string
  downlink?: number
  rtt?: number

  // Custom metrics
  pageLoadTime?: number
  domContentLoadedTime?: number
  resourceLoadTime?: number
  
  // App-specific metrics
  apiResponseTime?: number
  renderTime?: number
  interactionTime?: number
  
  // Performance timestamps
  navigationStart?: number
  loadComplete?: number
  firstPaint?: number
  firstContentfulPaint?: number
}

export interface PerformanceThresholds {
  lcp: { good: number; poor: number }
  fid: { good: number; poor: number }
  cls: { good: number; poor: number }
  memoryUsage: { warning: number; critical: number }
  apiResponse: { good: number; poor: number }
  renderTime: { good: number; poor: number }
}

export interface PerformanceIssue {
  type: 'warning' | 'error' | 'critical'
  metric: string
  value: number
  threshold: number
  message: string
  timestamp: number
  recommendations: string[]
}

export interface PerformanceReport {
  timestamp: string
  metrics: PerformanceMetrics
  score: number
  grade: string
  issues: PerformanceIssue[]
  recommendations: string[]
  deviceInfo: {
    userAgent: string
    platform: string
    memory?: number
    cores?: number
  }
}

/**
 * Smart Performance Monitoring Composable
 */
export function usePerformanceMonitoring() {
  const metrics = ref<PerformanceMetrics>({})
  const isMonitoring = ref(false)
  const performanceIssues = ref<PerformanceIssue[]>([])
  const cleanupTasks = ref<Array<() => void>>([])
  
  // Default thresholds based on Google's recommendations
  const thresholds: PerformanceThresholds = {
    lcp: { good: 2500, poor: 4000 },
    fid: { good: 100, poor: 300 },
    cls: { good: 0.1, poor: 0.25 },
    memoryUsage: { warning: 70, critical: 90 },
    apiResponse: { good: 1000, poor: 3000 },
    renderTime: { good: 16.67, poor: 33.33 } // 60fps and 30fps
  }

  let performanceObserver: PerformanceObserver | null = null
  let memoryMonitorInterval: number | null = null
  let clsValue = 0

  /**
   * Add cleanup task
   */
  const addCleanup = (task: () => void) => {
    cleanupTasks.value.push(task)
  }

  /**
   * Initialize performance monitoring
   */
  const startMonitoring = () => {
    if (isMonitoring.value) return

    isMonitoring.value = true
    performanceIssues.value = []
    clsValue = 0

    try {
      // Initialize basic metrics
      initializeBasicMetrics()

      // Monitor Core Web Vitals
      if ('PerformanceObserver' in window) {
        setupPerformanceObserver()
      }

      // Monitor memory usage
      startMemoryMonitoring()

      // Monitor network information
      updateNetworkInfo()

      // Setup periodic checks
      setupPeriodicChecks()

      logger.info('Performance monitoring started')
    } catch (error) {
      logger.error('Failed to start performance monitoring:', error)
      captureError(error as Error, { context: 'performance_monitoring_start' })
    }
  }

  /**
   * Initialize basic performance metrics
   */
  const initializeBasicMetrics = () => {
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      if (navigation) {
        metrics.value.navigationStart = navigation.fetchStart
        metrics.value.ttfb = navigation.responseStart - navigation.requestStart
        metrics.value.domContentLoadedTime = navigation.domContentLoadedEventEnd - navigation.fetchStart
        metrics.value.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart
      }

      // Get paint metrics
      const paintEntries = performance.getEntriesByType('paint')
      paintEntries.forEach(entry => {
        if (entry.name === 'first-paint') {
          metrics.value.firstPaint = entry.startTime
        } else if (entry.name === 'first-contentful-paint') {
          metrics.value.fcp = entry.startTime
          metrics.value.firstContentfulPaint = entry.startTime
        }
      })
    }
  }

  /**
   * Setup Performance Observer for Core Web Vitals
   */
  const setupPerformanceObserver = () => {
    performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        handlePerformanceEntry(entry)
      }
    })

    // Observe different types of performance entries
    const entryTypes = [
      'largest-contentful-paint',
      'first-input',
      'layout-shift',
      'paint',
      'navigation',
      'resource'
    ]

    entryTypes.forEach(type => {
      try {
        performanceObserver?.observe({ entryTypes: [type] })
      } catch (e) {
        logger.warn(`Performance observation for ${type} not supported`)
      }
    })

    addCleanup(() => {
      if (performanceObserver) {
        performanceObserver.disconnect()
        performanceObserver = null
      }
    })
  }

  /**
   * Handle performance entries
   */
  const handlePerformanceEntry = (entry: PerformanceEntry) => {
    switch (entry.entryType) {
      case 'largest-contentful-paint':
        metrics.value.lcp = entry.startTime
        checkThreshold('lcp', entry.startTime, thresholds.lcp, 'Largest Contentful Paint')
        break

      case 'first-input':
        const fidEntry = entry as PerformanceEventTiming
        metrics.value.fid = fidEntry.processingStart - fidEntry.startTime
        checkThreshold('fid', metrics.value.fid, thresholds.fid, 'First Input Delay')
        break

      case 'layout-shift':
        const clsEntry = entry as any
        if (!clsEntry.hadRecentInput) {
          clsValue += clsEntry.value
          metrics.value.cls = clsValue
          checkThreshold('cls', clsValue, thresholds.cls, 'Cumulative Layout Shift')
        }
        break

      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          metrics.value.fcp = entry.startTime
        }
        break

      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming
        metrics.value.ttfb = navEntry.responseStart - navEntry.requestStart
        metrics.value.domContentLoadedTime = navEntry.domContentLoadedEventEnd - navEntry.fetchStart
        metrics.value.pageLoadTime = navEntry.loadEventEnd - navEntry.fetchStart
        break

      case 'resource':
        // Track resource loading times
        const resourceEntry = entry as PerformanceResourceTiming
        if (resourceEntry.duration > 1000) { // Resources taking more than 1 second
          logger.warn(`Slow resource load: ${resourceEntry.name} took ${resourceEntry.duration.toFixed(2)}ms`)
        }
        break
    }
  }

  /**
   * Check performance thresholds and create issues
   */
  const checkThreshold = (
    metric: string,
    value: number,
    threshold: { good: number; poor: number },
    displayName: string
  ) => {
    let issueType: 'warning' | 'error' | 'critical' | null = null
    let recommendations: string[] = []

    if (value > threshold.poor) {
      issueType = 'critical'
      recommendations = getRecommendations(metric, 'critical')
    } else if (value > threshold.good) {
      issueType = 'warning'
      recommendations = getRecommendations(metric, 'warning')
    }

    if (issueType) {
      const issue: PerformanceIssue = {
        type: issueType,
        metric,
        value,
        threshold: issueType === 'critical' ? threshold.poor : threshold.good,
        message: `${displayName} is ${issueType}: ${value.toFixed(2)}ms`,
        timestamp: Date.now(),
        recommendations
      }

      performanceIssues.value.push(issue)
      
      if (issueType === 'critical') {
        logger.error(issue.message)
        captureError(new Error(issue.message), { 
          context: 'performance_critical_issue',
          metric,
          value,
          threshold: threshold.poor
        })
      } else {
        logger.warn(issue.message)
      }
    }
  }

  /**
   * Get performance recommendations
   */
  const getRecommendations = (metric: string, _severity: 'warning' | 'critical'): string[] => {
    const recommendations: Record<string, string[]> = {
      lcp: [
        'ปรับปรุงการโหลดรูปภาพด้วย lazy loading และ WebP format',
        'ใช้ CDN สำหรับ static assets',
        'ลด blocking resources ใน critical path',
        'ปรับปรุง server response time'
      ],
      fid: [
        'ลด JavaScript execution time',
        'ใช้ code splitting และ lazy loading',
        'ปรับปรุง main thread blocking',
        'ใช้ Web Workers สำหรับ heavy computations'
      ],
      cls: [
        'กำหนด dimensions สำหรับ images และ videos',
        'หลีกเลี่ยงการ inject content ด้านบน existing content',
        'ใช้ transform animations แทน layout-triggering properties',
        'Preload fonts เพื่อลด font swap'
      ],
      memoryUsage: [
        'ทำ cleanup unused objects และ event listeners',
        'ใช้ object pooling สำหรับ frequently created objects',
        'ลด memory leaks จาก closures และ timers',
        'ปรับปรุง data structures ให้มีประสิทธิภาพ'
      ],
      apiResponse: [
        'ใช้ request caching และ memoization',
        'ปรับปรุง database queries',
        'ใช้ pagination สำหรับ large datasets',
        'Implement request deduplication'
      ]
    }

    return recommendations[metric] || ['ปรับปรุงประสิทธิภาพทั่วไป']
  }

  /**
   * Monitor memory usage
   */
  const startMemoryMonitoring = () => {
    const updateMemoryMetrics = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        metrics.value.usedJSHeapSize = memory.usedJSHeapSize
        metrics.value.totalJSHeapSize = memory.totalJSHeapSize
        metrics.value.jsHeapSizeLimit = memory.jsHeapSizeLimit
        
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        metrics.value.memoryUsagePercent = usagePercent

        // Check memory thresholds
        if (usagePercent > thresholds.memoryUsage.critical) {
          const issue: PerformanceIssue = {
            type: 'critical',
            metric: 'memoryUsage',
            value: usagePercent,
            threshold: thresholds.memoryUsage.critical,
            message: `Critical memory usage: ${usagePercent.toFixed(1)}%`,
            timestamp: Date.now(),
            recommendations: getRecommendations('memoryUsage', 'critical')
          }
          performanceIssues.value.push(issue)
          logger.error(issue.message)
        } else if (usagePercent > thresholds.memoryUsage.warning) {
          logger.warn(`High memory usage: ${usagePercent.toFixed(1)}%`)
        }
      }
    }

    updateMemoryMetrics()
    memoryMonitorInterval = setInterval(updateMemoryMetrics, 10000) // Every 10 seconds
    
    addCleanup(() => {
      if (memoryMonitorInterval) {
        clearInterval(memoryMonitorInterval)
        memoryMonitorInterval = null
      }
    })
  }

  /**
   * Update network information
   */
  const updateNetworkInfo = () => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      metrics.value.connectionType = connection.type
      metrics.value.effectiveType = connection.effectiveType
      metrics.value.downlink = connection.downlink
      metrics.value.rtt = connection.rtt

      // Listen for connection changes
      const handleConnectionChange = () => updateNetworkInfo()
      connection.addEventListener('change', handleConnectionChange)
      
      addCleanup(() => {
        connection.removeEventListener('change', handleConnectionChange)
      })
    }
  }

  /**
   * Setup periodic performance checks
   */
  const setupPeriodicChecks = () => {
    // Check for performance issues every 30 seconds
    const performanceCheckInterval = setInterval(() => {
      // Clear old issues (older than 5 minutes)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      performanceIssues.value = performanceIssues.value.filter(
        issue => issue.timestamp > fiveMinutesAgo
      )
    }, 30000)

    addCleanup(() => clearInterval(performanceCheckInterval))
  }

  /**
   * Measure API response time
   */
  const measureApiResponse = async <T>(
    apiCall: () => Promise<T>,
    apiName?: string
  ): Promise<T> => {
    const startTime = performance.now()
    
    try {
      const result = await apiCall()
      const responseTime = performance.now() - startTime
      
      metrics.value.apiResponseTime = responseTime
      
      // Check API response threshold
      if (responseTime > thresholds.apiResponse.poor) {
        const issue: PerformanceIssue = {
          type: 'error',
          metric: 'apiResponse',
          value: responseTime,
          threshold: thresholds.apiResponse.poor,
          message: `Slow API response${apiName ? ` (${apiName})` : ''}: ${responseTime.toFixed(2)}ms`,
          timestamp: Date.now(),
          recommendations: getRecommendations('apiResponse', 'critical')
        }
        performanceIssues.value.push(issue)
        logger.warn(issue.message)
      }
      
      return result
    } catch (error) {
      const responseTime = performance.now() - startTime
      logger.error(`API call failed${apiName ? ` (${apiName})` : ''} after ${responseTime.toFixed(2)}ms:`, error)
      throw error
    }
  }

  /**
   * Measure render time
   */
  const measureRenderTime = async (renderFn: () => Promise<void> | void) => {
    const startTime = performance.now()
    
    await renderFn()
    await nextTick()
    
    const renderTime = performance.now() - startTime
    metrics.value.renderTime = renderTime
    
    if (renderTime > thresholds.renderTime.poor) {
      const issue: PerformanceIssue = {
        type: 'warning',
        metric: 'renderTime',
        value: renderTime,
        threshold: thresholds.renderTime.poor,
        message: `Slow render: ${renderTime.toFixed(2)}ms`,
        timestamp: Date.now(),
        recommendations: [
          'ใช้ v-memo สำหรับ expensive computations',
          'ปรับปรุง component structure',
          'ลด reactive dependencies',
          'ใช้ virtual scrolling สำหรับ large lists'
        ]
      }
      performanceIssues.value.push(issue)
      logger.warn(issue.message)
    }
    
    return renderTime
  }

  /**
   * Get performance score (0-100)
   */
  const getPerformanceScore = computed(() => {
    let score = 100
    let factors = 0

    // LCP score (30% weight)
    if (metrics.value.lcp) {
      factors++
      if (metrics.value.lcp > thresholds.lcp.poor) score -= 30
      else if (metrics.value.lcp > thresholds.lcp.good) score -= 15
    }

    // FID score (25% weight)
    if (metrics.value.fid) {
      factors++
      if (metrics.value.fid > thresholds.fid.poor) score -= 25
      else if (metrics.value.fid > thresholds.fid.good) score -= 10
    }

    // CLS score (25% weight)
    if (metrics.value.cls) {
      factors++
      if (metrics.value.cls > thresholds.cls.poor) score -= 25
      else if (metrics.value.cls > thresholds.cls.good) score -= 10
    }

    // Memory score (20% weight)
    if (metrics.value.memoryUsagePercent) {
      factors++
      if (metrics.value.memoryUsagePercent > thresholds.memoryUsage.critical) score -= 20
      else if (metrics.value.memoryUsagePercent > thresholds.memoryUsage.warning) score -= 10
    }

    return Math.max(0, Math.min(100, score))
  })

  /**
   * Get performance grade
   */
  const getPerformanceGrade = computed(() => {
    const score = getPerformanceScore.value
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  })

  /**
   * Check if performance is good
   */
  const isPerformanceGood = computed(() => getPerformanceScore.value >= 80)

  /**
   * Get critical issues count
   */
  const criticalIssuesCount = computed(() => 
    performanceIssues.value.filter(issue => issue.type === 'critical').length
  )

  /**
   * Stop monitoring
   */
  const stopMonitoring = () => {
    if (!isMonitoring.value) return

    // Execute all cleanup tasks
    cleanupTasks.value.forEach(task => {
      try {
        task()
      } catch (error) {
        logger.warn('Cleanup task failed:', error)
      }
    })
    cleanupTasks.value = []

    isMonitoring.value = false
    logger.info('Performance monitoring stopped')
  }

  /**
   * Generate comprehensive performance report
   */
  const generateReport = (): PerformanceReport => {
    return {
      timestamp: new Date().toISOString(),
      metrics: { ...metrics.value },
      score: getPerformanceScore.value,
      grade: getPerformanceGrade.value,
      issues: [...performanceIssues.value],
      recommendations: generateRecommendations(),
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        memory: (navigator as any).deviceMemory,
        cores: navigator.hardwareConcurrency
      }
    }
  }

  /**
   * Generate performance recommendations
   */
  const generateRecommendations = (): string[] => {
    const recommendations = new Set<string>()

    // Add recommendations based on current issues
    performanceIssues.value.forEach(issue => {
      issue.recommendations.forEach(rec => recommendations.add(rec))
    })

    // Add general recommendations based on metrics
    if (metrics.value.lcp && metrics.value.lcp > thresholds.lcp.good) {
      recommendations.add('ปรับปรุง Largest Contentful Paint โดยการ optimize images และ lazy loading')
    }

    if (metrics.value.fid && metrics.value.fid > thresholds.fid.good) {
      recommendations.add('ลด First Input Delay โดยการ optimize JavaScript execution')
    }

    if (metrics.value.cls && metrics.value.cls > thresholds.cls.good) {
      recommendations.add('ปรับปรุง Cumulative Layout Shift โดยการกำหนด dimensions สำหรับ images')
    }

    if (metrics.value.memoryUsagePercent && metrics.value.memoryUsagePercent > thresholds.memoryUsage.warning) {
      recommendations.add('ลดการใช้ memory โดยการ cleanup unused objects')
    }

    return Array.from(recommendations)
  }

  /**
   * Clear all performance issues
   */
  const clearIssues = () => {
    performanceIssues.value = []
  }

  // Auto-start monitoring on mount
  onMounted(() => {
    startMonitoring()
  })

  // Cleanup on unmount
  onUnmounted(() => {
    stopMonitoring()
  })

  return {
    // State
    metrics,
    isMonitoring,
    performanceIssues,
    isPerformanceGood,
    criticalIssuesCount,
    
    // Computed
    getPerformanceScore,
    getPerformanceGrade,

    // Methods
    startMonitoring,
    stopMonitoring,
    measureApiResponse,
    measureRenderTime,
    generateReport,
    clearIssues,
    updateNetworkInfo
  }
}