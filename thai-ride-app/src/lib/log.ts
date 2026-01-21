/**
 * Centralized Logger Service
 * 
 * ใช้งานง่ายกว่า logger เดิม:
 * - log.auth.debug('message', { data })
 * - log.provider.info('job accepted', { jobId })
 * - log.admin.warn('action failed', { error })
 * 
 * @example
 * import { log } from '@/lib/log'
 * log.auth.debug('Login started', { email })
 * log.provider.info('Job accepted', { jobId, providerId })
 */

import { createLogger, LogLevel } from './logger'

// Pre-configured loggers for each module
export const log = {
  // Authentication & User
  auth: createLogger('Auth'),
  user: createLogger('User'),
  
  // Core Services
  ride: createLogger('Ride'),
  delivery: createLogger('Delivery'),
  shopping: createLogger('Shopping'),
  queue: createLogger('Queue'),
  moving: createLogger('Moving'),
  laundry: createLogger('Laundry'),
  
  // Provider
  provider: createLogger('Provider'),
  earnings: createLogger('Earnings'),
  
  // Admin
  admin: createLogger('Admin'),
  verification: createLogger('Verification'),
  
  // System
  api: createLogger('API'),
  realtime: createLogger('Realtime'),
  push: createLogger('Push'),
  network: createLogger('Network'),
  cache: createLogger('Cache'),
  performance: createLogger('Performance'),
  
  // Payments & Wallet
  payment: createLogger('Payment'),
  wallet: createLogger('Wallet'),
  
  // Safety & Support
  safety: createLogger('Safety'),
  support: createLogger('Support'),
  
  // Analytics
  analytics: createLogger('Analytics'),
  tracking: createLogger('Tracking')
}

// Re-export for convenience
export { LogLevel }

// Default export
export default log
