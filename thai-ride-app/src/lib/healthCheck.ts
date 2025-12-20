/**
 * Health Check Utilities
 * Production health monitoring and service checks
 */

import { supabase } from './supabase'
import { logger } from '../utils/logger'

export interface HealthCheckResult {
  service: string
  status: 'healthy' | 'degraded' | 'down'
  responseTime: number
  message?: string
  timestamp: string
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'down'
  services: HealthCheckResult[]
  timestamp: string
}

/**
 * Check Supabase database connection
 */
export async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    const { error } = await supabase.from('users').select('id').limit(1)
    const responseTime = Date.now() - start
    
    if (error) {
      return {
        service: 'database',
        status: 'down',
        responseTime,
        message: error.message,
        timestamp: new Date().toISOString()
      }
    }
    
    return {
      service: 'database',
      status: responseTime > 2000 ? 'degraded' : 'healthy',
      responseTime,
      timestamp: new Date().toISOString()
    }
  } catch (err: any) {
    return {
      service: 'database',
      status: 'down',
      responseTime: Date.now() - start,
      message: err.message,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Check Supabase Auth service
 */
export async function checkAuth(): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    const { error } = await supabase.auth.getSession()
    const responseTime = Date.now() - start
    
    if (error) {
      return {
        service: 'auth',
        status: 'down',
        responseTime,
        message: error.message,
        timestamp: new Date().toISOString()
      }
    }
    
    return {
      service: 'auth',
      status: responseTime > 1000 ? 'degraded' : 'healthy',
      responseTime,
      timestamp: new Date().toISOString()
    }
  } catch (err: any) {
    return {
      service: 'auth',
      status: 'down',
      responseTime: Date.now() - start,
      message: err.message,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Check Supabase Storage
 */
export async function checkStorage(): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    const { error } = await supabase.storage.listBuckets()
    const responseTime = Date.now() - start
    
    if (error) {
      return {
        service: 'storage',
        status: 'down',
        responseTime,
        message: error.message,
        timestamp: new Date().toISOString()
      }
    }
    
    return {
      service: 'storage',
      status: responseTime > 2000 ? 'degraded' : 'healthy',
      responseTime,
      timestamp: new Date().toISOString()
    }
  } catch (err: any) {
    return {
      service: 'storage',
      status: 'down',
      responseTime: Date.now() - start,
      message: err.message,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Check Supabase Realtime
 */
export async function checkRealtime(): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    // Simple check - just verify we can create a channel
    const channel = supabase.channel('health-check')
    const responseTime = Date.now() - start
    
    // Cleanup
    supabase.removeChannel(channel)
    
    return {
      service: 'realtime',
      status: 'healthy',
      responseTime,
      timestamp: new Date().toISOString()
    }
  } catch (err: any) {
    return {
      service: 'realtime',
      status: 'down',
      responseTime: Date.now() - start,
      message: err.message,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Run all health checks
 */
export async function runHealthChecks(): Promise<SystemHealth> {
  const results = await Promise.all([
    checkDatabase(),
    checkAuth(),
    checkStorage(),
    checkRealtime()
  ])
  
  // Determine overall status
  const hasDown = results.some(r => r.status === 'down')
  const hasDegraded = results.some(r => r.status === 'degraded')
  
  const overall: SystemHealth['overall'] = hasDown 
    ? 'down' 
    : hasDegraded 
      ? 'degraded' 
      : 'healthy'
  
  const health: SystemHealth = {
    overall,
    services: results,
    timestamp: new Date().toISOString()
  }
  
  // Log if not healthy
  if (overall !== 'healthy') {
    logger.warn('System health check:', health)
  }
  
  return health
}

/**
 * Quick health check (database only)
 */
export async function quickHealthCheck(): Promise<boolean> {
  try {
    const result = await checkDatabase()
    return result.status !== 'down'
  } catch {
    return false
  }
}

/**
 * Health check endpoint response format
 */
export function formatHealthResponse(health: SystemHealth): {
  status: number
  body: object
} {
  const statusCode = health.overall === 'healthy' 
    ? 200 
    : health.overall === 'degraded' 
      ? 200 
      : 503
  
  return {
    status: statusCode,
    body: {
      status: health.overall,
      timestamp: health.timestamp,
      services: health.services.reduce((acc, s) => ({
        ...acc,
        [s.service]: {
          status: s.status,
          responseTime: s.responseTime,
          ...(s.message && { message: s.message })
        }
      }), {})
    }
  }
}
