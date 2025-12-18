/**
 * Service Management Composable - MUNEEF Style
 * 
 * Clean service management for admin dashboard
 * - Service health monitoring
 * - Configuration management
 * - Performance metrics
 * - Restart/toggle services
 */

import { ref } from 'vue'
import { serviceArchitecture } from '../services/core/ServiceArchitecture'
import { logger } from '../utils/logger'

export function useServiceManagement() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Get service health status
  const getServiceHealth = async () => {
    try {
      loading.value = true
      const health = serviceArchitecture.getServiceHealth()
      
      logger.info('Service health retrieved', { 
        status: health.status,
        servicesCount: health.services.length 
      })
      
      return health
    } catch (err: any) {
      error.value = err.message
      logger.error('Failed to get service health', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get service metrics
  const getServiceMetrics = async (serviceName?: string) => {
    try {
      loading.value = true
      const metrics = serviceArchitecture.getServiceMetrics(serviceName)
      
      logger.info('Service metrics retrieved', { serviceName })
      
      return metrics
    } catch (err: any) {
      error.value = err.message
      logger.error('Failed to get service metrics', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get service configuration
  const getServiceConfiguration = async (serviceName?: string) => {
    try {
      loading.value = true
      const configs = serviceArchitecture.getServiceConfiguration(serviceName)
      
      logger.info('Service configuration retrieved', { 
        serviceName,
        configsCount: configs.length 
      })
      
      return configs
    } catch (err: any) {
      error.value = err.message
      logger.error('Failed to get service configuration', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update service configuration
  const updateServiceConfiguration = async (serviceName: string, config: any) => {
    try {
      loading.value = true
      const success = serviceArchitecture.updateServiceConfiguration(serviceName, config)
      
      if (!success) {
        throw new Error(`Service ${serviceName} not found`)
      }
      
      logger.info('Service configuration updated', { serviceName, config })
      
      return success
    } catch (err: any) {
      error.value = err.message
      logger.error('Failed to update service configuration', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Restart service
  const restartService = async (serviceName: string) => {
    try {
      loading.value = true
      const success = await serviceArchitecture.restartService(serviceName)
      
      if (!success) {
        throw new Error(`Failed to restart service ${serviceName}`)
      }
      
      logger.info('Service restarted successfully', { serviceName })
      
      return success
    } catch (err: any) {
      error.value = err.message
      logger.error('Failed to restart service', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Toggle service enabled/disabled
  const toggleService = async (serviceName: string, enabled: boolean) => {
    try {
      loading.value = true
      const success = serviceArchitecture.toggleService(serviceName, enabled)
      
      if (!success) {
        throw new Error(`Service ${serviceName} not found`)
      }
      
      logger.info('Service toggled successfully', { serviceName, enabled })
      
      return success
    } catch (err: any) {
      error.value = err.message
      logger.error('Failed to toggle service', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get performance patterns
  const getPerformancePatterns = async () => {
    try {
      loading.value = true
      const patterns = serviceArchitecture.getPerformancePatterns()
      
      logger.info('Performance patterns retrieved')
      
      return patterns
    } catch (err: any) {
      error.value = err.message
      logger.error('Failed to get performance patterns', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Record service call for metrics
  const recordServiceCall = (serviceName: string, duration: number, success: boolean) => {
    try {
      serviceArchitecture.recordServiceCall(serviceName, duration, success)
    } catch (err: any) {
      logger.error('Failed to record service call', err)
    }
  }

  return {
    // State
    loading,
    error,
    
    // Service Health
    getServiceHealth,
    getServiceMetrics,
    
    // Service Configuration
    getServiceConfiguration,
    updateServiceConfiguration,
    
    // Service Management
    restartService,
    toggleService,
    
    // Performance
    getPerformancePatterns,
    recordServiceCall
  }
}