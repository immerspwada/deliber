/**
 * Logging Middleware
 * 
 * Handles request/response logging and performance monitoring
 */

import { logger } from '../utils/logger'
import type { Result } from '../utils/result'

export interface LogContext {
  userId?: string
  sessionId?: string
  requestId?: string
  userAgent?: string
  ipAddress?: string
  timestamp: string
}

export interface PerformanceMetrics {
  startTime: number
  endTime?: number
  duration?: number
  memoryUsage?: number
  apiCalls?: number
}

export class LoggingMiddleware {
  private static requestCounter = 0
  private static activeRequests = new Map<string, PerformanceMetrics>()
  
  /**
   * Generate unique request ID
   */
  static generateRequestId(): string {
    this.requestCounter++
    return `req_${Date.now()}_${this.requestCounter}`
  }
  
  /**
   * Start request logging
   */
  static startRequest(
    operation: string,
    context?: Partial<LogContext>
  ): string {
    const requestId = this.generateRequestId()
    const startTime = performance.now()
    
    const logContext: LogContext = {
      requestId,
      timestamp: new Date().toISOString(),
      ...context
    }
    
    // Store performance metrics
    this.activeRequests.set(requestId, {
      startTime,
      memoryUsage: this.getMemoryUsage(),
      apiCalls: 0
    })
    
    logger.info(`[Request Start] ${operation}`, {
      requestId,
      operation,
      context: logContext
    })
    
    return requestId
  }
  
  /**
   * End request logging
   */
  static endRequest(
    requestId: string,
    operation: string,
    result: 'success' | 'error',
    error?: Error,
    additionalData?: Record<string, any>
  ): void {
    const metrics = this.activeRequests.get(requestId)
    
    if (metrics) {
      metrics.endTime = performance.now()
      metrics.duration = metrics.endTime - metrics.startTime
      
      const logData = {
        requestId,
        operation,
        result,
        duration: `${metrics.duration.toFixed(2)}ms`,
        memoryUsage: this.getMemoryUsage(),
        memoryDelta: this.getMemoryUsage() - (metrics.memoryUsage || 0),
        apiCalls: metrics.apiCalls,
        ...additionalData
      }
      
      if (result === 'success') {
        logger.info(`[Request Success] ${operation}`, logData)
      } else {
        logger.error(`[Request Error] ${operation}`, {
          ...logData,
          error: error?.message,
          stack: error?.stack
        })
      }
      
      // Clean up
      this.activeRequests.delete(requestId)
      
      // Log performance warning if request is slow
      if (metrics.duration > 5000) { // 5 seconds
        logger.warn(`[Performance] Slow request detected`, {
          requestId,
          operation,
          duration: metrics.duration
        })
      }
    }
  }
  
  /**
   * Log API call
   */
  static logApiCall(
    requestId: string,
    method: string,
    url: string,
    duration: number,
    status?: number,
    error?: Error
  ): void {
    // Increment API call counter for this request
    const metrics = this.activeRequests.get(requestId)
    if (metrics) {
      metrics.apiCalls = (metrics.apiCalls || 0) + 1
    }
    
    const logData = {
      requestId,
      method,
      url,
      duration: `${duration.toFixed(2)}ms`,
      status
    }
    
    if (error) {
      logger.error(`[API Error] ${method} ${url}`, {
        ...logData,
        error: error.message
      })
    } else if (status && status >= 400) {
      logger.warn(`[API Warning] ${method} ${url}`, logData)
    } else {
      logger.debug(`[API Call] ${method} ${url}`, logData)
    }
  }
  
  /**
   * Log database operation
   */
  static logDatabaseOperation(
    requestId: string,
    operation: string,
    table: string,
    duration: number,
    recordCount?: number,
    error?: Error
  ): void {
    const logData = {
      requestId,
      operation,
      table,
      duration: `${duration.toFixed(2)}ms`,
      recordCount
    }
    
    if (error) {
      logger.error(`[DB Error] ${operation} on ${table}`, {
        ...logData,
        error: error.message
      })
    } else {
      logger.debug(`[DB Operation] ${operation} on ${table}`, logData)
    }
    
    // Log slow query warning
    if (duration > 1000) { // 1 second
      logger.warn(`[Performance] Slow database query`, {
        requestId,
        operation,
        table,
        duration
      })
    }
  }
  
  /**
   * Log user action
   */
  static logUserAction(
    userId: string,
    action: string,
    resource?: string,
    metadata?: Record<string, any>
  ): void {
    logger.info(`[User Action] ${action}`, {
      userId,
      action,
      resource,
      timestamp: new Date().toISOString(),
      ...metadata
    })
  }
  
  /**
   * Log security event
   */
  static logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>
  ): void {
    const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 
                    severity === 'medium' ? 'warn' : 'info'
    
    logger[logLevel](`[Security] ${event}`, {
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...details
    })
  }
  
  /**
   * Log business event
   */
  static logBusinessEvent(
    event: string,
    category: string,
    data: Record<string, any>
  ): void {
    logger.info(`[Business Event] ${event}`, {
      event,
      category,
      timestamp: new Date().toISOString(),
      ...data
    })
  }
  
  /**
   * Log error with context
   */
  static logError(
    error: Error,
    context: {
      operation?: string
      userId?: string
      requestId?: string
      additionalData?: Record<string, any>
    }
  ): void {
    logger.error(`[Error] ${error.message}`, {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...context
    })
  }
  
  /**
   * Create logging wrapper for functions
   */
  static wrapFunction<T extends any[], R>(
    fn: (...args: T) => Promise<Result<R>>,
    operation: string,
    context?: Partial<LogContext>
  ): (...args: T) => Promise<Result<R>> {
    return async (...args: T): Promise<Result<R>> => {
      const requestId = this.startRequest(operation, context)
      
      try {
        const result = await fn(...args)
        
        if (result.success) {
          this.endRequest(requestId, operation, 'success')
        } else {
          this.endRequest(requestId, operation, 'error', result.error as Error)
        }
        
        return result
      } catch (error) {
        this.endRequest(requestId, operation, 'error', error as Error)
        throw error
      }
    }
  }
  
  /**
   * Get current memory usage
   */
  private static getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024 // MB
    }
    return 0
  }
  
  /**
   * Get active requests count
   */
  static getActiveRequestsCount(): number {
    return this.activeRequests.size
  }
  
  /**
   * Get performance summary
   */
  static getPerformanceSummary(): {
    activeRequests: number
    averageDuration: number
    totalApiCalls: number
    memoryUsage: number
  } {
    const activeMetrics = Array.from(this.activeRequests.values())
    const completedMetrics = activeMetrics.filter(m => m.duration !== undefined)
    
    const averageDuration = completedMetrics.length > 0
      ? completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / completedMetrics.length
      : 0
    
    const totalApiCalls = activeMetrics.reduce((sum, m) => sum + (m.apiCalls || 0), 0)
    
    return {
      activeRequests: this.activeRequests.size,
      averageDuration,
      totalApiCalls,
      memoryUsage: this.getMemoryUsage()
    }
  }
  
  /**
   * Clear old requests (cleanup)
   */
  static cleanup(): void {
    const now = performance.now()
    const maxAge = 300000 // 5 minutes
    
    for (const [requestId, metrics] of this.activeRequests.entries()) {
      if (now - metrics.startTime > maxAge) {
        logger.warn(`[Cleanup] Removing stale request`, { requestId })
        this.activeRequests.delete(requestId)
      }
    }
  }
}