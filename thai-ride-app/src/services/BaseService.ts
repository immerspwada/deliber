/**
 * Base Service Class - The Foundation of Excellence ✨
 * 
 * Abstract base class ที่ออกแบบมาเพื่อความสวยงามและประสิทธิภาพ
 * พร้อมด้วย Logging, Error Handling, Metrics และ Lifecycle Management
 */

import { logger } from '../utils/logger'
import { handleError } from '../utils/errorHandling'
import type { Result } from '../utils/result'

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  operationsCount: number
  errorRate: number
  averageResponseTime: number
  lastOperation: Date | null
  memoryUsage?: number
}

export interface ServiceConfiguration {
  retryAttempts?: number
  timeoutMs?: number
  enableMetrics?: boolean
  enableCaching?: boolean
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
}

export abstract class BaseService {
  protected serviceName: string
  protected startTime: number
  protected operationsCount: number = 0
  protected errorCount: number = 0
  protected totalResponseTime: number = 0
  protected lastOperation: Date | null = null
  protected config: ServiceConfiguration = {}
  protected isInitialized: boolean = false

  constructor(serviceName: string) {
    this.serviceName = serviceName
    this.startTime = Date.now()
    this.log('info', `🎯 Service initialized: ${serviceName}`)
  }

  /**
   * Configure service with beautiful settings
   */
  async configure(config: ServiceConfiguration): Promise<void> {
    this.config = { 
      retryAttempts: 3,
      timeoutMs: 30000,
      enableMetrics: true,
      enableCaching: false,
      logLevel: 'info',
      ...config 
    }
    
    this.log('info', '⚙️ Service configured', { config: this.config })
    this.isInitialized = true
  }

  /**
   * Execute operation with beautiful error handling and metrics
   */
  protected async execute<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<Result<T>> {
    const startTime = performance.now()
    const operationId = this.generateOperationId()
    
    try {
      this.operationsCount++
      this.lastOperation = new Date()
      
      this.log('debug', `🚀 Starting ${operationName}`, { 
        operationId,
        attempt: 1,
        ...context 
      })
      
      // Execute with timeout if configured
      const result = this.config.timeoutMs 
        ? await this.executeWithTimeout(operation, this.config.timeoutMs)
        : await operation()
      
      const duration = performance.now() - startTime
      this.totalResponseTime += duration
      
      this.log('info', `✅ Completed ${operationName}`, { 
        operationId,
        duration: `${duration.toFixed(2)}ms`,
        success: true,
        ...context 
      })
      
      return { success: true, data: result }
    } catch (error) {
      const duration = performance.now() - startTime
      this.errorCount++
      this.totalResponseTime += duration
      
      const appError = handleError(error, { 
        context: { 
          service: this.serviceName, 
          operation: operationName,
          operationId,
          duration: `${duration.toFixed(2)}ms`,
          ...context 
        }
      })
      
      this.log('error', `❌ Failed ${operationName}`, { 
        operationId,
        error: appError.message,
        duration: `${duration.toFixed(2)}ms`,
        errorType: error.constructor.name,
        ...context 
      })
      
      return { success: false, error: appError }
    }
  }

  /**
   * Execute with retry logic and beautiful progress tracking
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<Result<T>> {
    const maxAttempts = this.config.retryAttempts || 3
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.log('debug', `🔄 Attempt ${attempt}/${maxAttempts} for ${operationName}`, {
          attempt,
          maxAttempts,
          ...context
        })
        
        const result = await this.execute(operation, operationName, { 
          ...context, 
          attempt 
        })
        
        if (result.success) {
          if (attempt > 1) {
            this.log('info', `🎉 Succeeded on attempt ${attempt} for ${operationName}`, {
              attempt,
              totalAttempts: attempt
            })
          }
          return result
        }
        
        lastError = result.error as Error
        
        // Wait before retry with exponential backoff
        if (attempt < maxAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
          this.log('warn', `⏳ Retrying ${operationName} in ${delay}ms`, {
            attempt,
            delay,
            error: lastError.message
          })
          await this.sleep(delay)
        }
      } catch (error) {
        lastError = error as Error
      }
    }
    
    this.log('error', `💥 All attempts failed for ${operationName}`, {
      totalAttempts: maxAttempts,
      finalError: lastError?.message
    })
    
    return { 
      success: false, 
      error: lastError || new Error(`Operation failed after ${maxAttempts} attempts`) as any
    }
  }

  /**
   * Execute with timeout and beautiful progress indication
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`))
      }, timeoutMs)
      
      operation()
        .then(result => {
          clearTimeout(timer)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timer)
          reject(error)
        })
    })
  }

  /**
   * Get beautiful service health report
   */
  getHealth(): ServiceHealth {
    const uptime = Date.now() - this.startTime
    const errorRate = this.operationsCount > 0 ? this.errorCount / this.operationsCount : 0
    const averageResponseTime = this.operationsCount > 0 ? this.totalResponseTime / this.operationsCount : 0
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    if (errorRate > 0.1 || averageResponseTime > 5000) {
      status = 'unhealthy'
    } else if (errorRate > 0.05 || averageResponseTime > 2000) {
      status = 'degraded'
    }
    
    return {
      status,
      uptime,
      operationsCount: this.operationsCount,
      errorRate: Math.round(errorRate * 10000) / 100, // Percentage with 2 decimals
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      lastOperation: this.lastOperation,
      memoryUsage: this.getMemoryUsage()
    }
  }

  /**
   * Beautiful logging with context and styling
   */
  protected log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: Record<string, any>
  ): void {
    // Skip debug logs if log level is higher
    if (level === 'debug' && this.config.logLevel !== 'debug') {
      return
    }
    
    const emoji = {
      debug: '🔍',
      info: '💡',
      warn: '⚠️',
      error: '🚨'
    }[level]
    
    logger[level](`${emoji} [${this.serviceName}] ${message}`, {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      uptime: `${((Date.now() - this.startTime) / 1000).toFixed(1)}s`,
      ...data
    })
  }

  /**
   * Validate input data with beautiful error messages
   */
  protected validate<T>(data: T, validator: (data: T) => boolean, errorMessage: string): void {
    if (!validator(data)) {
      throw new Error(`❌ Validation failed: ${errorMessage}`)
    }
  }

  /**
   * Generate unique operation ID for tracking
   */
  private generateOperationId(): string {
    return `${this.serviceName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get memory usage if available
   */
  private getMemoryUsage(): number | undefined {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024 * 100) / 100 // MB
    }
    return undefined
  }

  /**
   * Graceful cleanup
   */
  async cleanup(): Promise<void> {
    this.log('info', '🧹 Cleaning up service...')
    // Override in subclasses for specific cleanup
  }

  /**
   * Get service metrics for monitoring
   */
  getMetrics(): {
    name: string
    uptime: number
    operationsCount: number
    errorCount: number
    errorRate: number
    averageResponseTime: number
    lastOperation: Date | null
    memoryUsage?: number
  } {
    const health = this.getHealth()
    return {
      name: this.serviceName,
      uptime: health.uptime,
      operationsCount: health.operationsCount,
      errorCount: this.errorCount,
      errorRate: health.errorRate,
      averageResponseTime: health.averageResponseTime,
      lastOperation: health.lastOperation,
      memoryUsage: health.memoryUsage
    }
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.operationsCount = 0
    this.errorCount = 0
    this.totalResponseTime = 0
    this.lastOperation = null
    this.log('info', '📊 Service metrics reset')
  }

  /**
   * Get service uptime in human readable format
   */
  getUptimeFormatted(): string {
    const uptime = Date.now() - this.startTime
    const seconds = Math.floor(uptime / 1000) % 60
    const minutes = Math.floor(uptime / (1000 * 60)) % 60
    const hours = Math.floor(uptime / (1000 * 60 * 60)) % 24
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24))
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  /**
   * Get service name
   */
  getName(): string {
    return this.serviceName
  }

  /**
   * Check if service is initialized
   */
  isReady(): boolean {
    return this.isInitialized
  }
}
