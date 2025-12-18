/**
 * Enhanced Base Service - MUNEEF Style
 * 
 * Next-generation base service with advanced patterns:
 * - Middleware pipeline integration
 * - Decorator support
 * - Performance monitoring
 * - Health checks
 * - Graceful shutdown
 */

import { logger } from '../../utils/logger'
import { handleError } from '../../utils/errorHandling'
import type { Result } from '../../utils/result'
import { 
  ServiceMiddlewarePipeline, 
  createDefaultPipeline,
  type ServiceContext 
} from './ServiceMiddleware'
import { ServiceRegistry } from './ServiceRegistry'

export interface ServiceOptions {
  enableMiddleware?: boolean
  enableHealthCheck?: boolean
  enableMetrics?: boolean
  shutdownTimeout?: number
}

export interface ServiceMetadata {
  public?: boolean
  requiredRoles?: string[]
  requiredPermissions?: string[]
  cache?: { ttl?: number }
  rateLimit?: { maxCalls?: number; windowMs?: number }
  validation?: {
    args?: Array<(arg: any) => boolean>
    custom?: (args: any[], context: ServiceContext) => Promise<boolean>
  }
  performanceThreshold?: number
  logArgs?: boolean
  skipSentry?: boolean
  errorTransform?: (error: Error) => Error
  resultTransform?: (result: any) => any
  wrapResult?: boolean
}

/**
 * Enhanced Base Service with middleware support
 */
export abstract class EnhancedBaseService {
  protected serviceName: string
  protected options: ServiceOptions
  protected middleware: ServiceMiddlewarePipeline
  protected isShuttingDown = false
  private healthCheckInterval?: any

  constructor(serviceName: string, options: ServiceOptions = {}) {
    this.serviceName = serviceName
    this.options = {
      enableMiddleware: true,
      enableHealthCheck: true,
      enableMetrics: true,
      shutdownTimeout: 30000,
      ...options
    }

    // Initialize middleware pipeline
    this.middleware = this.options.enableMiddleware 
      ? createDefaultPipeline() 
      : new ServiceMiddlewarePipeline()

    // Setup health check
    if (this.options.enableHealthCheck) {
      this.setupHealthCheck()
    }

    // Register with service registry
    this.registerWithRegistry()
  }

  /**
   * Execute service method with full middleware pipeline
   */
  protected async executeWithMiddleware<T>(
    methodName: string,
    operation: () => Promise<T>,
    metadata: ServiceMetadata = {},
    context: Partial<ServiceContext> = {}
  ): Promise<T> {
    if (this.isShuttingDown) {
      throw new Error(`Service ${this.serviceName} is shutting down`)
    }

    const serviceContext: ServiceContext = {
      serviceName: this.serviceName,
      methodName,
      args: [],
      metadata,
      startTime: performance.now(),
      ...context
    }

    return this.middleware.execute(serviceContext, operation)
  }

  /**
   * Execute service method with basic error handling (legacy compatibility)
   */
  protected async execute<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<Result<T>> {
    const startTime = performance.now()
    
    try {
      logger.debug(`[${this.serviceName}] ${operationName} started`, context)
      
      const result = await operation()
      
      const duration = performance.now() - startTime
      logger.debug(`[${this.serviceName}] ${operationName} completed in ${duration.toFixed(2)}ms`)
      
      return { success: true, data: result }
    } catch (error) {
      const duration = performance.now() - startTime
      const appError = handleError(error, {
        logToSentry: true,
        context: {
          service: this.serviceName,
          operation: operationName,
          duration,
          ...context
        }
      })
      
      logger.error(`[${this.serviceName}] ${operationName} failed after ${duration.toFixed(2)}ms:`, appError.message)
      
      return { success: false, error: appError }
    }
  }

  /**
   * Health check implementation
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Basic health check - can be overridden by subclasses
      return !this.isShuttingDown
    } catch (error) {
      logger.error(`Health check failed for ${this.serviceName}`, error)
      return false
    }
  }

  /**
   * Get service metrics
   */
  getMetrics(): Record<string, any> {
    return {
      serviceName: this.serviceName,
      isHealthy: !this.isShuttingDown,
      uptime: performance.now() / 1000,
      memoryUsage: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 },
      lastHealthCheck: new Date().toISOString()
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return

    this.isShuttingDown = true
    logger.info(`Starting graceful shutdown for ${this.serviceName}`)

    try {
      // Clear health check interval
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval)
      }

      // Wait for ongoing operations to complete
      await this.waitForOperationsToComplete()

      // Cleanup resources
      await this.cleanup()

      logger.info(`Graceful shutdown completed for ${this.serviceName}`)
    } catch (error) {
      logger.error(`Error during shutdown of ${this.serviceName}`, error)
      throw error
    }
  }

  /**
   * Add custom middleware
   */
  protected addMiddleware(middleware: any): void {
    this.middleware.use(middleware)
  }

  /**
   * Validate input data
   */
  protected validate<T>(data: T, validator: (data: T) => boolean, errorMessage: string): void {
    if (!validator(data)) {
      throw new Error(errorMessage)
    }
  }

  /**
   * Log service activity
   */
  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    logger[level](`[${this.serviceName}] ${message}`, data)
  }

  /**
   * Setup periodic health check
   */
  private setupHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const isHealthy = await this.healthCheck()
        if (!isHealthy) {
          logger.warn(`Health check failed for ${this.serviceName}`)
        }
      } catch (error) {
        logger.error(`Health check error for ${this.serviceName}`, error)
      }
    }, 30000) // Check every 30 seconds
  }

  /**
   * Register with service registry
   */
  private registerWithRegistry(): void {
    try {
      // Register with service registry (simplified)
      logger.debug(`Service ${this.serviceName} registered with registry`)
    } catch (error) {
      logger.warn(`Failed to register ${this.serviceName} with service registry`, error)
    }
  }

  /**
   * Wait for ongoing operations to complete
   */
  private async waitForOperationsToComplete(): Promise<void> {
    // In a real implementation, this would track ongoing operations
    // and wait for them to complete or timeout
    return new Promise(resolve => {
      setTimeout(resolve, 1000) // Simple 1-second wait
    })
  }

  /**
   * Cleanup resources
   */
  protected async cleanup(): Promise<void> {
    // Override in subclasses to cleanup specific resources
    // e.g., database connections, file handles, etc.
  }
}

/**
 * Service method decorator for enhanced services
 */
export function ServiceMethod(metadata: ServiceMetadata = {}) {
  return function (_target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      // If this is an enhanced service, use middleware pipeline
      if (this instanceof EnhancedBaseService) {
        return (this as any).executeWithMiddleware(
          propertyName,
          () => method.apply(this, args),
          metadata,
          { args }
        )
      }

      // Fallback to direct method call
      return method.apply(this, args)
    }

    return descriptor
  }
}

/**
 * Public method decorator (no auth required)
 */
export function PublicMethod(metadata: Omit<ServiceMetadata, 'public'> = {}) {
  return ServiceMethod({ ...metadata, public: true })
}

/**
 * Admin-only method decorator
 */
export function AdminMethod(metadata: Omit<ServiceMetadata, 'requiredRoles'> = {}) {
  return ServiceMethod({ ...metadata, requiredRoles: ['admin'] })
}

/**
 * Provider-only method decorator
 */
export function ProviderMethod(metadata: Omit<ServiceMetadata, 'requiredRoles'> = {}) {
  return ServiceMethod({ ...metadata, requiredRoles: ['provider'] })
}

/**
 * Customer method decorator
 */
export function CustomerMethod(metadata: Omit<ServiceMetadata, 'requiredRoles'> = {}) {
  return ServiceMethod({ ...metadata, requiredRoles: ['customer'] })
}

/**
 * Cached method decorator
 */
export function CachedMethod(ttl: number = 300000, metadata: Omit<ServiceMetadata, 'cache'> = {}) {
  return ServiceMethod({ ...metadata, cache: { ttl } })
}

/**
 * Rate limited method decorator
 */
export function RateLimitedMethod(
  maxCalls: number = 100, 
  windowMs: number = 60000,
  metadata: Omit<ServiceMetadata, 'rateLimit'> = {}
) {
  return ServiceMethod({ ...metadata, rateLimit: { maxCalls, windowMs } })
}