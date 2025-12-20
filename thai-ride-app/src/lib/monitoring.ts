/**
 * Production Monitoring Utilities
 * Real-time monitoring, metrics collection, alerting
 */

// ========================================
// Types
// ========================================

export interface MetricData {
  name: string
  value: number
  timestamp: number
  tags?: Record<string, string>
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: HealthCheck[]
  timestamp: number
}

export interface HealthCheck {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message?: string
  duration?: number
}

// ========================================
// Metrics Collector
// ========================================

class MetricsCollector {
  private metrics: MetricData[] = []
  private maxMetrics = 1000
  private flushInterval: number | null = null

  /**
   * Record a metric
   */
  record(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      tags
    })

    // Trim if exceeds max
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  /**
   * Record timing metric
   */
  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    this.record(`${name}.timing`, durationMs, tags)
  }

  /**
   * Increment counter
   */
  increment(name: string, value = 1, tags?: Record<string, string>): void {
    this.record(`${name}.count`, value, tags)
  }

  /**
   * Record gauge value
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.record(`${name}.gauge`, value, tags)
  }


  /**
   * Get metrics for time range
   */
  getMetrics(name?: string, sinceMs?: number): MetricData[] {
    let filtered = this.metrics

    if (name) {
      filtered = filtered.filter(m => m.name.startsWith(name))
    }

    if (sinceMs) {
      const cutoff = Date.now() - sinceMs
      filtered = filtered.filter(m => m.timestamp >= cutoff)
    }

    return filtered
  }

  /**
   * Get metric statistics
   */
  getStats(name: string, sinceMs = 60000): {
    count: number
    min: number
    max: number
    avg: number
    p50: number
    p95: number
    p99: number
  } {
    const metrics = this.getMetrics(name, sinceMs)
    const values = metrics.map(m => m.value).sort((a, b) => a - b)

    if (values.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 }
    }

    const sum = values.reduce((a, b) => a + b, 0)
    const percentile = (p: number) => values[Math.floor(values.length * p / 100)] || 0

    return {
      count: values.length,
      min: values[0],
      max: values[values.length - 1],
      avg: sum / values.length,
      p50: percentile(50),
      p95: percentile(95),
      p99: percentile(99)
    }
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = []
  }

  /**
   * Start auto-flush to backend
   */
  startAutoFlush(intervalMs: number, flushFn: (metrics: MetricData[]) => Promise<void>): void {
    this.stopAutoFlush()
    this.flushInterval = window.setInterval(async () => {
      if (this.metrics.length > 0) {
        const toFlush = [...this.metrics]
        this.metrics = []
        await flushFn(toFlush)
      }
    }, intervalMs)
  }

  /**
   * Stop auto-flush
   */
  stopAutoFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
  }
}

// ========================================
// Health Monitor
// ========================================

class HealthMonitor {
  private checks: Map<string, () => Promise<HealthCheck>> = new Map()

  /**
   * Register health check
   */
  register(name: string, checkFn: () => Promise<HealthCheck>): void {
    this.checks.set(name, checkFn)
  }

  /**
   * Unregister health check
   */
  unregister(name: string): void {
    this.checks.delete(name)
  }

  /**
   * Run all health checks
   */
  async check(): Promise<HealthStatus> {
    const results: HealthCheck[] = []
    let overallStatus: HealthStatus['status'] = 'healthy'

    for (const [name, checkFn] of this.checks) {
      const start = performance.now()
      try {
        const result = await checkFn()
        result.duration = performance.now() - start
        results.push(result)

        if (result.status === 'fail') {
          overallStatus = 'unhealthy'
        } else if (result.status === 'warn' && overallStatus === 'healthy') {
          overallStatus = 'degraded'
        }
      } catch (error) {
        results.push({
          name,
          status: 'fail',
          message: (error as Error).message,
          duration: performance.now() - start
        })
        overallStatus = 'unhealthy'
      }
    }

    return {
      status: overallStatus,
      checks: results,
      timestamp: Date.now()
    }
  }
}

// ========================================
// Error Tracker
// ========================================

interface ErrorEntry {
  message: string
  stack?: string
  timestamp: number
  context?: Record<string, unknown>
  count: number
}

class ErrorTracker {
  private errors: Map<string, ErrorEntry> = new Map()
  private maxErrors = 100

  /**
   * Track error
   */
  track(error: Error, context?: Record<string, unknown>): void {
    const key = `${error.name}:${error.message}`
    const existing = this.errors.get(key)

    if (existing) {
      existing.count++
      existing.timestamp = Date.now()
    } else {
      this.errors.set(key, {
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
        context,
        count: 1
      })

      // Trim if exceeds max
      if (this.errors.size > this.maxErrors) {
        const oldest = Array.from(this.errors.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]
        if (oldest) this.errors.delete(oldest[0])
      }
    }
  }

  /**
   * Get recent errors
   */
  getRecent(limit = 10): ErrorEntry[] {
    return Array.from(this.errors.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /**
   * Get error count
   */
  getCount(): number {
    return Array.from(this.errors.values())
      .reduce((sum, e) => sum + e.count, 0)
  }

  /**
   * Clear errors
   */
  clear(): void {
    this.errors.clear()
  }
}

// ========================================
// Singleton Instances
// ========================================

export const metrics = new MetricsCollector()
export const health = new HealthMonitor()
export const errors = new ErrorTracker()

// ========================================
// Default Health Checks
// ========================================

// Network connectivity check
health.register('network', async () => ({
  name: 'network',
  status: navigator.onLine ? 'pass' : 'fail',
  message: navigator.onLine ? 'Online' : 'Offline'
}))

// Memory check (if available)
health.register('memory', async () => {
  const memory = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory
  if (!memory) {
    return { name: 'memory', status: 'pass', message: 'Memory API not available' }
  }

  const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
  return {
    name: 'memory',
    status: usedPercent > 90 ? 'fail' : usedPercent > 70 ? 'warn' : 'pass',
    message: `${usedPercent.toFixed(1)}% used`
  }
})

// ========================================
// Utility Functions
// ========================================

/**
 * Measure function execution time
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const start = performance.now()
  try {
    return await fn()
  } finally {
    metrics.timing(name, performance.now() - start, tags)
  }
}

/**
 * Measure sync function execution time
 */
export function measureSync<T>(
  name: string,
  fn: () => T,
  tags?: Record<string, string>
): T {
  const start = performance.now()
  try {
    return fn()
  } finally {
    metrics.timing(name, performance.now() - start, tags)
  }
}

/**
 * Create a timed wrapper for async functions
 */
export function withTiming<T extends (...args: unknown[]) => Promise<unknown>>(
  name: string,
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    return measureAsync(name, () => fn(...args))
  }) as T
}
