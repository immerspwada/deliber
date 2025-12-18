/**
 * Service Decorators - MUNEEF Style
 * 
 * Elegant decorators for service enhancement
 * - Performance monitoring
 * - Caching
 * - Rate limiting
 * - Validation
 * - Logging
 */

import { logger } from '../../utils/logger'
import { captureError } from '../../lib/sentry'
// ServiceRegistry available for future use

/**
 * Performance monitoring decorator
 */
export function Monitor(threshold: number = 1000) {
  return function (_target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now()
      const serviceName = this.constructor.name
      
      try {
        const result = await method.apply(this, args)
        const duration = performance.now() - startTime
        
        // Log slow operations
        if (duration > threshold) {
          logger.warn(`Slow operation detected: ${serviceName}.${propertyName}`, {
            duration: `${duration.toFixed(2)}ms`,
            threshold: `${threshold}ms`,
            args: args.length
          })
        }
        
        // Log performance metrics
        logger.debug(`Service metrics: ${serviceName}.${propertyName}`, {
          duration,
          success: true
        })
        
        return result
      } catch (error) {
        const duration = performance.now() - startTime
        
        logger.error(`Operation failed: ${serviceName}.${propertyName}`, {
          duration: `${duration.toFixed(2)}ms`,
          error: (error as Error).message
        })
        
        // Log error metrics
        logger.error(`Service error metrics: ${serviceName}.${propertyName}`, {
          duration,
          success: false,
          error: (error as Error).message
        })
        
        throw error
      }
    }

    return descriptor
  }
}

/**
 * Caching decorator with TTL
 */
export function Cache(ttl: number = 300000) { // 5 minutes default
  const cache = new Map<string, { data: any; expires: number }>()
  
  return function (_target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${this.constructor.name}.${propertyName}:${JSON.stringify(args)}`
      const now = Date.now()
      
      // Check cache
      const cached = cache.get(cacheKey)
      if (cached && cached.expires > now) {
        logger.debug(`Cache hit: ${cacheKey}`)
        return cached.data
      }
      
      // Execute method
      const result = await method.apply(this, args)
      
      // Store in cache
      cache.set(cacheKey, {
        data: result,
        expires: now + ttl
      })
      
      logger.debug(`Cache set: ${cacheKey}`, { ttl })
      
      return result
    }

    return descriptor
  }
}

/**
 * Rate limiting decorator
 */
export function RateLimit(maxCalls: number = 100, windowMs: number = 60000) { // 100 calls per minute
  const calls = new Map<string, number[]>()
  
  return function (_target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const key = `${this.constructor.name}.${propertyName}`
      const now = Date.now()
      const windowStart = now - windowMs
      
      // Get or create call history
      let callHistory = calls.get(key) || []
      
      // Remove old calls
      callHistory = callHistory.filter(time => time > windowStart)
      
      // Check rate limit
      if (callHistory.length >= maxCalls) {
        const error = new Error(`Rate limit exceeded for ${key}. Max ${maxCalls} calls per ${windowMs}ms`)
        logger.warn('Rate limit exceeded', { key, maxCalls, windowMs })
        throw error
      }
      
      // Add current call
      callHistory.push(now)
      calls.set(key, callHistory)
      
      return method.apply(this, args)
    }

    return descriptor
  }
}

/**
 * Validation decorator
 */
export function Validate(validator: (args: any[]) => boolean | string) {
  return function (_target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const validationResult = validator(args)
      
      if (validationResult !== true) {
        const errorMessage = typeof validationResult === 'string' 
          ? validationResult 
          : `Validation failed for ${this.constructor.name}.${propertyName}`
        
        logger.warn('Validation failed', { 
          service: this.constructor.name,
          method: propertyName,
          error: errorMessage 
        })
        
        throw new Error(errorMessage)
      }
      
      return method.apply(this, args)
    }

    return descriptor
  }
}

/**
 * Retry decorator with exponential backoff
 */
export function Retry(maxAttempts: number = 3, baseDelay: number = 1000) {
  return function (_target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      let lastError: Error
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await method.apply(this, args)
        } catch (error) {
          lastError = error as Error
          
          if (attempt === maxAttempts) {
            logger.error(`All retry attempts failed for ${this.constructor.name}.${propertyName}`, {
              attempts: maxAttempts,
              error: lastError.message
            })
            break
          }
          
          const delay = baseDelay * Math.pow(2, attempt - 1)
          logger.warn(`Retry attempt ${attempt}/${maxAttempts} for ${this.constructor.name}.${propertyName}`, {
            delay,
            error: lastError.message
          })
          
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
      
      throw lastError!
    }

    return descriptor
  }
}

/**
 * Circuit breaker decorator
 */
export function CircuitBreaker(
  failureThreshold: number = 5,
  resetTimeout: number = 60000,
  _monitoringPeriod: number = 120000
) {
  const circuits = new Map<string, {
    state: 'closed' | 'open' | 'half-open'
    failures: number
    lastFailureTime: number
    nextAttempt: number
  }>()
  
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const circuitKey = `${target.constructor.name}.${propertyName}`

    descriptor.value = async function (...args: any[]) {
      const now = Date.now()
      let circuit = circuits.get(circuitKey) || {
        state: 'closed',
        failures: 0,
        lastFailureTime: 0,
        nextAttempt: 0
      }

      // Check if circuit should be reset
      if (circuit.state === 'open' && now >= circuit.nextAttempt) {
        circuit.state = 'half-open'
        logger.info(`Circuit breaker half-open: ${circuitKey}`)
      }

      // Reject if circuit is open
      if (circuit.state === 'open') {
        const error = new Error(`Circuit breaker is open for ${circuitKey}`)
        logger.warn('Circuit breaker rejected call', { circuitKey })
        throw error
      }

      try {
        const result = await method.apply(this, args)
        
        // Reset on success
        if (circuit.state === 'half-open') {
          circuit.state = 'closed'
          circuit.failures = 0
          logger.info(`Circuit breaker closed: ${circuitKey}`)
        }
        
        circuits.set(circuitKey, circuit)
        return result
      } catch (error) {
        circuit.failures++
        circuit.lastFailureTime = now
        
        // Open circuit if threshold reached
        if (circuit.failures >= failureThreshold) {
          circuit.state = 'open'
          circuit.nextAttempt = now + resetTimeout
          logger.error(`Circuit breaker opened: ${circuitKey}`, {
            failures: circuit.failures,
            threshold: failureThreshold
          })
        }
        
        circuits.set(circuitKey, circuit)
        throw error
      }
    }

    return descriptor
  }
}

/**
 * Audit logging decorator
 */
export function Audit(sensitive: boolean = false) {
  return function (_target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const serviceName = this.constructor.name
      const startTime = Date.now()
      
      // Log method entry (mask sensitive data)
      const logArgs = sensitive ? '[SENSITIVE]' : args
      logger.info(`Audit: ${serviceName}.${propertyName} started`, {
        args: logArgs,
        timestamp: new Date().toISOString()
      })
      
      try {
        const result = await method.apply(this, args)
        const duration = Date.now() - startTime
        
        // Log successful completion
        logger.info(`Audit: ${serviceName}.${propertyName} completed`, {
          duration,
          success: true,
          timestamp: new Date().toISOString()
        })
        
        return result
      } catch (error) {
        const duration = Date.now() - startTime
        
        // Log failure
        logger.error(`Audit: ${serviceName}.${propertyName} failed`, {
          duration,
          success: false,
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        })
        
        // Capture to Sentry for critical operations
        captureError(error as Error, {
          context: 'audit_failure',
          service: serviceName,
          method: propertyName
        })
        
        throw error
      }
    }

    return descriptor
  }
}

/**
 * Timeout decorator
 */
export function Timeout(ms: number = 30000) {
  return function (_target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timeout: ${this.constructor.name}.${propertyName} (${ms}ms)`))
        }, ms)
      })

      return Promise.race([
        method.apply(this, args),
        timeoutPromise
      ])
    }

    return descriptor
  }
}

/**
 * Combine multiple decorators
 */
export function Enhanced(options: {
  monitor?: { threshold?: number }
  cache?: { ttl?: number }
  rateLimit?: { maxCalls?: number; windowMs?: number }
  retry?: { maxAttempts?: number; baseDelay?: number }
  timeout?: { ms?: number }
  audit?: { sensitive?: boolean }
} = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    // Apply decorators in order
    if (options.timeout) {
      descriptor = Timeout(options.timeout.ms)(target, propertyName, descriptor)
    }
    
    if (options.retry) {
      descriptor = Retry(options.retry.maxAttempts, options.retry.baseDelay)(target, propertyName, descriptor)
    }
    
    if (options.rateLimit) {
      descriptor = RateLimit(options.rateLimit.maxCalls, options.rateLimit.windowMs)(target, propertyName, descriptor)
    }
    
    if (options.cache) {
      descriptor = Cache(options.cache.ttl)(target, propertyName, descriptor)
    }
    
    if (options.monitor) {
      descriptor = Monitor(options.monitor.threshold)(target, propertyName, descriptor)
    }
    
    if (options.audit) {
      descriptor = Audit(options.audit.sensitive)(target, propertyName, descriptor)
    }

    return descriptor
  }
}