/**
 * usePerformanceMetrics - วัด Performance Metrics สำหรับ Web Vitals
 * 
 * Feature: F194 - Performance Metrics
 * 
 * วัดค่า:
 * - FCP (First Contentful Paint) - เวลาที่ content แรกแสดง
 * - LCP (Largest Contentful Paint) - เวลาที่ content ใหญ่สุดแสดง
 * - TTI (Time to Interactive) - เวลาที่ page พร้อมใช้งาน
 * - FID (First Input Delay) - เวลาตอบสนอง input แรก
 * - CLS (Cumulative Layout Shift) - ความเสถียรของ layout
 * - TTFB (Time to First Byte) - เวลาที่ได้รับ byte แรก
 */

import { ref, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

// =====================================================
// TYPES
// =====================================================

export interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
}

export interface PageLoadMetrics {
  page: string
  fcp: number | null
  lcp: number | null
  tti: number | null
  fid: number | null
  cls: number | null
  ttfb: number | null
  totalLoadTime: number
  timestamp: number
  userId?: string
  deviceType: 'mobile' | 'tablet' | 'desktop'
  connectionType: string
}

export interface PerformanceSummary {
  avgFcp: number
  avgLcp: number
  avgTti: number
  avgFid: number
  avgCls: number
  avgTtfb: number
  totalPageLoads: number
  goodPercentage: number
  needsImprovementPercentage: number
  poorPercentage: number
}

// =====================================================
// THRESHOLDS (ตาม Google Web Vitals)
// =====================================================

const THRESHOLDS = {
  fcp: { good: 1800, poor: 3000 },      // ms
  lcp: { good: 2500, poor: 4000 },      // ms
  tti: { good: 3800, poor: 7300 },      // ms
  fid: { good: 100, poor: 300 },        // ms
  cls: { good: 0.1, poor: 0.25 },       // score
  ttfb: { good: 800, poor: 1800 }       // ms
}

// =====================================================
// COMPOSABLE
// =====================================================

export function usePerformanceMetrics() {
  const authStore = useAuthStore()
  
  // State
  const metrics = ref<PerformanceMetric[]>([])
  const pageLoadMetrics = ref<PageLoadMetrics | null>(null)
  const isCollecting = ref(false)
  const startTime = ref(0)
  
  // Observers
  let lcpObserver: PerformanceObserver | null = null
  let fidObserver: PerformanceObserver | null = null
  let clsObserver: PerformanceObserver | null = null

  // =====================================================
  // HELPERS
  // =====================================================

  const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
    const width = window.innerWidth
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }

  const getConnectionType = (): string => {
    const nav = navigator as any
    if (nav.connection) {
      return nav.connection.effectiveType || 'unknown'
    }
    return 'unknown'
  }

  const getRating = (
    metricName: string, 
    value: number
  ): 'good' | 'needs-improvement' | 'poor' => {
    const threshold = THRESHOLDS[metricName as keyof typeof THRESHOLDS]
    if (!threshold) return 'good'
    
    if (value <= threshold.good) return 'good'
    if (value <= threshold.poor) return 'needs-improvement'
    return 'poor'
  }

  const addMetric = (name: string, value: number) => {
    metrics.value.push({
      name,
      value,
      rating: getRating(name, value),
      timestamp: Date.now()
    })
  }

  // =====================================================
  // METRIC COLLECTION
  // =====================================================

  /**
   * เริ่มเก็บ metrics สำหรับหน้าปัจจุบัน
   */
  const startCollecting = (pageName: string) => {
    if (isCollecting.value) return
    
    isCollecting.value = true
    startTime.value = performance.now()
    metrics.value = []
    
    // Initialize page load metrics
    pageLoadMetrics.value = {
      page: pageName,
      fcp: null,
      lcp: null,
      tti: null,
      fid: null,
      cls: null,
      ttfb: null,
      totalLoadTime: 0,
      timestamp: Date.now(),
      userId: authStore.user?.id,
      deviceType: getDeviceType(),
      connectionType: getConnectionType()
    }

    // Collect navigation timing
    collectNavigationTiming()
    
    // Setup observers
    setupLCPObserver()
    setupFIDObserver()
    setupCLSObserver()
    
    // Collect FCP
    collectFCP()
  }

  /**
   * หยุดเก็บ metrics และคำนวณผลรวม
   */
  const stopCollecting = async (sendToServer = true) => {
    if (!isCollecting.value || !pageLoadMetrics.value) return
    
    isCollecting.value = false
    
    // Calculate total load time
    pageLoadMetrics.value.totalLoadTime = performance.now() - startTime.value
    
    // Estimate TTI (Time to Interactive)
    estimateTTI()
    
    // Cleanup observers
    cleanupObservers()
    
    // Send to server if enabled
    if (sendToServer) {
      await sendMetricsToServer()
    }
    
    return pageLoadMetrics.value
  }

  /**
   * เก็บ Navigation Timing (TTFB)
   */
  const collectNavigationTiming = () => {
    try {
      const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      if (entries.length > 0) {
        const nav = entries[0]
        const ttfb = nav.responseStart - nav.requestStart
        
        if (pageLoadMetrics.value && ttfb > 0) {
          pageLoadMetrics.value.ttfb = Math.round(ttfb)
          addMetric('ttfb', ttfb)
        }
      }
    } catch (e) {
      console.warn('Navigation timing not available')
    }
  }

  /**
   * เก็บ FCP (First Contentful Paint)
   */
  const collectFCP = () => {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        for (const entry of entries) {
          if (entry.name === 'first-contentful-paint') {
            const fcp = entry.startTime
            if (pageLoadMetrics.value) {
              pageLoadMetrics.value.fcp = Math.round(fcp)
              addMetric('fcp', fcp)
            }
            observer.disconnect()
          }
        }
      })
      
      // Use entryTypes array instead of deprecated type option
      observer.observe({ entryTypes: ['paint'] })
      
      // Also check buffered entries manually
      const paintEntries = performance.getEntriesByType('paint')
      for (const entry of paintEntries) {
        if (entry.name === 'first-contentful-paint') {
          const fcp = entry.startTime
          if (pageLoadMetrics.value && !pageLoadMetrics.value.fcp) {
            pageLoadMetrics.value.fcp = Math.round(fcp)
            addMetric('fcp', fcp)
          }
          observer.disconnect()
          break
        }
      }
    } catch {
      // FCP observer not supported - silently ignore
    }
  }

  /**
   * Setup LCP Observer
   */
  const setupLCPObserver = () => {
    try {
      lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        // LCP จะมีหลาย entries - เอาอันสุดท้าย
        const lastEntry = entries[entries.length - 1]
        if (lastEntry && pageLoadMetrics.value) {
          pageLoadMetrics.value.lcp = Math.round(lastEntry.startTime)
          addMetric('lcp', lastEntry.startTime)
        }
      })
      
      // Use entryTypes array instead of deprecated type option
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch {
      // LCP observer not supported - silently ignore
    }
  }

  /**
   * Setup FID Observer
   */
  const setupFIDObserver = () => {
    try {
      fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceEventTiming[]
        for (const entry of entries) {
          const fid = entry.processingStart - entry.startTime
          if (pageLoadMetrics.value && fid > 0) {
            pageLoadMetrics.value.fid = Math.round(fid)
            addMetric('fid', fid)
          }
          fidObserver?.disconnect()
          break
        }
      })
      
      // Use entryTypes array instead of deprecated type option
      fidObserver.observe({ entryTypes: ['first-input'] })
    } catch {
      // FID observer not supported - silently ignore
    }
  }

  /**
   * Setup CLS Observer
   */
  const setupCLSObserver = () => {
    try {
      let clsValue = 0
      
      clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        }
        
        if (pageLoadMetrics.value) {
          pageLoadMetrics.value.cls = Math.round(clsValue * 1000) / 1000
          addMetric('cls', clsValue)
        }
      })
      
      // Use entryTypes array instead of deprecated type option
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    } catch {
      // CLS observer not supported - silently ignore
    }
  }

  /**
   * Estimate TTI (Time to Interactive)
   */
  const estimateTTI = () => {
    // TTI estimation: FCP + time until main thread is idle
    // Simplified: use Long Tasks API or estimate from load time
    try {
      const entries = performance.getEntriesByType('longtask') as PerformanceEntry[]
      let lastLongTaskEnd = 0
      
      for (const entry of entries) {
        const taskEnd = entry.startTime + entry.duration
        if (taskEnd > lastLongTaskEnd) {
          lastLongTaskEnd = taskEnd
        }
      }
      
      // TTI = max(FCP, last long task end) + quiet window
      const fcp = pageLoadMetrics.value?.fcp || 0
      const tti = Math.max(fcp, lastLongTaskEnd) + 50 // 50ms quiet window
      
      if (pageLoadMetrics.value) {
        pageLoadMetrics.value.tti = Math.round(tti)
        addMetric('tti', tti)
      }
    } catch (e) {
      // Fallback: use total load time as TTI estimate
      if (pageLoadMetrics.value) {
        pageLoadMetrics.value.tti = Math.round(pageLoadMetrics.value.totalLoadTime)
      }
    }
  }

  /**
   * Cleanup observers
   */
  const cleanupObservers = () => {
    lcpObserver?.disconnect()
    fidObserver?.disconnect()
    clsObserver?.disconnect()
    lcpObserver = null
    fidObserver = null
    clsObserver = null
  }

  // =====================================================
  // SERVER COMMUNICATION
  // =====================================================

  /**
   * ส่ง metrics ไปเก็บที่ server
   * Note: ใช้ try-catch เพื่อไม่ให้ error กระทบ UX
   */
  const sendMetricsToServer = async () => {
    if (!pageLoadMetrics.value) return
    
    // Skip if not logged in - analytics requires auth
    if (!authStore.user?.id) {
      // Store locally for later sync
      try {
        const localMetrics = JSON.parse(localStorage.getItem('pending_metrics') || '[]')
        localMetrics.push({
          ...pageLoadMetrics.value,
          metrics: metrics.value,
          timestamp: Date.now()
        })
        // Keep only last 10 entries
        localStorage.setItem('pending_metrics', JSON.stringify(localMetrics.slice(-10)))
      } catch {
        // Ignore localStorage errors
      }
      return
    }
    
    try {
      // ส่งไป analytics_events table
      await (supabase.from('analytics_events') as any).insert({
        session_id: getSessionId(),
        event_name: 'page_performance',
        event_category: 'performance',
        properties: {
          ...pageLoadMetrics.value,
          metrics: metrics.value
        },
        page_url: window.location.pathname,
        device_type: pageLoadMetrics.value.deviceType,
        user_id: authStore.user.id
      })
    } catch {
      // Silently fail - don't spam console with analytics errors
    }
  }

  /**
   * Get or create session ID
   */
  const getSessionId = (): string => {
    let sessionId = sessionStorage.getItem('perf_session_id')
    if (!sessionId) {
      sessionId = `perf_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      sessionStorage.setItem('perf_session_id', sessionId)
    }
    return sessionId
  }

  /**
   * Sync pending metrics ที่เก็บไว้ใน localStorage เมื่อ user login
   * เรียกใช้หลังจาก login สำเร็จ
   */
  const syncPendingMetrics = async (): Promise<{ synced: number; failed: number }> => {
    if (!authStore.user?.id) {
      return { synced: 0, failed: 0 }
    }

    let synced = 0
    let failed = 0

    try {
      const pendingMetrics = JSON.parse(localStorage.getItem('pending_metrics') || '[]')
      
      if (pendingMetrics.length === 0) {
        return { synced: 0, failed: 0 }
      }

      // Process each pending metric
      for (const metric of pendingMetrics) {
        try {
          await (supabase.from('analytics_events') as any).insert({
            session_id: metric.session_id || getSessionId(),
            event_name: 'page_performance',
            event_category: 'performance',
            properties: metric,
            page_url: metric.page || 'unknown',
            device_type: metric.deviceType || 'unknown',
            user_id: authStore.user.id
          })
          synced++
        } catch {
          failed++
        }
      }

      // Clear synced metrics
      if (synced > 0) {
        localStorage.removeItem('pending_metrics')
      }
    } catch {
      // Ignore errors
    }

    return { synced, failed }
  }

  /**
   * Get pending metrics count (for UI display)
   */
  const getPendingMetricsCount = (): number => {
    try {
      const pending = JSON.parse(localStorage.getItem('pending_metrics') || '[]')
      return pending.length
    } catch {
      return 0
    }
  }

  /**
   * Clear all pending metrics
   */
  const clearPendingMetrics = () => {
    try {
      localStorage.removeItem('pending_metrics')
    } catch {
      // Ignore
    }
  }

  // =====================================================
  // ADMIN FUNCTIONS
  // =====================================================

  /**
   * ดึง performance summary สำหรับ Admin
   */
  const getPerformanceSummary = async (
    hours = 24
  ): Promise<PerformanceSummary | null> => {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      
      const { data, error } = await (supabase
        .from('analytics_events') as any)
        .select('properties')
        .eq('event_name', 'page_performance')
        .gte('created_at', since)
      
      if (error || !data || data.length === 0) return null
      
      // Calculate averages
      let totalFcp = 0, totalLcp = 0, totalTti = 0
      let totalFid = 0, totalCls = 0, totalTtfb = 0
      let countFcp = 0, countLcp = 0, countTti = 0
      let countFid = 0, countCls = 0, countTtfb = 0
      let good = 0, needsImprovement = 0, poor = 0
      
      for (const row of data) {
        const props = row.properties
        if (!props) continue
        
        if (props.fcp) { totalFcp += props.fcp; countFcp++ }
        if (props.lcp) { totalLcp += props.lcp; countLcp++ }
        if (props.tti) { totalTti += props.tti; countTti++ }
        if (props.fid) { totalFid += props.fid; countFid++ }
        if (props.cls !== null) { totalCls += props.cls; countCls++ }
        if (props.ttfb) { totalTtfb += props.ttfb; countTtfb++ }
        
        // Count ratings based on LCP (primary metric)
        if (props.lcp) {
          const rating = getRating('lcp', props.lcp)
          if (rating === 'good') good++
          else if (rating === 'needs-improvement') needsImprovement++
          else poor++
        }
      }
      
      const total = good + needsImprovement + poor
      
      return {
        avgFcp: countFcp > 0 ? Math.round(totalFcp / countFcp) : 0,
        avgLcp: countLcp > 0 ? Math.round(totalLcp / countLcp) : 0,
        avgTti: countTti > 0 ? Math.round(totalTti / countTti) : 0,
        avgFid: countFid > 0 ? Math.round(totalFid / countFid) : 0,
        avgCls: countCls > 0 ? Math.round((totalCls / countCls) * 1000) / 1000 : 0,
        avgTtfb: countTtfb > 0 ? Math.round(totalTtfb / countTtfb) : 0,
        totalPageLoads: data.length,
        goodPercentage: total > 0 ? Math.round((good / total) * 100) : 0,
        needsImprovementPercentage: total > 0 ? Math.round((needsImprovement / total) * 100) : 0,
        poorPercentage: total > 0 ? Math.round((poor / total) * 100) : 0
      }
    } catch (e) {
      console.error('Error fetching performance summary:', e)
      return null
    }
  }

  /**
   * ดึง metrics แยกตามหน้า
   */
  const getMetricsByPage = async (hours = 24) => {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      
      const { data, error } = await (supabase
        .from('analytics_events') as any)
        .select('properties, page_url')
        .eq('event_name', 'page_performance')
        .gte('created_at', since)
      
      if (error || !data) return []
      
      // Group by page
      const pageMap = new Map<string, { count: number; avgLcp: number; totalLcp: number }>()
      
      for (const row of data) {
        const page = row.page_url || 'unknown'
        const lcp = row.properties?.lcp || 0
        
        if (!pageMap.has(page)) {
          pageMap.set(page, { count: 0, avgLcp: 0, totalLcp: 0 })
        }
        
        const entry = pageMap.get(page)!
        entry.count++
        entry.totalLcp += lcp
        entry.avgLcp = Math.round(entry.totalLcp / entry.count)
      }
      
      return Array.from(pageMap.entries())
        .map(([page, stats]) => ({
          page,
          count: stats.count,
          avgLcp: stats.avgLcp,
          rating: getRating('lcp', stats.avgLcp)
        }))
        .sort((a, b) => b.count - a.count)
    } catch (e) {
      console.error('Error fetching metrics by page:', e)
      return []
    }
  }

  // =====================================================
  // FORMATTERS
  // =====================================================

  const formatMetricValue = (name: string, value: number): string => {
    if (name === 'cls') {
      return value.toFixed(3)
    }
    return `${Math.round(value)} ms`
  }

  const getMetricLabel = (name: string): string => {
    const labels: Record<string, string> = {
      fcp: 'First Contentful Paint',
      lcp: 'Largest Contentful Paint',
      tti: 'Time to Interactive',
      fid: 'First Input Delay',
      cls: 'Cumulative Layout Shift',
      ttfb: 'Time to First Byte'
    }
    return labels[name] || name
  }

  const getMetricLabelThai = (name: string): string => {
    const labels: Record<string, string> = {
      fcp: 'เวลาแสดง Content แรก',
      lcp: 'เวลาแสดง Content ใหญ่สุด',
      tti: 'เวลาพร้อมใช้งาน',
      fid: 'เวลาตอบสนอง Input',
      cls: 'ความเสถียร Layout',
      ttfb: 'เวลารับ Byte แรก'
    }
    return labels[name] || name
  }

  const getRatingColor = (rating: string): string => {
    const colors: Record<string, string> = {
      good: '#00A86B',
      'needs-improvement': '#F5A623',
      poor: '#E53935'
    }
    return colors[rating] || '#666666'
  }

  const getRatingText = (rating: string): string => {
    const texts: Record<string, string> = {
      good: 'ดี',
      'needs-improvement': 'ควรปรับปรุง',
      poor: 'ช้า'
    }
    return texts[rating] || rating
  }

  // =====================================================
  // LIFECYCLE
  // =====================================================

  onUnmounted(() => {
    cleanupObservers()
  })

  return {
    // State
    metrics,
    pageLoadMetrics,
    isCollecting,
    
    // Collection
    startCollecting,
    stopCollecting,
    
    // Admin
    getPerformanceSummary,
    getMetricsByPage,
    
    // Sync pending metrics
    syncPendingMetrics,
    getPendingMetricsCount,
    clearPendingMetrics,
    
    // Helpers
    getRating,
    formatMetricValue,
    getMetricLabel,
    getMetricLabelThai,
    getRatingColor,
    getRatingText,
    
    // Constants
    THRESHOLDS
  }
}
