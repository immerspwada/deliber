/**
 * Logger Utility - Re-export from lib
 * For backward compatibility
 */

export { logger, createLogger, LogLevel } from '../lib/logger'
import { createLogger } from '../lib/logger'

// Named loggers for specific modules
export const supabaseLogger = createLogger('Supabase')
export const authLogger = createLogger('Auth')
export const rideLogger = createLogger('Ride')
