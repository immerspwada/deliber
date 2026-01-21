import { ref, computed, onMounted } from 'vue'

export interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  interactionTime: number
  memoryUsage: number
}

export function usePerformanceMetrics() {
  const metrics = ref<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    interactionTime: 0,
    memoryUsage: 0
  })

  const isSupported = computed(() => 
    typeof window !== 'undefined' && 
    'performance' in window &&
    'memory' in (window.performance as any)
  )

  const measureLoadTime = (): void => {
    if (!isSupported.value) return

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      metrics.value.loadTime = navigation.loadEventEnd - navigation.fetchStart
    }
  }

  const measureRenderTime = (): void => {
    if (!isSupported.value) return

    const paintEntries = performance.getEntriesByType('paint')
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')
    if (fcp) {
      metrics.value.renderTime = fcp.startTime
    }
  }

  const measureInteractionTime = (startTime: number): void => {
    if (!isSupported.value) return

    const endTime = performance.now()
    metrics.value.interactionTime = endTime - startTime
  }

  const measureMemoryUsage = (): void => {
    if (!isSupported.value) return

    const memory = (performance as any).memory
    if (memory) {
      metrics.value.memoryUsage = memory.usedJSHeapSize / 1024 / 1024 // Convert to MB
    }
  }

  const getPerformanceGrade = (): 'excellent' | 'good' | 'needs-improvement' | 'poor' => {
    const { loadTime, renderTime } = metrics.value

    if (loadTime < 1000 && renderTime < 1500) return 'excellent'
    if (loadTime < 2000 && renderTime < 2500) return 'good'
    if (loadTime < 3000 && renderTime < 4000) return 'needs-improvement'
    return 'poor'
  }

  const logMetrics = (): void => {
    if (import.meta.env.DEV) {
      console.group('🚀 Performance Metrics')
      console.log('Load Time:', `${metrics.value.loadTime.toFixed(2)}ms`)
      console.log('Render Time:', `${metrics.value.renderTime.toFixed(2)}ms`)
      console.log('Memory Usage:', `${metrics.value.memoryUsage.toFixed(2)}MB`)
      console.log('Grade:', getPerformanceGrade())
      console.groupEnd()
    }
  }

  // Compatibility functions for existing code
  const startCollecting = (route?: string): void => {
    if (import.meta.env.DEV && route) {
      console.log(`🚀 Starting performance collection for: ${route}`)
    }
    // Trigger initial measurements
    setTimeout(() => {
      measureLoadTime()
      measureRenderTime()
      measureMemoryUsage()
      logMetrics()
    }, 100)
  }

  const stopCollecting = (): void => {
    if (import.meta.env.DEV) {
      console.log('🚀 Stopping performance collection')
    }
    // Final measurement
    measureMemoryUsage()
  }

  onMounted(() => {
    // Measure initial metrics
    setTimeout(() => {
      measureLoadTime()
      measureRenderTime()
      measureMemoryUsage()
      logMetrics()
    }, 100)

    // Set up periodic memory monitoring
    const memoryInterval = setInterval(() => {
      measureMemoryUsage()
    }, 30000) // Every 30 seconds

    // Cleanup
    return () => {
      clearInterval(memoryInterval)
    }
  })

  return {
    metrics: computed(() => metrics.value),
    isSupported,
    measureInteractionTime,
    getPerformanceGrade,
    logMetrics,
    startCollecting,
    stopCollecting
  }
}