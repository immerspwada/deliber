/**
 * Logger Utility
 * Respects environment - only logs in development mode
 * Sends errors to Sentry in production
 */

import { captureError } from '../lib/sentry'

// Types for future extensibility
export type LogLevel = 'log' | 'warn' | 'error' | 'debug' | 'info'

export interface LoggerOptions {
  prefix?: string
  forceLog?: boolean
}

const isDev = import.meta.env.DEV
const isProd = import.meta.env.PROD

class Logger {
  private prefix: string

  constructor(prefix: string = '') {
    this.prefix = prefix ? `[${prefix}]` : ''
  }

  private formatArgs(args: any[]): any[] {
    if (this.prefix) {
      return [this.prefix, ...args]
    }
    return args
  }

  log(...args: any[]) {
    if (isDev) {
      console.log(...this.formatArgs(args))
    }
  }

  info(...args: any[]) {
    if (isDev) {
      console.info(...this.formatArgs(args))
    }
  }

  debug(...args: any[]) {
    if (isDev) {
      console.debug(...this.formatArgs(args))
    }
  }

  warn(...args: any[]) {
    if (isDev) {
      console.warn(...this.formatArgs(args))
    }
    // Optionally send warnings to Sentry in production
    if (isProd) {
      captureError(new Error(`Warning: ${args.join(' ')}`), { level: 'warning' })
    }
  }

  error(...args: any[]) {
    // Always log errors
    console.error(...this.formatArgs(args))
    
    // Send to Sentry in production
    if (isProd) {
      const errorMessage = args.map(arg => 
        arg instanceof Error ? arg.message : String(arg)
      ).join(' ')
      
      const error = args.find(arg => arg instanceof Error) || new Error(errorMessage)
      captureError(error, { 
        extra: { args: args.filter(arg => !(arg instanceof Error)) }
      })
    }
  }

  // Create a child logger with a specific prefix
  child(prefix: string): Logger {
    const newPrefix = this.prefix ? `${this.prefix.slice(1, -1)}:${prefix}` : prefix
    return new Logger(newPrefix)
  }
}

// Default logger instance
export const logger = new Logger()

// Factory function to create prefixed loggers
export const createLogger = (prefix: string): Logger => {
  return new Logger(prefix)
}

// Convenience exports for common modules
export const authLogger = createLogger('Auth')
export const supabaseLogger = createLogger('Supabase')
export const apiLogger = createLogger('API')
export const uiLogger = createLogger('UI')
export const rideLogger = createLogger('Ride')

export default logger
