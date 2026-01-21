/**
 * Performance Monitoring V2 - Professional Grade
 * Feature: F252 - Advanced Performance Monitoring
 * 
 * Tracks Core Web Vitals, custom metrics, and performance budgets
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'

interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
}

interface WebVitals {
  lcp: number | null // Largest Contentful Paint
  fid: number | null // First Input Delay
  cls: number | null // Cumulative Layout Shift
  fcp: number | null // First Contentful Paint
  ttfb: number | null // Time to First Byte
}

export function usePerformanceMonitoringV2() {
  const metrics = ref<PerformanceMetric[]>([])
  const webVitals = ref<WebVitals>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null
  })

  // Performance budgets (in milliseconds or score)
  const budgets = {
    lcp: 2500, // Good: < 2.5s
    fid: 100,  // Good: < 100ms
    cls: 0.1,  // Good: < 0.1
    fcp: 1800, // Good: < 1.8s
    ttfb: 800  // Good: < 800ms
  }

  /**
   * Get rating based on value and thresholds
   */
  const getRating = (metricName: keyof typeof budgets, value: number): 'good' | 'needs-improvement' | 'poor' => {
    const threshold = budgets[metricName]
    
    if (metricName === 'cls') {
      if (value < 0.1) return 'good'
      if (value < 0.25) return 'needs-improvement'
      return 'poor'
    }
    
    if (value < threshold) return 'good'
    if (value < threshold * 1.5) return 'needs-improvement'
    return 'poor'
  }

  /**
   * Track Core Web Vitals using Performance Observer
   */
  const trackWebVitals = () => {
    if (!('PerformanceObserver' in window)) return

    // Track LCP (Largest Contentful Paint)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        const lcp = lastEntry.renderTime || lastEntry.loadTime
        
        webVitals.value.lcp = lcp
        trackMetric('LCP', lcp)
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch (e) {
      console.warn('LCP tracking not supported')
    }

    // Track FID (First Input Delay)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          const fid = entry.processingStart - entry.startTime
          webVitals.value.fid = fid
          trackMetric('FID', fid)
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
    } catch (e) {
      console.warn('FID tracking not supported')
    }

    // Track CLS (Cumulative Layout Shift)
    try {
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
            webVitals.value.cls = clsValue
          }
        }
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      
      // Report CLS on page unload
      window.addEventListener('beforeunload', () => {
        trackMetric('CLS', clsValue)
      })
    } catch (e) {
      console.warn('CLS tracking not supported')
    }

    // Track FCP and TTFB using Navigation Timing
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navTiming = performance.getEntriesByType('navigation')[0] as any
      
      if (navTiming) {
        const fcp = navTiming.responseStart - navTiming.fetchStart
        const ttfb = navTiming.responseStart - navTiming.requestStart
        
        webVitals.value.fcp = fcp
        webVitals.value.ttfb = ttfb
        
        trackMetric('FCP', fcp)
        trackMetric('TTFB', ttfb)
      }
    }
  }

  /**
   * Track custom performance metric
   */
  const trackMetric = async (name: string, value: number) => {
    const metricKey = name.toLowerCase() as keyof typeof budgets
    const rating = budgets[metricKey] ? getRating(metricKey, value) : 'good'
    
    const metric: PerformanceMetric = {
      name,
      value,
      rating,
      timestamp: Date.now()
    }
    
    metrics.value.push(metric)

    // Send to database (async, non-blocking)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      await supabase.from('performance_metrics').insert({
        metric_name: name,
        metric_value: value,
        user_id: user?.id || null,
        device_type: getDeviceType(),
        connection_type: getConnectionType(),
        rating
      })
    } catch (error) {
      // Silent fail - don't block user experience
      console.debug('Performance metric tracking failed:', error)
    }
  }

  /**
   * Check if performance budgets are exceeded
   */
  const checkBudgets = () => {
    const violations: string[] = []
    
    Object.entries(webVitals.value).forEach(([key, value]) => {
      if (value !== null) {
        const metricKey = key as keyof typeof budgets
        const budget = budgets[metricKey]
        
        if (budget && value > budget) {
          violations.push(`${key.toUpperCase()}: ${value.toFixed(2)} (budget: ${budget})`)
        }
      }
    })
    
    if (violations.length > 0) {
      console.warn('⚠️ Performance budget violations:', violations)
    }
    
    return violations
  }

  /**
   * Get device type
   */
  const getDeviceType = (): string => {
    const ua = navigator.userAgent
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet'
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile'
    }
    return 'desktop'
  }

  /**
   * Get connection type
   */
  const getConnectionType = (): string => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    return connection?.effectiveType || 'unknown'
  }

  /**
   * Track page load time
   */
  const trackPageLoad = () => {
    if ('performance' in window && 'timing' in performance) {
      const timing = performance.timing
      const loadTime = timing.loadEventEnd - timing.navigationStart
      trackMetric('PageLoad', loadTime)
    }
  }

  /**
   * Track route change time
   */
  const trackRouteChange = (routeName: string, startTime: number) => {
    const duration = performance.now() - startTime
    trackMetric(`Route_${routeName}`, duration)
  }

  /**
   * Get performance summary
   */
  const getPerformanceSummary = () => {
    return {
      webVitals: webVitals.value,
      metrics: metrics.value,
      budgetViolations: checkBudgets(),
      deviceType: getDeviceType(),
      connectionType: getConnectionType()
    }
  }

  // Initialize on mount
  onMounted(() => {
    trackWebVitals()
    trackPageLoad()
  })

  return {
    metrics,
    webVitals,
    trackMetric,
    trackWebVitals,
    trackPageLoad,
    trackRouteChange,
    checkBudgets,
    getPerformanceSummary
  }
}
