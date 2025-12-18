/**
 * Environment Variable Validation
 * Validates required environment variables at startup
 */

// Types for environment configuration
export interface EnvConfig {
  // Supabase
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
  
  // Optional
  VITE_APP_NAME?: string
  VITE_APP_VERSION?: string
  VITE_VAPID_PUBLIC_KEY?: string
  VITE_SENTRY_DSN?: string
}

// Required environment variables
const REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
] as const

// Optional environment variables with defaults
const ENV_DEFAULTS: Record<string, string> = {
  VITE_APP_NAME: 'Thai Ride App',
  VITE_APP_VERSION: '1.0.0'
}

/**
 * Validate that all required environment variables are set
 * @throws Error if any required variables are missing
 */
export function validateEnv(): void {
  const missing: string[] = []
  
  for (const key of REQUIRED_ENV_VARS) {
    if (!import.meta.env[key]) {
      missing.push(key)
    }
  }
  
  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.\n' +
      'See .env.example for reference.'
    
    // In development, show warning but don't crash (allow demo mode)
    if (import.meta.env.DEV) {
      console.warn(`⚠️ ${message}`)
      console.warn('Running in demo mode due to missing configuration.')
    } else {
      // In production, throw error
      throw new Error(message)
    }
  }
}

/**
 * Get environment variable with optional default
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = import.meta.env[key]
  if (value !== undefined && value !== '') {
    return value
  }
  if (defaultValue !== undefined) {
    return defaultValue
  }
  if (ENV_DEFAULTS[key]) {
    return ENV_DEFAULTS[key]
  }
  return ''
}

/**
 * Check if running in production
 */
export const isProd = import.meta.env.PROD

/**
 * Check if running in development
 */
export const isDev = import.meta.env.DEV

/**
 * Check if Supabase is properly configured
 */
export const isSupabaseConfigured = !!(
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

/**
 * Get Supabase project reference from URL
 */
export function getSupabaseProjectRef(): string {
  const url = import.meta.env.VITE_SUPABASE_URL || ''
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/)
  return match ? match[1] : ''
}

/**
 * Environment configuration object
 */
export const env = {
  supabaseUrl: getEnv('VITE_SUPABASE_URL'),
  supabaseAnonKey: getEnv('VITE_SUPABASE_ANON_KEY'),
  appName: getEnv('VITE_APP_NAME', 'Thai Ride App'),
  appVersion: getEnv('VITE_APP_VERSION', '1.0.0'),
  vapidPublicKey: getEnv('VITE_VAPID_PUBLIC_KEY'),
  sentryDsn: getEnv('VITE_SENTRY_DSN'),
  projectRef: getSupabaseProjectRef(),
  isProd,
  isDev,
  isSupabaseConfigured
}

export default env
