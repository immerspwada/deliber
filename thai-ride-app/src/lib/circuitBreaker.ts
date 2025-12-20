/**
 * Circuit Breaker - Fault Tolerance Pattern
 * Task: 12 - Implement retry and circuit breaker patterns
 * Requirements: 11.4
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerOptions {
  failureThreshold?: number    // Number of failures before opening
  successThreshold?: number    // Number of successes to close from half-open
  timeout?: number             // Time in ms before trying again (half-open)
  onStateChange?: (from: CircuitState, to: CircuitState) => void
}

const DEFAULT_OPTIONS: Required<Omit<CircuitBreakerOptions, 'onStateChange'>> = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount: number = 0
  private successCount: number = 0
  private lastFailureTime: number = 0
  private options: Required<Omit<CircuitBreakerOptions, 'onStateChange'>>
  private onStateChange?: (from: CircuitState, to: CircuitState) => void

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.onStateChange = options.onStateChange
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      // Check if timeout has passed
      if (Date.now() - this.lastFailureTime >= this.options.timeout) {
        this.transitionTo(CircuitState.HALF_OPEN)
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++
      if (this.successCount >= this.options.successThreshold) {
        this.transitionTo(CircuitState.CLOSED)
      }
    }
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    this.successCount = 0

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN)
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.transitionTo(CircuitState.OPEN)
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      const oldState = this.state
      this.state = newState
      
      if (newState === CircuitState.CLOSED) {
        this.failureCount = 0
        this.successCount = 0
      }

      if (this.onStateChange) {
        this.onStateChange(oldState, newState)
      }

      console.log(`[CircuitBreaker] State changed: ${oldState} → ${newState}`)
    }
  }

  getState(): CircuitState {
    return this.state
  }

  isOpen(): boolean {
    return this.state === CircuitState.OPEN
  }

  isClosed(): boolean {
    return this.state === CircuitState.CLOSED
  }

  reset(): void {
    this.transitionTo(CircuitState.CLOSED)
    this.failureCount = 0
    this.successCount = 0
  }

  getStats(): { state: CircuitState; failures: number; successes: number } {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount
    }
  }
}

// Service-specific circuit breakers
const circuitBreakers = new Map<string, CircuitBreaker>()

export function getCircuitBreaker(serviceName: string, options?: CircuitBreakerOptions): CircuitBreaker {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, new CircuitBreaker(options))
  }
  return circuitBreakers.get(serviceName)!
}

export function resetAllCircuitBreakers(): void {
  circuitBreakers.forEach(cb => cb.reset())
}
