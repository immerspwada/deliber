/**
 * Debounce & Throttle Utilities
 * Performance optimization helpers
 */

/**
 * Debounce function - delays execution until after wait ms have elapsed
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean; maxWait?: number } = {}
): T & { cancel: () => void; flush: () => void } {
  const { leading = false, trailing = true, maxWait } = options
  
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null
  let lastThis: any = null
  let lastCallTime: number | undefined
  let lastInvokeTime = 0
  let result: ReturnType<T>

  const invokeFunc = (time: number) => {
    const args = lastArgs!
    const thisArg = lastThis
    lastArgs = lastThis = null
    lastInvokeTime = time
    result = fn.apply(thisArg, args)
    return result
  }

  const shouldInvoke = (time: number) => {
    const timeSinceLastCall = lastCallTime === undefined ? 0 : time - lastCallTime
    const timeSinceLastInvoke = time - lastInvokeTime

    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    )
  }

  const trailingEdge = (time: number) => {
    timeoutId = null
    if (trailing && lastArgs) {
      return invokeFunc(time)
    }
    lastArgs = lastThis = null
    return result
  }

  const timerExpired = () => {
    const time = Date.now()
    if (shouldInvoke(time)) {
      return trailingEdge(time)
    }
    const timeSinceLastCall = time - (lastCallTime || 0)
    const timeSinceLastInvoke = time - lastInvokeTime
    const timeWaiting = wait - timeSinceLastCall
    const remainingWait = maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting

    timeoutId = setTimeout(timerExpired, remainingWait)
  }

  const leadingEdge = (time: number) => {
    lastInvokeTime = time
    timeoutId = setTimeout(timerExpired, wait)
    return leading ? invokeFunc(time) : result
  }

  const debounced = function(this: any, ...args: Parameters<T>) {
    const time = Date.now()
    const isInvoking = shouldInvoke(time)

    lastArgs = args
    lastThis = this
    lastCallTime = time

    if (isInvoking) {
      if (timeoutId === null) {
        return leadingEdge(time)
      }
      if (maxWait !== undefined) {
        timeoutId = setTimeout(timerExpired, wait)
        return invokeFunc(time)
      }
    }
    if (timeoutId === null) {
      timeoutId = setTimeout(timerExpired, wait)
    }
    return result
  } as T & { cancel: () => void; flush: () => void }

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    lastInvokeTime = 0
    lastArgs = lastCallTime = lastThis = timeoutId = null
  }

  debounced.flush = () => {
    if (timeoutId !== null) {
      return trailingEdge(Date.now())
    }
    return result
  }

  return debounced
}

/**
 * Throttle function - limits execution to once per wait ms
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T & { cancel: () => void } {
  const { leading = true, trailing = true } = options
  
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null
  let lastThis: any = null
  let lastCallTime = 0
  let result: ReturnType<T>

  const invokeFunc = () => {
    const args = lastArgs!
    const thisArg = lastThis
    lastArgs = lastThis = null
    lastCallTime = Date.now()
    result = fn.apply(thisArg, args)
    return result
  }

  const throttled = function(this: any, ...args: Parameters<T>) {
    const now = Date.now()
    const remaining = wait - (now - lastCallTime)

    lastArgs = args
    lastThis = this

    if (remaining <= 0 || remaining > wait) {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      if (leading || lastCallTime !== 0) {
        return invokeFunc()
      }
      lastCallTime = now
    } else if (!timeoutId && trailing) {
      timeoutId = setTimeout(() => {
        timeoutId = null
        if (trailing) {
          invokeFunc()
        }
      }, remaining)
    }

    return result
  } as T & { cancel: () => void }

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    lastCallTime = 0
    lastArgs = lastThis = null
  }

  return throttled
}

/**
 * Rate limit function - limits to n calls per time window
 */
export function rateLimit<T extends (...args: any[]) => any>(
  fn: T,
  limit: number,
  windowMs: number
): T & { reset: () => void } {
  const calls: number[] = []

  const rateLimited = function(this: any, ...args: Parameters<T>) {
    const now = Date.now()
    
    // Remove old calls outside window
    while (calls.length > 0 && calls[0] < now - windowMs) {
      calls.shift()
    }

    if (calls.length >= limit) {
      throw new Error('Rate limit exceeded')
    }

    calls.push(now)
    return fn.apply(this, args)
  } as T & { reset: () => void }

  rateLimited.reset = () => {
    calls.length = 0
  }

  return rateLimited
}

/**
 * Once - function that only executes once
 */
export function once<T extends (...args: any[]) => any>(fn: T): T {
  let called = false
  let result: ReturnType<T>

  return function(this: any, ...args: Parameters<T>) {
    if (!called) {
      called = true
      result = fn.apply(this, args)
    }
    return result
  } as T
}

/**
 * Defer - delays execution to next tick
 */
export function defer<T extends (...args: any[]) => any>(fn: T): (...args: Parameters<T>) => void {
  return (...args: Parameters<T>) => {
    setTimeout(() => fn(...args), 0)
  }
}
