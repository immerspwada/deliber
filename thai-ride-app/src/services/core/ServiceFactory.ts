/**
 * Service Factory - MUNEEF Style
 * 
 * Elegant factory pattern for service creation and management
 * - Dependency injection
 * - Service lifecycle management
 * - Configuration management
 * - Hot reloading support
 */

import { ServiceRegistry } from './ServiceRegistry'
import { logger } from '../../utils/logger'

export interface ServiceConfiguration {
  name: string
  implementation: string
  dependencies?: string[]
  config?: Record<string, any>
  singleton?: boolean
  lazy?: boolean
  enabled?: boolean
}

export interface ServiceFactoryOptions {
  environment?: 'development' | 'production' | 'test'
  enableHotReload?: boolean
  enableMetrics?: boolean
  configPath?: string
}

/**
 * Service Factory for creating and managing services
 */
export class ServiceFactory {
  private static instance: ServiceFactory
  private registry: ServiceRegistry
  private configurations = new Map<string, ServiceConfiguration>()
  private serviceInstances = new Map<string, any>()
  private options: ServiceFactoryOptions

  private constructor(options: ServiceFactoryOptions = {}) {
    this.registry = ServiceRegistry.getInstance()
    this.options = {
      environment: 'development',
      enableHotReload: false,
      enableMetrics: true,
      ...options
    }

    this.loadDefaultConfigurations()
  }

  /**
   * Get singleton instance
   */
  static getInstance(options?: ServiceFactoryOptions): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory(options)
    }
    return ServiceFactory.instance
  }

  /**
   * Register service configuration
   */
  registerService(config: ServiceConfiguration): void {
    this.configurations.set(config.name, {
      singleton: true,
      lazy: true,
      enabled: true,
      ...config
    })

    logger.debug(`Service configuration registered: ${config.name}`, config)
  }

  /**
   * Create service instance
   */
  async createService<T>(serviceName: string, overrideConfig?: Partial<ServiceConfiguration>): Promise<T> {
    const config = this.configurations.get(serviceName)
    if (!config) {
      throw new Error(`Service configuration not found: ${serviceName}`)
    }

    if (!config.enabled) {
      throw new Error(`Service is disabled: ${serviceName}`)
    }

    const finalConfig = { ...config, ...overrideConfig }

    // Check if singleton instance exists
    if (finalConfig.singleton && this.serviceInstances.has(serviceName)) {
      return this.serviceInstances.get(serviceName)
    }

    // Resolve dependencies first
    await this.resolveDependencies(finalConfig.dependencies || [])

    // Create service instance
    const serviceInstance = await this.instantiateService(finalConfig)

    // Store singleton instance
    if (finalConfig.singleton) {
      this.serviceInstances.set(serviceName, serviceInstance)
    }

    // Register with service registry (simplified)
    logger.debug(`Service ${serviceName} registered with factory`)

    logger.info(`Service created: ${serviceName}`)

    return serviceInstance
  }

  /**
   * Get service instance
   */
  async getService<T>(serviceName: string): Promise<T> {
    // Check if instance already exists
    if (this.serviceInstances.has(serviceName)) {
      return this.serviceInstances.get(serviceName)
    }

    // Create new instance
    return this.createService<T>(serviceName)
  }

  /**
   * Get all registered service configurations
   */
  getServiceConfigurations(): ServiceConfiguration[] {
    return Array.from(this.configurations.values())
  }

  /**
   * Update service configuration
   */
  updateServiceConfiguration(serviceName: string, updates: Partial<ServiceConfiguration>): void {
    const existing = this.configurations.get(serviceName)
    if (!existing) {
      throw new Error(`Service configuration not found: ${serviceName}`)
    }

    const updated = { ...existing, ...updates }
    this.configurations.set(serviceName, updated)

    // Hot reload if enabled
    if (this.options.enableHotReload && this.serviceInstances.has(serviceName)) {
      this.hotReloadService(serviceName)
    }

    logger.info(`Service configuration updated: ${serviceName}`)
  }

  /**
   * Enable/disable service
   */
  toggleService(serviceName: string, enabled: boolean): void {
    this.updateServiceConfiguration(serviceName, { enabled })
  }

  /**
   * Reload service instance
   */
  async reloadService(serviceName: string): Promise<void> {
    // Remove existing instance
    if (this.serviceInstances.has(serviceName)) {
      const instance = this.serviceInstances.get(serviceName)
      
      // Graceful shutdown if supported
      if (instance && typeof instance.shutdown === 'function') {
        await instance.shutdown()
      }
      
      this.serviceInstances.delete(serviceName)
    }

    // Create new instance
    await this.createService(serviceName)

    logger.info(`Service reloaded: ${serviceName}`)
  }

  /**
   * Shutdown all services
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down all services...')

    const shutdownPromises: Promise<void>[] = []

    for (const [serviceName, instance] of this.serviceInstances) {
      if (instance && typeof instance.shutdown === 'function') {
        shutdownPromises.push(
          instance.shutdown().catch((error: any) => {
            logger.error(`Failed to shutdown service: ${serviceName}`, error)
          })
        )
      }
    }

    await Promise.all(shutdownPromises)
    
    this.serviceInstances.clear()
    this.configurations.clear()

    logger.info('All services shut down')
  }

  /**
   * Get service health status
   */
  async getServiceHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {}

    for (const [serviceName, instance] of this.serviceInstances) {
      try {
        if (instance && typeof instance.healthCheck === 'function') {
          health[serviceName] = await instance.healthCheck()
        } else {
          health[serviceName] = true // Assume healthy if no health check
        }
      } catch (error) {
        health[serviceName] = false
        logger.error(`Health check failed for service: ${serviceName}`, error)
      }
    }

    return health
  }

  /**
   * Get service metrics
   */
  getServiceMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {}

    for (const [serviceName, instance] of this.serviceInstances) {
      try {
        if (instance && typeof instance.getMetrics === 'function') {
          metrics[serviceName] = instance.getMetrics()
        }
      } catch (error) {
        logger.error(`Failed to get metrics for service: ${serviceName}`, error)
      }
    }

    return metrics
  }

  /**
   * Load default service configurations
   */
  private loadDefaultConfigurations(): void {
    const defaultConfigs: ServiceConfiguration[] = [
      {
        name: 'RideService',
        implementation: 'RideService',
        dependencies: ['UserRepository', 'ProviderRepository', 'RideRepository'],
        singleton: true,
        lazy: true
      },
      {
        name: 'EnhancedRideService',
        implementation: 'EnhancedRideService',
        dependencies: ['UserRepository', 'ProviderRepository', 'RideRepository'],
        singleton: true,
        lazy: true
      },
      {
        name: 'PaymentService',
        implementation: 'PaymentService',
        dependencies: ['PaymentRepository', 'UserRepository'],
        singleton: true,
        lazy: true
      },
      {
        name: 'DeliveryService',
        implementation: 'DeliveryService',
        dependencies: ['DeliveryRepository', 'ProviderRepository', 'UserRepository'],
        singleton: true,
        lazy: true
      },
      {
        name: 'AdminService',
        implementation: 'AdminService',
        dependencies: ['UserRepository', 'ProviderRepository', 'RideRepository'],
        singleton: true,
        lazy: true
      }
    ]

    defaultConfigs.forEach(config => {
      this.configurations.set(config.name, config)
    })

    logger.debug('Default service configurations loaded')
  }

  /**
   * Resolve service dependencies
   */
  private async resolveDependencies(dependencies: string[]): Promise<void> {
    for (const dependency of dependencies) {
      if (!this.serviceInstances.has(dependency)) {
        await this.createService(dependency)
      }
    }
  }

  /**
   * Instantiate service from configuration
   */
  private async instantiateService(config: ServiceConfiguration): Promise<any> {
    try {
      // Dynamic import based on implementation name
      const ServiceClass = await this.loadServiceClass(config.implementation)
      
      // Create instance with configuration
      const instance = new ServiceClass(config.config)

      // Initialize if method exists
      if (instance && typeof instance.initialize === 'function') {
        await instance.initialize()
      }

      return instance
    } catch (error) {
      logger.error(`Failed to instantiate service: ${config.name}`, error)
      throw error
    }
  }

  /**
   * Load service class dynamically
   */
  private async loadServiceClass(implementation: string): Promise<any> {
    try {
      // Map implementation names to actual classes
      const serviceMap: Record<string, () => Promise<any>> = {
        'RideService': () => import('../RideService').then(m => m.RideService),
        'EnhancedRideService': () => import('../EnhancedRideService').then(m => m.EnhancedRideService),
        'PaymentService': () => import('../PaymentService').then(m => m.PaymentService),
        'DeliveryService': () => import('../DeliveryService').then(m => m.DeliveryService),
        'AdminService': () => import('../AdminService').then(m => m.AdminService),
        'UserRepository': () => import('../../repositories/UserRepository').then(m => m.UserRepository),
        'ProviderRepository': () => import('../../repositories/ProviderRepository').then(m => m.ProviderRepository),
        'RideRepository': () => import('../../repositories/RideRepository').then(m => m.RideRepository),
        'PaymentRepository': () => import('../../repositories/PaymentRepository').then(m => m.PaymentRepository),
        'DeliveryRepository': () => import('../../repositories/DeliveryRepository').then(m => m.DeliveryRepository)
      }

      const loader = serviceMap[implementation]
      if (!loader) {
        throw new Error(`Unknown service implementation: ${implementation}`)
      }

      return await loader()
    } catch (error) {
      logger.error(`Failed to load service class: ${implementation}`, error)
      throw error
    }
  }

  /**
   * Hot reload service instance
   */
  private async hotReloadService(serviceName: string): Promise<void> {
    try {
      logger.info(`Hot reloading service: ${serviceName}`)
      await this.reloadService(serviceName)
    } catch (error) {
      logger.error(`Hot reload failed for service: ${serviceName}`, error)
    }
  }
}

/**
 * Service configuration builder
 */
export class ServiceConfigurationBuilder {
  private config: Partial<ServiceConfiguration> = {}

  static create(name: string): ServiceConfigurationBuilder {
    const builder = new ServiceConfigurationBuilder()
    builder.config.name = name
    return builder
  }

  implementation(impl: string): this {
    this.config.implementation = impl
    return this
  }

  dependencies(deps: string[]): this {
    this.config.dependencies = deps
    return this
  }

  singleton(isSingleton: boolean = true): this {
    this.config.singleton = isSingleton
    return this
  }

  lazy(isLazy: boolean = true): this {
    this.config.lazy = isLazy
    return this
  }

  enabled(isEnabled: boolean = true): this {
    this.config.enabled = isEnabled
    return this
  }

  withConfig(config: Record<string, any>): this {
    this.config.config = config
    return this
  }

  build(): ServiceConfiguration {
    if (!this.config.name || !this.config.implementation) {
      throw new Error('Service name and implementation are required')
    }

    return this.config as ServiceConfiguration
  }
}

// Export singleton instance
export const serviceFactory = ServiceFactory.getInstance()