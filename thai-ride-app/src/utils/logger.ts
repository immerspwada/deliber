/**
 * Logger Utility - Re-export from lib
 * For backward compatibility
 */

export { 
  logger, 
  createLogger, 
  providerLogger,
  realtimeLogger,
  authLogger,
  walletLogger,
  adminLogger,
  customerLogger
} from '../lib/logger'

export type { LogLevel } from '../lib/logger'

import { createLogger } from '../lib/logger'

// Named loggers for specific modules
export const supabaseLogger = createLogger('Supabase')
export const rideLogger = createLogger('Ride')
export const deliveryLogger = createLogger('Delivery')
export const shoppingLogger = createLogger('Shopping')
