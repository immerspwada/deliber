/**
 * Service Registry - Central Service Management
 * 
 * จัดการ Services ทั้งหมดในระบบแบบ Centralized
 * พร้อม Dependency Injection และ Lifecycle Management
 */

import { BaseService } from '../BaseService'
import { RideService } from '../RideService'
import { DeliveryService } from '../DeliveryService'
import { PaymentService } from '../PaymentService'
import { AdminService } from '../AdminService'
import { logger } from '../../utils/logger'
import type { Result } from '../../utils/result'

export interface ServiceConfig {
  name: string
  singleton: boolean
  dependencies?: string[]
  lazy?: boolean
  config?: Record<string, any>
}

export interface ServiceMetrics {
  callCount: number
  totalDuration: number
  averageDuration: number
  errorCount: number
  lastUsed: Date
}

export class ServiceRegistry {
  private static instance: ServiceRegistry
  private services = new Map<string, any>()
  private configs = new Map<string, ServiceConfig>()
  private metrics = new Map<string, ServiceMetrics>()
  private initialized = false

  private constructor() {}

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry()
    }
    return ServiceRegistry.instance
  }

  /**
   * Initialize service registry with beautiful startup sequence
   */
  async initialize(): Promise<Result<boolean>> {
    if (this.initialized) {
      return { success: true, data: true }
    }

    try {
      logger.info('🚀 Initializing Thai Ride Service Registry...')
      
      // Register core services with elegant configuration
      this.registerService('ride', RideService, {
        name: 'Ride Service',
        singleton: true,
        dependencies: [],
        config: {
          maxConcurrentRides: 1,
          defaultRadius: 5,
          estimationAccuracy: 0.95
        }
      })

      this.registerService('delivery', DeliveryService, {
        name: 'Delivery Service', 
        singleton: true,
        dependencies: [],
        config: {
          maxPackageWeight: 50,
          defaultRadius: 10,
          trackingUpdateInterval: 30000
        }
      })

      this.registerService('payment', PaymentService, {
        name: 'Payment Service',
        singleton: true,
        dependencies: [],
        config: {
          retryAttempts: 3,
          timeoutMs: 30000,
          supportedMethods: ['cash', 'promptpay', 'credit_card', 'mobile_banking', 'wallet']
        }
      })

      this.registerService('admin', AdminService, {
        name: 'Admin Service',
        singleton: true,
        dependencies: ['ride', 'delivery', 'payment'],
        config: {
          auditLogging: true,
          permissionCaching: true,
          sessionTimeout: 3600000
        }
      })

      // Initialize metrics for all services
      for (const [serviceName] of this.configs) {
        this.metrics.set(serviceName, {
          callCount: 0,
          totalDuration: 0,
          averageDuration: 0,
          errorCount: 0,
          lastUsed: new Date()
        })
      }

      this.initialized = true
      
      logger.info('✨ Service Registry initialized successfully', {
        servicesCount: this.configs.size,
        services: Array.from(this.configs.keys())
      })

      return { success: true, data: true }
    } catch (error) {
      logger.error('❌ Failed to initialize Service Registry:', error)
      return { success: false, error: error as any }
    }
  }

  /**
   * Register a service with elegant configuration
   */
  private registerService<T extends BaseService>(
    name: string,
    ServiceClass: new () => T,
    config: Omit<ServiceConfig, 'singleton'> & { singleton?: boolean }
  ): void {
    const serviceConfig: ServiceConfig = {
      singleton: true,
      ...config
    }

    this.configs.set(name, serviceConfig)

    // Create singleton instance if not lazy
    if (serviceConfig.singleton && !serviceConfig.lazy) {
      this.services.set(name, new ServiceClass())
      logger.debug(`📦 Pre-initialized service: ${serviceConfig.name}`)
    }
  }

  /**
   * Get service with beautiful error handling and metrics
   */
  async getService<T extends BaseService>(name: string): Promise<Result<T>> {
    try {
      const startTime = performance.now()
      
      // Check if service is registered
      const config = this.configs.get(name)
      if (!config) {
        throw new Error(`Service '${name}' is not registered`)
      }

      // Get or create service instance
      let service = this.services.get(name)
      if (!service) {
        if (config.singleton) {
          service = await this.createServiceInstance(name, config)
          this.services.set(name, service)
        } else {
          service = await this.createServiceInstance(name, config)
        }
      }

      // Update metrics with style
      this.updateMetrics(name, performance.now() - startTime, false)

      logger.debug(`🎯 Service accessed: ${config.name}`, {
        serviceName: name,
        singleton: config.singleton,
        duration: `${(performance.now() - startTime).toFixed(2)}ms`
      })

      return { success: true, data: service }
    } catch (error) {
      this.updateMetrics(name, 0, true)
      logger.error(`💥 Failed to get service '${name}':`, error)
      return { success: false, error: error as any }
    }
  }

  /**
   * Create service instance with dependency injection
   */
  private async createServiceInstance(name: string, config: ServiceConfig): Promise<any> {
    const ServiceClass = this.getServiceClass(name)
    
    // Resolve dependencies first
    if (config.dependencies && config.dependencies.length > 0) {
      logger.debug(`🔗 Resolving dependencies for ${config.name}:`, config.dependencies)
      
      for (const depName of config.dependencies) {
        const depResult = await this.getService(depName)
        if (!depResult.success) {
          throw new Error(`Failed to resolve dependency '${depName}' for service '${name}'`)
        }
      }
    }

    const instance = new ServiceClass()
    
    // Apply configuration if service supports it
    if (instance.configure && config.config) {
      await instance.configure(config.config)
    }

    logger.debug(`✨ Created service instance: ${config.name}`)
    return instance
  }

  /**
   * Get service class by name
   */
  private getServiceClass(name: string): any {
    const serviceClasses: Record<string, any> = {
      'ride': RideService,
      'delivery': DeliveryService,
      'payment': PaymentService,
      'admin': AdminService
    }

    const ServiceClass = serviceClasses[name]
    if (!ServiceClass) {
      throw new Error(`Service class not found for '${name}'`)
    }

    return ServiceClass
  }

  /**
   * Update service metrics with beautiful tracking
   */
  private updateMetrics(serviceName: string, duration: number, isError: boolean): void {
    const metrics = this.metrics.get(serviceName)
    if (!metrics) return

    metrics.callCount++
    metrics.lastUsed = new Date()

    if (isError) {
      metrics.errorCount++
    } else {
      metrics.totalDuration += duration
      metrics.averageDuration = metrics.totalDuration / (metrics.callCount - metrics.errorCount)
    }

    this.metrics.set(serviceName, metrics)
  }

  /**
   * Get beautiful service health report
   */
  getHealthReport(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    services: Array<{
      name: string
      status: 'healthy' | 'degraded' | 'unhealthy'
      metrics: ServiceMetrics
      config: ServiceConfig
    }>
    summary: {
      totalServices: number
      healthyServices: number
      totalCalls: number
      totalErrors: number
      averageResponseTime: number
    }
  } {
    const services = []
    let totalCalls = 0
    let totalErrors = 0
    let totalDuration = 0
    let healthyCount = 0

    for (const [name, config] of this.configs) {
      const metrics = this.metrics.get(name)!
      
      // Determine service health with sophisticated logic
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      const errorRate = metrics.callCount > 0 ? metrics.errorCount / metrics.callCount : 0
      
      if (errorRate > 0.1 || metrics.averageDuration > 5000) {
        status = 'unhealthy'
      } else if (errorRate > 0.05 || metrics.averageDuration > 2000) {
        status = 'degraded'
      } else {
        healthyCount++
      }

      services.push({
        name: config.name,
        status,
        metrics,
        config
      })

      totalCalls += metrics.callCount
      totalErrors += metrics.errorCount
      totalDuration += metrics.totalDuration
    }

    const overallStatus = healthyCount === services.length ? 'healthy' :
                         healthyCount > services.length * 0.7 ? 'degraded' : 'unhealthy'

    return {
      status: overallStatus,
      services,
      summary: {
        totalServices: services.length,
        healthyServices: healthyCount,
        totalCalls,
        totalErrors,
        averageResponseTime: totalCalls > 0 ? totalDuration / totalCalls : 0
      }
    }
  }

  /**
   * Graceful shutdown with beautiful cleanup
   */
  async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down Service Registry...')

    // Cleanup all services gracefully
    for (const [name, service] of this.services) {
      try {
        if (service.cleanup && typeof service.cleanup === 'function') {
          await service.cleanup()
          logger.debug(`🧹 Cleaned up service: ${name}`)
        }
      } catch (error) {
        logger.warn(`⚠️ Error cleaning up service '${name}':`, error)
      }
    }

    // Clear all registrations
    this.services.clear()
    this.configs.clear()
    this.metrics.clear()
    this.initialized = false

    logger.info('✅ Service Registry shutdown complete')
  }

  /**
   * Get service metrics for monitoring
   */
  getServiceMetrics(serviceName?: string): ServiceMetrics | Map<string, ServiceMetrics> {
    if (serviceName) {
      return this.metrics.get(serviceName) || {
        callCount: 0,
        totalDuration: 0,
        averageDuration: 0,
        errorCount: 0,
        lastUsed: new Date()
      }
    }
    return new Map(this.metrics)
  }

  /**
   * Reset service metrics
   */
  resetMetrics(serviceName?: string): void {
    if (serviceName) {
      this.metrics.set(serviceName, {
        callCount: 0,
        totalDuration: 0,
        averageDuration: 0,
        errorCount: 0,
        lastUsed: new Date()
      })
    } else {
      for (const name of this.metrics.keys()) {
        this.resetMetrics(name)
      }
    }
    
    logger.info(`📊 Service metrics reset${serviceName ? ` for ${serviceName}` : ''}`)
  }
}

// Export singleton instance for easy access
export const serviceRegistry = ServiceRegistry.getInstance()

// Auto-initialize on import
serviceRegistry.initialize().catch(error => {
  logger.error('Failed to auto-initialize Service Registry:', error)
})