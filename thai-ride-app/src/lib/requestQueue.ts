/**
 * Request Queue
 * Queue and batch API requests for better performance
 */

import { logger } from '../utils/logger'

export interface QueuedRequest<T = any> {
  id: string
  fn: () => Promise<T>
  priority: number
  resolve: (value: T) => void
  reject: (error: Error) => void
  createdAt: number
  retries: number
}

export interface QueueOptions {
  maxConcurrent?: number
  maxRetries?: number
  retryDelay?: number
  timeout?: number
}

const DEFAULT_OPTIONS: Required<QueueOptions> = {
  maxConcurrent: 3,
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000
}

class RequestQueue {
  private queue: QueuedRequest[] = []
  private running: number = 0
  private options: Required<QueueOptions>

  constructor(options: QueueOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Add request to queue
   */
  enqueue<T>(fn: () => Promise<T>, priority = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fn,
        priority,
        resolve,
        reject,
        createdAt: Date.now(),
        retries: 0
      }

      // Insert by priority (higher priority first)
      const index = this.queue.findIndex(r => r.priority < priority)
      if (index === -1) {
        this.queue.push(request)
      } else {
        this.queue.splice(index, 0, request)
      }

      this.processQueue()
    })
  }

  /**
   * Process queue
   */
  private async processQueue(): Promise<void> {
    while (this.running < this.options.maxConcurrent && this.queue.length > 0) {
      const request = this.queue.shift()
      if (!request) break

      this.running++
      this.executeRequest(request)
    }
  }

  /**
   * Execute single request
   */
  private async executeRequest<T>(request: QueuedRequest<T>): Promise<void> {
    try {
      // Add timeout
      const result = await Promise.race([
        request.fn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), this.options.timeout)
        )
      ])

      request.resolve(result)
    } catch (error) {
      // Retry logic
      if (request.retries < this.options.maxRetries) {
        request.retries++
        
        // Re-add to queue with delay
        setTimeout(() => {
          this.queue.unshift(request)
          this.processQueue()
        }, this.options.retryDelay * request.retries)
        
        logger.warn(`Request retry ${request.retries}/${this.options.maxRetries}`)
      } else {
        request.reject(error as Error)
      }
    } finally {
      this.running--
      this.processQueue()
    }
  }

  /**
   * Get queue length
   */
  get length(): number {
    return this.queue.length
  }

  /**
   * Get running count
   */
  get runningCount(): number {
    return this.running
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'))
    })
    this.queue = []
  }

  /**
   * Pause queue processing
   */
  pause(): void {
    this.options.maxConcurrent = 0
  }

  /**
   * Resume queue processing
   */
  resume(maxConcurrent = DEFAULT_OPTIONS.maxConcurrent): void {
    this.options.maxConcurrent = maxConcurrent
    this.processQueue()
  }
}

// Global request queue
const globalQueue = new RequestQueue()

/**
 * Queue a request
 */
export function queueRequest<T>(fn: () => Promise<T>, priority = 0): Promise<T> {
  return globalQueue.enqueue(fn, priority)
}

/**
 * Get queue stats
 */
export function getQueueStats(): { queued: number; running: number } {
  return {
    queued: globalQueue.length,
    running: globalQueue.runningCount
  }
}

/**
 * Clear global queue
 */
export function clearQueue(): void {
  globalQueue.clear()
}

/**
 * Create named queue
 */
export function createQueue(name: string, options?: QueueOptions): RequestQueue {
  return new RequestQueue(options)
}

export { RequestQueue }
export default globalQueue
