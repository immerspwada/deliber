/**
 * Service Middleware - MUNEEF Style
 * 
 * Elegant middleware system for service operations
 * - Request/Response transformation
 * - Authentication & Authorization
 * - Validation
 * - Logging & Monitoring
 */

import { logger } from '../../utils/logger'
import { captureError } from '../../lib/sentry'
import type { Result } from '../../utils/result'

export interface ServiceContext {
  serviceName: string
  methodName: string
  args: any[]
  metadata: Record<string, any>
  startTime: number
  userId?: string
  adminId?: string
  providerId?: string
}

export interface MiddlewareNext {
  (): Promise<any>
}

export type ServiceMiddleware = (
  context: ServiceContext,
  next: MiddlewareNext
) => Promise<any>

/**
 * Middleware pipeline for services
 */
export class ServiceMiddlewarePipeline {
  private middlewares: ServiceMiddleware[] = []

  /**
   * Add middleware to pipeline
   */
  use(middleware: ServiceMiddleware): this {
    this.middlewares.push(middleware)
    return this
  }

  /**
   * Execute middleware pipeline
   */
  async execute(
    context: ServiceContext,
    finalHandler: () => Promise<any>
  ): Promise<any> {
    let index = 0

    const next = async (): Promise<any> => {
      if (index >= this.middlewares.length) {
        return finalHandler()
      }

      const middleware = this.middlewares[index++]
      return middleware(context, next)
    }

    return next()
  }
}

/**
 * Authentication middleware
 */
export const authMiddleware: ServiceMiddleware = async (context, next) => {
  const { metadata } = context

  // Skip auth for public methods
  if (metadata.public) {
    return next()
  }

  // Check for user authentication
  if (!context.userId && !context.adminId && !context.providerId) {
    throw new Error('Authentication required')
  }

  // Validate user session if userId provided
  if (context.userId && !metadata.skipUserValidation) {
    // In real implementation, validate user session/token
    logger.debug('User authenticated', { userId: context.userId })
  }

  // Validate admin session if adminId provided
  if (context.adminId && !metadata.skipAdminValidation) {
    // In real implementation, validate admin session/token
    logger.debug('Admin authenticated', { adminId: context.adminId })
  }

  // Validate provider session if providerId provided
  if (context.providerId && !metadata.skipProviderValidation) {
    // In real implementation, validate provider session/token
    logger.debug('Provider authenticated', { providerId: context.providerId })
  }

  return next()
}

/**
 * Authorization middleware
 */
export const authorizationMiddleware: ServiceMiddleware = async (context, next) => {
  const { metadata } = context

  // Skip authorization for public methods
  if (metadata.public) {
    return next()
  }

  // Check required roles
  if (metadata.requiredRoles && metadata.requiredRoles.length > 0) {
    const userRole = getUserRole(context)
    
    if (!metadata.requiredRoles.includes(userRole)) {
      throw new Error(`Insufficient permissions. Required: ${metadata.requiredRoles.join(', ')}`)
    }
  }

  // Check specific permissions
  if (metadata.requiredPermissions && metadata.requiredPermissions.length > 0) {
    const hasPermissions = await checkPermissions(context, metadata.requiredPermissions)
    
    if (!hasPermissions) {
      throw new Error(`Missing required permissions: ${metadata.requiredPermissions.join(', ')}`)
    }
  }

  return next()
}

/**
 * Validation middleware
 */
export const validationMiddleware: ServiceMiddleware = async (context, next) => {
  const { metadata, args } = context

  // Skip validation if not configured
  if (!metadata.validation) {
    return next()
  }

  // Validate arguments
  if (metadata.validation.args) {
    for (let i = 0; i < metadata.validation.args.length; i++) {
      const validator = metadata.validation.args[i]
      const arg = args[i]

      if (validator && !validator(arg)) {
        throw new Error(`Invalid argument at position ${i}`)
      }
    }
  }

  // Custom validation function
  if (metadata.validation.custom) {
    const isValid = await metadata.validation.custom(args, context)
    if (!isValid) {
      throw new Error('Custom validation failed')
    }
  }

  return next()
}

/**
 * Logging middleware
 */
export const loggingMiddleware: ServiceMiddleware = async (context, next) => {
  const { serviceName, methodName, args, metadata } = context

  // Log method entry
  logger.debug(`Service call: ${serviceName}.${methodName}`, {
    args: metadata.logArgs ? args : '[HIDDEN]',
    userId: context.userId,
    adminId: context.adminId,
    providerId: context.providerId
  })

  try {
    const result = await next()
    const duration = performance.now() - context.startTime

    // Log successful completion
    logger.debug(`Service completed: ${serviceName}.${methodName}`, {
      duration: `${duration.toFixed(2)}ms`,
      success: true
    })

    return result
  } catch (error) {
    const duration = performance.now() - context.startTime

    // Log failure
    logger.error(`Service failed: ${serviceName}.${methodName}`, {
      duration: `${duration.toFixed(2)}ms`,
      error: (error as Error).message,
      success: false
    })

    throw error
  }
}

/**
 * Performance monitoring middleware
 */
export const performanceMiddleware: ServiceMiddleware = async (context, next) => {
  const { serviceName, methodName, metadata } = context
  const startTime = performance.now()

  try {
    const result = await next()
    const duration = performance.now() - startTime

    // Check performance thresholds
    const threshold = metadata.performanceThreshold || 1000
    if (duration > threshold) {
      logger.warn(`Slow operation detected: ${serviceName}.${methodName}`, {
        duration: `${duration.toFixed(2)}ms`,
        threshold: `${threshold}ms`
      })
    }

    // Update performance metrics
    updatePerformanceMetrics(serviceName, methodName, duration, true)

    return result
  } catch (error) {
    const duration = performance.now() - startTime

    // Update performance metrics for failures
    updatePerformanceMetrics(serviceName, methodName, duration, false)

    throw error
  }
}

/**
 * Error handling middleware
 */
export const errorHandlingMiddleware: ServiceMiddleware = async (context, next) => {
  const { serviceName, methodName, metadata } = context

  try {
    return await next()
  } catch (error) {
    const appError = error as Error

    // Log error details
    logger.error(`Service error: ${serviceName}.${methodName}`, {
      error: appError.message,
      stack: appError.stack,
      context: {
        userId: context.userId,
        adminId: context.adminId,
        providerId: context.providerId
      }
    })

    // Capture to Sentry if enabled
    if (!metadata.skipSentry) {
      captureError(appError, {
        context: 'service_error',
        service: serviceName,
        method: methodName,
        userId: context.userId
      })
    }

    // Transform error if needed
    if (metadata.errorTransform) {
      throw metadata.errorTransform(appError)
    }

    throw appError
  }
}

/**
 * Caching middleware
 */
export const cachingMiddleware: ServiceMiddleware = async (context, next) => {
  const { serviceName, methodName, args, metadata } = context

  // Skip caching if not enabled
  if (!metadata.cache) {
    return next()
  }

  const cacheKey = generateCacheKey(serviceName, methodName, args)
  const ttl = metadata.cache.ttl || 300000 // 5 minutes default

  // Try to get from cache
  const cached = await getFromCache(cacheKey)
  if (cached && cached.expires > Date.now()) {
    logger.debug(`Cache hit: ${cacheKey}`)
    return cached.data
  }

  // Execute method
  const result = await next()

  // Store in cache
  await setCache(cacheKey, result, ttl)
  logger.debug(`Cache set: ${cacheKey}`, { ttl })

  return result
}

/**
 * Rate limiting middleware
 */
export const rateLimitMiddleware: ServiceMiddleware = async (context, next) => {
  const { serviceName, methodName, metadata } = context

  // Skip rate limiting if not configured
  if (!metadata.rateLimit) {
    return next()
  }

  const { maxCalls = 100, windowMs = 60000 } = metadata.rateLimit
  const key = getRateLimitKey(serviceName, methodName, context)

  // Check rate limit
  const isAllowed = await checkRateLimit(key, maxCalls, windowMs)
  if (!isAllowed) {
    throw new Error(`Rate limit exceeded for ${serviceName}.${methodName}`)
  }

  return next()
}

/**
 * Result transformation middleware
 */
export const resultTransformMiddleware: ServiceMiddleware = async (context, next) => {
  const { metadata } = context

  const result = await next()

  // Transform result if transformer provided
  if (metadata.resultTransform) {
    return metadata.resultTransform(result)
  }

  // Wrap in Result type if requested
  if (metadata.wrapResult) {
    return { success: true, data: result } as Result<any>
  }

  return result
}

// Helper functions

function getUserRole(context: ServiceContext): string {
  if (context.adminId) return 'admin'
  if (context.providerId) return 'provider'
  if (context.userId) return 'customer'
  return 'anonymous'
}

async function checkPermissions(
  context: ServiceContext,
  _permissions: string[]
): Promise<boolean> {
  // In real implementation, check user permissions from database
  // For now, return true for admins
  return !!context.adminId
}

function updatePerformanceMetrics(
  serviceName: string,
  methodName: string,
  duration: number,
  success: boolean
): void {
  // In real implementation, update performance metrics storage
  logger.debug('Performance metrics updated', {
    service: serviceName,
    method: methodName,
    duration,
    success
  })
}

function generateCacheKey(serviceName: string, methodName: string, args: any[]): string {
  return `${serviceName}.${methodName}:${JSON.stringify(args)}`
}

async function getFromCache(_key: string): Promise<{ data: any; expires: number } | null> {
  // In real implementation, get from Redis or other cache
  return null
}

async function setCache(_key: string, _data: any, _ttl: number): Promise<void> {
  // In real implementation, set in Redis or other cache
}

function getRateLimitKey(serviceName: string, methodName: string, context: ServiceContext): string {
  const identifier = context.userId || context.adminId || context.providerId || 'anonymous'
  return `${serviceName}.${methodName}:${identifier}`
}

async function checkRateLimit(_key: string, _maxCalls: number, _windowMs: number): Promise<boolean> {
  // In real implementation, check rate limit using Redis or memory store
  return true
}

/**
 * Default middleware pipeline
 */
export const createDefaultPipeline = (): ServiceMiddlewarePipeline => {
  return new ServiceMiddlewarePipeline()
    .use(errorHandlingMiddleware)
    .use(loggingMiddleware)
    .use(performanceMiddleware)
    .use(authMiddleware)
    .use(authorizationMiddleware)
    .use(validationMiddleware)
    .use(rateLimitMiddleware)
    .use(cachingMiddleware)
    .use(resultTransformMiddleware)
}