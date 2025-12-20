/**
 * Production Configuration
 * Centralized configuration for production environment
 */

import { isProduction, isDevelopment } from './envValidation'

export interface ProductionConfig {
  // API Settings
  api: {
    timeout: number
    retryAttempts: number
    retryDelay: number
  }
  
  // Cache Settings
  cache: {
    defaultTTL: number
    maxSize: number
  }
  
  // Rate Limiting
  rateLimit: {
    maxRequests: number
    windowMs: number
  }
  
  // Logging
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error'
    remoteLogging: boolean
  }
  
  // Performance
  performance: {
    enableMetrics: boolean
    sampleRate: number
  }
  
  // Security
  security: {
    sessionTimeout: number
    maxLoginAttempts: number
    lockoutDuration: number
  }
  
  // Features
  features: {
    enablePushNotifications: boolean
    enableRealtime: boolean
    enableOfflineMode: boolean
    enableAnalytics: boolean
  }
}

const developmentConfig: ProductionConfig = {
  api: {
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  cache: {
    defaultTTL: 60000, // 1 minute
    maxSize: 100
  },
  rateLimit: {
    maxRequests: 1000,
    windowMs: 60000
  },
  logging: {
    level: 'debug',
    remoteLogging: false
  },
  performance: {
    enableMetrics: true,
    sampleRate: 1.0 // 100% in dev
  },
  security: {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    maxLoginAttempts: 10,
    lockoutDuration: 5 * 60 * 1000 // 5 minutes
  },
  features: {
    enablePushNotifications: true,
    enableRealtime: true,
    enableOfflineMode: true,
    enableAnalytics: false
  }
}

const productionConfig: ProductionConfig = {
  api: {
    timeout: 15000,
    retryAttempts: 3,
    retryDelay: 2000
  },
  cache: {
    defaultTTL: 300000, // 5 minutes
    maxSize: 500
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000
  },
  logging: {
    level: 'warn',
    remoteLogging: true
  },
  performance: {
    enableMetrics: true,
    sampleRate: 0.1 // 10% in production
  },
  security: {
    sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutes
  },
  features: {
    enablePushNotifications: true,
    enableRealtime: true,
    enableOfflineMode: true,
    enableAnalytics: true
  }
}

/**
 * Get configuration based on environment
 */
export function getConfig(): ProductionConfig {
  return isProduction() ? productionConfig : developmentConfig
}

/**
 * Get specific config section
 */
export function getApiConfig() {
  return getConfig().api
}

export function getCacheConfig() {
  return getConfig().cache
}

export function getRateLimitConfig() {
  return getConfig().rateLimit
}

export function getLoggingConfig() {
  return getConfig().logging
}

export function getPerformanceConfig() {
  return getConfig().performance
}

export function getSecurityConfig() {
  return getConfig().security
}

export function getFeatureConfig() {
  return getConfig().features
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: keyof ProductionConfig['features']): boolean {
  return getConfig().features[feature]
}

/**
 * Override config for testing
 */
let configOverrides: Partial<ProductionConfig> = {}

export function setConfigOverride(overrides: Partial<ProductionConfig>): void {
  if (isDevelopment()) {
    configOverrides = overrides
  }
}

export function clearConfigOverrides(): void {
  configOverrides = {}
}
